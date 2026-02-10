/**
 * StoreRegistry - Store Port Instance Tracking
 *
 * Tracks all registered store port adapters (state, atom, derived, etc.).
 * Provides subscription-based notifications for port lifecycle events.
 *
 * @packageDocumentation
 */

import type { PortSnapshot } from "../types/inspection.js";

// =============================================================================
// StoreRegistryEntry
// =============================================================================

/**
 * Entry representing a registered store port in the registry.
 */
export interface StoreRegistryEntry {
  readonly portName: string;
  readonly adapter: object;
  readonly lifetime: "singleton" | "scoped";
  readonly requires: readonly string[];
  readonly writesTo: readonly string[];
  getSnapshot: () => PortSnapshot;
  getSubscriberCount: () => number;
  getHasEffects: () => boolean;
}

// =============================================================================
// StoreRegistryEvent
// =============================================================================

/**
 * Event emitted by the StoreRegistry when ports are registered/unregistered.
 */
export type StoreRegistryEvent =
  | { readonly type: "port-registered"; readonly entry: StoreRegistryEntry }
  | { readonly type: "port-unregistered"; readonly portName: string }
  | {
      readonly type: "scoped-port-registered";
      readonly scopeId: string;
      readonly entry: StoreRegistryEntry;
    }
  | { readonly type: "scope-unregistered"; readonly scopeId: string };

/**
 * Listener callback for registry events.
 */
export type StoreRegistryListener = (event: StoreRegistryEvent) => void;

/**
 * Function to unsubscribe from notifications.
 */
export type Unsubscribe = () => void;

// =============================================================================
// StoreRegistry Interface
// =============================================================================

/**
 * Registry for tracking store port instances.
 */
export interface StoreRegistry {
  /** Register a singleton port entry. */
  register(entry: StoreRegistryEntry): void;

  /** Unregister a singleton port by name. */
  unregister(portName: string): void;

  /** Register a scoped port entry under a scope ID. */
  registerScoped(scopeId: string, entry: StoreRegistryEntry): void;

  /** Remove all port entries for a given scope ID. */
  unregisterScope(scopeId: string): void;

  /** Get all singleton entries. */
  getAll(): readonly StoreRegistryEntry[];

  /** Get all scoped entries for a given scope ID. */
  getAllScoped(scopeId: string): readonly StoreRegistryEntry[];

  /** Get a singleton entry by port name. */
  get(portName: string): StoreRegistryEntry | undefined;

  /** Subscribe to registry events. */
  subscribe(listener: StoreRegistryListener): Unsubscribe;

  /** Dispose the registry, clearing all entries and listeners. */
  dispose(): void;
}

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
