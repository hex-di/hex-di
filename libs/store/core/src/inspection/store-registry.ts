/**
 * StoreRegistry - Store Port Instance Tracking
 *
 * Tracks all registered store port adapters (state, atom, derived, etc.).
 * Provides subscription-based notifications for port lifecycle events.
 *
 * @packageDocumentation
 */

import type {
  StoreRegistry,
  StoreRegistryEntry,
  StoreRegistryEvent,
  StoreRegistryListener,
  Unsubscribe,
} from "../types/inspection.js";

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a StoreRegistry instance for tracking store port adapters.
 *
 * @returns A new StoreRegistry
 */
export function createStoreRegistry(): StoreRegistry {
  const entries = new Map<string, StoreRegistryEntry>();
  const scopedEntries = new Map<string, Map<string, StoreRegistryEntry>>();
  const listeners = new Set<StoreRegistryListener>();
  let disposed = false;

  function notifyListeners(event: StoreRegistryEvent): void {
    const currentListeners = Array.from(listeners);
    for (const listener of currentListeners) {
      listener(event);
    }
  }

  const registry: StoreRegistry = {
    register(entry: StoreRegistryEntry): void {
      if (disposed) return;
      entries.set(entry.portName, entry);
      notifyListeners({ type: "port-registered", entry });
    },

    unregister(portName: string): void {
      if (disposed) return;
      if (entries.delete(portName)) {
        notifyListeners({ type: "port-unregistered", portName });
      }
    },

    registerScoped(scopeId: string, entry: StoreRegistryEntry): void {
      if (disposed) return;
      let scopeMap = scopedEntries.get(scopeId);
      if (!scopeMap) {
        scopeMap = new Map<string, StoreRegistryEntry>();
        scopedEntries.set(scopeId, scopeMap);
      }
      scopeMap.set(entry.portName, entry);
      notifyListeners({ type: "scoped-port-registered", scopeId, entry });
    },

    unregisterScope(scopeId: string): void {
      if (disposed) return;
      if (scopedEntries.delete(scopeId)) {
        notifyListeners({ type: "scope-unregistered", scopeId });
      }
    },

    getAll(): readonly StoreRegistryEntry[] {
      return Array.from(entries.values());
    },

    getAllScoped(scopeId: string): readonly StoreRegistryEntry[] {
      const scopeMap = scopedEntries.get(scopeId);
      if (!scopeMap) return [];
      return Array.from(scopeMap.values());
    },

    get(portName: string): StoreRegistryEntry | undefined {
      return entries.get(portName);
    },

    subscribe(listener: StoreRegistryListener): Unsubscribe {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dispose(): void {
      disposed = true;
      entries.clear();
      scopedEntries.clear();
      listeners.clear();
    },
  };

  return registry;
}
