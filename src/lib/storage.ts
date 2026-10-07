import { useState } from 'react';
import { SHOP_KEY_PREFIX } from './shops';

/**
 * Single entry point for the app's local (per-device) persistence.
 *
 * Everything that used to call `localStorage` directly should go through
 * here, so the backing store can later be swapped (IndexedDB, backend sync…)
 * without touching every screen. Access is wrapped in try/catch because
 * storage can be unavailable (private mode, quota exceeded).
 *
 * Keys belong to the active shop (see shops.ts): several shops can share a browser.
 */
const k = (key: string) => SHOP_KEY_PREFIX + key;

export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(k(key));
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string | number | boolean): void {
  try {
    localStorage.setItem(k(key), String(value));
  } catch (err) {
    console.warn(`storage: failed to write "${key}"`, err);
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(k(key));
  } catch {
    // ignore
  }
}

export function getJSON<T>(key: string, fallback: T): T {
  const raw = getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON(key: string, value: unknown): void {
  setItem(key, JSON.stringify(value));
}

/**
 * useState that is remembered on this device under `key` (JSON-encoded).
 * Use for per-device UI preferences, not for business data.
 */
export function useStoredState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => getJSON<T>(key, initial));
  const set = (next: T) => {
    setValue(next);
    setJSON(key, next);
  };
  return [value, set];
}
