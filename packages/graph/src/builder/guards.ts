/**
 * GraphBuilder Type Guard.
 *
 * This module provides the runtime type guard for GraphBuilder.
 * Located in the builder module to maintain proper layer boundaries:
 * - graph/ should only know about Graph types
 * - builder/ owns GraphBuilder and its type guard
 *
 * @packageDocumentation
 */

import { GRAPH_BUILDER_BRAND } from "../symbols/index.js";
import type { GraphBuilder } from "./builder.js";

/**
 * Checks if a value is a GraphBuilder instance.
 *
 * Uses brand-based checking to avoid tight coupling with the GraphBuilder class.
 * This allows the guard to work even when GraphBuilder is not directly available.
 *
 * @param value - The value to check
 * @returns `true` if the value is a GraphBuilder instance
 *
 * @example
 * ```typescript
 * function process(builderOrGraph: unknown) {
 *   if (isGraphBuilder(builderOrGraph)) {
 *     // builderOrGraph is narrowed to GraphBuilder
 *     return builderOrGraph.build();
 *   }
 * }
 * ```
 */
export function isGraphBuilder(value: unknown): value is GraphBuilder {
  return (
    value !== null &&
    typeof value === "object" &&
    GRAPH_BUILDER_BRAND in value &&
    value[GRAPH_BUILDER_BRAND] === true
  );
}
