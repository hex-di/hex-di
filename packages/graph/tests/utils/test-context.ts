/**
 * Test context isolation utility.
 *
 * Provides isolated test environments with automatic cleanup
 * to prevent cross-test contamination.
 *
 * @packageDocumentation
 */

import { createPort, createAdapter, type Port, type Adapter, type Lifetime } from "@hex-di/core";
import { GraphBuilder } from "../../src/index.js";
import { resetSequence, nextSequence } from "./sequence.js";

/**
 * Configuration for creating a test adapter.
 */
export interface TestAdapterConfig<TService extends object, TName extends string> {
  /** The port this adapter provides */
  readonly port: Port<TService, TName>;
  /** Ports this adapter requires (defaults to []) */
  readonly requires?: readonly Port<unknown, string>[];
  /** Lifetime scope (defaults to "singleton") */
  readonly lifetime?: Lifetime;
  /** Custom factory (defaults to Proxy-based stub) */
  readonly factory?: () => TService;
}

/**
 * Isolated test context for dependency graph tests.
 *
 * Provides:
 * - Isolated adapter registry per test
 * - Deterministic sequence generation
 * - Automatic cleanup via dispose()
 *
 * @example
 * ```typescript
 * describe("MyService", () => {
 *   let ctx: TestContext;
 *
 *   beforeEach(() => {
 *     ctx = new TestContext();
 *   });
 *
 *   afterEach(async () => {
 *     await ctx.dispose();
 *   });
 *
 *   it("resolves dependencies", () => {
 *     const loggerAdapter = ctx.createAdapter({ port: LoggerPort });
 *     const builder = ctx.builder().provide(loggerAdapter);
 *     // ...
 *   });
 * });
 * ```
 */
export class TestContext {
  private readonly adapters = new Map<
    string,
    Adapter<
      Port<unknown, string>,
      Port<unknown, string> | never,
      Lifetime,
      "sync" | "async",
      boolean
    >
  >();
  private _sequence = 0;
  private _disposed = false;

  constructor() {
    // Reset the global sequence for this test context
    resetSequence();
  }

  /**
   * Returns the next sequence number (context-local).
   * Use for deterministic ordering within this context.
   */
  nextSeq(): number {
    return ++this._sequence;
  }

  /**
   * Returns the next global sequence number.
   * Use when interacting with code that uses the global sequence.
   */
  nextGlobalSeq(): number {
    return nextSequence();
  }

  /**
   * Creates a new GraphBuilder instance.
   */
  builder(): ReturnType<typeof GraphBuilder.create> {
    return GraphBuilder.create();
  }

  /**
   * Creates a port with optional service interface.
   * Useful for creating test-specific ports.
   */
  createPort<TName extends string, TService extends object>(name: TName): Port<TService, TName> {
    return createPort<TName, TService>(name);
  }

  /**
   * Creates an adapter for a given port with stub implementation.
   *
   * The adapter is tracked and will be available for inspection.
   * If a custom factory is not provided, a Proxy-based stub is used
   * that returns no-op functions for any method call.
   */
  createAdapter<TService extends object, TName extends string>(
    config: TestAdapterConfig<TService, TName>
  ): Adapter<Port<TService, TName>, never, Lifetime, "sync", false> {
    const { port, requires = [], lifetime = "singleton" } = config;

    const factory =
      config.factory ??
      (() => {
        return new Proxy({} as TService, {
          get(_target, prop) {
            if (typeof prop === "symbol") return undefined;
            // Return a no-op function for any method call
            return () => {};
          },
        });
      });

    const adapter = createAdapter({
      provides: port,
      requires: requires as readonly [],
      lifetime,
      factory,
    });

    // Track the adapter by port name for inspection
    this.adapters.set(port.__portName, adapter);

    // Return type needs assertion due to requires type complexity
    return adapter as Adapter<Port<TService, TName>, never, Lifetime, "sync", false>;
  }

  /**
   * Gets all adapters created in this context.
   */
  getAdapters(): ReadonlyMap<
    string,
    Adapter<
      Port<unknown, string>,
      Port<unknown, string> | never,
      Lifetime,
      "sync" | "async",
      boolean
    >
  > {
    return this.adapters;
  }

  /**
   * Gets an adapter by port name.
   */
  getAdapter(
    portName: string
  ):
    | Adapter<
        Port<unknown, string>,
        Port<unknown, string> | never,
        Lifetime,
        "sync" | "async",
        boolean
      >
    | undefined {
    return this.adapters.get(portName);
  }

  /**
   * Cleans up the test context.
   * Clears all tracked adapters and resets state.
   */
  async dispose(): Promise<void> {
    if (this._disposed) return;
    this._disposed = true;

    this.adapters.clear();
    this._sequence = 0;
  }

  /**
   * Checks if this context has been disposed.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }
}

/**
 * Creates a new TestContext instance.
 * Convenience factory for functional-style usage.
 *
 * @example
 * ```typescript
 * const ctx = createTestContext();
 * const adapter = ctx.createAdapter({ port: LoggerPort });
 * ```
 */
export function createTestContext(): TestContext {
  return new TestContext();
}

/**
 * Runs a test function with an isolated context.
 * Automatically disposes the context after the test.
 *
 * @example
 * ```typescript
 * await withTestContext(async (ctx) => {
 *   const adapter = ctx.createAdapter({ port: LoggerPort });
 *   const graph = ctx.builder().provide(adapter).build();
 *   expect(graph).toBeDefined();
 * });
 * ```
 */
export async function withTestContext<T>(fn: (ctx: TestContext) => T | Promise<T>): Promise<T> {
  const ctx = new TestContext();
  try {
    return await fn(ctx);
  } finally {
    await ctx.dispose();
  }
}
