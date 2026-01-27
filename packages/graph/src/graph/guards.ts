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

/**
 * Checks if a value conforms to the Graph structure.
 *
 * A Graph is a plain object with:
 * - `adapters`: Array of adapter objects
 * - `overridePortNames`: Set of port name strings
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

  // Verify each adapter (shallow check - full validation would use isAdapter)
  for (const adapter of value.adapters) {
    if (adapter === null || typeof adapter !== "object") return false;
    if (!("provides" in adapter) || !("requires" in adapter)) return false;
  }

  // Check overridePortNames property
  if (!("overridePortNames" in value) || !(value.overridePortNames instanceof Set)) return false;

  return true;
}
