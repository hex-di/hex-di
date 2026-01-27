/**
 * Runtime cycle detection for dependency graphs.
 *
 * This module provides runtime cycle detection as a safety net for graphs
 * that exceed the compile-time cycle detection depth limit.
 *
 * @packageDocumentation
 */
import type { AdapterConstraint } from "../../adapter/index.js";
/**
 * Normalizes a cycle path to start from the lexicographically smallest node.
 *
 * This ensures deterministic output regardless of which node the DFS happened
 * to encounter first. For example, the cycle `[B, C, A, B]` is normalized to
 * `[A, B, C, A]`.
 *
 * @param cycle - The raw cycle path ending with the repeated starting node
 * @returns The normalized cycle path starting from the smallest node
 *
 * @example
 * ```typescript
 * normalizeCyclePath(["B", "C", "A", "B"]);  // ["A", "B", "C", "A"]
 * normalizeCyclePath(["Z", "X", "Y", "Z"]);  // ["X", "Y", "Z", "X"]
 * ```
 *
 * @internal
 */
export declare function normalizeCyclePath(cycle: string[]): string[];
/**
 * Detects cycles in the adapter dependency graph at runtime using DFS.
 *
 * This function serves as a safety net for graphs that exceed the compile-time
 * cycle detection depth limit (MaxDepth). When `depthLimitExceeded` is true,
 * this should be called to ensure no cycles were missed.
 *
 * ## Iteration Order Independence
 *
 * Cycle *detection* is order-independent: if a cycle exists, it will be found
 * regardless of adapter order. However, the *reported path* may vary depending
 * on which node is visited first. For example, cycle `A → B → C → A` might be
 * reported as `["A", "B", "C", "A"]` or `["B", "C", "A", "B"]`.
 *
 * @param adapters - The adapters in the graph to check
 * @returns Array of port names forming the cycle path if a cycle is found, null if clean
 *
 * @example
 * ```typescript
 * const cycle = detectCycleAtRuntime(graph.adapters);
 * if (cycle) {
 *   throw new Error(`Circular dependency detected: ${cycle.join(' -> ')}`);
 * }
 * ```
 */
export declare function detectCycleAtRuntime(adapters: readonly AdapterConstraint[]): string[] | null;
