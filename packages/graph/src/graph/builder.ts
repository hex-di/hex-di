/**
 * GraphBuilder - Immutable Fluent Builder with Compile-Time Validation.
 *
 * This module implements the core GraphBuilder class which accumulates adapters
 * and performs compile-time validation using advanced TypeScript patterns.
 *
 * ## Design Pattern: Type-State Machine
 *
 * GraphBuilder uses phantom type parameters to track state at the type level:
 * - `TProvides`: Union of all ports that have adapters
 * - `TRequires`: Union of all ports that are required by adapters
 * - `TAsyncPorts`: Union of ports with async factories
 * - `TDepGraph`: Type-level adjacency map for cycle detection
 * - `TLifetimeMap`: Type-level port→lifetime map for captive detection
 *
 * These type parameters change with each `.provide()` call, enabling
 * compile-time validation while the runtime implementation is trivial.
 *
 * ## Validation Order in ProvideResult
 *
 * When `.provide(adapter)` is called, validations run in this order:
 *
 * 1. **Duplicate Detection** (fastest, fail early)
 *    - `HasOverlap<NewPort, ExistingPorts>` → DuplicateErrorMessage
 *
 * 2. **Circular Dependency Detection**
 *    - `WouldCreateCycle<DepGraph, Provides, Requires>` → CircularErrorMessage
 *    - Uses DFS at type level (see cycle-detection.ts)
 *
 * 3. **Captive Dependency Detection**
 *    - `FindAnyCaptiveDependency<LifetimeMap, Level, Requires>` → CaptiveErrorMessage
 *    - Checks lifetime hierarchy (see captive-dependency.ts)
 *
 * 4. **Success**: Return new `GraphBuilder<...>` with updated type parameters
 *
 * ## Why Nested Conditionals (Not Unions)?
 *
 * We use nested `... extends true ? Error : (next check)` because:
 * - Each check must complete before the next runs
 * - Union return types would accept EITHER branch
 * - Nested structure preserves validation order
 *
 * ## Error Types: Template Literals
 *
 * Return types on failure are template literal strings like:
 * `"ERROR: Circular dependency: A -> B -> A"`
 *
 * This makes errors immediately visible in IDE tooltips without
 * expanding complex type structures.
 *
 * @see ./validation/cycle-detection.ts - DFS algorithm for cycles
 * @see ./validation/captive-dependency.ts - Lifetime hierarchy checks
 * @see ./validation/errors.ts - Template literal error types
 * @packageDocumentation
 */

import type {
  AdapterAny,
  InferAdapterProvides,
  InferAdapterRequires,
  InferManyProvides,
  InferManyRequires,
  InferManyAsyncPorts,
} from "../adapter";
import type {
  ExtractPortNames,
  UnsatisfiedDependencies,
  HasOverlap,
  OverlappingPorts,
  CircularDependencyError,
  WouldCreateCycle,
  AddEdge,
  AdapterProvidesName,
  AdapterRequiresNames,
  BuildCyclePath,
  MergeDependencyMaps,
  AddManyEdges,
  WouldAnyCreateCycle,
  DetectCycleInMergedGraph,
  LifetimeLevel,
  AddLifetime,
  GetLifetimeLevel,
  FindAnyCaptiveDependency,
  CaptiveDependencyError,
  LifetimeName,
  MergeLifetimeMaps,
  AddManyLifetimes,
  WouldAnyBeCaptive,
  DetectCaptiveInMergedGraph,
  FindLifetimeInconsistency,
  DuplicateErrorMessage,
  CircularErrorMessage,
  CaptiveErrorMessage,
  LifetimeInconsistencyErrorMessage,
} from "../validation";

import type { Graph } from "./types";
import type { IsNever } from "../common";

/**
 * Extracts the lifetime directly from an adapter using property access.
 * This explicitly maps each literal to avoid inference issues with unions.
 * @internal
 */
type DirectAdapterLifetime<A> = A extends { lifetime: "singleton" }
  ? "singleton"
  : A extends { lifetime: "scoped" }
    ? "scoped"
    : A extends { lifetime: "transient" }
      ? "transient"
      : "singleton";

/**
 * Unique symbol used for nominal typing of GraphBuilder types at the type level.
 */
declare const __graphBuilderBrand: unique symbol;

/**
 * Runtime symbol used as a property key for GraphBuilder branding.
 */
const GRAPH_BUILDER_BRAND = Symbol("GraphBuilder");

/**
 * The return type of `GraphBuilder.provide()` with duplicate, cycle, and captive dependency detection.
 *
 * This is the heart of HexDI's compile-time validation. It implements a validation
 * pipeline as a nested conditional type:
 *
 * ```
 * Input: Adapter A
 *    │
 *    ▼
 * ┌─────────────────────────────────────┐
 * │ 1. Duplicate Check                   │
 * │    HasOverlap<A.provides, TProvides> │
 * └─────────────┬───────────────────────┘
 *               │ false
 *               ▼
 * ┌─────────────────────────────────────┐
 * │ 2. Cycle Check                       │
 * │    WouldCreateCycle<DepGraph, ...>   │
 * └─────────────┬───────────────────────┘
 *               │ false
 *               ▼
 * ┌─────────────────────────────────────┐
 * │ 3. Captive Check                     │
 * │    FindAnyCaptiveDependency<...>     │
 * └─────────────┬───────────────────────┘
 *               │ never (no captive found)
 *               ▼
 * ┌─────────────────────────────────────┐
 * │ 4. Success!                          │
 * │    GraphBuilder<updated types>       │
 * └─────────────────────────────────────┘
 * ```
 *
 * If ANY check fails, the return type becomes an error template literal
 * like `"ERROR: Circular dependency: A -> B -> A"`.
 *
 * ## Design Decision: Single Error at a Time
 *
 * This type returns only the FIRST validation error encountered, not all errors.
 * This is an intentional design choice that prioritizes:
 *
 * - **Fast feedback**: Fail immediately on first error
 * - **Clear messages**: One error = one action item
 * - **Simple mental model**: Fix one issue at a time
 *
 * The trade-off is that multiple errors require multiple fix-and-retry cycles.
 * For comprehensive validation state, use `InspectValidation<typeof builder>`.
 *
 * @typeParam TProvides - Current union of provided ports
 * @typeParam TRequires - Current union of required ports
 * @typeParam TAsyncPorts - Current union of async ports
 * @typeParam TDepGraph - Current type-level dependency graph
 * @typeParam TLifetimeMap - Current type-level lifetime map
 * @typeParam TOverrides - Current union of override ports
 * @typeParam A - The adapter being added
 *
 * @internal
 */
type ProvideResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  A extends AdapterAny,
  TParentProvides = unknown,
> =
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Duplicate Detection (fastest check, fail early)
  // ═══════════════════════════════════════════════════════════════════════════
  HasOverlap<InferAdapterProvides<A>, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<InferAdapterProvides<A>, TProvides>>
    : // ═══════════════════════════════════════════════════════════════════════════
      // STEP 2: Circular Dependency Detection
      // Check if the new adapter's "provides" is reachable from its "requires"
      // through the existing graph. If yes, adding this adapter creates a cycle.
      // ═══════════════════════════════════════════════════════════════════════════
      WouldCreateCycle<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>> extends true
      ? CircularErrorMessage<
          BuildCyclePath<
            AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
            AdapterProvidesName<A>,
            AdapterRequiresNames<A>
          >
        >
      : // ═══════════════════════════════════════════════════════════════════════════
        // STEP 3: Captive Dependency Detection
        // Check if any required port has a shorter lifetime than this adapter.
        // If yes, this adapter would "capture" that shorter-lived dependency.
        // ═══════════════════════════════════════════════════════════════════════════
        FindAnyCaptiveDependency<
            TLifetimeMap,
            LifetimeLevel<DirectAdapterLifetime<A>>,
            AdapterRequiresNames<A>
          > extends infer CaptivePort
        ? IsNever<CaptivePort> extends true
          ? // ═══════════════════════════════════════════════════════════════════════
            // STEP 4: Success! Return new GraphBuilder with updated phantom types
            // - TProvides grows by the new port
            // - TRequires grows by the new requirements
            // - TDepGraph adds the new edge
            // - TLifetimeMap adds the new port's lifetime
            // - TOverrides is preserved (provide() doesn't add to overrides)
            // - TParentProvides is preserved
            // ═══════════════════════════════════════════════════════════════════════
            GraphBuilder<
              TProvides | InferAdapterProvides<A>,
              TRequires | InferAdapterRequires<A>,
              TAsyncPorts,
              AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
              AddLifetime<TLifetimeMap, AdapterProvidesName<A>, DirectAdapterLifetime<A>>,
              TOverrides,
              TParentProvides
            >
          : CaptivePort extends string
            ? CaptiveErrorMessage<
                AdapterProvidesName<A>,
                LifetimeName<LifetimeLevel<DirectAdapterLifetime<A>>>,
                CaptivePort,
                LifetimeName<GetLifetimeLevel<TLifetimeMap, CaptivePort>>
              >
            : // Fallback (shouldn't happen - defensive typing)
              GraphBuilder<
                TProvides | InferAdapterProvides<A>,
                TRequires | InferAdapterRequires<A>,
                TAsyncPorts,
                AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
                AddLifetime<TLifetimeMap, AdapterProvidesName<A>, DirectAdapterLifetime<A>>,
                TOverrides,
                TParentProvides
              >
        : never;

/**
 * The return type of `GraphBuilder.provideAsync()` with duplicate, cycle, and captive dependency detection.
 *
 * Note: Async adapters are always singletons, so captive dependency check still applies.
 *
 * @internal
 */
type ProvideAsyncResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  A extends AdapterAny & { readonly factoryKind: "async" },
  TParentProvides = unknown,
> =
  // First check for duplicate providers
  HasOverlap<InferAdapterProvides<A>, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<InferAdapterProvides<A>, TProvides>>
    : // Then check for circular dependencies
      WouldCreateCycle<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>> extends true
      ? CircularErrorMessage<
          BuildCyclePath<
            AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
            AdapterProvidesName<A>,
            AdapterRequiresNames<A>
          >
        >
      : // Then check for captive dependencies (async adapters are always singleton = level 1)
        FindAnyCaptiveDependency<
            TLifetimeMap,
            1, // Async adapters are always singleton
            AdapterRequiresNames<A>
          > extends infer CaptivePort
        ? IsNever<CaptivePort> extends true
          ? // Success: return new builder with updated types
            GraphBuilder<
              TProvides | InferAdapterProvides<A>,
              TRequires | InferAdapterRequires<A>,
              TAsyncPorts | InferAdapterProvides<A>,
              AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
              AddLifetime<TLifetimeMap, AdapterProvidesName<A>, "singleton">,
              TOverrides,
              TParentProvides
            >
          : CaptivePort extends string
            ? CaptiveErrorMessage<
                AdapterProvidesName<A>,
                "Singleton",
                CaptivePort,
                LifetimeName<GetLifetimeLevel<TLifetimeMap, CaptivePort>>
              >
            : // Fallback (shouldn't happen)
              GraphBuilder<
                TProvides | InferAdapterProvides<A>,
                TRequires | InferAdapterRequires<A>,
                TAsyncPorts | InferAdapterProvides<A>,
                AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
                AddLifetime<TLifetimeMap, AdapterProvidesName<A>, "singleton">,
                TOverrides,
                TParentProvides
              >
        : never;

