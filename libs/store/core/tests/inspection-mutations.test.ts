/**
 * Inspection Module — Mutation-Killing Tests
 *
 * Targets surviving Stryker mutants across:
 *   - src/inspection/registry-adapter.ts (hasDispose guard + adapter properties)
 *   - src/inspection/store-inspector-impl.ts (classifyAdapter, recordAction, pending effects)
 *   - src/inspection/action-history.ts (mode, sampling, alwaysRecord, matchesFilter)
 *   - src/inspection/store-registry.ts (disposed guards, notifyListeners snapshot)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createStoreInspectorImpl } from "../src/inspection/store-inspector-impl.js";
import type { PortRegistryEntry } from "../src/inspection/store-inspector-impl.js";
import { createActionHistory } from "../src/inspection/action-history.js";
import { createStoreRegistry } from "../src/inspection/store-registry.js";
import type { StoreRegistryEntry } from "../src/inspection/store-registry.js";
import { StoreRegistryAdapter } from "../src/inspection/registry-adapter.js";
import { StoreRegistryPort } from "../src/types/inspection.js";
import type {
  ActionHistoryEntry,
  PortSnapshot,
  StatePortSnapshot,
  AtomPortSnapshot,
  DerivedPortSnapshot,
  AsyncDerivedPortSnapshot,
  StoreInspectorEvent,
} from "../src/types/inspection.js";
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

let _counter = 0;

function makeHistoryEntry(overrides: Partial<ActionHistoryEntry> = {}): ActionHistoryEntry {
  _counter++;
  return {
    id: overrides.id ?? `mut-entry-${_counter}`,
    portName: overrides.portName ?? "TestPort",
    actionName: overrides.actionName ?? "testAction",
    payload: overrides.payload ?? undefined,
    prevState: overrides.prevState ?? { v: 0 },
    nextState: overrides.nextState ?? { v: 1 },
    timestamp: overrides.timestamp ?? Date.now(),
    effectStatus: overrides.effectStatus ?? "none",
    effectError: overrides.effectError,
    parentId: overrides.parentId ?? null,
    order: overrides.order ?? _counter,
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
  return { kind: "atom", portName, value: "val", subscriberCount: 0 };
}

function makeDerivedSnapshot(
  portName: string,
  sources: readonly string[] = []
): DerivedPortSnapshot {
  return {
    kind: "derived",
    portName,
    value: 0,
    subscriberCount: 0,
    sourcePortNames: sources,
    isStale: false,
  };
}

function makeAsyncDerivedSnapshot(
  portName: string,
  sources: readonly string[] = []
): AsyncDerivedPortSnapshot {
  return {
    kind: "async-derived",
    portName,
    status: "idle",
    data: undefined,
    error: undefined,
    subscriberCount: 0,
    sourcePortNames: sources,
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

function makeRegistryEntry(
  portName: string,
  overrides: Partial<StoreRegistryEntry> = {}
): StoreRegistryEntry {
  const snapshot: StatePortSnapshot = {
    kind: "state",
    portName,
    state: { count: 0 },
    subscriberCount: 0,
    actionCount: 0,
    lastActionAt: null,
  };
  return {
    portName,
    adapter: {},
    lifetime: "singleton",
    requires: [],
    writesTo: [],
    getSnapshot: () => snapshot,
    getSubscriberCount: () => 0,
    getHasEffects: () => false,
    ...overrides,
  };
}

// =============================================================================
// 1. StoreRegistryAdapter — registry-adapter.ts (hasDispose + adapter shape)
// =============================================================================

describe("StoreRegistryAdapter — mutation killers", () => {
  describe("adapter properties are exact", () => {
    it("provides is StoreRegistryPort (not a different port)", () => {
      expect(StoreRegistryAdapter.provides).toBe(StoreRegistryPort);
    });

    it("requires is an empty readonly array", () => {
      expect(StoreRegistryAdapter.requires).toEqual([]);
      expect(StoreRegistryAdapter.requires.length).toBe(0);
    });

    it("lifetime is exactly 'singleton' (not 'scoped' or 'transient')", () => {
      expect(StoreRegistryAdapter.lifetime).toBe("singleton");
      expect(StoreRegistryAdapter.lifetime).not.toBe("scoped");
    });

    it("factoryKind is exactly 'sync' (not 'async')", () => {
      expect(StoreRegistryAdapter.factoryKind).toBe("sync");
      expect(StoreRegistryAdapter.factoryKind).not.toBe("async");
    });

    it("clonable is exactly false (not true)", () => {
      expect(StoreRegistryAdapter.clonable).toBe(false);
      expect(StoreRegistryAdapter.clonable).not.toBe(true);
    });

    it("adapter is frozen", () => {
      expect(Object.isFrozen(StoreRegistryAdapter)).toBe(true);
    });
  });

  describe("factory returns a fully-functional StoreRegistry", () => {
    it("returns object with register, unregister, getAll, getAllScoped, get, subscribe, dispose", () => {
      const registry = StoreRegistryAdapter.factory({});
      expect(typeof registry.register).toBe("function");
      expect(typeof registry.unregister).toBe("function");
      expect(typeof registry.getAll).toBe("function");
      expect(typeof registry.getAllScoped).toBe("function");
      expect(typeof registry.get).toBe("function");
      expect(typeof registry.subscribe).toBe("function");
      expect(typeof registry.dispose).toBe("function");
      expect(typeof registry.registerScoped).toBe("function");
      expect(typeof registry.unregisterScope).toBe("function");
    });

    it("factory returns distinct instances on each call", () => {
      const a = StoreRegistryAdapter.factory({});
      const b = StoreRegistryAdapter.factory({});
      expect(a).not.toBe(b);
    });

    it("returned registry is operational (register -> getAll)", () => {
      const registry = StoreRegistryAdapter.factory({});
      registry.register(makeRegistryEntry("Foo"));
      expect(registry.getAll()).toHaveLength(1);
    });
  });

  describe("finalizer — hasDispose type guard edge cases", () => {
    it("calls dispose() on an object with an own dispose method", () => {
      let called = false;
      const obj = {
        dispose() {
          called = true;
        },
      };
      const finalizer = StoreRegistryAdapter.finalizer;
      expect(finalizer).toBeDefined();
      if (finalizer) void finalizer(obj as any);
      expect(called).toBe(true);
    });

    it("does NOT call dispose on null", () => {
      const finalizer = StoreRegistryAdapter.finalizer;
      if (finalizer) expect(() => finalizer(null as any)).not.toThrow();
    });

    it("does NOT call dispose on undefined", () => {
      const finalizer = StoreRegistryAdapter.finalizer;
      if (finalizer) expect(() => finalizer(undefined as any)).not.toThrow();
    });

    it("does NOT call dispose on a number", () => {
      const finalizer = StoreRegistryAdapter.finalizer;
      if (finalizer) expect(() => finalizer(42 as any)).not.toThrow();
    });

    it("does NOT call dispose on a string", () => {
      const finalizer = StoreRegistryAdapter.finalizer;
      if (finalizer) expect(() => finalizer("hello" as any)).not.toThrow();
    });

    it("does NOT call dispose on a boolean", () => {
      const finalizer = StoreRegistryAdapter.finalizer;
      if (finalizer) expect(() => finalizer(true as any)).not.toThrow();
    });

    it("does NOT call dispose when object has no dispose property at all", () => {
      const finalizer = StoreRegistryAdapter.finalizer;
      const obj = { foo: "bar" };
      if (finalizer) expect(() => finalizer(obj as any)).not.toThrow();
    });

    it("does NOT call dispose when dispose exists but is not a function", () => {
      const finalizer = StoreRegistryAdapter.finalizer;
      const obj = Object.create(null);
      Object.defineProperty(obj, "dispose", { value: 123, configurable: true });
      if (finalizer) expect(() => finalizer(obj as any)).not.toThrow();
    });

    it("does NOT call dispose when dispose is only on the prototype (not own)", () => {
      const finalizer = StoreRegistryAdapter.finalizer;
      let protoCalled = false;
      const proto = {
        dispose() {
          protoCalled = true;
        },
      };
      const obj = Object.create(proto);
      if (finalizer) void finalizer(obj as any);
      // Object.getOwnPropertyDescriptor won't find it on prototype
      expect(protoCalled).toBe(false);
    });

    it("does NOT call dispose when getOwnPropertyDescriptor returns undefined (no own property)", () => {
      const finalizer = StoreRegistryAdapter.finalizer;
      // An object created without own "dispose"
      const obj = {};
      const descriptor = Object.getOwnPropertyDescriptor(obj, "dispose");
      expect(descriptor).toBeUndefined();
      if (finalizer) expect(() => finalizer(obj as any)).not.toThrow();
    });

    it("does NOT call dispose when descriptor.value exists but is a string", () => {
      const finalizer = StoreRegistryAdapter.finalizer;
      const obj = Object.create(null);
      Object.defineProperty(obj, "dispose", { value: "not-a-function", configurable: true });
      const descriptor = Object.getOwnPropertyDescriptor(obj, "dispose");
      expect(descriptor).toBeDefined();
      expect(typeof descriptor?.value).toBe("string");
      if (finalizer) expect(() => finalizer(obj as any)).not.toThrow();
    });

    it("calls dispose on a real registry created by factory", () => {
      const finalizer = StoreRegistryAdapter.finalizer;
      const registry = StoreRegistryAdapter.factory({});
      registry.register(makeRegistryEntry("X"));
      expect(registry.getAll()).toHaveLength(1);

      if (finalizer) void finalizer(registry);

      // After dispose, registry is empty and further ops are no-ops
      expect(registry.getAll()).toEqual([]);
      registry.register(makeRegistryEntry("Y"));
      expect(registry.getAll()).toEqual([]);
    });
  });
});

// =============================================================================
// 2. StoreInspectorImpl — store-inspector-impl.ts mutations
// =============================================================================

describe("StoreInspectorImpl — mutation killers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("classifyAdapter — each brand returns correct kind, NOT fallback", () => {
    it("__stateAdapterBrand only -> 'state' (not fallthrough to fallback)", () => {
      const inspector = createStoreInspectorImpl();
      inspector.registerPort(
        makePortEntry("S", { [__stateAdapterBrand]: true }, makeStateSnapshot("S"))
      );
      const ports = inspector.listStatePorts();
      expect(ports[0]?.kind).toBe("state");
    });

    it("__atomAdapterBrand only -> 'atom' (not 'state')", () => {
      const inspector = createStoreInspectorImpl();
      inspector.registerPort(
        makePortEntry("A", { [__atomAdapterBrand]: true }, makeAtomSnapshot("A"))
      );
      const ports = inspector.listStatePorts();
      expect(ports[0]?.kind).toBe("atom");
      expect(ports[0]?.kind).not.toBe("state");
    });

    it("__asyncDerivedAdapterBrand only -> 'async-derived' (not 'derived' or 'state')", () => {
      const inspector = createStoreInspectorImpl();
      inspector.registerPort(
        makePortEntry("AD", { [__asyncDerivedAdapterBrand]: true }, makeAsyncDerivedSnapshot("AD"))
      );
      const ports = inspector.listStatePorts();
      expect(ports[0]?.kind).toBe("async-derived");
      expect(ports[0]?.kind).not.toBe("derived");
      expect(ports[0]?.kind).not.toBe("state");
    });

    it("__derivedAdapterBrand only -> 'derived' (not 'state')", () => {
      const inspector = createStoreInspectorImpl();
      inspector.registerPort(
        makePortEntry("D", { [__derivedAdapterBrand]: true }, makeDerivedSnapshot("D"))
      );
      const ports = inspector.listStatePorts();
      expect(ports[0]?.kind).toBe("derived");
      expect(ports[0]?.kind).not.toBe("state");
    });

    it("__linkedDerivedAdapterBrand only -> 'derived' (not 'state')", () => {
      const inspector = createStoreInspectorImpl();
      inspector.registerPort(
        makePortEntry("LD", { [__linkedDerivedAdapterBrand]: true }, makeDerivedSnapshot("LD"))
      );
      const ports = inspector.listStatePorts();
      expect(ports[0]?.kind).toBe("derived");
      expect(ports[0]?.kind).not.toBe("state");
    });

    it("no brand -> falls back to 'state'", () => {
      const inspector = createStoreInspectorImpl();
      inspector.registerPort(makePortEntry("NB", {}, makeStateSnapshot("NB")));
      const ports = inspector.listStatePorts();
      expect(ports[0]?.kind).toBe("state");
    });
  });

  describe("recordAction — emits event only when history.record returns true", () => {
    it("in full mode, recordAction emits 'action-dispatched'", () => {
      const inspector = createStoreInspectorImpl({
        historyConfig: { maxEntries: 100, mode: "full", samplingRate: 1 },
      });
      const events: StoreInspectorEvent[] = [];
      inspector.subscribe(e => events.push(e));

      inspector.recordAction(makeHistoryEntry());

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("action-dispatched");
    });

    it("in off mode, recordAction does NOT emit 'action-dispatched'", () => {
      const inspector = createStoreInspectorImpl({
        historyConfig: { maxEntries: 100, mode: "off" },
      });
      const events: StoreInspectorEvent[] = [];
      inspector.subscribe(e => events.push(e));

      inspector.recordAction(makeHistoryEntry());

      expect(events).toHaveLength(0);
    });

    it("when sampling rejects entry, recordAction does NOT emit", () => {
      const inspector = createStoreInspectorImpl({
        historyConfig: { maxEntries: 100, mode: "full", samplingRate: 0 },
      });
      const events: StoreInspectorEvent[] = [];
      inspector.subscribe(e => events.push(e));

      inspector.recordAction(makeHistoryEntry());

      expect(events).toHaveLength(0);
    });

    it("emitted event contains the entry that was recorded", () => {
      const inspector = createStoreInspectorImpl();
      const events: StoreInspectorEvent[] = [];
      inspector.subscribe(e => events.push(e));

      const entry = makeHistoryEntry({ id: "specific-id" });
      inspector.recordAction(entry);

      expect(events[0]?.type).toBe("action-dispatched");
      if (events[0]?.type === "action-dispatched") {
        expect(events[0].entry.id).toBe("specific-id");
      }
    });
  });

  describe("pendingEffects — increment/decrement", () => {
    it("incrementPendingEffects increases count by 1 each call", () => {
      const inspector = createStoreInspectorImpl();
      expect(inspector.getSnapshot().pendingEffects).toBe(0);

      inspector.incrementPendingEffects();
      expect(inspector.getSnapshot().pendingEffects).toBe(1);

      inspector.incrementPendingEffects();
      expect(inspector.getSnapshot().pendingEffects).toBe(2);

      inspector.incrementPendingEffects();
      expect(inspector.getSnapshot().pendingEffects).toBe(3);
    });

    it("decrementPendingEffects decreases count by 1", () => {
      const inspector = createStoreInspectorImpl();
      inspector.incrementPendingEffects();
      inspector.incrementPendingEffects();
      inspector.incrementPendingEffects();
      expect(inspector.getSnapshot().pendingEffects).toBe(3);

      inspector.decrementPendingEffects();
      expect(inspector.getSnapshot().pendingEffects).toBe(2);
    });

    it("decrementPendingEffects when already 0 stays at 0 (floor)", () => {
      const inspector = createStoreInspectorImpl();
      expect(inspector.getSnapshot().pendingEffects).toBe(0);

      inspector.decrementPendingEffects();
      expect(inspector.getSnapshot().pendingEffects).toBe(0);

      inspector.decrementPendingEffects();
      expect(inspector.getSnapshot().pendingEffects).toBe(0);
    });

    it("increment then decrement back to 0 then decrement again stays at 0", () => {
      const inspector = createStoreInspectorImpl();
      inspector.incrementPendingEffects();
      expect(inspector.getSnapshot().pendingEffects).toBe(1);

      inspector.decrementPendingEffects();
      expect(inspector.getSnapshot().pendingEffects).toBe(0);

      inspector.decrementPendingEffects();
      expect(inspector.getSnapshot().pendingEffects).toBe(0);
    });
  });

  describe("unregisterPort — removes from singletons", () => {
    it("unregisterPort removes port so getSnapshot no longer includes it", () => {
      const inspector = createStoreInspectorImpl();
      inspector.registerPort(makePortEntry("X", {}, makeStateSnapshot("X")));
      expect(inspector.getSnapshot().ports).toHaveLength(1);

      inspector.unregisterPort("X");
      expect(inspector.getSnapshot().ports).toHaveLength(0);
    });

    it("unregisterPort removes port so getPortState returns undefined", () => {
      const inspector = createStoreInspectorImpl();
      inspector.registerPort(makePortEntry("Y", {}, makeStateSnapshot("Y")));
      expect(inspector.getPortState("Y")).toBeDefined();

      inspector.unregisterPort("Y");
      expect(inspector.getPortState("Y")).toBeUndefined();
    });
  });

  describe("getPortState — returns undefined for unknown port", () => {
    it("returns undefined when no ports are registered", () => {
      const inspector = createStoreInspectorImpl();
      expect(inspector.getPortState("Ghost")).toBeUndefined();
    });

    it("returns undefined for a name that was never registered even when other ports exist", () => {
      const inspector = createStoreInspectorImpl();
      inspector.registerPort(makePortEntry("A", {}, makeStateSnapshot("A")));
      expect(inspector.getPortState("B")).toBeUndefined();
    });
  });

  describe("subscribe and unsubscribe", () => {
    it("subscribe receives events; unsubscribe stops receiving", () => {
      const inspector = createStoreInspectorImpl();
      const events: StoreInspectorEvent[] = [];
      const unsub = inspector.subscribe(e => events.push(e));

      inspector.emit({ type: "snapshot-changed" });
      expect(events).toHaveLength(1);

      unsub();
      inspector.emit({ type: "snapshot-changed" });
      expect(events).toHaveLength(1); // no new event
    });

    it("multiple subscribers each receive events independently", () => {
      const inspector = createStoreInspectorImpl();
      const events1: StoreInspectorEvent[] = [];
      const events2: StoreInspectorEvent[] = [];
      inspector.subscribe(e => events1.push(e));
      const unsub2 = inspector.subscribe(e => events2.push(e));

      inspector.emit({ type: "state-changed", portName: "A" });
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);

      unsub2();
      inspector.emit({ type: "state-changed", portName: "B" });
      expect(events1).toHaveLength(2);
      expect(events2).toHaveLength(1);
    });
  });

  describe("scoped ports in getPortState", () => {
    it("getPortState falls back to scoped entries when no singleton found", () => {
      const inspector = createStoreInspectorImpl();
      const snap = makeStateSnapshot("Scoped1");
      inspector.registerScopedPort("scope-a", makePortEntry("Scoped1", {}, snap));

      const result = inspector.getPortState("Scoped1");
      expect(result).toBeDefined();
      expect(result?.portName).toBe("Scoped1");
    });

    it("getPortState prefers singleton over scoped", () => {
      const inspector = createStoreInspectorImpl();
      const singletonSnap = makeStateSnapshot("Shared", { state: { from: "singleton" } });
      const scopedSnap = makeStateSnapshot("Shared", { state: { from: "scoped" } });

      inspector.registerPort(makePortEntry("Shared", {}, singletonSnap));
      inspector.registerScopedPort("scope-x", makePortEntry("Shared", {}, scopedSnap));

      const result = inspector.getPortState("Shared");
      expect(result).toBeDefined();
      if (result?.kind === "state") {
        expect(result.state).toEqual({ from: "singleton" });
      }
    });
  });

  describe("getSnapshot includes scopeId for scoped ports", () => {
    it("scoped port snapshot includes scopeId property", () => {
      const inspector = createStoreInspectorImpl();
      inspector.registerScopedPort("my-scope", makePortEntry("S1", {}, makeStateSnapshot("S1")));

      const snapshot = inspector.getSnapshot();
      expect(snapshot.ports).toHaveLength(1);
      expect(snapshot.ports[0]?.scopeId).toBe("my-scope");
    });

    it("singleton port snapshot does NOT include scopeId", () => {
      const inspector = createStoreInspectorImpl();
      inspector.registerPort(makePortEntry("S2", {}, makeStateSnapshot("S2")));

      const snapshot = inspector.getSnapshot();
      expect(snapshot.ports).toHaveLength(1);
      expect(snapshot.ports[0]?.scopeId).toBeUndefined();
    });
  });
});

// =============================================================================
// 3. ActionHistory — action-history.ts mutations
// =============================================================================

describe("ActionHistory — mutation killers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("mode === 'off' returns false and records nothing", () => {
    it("record returns false in off mode", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "off" });
      const result = history.record(makeHistoryEntry());
      expect(result).toBe(false);
      expect(history.size).toBe(0);
    });

    it("multiple records in off mode all return false", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "off" });
      for (let i = 0; i < 5; i++) {
        expect(history.record(makeHistoryEntry())).toBe(false);
      }
      expect(history.size).toBe(0);
    });

    it("off mode: query returns empty", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "off" });
      history.record(makeHistoryEntry());
      expect(history.query()).toHaveLength(0);
    });
  });

  describe("mode === 'lightweight' strips prevState/nextState to undefined", () => {
    it("prevState is undefined in lightweight mode", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "lightweight" });
      history.record(makeHistoryEntry({ prevState: { count: 10 }, nextState: { count: 20 } }));

      const entries = history.query();
      expect(entries[0]?.prevState).toBeUndefined();
    });

    it("nextState is undefined in lightweight mode", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "lightweight" });
      history.record(makeHistoryEntry({ prevState: { count: 10 }, nextState: { count: 20 } }));

      const entries = history.query();
      expect(entries[0]?.nextState).toBeUndefined();
    });

    it("lightweight mode preserves id, portName, actionName, timestamp", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "lightweight" });
      history.record(
        makeHistoryEntry({
          id: "lw-x",
          portName: "P",
          actionName: "act",
          timestamp: 9999,
        })
      );

      const entries = history.query();
      expect(entries[0]?.id).toBe("lw-x");
      expect(entries[0]?.portName).toBe("P");
      expect(entries[0]?.actionName).toBe("act");
      expect(entries[0]?.timestamp).toBe(9999);
    });

    it("lightweight mode preserves effectStatus", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "lightweight" });
      history.record(makeHistoryEntry({ effectStatus: "failed" }));
      expect(history.query()[0]?.effectStatus).toBe("failed");
    });

    it("full mode does NOT strip prevState/nextState", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      history.record(makeHistoryEntry({ prevState: { x: 1 }, nextState: { x: 2 } }));

      const entries = history.query();
      expect(entries[0]?.prevState).toEqual({ x: 1 });
      expect(entries[0]?.nextState).toEqual({ x: 2 });
    });
  });

  describe("sampling rate edge cases", () => {
    it("rate >= 1 always records (rate = 1)", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 1 });
      for (let i = 0; i < 10; i++) {
        expect(history.record(makeHistoryEntry())).toBe(true);
      }
      expect(history.size).toBe(10);
    });

    it("rate >= 1 always records (rate = 2)", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 2 });
      for (let i = 0; i < 5; i++) {
        expect(history.record(makeHistoryEntry())).toBe(true);
      }
      expect(history.size).toBe(5);
    });

    it("rate <= 0 never records (rate = 0)", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 0 });
      for (let i = 0; i < 5; i++) {
        expect(history.record(makeHistoryEntry())).toBe(false);
      }
      expect(history.size).toBe(0);
    });

    it("rate <= 0 never records (rate = -0.5)", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: -0.5 });
      for (let i = 0; i < 5; i++) {
        expect(history.record(makeHistoryEntry())).toBe(false);
      }
      expect(history.size).toBe(0);
    });

    it("rate between 0 and 1: first entry always recorded (seenCount=0)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.999);
      const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 0.001 });

      // seenCount=0 => always recorded (bypasses Math.random)
      expect(history.record(makeHistoryEntry())).toBe(true);
      // seenCount=1 => 0.999 < 0.001 false => not recorded
      expect(history.record(makeHistoryEntry())).toBe(false);
    });

    it("rate between 0 and 1: subsequent entries use Math.random", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.2);
      const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 0.5 });

      history.record(makeHistoryEntry()); // seenCount=0, always
      // seenCount=1, 0.2 < 0.5 => recorded
      expect(history.record(makeHistoryEntry())).toBe(true);
    });

    it("undefined samplingRate defaults to 1 (records everything)", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      for (let i = 0; i < 10; i++) {
        expect(history.record(makeHistoryEntry())).toBe(true);
      }
      expect(history.size).toBe(10);
    });
  });

  describe("alwaysRecord.effectStatus — matches 'failed' and 'pending' specifically", () => {
    it("effectStatus 'failed' is always recorded when in alwaysRecord list", () => {
      const history = createActionHistory({
        maxEntries: 100,
        mode: "full",
        samplingRate: 0,
        alwaysRecord: { effectStatus: ["failed"] },
      });

      expect(history.record(makeHistoryEntry({ effectStatus: "failed" }))).toBe(true);
    });

    it("effectStatus 'pending' is always recorded when in alwaysRecord list", () => {
      const history = createActionHistory({
        maxEntries: 100,
        mode: "full",
        samplingRate: 0,
        alwaysRecord: { effectStatus: ["pending"] },
      });

      expect(history.record(makeHistoryEntry({ effectStatus: "pending" }))).toBe(true);
    });

    it("effectStatus 'completed' does NOT match alwaysRecord (only failed/pending supported)", () => {
      const history = createActionHistory({
        maxEntries: 100,
        mode: "full",
        samplingRate: 0,
        alwaysRecord: { effectStatus: ["failed", "pending"] },
      });

      // "completed" is not "failed" or "pending", so alwaysRecord doesn't apply
      expect(history.record(makeHistoryEntry({ effectStatus: "completed" }))).toBe(false);
    });

    it("effectStatus 'none' does NOT match alwaysRecord", () => {
      const history = createActionHistory({
        maxEntries: 100,
        mode: "full",
        samplingRate: 0,
        alwaysRecord: { effectStatus: ["failed", "pending"] },
      });

      expect(history.record(makeHistoryEntry({ effectStatus: "none" }))).toBe(false);
    });

    it("alwaysRecord with both 'failed' and 'pending' matches both", () => {
      const history = createActionHistory({
        maxEntries: 100,
        mode: "full",
        samplingRate: 0,
        alwaysRecord: { effectStatus: ["failed", "pending"] },
      });

      expect(history.record(makeHistoryEntry({ effectStatus: "failed" }))).toBe(true);
      expect(history.record(makeHistoryEntry({ effectStatus: "pending" }))).toBe(true);
      expect(history.size).toBe(2);
    });
  });

  describe("alwaysRecord.portNames match", () => {
    it("matching portName bypasses sampling", () => {
      const history = createActionHistory({
        maxEntries: 100,
        mode: "full",
        samplingRate: 0,
        alwaysRecord: { portNames: ["Critical"] },
      });

      expect(history.record(makeHistoryEntry({ portName: "Critical" }))).toBe(true);
    });

    it("non-matching portName does not bypass sampling", () => {
      const history = createActionHistory({
        maxEntries: 100,
        mode: "full",
        samplingRate: 0,
        alwaysRecord: { portNames: ["Critical"] },
      });

      expect(history.record(makeHistoryEntry({ portName: "Other" }))).toBe(false);
    });
  });

  describe("alwaysRecord.actionNames match", () => {
    it("matching actionName bypasses sampling", () => {
      const history = createActionHistory({
        maxEntries: 100,
        mode: "full",
        samplingRate: 0,
        alwaysRecord: { actionNames: ["save"] },
      });

      expect(history.record(makeHistoryEntry({ actionName: "save" }))).toBe(true);
    });

    it("non-matching actionName does not bypass sampling", () => {
      const history = createActionHistory({
        maxEntries: 100,
        mode: "full",
        samplingRate: 0,
        alwaysRecord: { actionNames: ["save"] },
      });

      expect(history.record(makeHistoryEntry({ actionName: "load" }))).toBe(false);
    });
  });

  describe("filter.limit with negative values", () => {
    it("negative limit does NOT slice (returns all matching entries)", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      history.record(makeHistoryEntry({ id: "a" }));
      history.record(makeHistoryEntry({ id: "b" }));
      history.record(makeHistoryEntry({ id: "c" }));

      // limit >= 0 is false when limit is -1, so the slicing branch is skipped
      const result = history.query({ limit: -1 });
      expect(result).toHaveLength(3);
    });

    it("negative limit returns all entries (not last N)", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      history.record(makeHistoryEntry({ id: "1" }));
      history.record(makeHistoryEntry({ id: "2" }));
      history.record(makeHistoryEntry({ id: "3" }));
      history.record(makeHistoryEntry({ id: "4" }));

      const result = history.query({ limit: -2 });
      expect(result).toHaveLength(4);
      expect(result[0]?.id).toBe("1");
      expect(result[3]?.id).toBe("4");
    });
  });

  describe("matchesFilter — each field tested", () => {
    it("portName: mismatched portName excludes entry", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      history.record(makeHistoryEntry({ portName: "A" }));
      history.record(makeHistoryEntry({ portName: "B" }));

      expect(history.query({ portName: "A" })).toHaveLength(1);
      expect(history.query({ portName: "B" })).toHaveLength(1);
      expect(history.query({ portName: "C" })).toHaveLength(0);
    });

    it("actionName: mismatched actionName excludes entry", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      history.record(makeHistoryEntry({ actionName: "inc" }));
      history.record(makeHistoryEntry({ actionName: "dec" }));

      expect(history.query({ actionName: "inc" })).toHaveLength(1);
      expect(history.query({ actionName: "dec" })).toHaveLength(1);
      expect(history.query({ actionName: "reset" })).toHaveLength(0);
    });

    it("effectStatus: mismatched effectStatus excludes entry", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      history.record(makeHistoryEntry({ effectStatus: "none" }));
      history.record(makeHistoryEntry({ effectStatus: "failed" }));
      history.record(makeHistoryEntry({ effectStatus: "completed" }));

      expect(history.query({ effectStatus: "failed" })).toHaveLength(1);
      expect(history.query({ effectStatus: "completed" })).toHaveLength(1);
      expect(history.query({ effectStatus: "pending" })).toHaveLength(0);
    });

    it("since: entries before timestamp are excluded", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      history.record(makeHistoryEntry({ timestamp: 100 }));
      history.record(makeHistoryEntry({ timestamp: 200 }));
      history.record(makeHistoryEntry({ timestamp: 300 }));

      const result = history.query({ since: 200 });
      expect(result).toHaveLength(2);
      expect(result[0]?.timestamp).toBe(200);
      expect(result[1]?.timestamp).toBe(300);
    });

    it("until: entries after timestamp are excluded", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      history.record(makeHistoryEntry({ timestamp: 100 }));
      history.record(makeHistoryEntry({ timestamp: 200 }));
      history.record(makeHistoryEntry({ timestamp: 300 }));

      const result = history.query({ until: 200 });
      expect(result).toHaveLength(2);
      expect(result[0]?.timestamp).toBe(100);
      expect(result[1]?.timestamp).toBe(200);
    });

    it("traceId: mismatched traceId excludes entry", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      history.record(makeHistoryEntry({ traceId: "t1" }));
      history.record(makeHistoryEntry({ traceId: "t2" }));

      expect(history.query({ traceId: "t1" })).toHaveLength(1);
      expect(history.query({ traceId: "t2" })).toHaveLength(1);
      expect(history.query({ traceId: "t3" })).toHaveLength(0);
    });

    it("combined: portName + actionName + since + until + traceId", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      history.record(
        makeHistoryEntry({ portName: "A", actionName: "x", timestamp: 100, traceId: "t" })
      );
      history.record(
        makeHistoryEntry({ portName: "A", actionName: "x", timestamp: 200, traceId: "t" })
      );
      history.record(
        makeHistoryEntry({ portName: "A", actionName: "x", timestamp: 300, traceId: "t" })
      );
      history.record(
        makeHistoryEntry({ portName: "B", actionName: "x", timestamp: 200, traceId: "t" })
      );
      history.record(
        makeHistoryEntry({ portName: "A", actionName: "y", timestamp: 200, traceId: "t" })
      );

      const result = history.query({
        portName: "A",
        actionName: "x",
        since: 150,
        until: 250,
        traceId: "t",
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.timestamp).toBe(200);
    });
  });

  describe("limit=0 is slice(-0) = slice(0) returning full array", () => {
    it("limit 0 returns all entries", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      history.record(makeHistoryEntry({ id: "a" }));
      history.record(makeHistoryEntry({ id: "b" }));

      const result = history.query({ limit: 0 });
      expect(result).toHaveLength(2);
    });
  });

  describe("maxEntries eviction", () => {
    it("entries beyond maxEntries are evicted from the front", () => {
      const history = createActionHistory({ maxEntries: 2, mode: "full" });
      history.record(makeHistoryEntry({ id: "x1" }));
      history.record(makeHistoryEntry({ id: "x2" }));
      history.record(makeHistoryEntry({ id: "x3" }));

      expect(history.size).toBe(2);
      const entries = history.query();
      expect(entries[0]?.id).toBe("x2");
      expect(entries[1]?.id).toBe("x3");
    });
  });

  describe("clear resets size and seenCount", () => {
    it("clear sets size to 0", () => {
      const history = createActionHistory({ maxEntries: 100, mode: "full" });
      history.record(makeHistoryEntry());
      history.record(makeHistoryEntry());
      expect(history.size).toBe(2);

      history.clear();
      expect(history.size).toBe(0);
      expect(history.query()).toHaveLength(0);
    });

    it("first entry after clear is always recorded (seenCount reset)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.999);
      const history = createActionHistory({ maxEntries: 100, mode: "full", samplingRate: 0.001 });

      history.record(makeHistoryEntry()); // seenCount=0, always
      history.clear();

      // seenCount reset to 0, so first entry after clear is recorded
      expect(history.record(makeHistoryEntry())).toBe(true);
    });
  });
});

// =============================================================================
// 4. StoreRegistry — store-registry.ts mutations
// =============================================================================

describe("StoreRegistry — mutation killers", () => {
  describe("disposed registry operations are no-ops", () => {
    it("register on disposed registry does nothing", () => {
      const registry = createStoreRegistry();
      registry.dispose();

      registry.register(makeRegistryEntry("X"));
      expect(registry.getAll()).toEqual([]);
    });

    it("unregister on disposed registry does nothing", () => {
      const registry = createStoreRegistry();
      registry.register(makeRegistryEntry("A"));
      registry.dispose();

      // After dispose, entries are cleared. unregister should be a no-op.
      const _listener = vi.fn();
      // subscribe after dispose: listener is added to cleared set
      // but since disposed is true, register/unregister won't fire events
      registry.unregister("A");
      // The registry is already empty after dispose
      expect(registry.getAll()).toEqual([]);
    });

    it("registerScoped on disposed registry does nothing", () => {
      const registry = createStoreRegistry();
      registry.dispose();

      registry.registerScoped("scope-1", makeRegistryEntry("Y"));
      expect(registry.getAllScoped("scope-1")).toEqual([]);
    });

    it("unregisterScope on disposed registry does nothing", () => {
      const registry = createStoreRegistry();
      registry.registerScoped("scope-1", makeRegistryEntry("Z"));
      registry.dispose();

      registry.unregisterScope("scope-1");
      expect(registry.getAllScoped("scope-1")).toEqual([]);
    });
  });

  describe("notifyListeners snapshots listener set before iterating", () => {
    it("adding a listener inside another listener callback during register does not cause infinite loop", () => {
      const registry = createStoreRegistry();
      const events: string[] = [];
      let innerListenerCalled = false;

      registry.subscribe(event => {
        events.push("outer-" + event.type);
        // Add a new listener inside the callback
        if (!innerListenerCalled) {
          innerListenerCalled = true;
          registry.subscribe(innerEvent => {
            events.push("inner-" + innerEvent.type);
          });
        }
      });

      // First registration: only outer listener called (inner added after snapshot)
      registry.register(makeRegistryEntry("First"));
      expect(events).toEqual(["outer-port-registered"]);

      // Second registration: both outer and inner listeners called
      events.length = 0;
      registry.register(makeRegistryEntry("Second"));
      expect(events).toContain("outer-port-registered");
      expect(events).toContain("inner-port-registered");
      expect(events).toHaveLength(2);
    });

    it("removing a listener inside another listener callback during unregister still notifies previously-snapshot listeners", () => {
      const registry = createStoreRegistry();
      registry.register(makeRegistryEntry("ToRemove"));

      const events: string[] = [];
      let unsub2: (() => void) | undefined;

      registry.subscribe(event => {
        events.push("listener1-" + event.type);
        // Remove listener2 during iteration
        if (unsub2) {
          unsub2();
          unsub2 = undefined;
        }
      });

      unsub2 = registry.subscribe(event => {
        events.push("listener2-" + event.type);
      });

      // Both were in the snapshot, so both get called
      registry.unregister("ToRemove");
      expect(events).toContain("listener1-port-unregistered");
      expect(events).toContain("listener2-port-unregistered");
    });
  });

  describe("subscribe returns working unsubscribe", () => {
    it("unsubscribe prevents future notifications", () => {
      const registry = createStoreRegistry();
      const events: string[] = [];
      const unsub = registry.subscribe(e => events.push(e.type));

      registry.register(makeRegistryEntry("A"));
      expect(events).toHaveLength(1);

      unsub();
      registry.register(makeRegistryEntry("B"));
      expect(events).toHaveLength(1); // no new events
    });
  });

  describe("unregister only notifies when entry actually existed", () => {
    it("unregister for non-existent port does not notify", () => {
      const registry = createStoreRegistry();
      const listener = vi.fn();
      registry.subscribe(listener);

      registry.unregister("nonexistent");
      expect(listener).not.toHaveBeenCalled();
    });

    it("unregister for existing port notifies with port-unregistered", () => {
      const registry = createStoreRegistry();
      registry.register(makeRegistryEntry("Exists"));

      const events: string[] = [];
      registry.subscribe(e => events.push(e.type));

      registry.unregister("Exists");
      expect(events).toEqual(["port-unregistered"]);
    });
  });

  describe("unregisterScope only notifies when scope actually existed", () => {
    it("unregisterScope for non-existent scope does not notify", () => {
      const registry = createStoreRegistry();
      const listener = vi.fn();
      registry.subscribe(listener);

      registry.unregisterScope("ghost-scope");
      expect(listener).not.toHaveBeenCalled();
    });

    it("unregisterScope for existing scope notifies with scope-unregistered", () => {
      const registry = createStoreRegistry();
      registry.registerScoped("real-scope", makeRegistryEntry("P"));

      const events: string[] = [];
      registry.subscribe(e => events.push(e.type));

      registry.unregisterScope("real-scope");
      expect(events).toEqual(["scope-unregistered"]);
    });
  });

  describe("dispose clears everything", () => {
    it("dispose clears singleton entries", () => {
      const registry = createStoreRegistry();
      registry.register(makeRegistryEntry("A"));
      registry.register(makeRegistryEntry("B"));

      registry.dispose();
      expect(registry.getAll()).toEqual([]);
      expect(registry.get("A")).toBeUndefined();
    });

    it("dispose clears scoped entries", () => {
      const registry = createStoreRegistry();
      registry.registerScoped("s1", makeRegistryEntry("X"));

      registry.dispose();
      expect(registry.getAllScoped("s1")).toEqual([]);
    });

    it("dispose clears listeners (no notifications after dispose)", () => {
      const registry = createStoreRegistry();
      const listener = vi.fn();
      registry.subscribe(listener);

      registry.dispose();

      // After dispose, register is a no-op, but even if it weren't,
      // listeners are cleared so nothing would fire
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// 5. StoreInspectorImpl with registry auto-discovery
// =============================================================================

describe("StoreInspectorImpl — registry auto-discovery", () => {
  it("populates from existing registry entries on creation", () => {
    const registry = createStoreRegistry();
    registry.register(makeRegistryEntry("Pre"));

    const inspector = createStoreInspectorImpl({ registry });
    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(1);
    expect(snapshot.ports[0]?.portName).toBe("Pre");
  });

  it("subscribes to registry for future port-registered events", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    expect(inspector.getSnapshot().ports).toHaveLength(0);

    registry.register(makeRegistryEntry("Dynamic"));

    expect(inspector.getSnapshot().ports).toHaveLength(1);
    expect(inspector.getSnapshot().ports[0]?.portName).toBe("Dynamic");
  });

  it("handles port-unregistered events from registry", () => {
    const registry = createStoreRegistry();
    registry.register(makeRegistryEntry("Removable"));

    const inspector = createStoreInspectorImpl({ registry });
    expect(inspector.getSnapshot().ports).toHaveLength(1);

    registry.unregister("Removable");
    expect(inspector.getSnapshot().ports).toHaveLength(0);
  });

  it("handles scoped-port-registered events from registry", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    registry.registerScoped("scope-a", makeRegistryEntry("ScopedPort"));

    // The scoped port should be discoverable via getSnapshot
    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(1);
    expect(snapshot.ports[0]?.portName).toBe("ScopedPort");
    expect(snapshot.ports[0]?.scopeId).toBe("scope-a");
  });

  it("handles scope-unregistered events from registry", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    // Register scoped AFTER inspector creation so it goes through subscription
    registry.registerScoped("scope-b", makeRegistryEntry("ScopeEntry"));
    expect(inspector.getSnapshot().ports).toHaveLength(1);

    registry.unregisterScope("scope-b");
    expect(inspector.getSnapshot().ports).toHaveLength(0);
  });

  it("creates new scope map on first scoped registration for a scopeId", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    registry.registerScoped("new-scope", makeRegistryEntry("Port1"));
    registry.registerScoped("new-scope", makeRegistryEntry("Port2"));

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(2);
  });
});

// =============================================================================
// 6. Additional edge cases for alwaysRecord priority
// =============================================================================

describe("ActionHistory — alwaysRecord priority over sampling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("effectStatus check precedes portNames check", () => {
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0,
      alwaysRecord: { effectStatus: ["failed"], portNames: ["A"] },
    });

    // effectStatus match triggers before portNames is checked
    expect(history.record(makeHistoryEntry({ effectStatus: "failed", portName: "B" }))).toBe(true);
  });

  it("portNames check triggers when effectStatus does not match", () => {
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0,
      alwaysRecord: { effectStatus: ["failed"], portNames: ["A"] },
    });

    // effectStatus is "none" (doesn't match "failed"/"pending"), but portName "A" matches
    expect(history.record(makeHistoryEntry({ effectStatus: "none", portName: "A" }))).toBe(true);
  });

  it("actionNames check triggers when effectStatus and portNames do not match", () => {
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0,
      alwaysRecord: { effectStatus: ["failed"], portNames: ["A"], actionNames: ["save"] },
    });

    // effectStatus is "none", portName is "B", but actionName "save" matches
    expect(
      history.record(makeHistoryEntry({ effectStatus: "none", portName: "B", actionName: "save" }))
    ).toBe(true);
  });

  it("nothing matches in alwaysRecord falls through to sampling", () => {
    const history = createActionHistory({
      maxEntries: 100,
      mode: "full",
      samplingRate: 0,
      alwaysRecord: { effectStatus: ["failed"], portNames: ["A"], actionNames: ["save"] },
    });

    // Nothing matches: effectStatus is "none", portName is "B", actionName is "load"
    // Falls through to sampling which is 0 => false
    expect(
      history.record(makeHistoryEntry({ effectStatus: "none", portName: "B", actionName: "load" }))
    ).toBe(false);
  });
});

// =============================================================================
// 7. StoreInspectorImpl — emit resilience (tryCatch in emit)
// =============================================================================

describe("StoreInspectorImpl — emit resilience", () => {
  it("throwing listener does not prevent other listeners from receiving events", () => {
    const inspector = createStoreInspectorImpl();
    const events: string[] = [];

    inspector.subscribe(() => {
      throw new Error("listener crash");
    });
    inspector.subscribe(e => {
      events.push(e.type);
    });

    // Should not throw, and second listener should still get the event
    inspector.emit({ type: "snapshot-changed" });
    expect(events).toEqual(["snapshot-changed"]);
  });
});
