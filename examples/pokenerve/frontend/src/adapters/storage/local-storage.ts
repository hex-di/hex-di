/**
 * LocalStorage adapter with Result-wrapped error handling.
 *
 * Implements the PersistencePort using browser localStorage.
 * All keys are namespaced with "pokenerve:" prefix.
 * Operations return Result types for safe error handling.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import {
  PersistencePort,
  SerializationError,
  QuotaExceeded,
  StorageUnavailable,
} from "../../ports/storage.js";

const localStorageAdapter = createAdapter({
  provides: PersistencePort,
  lifetime: "singleton",
  factory: () => ({
    get<T>(key: string) {
      try {
        const raw = localStorage.getItem(`pokenerve:${key}`);
        if (raw === null) {
          const nullResult: T | null = null;
          return ok(nullResult);
        }
        const parsed: T = JSON.parse(raw);
        return ok(parsed);
      } catch {
        return err(SerializationError({ message: `Failed to parse ${key}` }));
      }
    },
    set<T>(key: string, value: T) {
      try {
        localStorage.setItem(`pokenerve:${key}`, JSON.stringify(value));
        return ok(undefined);
      } catch {
        return err(QuotaExceeded({ key }));
      }
    },
    remove(key: string) {
      try {
        localStorage.removeItem(`pokenerve:${key}`);
        return ok(undefined);
      } catch {
        return err(StorageUnavailable({}));
      }
    },
    clear() {
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith("pokenerve:"));
        keys.forEach(k => localStorage.removeItem(k));
        return ok(undefined);
      } catch {
        return err(StorageUnavailable({}));
      }
    },
  }),
});

export { localStorageAdapter };
