/**
 * Guard Purity Enforcement (GxP F7)
 *
 * Runs a guard function twice with frozen (deep-frozen) copies of the inputs
 * and compares the results. If the results differ, the guard is impure.
 *
 * @packageDocumentation
 */

import { callErased, getDescriptorValue } from "../utils/type-bridge.js";

/**
 * Verifies that a guard function is pure by executing it twice with the same
 * frozen inputs and comparing results.
 *
 * @param guardFn - The guard function to verify
 * @param context - The context to pass to the guard
 * @param event - The event to pass to the guard
 * @returns The guard result if pure, or false with a warning if impure
 */
export function verifyGuardPurity(
  guardFn: (context: never, event: never) => boolean,
  context: unknown,
  event: unknown
): { readonly pure: boolean; readonly result: boolean } {
  // Freeze inputs to prevent mutation
  const frozenContext = deepFreeze(structuredClone(context));
  const frozenEvent = deepFreeze(structuredClone(event));

  const result1 = callErased(guardFn, frozenContext, frozenEvent);
  const result2 = callErased(guardFn, frozenContext, frozenEvent);

  if (result1 !== result2) {
    return { pure: false, result: false };
  }

  const boolResult = typeof result1 === "boolean" ? result1 : false;
  return { pure: true, result: boolResult };
}

/**
 * Deep-freezes an object and all nested objects/arrays.
 * @internal
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }

  Object.freeze(obj);

  for (const key of Object.keys(obj)) {
    const value = getDescriptorValue(obj, key);
    if (value !== undefined) {
      deepFreeze(value);
    }
  }

  return obj;
}
