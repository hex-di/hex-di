/**
 * Query Test Container
 *
 * Creates a self-contained QueryClient with a minimal DI container
 * for easy test setup and teardown.
 *
 * @packageDocumentation
 */

import {
  createQueryClient,
  type QueryClient,
  type QueryContainer,
  type QueryDefaults,
} from "@hex-di/query";

// =============================================================================
// QueryTestContainerConfig
// =============================================================================

/**
 * Configuration for the query test container.
 */
export interface QueryTestContainerConfig {
  readonly defaults?: Partial<QueryDefaults>;
}

// =============================================================================
// QueryTestContainer
// =============================================================================

export interface QueryTestContainer {
  readonly queryClient: QueryClient;
  /** Register a service (fetcher/executor) for a port */
  register(port: { readonly __portName: string }, service: unknown): void;
  dispose(): void;
}

// =============================================================================
// createQueryTestContainer
// =============================================================================

/**
 * Creates a test container with a QueryClient and mutable service registration.
 *
 * @example
 * ```typescript
 * const testContainer = createQueryTestContainer();
 * testContainer.register(UsersPort, () => ResultAsync.ok(["Alice", "Bob"]));
 * testContainer.register(CreateUserPort, (input) => ResultAsync.ok({ id: "1", ...input }));
 *
 * const result = await testContainer.queryClient.fetchQuery(UsersPort, undefined);
 * testContainer.dispose();
 * ```
 */
/**
 * Creates a minimal container that satisfies QueryContainer via overload (no cast).
 * The resolve method returns unknown at runtime, but the overload signature
 * declares it as QueryContainer so the generic `resolve<T>` matches.
 */
function createMinimalContainer(services: Map<string, unknown>): QueryContainer;
function createMinimalContainer(services: Map<string, unknown>): object {
  return {
    resolve(port: { readonly __portName: string }): unknown {
      const service = services.get(port.__portName);
      if (service === undefined) {
        throw new Error(`No adapter registered for port "${port.__portName}"`);
      }
      return service;
    },
  };
}

export function createQueryTestContainer(config?: QueryTestContainerConfig): QueryTestContainer {
  const services = new Map<string, unknown>();

  const container = createMinimalContainer(services);

  const queryClient = createQueryClient({
    container,
    defaults: config?.defaults,
  });

  return {
    queryClient,
    register(port: { readonly __portName: string }, service: unknown): void {
      services.set(port.__portName, service);
    },
    dispose() {
      queryClient.dispose();
    },
  };
}
