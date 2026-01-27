/**
 * Type definitions for graph inspection.
 *
 * This module contains all the interfaces and type definitions used by
 * the inspection system.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint } from "../../adapter/types/adapter-types.js";

/**
 * Structural type for graph-like objects that can be inspected.
 *
 * This type captures only the runtime-necessary fields for inspection,
 * allowing both Graph and GraphBuilder to be inspected without requiring
 * phantom type properties.
 *
 * @internal
 */
export interface InspectableGraph {
  readonly adapters: readonly AdapterConstraint[];
  readonly overridePortNames: ReadonlySet<string>;
}

/**
 * A suggestion for resolving a graph configuration issue.
 *
 * Suggestions are generated based on the current graph state and provide
 * actionable guidance for completing or improving the graph.
 */
export interface GraphSuggestion {
  /** Type of suggestion */
  readonly type:
    | "missing_adapter"
    | "depth_warning"
    | "orphan_port"
    | "disposal_warning"
    | "unnecessary_lazy";
  /** The port name this suggestion relates to */
  readonly portName: string;
  /** Human-readable description of the issue */
  readonly message: string;
  /** Suggested action to resolve the issue */
  readonly action: string;
}

/**
 * Runtime inspection result for debugging.
 *
 * Call `builder.inspect()` to get a snapshot of the current graph state,
 * including adapter count, provided ports, unsatisfied requirements, and
 * dependency structure.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter);
 *
 * const inspection = builder.inspect();
 * console.log(inspection.summary);
 * // "Graph(2 adapters, 0 unsatisfied): Logger (singleton), Database (scoped)"
 *
 * if (inspection.maxChainDepth > 40) {
 *   console.warn('Deep dependency chain detected, consider using withMaxDepth<N>()');
 * }
 * ```
 */
export interface GraphInspection {
  /** Number of adapters registered in this builder */
  readonly adapterCount: number;
  /**
   * List of provided ports with their lifetimes (e.g., "Logger (singleton)").
   *
   * ## Ordering Guarantee
   *
   * **Order is deterministic**: Items appear in adapter registration order,
   * which is the order adapters were passed to `.provide()` or `.provideMany()`.
   *
   * This is intentional for:
   * - **Debugging**: Understand execution order during resolution
   * - **Logging**: Consistent output across runs
   * - **Snapshots**: Enable deterministic test assertions
   *
   * ```
   * ┌────────────────────────────────────────────────────────────────────────┐
   * │                    provides Array Order Guarantee                      │
   * ├─────────────────────────────────┬──────────────────────────────────────┤
   * │ Registration                    │ provides Array Result                │
   * ├─────────────────────────────────┼──────────────────────────────────────┤
   * │ .provide(A).provide(B).provide(C) │ ["A (lifetime)", "B (l)", "C (l)"]  │
   * │ .provideMany([A, B, C])         │ ["A (lifetime)", "B (l)", "C (l)"]   │
   * │ .provide(C).provide(B).provide(A) │ ["C (lifetime)", "B (l)", "A (l)"]  │
   * └─────────────────────────────────┴──────────────────────────────────────┘
   * ```
   *
   * Note: Other array properties like `unsatisfiedRequirements`, `orphanPorts`,
   * and `overrides` use **set semantics** (sorted alphabetically for consistency)
   * rather than registration order.
   */
  readonly provides: readonly string[];
  /**
   * Port names that are required but not yet provided.
   *
   * **Order**: Sorted alphabetically for consistent comparison across runs.
   */
  readonly unsatisfiedRequirements: readonly string[];
  /** Map of port name to its direct dependency port names */
  readonly dependencyMap: Readonly<Record<string, readonly string[]>>;
  /**
   * Port names marked as overrides for parent containers.
   *
   * **Order**: Sorted alphabetically for consistent comparison across runs.
   */
  readonly overrides: readonly string[];
  /**
   * Maximum dependency chain depth in the current graph.
   *
   * If this approaches 50 (the default MaxDepth), type-level cycle detection may not reach all paths.
   * Consider using `GraphBuilder.withMaxDepth<N>()` for deeper graphs, or restructuring.
   */
  readonly maxChainDepth: number;
  /**
   * Warning message when maxChainDepth approaches the compile-time limit.
   *
   * Present when maxChainDepth >= 40 (80% of default MaxDepth).
   * When this warning appears, consider:
   * - Using `GraphBuilder.withMaxDepth<N>()` for deeper graphs (up to 100)
   * - Restructuring the dependency graph to reduce depth
   * - Using `buildFragment()` for deep subgraphs
   * - Splitting into smaller, independent graphs
   */
  readonly depthWarning?: string;
  /** Human-readable summary of the graph state */
  readonly summary: string;
  /** True if all requirements are satisfied (ready to build) */
  readonly isComplete: boolean;
  /**
   * Actionable suggestions for resolving graph issues.
   *
   * Includes suggestions for:
   * - Missing adapters (based on unsatisfied requirements)
   * - Depth warnings (when approaching compile-time limits)
   * - Orphan ports (ports provided but never required by others)
   *
   * @example
   * ```typescript
   * const info = builder.inspect();
   * for (const suggestion of info.suggestions) {
   *   console.log(`[${suggestion.type}] ${suggestion.message}`);
   *   console.log(`  Action: ${suggestion.action}`);
   * }
   * ```
   */
  readonly suggestions: readonly GraphSuggestion[];
  /**
   * Ports that are provided but not required by any other adapter.
   *
   * Orphan ports may indicate:
   * - Entry points (intentionally not required)
   * - Dead code (accidentally unreferenced adapters)
   *
   * Use this to audit your graph for unused services.
   *
   * **Order**: Sorted alphabetically for consistent comparison across runs.
   */
  readonly orphanPorts: readonly string[];

