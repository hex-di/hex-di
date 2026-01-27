/**
 * Test builder pattern for @hex-di/graph tests.
 *
 * Provides a fluent API for constructing test graphs with common patterns,
 * reducing boilerplate and improving test readability.
 *
 * ## Design Goals
 *
 * 1. **Fluent API**: Chain methods naturally to build complex graphs
 * 2. **Type Safety**: Full TypeScript inference for all operations
 * 3. **Pre-built Patterns**: Common graph shapes (chain, diamond, star)
 * 4. **Mock Integration**: Seamless use with test doubles
 * 5. **Composable**: Build up graphs incrementally
 *
 * @example Basic usage
 * ```typescript
 * const { graph, mocks } = TestGraphBuilder.create()
 *   .withLogger()
 *   .withDatabase()
 *   .withUserService()
 *   .build();
 *
 * // Verify behavior
 * await graph.resolve(UserServicePort);
 * expect(mocks.logger.getLogCount()).toBe(1);
 * ```
 *
 * @example Diamond pattern
 * ```typescript
 * const scenario = TestGraphBuilder.diamond();
 * const graph = scenario.build();
 * // A <- B, C; B, C <- D
 * ```
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import {
  createAdapter,
  GraphBuilder,
  __emptyDepGraphBrand,
  __emptyLifetimeMapBrand,
  type Lifetime,
  type AdapterConstraint,
  type Graph,
} from "../src/index.js";

// These imports are needed for TypeScript to name the symbol types in return type declarations.
// The symbols are used in EmptyDependencyGraph/EmptyLifetimeMap which appear in GraphBuilder types.
void __emptyDepGraphBrand;
void __emptyLifetimeMapBrand;
import {
  createMockLogger,
  createMockDatabase,
  createMockCache,
  createMockConfig,
  createCallSequenceTracker,
  type MockLoggerOptions,
  type MockDatabaseOptions,
} from "./test-doubles.js";
import {
  LoggerPort,
  DatabasePort,
  UserServicePort,
  ConfigPort,
  CachePort,
  PortA,
  PortB,
  PortC,
  PortD,
  type ConfigService,
  type CacheService,
} from "./fixtures.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Mock instances collected during graph building.
 * Provides access to tracked calls and state for verification.
 */
export interface CollectedMocks {
  logger?: ReturnType<typeof createMockLogger>;
  database?: ReturnType<typeof createMockDatabase>;
  cache?: ReturnType<typeof createMockCache>;
  config?: ReturnType<typeof createMockConfig>;
  sequenceTracker?: ReturnType<typeof createCallSequenceTracker>;
}

/**
 * Result of building a test graph.
 */
export interface TestGraphResult<TBuilder> {
  /** The built GraphBuilder ready for .build() */
  builder: TBuilder;
  /** The mocks collected during building, for verification */
  mocks: CollectedMocks;
  /** Build the final graph */
  build: () => ReturnType<
    TBuilder extends GraphBuilder<infer P, infer R, infer A, infer D, infer L>
      ? GraphBuilder<P, R, A, D, L>["build"]
      : never
  >;
}

/**
 * Configuration for custom adapters in the builder.
 */
export interface AdapterConfig {
  lifetime?: Lifetime;
  clonable?: boolean;
}

// Note: Scenario result types are inferred from the static methods.
// This avoids complex type annotations while maintaining full type safety.

// =============================================================================
// TestGraphBuilder Class
// =============================================================================

/**
 * Immutable fluent builder for constructing test graphs.
 *
 * Provides a clean, chainable API for building graphs with common service
 * combinations while collecting mocks for later verification.
 *
 * **Immutability**: Each `with*()` method returns a NEW instance, leaving
 * the original unchanged. This mirrors the production GraphBuilder pattern
 * and enables branching test scenarios from a common base.
 *
 * @example Basic three-tier architecture
 * ```typescript
 * const { graph, mocks } = TestGraphBuilder.create()
 *   .withLogger({ captureMessages: true })
 *   .withDatabase({ queryResult: [{ id: 1 }] })
 *   .withUserService()
 *   .build();
 *
 * // Use the graph
 * const userService = await graph.resolve(UserServicePort);
 * await userService.getUser("123");
 *
 * // Verify interactions
 * expect(mocks.database.getQueryCount()).toBe(1);
 * ```
 *
 * @example Branching scenarios from a common base
 * ```typescript
 * const base = TestGraphBuilder.create().withLogger();
 *
 * // base is unchanged - create variants
 * const withDb = base.withDatabase();
 * const withCache = base.withCache();
 *
 * // base still has no database or cache
 * expect(base.build().mocks.database).toBeUndefined();
 * ```
 */
