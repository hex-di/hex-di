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
 * ## Registration Order and Forward References
 *
 * GraphBuilder supports **any registration order** - you can register adapters
 * before or after their dependencies. This is called "forward reference" support:
 *
 * ```typescript
 * // Both orderings work identically:
 *
 * // 1. Leaf-to-root (dependencies first)
 * const graph1 = GraphBuilder.create()
 *   .provide(LoggerAdapter)      // Logger has no dependencies
 *   .provide(DatabaseAdapter)    // Database depends on Logger
 *   .provide(UserServiceAdapter) // UserService depends on Database
 *   .build();
 *
 * // 2. Root-to-leaf (consumers first) - forward references
 * const graph2 = GraphBuilder.create()
 *   .provide(UserServiceAdapter) // Logger, Database not yet provided
 *   .provide(DatabaseAdapter)    // Logger still not provided
 *   .provide(LoggerAdapter)      // Now everything is satisfied
 *   .build();
 * ```
 *
 * **How it works**: Each `.provide()` call tracks required ports as "pending"
 * rather than immediately failing. The `.build()` method validates that all
 * requirements are satisfied. This enables flexible composition:
 *
 * ```typescript
 * // Build partial graphs and merge them later
 * const infrastructureGraph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(ConfigAdapter);
 *
 * const applicationGraph = GraphBuilder.create()
 *   .provide(UserServiceAdapter)   // Requires Logger from infrastructure
 *   .provide(OrderServiceAdapter); // Requires Config from infrastructure
 *
 * // Merge resolves all forward references
 * const fullGraph = infrastructureGraph
 *   .merge(applicationGraph)
 *   .build();
 * ```
 *
 * @see ../builder-types/index.ts - Type-level validation types
 * @see ../validation/cycle-detection.ts - DFS algorithm for cycles
 * @see ../validation/captive-dependency.ts - Lifetime hierarchy checks
 * @see ../validation/errors.ts - Template literal error types
 * @packageDocumentation
 */

import type { AdapterAny } from "../adapter/index.js";
import type {
  JoinPortNames,
  UnsatisfiedDependencies,
  DefaultMaxDepth,
  ValidateMaxDepth,
} from "../validation/index.js";
import type { Graph } from "./types.js";
import {
  inspectGraph,
  inspectionToJSON,
  toDotGraph,
  toMermaidGraph,
  type GraphInspection,
  type GraphInspectionJSON,
  type GraphSuggestion,
  type DotGraphOptions,
  type MermaidGraphOptions,
} from "./builder-inspection.js";

// Import all type-level validation types from the dedicated module
import type {
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  ProvideResult,
  ProvideResultAllErrors,
  ProvideAsyncResult,
  ProvideManyResult,
  MergeResult,
  OverrideResult,
  PrettyBuilder,
} from "../builder-types/index.js";

// Re-export inspection utilities
export {
  inspectGraph,
  inspectionToJSON,
  toDotGraph,
  toMermaidGraph,
  type GraphInspection,
  type GraphInspectionJSON,
  type GraphSuggestion,
  type DotGraphOptions,
  type MermaidGraphOptions,
};

// Re-export type utilities for external use
export type {
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  ProvideResult,
  ProvideResultAllErrors,
  ProvideAsyncResult,
  ProvideManyResult,
  MergeResult,
  OverrideResult,
  // Inspection types
  ValidationState,
  InspectValidation,
  SimplifiedView,
  InferBuilderProvides,
  InferBuilderUnsatisfied,
  PrettyBuilder,
  SimplifiedBuilder,
  // Grouped internals types
  BuilderInternals,
  DefaultInternals,
} from "../builder-types/index.js";

// =============================================================================
// Brand Symbols
// =============================================================================
//
// This module uses two types of symbols following the project convention:
//
// - **`__graphBuilderBrand`** (double underscore): Type-level phantom brand
//   - Only exists at compile time for nominal typing
//   - No runtime footprint
//
// - **`GRAPH_BUILDER_BRAND`** (SCREAMING_CASE): Runtime symbol constant
//   - Actual Symbol() value used for instanceof-like checks
//   - Has runtime representation
//

