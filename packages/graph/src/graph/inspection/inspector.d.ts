/**
 * Graph Inspector.
 *
 * This module provides the main inspectGraph() function that orchestrates
 * all inspection analysis and produces a comprehensive GraphInspection result.
 *
 * @packageDocumentation
 */
import type { GraphInspection, InspectableGraph } from "../types/inspection.js";
import { type CorrelationIdGenerator } from "./correlation.js";
/**
 * Options for graph inspection.
 */
export interface InspectOptions {
    /**
     * Optional seed for deterministic correlation IDs (for testing/reproducibility).
     */
    seed?: string;
    /**
     * Optional correlation ID generator for dependency injection.
     *
     * When provided, this generator will be used instead of creating a new one.
     * Useful for:
     * - Testing: Pass a mock generator for predictable IDs
     * - Shared context: Reuse a generator across multiple inspections
     *
     * @example
     * ```typescript
     * const generator = createCorrelationIdGenerator();
     * const info1 = inspectGraph(graph1, { generator });
     * const info2 = inspectGraph(graph2, { generator }); // Continues from same counter
     * ```
     */
    generator?: CorrelationIdGenerator;
}
/**
 * Inspects a built Graph and returns detailed runtime information.
 *
 * This is the companion function to `GraphBuilder.inspect()` for use with
 * already-built graphs. Use this when you need to analyze a graph after
 * calling `build()`.
 *
 * ## Iteration Order Independence
 *
 * Most computed properties are **order-independent** - they produce the same
 * semantic result regardless of adapter registration order:
 *
 * | Property                | Order Independent | Notes                           |
 * |-------------------------|-------------------|----------------------------------|
 * | `adapterCount`          | ✓ Yes             | Pure count                       |
 * | `provides`              | ✗ No              | Preserves registration order     |
 * | `unsatisfiedRequirements`| ✓ Yes (set)      | Set semantics, order may vary    |
 * | `dependencyMap`         | ✓ Yes             | Map semantics                    |
 * | `overrides`             | ✓ Yes (set)       | Set semantics, order may vary    |
 * | `maxChainDepth`         | ✓ Yes             | Computed via DFS, deterministic  |
 * | `orphanPorts`           | ✓ Yes (set)       | Set semantics, order may vary    |
 * | `isComplete`            | ✓ Yes             | Boolean derived from sets        |
 * | `typeComplexityScore`   | ✓ Yes             | Computed from structure          |
 *
 * **"Set semantics"** means the *contents* are deterministic but array *order*
 * depends on iteration order. For equality testing, compare as sets:
 *
 * ```typescript
 * const set1 = new Set(info1.unsatisfiedRequirements);
 * const set2 = new Set(info2.unsatisfiedRequirements);
 * const equal = set1.size === set2.size && [...set1].every(p => set2.has(p));
 * ```
 *
 * @example Basic usage
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter)
 *   .build();
 *
 * const info = inspectGraph(graph);
 * console.log(info.summary);
 * // "Graph(2 adapters, 0 unsatisfied): Logger (singleton), Database (scoped)"
 * ```
 *
 * @example Checking graph before runtime
 * ```typescript
 * const graph = buildApplicationGraph();
 * const info = inspectGraph(graph);
 *
 * if (info.maxChainDepth > 40) {
 *   console.warn(
 *     `Deep dependency chain (${info.maxChainDepth}). ` +
 *     `Consider using GraphBuilder.withMaxDepth<N>() or splitting into subgraphs.`
 *   );
 * }
 *
 * // Proceed to create runtime container
 * const container = createContainer(graph);
 * ```
 *
 * @param graph - The built graph to inspect (or any graph-like object with adapters and overridePortNames)
 * @param options - Optional configuration for inspection
 * @returns A frozen GraphInspection object with all inspection data
 */
export declare function inspectGraph(graph: InspectableGraph, options?: InspectOptions): GraphInspection;
