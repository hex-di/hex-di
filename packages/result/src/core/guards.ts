import type { Result, ResultAsync } from "./types.js";

/**
 * Standalone type guard: checks if an unknown value is a Result.
 * Uses structural checking — no instanceof.
 */
export function isResult(value: unknown): value is Result<unknown, unknown> {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  // After `in` check, TS narrows value to have the property
  if ("_tag" in value && "value" in value && value._tag === "Ok") {
    return true;
  }
  if ("_tag" in value && "error" in value && value._tag === "Err") {
    return true;
  }
  return false;
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
