/**
 * SagaRegistry - Live Saga Execution Tracking
 *
 * Tracks all live saga executions created by SagaAdapters.
 * Provides subscription-based notifications for execution lifecycle events.
 *
 * @packageDocumentation
 */

import type {
  SagaRegistry,
  SagaRegistryEntry,
  SagaRegistryEvent,
  SagaRegistryListener,
} from "./types.js";
import type { Unsubscribe } from "../runtime/types.js";

// =============================================================================
// SagaRegistry Factory
// =============================================================================

/**
 * Creates a SagaRegistry instance for tracking live saga executions.
 *
 * @returns A new SagaRegistry
 */
export function createSagaRegistry(): SagaRegistry {
  const entries = new Map<string, SagaRegistryEntry>();
  const listeners = new Set<SagaRegistryListener>();
  let disposed = false;

  function notifyListeners(event: SagaRegistryEvent): void {
    // Copy listeners before notification for safe unsubscribe during callback
    const currentListeners = Array.from(listeners);
    for (const listener of currentListeners) {
      listener(event);
    }
  }

  const registry: SagaRegistry = {
    register(entry: SagaRegistryEntry): void {
      if (disposed) return;
      entries.set(entry.executionId, entry);
      notifyListeners({ type: "execution-registered", entry });
    },

    unregister(executionId: string): void {
      if (disposed) return;
      if (entries.delete(executionId)) {
        notifyListeners({ type: "execution-unregistered", executionId });
      }
    },

    getAllExecutions(): readonly SagaRegistryEntry[] {
      return Array.from(entries.values());
    },

    getExecution(executionId: string): SagaRegistryEntry | undefined {
      return entries.get(executionId);
    },

    getExecutionsBySaga(sagaName: string): readonly SagaRegistryEntry[] {
      const result: SagaRegistryEntry[] = [];
      for (const entry of entries.values()) {
        if (entry.sagaName === sagaName) {
          result.push(entry);
        }
      }
      return result;
    },

    getExecutionsByStatus(status: string): readonly SagaRegistryEntry[] {
      const result: SagaRegistryEntry[] = [];
      for (const entry of entries.values()) {
        if (entry.status() === status) {
          result.push(entry);
        }
      }
      return result;
    },

    subscribe(listener: SagaRegistryListener): Unsubscribe {
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
