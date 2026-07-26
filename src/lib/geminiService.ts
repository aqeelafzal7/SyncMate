import { getDecryptedApiKey } from './cryptoStorage';

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

// Default fallback key if user has not entered a custom key
const DEFAULT_FALLBACK_KEY = 'AIzaSyDSaP14gCiA6N9ZwTKYLchhh4Frwdr6mz0';

export interface GeminiOptions {
  systemInstruction?: string;
  imageBase64?: string;
  mimeType?: string;
}

/**
 * Unified client-side Gemini AI engine with automatic multi-model failover cascade
 */
export async function callGeminiWithFallback(
  prompt: string,
  options?: GeminiOptions
): Promise<string> {
  const customKey = await getDecryptedApiKey();
  const apiKey = customKey || DEFAULT_FALLBACK_KEY;

  if (!apiKey) {
    throw new Error('No Gemini API key found. Please connect your API key in the top header.');
  }

  // Build parts array
  const parts: any[] = [];

  if (options?.imageBase64) {
    let cleanBase64 = options.imageBase64;
    let detectedMime = options.mimeType || 'image/jpeg';

    if (cleanBase64.includes(';base64,')) {
      const split = cleanBase64.split(';base64,');
      if (split[0].includes('image/')) {
        detectedMime = split[0].replace('data:', '');
      }
      cleanBase64 = split[1];
    }

    parts.push({
      inlineData: {
        mimeType: detectedMime,
        data: cleanBase64
      }
    });
  }

  if (prompt) {
    parts.push({ text: prompt });
  }

  const payload: any = {
    contents: [
      {
        role: 'user',
        parts: parts
      }
    ]
  };

  if (options?.systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: options.systemInstruction }]
    };
  }

  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text;
        }
      }

      const errorData = await response.json().catch(() => ({}));
      const rawMsg = JSON.stringify(errorData);

      if (
        response.status === 403 ||
        rawMsg.includes('API_KEY_HTTP_REFERRER_BLOCKED') ||
        rawMsg.includes('PERMISSION_DENIED')
      ) {
        throw new Error(
          "API Key Blocked: Your Google API key is restricted by HTTP Referrer. Please add 'https://*.run.app/*' and 'https://syncmate.pages.dev/*' to your allowed websites in Google Cloud Console."
        );
      }

      console.warn(`Model ${model} failed (HTTP ${response.status}), switching to next fallback model...`);
    } catch (err: any) {
      if (err.message && err.message.includes('API Key Blocked: Your Google API key is restricted by HTTP Referrer')) {
        throw err;
      }
      lastError = err;
      console.warn(`Model ${model} failed with error, switching to next fallback model...`, err);
    }
  }

  throw new Error(
    lastError?.message || 'All Gemini models failed. Please verify your API key in the top header.'
  );
}
