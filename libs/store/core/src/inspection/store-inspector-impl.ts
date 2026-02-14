/**
 * StoreInspectorAPI Implementation
 *
 * Core implementation of the store introspection module.
 * Aggregates port snapshots, action history, subscriber graphs, and events.
 *
 * @packageDocumentation
 */

import type {
  StoreInspectorListener,
  StoreInspectorEvent,
  StoreSnapshot,
  PortSnapshot,
  StatePortInfo,
  PortRegistryEntry,
  StoreInspectorInternal,
  ActionHistoryEntry,
  ActionHistoryFilter,
  ActionHistoryConfig,
  StoreRegistryEntry,
} from "../types/inspection.js";
// Re-export for consumers that import from this module
export type { PortRegistryEntry, StoreInspectorInternal } from "../types/inspection.js";
import { createActionHistory } from "./action-history.js";
import type { AdapterRegistration } from "./subscriber-graph.js";
import { buildSubscriberGraph } from "./subscriber-graph.js";
import {
  __stateAdapterBrand,
  __atomAdapterBrand,
  __derivedAdapterBrand,
  __asyncDerivedAdapterBrand,
  __linkedDerivedAdapterBrand,
} from "../adapters/brands.js";
import { tryCatch } from "@hex-di/result";
import type { StoreRegistry } from "../types/inspection.js";

// =============================================================================
// Config
// =============================================================================

export interface StoreInspectorConfig {
  readonly historyConfig?: ActionHistoryConfig;
  readonly registry?: StoreRegistry;
}

const DEFAULT_HISTORY_CONFIG: ActionHistoryConfig = {
  maxEntries: 1000,
  mode: "full",
  samplingRate: 1,
};

// =============================================================================
// Port Kind Classification
// =============================================================================

type PortKind = "state" | "atom" | "derived" | "async-derived";

function classifyAdapter(adapter: object): PortKind {
  if (__stateAdapterBrand in adapter) return "state";
  if (__atomAdapterBrand in adapter) return "atom";
  if (__asyncDerivedAdapterBrand in adapter) return "async-derived";
  if (__derivedAdapterBrand in adapter) return "derived";
  if (__linkedDerivedAdapterBrand in adapter) return "derived";
  return "state";
}

// =============================================================================
// Factory
// =============================================================================

