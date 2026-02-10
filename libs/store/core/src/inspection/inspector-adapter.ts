/**
 * Inspector Adapter Factory
 *
 * Creates a StoreInspectorAPI adapter that can be registered with
 * the store runtime via createAdapter from @hex-di/core.
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import type {
  StoreInspectorAPI,
  StoreInspectorInternal,
  ActionHistoryConfig,
} from "../types/inspection.js";
import {
  StoreInspectorPort,
  StoreInspectorInternalPort,
  StoreRegistryPort,
} from "../types/inspection.js";
import { createStoreInspectorImpl } from "./store-inspector-impl.js";
import type { StoreRegistry } from "./store-registry.js";

// =============================================================================
// Config
// =============================================================================

export interface CreateStoreInspectorAdapterConfig {
  readonly historyConfig?: ActionHistoryConfig;
  readonly registry?: StoreRegistry;
}

// =============================================================================
// Factory
// =============================================================================

export interface StoreInspectorAdapterResult {
  /** The public StoreInspectorAPI for consumers */
  readonly api: StoreInspectorAPI;

  /** The internal interface for the runtime to hook into */
  readonly internal: StoreInspectorInternal;
}

/**
 * Creates a StoreInspectorAPI adapter.
 *
 * Returns both the public API (for consumers) and the internal interface
 * (for the store runtime to register ports and record actions).
 */
export function createStoreInspectorAdapter(
  config?: CreateStoreInspectorAdapterConfig
): StoreInspectorAdapterResult {
  const inspector = createStoreInspectorImpl({
    historyConfig: config?.historyConfig,
    registry: config?.registry,
  });

  return {
    api: inspector,
    internal: inspector,
  };
}

// =============================================================================
// Frozen Singleton Adapter (standalone, no registry)
// =============================================================================

/**
 * Pre-built frozen adapter for auto-registering StoreInspectorAPI with a GraphBuilder.
 * Does not depend on StoreRegistryPort — use this for simple setups
 * where manual `registerPort()` is acceptable.
 *
 * @example
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(StoreInspectorAdapter)
 *   .build();
 *
 * const inspector = container.resolve(StoreInspectorPort);
 * const snapshot = inspector.getSnapshot();
 * ```
 */
export const StoreInspectorAdapter: Adapter<
  typeof StoreInspectorPort,
  never,
  "singleton",
  "sync",
  false,
  readonly []
> = Object.freeze({
  provides: StoreInspectorPort,
  requires: [] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  factory: (): InferService<typeof StoreInspectorPort> => createStoreInspectorImpl(),
});

// =============================================================================
// Registry-aware Adapter
// =============================================================================

/**
 * Inspector adapter that depends on StoreRegistryPort for auto-discovery.
 * When the registry is resolved, the inspector auto-populates its port list
 * from registered entries and subscribes for future changes.
 *
 * @example
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(StoreRegistryAdapter)
 *   .provide(StoreInspectorWithRegistryAdapter)
 *   .provide(myStateAdapter)
 *   .build();
 *
 * const inspector = container.resolve(StoreInspectorPort);
 * // Auto-discovers ports registered with the StoreRegistry
 * ```
 */
export const StoreInspectorWithRegistryAdapter: Adapter<
  typeof StoreInspectorPort,
  typeof StoreRegistryPort,
  "singleton",
  "sync",
  false,
  readonly [typeof StoreRegistryPort]
> = Object.freeze({
  provides: StoreInspectorPort,
  requires: [StoreRegistryPort] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  factory: (deps: {
    StoreRegistry: InferService<typeof StoreRegistryPort>;
  }): InferService<typeof StoreInspectorPort> =>
    createStoreInspectorImpl({ registry: deps.StoreRegistry }),
});

// =============================================================================
// StoreInspectorInternal Adapter (for auto-registration/recording)
// =============================================================================

/**
 * Adapter that provides StoreInspectorInternal (the extended mutation API).
 * Depends on StoreRegistryPort so the inspector auto-discovers registered ports.
 *
 * Used by adapter factories with `inspection: true` to get access to
 * `recordAction`, `emit`, and `incrementPendingEffects`/`decrementPendingEffects`.
 */
export const StoreInspectorInternalAdapter: Adapter<
  typeof StoreInspectorInternalPort,
  typeof StoreRegistryPort,
  "singleton",
  "sync",
  false,
  readonly [typeof StoreRegistryPort]
> = Object.freeze({
  provides: StoreInspectorInternalPort,
  requires: [StoreRegistryPort] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  factory: (deps: {
    StoreRegistry: InferService<typeof StoreRegistryPort>;
  }): InferService<typeof StoreInspectorInternalPort> =>
    createStoreInspectorImpl({ registry: deps.StoreRegistry }),
});
