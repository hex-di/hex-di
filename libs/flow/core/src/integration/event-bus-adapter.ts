/**
 * FlowEventBus DI Adapter
 *
 * Provides a FlowEventBus instance as a singleton adapter for HexDI containers.
 * The event bus enables cross-machine event routing and can be resolved from the container.
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import { createFlowEventBus } from "../event-bus/flow-event-bus.js";
import { FlowEventBusPort } from "./types.js";

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
// FlowEventBus Adapter
// =============================================================================

/**
 * DI Adapter that provides a FlowEventBus singleton.
 *
 * Register this adapter in a GraphBuilder to make FlowEventBusPort resolvable:
 *
 * @example
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(FlowEventBusAdapter)
 *   .build();
 *
 * const bus = container.resolve(FlowEventBusPort);
 * bus.subscribe(event => console.log(event.type));
 * ```
 */
export const FlowEventBusAdapter: Adapter<
  typeof FlowEventBusPort,
  never,
  "singleton",
  "sync",
  false,
  readonly []
> = Object.freeze({
  provides: FlowEventBusPort,
  requires: [] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  factory: (): InferService<typeof FlowEventBusPort> => createFlowEventBus(),
  finalizer: (instance: InferService<typeof FlowEventBusPort>): void => {
    if (hasDispose(instance)) {
      instance.dispose();
    }
  },
});
