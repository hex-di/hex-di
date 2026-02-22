/**
 * Fluent test builder for creating test containers.
 *
 * Provides a chainable API for building containers with commonly needed
 * configurations for testing, reducing boilerplate in test files.
 *
 * @example Basic usage
 * ```typescript
 * const { container, ports } = TestBuilder.create()
 *   .withSingleton(LoggerPort, () => ({ log: vi.fn() }))
 *   .withScoped(RequestContextPort, () => ({ requestId: '123' }))
 *   .build();
 *
 * const logger = container.resolve(ports.Logger);
 * ```
 *
 * @packageDocumentation
 */

import type { Port, InferService, ResolvedDeps } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import type { Scope } from "../../src/index.js";
import { createContainer } from "../../src/index.js";
import {
  LoggerPort,
  DatabasePort,
  RequestContextPort,
  UserServicePort,
  CacheServicePort,
  ConfigServicePort,
  createMockLogger,
  createMockDatabase,
  createMockCacheService,
  generateRequestId,
  type Logger,
  type Database,
  type UserService,
  type CacheService,
} from "./fixtures.js";

// =============================================================================
// Types
// =============================================================================

type AnyPort = Port<string, unknown>;

interface AdapterEntry {
  port: AnyPort;
  adapter: unknown;
  factory: (() => unknown) | undefined;
}

/**
 * Result of building a test container.
 */
export interface TestBuilderResult {
  /** The created container */
  readonly container: ReturnType<typeof createContainer>;
  /** Helper to resolve a port - just sugar for container.resolve */
  resolve<P extends AnyPort>(port: P): InferService<P>;
  /** Helper to create a scope */
  createScope(): Scope<AnyPort, never, "initialized">;
  /** Get call count if factory was tracked */
  getCallCount(port: AnyPort): number | undefined;
}

// =============================================================================
// TestBuilder Class
// =============================================================================

/**
 * Fluent builder for creating test containers with minimal boilerplate.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const { container } = TestBuilder.create()
 *   .withSingleton(LoggerPort, createMockLogger)
 *   .build();
 *
 * // With dependencies
 * const { container } = TestBuilder.create()
 *   .withSingleton(LoggerPort, createMockLogger)
 *   .withDependentSingleton(UserServicePort, [LoggerPort], deps => ({
 *     getUser: id => deps.Logger.log(`Getting ${id}`)
 *   }))
 *   .build();
 *
 * // Quick presets
 * const { container } = TestBuilder.create()
 *   .withLogger()
 *   .withDatabase()
 *   .withScopedRequestContext()
 *   .build();
 * ```
 */
export class TestBuilder {
  private readonly entries: AdapterEntry[] = [];
  private readonly callCounts: Map<string, number> = new Map();
  private containerName = "TestContainer";

  private constructor() {}

  /**
   * Creates a new TestBuilder instance.
   */
  static create(): TestBuilder {
    return new TestBuilder();
  }

  /**
   * Sets the container name.
   */
  named(name: string): this {
    this.containerName = name;
    return this;
  }

  // ===========================================================================
  // Generic Adapter Methods
  // ===========================================================================

  /**
   * Adds a singleton adapter with no dependencies.
   */
  withSingleton<P extends AnyPort>(port: P, factory: () => InferService<P>): this {
    const wrappedFactory = this.trackFactory(port, factory);
    const adapter = createAdapter({
      provides: port,
      requires: [],
      lifetime: "singleton",
      factory: wrappedFactory,
    });
    this.entries.push({ port, adapter, factory });
    return this;
  }

  /**
   * Adds a scoped adapter with no dependencies.
   */
  withScoped<P extends AnyPort>(port: P, factory: () => InferService<P>): this {
    const wrappedFactory = this.trackFactory(port, factory);
    const adapter = createAdapter({
      provides: port,
      requires: [],
      lifetime: "scoped",
      factory: wrappedFactory,
    });
    this.entries.push({ port, adapter, factory });
    return this;
  }

  /**
   * Adds a transient adapter with no dependencies.
   */
  withTransient<P extends AnyPort>(port: P, factory: () => InferService<P>): this {
    const wrappedFactory = this.trackFactory(port, factory);
    const adapter = createAdapter({
      provides: port,
      requires: [],
      lifetime: "transient",
      factory: wrappedFactory,
    });
    this.entries.push({ port, adapter, factory });
    return this;
  }

  /**
   * Adds a singleton adapter with one dependency.
   */
  withDependentSingleton1<P extends AnyPort, D1 extends AnyPort>(
    port: P,
    dep1: D1,
    factory: (deps: ResolvedDeps<D1>) => InferService<P>
  ): this {
    const adapter = createAdapter({
      provides: port,
      requires: [dep1] as const,
      lifetime: "singleton",
      factory,
    });
    this.entries.push({ port, adapter, factory: undefined });
    return this;
  }