export class TestGraphBuilder {
  private readonly _adapters: readonly AdapterConstraint[];
  private readonly _mocks: Readonly<CollectedMocks>;

  private constructor(adapters: readonly AdapterConstraint[], mocks: Readonly<CollectedMocks>) {
    this._adapters = Object.freeze([...adapters]);
    this._mocks = Object.freeze({ ...mocks });
  }

  /**
   * Create a new empty test graph builder.
   */
  static create(): TestGraphBuilder {
    return new TestGraphBuilder([], {});
  }

  // ---------------------------------------------------------------------------
  // Pre-built Scenarios
  // ---------------------------------------------------------------------------

  /**
   * Create a diamond dependency pattern.
   *
   * Structure: A <- B, C; B, C <- D
   *
   * ```
   *     A
   *    / \
   *   B   C
   *    \ /
   *     D
   * ```
   */
  static diamond() {
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    const AdapterC = createAdapter({
      provides: PortC,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doC: () => {} }),
    });

    const AdapterD = createAdapter({
      provides: PortD,
      requires: [PortB, PortC],
      lifetime: "singleton",
      factory: () => ({ doD: () => {} }),
    });

    const builder = GraphBuilder.create()
      .provide(AdapterA)
      .provide(AdapterB)
      .provide(AdapterC)
      .provide(AdapterD);

    return {
      adapters: { A: AdapterA, B: AdapterB, C: AdapterC, D: AdapterD },
      builder,
      build: () => builder.build(),
    };
  }

  /**
   * Create a linear dependency chain.
   *
   * ```
   * Topology (length=4):
   *
   *   S0 ← S1 ← S2 ← S3
   *   │     │     │     │
   *   └─────┴─────┴─────┘
   *   (each depends on previous)
   *
   * Dependencies:
   *   S0: (none)
   *   S1: requires S0
   *   S2: requires S1
   *   S3: requires S2
   * ```
   *
   * @param length - Number of services in the chain (default: 3)
   */
  static chain(length = 3) {
    type ChainService = { execute(): void };

    const ports: Array<ReturnType<typeof createPort<`Chain${number}`, ChainService>>> = [];
    const adapters: Array<ReturnType<typeof createAdapter>> = [];

    // Create ports
    for (let i = 0; i < length; i++) {
      ports.push(createPort<`Chain${number}`, ChainService>(`Chain${i}`));
    }

    // Create adapters with linear dependencies
    for (let i = 0; i < length; i++) {
      const requires = i === 0 ? [] : [ports[i - 1]];
      adapters.push(
        createAdapter({
          provides: ports[i],
          requires,
          lifetime: "singleton",
          factory: () => ({ execute: () => {} }),
        })
      );
    }

    const builder = GraphBuilder.create().provideMany(adapters);

    return {
      adapters,
      builder,
      build: () => builder.build(),
    };
  }

  /**
   * Create a star pattern (one center, many spokes).
   *
   * ```
   * Topology (spokeCount=4):
   *
   *        Spoke0
   *          │
   *   Spoke1─┼─Spoke3
   *          │
   *        Spoke2
   *          │
   *       [Center]
   *
   * Dependencies:
   *   Center: (none)
   *   Spoke0: requires Center
   *   Spoke1: requires Center
   *   Spoke2: requires Center
   *   Spoke3: requires Center
   * ```
   *
   * @param spokeCount - Number of spoke services (default: 4)
   */
  static star(spokeCount = 4) {
    type StarService = { execute(): void };

    const centerPort = createPort<"Center", StarService>("Center");
    const center = createAdapter({
      provides: centerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ execute: () => {} }),
    });

    const spokes: Array<ReturnType<typeof createAdapter>> = [];
    for (let i = 0; i < spokeCount; i++) {
      const port = createPort<`Spoke${number}`, StarService>(`Spoke${i}`);
      spokes.push(
        createAdapter({
          provides: port,
          requires: [centerPort],
          lifetime: "singleton",
          factory: () => ({ execute: () => {} }),
        })
      );
    }

    const builder = GraphBuilder.create().provide(center).provideMany(spokes);

    return {
      center,
      spokes,
      builder,
      build: () => builder.build(),
    };
  }

  /**
   * Create a large flat graph with no dependencies.
   *
   * ```
   * Topology (count=5):
   *
   *   Flat0   Flat1   Flat2   Flat3   Flat4
   *     │       │       │       │       │
   *     └───────┴───────┴───────┴───────┘
   *            (all independent)
   *
   * Dependencies:
   *   Flat0: (none)
   *   Flat1: (none)
   *   ...
   *   FlatN: (none)
   * ```
   *
   * Useful for stress testing and parallel resolution testing.
   *
   * @param count - Number of independent adapters (default: 20)
   */
  static flat(count = 20) {
    type FlatService = { execute(): void };

    const adapters: Array<ReturnType<typeof createAdapter>> = [];

    for (let i = 0; i < count; i++) {
      const port = createPort<`Flat${number}`, FlatService>(`Flat${i}`);
      adapters.push(
        createAdapter({
          provides: port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ execute: () => {} }),
        })
      );
    }

    const builder = GraphBuilder.create().provideMany(adapters);

    return {
      adapters,
      builder,
      build: () => builder.build(),
    };
  }

  /**
   * Create a parent-child graph scenario for testing hierarchical containers.
   *
   * ```
   * Topology:
   *
   *   ┌─────────────────────────┐
   *   │      PARENT GRAPH       │
   *   │                         │
   *   │  Logger ← Database      │
   *   │                         │
   *   └───────────┬─────────────┘
   *               │ (inheritance)
   *   ┌───────────▼─────────────┐
   *   │      CHILD GRAPH        │
   *   │                         │
   *   │  [can override Logger]  │
   *   │  [can add new ports]    │
   *   │                         │
   *   └─────────────────────────┘
   *
   * Parent Dependencies:
   *   Logger: (none)
   *   Database: requires Logger
   * ```
   *
   * Returns a parent graph with Logger and Database, plus a factory to create
   * child builders that can override parent services.
   *
   * @example
   * ```typescript
   * const scenario = TestGraphBuilder.parentChild();
   * const parentGraph = scenario.parentGraph;
   *
   * // Create a child with an override
   * const childBuilder = scenario.createChildWithOverride(LoggerOverrideAdapter);
   * const childGraph = childBuilder.build();
   * ```
   */
  static parentChild() {
    const parentBuilder = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        })
      )
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [LoggerPort],
          lifetime: "singleton",
          factory: () => ({ query: async () => ({}) }),
        })
      );

    const parentGraph = parentBuilder.build();

    return {
      parentBuilder,
      parentGraph,
      /**
       * Create a child builder from the parent graph.
       */
      createChild: () => GraphBuilder.forParent(parentGraph),
      /**
       * Create a child builder with an override adapter.
       */
      createChildWithOverride: (overrideAdapter: AdapterConstraint) =>
        GraphBuilder.forParent(parentGraph).override(overrideAdapter),
    };
  }

  // ---------------------------------------------------------------------------
  // Error Scenario Builders
  // ---------------------------------------------------------------------------

  /**
   * Create a captive dependency scenario (HEX003).
   *
   * A singleton adapter incorrectly depends on a scoped adapter,
   * which would "capture" a single scoped instance.
   *
   * ```
   * Topology:
   *
   *   ScopedAdapter (scoped)
   *        ↑
   *   CaptiveAdapter (singleton) ← ERROR: captures scoped!
   * ```
   *
   * @returns Scenario with builder, adapters, and the error-causing adapter
   */
  static withCaptiveDependency() {
    const ScopedPort = createPort<"Scoped", { getData(): string }>("Scoped");
    const SingletonPort = createPort<"Singleton", { process(): void }>("Singleton");

    const ScopedAdapter = createAdapter({
      provides: ScopedPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ getData: () => "data" }),
    });

    const CaptiveAdapter = createAdapter({
      provides: SingletonPort,
      requires: [ScopedPort],
      lifetime: "singleton", // ERROR: singleton depending on scoped
      factory: () => ({ process: () => {} }),
    });

    return {
      adapters: { scoped: ScopedAdapter, captive: CaptiveAdapter },
      builder: GraphBuilder.create().provide(ScopedAdapter),
      errorAdapter: CaptiveAdapter,
      expectedErrorPattern: /HEX003.*captive/i,
    };
  }

  /**
   * Create a circular dependency scenario (HEX002).
   *
   * Two adapters that depend on each other, forming a cycle.
   *
   * ```
   * Topology:
   *
   *   AdapterA ← AdapterB
   *      ↓         ↑
   *      └─────────┘
   *
   *   Cycle: A → B → A
   * ```
   *
   * @returns Scenario with builder, adapters, and the error-causing adapter
   */
  static withCircularDependency() {
    const PortX = createPort<"X", { doX(): void }>("X");
    const PortY = createPort<"Y", { doY(): void }>("Y");

    const AdapterX = createAdapter({
      provides: PortX,
      requires: [PortY], // X requires Y
      lifetime: "singleton",
      factory: () => ({ doX: () => {} }),
    });

    const AdapterY = createAdapter({
      provides: PortY,
      requires: [PortX], // Y requires X → cycle!
      lifetime: "singleton",
      factory: () => ({ doY: () => {} }),
    });

    return {
      adapters: { adapterX: AdapterX, adapterY: AdapterY },
      builder: GraphBuilder.create().provide(AdapterX),
      errorAdapter: AdapterY,
      expectedErrorPattern: /HEX002.*circular|cycle/i,
    };
  }

  /**
   * Create a duplicate port scenario (HEX001).
   *
   * Two adapters that both provide the same port.
   *
   * ```
   * Topology:
   *
   *   AdapterA → LoggerPort
   *   AdapterB → LoggerPort  ← ERROR: duplicate!
   * ```
   *
   * @returns Scenario with builder, adapters, and the error-causing adapter
   */
  static withDuplicatePort() {
    const DuplicatePort = createPort<"Duplicate", { execute(): void }>("Duplicate");

    const AdapterFirst = createAdapter({
      provides: DuplicatePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ execute: () => {} }),
    });

    const AdapterSecond = createAdapter({
      provides: DuplicatePort, // ERROR: same port as AdapterFirst
      requires: [],
      lifetime: "singleton",
      factory: () => ({ execute: () => {} }),
    });

    return {
      adapters: { first: AdapterFirst, second: AdapterSecond },
      builder: GraphBuilder.create().provide(AdapterFirst),
      errorAdapter: AdapterSecond,
      expectedErrorPattern: /HEX001.*duplicate|already.*provided/i,
    };
  }

  /**
   * Create a missing dependency scenario (HEX008).
   *
   * An adapter that requires a port that is never provided.
   *
   * ```
   * Topology:
   *
   *   MissingPort (not provided)
   *        ↑
   *   DependentAdapter ← ERROR: unsatisfied requirement!
   * ```
   *
   * @returns Scenario with builder, adapters, and the error-causing adapter
   */
  static withMissingDependency() {
    const MissingPort = createPort<"Missing", { getData(): string }>("Missing");
    const DependentPort = createPort<"Dependent", { process(): void }>("Dependent");

    const DependentAdapter = createAdapter({
      provides: DependentPort,
      requires: [MissingPort], // MissingPort is never provided
      lifetime: "singleton",
      factory: () => ({ process: () => {} }),
    });

    return {
      adapters: { dependent: DependentAdapter },
      builder: GraphBuilder.create().provide(DependentAdapter),
      errorAdapter: DependentAdapter,
      expectedErrorPattern: /HEX008.*missing|unsatisfied|required/i,
    };
  }

  /**
   * Create a parent-child scenario with mixed lifetimes for advanced testing.
   *
   * ```
   * Topology:
   *
   *   ┌─────────────────────────────────┐
   *   │         PARENT GRAPH            │
   *   │                                 │
   *   │  Logger ← Database    Config    │
   *   │  (sing.)   (scoped)   (trans.)  │
   *   │                                 │
   *   └────────────┬────────────────────┘
   *                │ (inheritance)
   *   ┌────────────▼────────────────────┐
   *   │         CHILD GRAPH             │
   *   │                                 │
   *   │  [inherits parent services]     │
   *   │  [can add scoped overrides]     │
   *   │                                 │
   *   └─────────────────────────────────┘
   *
   * Parent Dependencies:
   *   Logger (singleton): (none)
   *   Database (scoped): requires Logger
   *   Config (transient): (none)
   * ```
   *
   * Useful for testing lifetime interactions between parent and child containers.
   */
  static parentChildWithLifetimes() {
    const parentBuilder = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        })
      )
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [LoggerPort],
          lifetime: "scoped",
          factory: () => ({ query: async () => ({}) }),
        })
      )
      .provide(
        createAdapter({
          provides: ConfigPort,
          requires: [],
          lifetime: "transient",
          factory: () => ({ get: () => undefined }),
        })
      );

    const parentGraph = parentBuilder.build();

    return {
      parentBuilder,
      parentGraph,
      /**
       * Create a child builder from the parent graph.
       */
      createChild: () => GraphBuilder.forParent(parentGraph),
      /**
       * Create a child builder with an override adapter.
       */
      createChildWithOverride: (overrideAdapter: AdapterConstraint) =>
        GraphBuilder.forParent(parentGraph).override(overrideAdapter),
    };
  }

  // ---------------------------------------------------------------------------
  // Instance Methods - Add Services
  // ---------------------------------------------------------------------------

  /**
   * Add a logger adapter with optional mock configuration.
   * Returns a NEW builder instance - original is unchanged.
   */
  withLogger(options: MockLoggerOptions & AdapterConfig = {}): TestGraphBuilder {
    const mock = createMockLogger(options);

    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: options.lifetime ?? "singleton",
      clonable: options.clonable,
      factory: () => mock.implementation,
    });

    return new TestGraphBuilder([...this._adapters, adapter], { ...this._mocks, logger: mock });
  }

  /**
   * Add a database adapter with optional mock configuration.
   * Returns a NEW builder instance - original is unchanged.
   */
  withDatabase<T = unknown>(
    options: MockDatabaseOptions<T> & AdapterConfig = {}
  ): TestGraphBuilder {
    const mock = createMockDatabase<T>(options);

    const adapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: options.lifetime ?? "singleton",
      clonable: options.clonable,
      factory: () => mock.implementation,
    });

    return new TestGraphBuilder([...this._adapters, adapter], { ...this._mocks, database: mock });
  }

  /**
   * Add a standalone database adapter (no logger dependency).
   * Returns a NEW builder instance - original is unchanged.
   */
  withStandaloneDatabase<T = unknown>(
    options: MockDatabaseOptions<T> & AdapterConfig = {}
  ): TestGraphBuilder {
    const mock = createMockDatabase<T>(options);

    const adapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: options.lifetime ?? "singleton",
      clonable: options.clonable,
      factory: () => mock.implementation,
    });

    return new TestGraphBuilder([...this._adapters, adapter], { ...this._mocks, database: mock });
  }

  /**
   * Add a cache adapter with optional configuration.
   * Returns a NEW builder instance - original is unchanged.
   */
  withCache(config: AdapterConfig = {}): TestGraphBuilder {
    const mock = createMockCache();

    const adapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: config.lifetime ?? "singleton",
      clonable: config.clonable,
      factory: () => mock.implementation as CacheService,
    });

    return new TestGraphBuilder([...this._adapters, adapter], { ...this._mocks, cache: mock });
  }

  /**
   * Add a config adapter with preset values.
   * Returns a NEW builder instance - original is unchanged.
   */
  withConfig(
    values: Record<string, string | number> = {},
    config: AdapterConfig = {}
  ): TestGraphBuilder {
    const mock = createMockConfig({ values });

    const adapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: config.lifetime ?? "singleton",
      clonable: config.clonable,
      factory: () => mock.implementation as ConfigService,
    });

    return new TestGraphBuilder([...this._adapters, adapter], { ...this._mocks, config: mock });
  }

  /**
   * Add a user service adapter.
   * Returns a NEW builder instance - original is unchanged.
   */
  withUserService(config: AdapterConfig = {}): TestGraphBuilder {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, LoggerPort],
      lifetime: config.lifetime ?? "scoped",
      clonable: config.clonable,
      factory: () => ({
        getUser: async (id: string) => ({ id, name: "Test User" }),
      }),
    });

    return new TestGraphBuilder([...this._adapters, adapter], this._mocks);
  }

  /**
   * Add a custom adapter.
   * Returns a NEW builder instance - original is unchanged.
   */
  withAdapter(adapter: AdapterConstraint): TestGraphBuilder {
    return new TestGraphBuilder([...this._adapters, adapter], this._mocks);
  }

  /**
   * Add multiple custom adapters.
   * Returns a NEW builder instance - original is unchanged.
   */
  withAdapters(adapters: AdapterConstraint[]): TestGraphBuilder {
    return new TestGraphBuilder([...this._adapters, ...adapters], this._mocks);
  }

  /**
   * Enable call sequence tracking across all services.
   * Returns a NEW builder instance - original is unchanged.
   */
  withSequenceTracking(): TestGraphBuilder {
    return new TestGraphBuilder(this._adapters, {
      ...this._mocks,
      sequenceTracker: createCallSequenceTracker(),
    });
  }

  // ---------------------------------------------------------------------------
  // Build Methods
  // ---------------------------------------------------------------------------

  /**
   * Get the current GraphBuilder without building the graph.
   *
   * Useful when you need to perform additional operations like merge or override.
   *
   * Note: Uses provideMany which handles the type accumulation correctly,
   * avoiding the need for type casts in the accumulator loop.
   */
  getBuilder() {
    return GraphBuilder.create().provideMany([...this._adapters]);
  }

  /**
   * Build the test graph and return result with mocks.
   */
  build() {
    const builder = this.getBuilder();
    return {
      builder,
      mocks: this._mocks,
      build: () => builder.build(),
    };
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Quick helper to create a simple Logger -> Database -> UserService graph.
 */
export function createThreeTierGraph(
  options: {
    loggerOptions?: MockLoggerOptions;
    databaseOptions?: MockDatabaseOptions<unknown>;
  } = {}
) {
  return TestGraphBuilder.create()
    .withLogger(options.loggerOptions)
    .withDatabase(options.databaseOptions)
    .withUserService()
    .build();
}

/**
 * Quick helper to create a minimal graph with just a logger.
 */
export function createMinimalGraph(options: MockLoggerOptions = {}) {
  return TestGraphBuilder.create().withLogger(options).build();
}

/**
 * Creates a child GraphBuilder from a parent graph.
 *
 * This is a shorthand for `GraphBuilder.forParent(parentGraph)` that makes
 * test code more readable and explicit about the parent-child relationship.
 *
 * @param parentGraph - The parent graph to create a child from
 * @returns A GraphBuilder configured for the parent graph
 *
 * @example
 * ```typescript
 * const parentGraph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .build();
 *
 * const childBuilder = createChildGraphBuilder(parentGraph)
 *   .override(MockLoggerAdapter);
 * ```
 */
export function createChildGraphBuilder<TProvides, TAsync, TOverrides>(
  parentGraph: Graph<TProvides, TAsync, TOverrides>
) {
  return GraphBuilder.forParent(parentGraph);
}

// =============================================================================
// Re-export for convenience
// =============================================================================

export {
  createMockLogger,
  createMockDatabase,
  createMockCache,
  createMockConfig,
  createCallSequenceTracker,
} from "./test-doubles.js";
