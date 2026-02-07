import type { Result } from "./types.js";

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
