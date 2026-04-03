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
function isValidPort(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if (!("__portName" in value) || typeof value.__portName !== "string") return false;
  return value.__portName.length > 0;
}

function isValidRequires(requires: unknown): boolean {
  if (!Array.isArray(requires)) return false;
  const list: readonly unknown[] = requires;
  for (const req of list) {
    if (req === null || typeof req !== "object") return false;
    if (!("__portName" in req) || typeof req.__portName !== "string") return false;
  }
  return true;
}

function isValidAdapter(adapter: unknown): boolean {
  if (adapter === null || typeof adapter !== "object") return false;
  if (!("provides" in adapter) || !isValidPort(adapter.provides)) return false;
  if (!("requires" in adapter) || !isValidRequires(adapter.requires)) return false;
  if (!("lifetime" in adapter) || typeof adapter.lifetime !== "string") return false;
  return VALID_LIFETIMES.has(adapter.lifetime);
}

export function isGraph(value: unknown): value is Graph {
  if (value === null || typeof value !== "object") return false;
  if (!("adapters" in value) || !Array.isArray(value.adapters)) return false;

  const adapters: readonly unknown[] = value.adapters;
  for (const adapter of adapters) {
    if (!isValidAdapter(adapter)) return false;
  }

  if (!("overridePortNames" in value) || !(value.overridePortNames instanceof Set)) return false;
  return true;
}