  /**
   * Warnings about potential disposal order issues.
   *
   * Present when adapters with finalizers depend on adapters without finalizers.
   * During disposal, services are finalized in reverse dependency order.
   * If a finalizer depends on a service that may be garbage collected,
   * use-after-dispose bugs can occur.
   *
   * @example
   * ```typescript
   * const info = builder.inspect();
   * if (info.disposalWarnings.length > 0) {
   *   console.warn('Disposal order warnings:');
   *   for (const warning of info.disposalWarnings) {
   *     console.warn(`  - ${warning}`);
   *   }
   * }
   * ```
   */
  readonly disposalWarnings: readonly string[];

  /**
   * Type complexity score (heuristic for type-checking performance).
   *
   * Higher values indicate more complex type structures that may impact
   * IDE responsiveness and type-checking speed. The score is based on:
   * - Number of adapters
   * - Dependency chain depth
   * - Fan-out (average dependencies per adapter)
   *
   * Thresholds:
   * - 0-50: "safe" - No performance concerns
   * - 51-100: "monitor" - May impact large projects
   * - 100+: "consider-splitting" - Consider splitting into subgraphs
   *
   * @example
   * ```typescript
   * const info = builder.inspect();
   * if (info.typeComplexityScore > 100) {
   *   console.warn(
   *     `High type complexity (${info.typeComplexityScore}). ` +
   *     `Consider splitting into smaller graphs.`
   *   );
   * }
   * ```
   */
  readonly typeComplexityScore: number;

  /**
   * Performance recommendation based on type complexity score.
   *
   * - "safe": No performance concerns expected
   * - "monitor": May impact type-checking in large projects, monitor CI times
   * - "consider-splitting": Consider restructuring into smaller subgraphs
   */
  readonly performanceRecommendation: "safe" | "monitor" | "consider-splitting";

  /**
   * Ports that have finalizers defined.
   *
   * Useful for understanding disposal behavior and debugging
   * use-after-dispose issues.
   */
  readonly portsWithFinalizers: readonly string[];

  /**
   * True when maxChainDepth equals or exceeds the default MaxDepth (50).
   *
   * When this flag is true, compile-time cycle detection may have false negatives
   * for very deep dependency chains. The runtime will perform additional cycle
   * detection during `build()` to catch cycles that type-level analysis missed.
   *
   * This can happen when:
   * - The dependency graph is exceptionally deep (50+ levels)
   * - A cycle exists beyond the type-level detection depth
   *
   * To avoid this, either:
   * - Use `GraphBuilder.withMaxDepth<N>()` to increase the detection depth
   * - Restructure the graph to reduce depth
   * - Split into smaller, independent graphs
   */
  readonly depthLimitExceeded: boolean;

  /**
   * Lazy ports that may be unnecessary (no cycle would exist without them).
   *
   * Lazy ports are designed to break circular dependencies. If a lazy port is
   * used but no cycle would exist without it, the lazy indirection adds
   * unnecessary complexity.
   *
   * Each entry is a lazy port name (e.g., "LazyUserService") that could
   * potentially be replaced with a direct dependency.
   *
   * @example
   * ```typescript
   * const info = builder.inspect();
   * if (info.unnecessaryLazyPorts.length > 0) {
   *   console.warn('Consider using direct dependencies instead of:');
   *   for (const lazyPort of info.unnecessaryLazyPorts) {
   *     console.warn(`  - ${lazyPort}`);
   *   }
   * }
   * ```
   */
  readonly unnecessaryLazyPorts: readonly string[];

