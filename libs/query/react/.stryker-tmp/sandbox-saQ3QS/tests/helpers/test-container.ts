/**
 * Test helper: creates a minimal QueryContainer for test suites.
 *
 * Maps port names to their resolved services (fetchers/executors).
 * Used across all query-react test files to satisfy the container requirement.
 */
// @ts-nocheck

import type { QueryContainer } from "@hex-di/query";

/** Minimal port shape needed for container registration. */
interface PortLike<T = unknown> {
  readonly __portName: string;
  readonly __brand?: T;
}

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
    resolve<T>(port: PortLike<T>): T {
      const service = services.get(port.__portName);
      if (service === undefined) {
        throw new Error(`No adapter registered for port "${port.__portName}"`);
      }
      return service as T;
    },
    register(port: PortLike, service: unknown): void {
      services.set(port.__portName, service);
    },
  };
}

export interface TestContainer extends QueryContainer {
  register(port: PortLike, service: unknown): void;
}
