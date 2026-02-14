import type { Result, ResultAsync } from "./types.js";
import { RESULT_BRAND } from "./brand.js";

/**
 * Standalone type guard: checks if an unknown value is a Result.
 *
 * Uses a Symbol brand check -- only objects created by ok() or err() pass.
 * This is stronger than structural checking and eliminates false positives
 * from objects that happen to share the { _tag, value/error } shape.
 */
export function isResult(value: unknown): value is Result<unknown, unknown> {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  return RESULT_BRAND in value;
}

/**
 * Standalone type guard: checks if an unknown value is a ResultAsync.
 * Uses structural checking — non-null object with `then` (function) + `match` (function).
 * No instanceof, no casts.
 */
export function isResultAsync(value: unknown): value is ResultAsync<unknown, unknown> {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  if (!("then" in value) || typeof value.then !== "function") {
    return false;
  }
  if (!("match" in value) || typeof value.match !== "function") {
    return false;
  }
  return true;
}
