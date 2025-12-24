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
            // ═══════════════════════════════════════════════════════════════════════
            GraphBuilder<
              TProvides | InferAdapterProvides<A>,
              TRequires | InferAdapterRequires<A>,
              TAsyncPorts,
              AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
              AddLifetime<TLifetimeMap, AdapterProvidesName<A>, DirectAdapterLifetime<A>>,
              TOverrides
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
                TOverrides
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
              TOverrides
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
                TOverrides
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
            TOverrides
          >;

/**
 * Helper type to check if a type is never.
 * @internal
 */
type MergeIsNever<T> = [T] extends [never] ? true : false;

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
> =
  // Step 0: Check for lifetime inconsistency (same port, different lifetimes)
  // This provides a more specific error than generic duplicate detection
  FindLifetimeInconsistency<TLifetimeMap, OLifetimeMap> extends infer Inconsistent
    ? MergeIsNever<Inconsistent> extends false
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
            OOverrides
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
          OOverrides
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
        OOverrides
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
> =
  // Step 1: Check for duplicate ports
  HasOverlap<OProvides, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<OProvides, TProvides>>
    : // Step 2: Check for cycles in merged graph
      DetectCycleInMergedGraph<MergeDependencyMaps<TDepGraph, ODepGraph>> extends infer CycleError
      ? MergeIsNever<CycleError> extends false
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
              OOverrides
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
            OOverrides
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
          OOverrides
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
> =
  // Step 3: Check for captive dependencies in merged graph
  DetectCaptiveInMergedGraph<
    MergeDependencyMaps<TDepGraph, ODepGraph>,
    MergeLifetimeMaps<TLifetimeMap, OLifetimeMap>
  > extends infer CaptiveError
    ? MergeIsNever<CaptiveError> extends false
      ? CaptiveError extends CaptiveDependencyError<infer DN, infer DL, infer CP, infer CL>
        ? CaptiveErrorMessage<DN, DL, CP, CL>
        : // All checks passed - return merged builder
          GraphBuilder<
            TProvides | OProvides,
            TRequires | ORequires,
            TAsyncPorts | OAsyncPorts,
            MergeDependencyMaps<TDepGraph, ODepGraph>,
            MergeLifetimeMaps<TLifetimeMap, OLifetimeMap>,
            TOverrides | OOverrides
          >
      : // No captive errors - return merged builder
        GraphBuilder<
          TProvides | OProvides,
          TRequires | ORequires,
          TAsyncPorts | OAsyncPorts,
          MergeDependencyMaps<TDepGraph, ODepGraph>,
          MergeLifetimeMaps<TLifetimeMap, OLifetimeMap>,
          TOverrides | OOverrides
        >
    : // Shouldn't happen - fallback
      GraphBuilder<
        TProvides | OProvides,
        TRequires | ORequires,
        TAsyncPorts | OAsyncPorts,
        MergeDependencyMaps<TDepGraph, ODepGraph>,
        MergeLifetimeMaps<TLifetimeMap, OLifetimeMap>,
        TOverrides | OOverrides
      >;

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
 * @typeParam TDepGraph - Type-level dependency map `{ PortName: RequiredPortNames }`
 * @typeParam TLifetimeMap - Type-level lifetime map `{ PortName: 1 | 2 | 3 }`
 * @typeParam TOverrides - Union of port types that are overrides (not new provides)
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
  TAsyncPorts = never,
  TDepGraph = EmptyDependencyGraph,
  TLifetimeMap = EmptyLifetimeMap,
  TOverrides = never,
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
    never
  > {
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
   * @example
   * ```typescript
   * const childGraph = GraphBuilder.create()
   *   .override(MockLoggerAdapter)  // Replaces parent's Logger
   *   .provide(CacheAdapter)        // Adds new Cache port
   *   .build();
   * ```
   */
  override<A extends AdapterAny>(
    adapter: A
  ): ProvideResult<
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    TOverrides | InferAdapterProvides<A>,
    A
  > {
    // Add to overridePortNames set
    const newOverrides = new Set(this.overridePortNames);
    newOverrides.add(adapter.provides.__portName);

    return new GraphBuilder([...this.adapters, adapter], newOverrides) as ProvideResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides | InferAdapterProvides<A>,
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
