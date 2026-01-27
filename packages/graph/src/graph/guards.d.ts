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
export declare function isGraph(value: unknown): value is Graph;