export function createStoreInspectorImpl(config?: StoreInspectorConfig): StoreInspectorInternal {
  const historyConfig = config?.historyConfig ?? DEFAULT_HISTORY_CONFIG;
  const history = createActionHistory(historyConfig);
  const singletonPorts = new Map<string, PortRegistryEntry>();
  const scopedPorts = new Map<string, Map<string, PortRegistryEntry>>();
  const listeners = new Set<StoreInspectorListener>();
  let _pendingEffects = 0;

  function emit(event: StoreInspectorEvent): void {
    for (const listener of listeners) {
      tryCatch(
        () => listener(event),
        cause => cause
      );
    }
  }

  /**
   * Iterates all port entries across singletons and scopes.
   */
  function* allEntries(): Generator<{ entry: PortRegistryEntry; scopeId?: string }> {
    for (const entry of singletonPorts.values()) {
      yield { entry };
    }
    for (const [scopeId, scopeMap] of scopedPorts) {
      for (const entry of scopeMap.values()) {
        yield { entry, scopeId };
      }
    }
  }

  function getSnapshot(): StoreSnapshot {
    const portSnapshots: PortSnapshot[] = [];
    let totalSubscribers = 0;

    for (const { entry, scopeId } of allEntries()) {
      const snapshot = entry.getSnapshot();
      if (scopeId !== undefined) {
        portSnapshots.push({ ...snapshot, scopeId });
      } else {
        portSnapshots.push(snapshot);
      }
      totalSubscribers += entry.getSubscriberCount();
    }

    return {
      timestamp: Date.now(),
      ports: portSnapshots,
      totalSubscribers,
      pendingEffects: _pendingEffects,
    };
  }

  function getPortState(portName: string): PortSnapshot | undefined {
    // Check singletons first
    const singletonEntry = singletonPorts.get(portName);
    if (singletonEntry) return singletonEntry.getSnapshot();

    // Fall back to the most recently registered scoped entry
    let latestEntry: PortRegistryEntry | undefined;
    for (const scopeMap of scopedPorts.values()) {
      const entry = scopeMap.get(portName);
      if (entry) {
        latestEntry = entry;
      }
    }
    if (latestEntry) return latestEntry.getSnapshot();

    return undefined;
  }

  function listStatePorts(): readonly StatePortInfo[] {
    const result: StatePortInfo[] = [];

    for (const { entry, scopeId } of allEntries()) {
      const info: StatePortInfo = {
        portName: entry.portName,
        kind: classifyAdapter(entry.adapter),
        lifetime: entry.lifetime,
        subscriberCount: entry.getSubscriberCount(),
        hasEffects: entry.getHasEffects(),
        ...(scopeId !== undefined ? { scopeId } : {}),
      };
      result.push(info);
    }

    return result;
  }

  function getSubscriberGraph() {
    const registrations: AdapterRegistration[] = [];

    for (const { entry } of allEntries()) {
      registrations.push({
        portName: entry.portName,
        adapter: entry.adapter,
        requires: entry.requires,
        writesTo: entry.writesTo,
        subscriberCount: entry.getSubscriberCount(),
      });
    }

    return buildSubscriberGraph(registrations);
  }

  function getActionHistory(filter?: ActionHistoryFilter): readonly ActionHistoryEntry[] {
    return history.query(filter);
  }

  function subscribe(listener: StoreInspectorListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  // Wire up registry auto-discovery if provided
  if (config?.registry) {
    const registry = config.registry;
    // Populate from existing entries
    for (const regEntry of registry.getAll()) {
      const portEntry = registryEntryToPortEntry(regEntry);
      singletonPorts.set(portEntry.portName, portEntry);
    }
    // Subscribe for future changes
    registry.subscribe(event => {
      if (event.type === "port-registered") {
        const portEntry = registryEntryToPortEntry(event.entry);
        singletonPorts.set(portEntry.portName, portEntry);
      } else if (event.type === "port-unregistered") {
        singletonPorts.delete(event.portName);
      } else if (event.type === "scoped-port-registered") {
        const portEntry = registryEntryToPortEntry(event.entry);
        let scopeMap = scopedPorts.get(event.scopeId);
        if (!scopeMap) {
          scopeMap = new Map<string, PortRegistryEntry>();
          scopedPorts.set(event.scopeId, scopeMap);
        }
        scopeMap.set(portEntry.portName, portEntry);
      } else if (event.type === "scope-unregistered") {
        scopedPorts.delete(event.scopeId);
      }
    });
  }

  return {
    getSnapshot,
    getPortState,
    listStatePorts,
    getSubscriberGraph,
    getActionHistory,
    subscribe,

    registerPort(entry: PortRegistryEntry): void {
      singletonPorts.set(entry.portName, entry);
    },

    unregisterPort(portName: string): void {
      singletonPorts.delete(portName);
    },

    registerScopedPort(scopeId: string, entry: PortRegistryEntry): void {
      let scopeMap = scopedPorts.get(scopeId);
      if (!scopeMap) {
        scopeMap = new Map<string, PortRegistryEntry>();
        scopedPorts.set(scopeId, scopeMap);
      }
      scopeMap.set(entry.portName, entry);
    },

    unregisterScope(scopeId: string): void {
      scopedPorts.delete(scopeId);
    },

    recordAction(entry: ActionHistoryEntry): void {
      const recorded = history.record(entry);
      if (recorded) {
        emit({ type: "action-dispatched", entry });
      }
    },

    emit,

    get actionHistory() {
      return history;
    },

    incrementPendingEffects(): void {
      _pendingEffects++;
    },

    decrementPendingEffects(): void {
      if (_pendingEffects > 0) {
        _pendingEffects--;
      }
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Converts a StoreRegistryEntry to a PortRegistryEntry.
 * Both types share the same shape (PortSnapshot return type for getSnapshot).
 * @internal
 */
function registryEntryToPortEntry(regEntry: StoreRegistryEntry): PortRegistryEntry {
  return {
    portName: regEntry.portName,
    adapter: regEntry.adapter,
    lifetime: regEntry.lifetime,
    requires: regEntry.requires,
    writesTo: regEntry.writesTo,
    getSnapshot: regEntry.getSnapshot,
    getSubscriberCount: regEntry.getSubscriberCount,
    getHasEffects: regEntry.getHasEffects,
  };
}
