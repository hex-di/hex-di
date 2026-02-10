/**
 * Store Introspection Unit Tests
 *
 * Tests for StoreInspectorAPI, ActionHistory, SubscriberGraph,
 * and createStoreInspectorAdapter.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createActionHistory,
  buildSubscriberGraph,
  createStoreInspectorImpl,
  createStoreInspectorAdapter,
  StoreInspectorAdapter,
} from "../src/inspection/index.js";
import type {
  ActionHistoryEntry,
  ActionHistoryConfig,
  StoreInspectorEvent,
  PortSnapshot,
  StatePortSnapshot,
  AtomPortSnapshot,
  DerivedPortSnapshot,
  AsyncDerivedPortSnapshot,
} from "../src/types/inspection.js";
import type { PortRegistryEntry } from "../src/inspection/store-inspector-impl.js";
import type { AdapterRegistration } from "../src/inspection/subscriber-graph.js";
import {
  __stateAdapterBrand,
  __atomAdapterBrand,
  __derivedAdapterBrand,
  __asyncDerivedAdapterBrand,
  __linkedDerivedAdapterBrand,
} from "../src/adapters/brands.js";

// =============================================================================
// Helpers
// =============================================================================

let _entryCounter = 0;

function makeEntry(overrides: Partial<ActionHistoryEntry> = {}): ActionHistoryEntry {
  _entryCounter++;
  return {
    id: overrides.id ?? `entry-${_entryCounter}`,
    portName: overrides.portName ?? "Counter",
    actionName: overrides.actionName ?? "increment",
    payload: overrides.payload ?? undefined,
    prevState: overrides.prevState ?? { count: 0 },
    nextState: overrides.nextState ?? { count: 1 },
    timestamp: overrides.timestamp ?? Date.now(),
    effectStatus: overrides.effectStatus ?? "none",
    effectError: overrides.effectError,
    parentId: overrides.parentId ?? null,
    order: overrides.order ?? _entryCounter,
    traceId: overrides.traceId,
    spanId: overrides.spanId,
  };
}

function makeStateSnapshot(
  portName: string,
  overrides: Partial<StatePortSnapshot> = {}
): StatePortSnapshot {
  return {
    kind: "state",
    portName,
    state: overrides.state ?? { count: 0 },
    subscriberCount: overrides.subscriberCount ?? 0,
    actionCount: overrides.actionCount ?? 0,
    lastActionAt: overrides.lastActionAt ?? null,
  };
}

function makeAtomSnapshot(portName: string): AtomPortSnapshot {
  return {
    kind: "atom",
    portName,
    value: "light",
    subscriberCount: 0,
  };
}

function makeDerivedSnapshot(
  portName: string,
  sourcePortNames: readonly string[] = []
): DerivedPortSnapshot {
  return {
    kind: "derived",
    portName,
    value: 0,
    subscriberCount: 0,
    sourcePortNames,
    isStale: false,
  };
}

function makeAsyncDerivedSnapshot(
  portName: string,
  sourcePortNames: readonly string[] = []
): AsyncDerivedPortSnapshot {
  return {
    kind: "async-derived",
    portName,
    status: "idle",
    data: undefined,
    error: undefined,
    subscriberCount: 0,
    sourcePortNames,
  };
}

function makePortEntry(
  portName: string,
  adapter: object,
  snapshot: PortSnapshot,
  overrides: Partial<PortRegistryEntry> = {}
): PortRegistryEntry {
  return {
    portName,
    adapter,
    lifetime: overrides.lifetime ?? "singleton",
    requires: overrides.requires ?? [],
    writesTo: overrides.writesTo ?? [],
    getSnapshot: () => snapshot,
    getSubscriberCount: overrides.getSubscriberCount ?? (() => 0),
    getHasEffects: overrides.getHasEffects ?? (() => false),
  };
}

// =============================================================================
// ActionHistory
// =============================================================================

describe("ActionHistory", () => {
  it("records entries in full mode", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    const entry = makeEntry();
    const recorded = history.record(entry);

    expect(recorded).toBe(true);
    expect(history.size).toBe(1);
  });

  it("returns all entries via query()", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "a" }));
    history.record(makeEntry({ id: "b" }));

    const entries = history.query();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.id).toBe("a");
    expect(entries[1]?.id).toBe("b");
  });

  it("does not record in off mode", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "off" });
    const recorded = history.record(makeEntry());

    expect(recorded).toBe(false);
    expect(history.size).toBe(0);
  });

  it("strips prevState/nextState in lightweight mode", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "lightweight" });
    const entry = makeEntry({ prevState: { count: 0 }, nextState: { count: 1 } });
    history.record(entry);

    const entries = history.query();
    expect(entries[0]?.prevState).toBeUndefined();
    expect(entries[0]?.nextState).toBeUndefined();
  });

  it("preserves prevState/nextState in full mode", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    const entry = makeEntry({ prevState: { count: 0 }, nextState: { count: 1 } });
    history.record(entry);

    const entries = history.query();
    expect(entries[0]?.prevState).toEqual({ count: 0 });
    expect(entries[0]?.nextState).toEqual({ count: 1 });
  });

  it("evicts oldest entries when maxEntries exceeded", () => {
    const history = createActionHistory({ maxEntries: 3, mode: "full" });
    history.record(makeEntry({ id: "a" }));
    history.record(makeEntry({ id: "b" }));
    history.record(makeEntry({ id: "c" }));
    history.record(makeEntry({ id: "d" }));

    expect(history.size).toBe(3);
    const entries = history.query();
    expect(entries[0]?.id).toBe("b");
    expect(entries[2]?.id).toBe("d");
  });

  it("filters by portName", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ portName: "Counter" }));
    history.record(makeEntry({ portName: "Theme" }));
    history.record(makeEntry({ portName: "Counter" }));

    const entries = history.query({ portName: "Counter" });
    expect(entries).toHaveLength(2);
    for (const e of entries) {
      expect(e.portName).toBe("Counter");
    }
  });

  it("filters by actionName", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ actionName: "increment" }));
    history.record(makeEntry({ actionName: "decrement" }));
    history.record(makeEntry({ actionName: "increment" }));

    const entries = history.query({ actionName: "increment" });
    expect(entries).toHaveLength(2);
  });

  it("filters by effectStatus", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ effectStatus: "none" }));
    history.record(makeEntry({ effectStatus: "failed" }));
    history.record(makeEntry({ effectStatus: "completed" }));

    const entries = history.query({ effectStatus: "failed" });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.effectStatus).toBe("failed");
  });

  it("filters by since/until timestamps", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ timestamp: 1000 }));
    history.record(makeEntry({ timestamp: 2000 }));
    history.record(makeEntry({ timestamp: 3000 }));

    const entries = history.query({ since: 1500, until: 2500 });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.timestamp).toBe(2000);
  });

  it("filters by traceId", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ traceId: "trace-1" }));
    history.record(makeEntry({ traceId: "trace-2" }));
    history.record(makeEntry({ traceId: "trace-1" }));

    const entries = history.query({ traceId: "trace-1" });
    expect(entries).toHaveLength(2);
  });

  it("applies limit to results (returns last N)", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "a" }));
    history.record(makeEntry({ id: "b" }));
    history.record(makeEntry({ id: "c" }));

    const entries = history.query({ limit: 2 });
    expect(entries).toHaveLength(2);
    expect(entries[0]?.id).toBe("b");
    expect(entries[1]?.id).toBe("c");
  });

  it("combines multiple filters", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ portName: "Counter", actionName: "increment" }));
    history.record(makeEntry({ portName: "Counter", actionName: "decrement" }));
    history.record(makeEntry({ portName: "Theme", actionName: "increment" }));

    const entries = history.query({ portName: "Counter", actionName: "increment" });
    expect(entries).toHaveLength(1);
  });

  it("clears all entries", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry());
    history.record(makeEntry());
    expect(history.size).toBe(2);

    history.clear();
    expect(history.size).toBe(0);
    expect(history.query()).toHaveLength(0);
  });

  it("respects alwaysRecord.effectStatus override", () => {
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0, // Would normally skip everything
      alwaysRecord: { effectStatus: ["failed"] },
    });

    // samplingRate 0 skips normal entries
    const normalRecorded = history.record(makeEntry({ effectStatus: "none" }));
    expect(normalRecorded).toBe(false);

    // But failed entries should always be recorded via alwaysRecord
    const failedRecorded = history.record(makeEntry({ effectStatus: "failed" }));
    expect(failedRecorded).toBe(true);
  });

  it("respects alwaysRecord.portNames override", () => {
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0,
      alwaysRecord: { portNames: ["Important"] },
    });

    // Non-important entries skipped with samplingRate 0
    const skippedRecorded = history.record(makeEntry({ portName: "Skipped" }));
    expect(skippedRecorded).toBe(false);

    // Important port always recorded
    const importantRecorded = history.record(makeEntry({ portName: "Important" }));
    expect(importantRecorded).toBe(true);
  });

  it("respects alwaysRecord.actionNames override", () => {
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0,
      alwaysRecord: { actionNames: ["critical"] },
    });

    // Non-critical entries skipped
    const normalRecorded = history.record(makeEntry({ actionName: "normal" }));
    expect(normalRecorded).toBe(false);

    // Critical action always recorded
    const criticalRecorded = history.record(makeEntry({ actionName: "critical" }));
    expect(criticalRecorded).toBe(true);
  });

  it("skips all entries with samplingRate 0", () => {
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0,
    });

    const recorded1 = history.record(makeEntry());
    const recorded2 = history.record(makeEntry());
    expect(recorded1).toBe(false);
    expect(recorded2).toBe(false);
    expect(history.size).toBe(0);
  });

  it("records all entries with samplingRate 1", () => {
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 1,
    });

    for (let i = 0; i < 10; i++) {
      history.record(makeEntry());
    }
    expect(history.size).toBe(10);
  });

  it("defaults samplingRate to 1 when not specified", () => {
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
    });

    for (let i = 0; i < 5; i++) {
      history.record(makeEntry());
    }
    expect(history.size).toBe(5);
  });

  it("lightweight mode preserves other entry fields", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "lightweight" });
    const entry = makeEntry({
      id: "lw-1",
      portName: "Counter",
      actionName: "increment",
      effectStatus: "completed",
      traceId: "trace-abc",
    });
    history.record(entry);

    const entries = history.query();
    expect(entries[0]?.id).toBe("lw-1");
    expect(entries[0]?.portName).toBe("Counter");
    expect(entries[0]?.actionName).toBe("increment");
    expect(entries[0]?.effectStatus).toBe("completed");
    expect(entries[0]?.traceId).toBe("trace-abc");
  });
});

// =============================================================================
// SubscriberGraph
// =============================================================================

describe("SubscriberGraph", () => {
  it("builds graph with nodes from adapter registrations", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Counter",
        adapter: { [__stateAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 2,
      },
      {
        portName: "Theme",
        adapter: { [__atomAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 1,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.correlationId).toBeTruthy();
  });

  it("classifies state adapters correctly", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Counter",
        adapter: { [__stateAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 0,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    expect(graph.nodes[0]?.kind).toBe("state");
  });

  it("classifies atom adapters correctly", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Theme",
        adapter: { [__atomAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 0,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    expect(graph.nodes[0]?.kind).toBe("atom");
  });

  it("classifies derived adapters correctly", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Double",
        adapter: { [__derivedAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 0,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    expect(graph.nodes[0]?.kind).toBe("derived");
  });

  it("classifies async-derived adapters correctly", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Rate",
        adapter: { [__asyncDerivedAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 0,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    expect(graph.nodes[0]?.kind).toBe("async-derived");
  });

  it("classifies linked-derived adapters as derived", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Linked",
        adapter: { [__linkedDerivedAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 0,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    expect(graph.nodes[0]?.kind).toBe("derived");
  });

  it("creates derives-from edges for derived adapters", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Counter",
        adapter: { [__stateAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 0,
      },
      {
        portName: "Double",
        adapter: { [__derivedAdapterBrand]: true },
        requires: ["Counter"],
        writesTo: [],
        subscriberCount: 0,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    const derivesEdges = graph.edges.filter(e => e.type === "derives-from");
    expect(derivesEdges).toHaveLength(1);
    expect(derivesEdges[0]?.from).toBe("Counter");
    expect(derivesEdges[0]?.to).toBe("Double");
  });

  it("creates subscribes-to edges for state adapters with requires", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Logger",
        adapter: { [__stateAdapterBrand]: true },
        requires: ["Counter"],
        writesTo: [],
        subscriberCount: 0,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    const subscribeEdges = graph.edges.filter(e => e.type === "subscribes-to");
    expect(subscribeEdges).toHaveLength(1);
    expect(subscribeEdges[0]?.from).toBe("Logger");
    expect(subscribeEdges[0]?.to).toBe("Counter");
  });

  it("creates writes-to edges for linked derived", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Linked",
        adapter: { [__linkedDerivedAdapterBrand]: true },
        requires: ["Source"],
        writesTo: ["Source"],
        subscriberCount: 0,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    const writesEdges = graph.edges.filter(e => e.type === "writes-to");
    expect(writesEdges).toHaveLength(1);
    expect(writesEdges[0]?.from).toBe("Linked");
    expect(writesEdges[0]?.to).toBe("Source");
  });

  it("includes subscriber counts in nodes", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Counter",
        adapter: { [__stateAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 5,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    expect(graph.nodes[0]?.subscriberCount).toBe(5);
  });

  it("generates unique correlationIds", () => {
    const graph1 = buildSubscriberGraph([]);
    const graph2 = buildSubscriberGraph([]);
    expect(graph1.correlationId).not.toBe(graph2.correlationId);
  });

  it("builds empty graph for no registrations", () => {
    const graph = buildSubscriberGraph([]);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });
});

// =============================================================================
// StoreInspectorImpl
// =============================================================================

describe("StoreInspectorImpl", () => {
  it("getSnapshot returns StoreSnapshot with timestamp", () => {
    const inspector = createStoreInspectorImpl();
    const snapshot = inspector.getSnapshot();

    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.ports).toHaveLength(0);
    expect(snapshot.totalSubscribers).toBe(0);
    expect(snapshot.pendingEffects).toBe(0);
  });

  it("getSnapshot includes registered port snapshots", () => {
    const inspector = createStoreInspectorImpl();
    const stateSnapshot = makeStateSnapshot("Counter");

    inspector.registerPort(
      makePortEntry("Counter", { [__stateAdapterBrand]: true }, stateSnapshot)
    );

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(1);
    expect(snapshot.ports[0]?.portName).toBe("Counter");
  });

  it("getSnapshot aggregates totalSubscribers", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerPort(
      makePortEntry("Counter", { [__stateAdapterBrand]: true }, makeStateSnapshot("Counter"), {
        getSubscriberCount: () => 3,
      })
    );

    inspector.registerPort(
      makePortEntry("Theme", { [__atomAdapterBrand]: true }, makeAtomSnapshot("Theme"), {
        getSubscriberCount: () => 2,
      })
    );

    const snapshot = inspector.getSnapshot();
    expect(snapshot.totalSubscribers).toBe(5);
  });

  it("getPortState returns PortSnapshot for registered port", () => {
    const inspector = createStoreInspectorImpl();
    const stateSnapshot = makeStateSnapshot("Counter");

    inspector.registerPort(
      makePortEntry("Counter", { [__stateAdapterBrand]: true }, stateSnapshot)
    );

    const result = inspector.getPortState("Counter");
    expect(result).toBeDefined();
    expect(result?.kind).toBe("state");
    expect(result?.portName).toBe("Counter");
  });

  it("getPortState returns undefined for unregistered port", () => {
    const inspector = createStoreInspectorImpl();
    expect(inspector.getPortState("NonExistent")).toBeUndefined();
  });

  it("listStatePorts returns StatePortInfo[] with metadata", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerPort(
      makePortEntry("Counter", { [__stateAdapterBrand]: true }, makeStateSnapshot("Counter"), {
        getSubscriberCount: () => 2,
        getHasEffects: () => true,
      })
    );

    inspector.registerPort(
      makePortEntry("Theme", { [__atomAdapterBrand]: true }, makeAtomSnapshot("Theme"), {
        getSubscriberCount: () => 1,
        getHasEffects: () => false,
        lifetime: "scoped",
      })
    );

    const ports = inspector.listStatePorts();
    expect(ports).toHaveLength(2);

    const counter = ports.find(p => p.portName === "Counter");
    expect(counter?.kind).toBe("state");
    expect(counter?.lifetime).toBe("singleton");
    expect(counter?.subscriberCount).toBe(2);
    expect(counter?.hasEffects).toBe(true);

    const theme = ports.find(p => p.portName === "Theme");
    expect(theme?.kind).toBe("atom");
    expect(theme?.lifetime).toBe("scoped");
    expect(theme?.subscriberCount).toBe(1);
    expect(theme?.hasEffects).toBe(false);
  });

  it("getSubscriberGraph returns graph from registered ports", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerPort(
      makePortEntry("Counter", { [__stateAdapterBrand]: true }, makeStateSnapshot("Counter"))
    );

    inspector.registerPort(
      makePortEntry(
        "Double",
        { [__derivedAdapterBrand]: true },
        makeDerivedSnapshot("Double", ["Counter"]),
        { requires: ["Counter"] }
      )
    );

    const graph = inspector.getSubscriberGraph();
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]?.type).toBe("derives-from");
  });

  it("getActionHistory returns recorded entries", () => {
    const inspector = createStoreInspectorImpl();
    const entry = makeEntry({ id: "test-1" });
    inspector.recordAction(entry);

    const history = inspector.getActionHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.id).toBe("test-1");
  });

  it("getActionHistory supports filtering", () => {
    const inspector = createStoreInspectorImpl();
    inspector.recordAction(makeEntry({ portName: "Counter" }));
    inspector.recordAction(makeEntry({ portName: "Theme" }));

    const history = inspector.getActionHistory({ portName: "Counter" });
    expect(history).toHaveLength(1);
  });

  it("subscribe fires action-dispatched event on recordAction", () => {
    const inspector = createStoreInspectorImpl();
    const events: StoreInspectorEvent[] = [];
    inspector.subscribe(event => events.push(event));

    const entry = makeEntry();
    inspector.recordAction(entry);

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("action-dispatched");
  });

  it("subscribe fires state-changed event", () => {
    const inspector = createStoreInspectorImpl();
    const events: StoreInspectorEvent[] = [];
    inspector.subscribe(event => events.push(event));

    inspector.emit({ type: "state-changed", portName: "Counter" });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("state-changed");
  });

  it("subscribe fires subscriber-added event", () => {
    const inspector = createStoreInspectorImpl();
    const events: StoreInspectorEvent[] = [];
    inspector.subscribe(event => events.push(event));

    inspector.emit({ type: "subscriber-added", portName: "Counter", count: 1 });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("subscriber-added");
  });

  it("subscribe fires subscriber-removed event", () => {
    const inspector = createStoreInspectorImpl();
    const events: StoreInspectorEvent[] = [];
    inspector.subscribe(event => events.push(event));

    inspector.emit({ type: "subscriber-removed", portName: "Counter", count: 0 });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("subscriber-removed");
  });

  it("subscribe fires effect-completed event", () => {
    const inspector = createStoreInspectorImpl();
    const events: StoreInspectorEvent[] = [];
    inspector.subscribe(event => events.push(event));

    inspector.emit({ type: "effect-completed", portName: "Counter", actionName: "increment" });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("effect-completed");
  });

  it("subscribe fires effect-failed event", () => {
    const inspector = createStoreInspectorImpl();
    const events: StoreInspectorEvent[] = [];
    inspector.subscribe(event => events.push(event));

    inspector.emit({
      type: "effect-failed",
      portName: "Counter",
      actionName: "increment",
      error: {
        _tag: "EffectFailed",
        portName: "Counter",
        actionName: "increment",
        cause: new Error("boom"),
      },
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("effect-failed");
  });

  it("subscribe fires async-derived-failed event", () => {
    const inspector = createStoreInspectorImpl();
    const events: StoreInspectorEvent[] = [];
    inspector.subscribe(event => events.push(event));

    inspector.emit({
      type: "async-derived-failed",
      error: {
        _tag: "AsyncDerivedSelectFailed",
        portName: "Rate",
        attempts: 3,
        cause: new Error("timeout"),
      },
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("async-derived-failed");
  });

  it("subscribe fires snapshot-changed event", () => {
    const inspector = createStoreInspectorImpl();
    const events: StoreInspectorEvent[] = [];
    inspector.subscribe(event => events.push(event));

    inspector.emit({ type: "snapshot-changed" });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("snapshot-changed");
  });

  it("subscribe returns unsubscribe function", () => {
    const inspector = createStoreInspectorImpl();
    const events: StoreInspectorEvent[] = [];
    const unsub = inspector.subscribe(event => events.push(event));

    inspector.emit({ type: "snapshot-changed" });
    expect(events).toHaveLength(1);

    unsub();
    inspector.emit({ type: "snapshot-changed" });
    expect(events).toHaveLength(1); // No new events after unsub
  });

  it("supports multiple simultaneous listeners", () => {
    const inspector = createStoreInspectorImpl();
    const events1: StoreInspectorEvent[] = [];
    const events2: StoreInspectorEvent[] = [];

    inspector.subscribe(event => events1.push(event));
    inspector.subscribe(event => events2.push(event));

    inspector.emit({ type: "snapshot-changed" });

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
  });

  it("unregisterPort removes port from snapshot", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerPort(
      makePortEntry("Counter", { [__stateAdapterBrand]: true }, makeStateSnapshot("Counter"))
    );

    expect(inspector.getSnapshot().ports).toHaveLength(1);

    inspector.unregisterPort("Counter");
    expect(inspector.getSnapshot().ports).toHaveLength(0);
  });

  it("tracks pending effects via increment/decrement", () => {
    const inspector = createStoreInspectorImpl();
    expect(inspector.getSnapshot().pendingEffects).toBe(0);

    inspector.incrementPendingEffects();
    inspector.incrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(2);

    inspector.decrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(1);
  });

  it("decrementPendingEffects does not go below zero", () => {
    const inspector = createStoreInspectorImpl();
    inspector.decrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(0);
  });

  it("uses custom ActionHistoryConfig", () => {
    const config: ActionHistoryConfig = {
      maxEntries: 2,
      mode: "lightweight",
    };
    const inspector = createStoreInspectorImpl({ historyConfig: config });

    inspector.recordAction(makeEntry({ id: "a" }));
    inspector.recordAction(makeEntry({ id: "b" }));
    inspector.recordAction(makeEntry({ id: "c" }));

    const history = inspector.getActionHistory();
    expect(history).toHaveLength(2);
    // Lightweight mode strips state
    expect(history[0]?.prevState).toBeUndefined();
  });

  it("getPortState returns correct kind for each port type", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerPort(
      makePortEntry("Counter", { [__stateAdapterBrand]: true }, makeStateSnapshot("Counter"))
    );

    inspector.registerPort(
      makePortEntry("Theme", { [__atomAdapterBrand]: true }, makeAtomSnapshot("Theme"))
    );

    inspector.registerPort(
      makePortEntry("Double", { [__derivedAdapterBrand]: true }, makeDerivedSnapshot("Double"))
    );

    inspector.registerPort(
      makePortEntry(
        "Rate",
        { [__asyncDerivedAdapterBrand]: true },
        makeAsyncDerivedSnapshot("Rate")
      )
    );

    expect(inspector.getPortState("Counter")?.kind).toBe("state");
    expect(inspector.getPortState("Theme")?.kind).toBe("atom");
    expect(inspector.getPortState("Double")?.kind).toBe("derived");
    expect(inspector.getPortState("Rate")?.kind).toBe("async-derived");
  });
});

// =============================================================================
// createStoreInspectorAdapter
// =============================================================================

describe("createStoreInspectorAdapter", () => {
  it("returns api and internal interfaces", () => {
    const result = createStoreInspectorAdapter();
    expect(result.api).toBeDefined();
    expect(result.internal).toBeDefined();
  });

  it("api has all StoreInspectorAPI methods", () => {
    const { api } = createStoreInspectorAdapter();

    expect(typeof api.getSnapshot).toBe("function");
    expect(typeof api.getPortState).toBe("function");
    expect(typeof api.listStatePorts).toBe("function");
    expect(typeof api.getSubscriberGraph).toBe("function");
    expect(typeof api.getActionHistory).toBe("function");
    expect(typeof api.subscribe).toBe("function");
  });

  it("internal has registerPort and recordAction", () => {
    const { internal } = createStoreInspectorAdapter();

    expect(typeof internal.registerPort).toBe("function");
    expect(typeof internal.unregisterPort).toBe("function");
    expect(typeof internal.recordAction).toBe("function");
    expect(typeof internal.emit).toBe("function");
  });

  it("accepts custom historyConfig", () => {
    const { internal } = createStoreInspectorAdapter({
      historyConfig: { maxEntries: 5, mode: "off" },
    });

    internal.recordAction(makeEntry());
    // In off mode, no entries are recorded
    expect(internal.getActionHistory()).toHaveLength(0);
  });

  it("api and internal share the same underlying state", () => {
    const { api, internal } = createStoreInspectorAdapter();

    internal.registerPort(
      makePortEntry("Counter", { [__stateAdapterBrand]: true }, makeStateSnapshot("Counter"))
    );

    // api.getSnapshot reflects the port registered via internal
    expect(api.getSnapshot().ports).toHaveLength(1);
    expect(api.getPortState("Counter")).toBeDefined();
  });
});

// =============================================================================
// ActionHistory - Sampling Edge Cases
// =============================================================================

describe("ActionHistory - sampling edge cases", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records entry when Math.random returns value below samplingRate", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 0.5 });

    // First entry (seenCount=0) is always recorded regardless of sampling
    history.record(makeEntry({ id: "first" }));
    // Second entry: Math.random() returns 0.3, rate is 0.5, 0.3 < 0.5 => recorded
    const recorded = history.record(makeEntry({ id: "second" }));

    expect(recorded).toBe(true);
    expect(history.size).toBe(2);
  });

  it("skips entry when Math.random returns value at or above samplingRate", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.7);
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 0.5 });

    // First entry (seenCount=0) always recorded
    history.record(makeEntry({ id: "first" }));
    // Second entry: Math.random() returns 0.7, rate is 0.5, 0.7 >= 0.5 => NOT recorded
    const recorded = history.record(makeEntry({ id: "second" }));

    expect(recorded).toBe(false);
    expect(history.size).toBe(1);
  });

  it("records all entries when samplingRate >= 1 (e.g. 1.5)", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 1.5 });

    for (let i = 0; i < 5; i++) {
      const recorded = history.record(makeEntry());
      expect(recorded).toBe(true);
    }
    expect(history.size).toBe(5);
  });

  it("skips all entries when samplingRate <= 0 (e.g. -1)", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: -1 });

    for (let i = 0; i < 5; i++) {
      const recorded = history.record(makeEntry());
      expect(recorded).toBe(false);
    }
    expect(history.size).toBe(0);
  });

  it("always records first entry regardless of samplingRate when rate is between 0 and 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 0.01 });

    // First entry (seenCount=0) bypasses Math.random check
    const recorded = history.record(makeEntry({ id: "first" }));
    expect(recorded).toBe(true);

    // Second entry: Math.random() returns 0.99, rate is 0.01, 0.99 >= 0.01 => skipped
    const secondRecorded = history.record(makeEntry({ id: "second" }));
    expect(secondRecorded).toBe(false);
    expect(history.size).toBe(1);
  });
});

// =============================================================================
// ActionHistory - Lightweight Field Preservation
// =============================================================================

describe("ActionHistory - lightweight field preservation", () => {
  it("lightweight mode preserves payload", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "lightweight" });
    history.record(makeEntry({ payload: { delta: 5 } }));

    const entries = history.query();
    expect(entries[0]?.payload).toEqual({ delta: 5 });
  });

  it("lightweight mode preserves effectError", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "lightweight" });
    const err = {
      _tag: "EffectFailed" as const,
      portName: "Counter",
      actionName: "increment",
      cause: new Error("effect failed"),
    };
    history.record(makeEntry({ effectError: err }));

    const entries = history.query();
    expect(entries[0]?.effectError).toBe(err);
  });

  it("lightweight mode preserves parentId", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "lightweight" });
    history.record(makeEntry({ parentId: "parent-42" }));

    const entries = history.query();
    expect(entries[0]?.parentId).toBe("parent-42");
  });

  it("lightweight mode preserves order", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "lightweight" });
    history.record(makeEntry({ order: 99 }));

    const entries = history.query();
    expect(entries[0]?.order).toBe(99);
  });

  it("lightweight mode preserves spanId", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "lightweight" });
    history.record(makeEntry({ spanId: "span-abc" }));

    const entries = history.query();
    expect(entries[0]?.spanId).toBe("span-abc");
  });
});

// =============================================================================
// ActionHistory - Filter Boundary Cases
// =============================================================================

describe("ActionHistory - filter boundary cases", () => {
  it("since boundary: entry.timestamp === filter.since is included", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ timestamp: 1000 }));
    history.record(makeEntry({ timestamp: 2000 }));
    history.record(makeEntry({ timestamp: 3000 }));

    // since uses `entry.timestamp < filter.since` to exclude, so 2000 === 2000 is NOT excluded
    const entries = history.query({ since: 2000 });
    expect(entries).toHaveLength(2);
    expect(entries[0]?.timestamp).toBe(2000);
    expect(entries[1]?.timestamp).toBe(3000);
  });

  it("until boundary: entry.timestamp === filter.until is included", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ timestamp: 1000 }));
    history.record(makeEntry({ timestamp: 2000 }));
    history.record(makeEntry({ timestamp: 3000 }));

    // until uses `entry.timestamp > filter.until` to exclude, so 2000 === 2000 is NOT excluded
    const entries = history.query({ until: 2000 });
    expect(entries).toHaveLength(2);
    expect(entries[0]?.timestamp).toBe(1000);
    expect(entries[1]?.timestamp).toBe(2000);
  });

  it("limit=0 returns full array (slice(-0) === slice(0))", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "a" }));
    history.record(makeEntry({ id: "b" }));
    history.record(makeEntry({ id: "c" }));

    // slice(-0) is slice(0) which returns the full array
    const entries = history.query({ limit: 0 });
    expect(entries).toHaveLength(3);
  });

  it("filter with undefined portName does not filter by portName", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ portName: "Counter" }));
    history.record(makeEntry({ portName: "Theme" }));
    history.record(makeEntry({ portName: "Logger" }));

    // portName is undefined in filter => all entries returned
    const entries = history.query({ portName: undefined });
    expect(entries).toHaveLength(3);
  });
});

// =============================================================================
// SubscriberGraph - Edge Cases
// =============================================================================

describe("SubscriberGraph - edge cases", () => {
  it("duplicate portName: second registration does not create duplicate node", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Counter",
        adapter: { [__stateAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 2,
      },
      {
        portName: "Counter",
        adapter: { [__stateAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 5,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    expect(graph.nodes).toHaveLength(1);
    // First registration wins due to nodeIds Set check
    expect(graph.nodes[0]?.subscriberCount).toBe(2);
  });

  it("async-derived with requires creates derives-from edges", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Source",
        adapter: { [__stateAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 0,
      },
      {
        portName: "AsyncDerived",
        adapter: { [__asyncDerivedAdapterBrand]: true },
        requires: ["Source"],
        writesTo: [],
        subscriberCount: 0,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    const derivesEdges = graph.edges.filter(e => e.type === "derives-from");
    expect(derivesEdges).toHaveLength(1);
    expect(derivesEdges[0]?.from).toBe("Source");
    expect(derivesEdges[0]?.to).toBe("AsyncDerived");
  });

  it("linked-derived with requires creates derives-from edges (classified as derived)", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Source",
        adapter: { [__stateAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 0,
      },
      {
        portName: "LinkedDerived",
        adapter: { [__linkedDerivedAdapterBrand]: true },
        requires: ["Source"],
        writesTo: [],
        subscriberCount: 0,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    const node = graph.nodes.find(n => n.id === "LinkedDerived");
    expect(node?.kind).toBe("derived");

    const derivesEdges = graph.edges.filter(e => e.type === "derives-from");
    expect(derivesEdges).toHaveLength(1);
    expect(derivesEdges[0]?.from).toBe("Source");
    expect(derivesEdges[0]?.to).toBe("LinkedDerived");
  });

  it("edge type strings are exact literal values", () => {
    const registrations: AdapterRegistration[] = [
      {
        portName: "Counter",
        adapter: { [__stateAdapterBrand]: true },
        requires: ["External"],
        writesTo: [],
        subscriberCount: 0,
      },
      {
        portName: "Double",
        adapter: { [__derivedAdapterBrand]: true },
        requires: ["Counter"],
        writesTo: [],
        subscriberCount: 0,
      },
      {
        portName: "Linked",
        adapter: { [__linkedDerivedAdapterBrand]: true },
        requires: ["Counter"],
        writesTo: ["Counter"],
        subscriberCount: 0,
      },
    ];

    const graph = buildSubscriberGraph(registrations);
    const edgeTypes = new Set(graph.edges.map(e => e.type));

    expect(edgeTypes.has("derives-from")).toBe(true);
    expect(edgeTypes.has("subscribes-to")).toBe(true);
    expect(edgeTypes.has("writes-to")).toBe(true);

    // Verify exact strings (no typos, no camelCase variants)
    for (const edge of graph.edges) {
      expect(["derives-from", "subscribes-to", "writes-to"]).toContain(edge.type);
    }
  });

  it("adapter with no brand symbol defaults to state classification", () => {
    const registrations: AdapterRegistration[] = [
      { portName: "NoBrand", adapter: {}, requires: [], writesTo: [], subscriberCount: 0 },
    ];

    const graph = buildSubscriberGraph(registrations);
    expect(graph.nodes[0]?.kind).toBe("state");
  });
});

// =============================================================================
// StoreInspectorImpl - Edge Cases
// =============================================================================

describe("StoreInspectorImpl - edge cases", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("increment then decrement back to exactly 0", () => {
    const inspector = createStoreInspectorImpl();

    inspector.incrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(1);

    inspector.decrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(0);

    // Further decrement stays at 0
    inspector.decrementPendingEffects();
    expect(inspector.getSnapshot().pendingEffects).toBe(0);
  });

  it("recordAction in off mode does not emit event", () => {
    const inspector = createStoreInspectorImpl({
      historyConfig: { maxEntries: 100, mode: "off" },
    });
    const events: StoreInspectorEvent[] = [];
    inspector.subscribe(event => events.push(event));

    inspector.recordAction(makeEntry());

    expect(events).toHaveLength(0);
    expect(inspector.getActionHistory()).toHaveLength(0);
  });

  it("config with undefined historyConfig uses defaults (all entries recorded)", () => {
    const inspector = createStoreInspectorImpl();

    inspector.recordAction(makeEntry({ id: "d1" }));
    inspector.recordAction(makeEntry({ id: "d2" }));
    inspector.recordAction(makeEntry({ id: "d3" }));

    const history = inspector.getActionHistory();
    expect(history).toHaveLength(3);
    // Full mode by default: prevState and nextState preserved
    expect(history[0]?.prevState).toBeDefined();
    expect(history[0]?.nextState).toBeDefined();
  });

  it("classifyAdapter: linked-derived brand returns derived via listStatePorts", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerPort(
      makePortEntry(
        "LinkedPort",
        { [__linkedDerivedAdapterBrand]: true },
        makeDerivedSnapshot("LinkedPort", ["Source"])
      )
    );

    const ports = inspector.listStatePorts();
    const linkedPort = ports.find(p => p.portName === "LinkedPort");
    expect(linkedPort?.kind).toBe("derived");
  });
});

// =============================================================================
// StoreInspector classifyAdapter — individual brand kill
// =============================================================================

describe("StoreInspector classifyAdapter — individual brand verification", () => {
  it("adapter with ONLY __atomAdapterBrand returns atom (not state fallthrough)", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(
      makePortEntry("AtomOnly", { [__atomAdapterBrand]: true }, makeAtomSnapshot("AtomOnly"))
    );

    const ports = inspector.listStatePorts();
    expect(ports[0]?.kind).toBe("atom");
  });

  it("adapter with ONLY __derivedAdapterBrand returns derived", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(
      makePortEntry(
        "DerivedOnly",
        { [__derivedAdapterBrand]: true },
        makeDerivedSnapshot("DerivedOnly")
      )
    );

    const ports = inspector.listStatePorts();
    expect(ports[0]?.kind).toBe("derived");
  });

  it("adapter with ONLY __asyncDerivedAdapterBrand returns async-derived", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(
      makePortEntry(
        "AsyncOnly",
        { [__asyncDerivedAdapterBrand]: true },
        makeAsyncDerivedSnapshot("AsyncOnly")
      )
    );

    const ports = inspector.listStatePorts();
    expect(ports[0]?.kind).toBe("async-derived");
  });

  it("adapter with ONLY __linkedDerivedAdapterBrand returns derived", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(
      makePortEntry(
        "LinkedOnly",
        { [__linkedDerivedAdapterBrand]: true },
        makeDerivedSnapshot("LinkedOnly")
      )
    );

    const ports = inspector.listStatePorts();
    expect(ports[0]?.kind).toBe("derived");
  });

  it("adapter with ONLY __stateAdapterBrand returns state", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(
      makePortEntry("StateOnly", { [__stateAdapterBrand]: true }, makeStateSnapshot("StateOnly"))
    );

    const ports = inspector.listStatePorts();
    expect(ports[0]?.kind).toBe("state");
  });

  it("adapter with no brand returns state (default fallback)", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(makePortEntry("NoBrand", {}, makeStateSnapshot("NoBrand")));

    const ports = inspector.listStatePorts();
    expect(ports[0]?.kind).toBe("state");
  });
});

// =============================================================================
// SubscriberGraph classifyAdapter — individual brand verification
// =============================================================================

describe("SubscriberGraph classifyAdapter — individual brand verification", () => {
  it("atom brand returns atom kind", () => {
    const graph = buildSubscriberGraph([
      {
        portName: "A",
        adapter: { [__atomAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 1,
      },
    ]);
    expect(graph.nodes[0]?.kind).toBe("atom");
  });

  it("derived brand returns derived kind", () => {
    const graph = buildSubscriberGraph([
      {
        portName: "D",
        adapter: { [__derivedAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 0,
      },
    ]);
    expect(graph.nodes[0]?.kind).toBe("derived");
  });

  it("async-derived brand returns async-derived kind", () => {
    const graph = buildSubscriberGraph([
      {
        portName: "AD",
        adapter: { [__asyncDerivedAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 0,
      },
    ]);
    expect(graph.nodes[0]?.kind).toBe("async-derived");
  });

  it("linked-derived brand returns derived kind", () => {
    const graph = buildSubscriberGraph([
      {
        portName: "LD",
        adapter: { [__linkedDerivedAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 0,
      },
    ]);
    expect(graph.nodes[0]?.kind).toBe("derived");
  });

  it("state brand returns state kind", () => {
    const graph = buildSubscriberGraph([
      {
        portName: "S",
        adapter: { [__stateAdapterBrand]: true },
        requires: [],
        writesTo: [],
        subscriberCount: 0,
      },
    ]);
    expect(graph.nodes[0]?.kind).toBe("state");
  });

  it("non-derived adapter with requirements creates subscribes-to edges", () => {
    const graph = buildSubscriberGraph([
      {
        portName: "State1",
        adapter: { [__stateAdapterBrand]: true },
        requires: ["External"],
        writesTo: [],
        subscriberCount: 0,
      },
    ]);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]?.type).toBe("subscribes-to");
    expect(graph.edges[0]?.from).toBe("State1");
    expect(graph.edges[0]?.to).toBe("External");
  });

  it("atom adapter with requirements creates subscribes-to edges (not derives-from)", () => {
    const graph = buildSubscriberGraph([
      {
        portName: "Atom1",
        adapter: { [__atomAdapterBrand]: true },
        requires: ["Source"],
        writesTo: [],
        subscriberCount: 0,
      },
    ]);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]?.type).toBe("subscribes-to");
  });
});

// =============================================================================
// SubscriberGraph correlationId uniqueness
// =============================================================================

describe("SubscriberGraph correlationId", () => {
  it("consecutive graphs have unique correlationIds", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const graph = buildSubscriberGraph([]);
      ids.add(graph.correlationId);
    }
    expect(ids.size).toBe(10);
  });

  it("correlationId contains incrementing counter", () => {
    const graph1 = buildSubscriberGraph([]);
    const graph2 = buildSubscriberGraph([]);
    // Both have format "graph-<timestamp>-<counter>"
    const counter1 = Number(graph1.correlationId.split("-").pop());
    const counter2 = Number(graph2.correlationId.split("-").pop());
    expect(counter2).toBe(counter1 + 1);
  });
});

// =============================================================================
// ActionHistory — Math.random exact boundary
// =============================================================================

describe("ActionHistory — Math.random exact boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Math.random returns exactly samplingRate → NOT recorded (< not <=)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 0.5 });

    // First entry always recorded (seenCount=0)
    history.record(makeEntry({ id: "first" }));
    // Second entry: Math.random() returns 0.5, rate=0.5, 0.5 < 0.5 is false → NOT recorded
    const recorded = history.record(makeEntry({ id: "second" }));
    expect(recorded).toBe(false);
    expect(history.size).toBe(1);
  });

  it("Math.random returns just below samplingRate → recorded", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.499);
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 0.5 });

    history.record(makeEntry({ id: "first" }));
    const recorded = history.record(makeEntry({ id: "second" }));
    expect(recorded).toBe(true);
    expect(history.size).toBe(2);
  });
});

// =============================================================================
// ActionHistory — matchesFilter field comparison
// =============================================================================

describe("ActionHistory — matchesFilter field comparison", () => {
  it("portName filter matches exact portName", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ portName: "Counter" }));
    history.record(makeEntry({ portName: "Theme" }));

    const entries = history.query({ portName: "Counter" });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.portName).toBe("Counter");
  });

  it("actionName filter matches exact actionName", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ actionName: "increment" }));
    history.record(makeEntry({ actionName: "decrement" }));

    const entries = history.query({ actionName: "increment" });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.actionName).toBe("increment");
  });

  it("effectStatus filter matches exact effectStatus", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ effectStatus: "none" }));
    history.record(makeEntry({ effectStatus: "pending" }));
    history.record(makeEntry({ effectStatus: "failed" }));

    const entries = history.query({ effectStatus: "pending" });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.effectStatus).toBe("pending");
  });

  it("traceId filter matches exact traceId", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ traceId: "trace-abc" }));
    history.record(makeEntry({ traceId: "trace-xyz" }));

    const entries = history.query({ traceId: "trace-abc" });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.traceId).toBe("trace-abc");
  });

  it("limit restricts result count from the end", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "a" }));
    history.record(makeEntry({ id: "b" }));
    history.record(makeEntry({ id: "c" }));
    history.record(makeEntry({ id: "d" }));

    const entries = history.query({ limit: 2 });
    expect(entries).toHaveLength(2);
    expect(entries[0]?.id).toBe("c");
    expect(entries[1]?.id).toBe("d");
  });
});

// =============================================================================
// ActionHistory — seenCount after clear
// =============================================================================

describe("ActionHistory — seenCount after clear", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clear resets seenCount so first entry after clear is always recorded", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 0.01 });

    // First entry always recorded (seenCount=0)
    history.record(makeEntry({ id: "before-clear" }));
    expect(history.size).toBe(1);

    // Second entry: 0.99 < 0.01 is false → NOT recorded
    history.record(makeEntry({ id: "skipped" }));
    expect(history.size).toBe(1);

    // Clear resets seenCount to 0
    history.clear();
    expect(history.size).toBe(0);

    // First entry after clear: seenCount=0 → always recorded
    const recorded = history.record(makeEntry({ id: "after-clear" }));
    expect(recorded).toBe(true);
    expect(history.size).toBe(1);
  });
});

// =============================================================================
// ActionHistory — maxEntries eviction
// =============================================================================

describe("ActionHistory — maxEntries eviction", () => {
  it("evicts oldest entries when size exceeds maxEntries", () => {
    const history = createActionHistory({ maxEntries: 3, mode: "full" });

    history.record(makeEntry({ id: "a" }));
    history.record(makeEntry({ id: "b" }));
    history.record(makeEntry({ id: "c" }));
    expect(history.size).toBe(3);

    history.record(makeEntry({ id: "d" }));
    expect(history.size).toBe(3); // "a" evicted
    const entries = history.query();
    expect(entries[0]?.id).toBe("b");
    expect(entries[2]?.id).toBe("d");
  });

  it("eviction via while loop: adding 2 over limit evicts 2", () => {
    const history = createActionHistory({ maxEntries: 2, mode: "full" });

    history.record(makeEntry({ id: "1" }));
    history.record(makeEntry({ id: "2" }));
    history.record(makeEntry({ id: "3" }));
    history.record(makeEntry({ id: "4" }));

    expect(history.size).toBe(2);
    const entries = history.query();
    expect(entries[0]?.id).toBe("3");
    expect(entries[1]?.id).toBe("4");
  });
});

// =============================================================================
// ActionHistory — alwaysRecord overrides
// =============================================================================

describe("ActionHistory — alwaysRecord overrides", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("alwaysRecord.effectStatus bypasses sampling", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0.01,
      alwaysRecord: { effectStatus: ["failed"] },
    });

    // First always recorded
    history.record(makeEntry({ id: "first", effectStatus: "none" }));
    // Second: sampling would skip (0.99 < 0.01 = false), but effectStatus=failed overrides
    const recorded = history.record(makeEntry({ id: "second", effectStatus: "failed" }));
    expect(recorded).toBe(true);
    expect(history.size).toBe(2);
  });

  it("alwaysRecord.portNames bypasses sampling", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0.01,
      alwaysRecord: { portNames: ["Counter"] },
    });

    history.record(makeEntry({ id: "first", portName: "Other" }));
    const recorded = history.record(makeEntry({ id: "second", portName: "Counter" }));
    expect(recorded).toBe(true);
    expect(history.size).toBe(2);
  });

  it("alwaysRecord.actionNames bypasses sampling", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0.01,
      alwaysRecord: { actionNames: ["increment"] },
    });

    history.record(makeEntry({ id: "first", actionName: "other" }));
    const recorded = history.record(makeEntry({ id: "second", actionName: "increment" }));
    expect(recorded).toBe(true);
    expect(history.size).toBe(2);
  });

  it("alwaysRecord.effectStatus does NOT bypass if entry effectStatus doesn't match", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0.01,
      alwaysRecord: { effectStatus: ["failed"] },
    });

    history.record(makeEntry({ id: "first" }));
    // effectStatus is "none", not "failed" → alwaysRecord doesn't apply
    const recorded = history.record(makeEntry({ id: "second", effectStatus: "none" }));
    expect(recorded).toBe(false);
  });
});

// =============================================================================
// StoreInspector DEFAULT_HISTORY_CONFIG verification
// =============================================================================

describe("StoreInspector DEFAULT_HISTORY_CONFIG", () => {
  it("default mode is full (prevState preserved)", () => {
    const inspector = createStoreInspectorImpl(); // No config → uses defaults
    const entry = makeEntry({ prevState: { count: 0 }, nextState: { count: 1 } });
    inspector.recordAction(entry);

    const history = inspector.getActionHistory();
    expect(history[0]?.prevState).toEqual({ count: 0 });
    expect(history[0]?.nextState).toEqual({ count: 1 });
  });

  it("default maxEntries is 1000 (can store up to 1000)", () => {
    const inspector = createStoreInspectorImpl();

    for (let i = 0; i < 1001; i++) {
      inspector.recordAction(makeEntry({ id: `entry-${i}` }));
    }

    const history = inspector.getActionHistory();
    expect(history).toHaveLength(1000);
    // First entry (entry-0) should have been evicted
    expect(history[0]?.id).toBe("entry-1");
    expect(history[999]?.id).toBe("entry-1000");
  });

  it("default samplingRate is 1 (all entries recorded)", () => {
    const inspector = createStoreInspectorImpl();

    for (let i = 0; i < 50; i++) {
      const recorded = inspector.actionHistory.record(makeEntry({ id: `e-${i}` }));
      expect(recorded).toBe(true);
    }
    expect(inspector.getActionHistory()).toHaveLength(50);
  });
});

// =============================================================================
// ActionHistory — mode=off returns false
// =============================================================================

describe("ActionHistory — mode=off", () => {
  it("record returns false in off mode", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "off" });
    const recorded = history.record(makeEntry());
    expect(recorded).toBe(false);
    expect(history.size).toBe(0);
  });
});

// =============================================================================
// ActionHistory — lightweight vs full mode
// =============================================================================

describe("ActionHistory — lightweight mode strips prevState/nextState", () => {
  it("lightweight mode: prevState and nextState are undefined", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "lightweight" });
    history.record(makeEntry({ prevState: { count: 0 }, nextState: { count: 1 } }));

    const entries = history.query();
    expect(entries[0]?.prevState).toBeUndefined();
    expect(entries[0]?.nextState).toBeUndefined();
  });

  it("full mode: prevState and nextState are preserved", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ prevState: { count: 0 }, nextState: { count: 1 } }));

    const entries = history.query();
    expect(entries[0]?.prevState).toEqual({ count: 0 });
    expect(entries[0]?.nextState).toEqual({ count: 1 });
  });
});

// =============================================================================
// ActionHistory — query() defensive copy (kills entries.slice() → entries)
// =============================================================================

describe("ActionHistory — query defensive copy", () => {
  it("query() without filter returns a copy (modifying result does not affect internal state)", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "a" }));
    history.record(makeEntry({ id: "b" }));

    const result1 = history.query();
    expect(result1).toHaveLength(2);

    // Mutate the returned array (cast away readonly for test)
    (result1 as ActionHistoryEntry[]).length = 0;

    // Query again — internal entries should not be affected
    const result2 = history.query();
    expect(result2).toHaveLength(2);
    expect(history.size).toBe(2);
  });

  it("query() without filter: pushing to result does not affect internal state", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "x" }));

    const result = history.query();
    (result as ActionHistoryEntry[]).push(makeEntry({ id: "injected" }));

    expect(history.size).toBe(1);
    expect(history.query()).toHaveLength(1);
  });
});

// =============================================================================
// ActionHistory — filter without traceId on entries with traceIds
// (kills filter.traceId !== undefined → true)
// =============================================================================

describe("ActionHistory — traceId filter undefined does not exclude traced entries", () => {
  it("filter by portName on entries WITH traceIds: entries not excluded by traceId check", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ portName: "Counter", traceId: "trace-1" }));
    history.record(makeEntry({ portName: "Counter", traceId: "trace-2" }));
    history.record(makeEntry({ portName: "Theme", traceId: "trace-3" }));

    // Filter by portName only. traceId is undefined in the filter.
    // With mutation (traceId !== undefined → true), entries with traceIds would be incorrectly excluded.
    const entries = history.query({ portName: "Counter" });
    expect(entries).toHaveLength(2);
    expect(entries[0]?.traceId).toBe("trace-1");
    expect(entries[1]?.traceId).toBe("trace-2");
  });

  it("filter by actionName on entries WITH traceIds: entries not excluded", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ actionName: "increment", traceId: "t-a" }));
    history.record(makeEntry({ actionName: "decrement", traceId: "t-b" }));

    const entries = history.query({ actionName: "increment" });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.traceId).toBe("t-a");
  });
});

// =============================================================================
// SubscriberGraph correlationId counter direction
// (kills _correlationCounter++ → _correlationCounter--)
// =============================================================================

describe("SubscriberGraph correlationId counter direction", () => {
  it("correlationId counter increases (not decreases) between consecutive calls", () => {
    const g1 = buildSubscriberGraph([]);
    const g2 = buildSubscriberGraph([]);

    // Extract counter using regex that correctly handles negative numbers
    // Format: "graph-<timestamp>-<counter>" where counter can be negative
    const extractCounter = (id: string): number => {
      const match = id.match(/graph-\d+-(-?\d+)$/);
      return Number(match?.[1]);
    };

    const c1 = extractCounter(g1.correlationId);
    const c2 = extractCounter(g2.correlationId);
    // With increment: c2 = c1 + 1 (positive delta)
    // With decrement: c2 = c1 - 1 (negative delta)
    expect(c2 - c1).toBe(1);
  });
});

// =============================================================================
// Dual-brand adapter: __stateAdapterBrand first-match wins
// (kills __stateAdapterBrand in adapter → false)
// =============================================================================

describe("Dual-brand adapter classification — first match wins", () => {
  it("subscriber-graph: adapter with BOTH state and atom brands returns state (not atom)", () => {
    const dualBrand = { [__stateAdapterBrand]: true, [__atomAdapterBrand]: true };
    const graph = buildSubscriberGraph([
      { portName: "Dual", adapter: dualBrand, requires: [], writesTo: [], subscriberCount: 0 },
    ]);
    // With __stateAdapterBrand check → false mutation, would fall through to atom
    expect(graph.nodes[0]?.kind).toBe("state");
  });

  it("store-inspector: adapter with BOTH state and atom brands returns state (not atom)", () => {
    const inspector = createStoreInspectorImpl();
    const dualBrand = { [__stateAdapterBrand]: true, [__atomAdapterBrand]: true };
    inspector.registerPort(makePortEntry("Dual", dualBrand, makeStateSnapshot("Dual")));

    const ports = inspector.listStatePorts();
    expect(ports[0]?.kind).toBe("state");
  });

  it("subscriber-graph: adapter with state + derived brands returns state", () => {
    const dualBrand = { [__stateAdapterBrand]: true, [__derivedAdapterBrand]: true };
    const graph = buildSubscriberGraph([
      { portName: "Mixed", adapter: dualBrand, requires: [], writesTo: [], subscriberCount: 0 },
    ]);
    expect(graph.nodes[0]?.kind).toBe("state");
  });

  it("store-inspector: adapter with state + async-derived brands returns state", () => {
    const inspector = createStoreInspectorImpl();
    const dualBrand = { [__stateAdapterBrand]: true, [__asyncDerivedAdapterBrand]: true };
    inspector.registerPort(makePortEntry("Mixed", dualBrand, makeStateSnapshot("Mixed")));

    const ports = inspector.listStatePorts();
    expect(ports[0]?.kind).toBe("state");
  });
});

// =============================================================================
// ActionHistory — limit filter boundary (kills limit !== undefined → === undefined,
// limit >= 0 → > 0, and whole condition → true/false)
// =============================================================================

describe("ActionHistory — limit filter mutations", () => {
  it("limit: 2 on 5 entries returns last 2 (kills limit !== undefined → === undefined)", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    for (let i = 0; i < 5; i++) {
      history.record(makeEntry({ id: `e-${i}` }));
    }
    expect(history.size).toBe(5);

    const result = history.query({ limit: 2 });
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("e-3");
    expect(result[1]?.id).toBe("e-4");
  });

  it("limit: 1 returns only the last entry", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "first" }));
    history.record(makeEntry({ id: "second" }));
    history.record(makeEntry({ id: "third" }));

    const result = history.query({ limit: 1 });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("third");
  });

  it("limit with portName filter: applies limit AFTER filter", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "c-1", portName: "Counter" }));
    history.record(makeEntry({ id: "t-1", portName: "Theme" }));
    history.record(makeEntry({ id: "c-2", portName: "Counter" }));
    history.record(makeEntry({ id: "t-2", portName: "Theme" }));
    history.record(makeEntry({ id: "c-3", portName: "Counter" }));

    // Filter by Counter (3 entries), then limit to 2
    const result = history.query({ portName: "Counter", limit: 2 });
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("c-2");
    expect(result[1]?.id).toBe("c-3");
  });

  it("no limit filter: all matching entries returned (kills matchesFilter → false)", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "a", portName: "Counter" }));
    history.record(makeEntry({ id: "b", portName: "Counter" }));
    history.record(makeEntry({ id: "c", portName: "Theme" }));

    // Filter by Counter, no limit
    const result = history.query({ portName: "Counter" });
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("a");
    expect(result[1]?.id).toBe("b");
  });
});

// =============================================================================
// ActionHistory — samplingRate: 0 records nothing
// (kills rate >= 1 → true via ConditionalExpression)
// =============================================================================

describe("ActionHistory — samplingRate boundary", () => {
  it("samplingRate: 0 records nothing (kills rate >= 1 → true)", () => {
    const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 0 });
    history.record(makeEntry({ id: "a" }));
    history.record(makeEntry({ id: "b" }));
    history.record(makeEntry({ id: "c" }));

    // samplingRate: 0 → rate <= 0 → return false → nothing recorded
    // With mutant (rate >= 1 → true): always records → size would be 3
    expect(history.size).toBe(0);
  });

  it("since filter: entries before timestamp are excluded", () => {
    // Kills: action-history.ts:82 ConditionalExpression → true
    // The mutation makes `entry.timestamp < filter.since` always true,
    // filtering out ALL entries regardless of timestamp.
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "old", timestamp: 500 }));
    history.record(makeEntry({ id: "mid", timestamp: 1000 }));
    history.record(makeEntry({ id: "new", timestamp: 1500 }));

    // since=800 should exclude only the entry at 500
    const entries = history.query({ since: 800 });
    expect(entries).toHaveLength(2);
    expect(entries[0]?.id).toBe("mid");
    expect(entries[1]?.id).toBe("new");
  });

  it("until filter: entries after timestamp are excluded", () => {
    // Kills: action-history.ts:83 ConditionalExpression → true
    // The mutation makes `entry.timestamp > filter.until` always true,
    // filtering out ALL entries.
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "old", timestamp: 500 }));
    history.record(makeEntry({ id: "mid", timestamp: 1000 }));
    history.record(makeEntry({ id: "new", timestamp: 1500 }));

    // until=1200 should exclude only the entry at 1500
    const entries = history.query({ until: 1200 });
    expect(entries).toHaveLength(2);
    expect(entries[0]?.id).toBe("old");
    expect(entries[1]?.id).toBe("mid");
  });

  it("negative limit: returns ALL entries (limit < 0 skips slicing)", () => {
    // Targets mutation: `&&` → `||` at action-history.ts:141
    // With `&&`: `filter.limit !== undefined && filter.limit >= 0` — for limit=-1:
    //   limit !== undefined → true, limit >= 0 → false, AND → false → no slicing → all entries
    // With `||`: `filter.limit !== undefined || filter.limit >= 0` — for limit=-1:
    //   limit !== undefined → true, OR short-circuits → true → slice(-1) → last entry only
    const history = createActionHistory({ maxEntries: 100, mode: "full" });
    history.record(makeEntry({ id: "a" }));
    history.record(makeEntry({ id: "b" }));
    history.record(makeEntry({ id: "c" }));

    const result = history.query({ limit: -1 });
    // With real code (&&): condition is false, no slicing, returns all 3
    // With mutant (||): condition is true, slice(-1) returns only last entry
    expect(result).toHaveLength(3);
    expect(result[0]?.id).toBe("a");
    expect(result[2]?.id).toBe("c");
  });

  it("samplingRate: 0.5 records approximately half (via Math.random)", () => {
    // Mock Math.random to make deterministic
    const origRandom = Math.random;
    let callIdx = 0;
    // Return alternating values: 0.3 (< 0.5, recorded), 0.7 (>= 0.5, not recorded)
    Math.random = () => {
      callIdx++;
      return callIdx % 2 === 1 ? 0.3 : 0.7;
    };

    try {
      const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 0.5 });
      // First entry: seenCount=0, always recorded (line 71)
      history.record(makeEntry({ id: "e-0" }));
      // Second: seenCount=1, Math.random()=0.3 < 0.5 → recorded
      history.record(makeEntry({ id: "e-1" }));
      // Third: seenCount=2, Math.random()=0.7 >= 0.5 → NOT recorded
      history.record(makeEntry({ id: "e-2" }));
      // Fourth: seenCount=3, Math.random()=0.3 < 0.5 → recorded
      history.record(makeEntry({ id: "e-3" }));

      expect(history.size).toBe(3); // entries 0, 1, 3 recorded; 2 skipped
    } finally {
      Math.random = origRandom;
    }
  });
});

// =============================================================================
// StoreInspectorAdapter frozen singleton
// =============================================================================

describe("StoreInspectorAdapter frozen singleton", () => {
  it("is frozen (Object.isFrozen)", () => {
    expect(Object.isFrozen(StoreInspectorAdapter)).toBe(true);
  });

  it("has correct provides (StoreInspectorPort)", () => {
    expect(StoreInspectorAdapter.provides).toBeDefined();
  });

  it("has correct requires (empty array)", () => {
    expect(StoreInspectorAdapter.requires).toEqual([]);
  });

  it("has lifetime: singleton", () => {
    expect(StoreInspectorAdapter.lifetime).toBe("singleton");
  });

  it("has factoryKind: sync", () => {
    expect(StoreInspectorAdapter.factoryKind).toBe("sync");
  });

  it("has clonable: false", () => {
    expect(StoreInspectorAdapter.clonable).toBe(false);
  });

  it("factory returns a working StoreInspectorAPI", () => {
    const api = StoreInspectorAdapter.factory({});

    expect(typeof api.getSnapshot).toBe("function");
    expect(typeof api.getPortState).toBe("function");
    expect(typeof api.listStatePorts).toBe("function");
    expect(typeof api.getSubscriberGraph).toBe("function");
    expect(typeof api.getActionHistory).toBe("function");
    expect(typeof api.subscribe).toBe("function");

    const snapshot = api.getSnapshot();
    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.ports).toHaveLength(0);
  });

  it("each factory call returns a new instance", () => {
    const api1 = StoreInspectorAdapter.factory({});
    const api2 = StoreInspectorAdapter.factory({});
    expect(api1).not.toBe(api2);
  });
});
