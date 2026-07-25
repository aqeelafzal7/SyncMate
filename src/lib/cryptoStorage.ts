// Web Crypto API helper for AES-GCM encryption of BYOK Gemini API key

const ENC_STORAGE_KEY = 'syncmate_gemini_api_key_enc';
const LEGACY_STORAGE_KEY = 'syncmate_gemini_api_key';
const SALT_STORAGE_KEY = 'syncmate_device_salt';

// Ensure a persistent device salt
function getOrCreateDeviceSalt(): Uint8Array {
  let saltHex = localStorage.getItem(SALT_STORAGE_KEY);
  if (!saltHex) {
    const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
    saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(SALT_STORAGE_KEY, saltHex);
  }
  const match = saltHex.match(/.{1,2}/g);
  return new Uint8Array(match ? match.map(byte => parseInt(byte, 16)) : new Array(16).fill(0));
}

// Derive a CryptoKey using PBKDF2
async function deriveCryptoKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const salt = getOrCreateDeviceSalt();
  const passphrase = `SyncMate-BYOK-Passphrase-${window.location.host || 'local'}`;
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts raw API key string using AES-GCM and stores payload in localStorage
 */
export async function encryptAndSaveApiKey(rawApiKey: string): Promise<void> {
  if (!rawApiKey || !rawApiKey.trim()) {
    removeSavedApiKey();
    return;
  }

  const trimmed = rawApiKey.trim();
  try {
    const key = await deriveCryptoKey();
    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(trimmed)
    );

    const payload = {
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      cipher: Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''),
    };

    localStorage.setItem(ENC_STORAGE_KEY, JSON.stringify(payload));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to encrypt API key:', err);
    removeSavedApiKey();
  }
}

/**
 * Retrieves and decrypts the saved Gemini API key into memory.
 * Also handles seamless migration from legacy plain-text key if present.
 */
export async function getDecryptedApiKey(): Promise<string | null> {
  // Check if legacy unencrypted key exists and auto-migrate
  const legacyKey = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacyKey && legacyKey.trim()) {
    await encryptAndSaveApiKey(legacyKey.trim());
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  const encDataStr = localStorage.getItem(ENC_STORAGE_KEY);
  if (!encDataStr) return null;

  try {
    const payload = JSON.parse(encDataStr);
    if (!payload.iv || !payload.cipher) return null;

    const ivMatch = payload.iv.match(/.{1,2}/g);
    const cipherMatch = payload.cipher.match(/.{1,2}/g);

    if (!ivMatch || !cipherMatch) return null;

    const iv = new Uint8Array(ivMatch.map((b: string) => parseInt(b, 16)));
    const cipher = new Uint8Array(cipherMatch.map((b: string) => parseInt(b, 16)));

    const key = await deriveCryptoKey();
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipher
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.warn('Failed to decrypt API key:', err);
    return null;
  }
}

/**
 * Safely removes saved API keys (both encrypted and legacy)
 */
export function removeSavedApiKey(): void {
  localStorage.removeItem(ENC_STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
