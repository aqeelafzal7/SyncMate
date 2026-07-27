import { getDecryptedApiKey } from './cryptoStorage';
import { db } from './firebase';
import { doc, setDoc, increment } from 'firebase/firestore';

async function logSystemApiCall() {
  try {
    const todayDate = new Date().toISOString().split('T')[0];
    await setDoc(
      doc(db, 'system_analytics', todayDate),
      {
        totalApiCallsToday: increment(1),
        lastUpdated: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to log system API call to analytics:', err);
  }
}

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash'
];

// Default fallback key if user has not entered a custom key
const DEFAULT_FALLBACK_KEY = 'AIzaSyDSaP14gCiA6N9ZwTKYLchhh4Frwdr6mz0';

export interface GeminiOptions {
  systemInstruction?: string;
  imageBase64?: string;
  mimeType?: string;
  customApiKey?: string;
  userProfile?: { tier?: string; email?: string } | null;
}

/**
 * Resolves effective Gemini API Key with Cloudflare System API Key fallback
 */
export async function getEffectiveApiKey(
  optionsApiKey?: string,
  userProfile?: { tier?: string; email?: string } | null
): Promise<string> {
  const customKey = optionsApiKey || (await getDecryptedApiKey());
  const systemApiKey =
    (import.meta.env.VITE_GEMINI_SYSTEM_API_KEY as string) ||
    (import.meta.env.VITE_GEMINI_API_KEY as string) ||
    DEFAULT_FALLBACK_KEY;

  const isEligibleForCustomKey = userProfile
    ? userProfile.tier !== 'free' || userProfile.email === 'chaqeelpak@gmail.com'
    : true;

  if (customKey && isEligibleForCustomKey) {
    return customKey;
  }

  if (systemApiKey) {
    return systemApiKey;
  }

  throw new Error("System AI Engine unavailable. Please check environment configurations.");
}

/**
 * Helper to get a clean base64 string and mimeType from either a Data URI or an HTTP image URL (e.g., ImgBB).
 */
export async function fetchImgbbAsBase64(
  imageUrl: string
): Promise<{ base64: string; mimeType: string }> {
  if (!imageUrl) {
    return { base64: '', mimeType: 'image/jpeg' };
  }

  if (imageUrl.startsWith('data:')) {
    let mimeType = 'image/jpeg';
    const mimeMatch = imageUrl.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
    const cleanBase64 = imageUrl
      .replace(/^data:image\/[a-zA-Z0-9\+\-\.]+;base64,/, '')
      .replace(/\s/g, '')
      .trim();
    return { base64: cleanBase64, mimeType };
  }

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch image: ${res.status}`);
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (!result) {
          resolve({ base64: '', mimeType: contentType });
          return;
        }
        const mimeMatch = result.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,/);
        const mime = mimeMatch ? mimeMatch[1] : contentType;
        const cleanBase64 = result
          .replace(/^data:image\/[a-zA-Z0-9\+\-\.]+;base64,/, '')
          .replace(/\s/g, '')
          .trim();
        resolve({ base64: cleanBase64, mimeType: mime });
      };
      reader.onerror = () => resolve({ base64: '', mimeType: contentType });
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Error converting image URL to base64:', err);
    return { base64: '', mimeType: 'image/jpeg' };
  }
}

/**
 * Unified client-side Gemini AI engine with automatic multi-model failover cascade
 */
export async function callGeminiWithFallback(
  prompt: string,
  options?: GeminiOptions
): Promise<string> {
  const activeKey =
    options?.customApiKey ||
    (await getDecryptedApiKey()) ||
    (import.meta.env.VITE_GEMINI_SYSTEM_API_KEY as string) ||
    (import.meta.env.VITE_GEMINI_API_KEY as string) ||
    DEFAULT_FALLBACK_KEY;

  if (!activeKey) {
    throw new Error("System AI Engine unavailable. Please check environment configurations.");
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

    // Strip any remaining header and remove whitespace/newlines
    cleanBase64 = cleanBase64
      .replace(/^data:image\/[a-zA-Z0-9\+\-\.]+;base64,/, '')
      .replace(/\s/g, '')
      .trim();

    parts.push({
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
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
  let hasEncounteredRateLimit = false;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          logSystemApiCall();
          return text;
        }
      }

      const errorData = await response.json().catch(() => ({}));
      const rawMsg = JSON.stringify(errorData);

      if (response.status === 429) {
        hasEncounteredRateLimit = true;
        console.warn(`Model ${model} rate limited (HTTP 429). Waiting 1.5s before fallback...`);
        await new Promise((res) => setTimeout(res, 1500));
      } else if (response.status === 400) {
        throw new Error(
          'Invalid image payload structure (HTTP 400). Please ensure your selfie/image is a valid JPEG/PNG.'
        );
      } else if (response.status === 401) {
        throw new Error(
          'Invalid API Key (HTTP 401). Please verify your Google Gemini API key.'
        );
      } else if (
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
        msg.includes('Invalid image payload structure') ||
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

  if (hasEncounteredRateLimit) {
    throw new Error(
      '⏳ Google AI Rate Limit Reached: Free tier allows 15 requests/min. Please wait 30–60 seconds before trying again.'
    );
  }

  throw new Error(
    lastError?.message || "System AI Engine unavailable. Please check environment configurations."
  );
}
