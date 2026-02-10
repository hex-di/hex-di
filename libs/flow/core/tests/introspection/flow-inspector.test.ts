/**
 * FlowInspector Tests
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createFlowInspector } from "../../src/introspection/flow-inspector.js";
import { createFlowRegistry } from "../../src/introspection/flow-registry.js";
import type {
  FlowInspector,
  FlowRegistry,
  RegistryEntry,
  HealthEvent,
  EffectResultRecord,
} from "../../src/introspection/types.js";
import type { FlowTransitionEventAny } from "../../src/tracing/types.js";

// =============================================================================
// Helpers
// =============================================================================

function createMockEntry(overrides: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    portName: "TestPort",
    instanceId: "inst-1",
    machineId: "test-machine",
    state: () => "idle",
    snapshot: () => ({
      state: "idle",
      context: {},
      activities: [],
      pendingEvents: [],
      stateValue: "idle",
      matches: () => false,
      can: () => false,
    }),
    createdAt: Date.now(),
    validEvents: () => ["START", "STOP"],
    ...overrides,
  };
}

function createMockCollector() {
  const transitions: FlowTransitionEventAny[] = [];
  const subscribers: Array<(event: FlowTransitionEventAny) => void> = [];

  return {
    getTransitions(filter?: { machineId?: string }) {
      if (filter?.machineId !== undefined) {
        return transitions.filter(t => t.machineId === filter.machineId);
      }
      return [...transitions];
    },
    subscribe(callback: (event: FlowTransitionEventAny) => void) {
      subscribers.push(callback);
      return () => {
        const idx = subscribers.indexOf(callback);
        if (idx >= 0) subscribers.splice(idx, 1);
      };
    },
    // Test helper: add a transition and notify subscribers
    addTransition(t: FlowTransitionEventAny) {
      transitions.push(t);
      for (const sub of subscribers) {
        sub(t);
      }
    },
  };
}

function makeTransition(overrides: Partial<FlowTransitionEventAny> = {}): FlowTransitionEventAny {
  return {
    id: `t-${Math.random()}`,
    machineId: "test-machine",
    prevState: "idle",
    event: { type: "START" },
    nextState: "active",
    effects: [],
    timestamp: Date.now(),
    duration: 1,
    isPinned: false,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("FlowInspector", () => {
  let registry: FlowRegistry;
  let collector: ReturnType<typeof createMockCollector>;
  let inspector: FlowInspector;

  beforeEach(() => {
    registry = createFlowRegistry();
    collector = createMockCollector();
    inspector = createFlowInspector({
      registry,
      collector,
      cacheTtlMs: 100,
    });
  });

  // ---------------------------------------------------------------------------
  // Core query methods
  // ---------------------------------------------------------------------------

  it("getMachineState() returns snapshot from registry", () => {
    const entry = createMockEntry({
      snapshot: () => ({
        state: "loading",
        context: { data: 42 },
        activities: [],
        pendingEvents: [],
        stateValue: "loading",
        matches: () => false,
        can: () => false,
      }),
    });
    registry.register(entry);

    const snap = inspector.getMachineState("TestPort", "inst-1");
    expect(snap).toBeDefined();
    expect(snap?.state).toBe("loading");
  });

  it("getMachineState() returns undefined for missing machine", () => {
    const snap = inspector.getMachineState("NonExistent", "nope");
    expect(snap).toBeUndefined();
  });

  it("getValidTransitions() returns event names from current state", () => {
    registry.register(createMockEntry({ validEvents: () => ["FETCH", "CANCEL"] }));

    const events = inspector.getValidTransitions("TestPort", "inst-1");
    expect(events).toEqual(["FETCH", "CANCEL"]);
  });

  it("getRunningActivities() returns activities from snapshot", () => {
    const entry = createMockEntry({
      snapshot: () => ({
        state: "active",
        context: {},
        activities: [
          { id: "a1", status: "running", startTime: 100, endTime: undefined },
          { id: "a2", status: "completed", startTime: 100, endTime: 200 },
          { id: "a3", status: "running", startTime: 150, endTime: undefined },
        ],
        pendingEvents: [],
        stateValue: "active",
        matches: () => false,
        can: () => false,
      }),
    });
    registry.register(entry);

    const running = inspector.getRunningActivities("TestPort", "inst-1");
    expect(running).toHaveLength(2);
    expect(running.map(a => a.id)).toEqual(["a1", "a3"]);
  });

  it("getEventHistory() returns transitions from collector", () => {
    collector.addTransition(makeTransition({ id: "t1" }));
    collector.addTransition(makeTransition({ id: "t2" }));

    const history = inspector.getEventHistory();
    expect(history).toHaveLength(2);
  });

  it("getEventHistory() with limit returns at most N items", () => {
    collector.addTransition(makeTransition({ id: "t1" }));
    collector.addTransition(makeTransition({ id: "t2" }));
    collector.addTransition(makeTransition({ id: "t3" }));

    const history = inspector.getEventHistory({ limit: 2 });
    expect(history).toHaveLength(2);
    // Returns the last 2 (most recent)
    expect(history[0]?.id).toBe("t2");
    expect(history[1]?.id).toBe("t3");
  });

  it("getEventHistory() with since filters by timestamp", () => {
    collector.addTransition(makeTransition({ id: "t1", timestamp: 1000 }));
    collector.addTransition(makeTransition({ id: "t2", timestamp: 2000 }));
    collector.addTransition(makeTransition({ id: "t3", timestamp: 3000 }));

    const history = inspector.getEventHistory({ since: 2000 });
    expect(history).toHaveLength(2);
    expect(history[0]?.id).toBe("t2");
    expect(history[1]?.id).toBe("t3");
  });

  it("getStateHistory() returns ordered state path", () => {
    registry.register(createMockEntry({ machineId: "m1" }));

    // Simulate transitions via collector subscription
    collector.addTransition(
      makeTransition({ machineId: "m1", prevState: "idle", nextState: "loading" })
    );
    collector.addTransition(
      makeTransition({ machineId: "m1", prevState: "loading", nextState: "success" })
    );

    const history = inspector.getStateHistory("TestPort", "inst-1");
    expect(history).toEqual(["idle", "loading", "success"]);
  });

  it("getEffectHistory() returns records from buffer", () => {
    const record: EffectResultRecord = {
      portName: "UserPort",
      method: "getUser",
      ok: true,
      timestamp: Date.now(),
      duration: 50,
    };
    inspector.recordEffectResult(record);

    const history = inspector.getEffectHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.portName).toBe("UserPort");
  });

  it("getAllMachinesSnapshot() returns all snapshots", () => {
    registry.register(createMockEntry({ portName: "A", instanceId: "1" }));
    registry.register(createMockEntry({ portName: "B", instanceId: "2" }));

    const snapshots = inspector.getAllMachinesSnapshot();
    expect(snapshots).toHaveLength(2);
  });

  it("getAllMachinesSnapshot() caches with TTL", () => {
    const snapshotFn = vi.fn(() => ({
      state: "idle",
      context: {},
      activities: [],
      pendingEvents: [],
      stateValue: "idle",
      matches: () => false,
      can: () => false,
    }));

    registry.register(createMockEntry({ snapshot: snapshotFn }));

    // First call: creates cache
    inspector.getAllMachinesSnapshot();
    expect(snapshotFn).toHaveBeenCalledTimes(1);

    // Second call: uses cache
    inspector.getAllMachinesSnapshot();
    expect(snapshotFn).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Cache invalidation on registry events
  // ---------------------------------------------------------------------------

  it("cache is invalidated when a machine registers", () => {
    const snapshotFn = vi.fn(() => ({
      state: "idle",
      context: {},
      activities: [],
      pendingEvents: [],
      stateValue: "idle",
      matches: () => false,
      can: () => false,
    }));

    registry.register(createMockEntry({ portName: "A", instanceId: "1", snapshot: snapshotFn }));

    // First call creates cache
    inspector.getAllMachinesSnapshot();
    expect(snapshotFn).toHaveBeenCalledTimes(1);

    // Register a new machine — should invalidate cache
    registry.register(createMockEntry({ portName: "B", instanceId: "2", snapshot: snapshotFn }));

    // Next call should recompute (cache invalidated)
    inspector.getAllMachinesSnapshot();
    // snapshotFn called for each machine in the fresh computation
    expect(snapshotFn.mock.calls.length).toBeGreaterThan(1);
  });

  it("cache is invalidated when a machine unregisters", () => {
    const snapshotFn = vi.fn(() => ({
      state: "idle",
      context: {},
      activities: [],
      pendingEvents: [],
      stateValue: "idle",
      matches: () => false,
      can: () => false,
    }));

    registry.register(createMockEntry({ portName: "A", instanceId: "1", snapshot: snapshotFn }));
    registry.register(createMockEntry({ portName: "B", instanceId: "2", snapshot: snapshotFn }));

    // First call creates cache (2 machines)
    const snap1 = inspector.getAllMachinesSnapshot();
    expect(snap1).toHaveLength(2);

    // Unregister — should invalidate cache
    registry.unregister("A", "1");

    // Next call should recompute and reflect removal
    const snap2 = inspector.getAllMachinesSnapshot();
    expect(snap2).toHaveLength(1);
  });

  it("stale cache is not served after invalidation", () => {
    const snapshotFn = vi.fn(() => ({
      state: "idle",
      context: {},
      activities: [],
      pendingEvents: [],
      stateValue: "idle",
      matches: () => false,
      can: () => false,
    }));

    registry.register(createMockEntry({ portName: "X", instanceId: "1", snapshot: snapshotFn }));

    // Build cache
    inspector.getAllMachinesSnapshot();
    const callsAfterFirst = snapshotFn.mock.calls.length;

    // Trigger invalidation via register
    registry.register(createMockEntry({ portName: "Y", instanceId: "2", snapshot: snapshotFn }));

    // Must recompute
    inspector.getAllMachinesSnapshot();
    expect(snapshotFn.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  // ---------------------------------------------------------------------------
  // Health events
  // ---------------------------------------------------------------------------

  it("getHealthEvents() returns from circular buffer with limit", () => {
    const event1: HealthEvent = {
      type: "flow-error",
      machineId: "m1",
      state: "error",
      timestamp: 1000,
    };
    const event2: HealthEvent = {
      type: "flow-recovered",
      machineId: "m1",
      fromState: "error",
      timestamp: 2000,
    };
    const event3: HealthEvent = {
      type: "flow-degraded",
      machineId: "m1",
      failureCount: 3,
      timestamp: 3000,
    };

    inspector.recordHealthEvent(event1);
    inspector.recordHealthEvent(event2);
    inspector.recordHealthEvent(event3);

    const all = inspector.getHealthEvents();
    expect(all).toHaveLength(3);

    const limited = inspector.getHealthEvents({ limit: 2 });
    expect(limited).toHaveLength(2);
  });

  it("'flow-error' event can be recorded and retrieved", () => {
    const event: HealthEvent = {
      type: "flow-error",
      machineId: "m1",
      state: "error_state",
      timestamp: Date.now(),
    };
    inspector.recordHealthEvent(event);

    const events = inspector.getHealthEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("flow-error");
    if (events[0]?.type === "flow-error") {
      expect(events[0].state).toBe("error_state");
    }
  });

  it("'flow-degraded' event can be recorded and retrieved", () => {
    const event: HealthEvent = {
      type: "flow-degraded",
      machineId: "m1",
      failureCount: 5,
      timestamp: Date.now(),
    };
    inspector.recordHealthEvent(event);

    const events = inspector.getHealthEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("flow-degraded");
    if (events[0]?.type === "flow-degraded") {
      expect(events[0].failureCount).toBe(5);
    }
  });

  it("'flow-recovered' event can be recorded and retrieved", () => {
    const event: HealthEvent = {
      type: "flow-recovered",
      machineId: "m1",
      fromState: "error",
      timestamp: Date.now(),
    };
    inspector.recordHealthEvent(event);

    const events = inspector.getHealthEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("flow-recovered");
    if (events[0]?.type === "flow-recovered") {
      expect(events[0].fromState).toBe("error");
    }
  });

  // ---------------------------------------------------------------------------
  // getPendingEvents
  // ---------------------------------------------------------------------------

  it("getPendingEvents() returns empty when no machines are registered", () => {
    const events = inspector.getPendingEvents();
    expect(events).toEqual([]);
  });

  it("getPendingEvents() returns events for a specific machine", () => {
    const pendingEvents = [{ type: "RETRY", source: "external" as const, enqueuedAt: 1000 }];
    const entry = createMockEntry({
      snapshot: () => ({
        state: "loading",
        context: {},
        activities: [],
        pendingEvents,
        stateValue: "loading",
        matches: () => false,
        can: () => false,
      }),
    });
    registry.register(entry);

    const events = inspector.getPendingEvents({ portName: "TestPort", instanceId: "inst-1" });
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("RETRY");
  });

  it("getPendingEvents() filters by portName across all instances", () => {
    const pendingA = [{ type: "A_EVENT", source: "external" as const, enqueuedAt: 1000 }];
    const pendingB = [{ type: "B_EVENT", source: "emit" as const, enqueuedAt: 2000 }];

    registry.register(
      createMockEntry({
        portName: "PortA",
        instanceId: "a-1",
        snapshot: () => ({
          state: "idle",
          context: {},
          activities: [],
          pendingEvents: pendingA,
          stateValue: "idle",
          matches: () => false,
          can: () => false,
        }),
      })
    );
    registry.register(
      createMockEntry({
        portName: "PortB",
        instanceId: "b-1",
        snapshot: () => ({
          state: "idle",
          context: {},
          activities: [],
          pendingEvents: pendingB,
          stateValue: "idle",
          matches: () => false,
          can: () => false,
        }),
      })
    );

    const events = inspector.getPendingEvents({ portName: "PortA" });
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("A_EVENT");
  });

  it("getPendingEvents() aggregates across all machines when no filter", () => {
    registry.register(
      createMockEntry({
        portName: "P1",
        instanceId: "i1",
        snapshot: () => ({
          state: "idle",
          context: {},
          activities: [],
          pendingEvents: [{ type: "E1", source: "external" as const, enqueuedAt: 1 }],
          stateValue: "idle",
          matches: () => false,
          can: () => false,
        }),
      })
    );
    registry.register(
      createMockEntry({
        portName: "P2",
        instanceId: "i2",
        snapshot: () => ({
          state: "idle",
          context: {},
          activities: [],
          pendingEvents: [
            { type: "E2", source: "emit" as const, enqueuedAt: 2 },
            { type: "E3", source: "delay" as const, enqueuedAt: 3 },
          ],
          stateValue: "idle",
          matches: () => false,
          can: () => false,
        }),
      })
    );

    const events = inspector.getPendingEvents();
    expect(events).toHaveLength(3);
    expect(events.map(e => e.type)).toEqual(["E1", "E2", "E3"]);
  });

  // ---------------------------------------------------------------------------
  // Effect statistics
  // ---------------------------------------------------------------------------

  it("getEffectResultStatistics() aggregates ok/err per port", () => {
    inspector.recordEffectResult({
      portName: "Api",
      method: "get",
      ok: true,
      timestamp: 1,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Api",
      method: "get",
      ok: true,
      timestamp: 2,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Api",
      method: "get",
      ok: false,
      timestamp: 3,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Db",
      method: "save",
      ok: true,
      timestamp: 4,
      duration: 10,
    });

    const stats = inspector.getEffectResultStatistics();
    expect(stats.get("Api.get")).toEqual({ ok: 2, err: 1 });
    expect(stats.get("Db.save")).toEqual({ ok: 1, err: 0 });
  });

  it("getHighErrorRatePorts() filters by threshold", () => {
    // Api.get: 1 ok, 4 err = 80% error rate
    inspector.recordEffectResult({
      portName: "Api",
      method: "get",
      ok: true,
      timestamp: 1,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Api",
      method: "get",
      ok: false,
      timestamp: 2,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Api",
      method: "get",
      ok: false,
      timestamp: 3,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Api",
      method: "get",
      ok: false,
      timestamp: 4,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Api",
      method: "get",
      ok: false,
      timestamp: 5,
      duration: 10,
    });

    // Db.save: 4 ok, 1 err = 20% error rate
    inspector.recordEffectResult({
      portName: "Db",
      method: "save",
      ok: true,
      timestamp: 6,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Db",
      method: "save",
      ok: true,
      timestamp: 7,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Db",
      method: "save",
      ok: true,
      timestamp: 8,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Db",
      method: "save",
      ok: true,
      timestamp: 9,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Db",
      method: "save",
      ok: false,
      timestamp: 10,
      duration: 10,
    });

    const highError = inspector.getHighErrorRatePorts(0.5);
    expect(highError).toEqual(["Api.get"]);
  });

  // ---------------------------------------------------------------------------
  // Dispose
  // ---------------------------------------------------------------------------

  it("dispose() clears all internal state", () => {
    registry.register(createMockEntry());
    collector.addTransition(makeTransition());
    inspector.recordEffectResult({
      portName: "Api",
      method: "get",
      ok: true,
      timestamp: 1,
      duration: 10,
    });
    inspector.recordHealthEvent({
      type: "flow-error",
      machineId: "m1",
      state: "err",
      timestamp: 1,
    });

    inspector.dispose();

    expect(inspector.getEffectHistory()).toHaveLength(0);
    expect(inspector.getHealthEvents()).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Disposed guard tests
  // ---------------------------------------------------------------------------

  it("recordEffectResult after dispose is a no-op", () => {
    inspector.dispose();

    inspector.recordEffectResult({
      portName: "Api",
      method: "get",
      ok: true,
      timestamp: 1,
      duration: 10,
    });
    expect(inspector.getEffectHistory()).toHaveLength(0);
  });

  it("recordHealthEvent after dispose is a no-op", () => {
    inspector.dispose();

    inspector.recordHealthEvent({
      type: "flow-error",
      machineId: "m1",
      state: "err",
      timestamp: 1,
    });
    expect(inspector.getHealthEvents()).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Boundary / edge-case tests
  // ---------------------------------------------------------------------------

  it("getValidTransitions() returns empty for missing machine", () => {
    const events = inspector.getValidTransitions("NonExistent", "nope");
    expect(events).toEqual([]);
  });

  it("getRunningActivities() returns empty for missing machine", () => {
    const activities = inspector.getRunningActivities("NonExistent", "nope");
    expect(activities).toEqual([]);
  });

  it("getEventHistory() with limit equal to array length returns all", () => {
    collector.addTransition(makeTransition({ id: "t1" }));
    collector.addTransition(makeTransition({ id: "t2" }));

    const history = inspector.getEventHistory({ limit: 2 });
    expect(history).toHaveLength(2);
  });

  it("getEventHistory() with limit greater than array length returns all", () => {
    collector.addTransition(makeTransition({ id: "t1" }));

    const history = inspector.getEventHistory({ limit: 100 });
    expect(history).toHaveLength(1);
  });

  it("getHealthEvents() with limit equal to array length returns all", () => {
    inspector.recordHealthEvent({
      type: "flow-error",
      machineId: "m1",
      state: "err",
      timestamp: 1,
    });
    inspector.recordHealthEvent({
      type: "flow-recovered",
      machineId: "m1",
      fromState: "err",
      timestamp: 2,
    });

    const events = inspector.getHealthEvents({ limit: 2 });
    expect(events).toHaveLength(2);
  });

  it("getEffectHistory() with limit returns most recent records", () => {
    inspector.recordEffectResult({
      portName: "A",
      method: "x",
      ok: true,
      timestamp: 1,
      duration: 1,
    });
    inspector.recordEffectResult({
      portName: "B",
      method: "y",
      ok: false,
      timestamp: 2,
      duration: 2,
    });
    inspector.recordEffectResult({
      portName: "C",
      method: "z",
      ok: true,
      timestamp: 3,
      duration: 3,
    });

    const limited = inspector.getEffectHistory({ limit: 2 });
    expect(limited).toHaveLength(2);
    expect(limited[0]?.portName).toBe("B");
    expect(limited[1]?.portName).toBe("C");
  });

  it("getAllMachinesSnapshot() TTL cache expires after configured duration", () => {
    // Create inspector with 0ms TTL (effectively no cache)
    const noCache = createFlowInspector({
      registry,
      collector,
      cacheTtlMs: 0,
    });

    const snapshotFn = vi.fn(() => ({
      state: "idle",
      context: {},
      activities: [],
      pendingEvents: [],
      stateValue: "idle",
      matches: () => false,
      can: () => false,
    }));

    registry.register(createMockEntry({ snapshot: snapshotFn }));

    noCache.getAllMachinesSnapshot();
    noCache.getAllMachinesSnapshot();
    // With 0ms TTL, cache should never be valid, so snapshot is called each time
    expect(snapshotFn).toHaveBeenCalledTimes(2);

    noCache.dispose();
  });

  it("getHighErrorRatePorts() with exact threshold boundary", () => {
    // 1 ok, 1 err = 50% error rate
    inspector.recordEffectResult({
      portName: "Half",
      method: "fn",
      ok: true,
      timestamp: 1,
      duration: 1,
    });
    inspector.recordEffectResult({
      portName: "Half",
      method: "fn",
      ok: false,
      timestamp: 2,
      duration: 1,
    });

    // At exactly 0.5 threshold, 50% error rate should match (>=)
    const atThreshold = inspector.getHighErrorRatePorts(0.5);
    expect(atThreshold).toContain("Half.fn");

    // At 0.51 threshold, 50% error rate should NOT match
    const aboveThreshold = inspector.getHighErrorRatePorts(0.51);
    expect(aboveThreshold).not.toContain("Half.fn");
  });

  it("getHighErrorRatePorts() with all-ok results returns empty", () => {
    inspector.recordEffectResult({
      portName: "Good",
      method: "fn",
      ok: true,
      timestamp: 1,
      duration: 1,
    });
    inspector.recordEffectResult({
      portName: "Good",
      method: "fn",
      ok: true,
      timestamp: 2,
      duration: 1,
    });

    expect(inspector.getHighErrorRatePorts(0.01)).toEqual([]);
  });

  it("getStateHistory() returns empty for untracked machine", () => {
    const history = inspector.getStateHistory("UnknownPort", "unknown-inst");
    expect(history).toEqual([]);
  });

  it("getStateHistory() returns empty array (not undefined) for registered machine with no events", () => {
    // Machine IS registered, but collector has never received events for it
    registry.register(createMockEntry({ machineId: "no-events", portName: "P", instanceId: "i1" }));

    const history = inspector.getStateHistory("P", "i1");
    // Must be [] not undefined — verifies the ?? [] fallback
    expect(history).toEqual([]);
    expect(Array.isArray(history)).toBe(true);
  });

  it("getStateHistory() uses machineId from registry entry for lookup", () => {
    // Register with machineId "m1" — collector events are keyed by machineId
    registry.register(createMockEntry({ machineId: "m1", portName: "P", instanceId: "i1" }));

    collector.addTransition(makeTransition({ machineId: "m1", prevState: "a", nextState: "b" }));
    collector.addTransition(makeTransition({ machineId: "m1", prevState: "b", nextState: "c" }));

    const history = inspector.getStateHistory("P", "i1");
    expect(history).toEqual(["a", "b", "c"]);
  });

  // ---------------------------------------------------------------------------
  // Limit boundary precision tests (kills < vs <= mutants)
  // ---------------------------------------------------------------------------

  it("getEventHistory() limit of 1 returns exactly 1 item", () => {
    collector.addTransition(makeTransition({ id: "t1" }));
    collector.addTransition(makeTransition({ id: "t2" }));
    collector.addTransition(makeTransition({ id: "t3" }));

    const history = inspector.getEventHistory({ limit: 1 });
    expect(history).toHaveLength(1);
    expect(history[0]?.id).toBe("t3");
  });

  it("getEffectHistory() limit of 1 returns exactly 1 item", () => {
    inspector.recordEffectResult({
      portName: "A",
      method: "x",
      ok: true,
      timestamp: 1,
      duration: 1,
    });
    inspector.recordEffectResult({
      portName: "B",
      method: "y",
      ok: true,
      timestamp: 2,
      duration: 2,
    });

    const limited = inspector.getEffectHistory({ limit: 1 });
    expect(limited).toHaveLength(1);
    expect(limited[0]?.portName).toBe("B");
  });

  it("getHealthEvents() limit of 1 returns exactly 1 item", () => {
    inspector.recordHealthEvent({
      type: "flow-error",
      machineId: "m1",
      state: "err",
      timestamp: 1,
    });
    inspector.recordHealthEvent({
      type: "flow-recovered",
      machineId: "m1",
      fromState: "err",
      timestamp: 2,
    });

    const limited = inspector.getHealthEvents({ limit: 1 });
    expect(limited).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // Default config value tests (kills ?? vs && mutant)
  // ---------------------------------------------------------------------------

  it("uses default cacheTtlMs when not specified", () => {
    // Create inspector without explicit cacheTtlMs
    const defaultInspector = createFlowInspector({
      registry,
      collector,
      // No cacheTtlMs - should use default (5000ms)
    });

    const snapshotFn = vi.fn(() => ({
      state: "idle",
      context: {},
      activities: [],
      pendingEvents: [],
      stateValue: "idle",
      matches: () => false,
      can: () => false,
    }));

    registry.register(createMockEntry({ snapshot: snapshotFn }));

    // First call creates cache
    defaultInspector.getAllMachinesSnapshot();
    // Second call should hit cache (default TTL is 5000ms, not expired)
    defaultInspector.getAllMachinesSnapshot();
    expect(snapshotFn).toHaveBeenCalledTimes(1);

    defaultInspector.dispose();
  });

  // ---------------------------------------------------------------------------
  // getHighErrorRatePorts total=0 guard
  // ---------------------------------------------------------------------------

  it("getHighErrorRatePorts() with no data returns empty", () => {
    const result = inspector.getHighErrorRatePorts(0);
    expect(result).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Health event buffer overflow (circular eviction)
  // ---------------------------------------------------------------------------

  it("health events use circular eviction when buffer is full", () => {
    // Create inspector with a small health buffer to test overflow
    const smallInspector = createFlowInspector({
      registry,
      collector,
      healthBufferSize: 3,
    });

    smallInspector.recordHealthEvent({
      type: "flow-error",
      machineId: "m1",
      state: "s1",
      timestamp: 1,
    });
    smallInspector.recordHealthEvent({
      type: "flow-error",
      machineId: "m1",
      state: "s2",
      timestamp: 2,
    });
    smallInspector.recordHealthEvent({
      type: "flow-error",
      machineId: "m1",
      state: "s3",
      timestamp: 3,
    });
    smallInspector.recordHealthEvent({
      type: "flow-error",
      machineId: "m1",
      state: "s4",
      timestamp: 4,
    });
    smallInspector.recordHealthEvent({
      type: "flow-error",
      machineId: "m1",
      state: "s5",
      timestamp: 5,
    });

    const events = smallInspector.getHealthEvents();
    // With capacity=3, only the last 3 should remain
    expect(events).toHaveLength(3);
    if (events[0]?.type === "flow-error") {
      expect(events[0].state).toBe("s3");
    }
    if (events[2]?.type === "flow-error") {
      expect(events[2].state).toBe("s5");
    }

    smallInspector.dispose();
  });

  // ---------------------------------------------------------------------------
  // Effect result statistics aggregation across methods
  // ---------------------------------------------------------------------------

  it("getEffectResultStatistics aggregates across different methods", () => {
    inspector.recordEffectResult({
      portName: "Api",
      method: "get",
      ok: true,
      timestamp: 1,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Api",
      method: "post",
      ok: true,
      timestamp: 2,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Api",
      method: "get",
      ok: false,
      timestamp: 3,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Api",
      method: "post",
      ok: false,
      timestamp: 4,
      duration: 10,
    });
    inspector.recordEffectResult({
      portName: "Api",
      method: "post",
      ok: false,
      timestamp: 5,
      duration: 10,
    });

    const stats = inspector.getEffectResultStatistics();
    expect(stats.get("Api.get")).toEqual({ ok: 1, err: 1 });
    expect(stats.get("Api.post")).toEqual({ ok: 1, err: 2 });
  });

  it("getEffectResultStatistics with single ok returns 0 err", () => {
    inspector.recordEffectResult({
      portName: "Clean",
      method: "run",
      ok: true,
      timestamp: 1,
      duration: 5,
    });

    const stats = inspector.getEffectResultStatistics();
    expect(stats.get("Clean.run")).toEqual({ ok: 1, err: 0 });
  });
});
