/**
 * Built-in API factory for container property-based access.
 *
 * Creates InspectorAPI instances for the built-in `.inspector` container property.
 *
 * @packageDocumentation
 */

import type {
  ContainerGraphData,
  AdapterInfo,
  VisualizableAdapter,
  InspectorListener,
  InspectorEvent,
  ServiceOrigin,
  ResultStatistics,
  LibraryInspector,
  UnifiedSnapshot,
  LibraryQueryEntry,
  LibraryQueryResult,
  LibraryQueryPredicate,
} from "@hex-di/core";
import { getPortMetadata } from "@hex-di/core";
import { createLibraryRegistry } from "./library-registry.js";
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

// =============================================================================
// Result Tracker
// =============================================================================

/**
 * Mutable stats accumulator for a single port.
 * @internal
 */
interface MutablePortStats {
  okCount: number;
  errCount: number;
  errorsByCode: Map<string, number>;
  lastError?: { code: string; timestamp: number };
}

/**
 * Creates a result tracker that maintains per-port ok/err counts.
 *
 * Integrates with the event emitter: when a `result:ok` or `result:err`
 * event is emitted, the tracker automatically updates its internal state.
 *
 * @internal
 */
function createResultTracker(): {
  handleEvent(event: InspectorEvent): void;
  getStatistics(portName: string): ResultStatistics | undefined;
  getAllStatistics(): ReadonlyMap<string, ResultStatistics>;
  getHighErrorRatePorts(threshold: number): readonly ResultStatistics[];
} {
  const stats = new Map<string, MutablePortStats>();

  function getOrCreate(portName: string): MutablePortStats {
    let entry = stats.get(portName);
    if (entry === undefined) {
      entry = { okCount: 0, errCount: 0, errorsByCode: new Map() };
      stats.set(portName, entry);
    }
    return entry;
  }

  function toSnapshot(portName: string, s: MutablePortStats): ResultStatistics {
    const totalCalls = s.okCount + s.errCount;
    return Object.freeze({
      portName,
      totalCalls,
      okCount: s.okCount,
      errCount: s.errCount,
      errorRate: totalCalls > 0 ? s.errCount / totalCalls : 0,
      errorsByCode: new Map(s.errorsByCode),
      lastError: s.lastError ? Object.freeze({ ...s.lastError }) : undefined,
    });
  }

  return {
    handleEvent(event: InspectorEvent): void {
      if (event.type === "result:ok") {
        const entry = getOrCreate(event.portName);
        entry.okCount++;
      } else if (event.type === "result:err") {
        const entry = getOrCreate(event.portName);
        entry.errCount++;
        const count = entry.errorsByCode.get(event.errorCode) ?? 0;
        entry.errorsByCode.set(event.errorCode, count + 1);
        entry.lastError = { code: event.errorCode, timestamp: event.timestamp };
      }
    },

    getStatistics(portName: string): ResultStatistics | undefined {
      const entry = stats.get(portName);
      if (entry === undefined) return undefined;
      return toSnapshot(portName, entry);
    },

    getAllStatistics(): ReadonlyMap<string, ResultStatistics> {
      const result = new Map<string, ResultStatistics>();
      for (const [portName, entry] of stats) {
        result.set(portName, toSnapshot(portName, entry));
      }
      return result;
    },

    getHighErrorRatePorts(threshold: number): readonly ResultStatistics[] {
      const result: ResultStatistics[] = [];
      for (const [portName, entry] of stats) {
        const totalCalls = entry.okCount + entry.errCount;
        if (totalCalls > 0 && entry.errCount / totalCalls > threshold) {
          result.push(toSnapshot(portName, entry));
        }
      }
      return Object.freeze(result);
    },
  };
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

  // Create result tracker for result statistics
  const resultTracker = createResultTracker();

  // Create library registry for library inspectors
  const libraryRegistry = createLibraryRegistry();

  /**
   * Unified event dispatch: tracks results and notifies subscribers.
   * @internal
   */
  function emitEvent(event: InspectorEvent): void {
    resultTracker.handleEvent(event);
    emitter.emit(event);
  }

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

    for (const [port, adapter] of internalState.adapterMap) {
      const origin = determineOrigin(adapter.portName, internalState, hasParent);
      const portMeta = getPortMetadata(port);

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
        metadata: portMeta !== undefined ? Object.freeze({ ...portMeta }) : undefined,
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

    // Result statistics
    getResultStatistics: (portName: string) => resultTracker.getStatistics(portName),
    getAllResultStatistics: () => resultTracker.getAllStatistics(),
    getHighErrorRatePorts: (threshold: number) => resultTracker.getHighErrorRatePorts(threshold),

    // Library inspector registry
    registerLibrary(lib: LibraryInspector): () => void {
      return libraryRegistry.registerLibrary(lib, emitEvent);
    },
    getLibraryInspectors: () => libraryRegistry.getLibraryInspectors(),
    getLibraryInspector: (name: string) => libraryRegistry.getLibraryInspector(name),
    getUnifiedSnapshot(): UnifiedSnapshot {
      const containerSnapshot = inspector.getSnapshot();
      const libraries = libraryRegistry.getLibrarySnapshots();
      const registeredLibraries = Object.freeze(
        [...libraryRegistry.getLibraryInspectors().keys()].sort()
      );
      return Object.freeze({
        timestamp: Date.now(),
        container: containerSnapshot,
        libraries,
        registeredLibraries,
      });
    },

    // Cross-library query API
    queryLibraries: (predicate: LibraryQueryPredicate) => libraryRegistry.queryLibraries(predicate),
    queryByLibrary: (name: string, predicate?: (entry: LibraryQueryEntry) => boolean) =>
      libraryRegistry.queryByLibrary(name, predicate),
    queryByKey: (pattern: string | RegExp) => libraryRegistry.queryByKey(pattern),

    // Internal methods (for runtime and tracing)
    getContainer: () => container,
    emit: emitEvent,
    disposeLibraries: () => libraryRegistry.dispose(),
  };

  return Object.freeze(inspector);
}
