/**
 * FlowInspector - Read-Only Query API
 *
 * Aggregates data from FlowRegistry and FlowCollector to provide
 * a unified query API for machine state, history, health events,
 * and effect statistics.
 *
 * @packageDocumentation
 */

import type { MachineSnapshot, PendingEvent } from "../runner/types.js";
import type { FlowTransitionEventAny } from "../tracing/types.js";
import type { ActivityInstance } from "../activities/types.js";
import { CircularBuffer } from "./circular-buffer.js";
import type {
  FlowInspector,
  FlowInspectorConfig,
  HealthEvent,
  EffectResultRecord,
  Unsubscribe,
} from "./types.js";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_HEALTH_BUFFER_SIZE = 100;
const DEFAULT_EFFECT_BUFFER_SIZE = 1000;
const DEFAULT_CACHE_TTL_MS = 5000;

// =============================================================================
// FlowInspector Factory
// =============================================================================

/**
 * Creates a FlowInspector instance for querying machine state and history.
 *
 * @param config - Inspector configuration with registry and collector
 * @returns A new FlowInspector
 */
export function createFlowInspector(config: FlowInspectorConfig): FlowInspector {
  const { registry, collector } = config;
  const healthBufferSize = config.healthBufferSize ?? DEFAULT_HEALTH_BUFFER_SIZE;
  const effectBufferSize = config.effectBufferSize ?? DEFAULT_EFFECT_BUFFER_SIZE;
  const cacheTtlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

  const healthBuffer = new CircularBuffer<HealthEvent>(healthBufferSize);
  const effectBuffer = new CircularBuffer<EffectResultRecord>(effectBufferSize);
  const stateHistories = new Map<string, string[]>();
  const listeners = new Set<() => void>();

  function notifyListeners(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  // TTL cache for getAllMachinesSnapshot
  let snapshotCache:
    | { data: readonly MachineSnapshot<string, unknown>[]; expiresAt: number }
    | undefined;

  // Subscribe to collector for state history tracking
  const unsubscribeCollector: Unsubscribe = collector.subscribe((event: FlowTransitionEventAny) => {
    const key = event.machineId;
    let history = stateHistories.get(key);
    if (history === undefined) {
      history = [event.prevState];
      stateHistories.set(key, history);
    }
    history.push(event.nextState);
    notifyListeners();
  });

  // Subscribe to registry for cache invalidation on register/unregister
  const unsubscribeRegistry: Unsubscribe = registry.subscribe(() => {
    snapshotCache = undefined;
  });

  let disposed = false;

  const inspector: FlowInspector = {
    getMachineState(
      portName: string,
      instanceId: string
    ): MachineSnapshot<string, unknown> | undefined {
      const entry = registry.getMachine(portName, instanceId);
      if (entry === undefined) return undefined;
      return entry.snapshot();
    },

    getValidTransitions(portName: string, instanceId: string): readonly string[] {
      const entry = registry.getMachine(portName, instanceId);
      if (entry === undefined) return [];
      return entry.validEvents();
    },

    getRunningActivities(portName: string, instanceId: string): readonly ActivityInstance[] {
      const entry = registry.getMachine(portName, instanceId);
      if (entry === undefined) return [];
      const snap = entry.snapshot();
      return snap.activities.filter(a => a.status === "running");
    },

    getEventHistory(options?: {
      limit?: number;
      since?: number;
    }): readonly FlowTransitionEventAny[] {
      let transitions = collector.getTransitions();

      if (options?.since !== undefined) {
        const since = options.since;
        transitions = transitions.filter(t => t.timestamp >= since);
      }

      if (options?.limit !== undefined && options.limit < transitions.length) {
        transitions = transitions.slice(transitions.length - options.limit);
      }

      return transitions;
    },

    getStateHistory(portName: string, instanceId: string): readonly string[] {
      const entry = registry.getMachine(portName, instanceId);
      if (entry === undefined) return [];
      return stateHistories.get(entry.machineId) ?? [];
    },

    getEffectHistory(options?: { limit?: number }): readonly EffectResultRecord[] {
      const all = effectBuffer.toArray();
      if (options?.limit !== undefined && options.limit < all.length) {
        return all.slice(all.length - options.limit);
      }
      return all;
    },

    getAllMachinesSnapshot(): readonly MachineSnapshot<string, unknown>[] {
      const now = Date.now();
      if (snapshotCache !== undefined && now < snapshotCache.expiresAt) {
        return snapshotCache.data;
      }

      const machines = registry.getAllMachines();
      const snapshots = machines.map(entry => entry.snapshot());
      snapshotCache = { data: snapshots, expiresAt: now + cacheTtlMs };
      return snapshots;
    },

    getHealthEvents(options?: { limit?: number }): readonly HealthEvent[] {
      const all = healthBuffer.toArray();
      if (options?.limit !== undefined && options.limit < all.length) {
        return all.slice(all.length - options.limit);
      }
      return all;
    },

    getEffectResultStatistics(): ReadonlyMap<string, { ok: number; err: number }> {
      const stats = new Map<string, { ok: number; err: number }>();
      for (const record of effectBuffer.toArray()) {
        const key = `${record.portName}.${record.method}`;
        let entry = stats.get(key);
        if (entry === undefined) {
          entry = { ok: 0, err: 0 };
          stats.set(key, entry);
        }
        if (record.ok) {
          entry.ok++;
        } else {
          entry.err++;
        }
      }
      return stats;
    },

    getHighErrorRatePorts(threshold: number): readonly string[] {
      const stats = inspector.getEffectResultStatistics();
      const result: string[] = [];
      for (const [key, value] of stats) {
        const total = value.ok + value.err;
        if (total > 0 && value.err / total >= threshold) {
          result.push(key);
        }
      }
      return result;
    },

    getPendingEvents(options?: {
      portName?: string;
      instanceId?: string;
    }): readonly PendingEvent[] {
      if (options?.portName !== undefined && options.instanceId !== undefined) {
        const entry = registry.getMachine(options.portName, options.instanceId);
        if (entry === undefined) return [];
        return entry.snapshot().pendingEvents;
      }

      const machines =
        options?.portName !== undefined
          ? registry.getAllMachines().filter(m => m.portName === options.portName)
          : registry.getAllMachines();

      const result: PendingEvent[] = [];
      for (const machine of machines) {
        const snap = machine.snapshot();
        for (const pe of snap.pendingEvents) {
          result.push(pe);
        }
      }
      return result;
    },

    recordEffectResult(record: EffectResultRecord): void {
      if (disposed) return;
      effectBuffer.push(record);
      notifyListeners();
    },

    recordHealthEvent(event: HealthEvent): void {
      if (disposed) return;
      healthBuffer.push(event);
      notifyListeners();
    },

    subscribe(callback: () => void): Unsubscribe {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },

    dispose(): void {
      disposed = true;
      unsubscribeCollector();
      unsubscribeRegistry();
      healthBuffer.clear();
      effectBuffer.clear();
      stateHistories.clear();
      listeners.clear();
      snapshotCache = undefined;
    },
  };

  return inspector;
}
