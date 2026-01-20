/**
 * Inspection types for GraphBuilder.
 *
 * This module contains types for inspecting and debugging GraphBuilder state.
 *
 * @packageDocumentation
 */

import type { UnsatisfiedDependencies } from "../validation/index.js";
import type { GraphBuilder } from "../graph/builder.js";

// =============================================================================
// Validation Inspection Types
// =============================================================================

/**
 * Detailed validation state for a GraphBuilder.
 *
 * This type exposes intermediate validation information that is normally
 * hidden behind the single-error-message pattern. Useful for:
 * - Debugging complex graph configurations
 * - Understanding which validations pass vs fail
 * - Building custom validation tooling
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(UserServiceAdapter);
 *
 * // Check validation state at type level
 * type State = InspectValidation<typeof builder>;
 * // {
 * //   hasDuplicates: false,
 * //   hasCycles: false,
 * //   hasCaptiveDeps: false,
 * //   unsatisfiedDeps: DatabasePort  // Missing!
 * // }
 * ```
 */
export type ValidationState<TProvides, TRequires, TDepGraph, TLifetimeMap> = {
  /** True if any port would have multiple adapters */
  readonly hasDuplicates: false; // Already checked at provide() time
  /** True if the dependency graph contains cycles */
  readonly hasCycles: false; // Already checked at provide() time
  /** True if any adapter captures a shorter-lived dependency */
  readonly hasCaptiveDeps: false; // Already checked at provide() time
  /** Ports that are required but not provided (never if all satisfied) */
  readonly unsatisfiedDeps: UnsatisfiedDependencies<TProvides, TRequires>;
  /** Current dependency graph for debugging */
  readonly depGraph: TDepGraph;
  /** Current lifetime map for debugging */
  readonly lifetimeMap: TLifetimeMap;
};

/**
 * Extracts validation state from a GraphBuilder for debugging purposes.
 *
 * Since GraphBuilder's provide() method already validates duplicates, cycles,
 * and captive dependencies at each call, those checks will always be false
 * for a successfully constructed builder. The primary use is inspecting
 * unsatisfied dependencies before calling build().
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(UserServiceAdapter); // Requires Database, Logger
 *
 * type State = InspectValidation<typeof builder>;
 * // State.unsatisfiedDeps = DatabasePort (missing!)
 * ```
 */
export type InspectValidation<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer _TAsyncPorts,
    infer TDepGraph,
    infer TLifetimeMap,
    infer _TOverrides
  >
    ? ValidationState<TProvides, TRequires, TDepGraph, TLifetimeMap>
    : never;

// =============================================================================
// Simplified Type Utilities
// =============================================================================
//
// These types provide cleaner IDE tooltips by hiding internal phantom type
// parameters (TDepGraph, TLifetimeMap, etc.) that are implementation details.
//

/**
 * Extracts a simplified view of a GraphBuilder for inspection.
 *
 * This type hides internal phantom types (TDepGraph, TLifetimeMap, etc.) and
 * exposes only the information users typically care about:
 * - What ports are provided
 * - What dependencies are still unsatisfied
 * - Which ports have async factories
 * - Which ports are marked as overrides
 *
 * Use this for cleaner IDE tooltips when inspecting complex graphs.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter);
 *
 * // Instead of seeing: GraphBuilder<LoggerPort | DatabasePort, CachePort, never, { Logger: never, Database: "Logger" }, ...>
 * // You see:
 * type View = SimplifiedView<typeof builder>;
 * // {
 * //   provides: LoggerPort | DatabasePort;
 * //   unsatisfied: CachePort;
 * //   asyncPorts: never;
 * //   overrides: never;
 * // }
 * ```
 */
export type SimplifiedView<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer TAsync,
    infer _TDepGraph,
    infer _TLifetimeMap,
    infer TOverrides,
    infer _TParentProvides
  >
    ? {
        readonly provides: TProvides;
        readonly unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;
        readonly asyncPorts: TAsync;
        readonly overrides: TOverrides;
      }
    : never;

/**
 * Extracts the `TProvides` type parameter from a GraphBuilder.
 *
 * Returns the union of all port types that have adapters registered.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter);
 *
 * type Provided = InferBuilderProvides<typeof builder>;
 * // LoggerPort | DatabasePort
 * ```
 */
export type InferBuilderProvides<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer _TRequires,
    infer _TAsync,
    infer _TDepGraph,
    infer _TLifetimeMap,
    infer _TOverrides,
    infer _TParentProvides
  >
    ? TProvides
    : never;