  /**
   * Unique correlation ID for this inspection instance.
   *
   * Use this ID to correlate inspection results across logs, traces, and
   * debugging sessions. The ID is generated using a combination of timestamp
   * and random suffix for uniqueness.
   *
   * Format: `insp_{timestamp}_{random}` (e.g., "insp_1705123456789_x7k2")
   *
   * @example Logging with correlation
   * ```typescript
   * const info = builder.inspect();
   * console.log(`[${info.correlationId}] Inspecting graph...`);
   * console.log(`[${info.correlationId}] Found ${info.adapterCount} adapters`);
   * console.log(`[${info.correlationId}] Complete: ${info.isComplete}`);
   * ```
   *
   * @example Distributed tracing
   * ```typescript
   * const info = builder.inspect();
   * span.setAttribute('graph.correlation_id', info.correlationId);
   * span.setAttribute('graph.adapter_count', info.adapterCount);
   * ```
   */
  readonly correlationId: string;
}

/**
 * Result of validating a GraphBuilder.
 *
 * Returned by `builder.validate()` to provide structured validation results
 * without building/freezing the graph.
 *
 * @example
 * ```typescript
 * const result = builder.validate();
 *
 * if (result.valid) {
 *   const graph = builder.build();
 * } else {
 *   for (const error of result.errors) {
 *     console.error(error);
 *   }
 * }
 * ```
 */
export interface ValidationResult {
  /** Whether the graph is valid and ready to build */
  readonly valid: boolean;

  /** List of validation errors (empty if valid) */
  readonly errors: readonly string[];

  /** List of warnings (graph can still be built) */
  readonly warnings: readonly string[];

  /** Number of adapters in the graph */
  readonly adapterCount: number;

  /**
   * List of provided ports with their lifetimes.
   *
   * **Order**: Adapter registration order (see GraphInspection.provides for details).
   */
  readonly provides: readonly string[];

  /**
   * Port names that are required but not provided.
   *
   * **Order**: Sorted alphabetically for consistent comparison across runs.
   */
  readonly unsatisfiedRequirements: readonly string[];

  /** Maximum dependency chain depth */
  readonly maxChainDepth: number;

  /** Actionable suggestions for resolving issues */
  readonly suggestions: readonly GraphSuggestion[];
}

/**
 * JSON-serializable version of GraphInspection for logging and debugging.
 *
 * This type is returned by `inspectionToJSON()` and can be safely passed to
 * `JSON.stringify()`, stored in files, or sent over network protocols.
 *
 * @example
 * ```typescript
 * const info = builder.inspect();
 * const json = inspectionToJSON(info);
 *
 * // Log as structured JSON
 * console.log(JSON.stringify(json, null, 2));
 *
 * // Store for later analysis
 * fs.writeFileSync('graph-debug.json', JSON.stringify(json));
 * ```
 */
export interface GraphInspectionJSON {
  /** Schema version for forward compatibility */
  readonly version: 1;
  /** ISO timestamp when inspection was serialized */
  readonly timestamp: string;
  /** Number of adapters in the graph */
  readonly adapterCount: number;
  /** List of provided ports with their lifetimes */
  readonly provides: readonly string[];
  /** Port names that are required but not yet provided */
  readonly unsatisfiedRequirements: readonly string[];
  /** Map of port name to its direct dependency port names */
  readonly dependencyMap: Record<string, readonly string[]>;
  /** Port names marked as overrides */
  readonly overrides: readonly string[];
  /** Maximum dependency chain depth */
  readonly maxChainDepth: number;
  /** Depth warning message if present */
  readonly depthWarning: string | null;
  /** Human-readable summary */
  readonly summary: string;
  /** Whether all requirements are satisfied */
  readonly isComplete: boolean;
  /** Actionable suggestions */
  readonly suggestions: readonly GraphSuggestion[];
  /** Ports provided but not required by others */
  readonly orphanPorts: readonly string[];
  /** Disposal order warnings */
  readonly disposalWarnings: readonly string[];
  /** Type complexity score */
  readonly typeComplexityScore: number;
  /** Performance recommendation */
  readonly performanceRecommendation: "safe" | "monitor" | "consider-splitting";
  /** Ports that have finalizers defined */
  readonly portsWithFinalizers: readonly string[];
  /** True when maxChainDepth equals or exceeds the default MaxDepth (50) */
  readonly depthLimitExceeded: boolean;
  /** Lazy ports that may be unnecessary (no cycle would exist without them) */
  readonly unnecessaryLazyPorts: readonly string[];
  /** Unique correlation ID for tracing */
  readonly correlationId: string;
}

/**
 * Options for inspectionToJSON serialization.
 */
export interface InspectionToJSONOptions {
  /**
   * Override the timestamp for deterministic testing.
   *
   * If not provided, uses `new Date().toISOString()`.
   *
   * @example
   * ```typescript
   * // In tests, use a fixed timestamp for snapshot testing:
   * const json = inspectionToJSON(info, {
   *   timestamp: '2024-01-01T00:00:00.000Z'
   * });
   * expect(json).toMatchSnapshot();
   * ```
   */
  readonly timestamp?: string;
}
