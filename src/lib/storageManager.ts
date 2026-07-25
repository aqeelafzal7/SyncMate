// Centralized type-safe storage manager utility for SyncMate

const APP_PREFIX = 'syncmate_';

/**
 * Ensures key is properly prefixed with 'syncmate_'
 */
function formatKey(key: string): string {
  if (key.startsWith(APP_PREFIX)) {
    return key;
  }
  return `${APP_PREFIX}${key}`;
}

/**
 * Safely encodes and stores a value in localStorage under a syncmate_ prefixed key
 */
export function setItem<T>(key: string, value: T): void {
  try {
    const fullKey = formatKey(key);
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(fullKey, serialized);
  } catch (err) {
    console.error(`[storageManager] Failed to set item for key "${key}":`, err);
  }
}

/**
 * Safely retrieves and parses a stored value from localStorage
 */
export function getItem<T>(key: string, defaultValue?: T): T | null {
  try {
    const fullKey = formatKey(key);
    const raw = localStorage.getItem(fullKey);

    if (raw === null || raw === undefined) {
      return defaultValue ?? null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      // If raw is not valid JSON, return as plain string or cast
      return (raw as unknown) as T;
    }
  } catch (err) {
    console.error(`[storageManager] Failed to get item for key "${key}":`, err);
    return defaultValue ?? null;
  }
}

/**
 * Removes a syncmate_ prefixed item from localStorage
 */
export function removeItem(key: string): void {
  try {
    const fullKey = formatKey(key);
    localStorage.removeItem(fullKey);
  } catch (err) {
    console.error(`[storageManager] Failed to remove item for key "${key}":`, err);
  }
}

/**
 * Sweeps and clears all keys in localStorage starting with 'syncmate_'
 */
export function clearAllAppKeys(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(APP_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.error('[storageManager] Failed to clear app keys:', err);
  }
}

export const storageManager = {
  setItem,
  getItem,
  removeItem,
  clearAllAppKeys,
};
