/**
 * StoreRegistry DI Adapter
 *
 * Provides a StoreRegistry instance as a singleton adapter for HexDI containers.
 * The registry tracks store port instances and can be resolved from the container.
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import { createStoreRegistry } from "./store-registry.js";
import { StoreRegistryPort } from "../types/inspection.js";

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
// StoreRegistry Adapter
// =============================================================================

/**
 * DI Adapter that provides a StoreRegistry singleton.
 *
 * Register this adapter in a GraphBuilder to make StoreRegistryPort resolvable:
 *
 * @example
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(StoreRegistryAdapter)
 *   .build();
 *
 * const registry = container.resolve(StoreRegistryPort);
 * const ports = registry.getAll();
 * ```
 */
export const StoreRegistryAdapter: Adapter<
  typeof StoreRegistryPort,
  never,
  "singleton",
  "sync",
  false,
  readonly []
> = Object.freeze({
  provides: StoreRegistryPort,
  requires: [] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  factory: (): InferService<typeof StoreRegistryPort> => createStoreRegistry(),
  finalizer: (instance: InferService<typeof StoreRegistryPort>): void => {
    if (hasDispose(instance)) {
      instance.dispose();
    }
  },
});
