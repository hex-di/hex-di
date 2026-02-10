/**
 * Test helper: creates a minimal QueryContainer for test suites.
 *
 * Maps port names to their resolved services (fetchers/executors).
 * Used across all query test files to satisfy the container requirement.
 */

import type { Port } from "@hex-di/core";
import type { QueryContainer } from "../../src/client/query-client.js";

/**
 * Creates a QueryContainer backed by a Map<portName, service>.
 *
 * Usage:
 * ```typescript
 * const container = createTestContainer();
 * container.register(UsersPort, myFetcher);
 * const client = createQueryClient({ container });
 * ```
 */
export function createTestContainer(): TestContainer {
  const services = new Map<string, unknown>();

  return {
    resolve<T>(port: Port<T, string>): T {
      const service = services.get(port.__portName);
      if (service === undefined) {
        throw new Error(`No adapter registered for port "${port.__portName}"`);
      }
      return service as T;
    },
    register<T>(port: Port<T, string>, service: T): void {
      services.set(port.__portName, service);
    },
  };
}

export interface TestContainer extends QueryContainer {
  register<T>(port: Port<T, string>, service: T): void;
}
