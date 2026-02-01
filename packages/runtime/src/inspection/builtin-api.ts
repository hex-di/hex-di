/**
 * Built-in API factory for container property-based access.
 *
 * Creates InspectorAPI and TracingAPI instances for the built-in
 * `.inspector` and `.tracer` container properties.
 *
 * @packageDocumentation
 */

import type {
  TracingAPI,
  TraceFilter,
  TraceStats,
  TraceEntry,
  ContainerGraphData,
  AdapterInfo,
  VisualizableAdapter,
  InspectorListener,
  ServiceOrigin,
} from "@hex-di/core";
import { MemoryCollector } from "@hex-di/core";
import type { InspectorAPI } from "./types.js";
import { createInspector as createRuntimeInspector, type InternalAccessible } from "./creation.js";
import {
  detectContainerKindFromInternal,
  detectPhaseFromSnapshot,
  buildTypedSnapshotFromInternal,
} from "./internal-helpers.js";
import type { ContainerInternalState } from "./internal-state-types.js";
import { INTERNAL_ACCESS } from "./symbols.js";

// =============================================================================
// Tracer API Factory
// =============================================================================

/**
 * Creates a standalone TracingAPI instance.
 *
 * @returns A frozen TracingAPI instance
 * @internal
 */
export function createBuiltinTracerAPI(): TracingAPI {
  const collector = new MemoryCollector();
  let isPaused = false;

  const api: TracingAPI = {
    getTraces: (filter?: TraceFilter) => collector.getTraces(filter),
    getStats: (): TraceStats => collector.getStats(),
    pause: (): void => {
      isPaused = true;
    },
    resume: (): void => {
      isPaused = false;
    },
    clear: (): void => collector.clear(),
    subscribe: (callback: (entry: TraceEntry) => void) => collector.subscribe(callback),
    isPaused: (): boolean => isPaused,
    pin: (id: string): void => collector.pin?.(id),
    unpin: (id: string): void => collector.unpin?.(id),
  };

  return Object.freeze(api);
}

// =============================================================================
// Inspector API Factory
// =============================================================================

/**
 * Simple event emitter for inspector events.
 * @internal
 */
interface EventEmitter {
  readonly listeners: Set<InspectorListener>;
  emit(event: Parameters<InspectorListener>[0]): void;
  subscribe(listener: InspectorListener): () => void;
}

/**
 * Creates a simple event emitter for inspector events.
 * @internal
 */
