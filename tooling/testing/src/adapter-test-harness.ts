/**
 * Adapter Test Harness
 *
 * Provides a harness for testing individual adapters in isolation with
 * mock dependencies. The harness validates all required dependencies are
 * provided at creation time and provides typed access to both the service
 * instance and mock dependencies for assertions.
 *
 * @module
 */

import type {
  Port,
  InferService,
  Adapter,
  Lifetime,
  FactoryKind,
  ResolvedDeps,
} from "@hex-di/core";

// =============================================================================
// Types
// =============================================================================

/**
 * Test harness returned by `createAdapterTest`.
 *
 * Provides methods to invoke the adapter's factory and access mock dependencies
 * for spy assertions.
 *
 * @typeParam TProvides - The port type this adapter provides
 * @typeParam TRequires - Union of port types this adapter requires
 * @typeParam TFactoryKind - Whether the adapter factory is 'sync' or 'async'
 *
 * @example Sync adapter
 * ```typescript
 * const harness = createAdapterTest(UserServiceAdapter, {
 *   Logger: mockLogger,
 *   Database: mockDatabase,
 * });
 *
 * // Invoke factory to get service instance (sync)
 * const userService = harness.invoke();
 *
 * // Call service method
 * await userService.getUser('123');
 *
 * // Assert on mock dependencies
 * const deps = harness.getDeps();
 * expect(deps.Logger.log).toHaveBeenCalledWith('Fetching user 123');
 * ```
 *
 * @example Async adapter
 * ```typescript
 * const harness = createAdapterTest(DatabaseAdapter, {
 *   Config: mockConfig,
 * });
 *
 * // Invoke factory to get service instance (async)
 * const database = await harness.invoke();
 *
 * expect(database.query).toBeDefined();
 * ```
 */
export interface AdapterTestHarness<
  TProvides extends Port<string, unknown>,
  TRequires extends Port<string, unknown> | never,
  TFactoryKind extends FactoryKind = "sync",
