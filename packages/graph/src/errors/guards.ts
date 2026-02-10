/**
 * Type guards for graph build errors.
 *
 * @packageDocumentation
 */

import type { GraphBuildError } from "./graph-build-errors.js";

/**
 * Checks whether a value is a `GraphBuildError` (CyclicDependency or CaptiveDependency).
 *
 * @param value - The value to check
 * @returns `true` if the value has a `_tag` of `"CyclicDependency"` or `"CaptiveDependency"`
 */
export function isGraphBuildError(value: unknown): value is GraphBuildError {
  if (typeof value !== "object" || value === null) return false;
  if (!("_tag" in value)) return false;
  const tag = value._tag;
  return tag === "CyclicDependency" || tag === "CaptiveDependency";
}