/**
 * Unique symbol used for nominal typing of GraphBuilder types at the type level.
 *
 * This is a **phantom brand** - it exists only at the type level and has no
 * runtime representation. The `declare const` ensures TypeScript treats it
 * as a unique symbol type without generating any JavaScript code.
 */
declare const __graphBuilderBrand: unique symbol;

/**
 * Unique symbol used for the IDE tooltip helper property.
 *
 * This is exported so users can access `builder[__prettyView]` in their IDE
 * to see a simplified view of the builder's type parameters.
 *
 * @internal
 */
declare const __prettyView: unique symbol;

/**
 * Symbol type for accessing the pretty view phantom property.
 *
 * @example
 * ```typescript
 * import { __prettyViewSymbol } from "@hex-di/graph";
 *
 * const builder = GraphBuilder.create().provide(LoggerAdapter);
 * type View = typeof builder[typeof __prettyViewSymbol];
 * // { provides: LoggerPort; unsatisfied: never; asyncPorts: never; overrides: never }
 * ```
 */
export type { __prettyView as __prettyViewSymbol };

/**
 * Factory interface returned by `GraphBuilder.withMaxDepth<N>()`.
 *
 * Provides `create()` and `forParent()` methods that return GraphBuilders
 * with the specified maximum cycle detection depth.
 *
 * @typeParam TMaxDepth - The maximum cycle detection depth configured for this factory
 */
export interface GraphBuilderFactory<TMaxDepth extends number> {
  /**
   * Creates a new empty GraphBuilder with custom max depth.
   */
  create(): GraphBuilder<
    never,
    never,
    never,
    EmptyDependencyGraph,
    EmptyLifetimeMap,
    never,
    unknown,
    TMaxDepth
  >;

  /**
   * Creates a new GraphBuilder for building a child graph with parent-aware validation.
   *
   * @param parent - The parent graph (used only for type inference)
   */
  forParent<TParentProvides, TParentAsync, TParentOverrides>(
    parent: Graph<TParentProvides, TParentAsync, TParentOverrides>
  ): GraphBuilder<
    never,
    never,
    never,
    EmptyDependencyGraph,
    EmptyLifetimeMap,
    never,
    TParentProvides,
    TMaxDepth
  >;
}

/**
 * Runtime symbol used as a property key for GraphBuilder branding.
 *
 * Unlike `__graphBuilderBrand`, this is an actual runtime value that can be
 * used to verify GraphBuilder instances. The `Symbol()` call generates a
 * globally unique value that cannot be recreated.
 *
 * @internal
 */
