/**
 * StoreInspectorImpl — Scoped Port Operations Tests
 *
 * Tests for registerScopedPort, unregisterScope, getPortState fallback to scoped,
 * getSnapshot with scoped ports (scopeId attachment), listStatePorts with scoped ports,
 * and registry auto-discovery path.
 */

import { describe, it, expect } from "vitest";
import { createStoreInspectorImpl } from "../src/inspection/store-inspector-impl.js";
import type { PortRegistryEntry } from "../src/inspection/store-inspector-impl.js";
import { createStoreRegistry } from "../src/inspection/store-registry.js";
import type { StoreRegistryEntry } from "../src/inspection/store-registry.js";
import type {
  StatePortSnapshot,
  AtomPortSnapshot,
  PortSnapshot,
  StoreInspectorEvent,
} from "../src/types/inspection.js";
import { __stateAdapterBrand, __atomAdapterBrand } from "../src/adapters/brands.js";

// =============================================================================
// Helpers
// =============================================================================

function makeStateSnapshot(portName: string): StatePortSnapshot {
  return {
    kind: "state",
    portName,
    state: { count: 0 },
    subscriberCount: 0,
    actionCount: 0,
    lastActionAt: null,
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
    adapter: overrides.adapter ?? { [__stateAdapterBrand]: true },
    lifetime: overrides.lifetime ?? "singleton",
    requires: overrides.requires ?? [],
    writesTo: overrides.writesTo ?? [],
    getSnapshot: () => snapshot,
    getSubscriberCount: () => 0,
    getHasEffects: () => false,
    ...overrides,
  };
}

// =============================================================================
// Scoped port operations
// =============================================================================

describe("StoreInspectorImpl — scoped ports", () => {
  it("registerScopedPort adds port visible in getSnapshot", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerScopedPort(
      "scope-1",
      makePortEntry(
        "ScopedCounter",
        { [__stateAdapterBrand]: true },
        makeStateSnapshot("ScopedCounter")
      )
    );

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(1);
    expect(snapshot.ports[0]?.portName).toBe("ScopedCounter");
  });

  it("getSnapshot attaches scopeId to scoped port snapshots", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerScopedPort(
      "scope-42",
      makePortEntry("ScopedTheme", { [__atomAdapterBrand]: true }, makeAtomSnapshot("ScopedTheme"))
    );

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports[0]).toHaveProperty("scopeId", "scope-42");
  });

  it("getSnapshot does NOT add scopeId to singleton port snapshots", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerPort(
      makePortEntry(
        "SingletonCounter",
        { [__stateAdapterBrand]: true },
        makeStateSnapshot("SingletonCounter")
      )
    );

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports[0]).not.toHaveProperty("scopeId");
  });

  it("getSnapshot aggregates subscribers across singletons and scoped ports", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerPort(
      makePortEntry("Counter", { [__stateAdapterBrand]: true }, makeStateSnapshot("Counter"), {
        getSubscriberCount: () => 3,
      })
    );

    inspector.registerScopedPort(
      "scope-1",
      makePortEntry(
        "ScopedTheme",
        { [__atomAdapterBrand]: true },
        makeAtomSnapshot("ScopedTheme"),
        { getSubscriberCount: () => 2 }
      )
    );

    const snapshot = inspector.getSnapshot();
    expect(snapshot.totalSubscribers).toBe(5);
    expect(snapshot.ports).toHaveLength(2);
  });

  it("unregisterScope removes all ports for that scope", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerScopedPort(
      "scope-1",
      makePortEntry("A", { [__stateAdapterBrand]: true }, makeStateSnapshot("A"))
    );
    inspector.registerScopedPort(
      "scope-1",
      makePortEntry("B", { [__stateAdapterBrand]: true }, makeStateSnapshot("B"))
    );
    inspector.registerScopedPort(
      "scope-2",
      makePortEntry("C", { [__stateAdapterBrand]: true }, makeStateSnapshot("C"))
    );

    expect(inspector.getSnapshot().ports).toHaveLength(3);

    inspector.unregisterScope("scope-1");

    expect(inspector.getSnapshot().ports).toHaveLength(1);
    expect(inspector.getSnapshot().ports[0]?.portName).toBe("C");
  });

  it("getPortState falls back to scoped port when singleton not found", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerScopedPort(
      "scope-1",
      makePortEntry("OnlyScoped", { [__atomAdapterBrand]: true }, makeAtomSnapshot("OnlyScoped"))
    );

    const result = inspector.getPortState("OnlyScoped");
    expect(result).toBeDefined();
    expect(result?.kind).toBe("atom");
    expect(result?.portName).toBe("OnlyScoped");
  });

  it("getPortState prefers singleton over scoped", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerPort(
      makePortEntry("Counter", { [__stateAdapterBrand]: true }, makeStateSnapshot("Counter"))
    );

    inspector.registerScopedPort(
      "scope-1",
      makePortEntry("Counter", { [__atomAdapterBrand]: true }, makeAtomSnapshot("Counter"))
    );

    const result = inspector.getPortState("Counter");
    // Singleton takes priority
    expect(result?.kind).toBe("state");
  });

  it("getPortState returns latest scoped entry when multiple scopes have same port", () => {
    const inspector = createStoreInspectorImpl();

    const snapshot1 = makeStateSnapshot("X");
    const snapshot2 = makeAtomSnapshot("X");

    inspector.registerScopedPort(
      "scope-1",
      makePortEntry("X", { [__stateAdapterBrand]: true }, snapshot1)
    );

    inspector.registerScopedPort(
      "scope-2",
      makePortEntry("X", { [__atomAdapterBrand]: true }, snapshot2)
    );

    const result = inspector.getPortState("X");
    // Iterates all scopes, last one wins
    expect(result?.kind).toBe("atom");
  });

  it("listStatePorts includes scoped ports with scopeId", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerPort(
      makePortEntry(
        "SingletonPort",
        { [__stateAdapterBrand]: true },
        makeStateSnapshot("SingletonPort")
      )
    );

    inspector.registerScopedPort(
      "scope-5",
      makePortEntry("ScopedPort", { [__atomAdapterBrand]: true }, makeAtomSnapshot("ScopedPort"), {
        getSubscriberCount: () => 1,
        getHasEffects: () => true,
      })
    );

    const ports = inspector.listStatePorts();
    expect(ports).toHaveLength(2);

    const scopedPort = ports.find(p => p.portName === "ScopedPort");
    expect(scopedPort?.scopeId).toBe("scope-5");
    expect(scopedPort?.kind).toBe("atom");
    expect(scopedPort?.subscriberCount).toBe(1);
    expect(scopedPort?.hasEffects).toBe(true);

    const singletonPort = ports.find(p => p.portName === "SingletonPort");
    expect(singletonPort?.scopeId).toBeUndefined();
  });

  it("getSubscriberGraph includes scoped port entries", () => {
    const inspector = createStoreInspectorImpl();

    inspector.registerScopedPort(
      "scope-1",
      makePortEntry(
        "ScopedCounter",
        { [__stateAdapterBrand]: true },
        makeStateSnapshot("ScopedCounter"),
        { getSubscriberCount: () => 3 }
      )
    );

    const graph = inspector.getSubscriberGraph();
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]?.id).toBe("ScopedCounter");
    expect(graph.nodes[0]?.subscriberCount).toBe(3);
  });
});

