/**
 * usePersistedState hook for storage-backed state.
 *
 * State is persisted to localStorage or sessionStorage.
 * Falls back to in-memory state if storage is unavailable.
 *
 * @packageDocumentation
 */

import { useCallback, useState } from "react";

type StorageType = "local" | "session";

/**
 * Reads a value from storage, returning undefined if not found or unavailable.
 */
function readFromStorage<T>(key: string, storage: StorageType): T | undefined {
  try {
    const storageObj = storage === "local" ? localStorage : sessionStorage;
    const raw = storageObj.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/**
 * Writes a value to storage. Silently fails if storage is unavailable.
 */
function writeToStorage<T>(key: string, value: T, storage: StorageType): void {
  try {
    const storageObj = storage === "local" ? localStorage : sessionStorage;
    storageObj.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable
  }
}

/**
 * State backed by localStorage or sessionStorage.
 * Falls back to in-memory state if storage is unavailable.
 *
 * @param key - Storage key
 * @param defaultValue - Default value when key is not found
 * @param storage - Storage type ("local" or "session"), defaults to "local"
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  storage: StorageType = "local"
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValueInternal] = useState<T>(() => {
    const stored = readFromStorage<T>(key, storage);
    return stored !== undefined ? stored : defaultValue;
  });

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValueInternal(prev => {
        const resolved =
          typeof newValue === "function" ? (newValue as (prev: T) => T)(prev) : newValue;
        writeToStorage(key, resolved, storage);
        return resolved;
      });
    },
    [key, storage]
  );

  return [value, setValue];
}