function createEventEmitter(): EventEmitter {
  const listeners = new Set<InspectorListener>();

  return {
    listeners,
    emit(event) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch {
          // Ignore listener errors
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Determines the service origin for an adapter.
 * @internal
 */
function determineOrigin(
  portName: string,
  internalState: ContainerInternalState,
  hasParent: boolean
): ServiceOrigin {
  if (internalState.overridePorts.has(portName)) {
    return "overridden";
  }

  if (!hasParent) {
    return "own";
  }

  let isOwnAdapter = false;
  for (const [, adapter] of internalState.adapterMap) {
    if (adapter.portName === portName) {
      isOwnAdapter = true;
      break;
    }
  }

  return isOwnAdapter ? "own" : "inherited";
}

/**
 * Gets the container kind from internal state.
 * @internal
 */
function getContainerKind(internalState: ContainerInternalState): "root" | "child" | "lazy" {
  if (internalState.parentState !== undefined) {
    return "child";
  }
  return "root";
}

/**
 * Creates a full InspectorAPI instance from a container.
 *
 * Provides all inspector functionality:
 * - Pull-based queries (getSnapshot, getScopeTree, listPorts, isResolved)
 * - Push-based subscriptions (subscribe)
 * - Hierarchy traversal (getChildContainers)
 * - Graph data (getAdapterInfo, getGraphData)
 *
 * @param container - Container with INTERNAL_ACCESS symbol
 * @returns A frozen InspectorAPI instance
 *
 * @internal
 */
export function createBuiltinInspectorAPI(container: InternalAccessible): InspectorAPI {
  // Get the base runtime inspector for pull-based queries
  const runtimeInspector = createRuntimeInspector(container);

  // Get container kind for typed snapshots
  const internalState = container[INTERNAL_ACCESS]();
  const containerKind = detectContainerKindFromInternal(internalState);

  // Create event emitter for subscriptions
  const emitter = createEventEmitter();

  // Cache for child inspectors
  const childInspectorCache = new WeakMap<ContainerInternalState, InspectorAPI>();

  /**
   * Gets InspectorAPI instances for all child containers.
   */
  function getChildContainers(): readonly InspectorAPI[] {
    const internalState = container[INTERNAL_ACCESS]();
    const childInspectors: InspectorAPI[] = [];

    for (const childState of internalState.childContainers) {
      // Check cache first
      let childInspector = childInspectorCache.get(childState);

      if (childInspector === undefined && childState.wrapper !== undefined) {
        const wrapper = childState.wrapper;

        // Check if wrapper has .inspector property
        if (
          typeof wrapper === "object" &&
          wrapper !== null &&
          "inspector" in wrapper &&
          wrapper.inspector !== undefined
        ) {
          childInspector = wrapper.inspector as InspectorAPI;
        } else if (typeof wrapper === "object" && wrapper !== null && INTERNAL_ACCESS in wrapper) {
          // Create inspector from wrapper
          childInspector = createBuiltinInspectorAPI(wrapper as InternalAccessible);
        }

        if (childInspector !== undefined) {
          childInspectorCache.set(childState, childInspector);
        }
      }

      if (childInspector !== undefined) {
        childInspectors.push(childInspector);
      }
    }

    return Object.freeze(childInspectors);
  }

  /**
   * Gets adapter information for all adapters in this container.
   */
  function getAdapterInfo(): readonly AdapterInfo[] {
    const internalState = container[INTERNAL_ACCESS]();
    const adapters: AdapterInfo[] = [];

    for (const [, adapter] of internalState.adapterMap) {
      adapters.push(
        Object.freeze({
          portName: adapter.portName,
          lifetime: adapter.lifetime,
          factoryKind: adapter.factoryKind,
          dependencyNames: Object.freeze([...adapter.dependencyNames]),
        })
      );
    }

    return Object.freeze(adapters);
  }

  /**
   * Gets complete graph data for DevTools visualization.
   */
  function getGraphData(): ContainerGraphData {
    const internalState = container[INTERNAL_ACCESS]();
    const hasParent = internalState.parentState !== undefined;
    const adapters: VisualizableAdapter[] = [];

    for (const [, adapter] of internalState.adapterMap) {
      const origin = determineOrigin(adapter.portName, internalState, hasParent);

      const visualizable: VisualizableAdapter = {
        portName: adapter.portName,
        lifetime: adapter.lifetime,
        factoryKind: adapter.factoryKind,
        dependencyNames: Object.freeze([...adapter.dependencyNames]),
        origin,
        inheritanceMode:
          origin === "inherited" && internalState.inheritanceModes !== undefined
            ? (internalState.inheritanceModes.get(adapter.portName) ?? "shared")
            : undefined,
        isOverride: internalState.overridePorts.has(adapter.portName),
      };

      adapters.push(Object.freeze(visualizable));
    }

    const kind = getContainerKind(internalState);

    const graphData: ContainerGraphData = {
      adapters: Object.freeze(adapters),
      containerName: internalState.containerName,
      kind,
      parentName: internalState.parentState?.containerName ?? null,
    };

    return Object.freeze(graphData);
  }

  // Create the full InspectorAPI
  const inspector: InspectorAPI = {
    // Pull-based queries
    getSnapshot() {
      const snapshot = runtimeInspector.snapshot();
      const currentState = container[INTERNAL_ACCESS]();
      return buildTypedSnapshotFromInternal(snapshot, containerKind, currentState);
    },
    getScopeTree: () => runtimeInspector.getScopeTree(),
    listPorts: () => runtimeInspector.listPorts(),
    isResolved: (portName: string) => runtimeInspector.isResolved(portName),
    getContainerKind: () => containerKind,
    getPhase() {
      const snapshot = runtimeInspector.snapshot();
      return detectPhaseFromSnapshot(snapshot, containerKind);
    },
    get isDisposed() {
      return runtimeInspector.snapshot().isDisposed;
    },

    // Push-based subscriptions
    subscribe: (listener: InspectorListener) => emitter.subscribe(listener),

    // Hierarchy traversal
    getChildContainers,

    // Graph data
    getAdapterInfo,
    getGraphData,
  };

  return Object.freeze(inspector);
}
