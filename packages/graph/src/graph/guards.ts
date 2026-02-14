/**
 * Graph Domain Type Guard.
 *
 * This module provides the runtime type guard for Graph types.
 * Maintains proper layer boundaries:
 * - graph/ only knows about Graph types (not GraphBuilder)
 * - GraphBuilder guard is in builder/guards.ts
 *
 * @packageDocumentation
 */

import type { Graph } from "./types/graph-types.js";

const VALID_LIFETIMES: ReadonlySet<string> = Object.freeze(
  new Set(["singleton", "scoped", "transient"])
);

/**
 * Checks if a value conforms to the Graph structure (deep validation).
 *
 * Validates:
 * - Top-level structure (adapters array, overridePortNames Set)
 * - Each adapter has valid provides (object with __portName string)
 * - Each adapter has valid requires (array of objects with __portName string)
 * - Each adapter has a valid lifetime value
 *
 * @param value - The value to check
 * @returns `true` if the value conforms to Graph structure
 *
 * @example
 * ```typescript
 * function loadGraph(data: unknown): Graph {
 *   if (!isGraph(data)) {
 *     throw new Error('Invalid graph structure');
 *   }
 *   return data;
 * }
 * ```
 */
export function isGraph(value: unknown): value is Graph {
  if (value === null || typeof value !== "object") return false;

  // Check adapters property
  if (!("adapters" in value) || !Array.isArray(value.adapters)) return false;

  // Deep validation for each adapter
  for (const adapter of value.adapters) {
    if (adapter === null || typeof adapter !== "object") return false;

    // Validate provides
    if (
      !("provides" in adapter) ||
      adapter.provides === null ||
      typeof adapter.provides !== "object"
    )
      return false;
    if (!("__portName" in adapter.provides) || typeof adapter.provides.__portName !== "string")
      return false;
    if (adapter.provides.__portName.length === 0) return false;

    // Validate requires
    if (!("requires" in adapter) || !Array.isArray(adapter.requires)) return false;
    for (const req of adapter.requires) {
      if (req === null || typeof req !== "object") return false;
      if (!("__portName" in req) || typeof req.__portName !== "string") return false;
    }

    // Validate lifetime
    if (!("lifetime" in adapter) || typeof adapter.lifetime !== "string") return false;
    if (!VALID_LIFETIMES.has(adapter.lifetime)) return false;
  }

  // Check overridePortNames property
  if (!("overridePortNames" in value) || !(value.overridePortNames instanceof Set)) return false;

  return true;
}
