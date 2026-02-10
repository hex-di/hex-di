/**
 * FlowInspector DI Adapter
 *
 * Provides a FlowInspector instance as a singleton adapter for HexDI containers.
 * The inspector depends on a FlowRegistry and a collector for querying machine
 * state, transition history, and health information.
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import type { FlowInspectorConfig } from "../introspection/types.js";
import { createFlowInspector } from "../introspection/flow-inspector.js";
import { FlowInspectorPort, FlowRegistryPort } from "./types.js";

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

/**
 * Safely index into an unknown object by key.
 * @internal
 */
function indexObject(obj: unknown, key: string): unknown {
  if (typeof obj !== "object" || obj === null) {
    return undefined;
  }
  if (key in obj) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    return descriptor !== undefined ? descriptor.value : undefined;
  }
  return undefined;
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configuration for creating a FlowInspector adapter.
 */
export interface FlowInspectorAdapterConfig {
  /** The collector providing transition data and subscriptions. */
  readonly collector: FlowInspectorConfig["collector"];
  /** Maximum number of health events to buffer. */
  readonly healthBufferSize?: number;
  /** Maximum number of effect result records to buffer. */
  readonly effectBufferSize?: number;
  /** TTL in milliseconds for the snapshot cache. */
  readonly cacheTtlMs?: number;
}

// =============================================================================
// FlowInspector Adapter Type
// =============================================================================

/**
 * The adapter type for FlowInspectorAdapter.
 */
type FlowInspectorAdapterType = Adapter<
  typeof FlowInspectorPort,
  typeof FlowRegistryPort,
  "singleton",
  "sync",
  false,
  readonly [typeof FlowRegistryPort]
>;

// =============================================================================
// FlowInspector Adapter Factory
// =============================================================================

/**
 * Creates a DI Adapter that provides a FlowInspector singleton.
 *
 * The FlowInspector requires a FlowRegistry (resolved from the container)
 * and a collector (provided in the config) to aggregate query data.
 *
 * @param config - Configuration with collector and optional buffer sizes
 * @returns A frozen adapter for FlowInspectorPort
 *
 * @example
 * ```typescript
 * const FlowInspectorAdapter = createFlowInspectorAdapter({
 *   collector: myFlowCollector,
 *   healthBufferSize: 200,
 * });
 *
 * const graph = GraphBuilder.create()
 *   .provide(FlowRegistryAdapter)
 *   .provide(FlowInspectorAdapter)
 *   .build();
 *
 * const inspector = container.resolve(FlowInspectorPort);
 * const snapshot = inspector.getMachineState('Modal', 'Modal-1');
 * ```
 */
export function createFlowInspectorAdapter(
  config: FlowInspectorAdapterConfig
): FlowInspectorAdapterType {
  const adapter = {
    provides: FlowInspectorPort,
    requires: [FlowRegistryPort] as const,
    lifetime: "singleton" as const,
    factoryKind: "sync" as const,
    clonable: false as const,
    factory: (deps: {
      FlowRegistry: InferService<typeof FlowRegistryPort>;
    }): InferService<typeof FlowInspectorPort> => {
      // Access the registry from deps using indexObject for safety
      const registry = indexObject(deps, "FlowRegistry");

      // @ts-expect-error - Variance bridge: indexObject returns `unknown` but the DI container
      // guarantees deps.FlowRegistry is FlowRegistry. TypeScript cannot prove this because
      // indexObject returns unknown.
      const typedRegistry: InferService<typeof FlowRegistryPort> = registry;

      return createFlowInspector({
        registry: typedRegistry,
        collector: config.collector,
        healthBufferSize: config.healthBufferSize,
        effectBufferSize: config.effectBufferSize,
        cacheTtlMs: config.cacheTtlMs,
      });
    },
    finalizer: (instance: InferService<typeof FlowInspectorPort>): void => {
      if (hasDispose(instance)) {
        instance.dispose();
      }
    },
  };

  return Object.freeze(adapter);
}
