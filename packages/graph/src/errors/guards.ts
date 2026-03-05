/**
 * Type guards for graph build errors.
 *
 * @packageDocumentation
 */

import type { GraphBuildError } from "./graph-build-errors.js";
import type { CycleError, MultipleCyclesError } from "./cycle-error.js";

/**
 * Checks whether a value is a `GraphBuildError` (CyclicDependency, CaptiveDependency,
 * MissingOperation, CycleDetected, or MultipleCyclesDetected).
 *
 * @param value - The value to check
 * @returns `true` if the value has a valid GraphBuildError `_tag`
 */
export function isGraphBuildError(value: unknown): value is GraphBuildError {
  if (typeof value !== "object" || value === null) return false;
  if (!("_tag" in value)) return false;
  const tag = value._tag;
  return (
    tag === "CyclicDependency" ||
    tag === "CaptiveDependency" ||
    tag === "MissingOperation" ||
    tag === "CycleDetected" ||
    tag === "MultipleCyclesDetected"
  );
}

/**
 * Checks whether a value is a `CycleError`.
 */
export function isCycleError(value: unknown): value is CycleError {
  if (typeof value !== "object" || value === null) return false;
  if (!("_tag" in value)) return false;
  return value._tag === "CycleDetected";
}

/**
 * Checks whether a value is a `MultipleCyclesError`.
 */
export function isMultipleCyclesError(value: unknown): value is MultipleCyclesError {
  if (typeof value !== "object" || value === null) return false;
  if (!("_tag" in value)) return false;
  return value._tag === "MultipleCyclesDetected";
}