  /**
   * Adds a singleton adapter with two dependencies.
   */
  withDependentSingleton2<P extends AnyPort, D1 extends AnyPort, D2 extends AnyPort>(
    port: P,
    dep1: D1,
    dep2: D2,
    factory: (deps: ResolvedDeps<D1 | D2>) => InferService<P>
  ): this {
    const adapter = createAdapter({
      provides: port,
      requires: [dep1, dep2] as const,
      lifetime: "singleton",
      factory,
    });
    this.entries.push({ port, adapter, factory: undefined });
    return this;
  }

  /**
   * Adds a scoped adapter with one dependency.
   */
  withDependentScoped1<P extends AnyPort, D1 extends AnyPort>(
    port: P,
    dep1: D1,
    factory: (deps: ResolvedDeps<D1>) => InferService<P>
  ): this {
    const adapter = createAdapter({
      provides: port,
      requires: [dep1] as const,
      lifetime: "scoped",
      factory,
    });
    this.entries.push({ port, adapter, factory: undefined });
    return this;
  }

  // ===========================================================================
  // Standard Service Presets
  // ===========================================================================

  /**
   * Adds a mock logger singleton.
   */
  withLogger(factory?: () => Logger): this {
    return this.withSingleton(LoggerPort, factory ?? createMockLogger);
  }

  /**
   * Adds a mock database singleton.
   */
  withDatabase(factory?: () => Database): this {
    return this.withSingleton(DatabasePort, factory ?? createMockDatabase);
  }

  /**
   * Adds a scoped request context.
   */
  withScopedRequestContext(requestIdGenerator?: () => string): this {
    return this.withScoped(RequestContextPort, () => ({
      requestId: requestIdGenerator?.() ?? generateRequestId(),
      timestamp: Date.now(),
    }));
  }

  /**
   * Adds a mock cache service singleton.
   */
  withCacheService(factory?: () => CacheService): this {
    return this.withSingleton(CacheServicePort, factory ?? createMockCacheService);
  }

  /**
   * Adds a user service with logger dependency.
   */
  withUserService(factory?: (deps: ResolvedDeps<typeof LoggerPort>) => UserService): this {
    return this.withDependentSingleton1(
      UserServicePort,
      LoggerPort,
      factory ??
        (deps => ({
          getUser: (id: string) => {
            deps.Logger.log(`Getting user ${id}`);
            return { id, name: `User ${id}` };
          },
          createUser: (data: unknown) => {
            deps.Logger.log("Creating user");
            return { id: `user-${Date.now()}`, ...(data as object) };
          },
        }))
    );
  }

  /**
   * Adds a config service with predefined values.
   */
  withConfigService(config: Record<string, string>): this {
    return this.withSingleton(ConfigServicePort, () => ({
      get: (key: string) => config[key],
      getRequired: (key: string) => {
        const value = config[key];
        if (value === undefined) {
          throw new Error(`Config key '${key}' not found`);
        }
        return value;
      },
    }));
  }

  // ===========================================================================
  // Build Method
  // ===========================================================================

  /**
   * Builds the container and returns the result.
   */
  build(): TestBuilderResult {
    // Build graph using dynamic adapter registration
    // We use a mutable approach here since this is test infrastructure
    // and the types are validated at the individual withX method calls
    const adapters = this.entries.map(entry => entry.adapter);

    // Use reduce to build up the graph, letting TypeScript infer at each step
    type AnyBuilder = ReturnType<typeof GraphBuilder.create> & {
      provide(adapter: unknown): AnyBuilder;
      build(): unknown;
    };
    const graph = adapters
      .reduce(
        (builder: AnyBuilder, adapter) => builder.provide(adapter),
        GraphBuilder.create() as AnyBuilder
      )
      .build();

    // Create container
    const container = createContainer({
      graph: graph as never,
      name: this.containerName,
    });

    const callCountsRef = this.callCounts;

    return {
      container,
      resolve<P extends AnyPort>(port: P): InferService<P> {
        return (container as { resolve: (port: P) => InferService<P> }).resolve(port);
      },
      createScope() {
        return (
          container as { createScope: () => Scope<AnyPort, never, "initialized"> }
        ).createScope();
      },
      getCallCount(port: AnyPort) {
        return callCountsRef.get(port.__portName);
      },
    };
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private trackFactory<T>(port: AnyPort, factory: () => T): () => T {
    const portName = port.__portName;
    this.callCounts.set(portName, 0);
    return () => {
      const current = this.callCounts.get(portName) ?? 0;
      this.callCounts.set(portName, current + 1);
      return factory();
    };
  }
}

// =============================================================================
// Quick Builder Functions
// =============================================================================

/**
 * Quickly creates a container with just a logger.
 */
export function buildLoggerContainer() {
  return TestBuilder.create().withLogger().build();
}

/**
 * Quickly creates a container with logger and database.
 */
export function buildStandardContainer() {
  return TestBuilder.create().withLogger().withDatabase().withCacheService().build();
}

/**
 * Quickly creates a container with scoped services.
 */
export function buildScopedContainer() {
  return TestBuilder.create().withLogger().withScopedRequestContext().build();
}

/**
 * Quickly creates a container with user service.
 */
export function buildUserServiceContainer() {
  return TestBuilder.create().withLogger().withUserService().build();
}