/**
 * Checks if a union of new ports overlaps with existing keys.
 * Used for batch collision detection.
 *
 * @internal
 */
type BatchHasOverlap<NewPorts, ExistingPorts> = HasOverlap<NewPorts, ExistingPorts>;

/**
 * The return type of `GraphBuilder.provideMany()` with duplicate, cycle, and captive dependency detection.
 *
 * @internal
 */
type ProvideManyResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  A extends readonly AdapterAny[],
  TParentProvides = unknown,
> =
  // First check for duplicate providers
  BatchHasOverlap<InferManyProvides<A>, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<InferManyProvides<A>, TProvides>>
    : // Then check for circular dependencies in the batch
      WouldAnyCreateCycle<TDepGraph, A> extends CircularDependencyError<infer Path>
      ? CircularErrorMessage<Path>
      : // Then check for captive dependencies in the batch
        WouldAnyBeCaptive<TLifetimeMap, A> extends CaptiveDependencyError<
            infer DN,
            infer DL,
            infer CP,
            infer CL
          >
        ? CaptiveErrorMessage<DN, DL, CP, CL>
        : // Success: return new builder with updated types
          GraphBuilder<
            TProvides | InferManyProvides<A>,
            TRequires | InferManyRequires<A>,
            TAsyncPorts | InferManyAsyncPorts<A>,
            AddManyEdges<TDepGraph, A>,
            AddManyLifetimes<TLifetimeMap, A>,
            TOverrides,
            TParentProvides
          >;

/**
 * The return type of `GraphBuilder.merge()` with validation.
 *
 * Performs four validations in order:
 * 1. Lifetime consistency - checks if same port has different lifetimes across graphs
 * 2. Duplicate detection - checks if any port is provided by both graphs
 * 3. Cycle detection - checks if merging creates any circular dependencies
 * 4. Captive dependency detection - checks if merging creates any lifetime violations
 *
 * @internal
 */
type MergeResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  OProvides,
  ORequires,
  OAsyncPorts,
  ODepGraph,
  OLifetimeMap,
  OOverrides,
  TParentProvides = unknown,
> =
  // Step 0: Check for lifetime inconsistency (same port, different lifetimes)
  // This provides a more specific error than generic duplicate detection
  FindLifetimeInconsistency<TLifetimeMap, OLifetimeMap> extends infer Inconsistent
    ? IsNever<Inconsistent> extends false
      ? Inconsistent extends string
        ? LifetimeInconsistencyErrorMessage<
            Inconsistent,
            LifetimeName<GetLifetimeLevel<TLifetimeMap, Inconsistent>>,
            LifetimeName<GetLifetimeLevel<OLifetimeMap, Inconsistent>>
          >
        : MergeResultAfterLifetimeCheck<
            TProvides,
            TRequires,
            TAsyncPorts,
            TDepGraph,
            TLifetimeMap,
            TOverrides,
            OProvides,
            ORequires,
            OAsyncPorts,
            ODepGraph,
            OLifetimeMap,
            OOverrides,
            TParentProvides
          >
      : MergeResultAfterLifetimeCheck<
          TProvides,
          TRequires,
          TAsyncPorts,
          TDepGraph,
          TLifetimeMap,
          TOverrides,
          OProvides,
          ORequires,
          OAsyncPorts,
          ODepGraph,
          OLifetimeMap,
          OOverrides,
          TParentProvides
        >
    : MergeResultAfterLifetimeCheck<
        TProvides,
        TRequires,
        TAsyncPorts,
        TDepGraph,
        TLifetimeMap,
        TOverrides,
        OProvides,
        ORequires,
        OAsyncPorts,
        ODepGraph,
        OLifetimeMap,
        OOverrides,
        TParentProvides
      >;

/**
 * Helper type for merge validation after lifetime consistency check.
 * Checks duplicates, cycles, and captive dependencies.
 * @internal
 */
type MergeResultAfterLifetimeCheck<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  OProvides,
  ORequires,
  OAsyncPorts,
  ODepGraph,
  OLifetimeMap,
  OOverrides,
  TParentProvides = unknown,
> =
  // Step 1: Check for duplicate ports
  HasOverlap<OProvides, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<OProvides, TProvides>>
    : // Step 2: Check for cycles in merged graph
      DetectCycleInMergedGraph<MergeDependencyMaps<TDepGraph, ODepGraph>> extends infer CycleError
      ? IsNever<CycleError> extends false
        ? CycleError extends CircularDependencyError<infer Path>
          ? CircularErrorMessage<Path>
          : MergeResultAfterCycleCheck<
              TProvides,
              TRequires,
              TAsyncPorts,
              TDepGraph,
              TLifetimeMap,
              TOverrides,
              OProvides,
              ORequires,
              OAsyncPorts,
              ODepGraph,
              OLifetimeMap,
              OOverrides,
              TParentProvides
            >
        : MergeResultAfterCycleCheck<
            TProvides,
            TRequires,
            TAsyncPorts,
            TDepGraph,
            TLifetimeMap,
            TOverrides,
            OProvides,
            ORequires,
            OAsyncPorts,
            ODepGraph,
            OLifetimeMap,
            OOverrides,
            TParentProvides
          >
      : MergeResultAfterCycleCheck<
          TProvides,
          TRequires,
          TAsyncPorts,
          TDepGraph,
          TLifetimeMap,
          TOverrides,
          OProvides,
          ORequires,
          OAsyncPorts,
          ODepGraph,
          OLifetimeMap,
          OOverrides,
          TParentProvides
        >;

