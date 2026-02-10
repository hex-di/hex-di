/**
 * SagaRegistry DI Adapter
 *
 * Provides a SagaRegistry instance as a singleton adapter for HexDI containers.
 * The registry tracks live saga executions and can be resolved from the container.
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import { createSagaRegistry } from "../introspection/saga-registry.js";
import { SagaRegistryPort } from "../ports/factory.js";

// =============================================================================
// Type Guard
// =============================================================================

/**
 * Type guard for objects with a `dispose` method (void return).
 * @internal
 */
function hasDispose(value: unknown): value is { dispose(): void } {
  if (typeof value !== "object" || value === null) return false;
  const descriptor = Object.getOwnPropertyDescriptor(value, "dispose");
  return descriptor !== undefined && typeof descriptor.value === "function";
}

// =============================================================================
// SagaRegistry Adapter
// =============================================================================

/**
 * DI Adapter that provides a SagaRegistry singleton.
 *
 * Register this adapter in a GraphBuilder to make SagaRegistryPort resolvable:
 *
 * @example
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(SagaRegistryAdapter)
 *   .build();
 *
 * const registry = container.resolve(SagaRegistryPort);
 * const executions = registry.getAllExecutions();
 * ```
 */
type SagaRegistryAdapterType = Adapter<
  typeof SagaRegistryPort,
  never,
  "singleton",
  "sync",
  false,
  readonly []
>;

export const SagaRegistryAdapter: SagaRegistryAdapterType = Object.freeze<SagaRegistryAdapterType>({
  provides: SagaRegistryPort,
  requires: [],
  lifetime: "singleton",
  factoryKind: "sync",
  clonable: false,
  factory: (): InferService<typeof SagaRegistryPort> => createSagaRegistry(),
  finalizer: (instance: InferService<typeof SagaRegistryPort>): void => {
    if (hasDispose(instance)) {
      instance.dispose();
    }
  },
});
