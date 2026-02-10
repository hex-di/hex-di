/**
 * Deep freeze utility for runtime immutability enforcement.
 *
 * @packageDocumentation
 */

import type { DeepReadonly } from "../types/deep-readonly.js";

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

/**
 * Recursively freezes an object graph.
 * Returns the same reference typed as DeepReadonly for structural sharing.
 * Primitives and already-frozen objects pass through without modification.
 */
export function deepFreeze<T>(obj: T): DeepReadonly<T>;
export function deepFreeze(obj: unknown): unknown {
  if (!isRecord(obj)) return obj;
  if (Object.isFrozen(obj)) return obj;

  Object.freeze(obj);

  for (const value of Object.values(obj)) {
    if (isRecord(value) && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return obj;
}