/**
 * Helper type for merge validation after cycle check.
 * Checks captive dependencies and returns merged builder on success.
 * @internal
 */
type MergeResultAfterCycleCheck<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  OProvides,
  ORequires,
  OAsyncPorts,
  ODepGraph,
  OLifetimeMap,
  OOverrides,
  TParentProvides = unknown,
> =
  // Step 3: Check for captive dependencies in merged graph
  DetectCaptiveInMergedGraph<
    MergeDependencyMaps<TDepGraph, ODepGraph>,
    MergeLifetimeMaps<TLifetimeMap, OLifetimeMap>
  > extends infer CaptiveError
    ? IsNever<CaptiveError> extends false
      ? CaptiveError extends CaptiveDependencyError<infer DN, infer DL, infer CP, infer CL>
        ? CaptiveErrorMessage<DN, DL, CP, CL>
        : // All checks passed - return merged builder
          GraphBuilder<
            TProvides | OProvides,
            TRequires | ORequires,
            TAsyncPorts | OAsyncPorts,
            MergeDependencyMaps<TDepGraph, ODepGraph>,
            MergeLifetimeMaps<TLifetimeMap, OLifetimeMap>,
            TOverrides | OOverrides,
            TParentProvides
          >
      : // No captive errors - return merged builder
        GraphBuilder<
          TProvides | OProvides,
          TRequires | ORequires,
          TAsyncPorts | OAsyncPorts,
          MergeDependencyMaps<TDepGraph, ODepGraph>,
          MergeLifetimeMaps<TLifetimeMap, OLifetimeMap>,
          TOverrides | OOverrides,
          TParentProvides
        >
    : // Shouldn't happen - fallback
      GraphBuilder<
        TProvides | OProvides,
        TRequires | ORequires,
        TAsyncPorts | OAsyncPorts,
        MergeDependencyMaps<TDepGraph, ODepGraph>,
        MergeLifetimeMaps<TLifetimeMap, OLifetimeMap>,
        TOverrides | OOverrides,
        TParentProvides
      >;

// =============================================================================
// Override Validation Types
// =============================================================================

/**
 * Error message for override validation when port doesn't exist in parent.
 *
 * @typeParam TPortName - The port name that was attempted to be overridden
 * @internal
 */
type InvalidOverrideErrorMessage<TPortName extends string> =
  `ERROR: Cannot override '${TPortName}' - port not provided by parent graph. Fix: Use .provide() to add new ports, or ensure parent provides '${TPortName}'.`;

/**
 * Extracts port names from a union of Port types.
 * Used for parent provides validation.
 * @internal
 */
type ExtractPortNamesFromUnion<T> = T extends { readonly __portName: infer N } ? N : never;

/**
 * Checks if a type is exactly `unknown`.
 *
 * Uses bidirectional assignability check: T is unknown iff
 * [T] extends [unknown] AND [unknown] extends [T].
 *
 * @internal
 */
type IsExactlyUnknown<T> = [T] extends [unknown] ? ([unknown] extends [T] ? true : false) : false;

/**
 * The return type of `GraphBuilder.override()` with parent validation.
 *
 * When TParentProvides is `unknown` (no parent specified), this behaves like
 * the standard ProvideResult but tracks the adapter as an override.
 *
 * When TParentProvides is a Port union (parent specified via forParent()),
 * this validates that the adapter's port exists in the parent before allowing
 * the override.
 *
 * @internal
 */
type OverrideResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TParentProvides,
  A extends AdapterAny,
  TParentProvidesToPass = unknown,
> =
  // If no parent specified (TParentProvides is exactly unknown), allow any override
  IsExactlyUnknown<TParentProvides> extends true
    ? ProvideResult<
        TProvides,
        TRequires,
        TAsyncPorts,
        TDepGraph,
        TLifetimeMap,
        TOverrides | InferAdapterProvides<A>,
        A,
        TParentProvidesToPass
      >
    : // Parent specified - validate that the adapter's port exists in parent
      ExtractPortNamesFromUnion<
          InferAdapterProvides<A>
        > extends ExtractPortNamesFromUnion<TParentProvides>
      ? ProvideResult<
          TProvides,
          TRequires,
          TAsyncPorts,
          TDepGraph,
          TLifetimeMap,
          TOverrides | InferAdapterProvides<A>,
          A,
          TParentProvides
        >
      : InvalidOverrideErrorMessage<ExtractPortNamesFromUnion<InferAdapterProvides<A>> & string>;

/**
 * Type representing an empty dependency graph map.
 * Used as the initial state for compile-time cycle detection.
 *
 * IMPORTANT: Must be `{}` not `Record<string, never>`.
 * Using `Record<string, never>` causes index signature pollution when
 * intersected with specific properties. For example:
 * `Record<string, never> & { A: "B" }` makes `["A"]` return `never & "B"` = `never`.
 *
 * @internal
 */
type EmptyDependencyGraph = {};

/**
 * Type representing an empty lifetime map.
 * Used as the initial state for compile-time captive dependency detection.
 *
 * IMPORTANT: Must be `{}` not `Record<string, never>`.
 * See EmptyDependencyGraph for explanation.
 *
 * @internal
 */