/**
 * Extracts the unsatisfied dependencies from a GraphBuilder.
 *
 * Returns the union of port types that are required by adapters but not
 * yet provided. Returns `never` when all dependencies are satisfied.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(UserServiceAdapter); // Requires Logger, Database
 *
 * type Missing = InferBuilderUnsatisfied<typeof builder>;
 * // LoggerPort | DatabasePort
 *
 * const complete = builder
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter);
 *
 * type MissingNow = InferBuilderUnsatisfied<typeof complete>;
 * // never (all satisfied)
 * ```
 */
export type InferBuilderUnsatisfied<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer _TAsync,
    infer _TDepGraph,
    infer _TLifetimeMap,
    infer _TOverrides,
    infer _TParentProvides
  >
    ? UnsatisfiedDependencies<TProvides, TRequires>
    : never;

// =============================================================================
// IDE Tooltip Optimization Types
// =============================================================================
//
// GraphBuilder has 8 type parameters that overwhelm IDE tooltips:
// GraphBuilder<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, TOverrides, TParentProvides, TMaxDepth>
//
// Most of these are internal implementation details. Users only care about:
// - provides: what ports are available
// - unsatisfied: what's still missing
// - asyncPorts: which require async initialization
// - overrides: which are marked as overrides
//
// PrettyBuilder exposes a clean view for IDE tooltips.
//

/**
 * Simplified view of GraphBuilder for IDE tooltips.
 *
 * Hides internal type parameters (TDepGraph, TLifetimeMap, TParentProvides, TMaxDepth)
 * and shows only the information users typically care about.
 *
 * This type is primarily used via the `[__prettyView]` phantom property on GraphBuilder.
 * Hover over `builder[__prettyView]` in your IDE to see a clean summary.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(UserServiceAdapter); // Requires DatabasePort
 *
 * // Instead of seeing 8 type parameters in IDE tooltip:
 * // GraphBuilder<LoggerPort | UserServicePort, DatabasePort | LoggerPort, never, {...}, {...}, never, unknown, 30>
 *
 * // See this clean view:
 * type View = PrettyBuilder<typeof builder>;
 * // {
 * //   provides: LoggerPort | UserServicePort;
 * //   unsatisfied: DatabasePort;
 * //   asyncPorts: never;
 * //   overrides: never;
 * // }
 * ```
 */
export type PrettyBuilder<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer TAsyncPorts,
    infer _TDepGraph,
    infer _TLifetimeMap,
    infer TOverrides,
    infer _TParentProvides,
    infer _TMaxDepth
  >
    ? {
        readonly provides: TProvides;
        readonly unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;
        readonly asyncPorts: TAsyncPorts;
        readonly overrides: TOverrides;
      }
    : never;

// =============================================================================
// User-Facing Type Aliases
// =============================================================================
//
// These types provide cleaner alternatives to the full 8-parameter GraphBuilder
// for use in user code. They hide internal type parameters while maintaining
// type safety.
//

/**
 * A simplified GraphBuilder type that hides internal parameters.
 *
 * Use this type for variable annotations when you want cleaner code without
 * exposing internal phantom parameters (TDepGraph, TLifetimeMap, etc.).
 *
 * **When to use this type:**
 * - Function parameters that accept any complete builder
 * - Return types where internal parameters don't matter
 * - Variable annotations for readability
 *
 * **When NOT to use this type:**
 * - When you need compile-time validation (use the real GraphBuilder)
 * - When passing between provide() calls (type inference handles this)
 *
 * @example Function that accepts any complete builder
 * ```typescript
 * import { SimplifiedBuilder } from "@hex-di/graph";
 *
 * function processGraph<T extends SimplifiedBuilder>(
 *   builder: T
 * ): void {
 *   const graph = builder.build();
 *   // ...
 * }
 * ```
 *
 * @example Cleaner variable annotation
 * ```typescript
 * // Instead of:
 * // const builder: GraphBuilder<LoggerPort | DbPort, never, never, {...}, {...}, never, unknown, 30>
 *
 * // Use:
 * const builder: SimplifiedBuilder<LoggerPort | DbPort> = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter);
 * ```
 *
 * @typeParam TProvides - Union of provided port types
 * @typeParam TAsyncPorts - Union of async port types (default: never)
 * @typeParam TOverrides - Union of override port types (default: never)
 */
export type SimplifiedBuilder<
  TProvides = never,
  TAsyncPorts = never,
  TOverrides = never,
> = GraphBuilder<
  TProvides,
  TProvides, // TRequires = TProvides means all deps satisfied
  TAsyncPorts,
  Record<string, string>, // Generic dep graph
  Record<string, number>, // Generic lifetime map
  TOverrides,
  unknown,
  number // Generic max depth
>;