const GRAPH_BUILDER_BRAND = Symbol("GraphBuilder");

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
  TMaxDepth extends number = DefaultMaxDepth,
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
    TMaxDepth,
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
   * Phantom type property for compile-time cycle detection depth limit.
   *
   * Controls how deep the type-level DFS traversal goes when checking for
   * circular dependencies. Configurable via `GraphBuilder.withMaxDepth<N>()`.
   *
   * Default is 30, which handles most real-world graphs. Higher values (up to 100)
   * can be used for deep dependency chains.
   *
   * @internal
   */
  declare readonly __maxDepth: TMaxDepth;

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC PHANTOM SHORTCUTS
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // These properties provide convenient access to commonly-needed type information
  // without requiring the user to use utility types like InferBuilderProvides.
  //
  // Access via: typeof builder.$provides, typeof builder.$unsatisfied
  //

  /**
   * Phantom property exposing the provided ports union.
   *
   * Use `typeof builder.$provides` to get the union of all provided ports
   * without needing the `InferBuilderProvides` utility type.
   *
   * @example
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(DatabaseAdapter);
   *
   * type Provided = typeof builder.$provides;
   * // LoggerPort | DatabasePort
   * ```
   */
  declare readonly $provides: TProvides;

  /**
   * Phantom property exposing unsatisfied dependencies.
   *
   * Use `typeof builder.$unsatisfied` to get the union of ports that are
   * required but not yet provided. Returns `never` when complete.
   *
   * @example
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provide(UserServiceAdapter); // Requires Logger
   *
   * type Missing = typeof builder.$unsatisfied;
   * // LoggerPort
   * ```
   */
  declare readonly $unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;

  /**
   * IDE tooltip helper - shows simplified view.
   *
   * Hover over this property in your IDE to see a clean summary of the
   * builder's state, hiding internal type parameters like TDepGraph and TLifetimeMap.
   *
   * **Note**: This property exists only at the type level for IDE tooltips.
   * It has no runtime value.
   *
   * @example
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(UserServiceAdapter); // Requires DatabasePort
   *
   * // Hover over [__prettyView] to see:
   * // {
   * //   provides: LoggerPort | UserServicePort;
   * //   unsatisfied: DatabasePort;
   * //   asyncPorts: never;
   * //   overrides: never;
   * // }
   * type View = typeof builder[typeof __prettyView];
   * ```
   */
  declare readonly [__prettyView]: PrettyBuilder<this>;

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
    unknown,
    DefaultMaxDepth
  > {
    return new GraphBuilder([], new Set());
  }

  /**
   * Creates a factory for building graphs with a custom cycle detection depth.
   *
   * Use this when you have deep dependency chains that exceed the default
   * depth limit of 30. Valid values are 1-100.
   *
   * @example Basic usage
   * ```typescript
   * // For deep graphs that need more than 30 levels
   * const builder = GraphBuilder.withMaxDepth<50>().create();
   *
   * // For simpler graphs where faster type checking is preferred
   * const builder = GraphBuilder.withMaxDepth<15>().create();
   * ```
   *
   * @example With parent graph
   * ```typescript
   * const parentGraph = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .build();
   *
   * const childBuilder = GraphBuilder.withMaxDepth<50>().forParent(parentGraph);
   * ```
   *
   * @example Compile-time validation of depth
   * ```typescript
   * // These produce compile-time errors:
   * GraphBuilder.withMaxDepth<0>();   // ERROR: MaxDepth must be at least 1
   * GraphBuilder.withMaxDepth<150>(); // ERROR: MaxDepth must be <= 100
   * ```
   *
   * @typeParam TDepth - The maximum cycle detection depth (1-100)
   * @returns A factory object with `create()` and `forParent()` methods
   */
  static withMaxDepth<TDepth extends number>(): ValidateMaxDepth<TDepth> extends TDepth
    ? GraphBuilderFactory<TDepth>
    : ValidateMaxDepth<TDepth> {
    return {
      create: () => new GraphBuilder([], new Set()),
      forParent: () => new GraphBuilder([], new Set()),
    } as unknown as ValidateMaxDepth<TDepth> extends TDepth
      ? GraphBuilderFactory<TDepth>
      : ValidateMaxDepth<TDepth>;
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
    TParentProvides,
    DefaultMaxDepth
  > {
    // The parent parameter is only used for type inference.
    // At runtime, we just create an empty builder.
    return new GraphBuilder([], new Set());
  }

  /**
   * Registers an adapter with the graph.
   *
   * Performs compile-time validation for:
   * - Duplicate detection (same port provided twice)
   * - Circular dependency detection (A → B → C → A)
   * - Captive dependency detection (singleton depending on scoped)
   *
   * Reports ALL validation errors at once, not just the first one.
   * This provides better developer experience by showing the full picture
   * of what's wrong with a graph configuration.
   *
   * **Registration Order**: Adapters can be registered in any order. Dependencies
   * are tracked as "pending" and validated when `.build()` is called. This allows
   * forward references where you register a consumer before its dependencies.
   *
   * @example Single adapter
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(DatabaseAdapter);
   * ```
   *
   * @example Forward references (any order works)
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provide(UserServiceAdapter)  // Requires Logger, Database
   *   .provide(LoggerAdapter)       // Satisfies Logger requirement
   *   .provide(DatabaseAdapter);    // Satisfies Database requirement
   * ```
   *
   * @example Multiple errors shown at once
   * ```typescript
   * // If an adapter has multiple issues, all are reported:
   * // "Multiple validation errors:
   * //   1. ERROR: Duplicate adapter for 'Logger'...
   * //   2. ERROR: Circular dependency: A -> B -> A..."
   * ```
   *
   * @see provideFast - For single-error short-circuit behavior (faster compilation)
   */
  provide<A extends AdapterAny>(
    adapter: A
  ): ProvideResultAllErrors<
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    TOverrides,
    A,
    TParentProvides,
    TMaxDepth
  > {
    // Runtime: create new GraphBuilder with the adapter added.
    // The conditional return type handles both success (GraphBuilder) and
    // error (template literal string) cases at the type level.
    // Cast through unknown because the return type can be either GraphBuilder or string.
    return new GraphBuilder(
      [...this.adapters, adapter],
      this.overridePortNames
    ) as unknown as ProvideResultAllErrors<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      A,
      TParentProvides,
      TMaxDepth
    >;
  }

  /**
   * Registers an adapter with short-circuit error reporting.
   *
   * Unlike `provide()` which reports all errors at once, `provideFast()`
   * stops at the first validation error. This results in slightly faster
   * type checking but requires fix-and-retry cycles for multiple errors.
   *
   * ## When to Use
   *
   * - **Large graphs**: When compile-time performance matters
   * - **Simple fixes**: When you expect only one error at a time
   * - **Iterative development**: When you prefer fixing one issue at a time
   *
   * ## Trade-offs
   *
   * | Aspect | provide() | provideFast() |
   * |--------|-----------|---------------|
   * | Errors | All at once | One at a time |
   * | Speed | Evaluates all checks | Short-circuits on first error |
   * | Use case | Default, debugging | Performance-critical type checking |
   *
   * @example
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provideFast(LoggerAdapter)
   *   .provideFast(DatabaseAdapter);
   * ```
   */
  provideFast<A extends AdapterAny>(
    adapter: A
  ): ProvideResult<
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    TOverrides,
    A,
    TParentProvides,
    TMaxDepth
  > {
    return new GraphBuilder([...this.adapters, adapter], this.overridePortNames) as ProvideResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      A,
      TParentProvides,
      TMaxDepth
    >;
  }

  /**
   * Registers an async adapter with the graph.
   * Performs compile-time duplicate, circular, and captive dependency detection.
   */
  provideAsync<A extends AdapterAny & { readonly factoryKind: "async" }>(
    adapter: A
  ): ProvideAsyncResult<
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    TOverrides,
    A,
    TParentProvides,
    TMaxDepth
  > {
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
      A,
      TParentProvides,
      TMaxDepth
    >;
  }

  /**
   * Registers multiple adapters with the graph in a batch.
   * Performs compile-time duplicate, circular, and captive dependency detection.
   */
  provideMany<const A extends readonly AdapterAny[]>(
    adapters: A
  ): ProvideManyResult<
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    TOverrides,
    A,
    TParentProvides,
    TMaxDepth
  > {
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
      A,
      TParentProvides,
      TMaxDepth
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
    A,
    unknown,
    TMaxDepth
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
      A,
      unknown,
      TMaxDepth
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
  merge<
    OProvides,
    ORequires,
    OAsyncPorts,
    ODepGraph,
    OLifetimeMap,
    OOverrides,
    OParentProvides,
    OMaxDepth extends number,
  >(
    other: GraphBuilder<
      OProvides,
      ORequires,
      OAsyncPorts,
      ODepGraph,
      OLifetimeMap,
      OOverrides,
      OParentProvides,
      OMaxDepth
    >
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
    OOverrides,
    TParentProvides,
    TMaxDepth
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
      OOverrides,
      TParentProvides,
      TMaxDepth
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
    // Delegate to inspectGraph, treating the builder state as a graph-like structure
    return inspectGraph({
      adapters: this.adapters,
      overridePortNames: this.overridePortNames,
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
    : `ERROR: Missing adapters for ${JoinPortNames<UnsatisfiedDependencies<TProvides, TRequires>>}. Call .provide() first.` {
    // Phantom type properties (__provides, __asyncPorts, __overrides) exist only at compile-time.
    // The runtime object needs the adapters array and overridePortNames set.
    // The conditional return type is only for compile-time validation.
    // At runtime, this always returns a Graph (even if incomplete - that's a type-level error).
    return Object.freeze({
      adapters: this.adapters,
      overridePortNames: this.overridePortNames,
    }) as [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
      ? Graph<TProvides, TAsyncPorts, TOverrides>
      : `ERROR: Missing adapters for ${JoinPortNames<UnsatisfiedDependencies<TProvides, TRequires>>}. Call .provide() first.`;
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
