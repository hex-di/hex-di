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
import { createAdapter, GraphBuilder, type Lifetime, type AdapterAny } from "../src/index.js";
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
 * Fluent builder for constructing test graphs.
 *
 * Provides a clean, chainable API for building graphs with common service
 * combinations while collecting mocks for later verification.
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
 */
export class TestGraphBuilder {
  private adapters: AdapterAny[] = [];
  private mocks: CollectedMocks = {};

  private constructor() {}

  /**
   * Create a new empty test graph builder.
   */
  static create(): TestGraphBuilder {
    return new TestGraphBuilder();
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
   * Structure: S0 <- S1 <- S2 <- ... <- Sn
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
   * Structure: Center <- Spoke1, Spoke2, ..., SpokeN
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

  // ---------------------------------------------------------------------------
  // Instance Methods - Add Services
  // ---------------------------------------------------------------------------

  /**
   * Add a logger adapter with optional mock configuration.
   */
  withLogger(options: MockLoggerOptions & AdapterConfig = {}): this {
    const mock = createMockLogger(options);
    this.mocks.logger = mock;

    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: options.lifetime ?? "singleton",
      clonable: options.clonable,
      factory: () => mock.implementation,
    });

    this.adapters.push(adapter);
    return this;
  }

  /**
   * Add a database adapter with optional mock configuration.
   */
  withDatabase<T = unknown>(options: MockDatabaseOptions<T> & AdapterConfig = {}): this {
    const mock = createMockDatabase<T>(options);
    this.mocks.database = mock;

    const adapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: options.lifetime ?? "singleton",
      clonable: options.clonable,
      factory: () => mock.implementation,
    });

    this.adapters.push(adapter);
    return this;
  }

  /**
   * Add a standalone database adapter (no logger dependency).
   */
  withStandaloneDatabase<T = unknown>(options: MockDatabaseOptions<T> & AdapterConfig = {}): this {
    const mock = createMockDatabase<T>(options);
    this.mocks.database = mock;

    const adapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: options.lifetime ?? "singleton",
      clonable: options.clonable,
      factory: () => mock.implementation,
    });

    this.adapters.push(adapter);
    return this;
  }

  /**
   * Add a cache adapter with optional configuration.
   */
  withCache(config: AdapterConfig = {}): this {
    const mock = createMockCache();
    this.mocks.cache = mock;

    const adapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: config.lifetime ?? "singleton",
      clonable: config.clonable,
      factory: () => mock.implementation as CacheService,
    });

    this.adapters.push(adapter);
    return this;
  }

  /**
   * Add a config adapter with preset values.
   */
  withConfig(values: Record<string, string | number> = {}, config: AdapterConfig = {}): this {
    const mock = createMockConfig(values);
    this.mocks.config = mock;

    const adapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: config.lifetime ?? "singleton",
      clonable: config.clonable,
      factory: () => mock.implementation as ConfigService,
    });

    this.adapters.push(adapter);
    return this;
  }

  /**
   * Add a user service adapter.
   */
  withUserService(config: AdapterConfig = {}): this {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, LoggerPort],
      lifetime: config.lifetime ?? "scoped",
      clonable: config.clonable,
      factory: () => ({
        getUser: async (id: string) => ({ id, name: "Test User" }),
      }),
    });

    this.adapters.push(adapter);
    return this;
  }

  /**
   * Add a custom adapter.
   */
  withAdapter(adapter: AdapterAny): this {
    this.adapters.push(adapter);
    return this;
  }

  /**
   * Add multiple custom adapters.
   */
  withAdapters(adapters: AdapterAny[]): this {
    this.adapters.push(...adapters);
    return this;
  }

  /**
   * Enable call sequence tracking across all services.
   */
  withSequenceTracking(): this {
    this.mocks.sequenceTracker = createCallSequenceTracker();
    return this;
  }

  // ---------------------------------------------------------------------------
  // Build Methods
  // ---------------------------------------------------------------------------

  /**
   * Get the current GraphBuilder without building the graph.
   *
   * Useful when you need to perform additional operations like merge or override.
   */
  getBuilder() {
    let builder = GraphBuilder.create();
    for (const adapter of this.adapters) {
      builder = builder.provide(adapter) as any;
    }
    return builder;
  }

  /**
   * Build the test graph and return result with mocks.
   */
  build() {
    const builder = this.getBuilder();
    return {
      builder,
      mocks: this.mocks,
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