> {
  /**
   * Invokes the adapter's factory function with the mock dependencies.
   *
   * Each call creates a fresh service instance by calling the factory,
   * allowing tests to verify factory behavior and service construction.
   *
   * For async adapters, this returns a Promise that resolves to the service.
   *
   * @returns The service instance typed according to the adapter's provides port.
   *   For async adapters, returns Promise<InferService<TProvides>>.
   *
   * @example Sync adapter
   * ```typescript
   * const service = harness.invoke();
   * const user = await service.getUser('123');
   * ```
   *
   * @example Async adapter
   * ```typescript
   * const service = await harness.invoke();
   * const results = await service.query('SELECT * FROM users');
   * ```
   */
  invoke(): TFactoryKind extends "async"
    ? Promise<InferService<TProvides>>
    : InferService<TProvides>;

  /**
   * Returns a reference to the mock dependencies object.
   *
   * Use this to access mocks for spy assertions after invoking the service.
   * The returned object maintains the same shape as the dependencies passed
   * to `createAdapterTest`.
   *
   * @returns The mock dependencies object typed as ResolvedDeps<TRequires>
   *
   * @example
   * ```typescript
   * const service = harness.invoke();
   * service.doSomething();
   *
   * const deps = harness.getDeps();
   * expect(deps.Logger.log).toHaveBeenCalled();
   * expect(deps.Database.query).toHaveBeenCalledWith('SELECT ...');
   * ```
   */
  getDeps(): ResolvedDeps<TRequires>;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Validates that all required dependencies are provided.
 *
 * @param adapter - The adapter whose dependencies to validate
 * @param mockDependencies - The provided mock dependencies
 * @throws Error if any required dependency is missing
 *
 * @internal
 */
function validateDependencies<
  TProvides extends Port<string, unknown>,
  TRequires extends Port<string, unknown> | never,
  TLifetime extends Lifetime,
  TFactoryKind extends FactoryKind,
  TClonable extends boolean = boolean,
>(
  adapter: Adapter<TProvides, TRequires, TLifetime, TFactoryKind, TClonable>,
  mockDependencies: Record<string, unknown>
): void {
  const requires = adapter.requires as readonly Port<string, unknown>[];

  for (const port of requires) {
    const portName = port.__portName as string;
    if (!(portName in mockDependencies)) {
      throw new Error(`Missing mock for required port '${portName}'`);
    }
  }
}

/**
 * Creates a test harness for testing an individual adapter's factory logic in isolation.
 *
 * This function provides a focused testing environment for a single adapter,
 * allowing you to supply mock dependencies and then invoke the factory to
 * get a typed service instance. The harness validates all required dependencies
 * at creation time, failing fast if any mocks are missing.
 *
 * @typeParam TProvides - The port type this adapter provides (inferred from adapter)
 * @typeParam TRequires - Union of port types this adapter requires (inferred from adapter)
 * @typeParam TLifetime - The adapter's lifetime scope (inferred from adapter)
 * @typeParam TFactoryKind - Whether the adapter factory is 'sync' or 'async' (inferred from adapter)
 *
 * @param adapter - The adapter to test
 * @param mockDependencies - An object containing mock implementations for each
 *   required dependency, keyed by port name. Must include all dependencies
 *   declared in the adapter's `requires` array.
 *
 * @returns An `AdapterTestHarness` with `invoke()` and `getDeps()` methods
 *
 * @throws Error if any required dependency is missing from `mockDependencies`
 *
 * @remarks
 * - Dependencies are validated at creation time, not at `invoke()` time
 * - Each `invoke()` call creates a fresh service instance
 * - For async adapters, `invoke()` returns a Promise that resolves to the service
 * - The `getDeps()` method returns the same mock objects passed at creation
 * - This harness is framework-agnostic and works with any test framework
 *
 * @example Basic usage with Vitest (sync adapter)
 * ```typescript
 * import { createAdapterTest } from '@hex-di/testing';
 * import { vi } from 'vitest';
 *
 * const mockLogger = {
 *   log: vi.fn(),
 *   warn: vi.fn(),
 *   error: vi.fn(),
 * };
 *
 * const mockDatabase = {
 *   query: vi.fn().mockResolvedValue({ rows: [] }),
 *   connect: vi.fn(),
 *   disconnect: vi.fn(),
 * };
 *
 * const harness = createAdapterTest(UserServiceAdapter, {
 *   Logger: mockLogger,
 *   Database: mockDatabase,
 * });
 *
 * // Test the service
 * const userService = harness.invoke();
 * await userService.getUser('123');
 *
 * // Assert on mocks
 * expect(harness.getDeps().Logger.log).toHaveBeenCalledWith('Fetching user 123');
 * ```
 *
 * @example Async adapter (invoke returns Promise)
 * ```typescript
 * const harness = createAdapterTest(DatabaseAdapter, {
 *   Config: mockConfig,
 * });
 *
 * // Note: await is required for async adapters
 * const database = await harness.invoke();
 *
 * expect(database.query).toBeDefined();
 * ```
 *
 * @example Adapter with no dependencies
 * ```typescript
 * const harness = createAdapterTest(ConfigAdapter, {});
 * const config = harness.invoke();
 *
 * expect(config.apiUrl).toBe('http://example.com');
 * ```
 *
 * @example Missing dependency throws immediately
 * ```typescript
 * // This throws: "Missing mock for required port 'Database'"
 * const harness = createAdapterTest(UserServiceAdapter, {
 *   Logger: mockLogger,
 *   // Database is missing!
 * });
 * ```
 *
 * @see {@link AdapterTestHarness} - The return type interface
 * @see {@link createMockAdapter} - For creating mock adapters for graph overrides
 */
export function createAdapterTest<
  TProvides extends Port<string, unknown>,
  TRequires extends Port<string, unknown> | never,
  TLifetime extends Lifetime,
  TFactoryKind extends FactoryKind = FactoryKind,
  TClonable extends boolean = boolean,
>(
  adapter: Adapter<TProvides, TRequires, TLifetime, TFactoryKind, TClonable>,
  mockDependencies: ResolvedDeps<TRequires>
): AdapterTestHarness<TProvides, TRequires, TFactoryKind> {
  // Validate all required dependencies are provided
  validateDependencies(adapter, mockDependencies as Record<string, unknown>);

  return Object.freeze({
    invoke() {
      return adapter.factory(mockDependencies);
    },

    getDeps(): ResolvedDeps<TRequires> {
      return mockDependencies;
    },
  }) as AdapterTestHarness<TProvides, TRequires, TFactoryKind>;
}
