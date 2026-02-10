/**
 * FlowRegistry - Live Machine Instance Tracking
 *
 * Tracks all live machine instances created by FlowAdapters.
 * Provides subscription-based notifications for machine lifecycle events.
 *
 * @packageDocumentation
 */

import type {
  FlowRegistry,
  RegistryEntry,
  RegistryEvent,
  RegistryListener,
  Unsubscribe,
} from "./types.js";

// =============================================================================
// Registry Key Helper
// =============================================================================

/**
 * Computes a unique key for a registry entry.
 * @internal
 */
function registryKey(portName: string, instanceId: string): string {
  return `${portName}:${instanceId}`;
}

// =============================================================================
// FlowRegistry Factory
// =============================================================================

/**
 * Creates a FlowRegistry instance for tracking live machine instances.
 *
 * @returns A new FlowRegistry
 */
export function createFlowRegistry(): FlowRegistry {
  const entries = new Map<string, RegistryEntry>();
  const listeners = new Set<RegistryListener>();
  let disposed = false;

  function notifyListeners(event: RegistryEvent): void {
    // Copy listeners before notification for safe unsubscribe during callback
    const currentListeners = Array.from(listeners);
    for (const listener of currentListeners) {
      listener(event);
    }
  }

  const registry: FlowRegistry = {
    register(entry: RegistryEntry): void {
      if (disposed) return;
      const key = registryKey(entry.portName, entry.instanceId);
      entries.set(key, entry);
      notifyListeners({ type: "machine-registered", entry });
    },

    unregister(portName: string, instanceId: string): void {
      if (disposed) return;
      const key = registryKey(portName, instanceId);
      if (entries.delete(key)) {
        notifyListeners({ type: "machine-unregistered", portName, instanceId });
      }
    },

    getAllMachines(): readonly RegistryEntry[] {
      return Array.from(entries.values());
    },

    getMachine(portName: string, instanceId: string): RegistryEntry | undefined {
      return entries.get(registryKey(portName, instanceId));
    },

    getMachinesByState(state: string): readonly RegistryEntry[] {
      const result: RegistryEntry[] = [];
      for (const entry of entries.values()) {
        if (entry.state() === state) {
          result.push(entry);
        }
      }
      return result;
    },

    getAllPortNames(): readonly string[] {
      const names = new Set<string>();
      for (const entry of entries.values()) {
        names.add(entry.portName);
      }
      return Array.from(names);
    },

    getTotalMachineCount(): number {
      return entries.size;
    },

    subscribe(listener: RegistryListener): Unsubscribe {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dispose(): void {
      disposed = true;
      entries.clear();
      listeners.clear();
    },
  };

  return registry;
}
