/**
 * Query Test Lifecycle Helpers
 *
 * Provides vitest lifecycle hooks and manual scoping for test setup/teardown.
 *
 * @packageDocumentation
 */

import { beforeEach, afterEach } from "vitest";
import type { QueryClient } from "@hex-di/query";
import {
  createQueryTestContainer,
  type QueryTestContainerConfig,
  type QueryTestContainer,
} from "./test-container.js";

// =============================================================================
// useQueryTestContainer
// =============================================================================

/**
 * Vitest lifecycle hook that creates a fresh QueryTestContainer before each
 * test and disposes it after each test.
 *
 * @example
 * ```typescript
 * describe("my query tests", () => {
 *   const ctx = useQueryTestContainer();
 *
 *   beforeEach(() => {
 *     ctx.container.register(UsersPort, () => ResultAsync.ok(["Alice"]));
 *   });
 *
 *   it("fetches data", async () => {
 *     const result = await ctx.queryClient.fetchQuery(UsersPort, undefined);
 *     expectQueryResult(result).toBeOk();
 *   });
 * });
 * ```
 */
export function useQueryTestContainer(config?: QueryTestContainerConfig): {
  readonly queryClient: QueryClient;
  readonly container: QueryTestContainer;
} {
  let container: QueryTestContainer | undefined;

  beforeEach(() => {
    container = createQueryTestContainer(config);
  });

  afterEach(() => {
    container?.dispose();
    container = undefined;
  });

  return {
    get queryClient(): QueryClient {
      if (container === undefined) {
        throw new Error(
          "useQueryTestContainer: accessed queryClient outside of a test. Ensure the test is running within a describe() block that calls useQueryTestContainer."
        );
      }
      return container.queryClient;
    },
    get container(): QueryTestContainer {
      if (container === undefined) {
        throw new Error("useQueryTestContainer: accessed container outside of a test.");
      }
      return container;
    },
  };
}

// =============================================================================
// createQueryTestScope
// =============================================================================

/**
 * Creates a manual test scope with a QueryClient. Caller is responsible
 * for calling `dispose()`.
 *
 * @example
 * ```typescript
 * it("manual scope", async () => {
 *   const scope = createQueryTestScope();
 *   scope.register(UsersPort, () => ResultAsync.ok(["Alice"]));
 *
 *   const result = await scope.queryClient.fetchQuery(UsersPort, undefined);
 *   scope.dispose();
 * });
 * ```
 */
export function createQueryTestScope(config?: QueryTestContainerConfig): QueryTestContainer {
  return createQueryTestContainer(config);
}
