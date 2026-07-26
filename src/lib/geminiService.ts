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
    let mimeType = options?.mimeType || 'image/jpeg';
    let cleanBase64 = options.imageBase64;

    if (cleanBase64.startsWith('data:')) {
      const mimeMatch = cleanBase64.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      cleanBase64 = cleanBase64.replace(/^data:image\/[a-zA-Z0-9\+\-\.]+;base64,/, '');
    }

    // Remove any whitespace, newlines, or carriage returns
    cleanBase64 = cleanBase64.replace(/\s/g, '').trim();

    parts.push({
      inlineData: {
        mimeType: mimeType,
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

      if (response.status === 400) {
        throw new Error(
          'Invalid image/request format (HTTP 400). Please ensure your selfie/image is a valid JPEG/PNG.'
        );
      }

      if (response.status === 401) {
        throw new Error(
          'Invalid API Key (HTTP 401). Please verify your Google Gemini API key.'
        );
      }

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
      const msg = err.message || '';
      if (
        msg.includes('Invalid image/request format') ||
        msg.includes('Invalid API Key') ||
        msg.includes('API Key Blocked') ||
        msg.includes('restricted by HTTP Referrer')
      ) {
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
