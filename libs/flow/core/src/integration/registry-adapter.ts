/**
 * FlowRegistry DI Adapter
 *
 * Provides a FlowRegistry instance as a singleton adapter for HexDI containers.
 * The registry tracks live machine instances and can be resolved from the container.
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import { createFlowRegistry } from "../introspection/flow-registry.js";
import { FlowRegistryPort } from "./types.js";

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
// FlowRegistry Adapter
// =============================================================================

/**
 * DI Adapter that provides a FlowRegistry singleton.
 *
 * Register this adapter in a GraphBuilder to make FlowRegistryPort resolvable:
 *
 * @example
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(FlowRegistryAdapter)
 *   .build();
 *
 * const registry = container.resolve(FlowRegistryPort);
 * const machines = registry.getAllMachines();
 * ```
 */
export const FlowRegistryAdapter: Adapter<
  typeof FlowRegistryPort,
  never,
  "singleton",
  "sync",
  false,
  readonly []
> = Object.freeze({
  provides: FlowRegistryPort,
  requires: [] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  factory: (): InferService<typeof FlowRegistryPort> => createFlowRegistry(),
  finalizer: (instance: InferService<typeof FlowRegistryPort>): void => {
    if (hasDispose(instance)) {
      instance.dispose();
    }
  },
});
