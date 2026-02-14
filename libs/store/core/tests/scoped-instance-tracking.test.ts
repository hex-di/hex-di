/**
 * Scoped Instance Tracking Tests
 *
 * Tests for per-scope port registration in StoreInspectorImpl.
 */

import { describe, it, expect } from "vitest";
import { createStoreInspectorImpl } from "../src/inspection/store-inspector-impl.js";
import type { PortRegistryEntry } from "../src/inspection/store-inspector-impl.js";
import type { StatePortSnapshot, AtomPortSnapshot } from "../src/types/inspection.js";
import { __stateAdapterBrand, __atomAdapterBrand } from "../src/adapters/brands.js";

// =============================================================================
// Helpers
// =============================================================================

function makePortEntry(
  portName: string,
  overrides: Partial<PortRegistryEntry> = {}
): PortRegistryEntry {
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
    adapter: { [__stateAdapterBrand]: true },
    lifetime: "singleton",
    requires: [],
    writesTo: [],
    getSnapshot: () => snapshot,
    getSubscriberCount: () => 0,
    getHasEffects: () => false,
    ...overrides,
  };
}

function makeAtomPortEntry(portName: string): PortRegistryEntry {
  const snapshot: AtomPortSnapshot = {
    kind: "atom",
    portName,
    value: "initial",
    subscriberCount: 0,
  };
  return {
    portName,
    adapter: { [__atomAdapterBrand]: true },
    lifetime: "scoped",
    requires: [],
    writesTo: [],
    getSnapshot: () => snapshot,
    getSubscriberCount: () => 0,
    getHasEffects: () => false,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("StoreInspectorImpl scoped instance tracking", () => {
  it("singleton ports appear in snapshot", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(makePortEntry("Counter"));

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(1);
    expect(snapshot.ports[0]!.portName).toBe("Counter");
  });

  it("scoped port registration with scopeId appears in snapshot", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerScopedPort("scope-1", makeAtomPortEntry("Theme"));

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(1);
    expect(snapshot.ports[0]!.portName).toBe("Theme");
    expect(snapshot.ports[0]!.scopeId).toBe("scope-1");
  });

  it("unregisterScope() removes all entries for that scope", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerScopedPort("scope-1", makePortEntry("Counter"));
    inspector.registerScopedPort("scope-1", makeAtomPortEntry("Theme"));

    inspector.unregisterScope("scope-1");

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(0);
  });

  it("multiple scopes with same port show separate entries", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerScopedPort("scope-1", makeAtomPortEntry("Theme"));
    inspector.registerScopedPort("scope-2", makeAtomPortEntry("Theme"));

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(2);

    const scopeIds = snapshot.ports.map(p => p.scopeId);
    expect(scopeIds).toContain("scope-1");
    expect(scopeIds).toContain("scope-2");
  });

  it("getPortState() returns singleton entry first", () => {
    const inspector = createStoreInspectorImpl();
    const singletonEntry = makePortEntry("Counter", {
      getSnapshot: () => ({
        kind: "state",
        portName: "Counter",
        state: { count: 42 },
        subscriberCount: 0,
        actionCount: 0,
        lastActionAt: null,
      }),
    });
    inspector.registerPort(singletonEntry);
    inspector.registerScopedPort("scope-1", makePortEntry("Counter"));

    const portState = inspector.getPortState("Counter");
    expect(portState).toBeDefined();
    if (portState?.kind === "state") {
      expect(portState.state).toEqual({ count: 42 });
    }
  });

  it("getPortState() falls back to scoped entry when no singleton", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerScopedPort("scope-1", makeAtomPortEntry("Theme"));

    const portState = inspector.getPortState("Theme");
    expect(portState).toBeDefined();
    expect(portState?.kind).toBe("atom");
  });

  it("total subscriber count aggregates across singletons and scopes", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(makePortEntry("Counter", { getSubscriberCount: () => 3 }));
    inspector.registerScopedPort("scope-1", makeAtomPortEntry("Theme"));
    inspector.registerScopedPort("scope-2", makePortEntry("Cart", { getSubscriberCount: () => 2 }));

    const snapshot = inspector.getSnapshot();
    expect(snapshot.totalSubscribers).toBe(5);
  });

  it("unregistered scope's ports excluded from snapshot", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(makePortEntry("Counter"));
    inspector.registerScopedPort("scope-1", makeAtomPortEntry("Theme"));

    inspector.unregisterScope("scope-1");

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(1);
    expect(snapshot.ports[0]!.portName).toBe("Counter");
  });

  it("listStatePorts() includes scopeId on scoped entries", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(makePortEntry("Counter"));
    inspector.registerScopedPort("scope-1", makeAtomPortEntry("Theme"));

    const ports = inspector.listStatePorts();
    expect(ports).toHaveLength(2);

    const singletonPort = ports.find(p => p.portName === "Counter");
    const scopedPort = ports.find(p => p.portName === "Theme");

    expect(singletonPort?.scopeId).toBeUndefined();
    expect(scopedPort?.scopeId).toBe("scope-1");
  });

  it("getSubscriberGraph() includes scoped instances", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(makePortEntry("Counter"));
    inspector.registerScopedPort("scope-1", makeAtomPortEntry("Theme"));

    const graph = inspector.getSubscriberGraph();
    expect(graph.nodes).toHaveLength(2);
    const nodeIds = graph.nodes.map(n => n.id);
    expect(nodeIds).toContain("Counter");
    expect(nodeIds).toContain("Theme");
  });
});

describe("StoreInspectorImpl with registry auto-discovery", () => {
  it("auto-populates from registry on creation", () => {
    // Create a minimal mock registry
    const entries = new Map<string, PortRegistryEntry>();
    const entry = makePortEntry("Counter");
    entries.set("Counter", {
      ...entry,
      getSnapshot: entry.getSnapshot,
      getSubscriberCount: entry.getSubscriberCount,
      getHasEffects: entry.getHasEffects,
    });

    const mockRegistry = {
      register: () => {},
      unregister: () => {},
      registerScoped: () => {},
      unregisterScope: () => {},
      getAll: () => Array.from(entries.values()),
      getAllScoped: () => [],
      get: (name: string) => entries.get(name),
      subscribe: () => () => {},
      dispose: () => {},
    };

    const inspector = createStoreInspectorImpl({ registry: mockRegistry });
    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(1);
    expect(snapshot.ports[0]!.portName).toBe("Counter");
  });

  it("subscribes for future registry changes", () => {
    type Listener = (event: import("../src/types/inspection.js").StoreRegistryEvent) => void;
    const listeners: Listener[] = [];

    const mockRegistry = {
      register: () => {},
      unregister: () => {},
      registerScoped: () => {},
      unregisterScope: () => {},
      getAll: () => [],
      getAllScoped: () => [],
      get: () => undefined,
      subscribe: (listener: Listener) => {
        listeners.push(listener);
        return () => {};
      },
      dispose: () => {},
    };

    const inspector = createStoreInspectorImpl({ registry: mockRegistry });

    // Initially empty
    expect(inspector.getSnapshot().ports).toHaveLength(0);

    // Simulate registry event
    const entry = makePortEntry("Counter");
    for (const listener of listeners) {
      listener({ type: "port-registered", entry });
    }

    expect(inspector.getSnapshot().ports).toHaveLength(1);
    expect(inspector.getSnapshot().ports[0]!.portName).toBe("Counter");

    // Simulate unregister
    for (const listener of listeners) {
      listener({ type: "port-unregistered", portName: "Counter" });
    }

    expect(inspector.getSnapshot().ports).toHaveLength(0);
  });
});
