/**
 * SagaInspector DI Adapter
 *
 * Provides a SagaInspector instance as a singleton adapter for HexDI containers.
 * The inspector depends on a SagaRegistry and configuration for definitions,
 * persistence, and active traces.
 *
 * @packageDocumentation
 */

import type { Adapter, InferService } from "@hex-di/core";
import type { SagaPersister } from "../ports/types.js";
import type { AnySagaDefinition } from "../saga/types.js";
import type { ExecutionTrace } from "../runtime/types.js";
import { createSagaInspector } from "../introspection/saga-inspector.js";
import { SagaInspectorPort, SagaRegistryPort } from "../ports/factory.js";

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
 * Configuration for creating a SagaInspector adapter.
 */
export interface SagaInspectorAdapterConfig {
  /** Registered saga definitions for introspection. */
  readonly definitions: readonly AnySagaDefinition[];
  /** Optional persister for historical execution queries. */
  readonly persister?: SagaPersister;
  /** Optional active traces for live execution tracking. */
  readonly activeTraces?: Readonly<Record<string, ExecutionTrace>>;
}

// =============================================================================
// SagaInspector Adapter Type
// =============================================================================

/**
 * The adapter type for SagaInspectorAdapter.
 */
type SagaInspectorAdapterType = Adapter<
  typeof SagaInspectorPort,
  typeof SagaRegistryPort,
  "singleton",
  "sync",
  false,
  readonly [typeof SagaRegistryPort]
>;

// =============================================================================
// SagaInspector Adapter Factory
// =============================================================================

/**
 * Creates a DI Adapter that provides a SagaInspector singleton.
 *
 * The SagaInspector requires a SagaRegistry (resolved from the container)
 * and saga definitions (provided in the config) for introspection.
 *
 * @param config - Configuration with definitions and optional persister/traces
 * @returns A frozen adapter for SagaInspectorPort
 *
 * @example
 * ```typescript
 * const SagaInspectorAdapter = createSagaInspectorAdapter({
 *   definitions: [orderSaga, paymentSaga],
 *   persister: myPersister,
 * });
 *
 * const graph = GraphBuilder.create()
 *   .provide(SagaRegistryAdapter)
 *   .provide(SagaInspectorAdapter)
 *   .build();
 *
 * const inspector = container.resolve(SagaInspectorPort);
 * const defs = inspector.getDefinitions();
 * ```
 */
export function createSagaInspectorAdapter(
  config: SagaInspectorAdapterConfig
): SagaInspectorAdapterType {
  const adapter: SagaInspectorAdapterType = {
    provides: SagaInspectorPort,
    requires: [SagaRegistryPort],
    lifetime: "singleton",
    factoryKind: "sync",
    clonable: false,
    freeze: true,
    factory: (deps: {
      SagaRegistry: InferService<typeof SagaRegistryPort>;
    }): InferService<typeof SagaInspectorPort> => {
      // Access the registry from deps using indexObject for safety
      const _registry = indexObject(deps, "SagaRegistry");

      return createSagaInspector({
        definitions: config.definitions,
        persister: config.persister,
        activeTraces: config.activeTraces,
      });
    },
    finalizer: (instance: InferService<typeof SagaInspectorPort>): void => {
      if (hasDispose(instance)) {
        instance.dispose();
      }
    },
  };

  return Object.freeze(adapter);
}