// =============================================================================
// Registry auto-discovery
// =============================================================================

describe("StoreInspectorImpl — registry auto-discovery", () => {
  it("populates from existing registry entries on creation", () => {
    const registry = createStoreRegistry();
    registry.register(makeRegistryEntry("Counter"));
    registry.register(makeRegistryEntry("Theme", { adapter: { [__atomAdapterBrand]: true } }));

    const inspector = createStoreInspectorImpl({ registry });

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(2);
  });

  it("subscribes to future port-registered events", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    expect(inspector.getSnapshot().ports).toHaveLength(0);

    registry.register(makeRegistryEntry("Counter"));

    expect(inspector.getSnapshot().ports).toHaveLength(1);
    expect(inspector.getSnapshot().ports[0]?.portName).toBe("Counter");
  });

  it("handles port-unregistered events", () => {
    const registry = createStoreRegistry();
    registry.register(makeRegistryEntry("Counter"));

    const inspector = createStoreInspectorImpl({ registry });
    expect(inspector.getSnapshot().ports).toHaveLength(1);

    registry.unregister("Counter");

    expect(inspector.getSnapshot().ports).toHaveLength(0);
  });

  it("handles scoped-port-registered events", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    registry.registerScoped("scope-1", makeRegistryEntry("ScopedPort"));

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(1);
    expect(snapshot.ports[0]).toHaveProperty("scopeId", "scope-1");
  });

  it("handles scope-unregistered events", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    registry.registerScoped("scope-1", makeRegistryEntry("A"));
    registry.registerScoped("scope-1", makeRegistryEntry("B"));

    expect(inspector.getSnapshot().ports).toHaveLength(2);

    registry.unregisterScope("scope-1");

    expect(inspector.getSnapshot().ports).toHaveLength(0);
  });

  it("creates scope map on first scoped-port-registered event", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    // No scoped ports yet
    expect(inspector.getSnapshot().ports).toHaveLength(0);

    // Register first scoped port — should create new scope map
    registry.registerScoped("new-scope", makeRegistryEntry("First"));

    expect(inspector.getSnapshot().ports).toHaveLength(1);

    // Register second in same scope
    registry.registerScoped("new-scope", makeRegistryEntry("Second"));

    expect(inspector.getSnapshot().ports).toHaveLength(2);
  });

  it("registry entry fields are correctly mapped to port entry", () => {
    const registry = createStoreRegistry();
    const entry = makeRegistryEntry("Mapped", {
      adapter: { [__atomAdapterBrand]: true },
      lifetime: "scoped",
      requires: ["Dep1", "Dep2"],
      writesTo: ["Target"],
    });
    registry.register(entry);

    const inspector = createStoreInspectorImpl({ registry });

    const ports = inspector.listStatePorts();
    expect(ports).toHaveLength(1);
    expect(ports[0]?.portName).toBe("Mapped");
    expect(ports[0]?.kind).toBe("atom");
    expect(ports[0]?.lifetime).toBe("scoped");
  });
});

// =============================================================================
// emit error resilience
// =============================================================================

describe("StoreInspectorImpl — emit error resilience", () => {
  it("continues to notify other listeners when one throws", () => {
    const inspector = createStoreInspectorImpl();
    const events: StoreInspectorEvent[] = [];

    inspector.subscribe(() => {
      throw new Error("listener error");
    });
    inspector.subscribe(event => events.push(event));

    // emit should not throw, and second listener should receive the event
    inspector.emit({ type: "snapshot-changed" });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("snapshot-changed");
  });
});