type EmptyLifetimeMap = {};

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
 * if (inspection.maxChainDepth > 25) {
 *   console.warn('Deep dependency chain detected, consider restructuring');
 * }
 * ```
 */
export interface GraphInspection {
  /** Number of adapters registered in this builder */
  readonly adapterCount: number;
  /** List of provided ports with their lifetimes (e.g., "Logger (singleton)") */
  readonly provides: readonly string[];
  /** Port names that are required but not yet provided */
  readonly unsatisfiedRequirements: readonly string[];
  /** Map of port name to its direct dependency port names */
  readonly dependencyMap: Readonly<Record<string, readonly string[]>>;
  /** Port names marked as overrides for parent containers */
  readonly overrides: readonly string[];
  /**
   * Maximum dependency chain depth in the current graph.
   *
   * If this approaches 30, type-level cycle detection may not reach all paths.
   * Consider restructuring or using `buildFragment()` for deep subgraphs.
   */
  readonly maxChainDepth: number;
  /** Human-readable summary of the graph state */
  readonly summary: string;
  /** True if all requirements are satisfied (ready to build) */
  readonly isComplete: boolean;
}

// =============================================================================
// Runtime Helpers for inspect()
// =============================================================================

/**
 * Computes the maximum dependency chain depth in a dependency map.
 *
 * Uses memoized DFS to find the longest path through the dependency graph.
 * This helps users understand if their graph is approaching the type-level
 * MaxDepth limit (30) for cycle detection.
 *
 * @param depMap - Map of port name to its dependency port names
 * @returns The length of the longest dependency chain (0 for empty graph)
 *
 * @internal
 */
function computeMaxChainDepth(depMap: Record<string, readonly string[]>): number {
  const memo = new Map<string, number>();

  function dfs(port: string, visited: Set<string>): number {
    if (visited.has(port)) return 0; // Cycle detected - don't infinite loop
    const cached = memo.get(port);
    if (cached !== undefined) return cached;

    visited.add(port);
    const deps = depMap[port] ?? [];
    let maxDepth = 0;
    for (const dep of deps) {
      maxDepth = Math.max(maxDepth, 1 + dfs(dep, visited));
    }
    visited.delete(port);
    memo.set(port, maxDepth);
    return maxDepth;
  }

  let max = 0;
  for (const port of Object.keys(depMap)) {
    max = Math.max(max, dfs(port, new Set()));
  }
  return max;
}

/**
 * Inspects a built Graph and returns detailed runtime information.
 *
 * This is the companion function to `GraphBuilder.inspect()` for use with
 * already-built graphs. Use this when you need to analyze a graph after
 * calling `build()`.
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
 * if (info.maxChainDepth > 25) {
 *   console.warn(
 *     `Deep dependency chain (${info.maxChainDepth}). ` +
 *     `Consider splitting into subgraphs.`
 *   );
 * }
 *
 * // Proceed to create runtime container
 * const container = createContainer(graph);
 * ```
 *
 * @param graph - The built graph to inspect
 * @returns A frozen GraphInspection object with all inspection data
 */
export function inspectGraph(graph: Graph): GraphInspection {
  const provides: string[] = [];
  const allRequires = new Set<string>();
  const providedSet = new Set<string>();
  const dependencyMap: Record<string, string[]> = {};

  for (const adapter of graph.adapters) {
    const portName = adapter.provides.__portName;
    const lifetime = adapter.lifetime;
    provides.push(`${portName} (${lifetime})`);
    providedSet.add(portName);

    const requires: string[] = [];
    for (const req of adapter.requires) {
      requires.push(req.__portName);
      allRequires.add(req.__portName);
    }
    dependencyMap[portName] = requires;
  }

  const unsatisfiedRequirements = [...allRequires].filter(r => !providedSet.has(r));
  const overrides = [...graph.overridePortNames];
  const maxChainDepth = computeMaxChainDepth(dependencyMap);

  const providedNames = [...providedSet].join(", ");
  const missingPart =
    unsatisfiedRequirements.length > 0 ? `. Missing: ${unsatisfiedRequirements.join(", ")}` : "";

  return Object.freeze({
    adapterCount: graph.adapters.length,
    provides,
    unsatisfiedRequirements,
    dependencyMap,
    overrides,
    maxChainDepth,
    isComplete: unsatisfiedRequirements.length === 0,
    summary: `Graph(${graph.adapters.length} adapters, ${unsatisfiedRequirements.length} unsatisfied): ${providedNames}${missingPart}`,
  });
}

/**
 * An immutable builder for constructing dependency graphs with compile-time validation.
 *
 * GraphBuilder implements the **Type-State Pattern** - a technique where an object's
 * type changes with each method call, encoding the object's state in its type.
 *
 * ## Phantom Type Parameters
 *
 * The type parameters below exist only at the type level (compile time).
 * They have no runtime representation - the actual GraphBuilder class is
 * just a wrapper around a readonly array of adapters.
 *
 * ```typescript
 * // Type-level state is rich:
 * GraphBuilder<
 *   LoggerPort | DatabasePort,  // TProvides: what we have
 *   CachePort,                  // TRequires: what we still need
 *   never,                      // TAsyncPorts: none
 *   { Logger: never, Database: "Logger" },  // TDepGraph
 *   { Logger: 1, Database: 2 }              // TLifetimeMap
 * >
 *
 * // Runtime state is simple:
 * { adapters: [LoggerAdapter, DatabaseAdapter] }
 * ```
 *
 * ## Immutability
 *
 * Each `.provide()` call returns a NEW GraphBuilder instance with updated
 * type parameters. The original instance is not modified. This enables
 * "branching" - creating specialized graphs from a common base.
 *
 * ## Child Graphs with override()
 *
 * The `override()` method marks an adapter as replacing a parent's adapter:
 *
 * ```typescript
 * const childGraph = GraphBuilder.create()
 *   .override(MockLoggerAdapter)  // Replaces parent's Logger
 *   .provide(CacheAdapter)        // Adds new Cache port
 *   .build();
 * ```
 *
 * @typeParam TProvides - Union of all port types provided by adapters in this graph
 * @typeParam TRequires - Union of all port types required by adapters in this graph
 * @typeParam TAsyncPorts - Union of all async port types in this graph
 * @typeParam TDepGraph - **Internal** - Type-level dependency map for cycle detection. Ignore in IDE tooltips.
 * @typeParam TLifetimeMap - **Internal** - Type-level lifetime map for captive detection. Ignore in IDE tooltips.
 * @typeParam TOverrides - Union of port types that are overrides (not new provides)
 *
 * **Note on IDE Tooltips**: When hovering over a GraphBuilder variable, you may see
 * internal type parameters like `TDepGraph` and `TLifetimeMap`. These are used for
 * compile-time validation and can be safely ignored. Focus on `TProvides` (what ports
 * are available) and `TAsyncPorts` (which require async initialization).
 *
 * @example Creating a root graph
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)    // Type changes to include Logger
 *   .provide(DatabaseAdapter)  // Type changes to include Database
 *   .build();                  // Validates all requirements met
 * ```
 *
 * @example Creating a child graph with overrides
 * ```typescript
 * const childGraph = GraphBuilder.create()
 *   .override(MockLoggerAdapter)  // Override parent's Logger
 *   .provide(CacheAdapter)        // Add new Cache port
 *   .build();
 * ```
 */
