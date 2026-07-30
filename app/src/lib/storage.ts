/**
 * Safe wrapper around browser storage.
 *
 * Guards against private-mode / disabled storage (which throws on access)
 * and centralizes key names so they are not scattered across components.
 */

export const STORAGE_KEYS = {
  SHOW_ECM: 'car-m-show-ecm',
} as const;

export function getStorageFlag(key: string, fallback = false): boolean {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return fallback;
  }
}

export function setStorageFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore storage errors (private mode, quota exhausted, etc.)
  }
}
