/**
 * StoreTracingHook Adapter Factory
 *
 * Creates a DI adapter that provides a StoreTracingHook from a StoreTracerLike.
 *
 * @packageDocumentation
 */

import type { Adapter } from "@hex-di/core";
import type { StoreTracerLike, StoreTracingHook } from "./tracing-bridge.js";
import { createStoreTracingBridge } from "./tracing-bridge.js";
import { StoreTracingHookPort } from "../types/inspection.js";

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a frozen adapter that provides StoreTracingHookPort.
 * The adapter wraps a StoreTracerLike via createStoreTracingBridge.
 */
export function createStoreTracingHookAdapter(config: {
  readonly tracer: StoreTracerLike;
  readonly filter?: (portName: string) => boolean;
}): Adapter<typeof StoreTracingHookPort, never, "singleton", "sync", false, readonly []> {
  return Object.freeze({
    provides: StoreTracingHookPort,
    requires: [] as const,
    lifetime: "singleton" as const,
    factoryKind: "sync" as const,
    clonable: false as const,
    freeze: true as const,
    factory: (): StoreTracingHook =>
      createStoreTracingBridge({
        tracer: config.tracer,
        filter: config.filter,
      }),
  });
}