export class GraphBuilder<
  TProvides = never,
  TRequires = never,
  out TAsyncPorts = never,
  TDepGraph = EmptyDependencyGraph,
  TLifetimeMap = EmptyLifetimeMap,
  out TOverrides = never,
  TParentProvides = unknown,
> {
  /**
   * Type-level brand property for nominal typing.
   *
   * The `unique symbol` key ensures this type cannot be confused with
   * structurally similar objects. The tuple value carries all phantom
   * type parameters for type inference.
   *
   * @internal
   */
  declare private readonly [__graphBuilderBrand]: [
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    TOverrides,
    TParentProvides,
  ];

  /**
   * Runtime brand marker for GraphBuilder instances.
   * @internal
   */
  private readonly [GRAPH_BUILDER_BRAND] = true as const;

  // ═══════════════════════════════════════════════════════════════════════════
  // PHANTOM TYPE PROPERTIES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // These properties are declared with `declare` which means they exist ONLY
  // at the type level - there is no runtime code generated for them.
  //
  // WHY PHANTOM TYPES?
  //
  // They enable TypeScript to infer the current state of the builder from
  // method return types, without any runtime overhead. When you hover over
  // a builder in your IDE, you can see exactly what ports are provided,
  // required, etc.
  //

  /**
   * Phantom type property tracking provided ports.
   *
   * As adapters are added, this grows: `never` → `LoggerPort` → `LoggerPort | DatabasePort`
   *
   * @internal
   */
  declare readonly __provides: TProvides;

  /**
   * Phantom type property tracking required ports.
   *
   * As adapters are added, this accumulates all their dependencies.
   * On `.build()`, we check that `TRequires ⊆ TProvides`.
   *
   * @internal
   */
  declare readonly __requires: TRequires;

  /**
   * Phantom type property tracking async ports.
   *
   * Ports with async factories require special handling at runtime
   * (must call `container.initialize()` before sync resolution).
   *
   * @internal
   */
  declare readonly __asyncPorts: TAsyncPorts;

  /**
   * Phantom type property for compile-time dependency graph.
   *
   * Structure: `{ [PortName]: RequiredPortNames }`
   * - Used for circular dependency detection via DFS at type level
   * - Each entry maps a port to its direct dependencies
   *
   * @example
   * ```typescript
   * // If Database depends on Logger:
   * { Logger: never, Database: "Logger" }
   * ```
   *
   * @internal
   */
  declare readonly __depGraph: TDepGraph;

  /**
   * Phantom type property for compile-time lifetime map.
   *
   * Structure: `{ [PortName]: 1 | 2 | 3 }`
   * - 1 = Singleton, 2 = Scoped, 3 = Transient
   * - Used for captive dependency detection
   *
   * @example
   * ```typescript
   * // Logger is singleton, Database is scoped:
   * { Logger: 1, Database: 2 }
   * ```
   *
   * @internal
   */
  declare readonly __lifetimeMap: TLifetimeMap;

  /**
   * Phantom type property for compile-time override tracking.
   *
   * Tracks which ports are marked as overrides (via `.override()`)
   * vs new provides (via `.provide()`).
   *
   * @internal
   */
  declare readonly __overrides: TOverrides;

  /**
   * Phantom type property for compile-time parent graph tracking.
   *
   * When using `forParent()`, this tracks what ports the parent provides,
   * enabling compile-time validation that `override()` calls only target
   * ports that actually exist in the parent.
   *
   * When `unknown` (the default), no parent validation is performed.
   *
   * @internal
   */
  declare readonly __parentProvides: TParentProvides;

  /**
   * The readonly array of registered adapters.
   * Uses AdapterAny for structural compatibility with all adapter types.
   */
  readonly adapters: readonly AdapterAny[];

  /**
   * The set of port names marked as overrides.
   * Used at runtime to distinguish overrides from extensions.
   */
  readonly overridePortNames: ReadonlySet<string>;

  /**
   * Private constructor to enforce factory method pattern.
   * Uses AdapterAny for structural compatibility with all adapter types.
   * @internal
   */
  private constructor(
    adapters: readonly AdapterAny[],
    overridePortNames: ReadonlySet<string> = new Set()
  ) {
    // Freeze the adapters array for deep immutability
    this.adapters = Object.freeze([...adapters]);
    this.overridePortNames = overridePortNames;
    Object.freeze(this);
  }

  /**
   * Creates a new empty GraphBuilder.
   */
  static create(): GraphBuilder<
    never,
    never,
    never,
    EmptyDependencyGraph,
    EmptyLifetimeMap,
    never,
    unknown
  > {
    return new GraphBuilder([], new Set());
  }

  /**
   * Creates a new GraphBuilder for building a child graph with parent-aware validation.
   *
   * Use this when creating child containers where you want compile-time validation
   * that `override()` calls target ports that actually exist in the parent graph.
   *
   * Without `forParent()`, `override()` allows overriding any port (validation
   * happens at runtime when the child container is created).
   *
   * With `forParent()`, `override()` validates at compile-time that the port
   * exists in the parent, catching errors earlier.
   *
   * @example Compile-time override validation
   * ```typescript
   * const parentGraph = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(DatabaseAdapter)
   *   .build();
   *
   * // With forParent - compile-time validation
   * const childBuilder = GraphBuilder.forParent(parentGraph)
   *   .override(MockLoggerAdapter)    // OK - Logger exists in parent
   *   .override(MockCacheAdapter);    // ERROR - Cache not in parent!
   *   // Type error: "ERROR: Cannot override 'Cache' - port not provided by parent graph..."
   *
   * // Without forParent - runtime validation only
   * const childBuilder2 = GraphBuilder.create()
   *   .override(MockLoggerAdapter)    // OK at compile time
   *   .override(MockCacheAdapter);    // OK at compile time (error at runtime)
   * ```
   *
   * @param _parent - The parent graph (used only for type inference)
   * @returns A new GraphBuilder with parent-aware override validation
   */
  static forParent<TParentProvides, TParentAsync, TParentOverrides>(
    _parent: Graph<TParentProvides, TParentAsync, TParentOverrides>
  ): GraphBuilder<
    never,
    never,
    never,
    EmptyDependencyGraph,
    EmptyLifetimeMap,
    never,
    TParentProvides
  > {
    // The parent parameter is only used for type inference.
    // At runtime, we just create an empty builder.
    return new GraphBuilder([], new Set());
  }

  /**
   * Registers an adapter with the graph.
   * Performs compile-time duplicate, circular, and captive dependency detection.
   */
  provide<A extends AdapterAny>(
    adapter: A
  ): ProvideResult<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, TOverrides, A> {
    return new GraphBuilder([...this.adapters, adapter], this.overridePortNames) as ProvideResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      A
    >;
  }

  /**
   * Registers an async adapter with the graph.
   * Performs compile-time duplicate, circular, and captive dependency detection.
   */
  provideAsync<A extends AdapterAny & { readonly factoryKind: "async" }>(
    adapter: A
  ): ProvideAsyncResult<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, TOverrides, A> {
    return new GraphBuilder(
      [...this.adapters, adapter],
      this.overridePortNames
    ) as ProvideAsyncResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      A
    >;
  }

  /**
   * Registers multiple adapters with the graph in a batch.
   * Performs compile-time duplicate, circular, and captive dependency detection.
   */
  provideMany<const A extends readonly AdapterAny[]>(
    adapters: A
  ): ProvideManyResult<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, TOverrides, A> {
    return new GraphBuilder(
      [...this.adapters, ...adapters],
      this.overridePortNames
    ) as ProvideManyResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      A
    >;
  }

  /**
   * Registers an adapter as an override for a parent container's adapter.
   *
   * Use this when building a child graph to replace a parent's adapter.
   * Overrides are like `provide()` but marked for replacement rather than extension.
   *
   * ## Compile-Time Validation
   *
   * When using `GraphBuilder.forParent(parentGraph)`, this method validates
   * at compile-time that the port exists in the parent. If you use
   * `GraphBuilder.create()` without a parent, validation happens at runtime.
   *
   * @example With compile-time validation (recommended)
   * ```typescript
   * const parentGraph = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .build();
   *
   * // Compile-time validation enabled
   * const childBuilder = GraphBuilder.forParent(parentGraph)
   *   .override(MockLoggerAdapter)  // OK - Logger exists in parent
   *   .override(MockCacheAdapter);  // ERROR - Cache not in parent!
   * ```
   *
   * @example Without compile-time validation (runtime validation only)
   * ```typescript
   * // No parent specified - validation at runtime
   * const childFragment = GraphBuilder.create()
   *   .override(MockLoggerAdapter)  // OK at compile time
   *   .provide(CacheAdapter)
   *   .buildFragment();
   * ```
   *
   * @param adapter - The adapter to mark as an override
   * @returns A new GraphBuilder with the adapter marked as override
   */
  override<A extends AdapterAny>(
    adapter: A
  ): OverrideResult<
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    TOverrides,
    TParentProvides,
    A
  > {
    // Add to overridePortNames set
    const newOverrides = new Set(this.overridePortNames);
    newOverrides.add(adapter.provides.__portName);

    return new GraphBuilder([...this.adapters, adapter], newOverrides) as OverrideResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      TParentProvides,
      A
    >;
  }

  /**
   * Merges another GraphBuilder into this one.
   *
   * Performs compile-time validation for:
   * 1. Duplicate ports - fails if any port is provided by both graphs
   * 2. Circular dependencies - detects cycles that form when graphs are combined
   * 3. Captive dependencies - detects lifetime violations in the merged graph
   */
  merge<OProvides, ORequires, OAsyncPorts, ODepGraph, OLifetimeMap, OOverrides>(
    other: GraphBuilder<OProvides, ORequires, OAsyncPorts, ODepGraph, OLifetimeMap, OOverrides>
  ): MergeResult<
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    TOverrides,
    OProvides,
    ORequires,
    OAsyncPorts,
    ODepGraph,
    OLifetimeMap,
    OOverrides
  > {
    // Merge override port names from both builders
    const mergedOverrides = new Set([...this.overridePortNames, ...other.overridePortNames]);

    return new GraphBuilder([...this.adapters, ...other.adapters], mergedOverrides) as MergeResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      OProvides,
      ORequires,
      OAsyncPorts,
      ODepGraph,
      OLifetimeMap,
      OOverrides
    >;
  }

  /**
   * Returns a runtime snapshot of the current graph state for debugging.
   *
   * This method provides visibility into the graph's structure at runtime,
   * complementing the compile-time validation. Use it to:
   *
   * - Debug complex graph configurations
   * - Understand dependency relationships
   * - Check if the graph approaches the MaxDepth limit (30)
   * - Verify which requirements are still unsatisfied
   *
   * @returns A frozen object with graph metadata and a human-readable summary
   *
   * @example Basic usage
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(DatabaseAdapter);
   *
   * const info = builder.inspect();
   * console.log(info.summary);
   * // "Graph(2 adapters, 0 unsatisfied): Logger (singleton), Database (scoped)"
   * ```
   *
   * @example Checking depth before build
   * ```typescript
   * const builder = createComplexGraph();
   * const info = builder.inspect();
   *
   * if (info.maxChainDepth > 25) {
   *   console.warn(
   *     `Deep dependency chain (${info.maxChainDepth}). ` +
   *     `Consider splitting into subgraphs or using buildFragment().`
   *   );
   * }
   * ```
   */
  inspect(): GraphInspection {
    const provides: string[] = [];
    const allRequires = new Set<string>();
    const providedSet = new Set<string>();
    const dependencyMap: Record<string, string[]> = {};

    for (const adapter of this.adapters) {
      const portName = adapter.provides.__portName;
      const lifetime = adapter.lifetime;
      provides.push(`${portName} (${lifetime})`);
      providedSet.add(portName);

      const requires: string[] = [];
      for (const req of adapter.requires) {
        requires.push(req.__portName);
        allRequires.add(req.__portName);
      }
      dependencyMap[portName] = requires;
    }

    const unsatisfiedRequirements = [...allRequires].filter(r => !providedSet.has(r));
    const overrides = [...this.overridePortNames];
    const maxChainDepth = computeMaxChainDepth(dependencyMap);

    const providedNames = [...providedSet].join(", ");
    const missingPart =
      unsatisfiedRequirements.length > 0 ? `. Missing: ${unsatisfiedRequirements.join(", ")}` : "";

    return Object.freeze({
      adapterCount: this.adapters.length,
      provides,
      unsatisfiedRequirements,
      dependencyMap,
      overrides,
      maxChainDepth,
      isComplete: unsatisfiedRequirements.length === 0,
      summary: `Graph(${this.adapters.length} adapters, ${unsatisfiedRequirements.length} unsatisfied): ${providedNames}${missingPart}`,
    });
  }

  /**
   * Builds the dependency graph after validating all dependencies are satisfied.
   *
   * @remarks
   * If dependencies are missing, the return type becomes a template literal error
   * message instead of a Graph. This produces clear compile-time errors when you
   * try to use the result.
   *
   * @example
   * ```typescript
   * // When Logger is missing, return type is:
   * // "ERROR: Missing adapters for Logger. Call .provide() first."
   * //
   * // Trying to use this result produces:
   * // Type '"ERROR: Missing adapters for Logger..."' is not assignable to type 'Graph<...>'
   * ```
   */
  build(): [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
    ? Graph<TProvides, TAsyncPorts, TOverrides>
    : `ERROR: Missing adapters for ${ExtractPortNames<UnsatisfiedDependencies<TProvides, TRequires>>}. Call .provide() first.` {
    // Phantom type properties (__provides, __asyncPorts, __overrides) exist only at compile-time.
    // The runtime object needs the adapters array and overridePortNames set.
    // The conditional return type is only for compile-time validation.
    // At runtime, this always returns a Graph (even if incomplete - that's a type-level error).
    return Object.freeze({
      adapters: this.adapters,
      overridePortNames: this.overridePortNames,
    }) as [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
      ? Graph<TProvides, TAsyncPorts, TOverrides>
      : `ERROR: Missing adapters for ${ExtractPortNames<UnsatisfiedDependencies<TProvides, TRequires>>}. Call .provide() first.`;
  }

  /**
   * Builds a graph fragment for child containers.
   *
   * Unlike `build()`, this method does NOT validate that all dependencies are
   * satisfied internally. Child graphs can have adapters that require ports
   * provided by the parent container.
   *
   * @remarks
   * Use this when creating child graphs where dependencies will be satisfied
   * by the parent container at runtime.
   *
   * @example
   * ```typescript
   * // ConfigAdapter requires LoggerPort which parent provides
   * const ConfigAdapter = createAdapter({
   *   provides: ConfigPort,
   *   requires: [LoggerPort],  // Will come from parent
   *   factory: deps => ({ getValue: () => deps.Logger.log('config') })
   * });
   *
   * // Use buildFragment() when dependencies come from parent
   * const childGraph = GraphBuilder.create()
   *   .provide(ConfigAdapter)
   *   .buildFragment();  // No error about missing Logger
   *
   * const child = container.createChild(childGraph);
   * ```
   */
  buildFragment(): Graph<TProvides, TAsyncPorts, TOverrides> {
    return Object.freeze({
      adapters: this.adapters,
      overridePortNames: this.overridePortNames,
    }) as Graph<TProvides, TAsyncPorts, TOverrides>;
  }
}
