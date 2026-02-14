/**
 * StoreRegistry Unit Tests
 */

import { describe, it, expect, vi } from "vitest";
import { createStoreRegistry } from "../src/inspection/store-registry.js";
import type { StoreRegistryEntry, StoreRegistryEvent } from "../src/types/inspection.js";
import type { StatePortSnapshot } from "../src/types/inspection.js";

// =============================================================================
// Helpers
// =============================================================================

function makeEntry(
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
// Tests
// =============================================================================

describe("createStoreRegistry", () => {
  it("creates an empty registry", () => {
    const registry = createStoreRegistry();
    expect(registry.getAll()).toEqual([]);
  });

  it("register() / getAll() / get() lifecycle", () => {
    const registry = createStoreRegistry();
    const entry = makeEntry("Counter");

    registry.register(entry);

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.get("Counter")).toBe(entry);
  });

  it("unregister() removes entry", () => {
    const registry = createStoreRegistry();
    registry.register(makeEntry("Counter"));
    registry.register(makeEntry("Theme"));

    registry.unregister("Counter");

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.get("Counter")).toBeUndefined();
    expect(registry.get("Theme")).toBeDefined();
  });

  it("unregister() is no-op for unknown port", () => {
    const registry = createStoreRegistry();
    const listener = vi.fn();
    registry.subscribe(listener);

    registry.unregister("nonexistent");

    expect(listener).not.toHaveBeenCalled();
  });

  it("subscribe() fires port-registered events", () => {
    const registry = createStoreRegistry();
    const events: StoreRegistryEvent[] = [];
    registry.subscribe(e => events.push(e));

    const entry = makeEntry("Counter");
    registry.register(entry);

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("port-registered");
    if (events[0]!.type === "port-registered") {
      expect(events[0]!.entry).toBe(entry);
    }
  });

  it("subscribe() fires port-unregistered events", () => {
    const registry = createStoreRegistry();
    registry.register(makeEntry("Counter"));

    const events: StoreRegistryEvent[] = [];
    registry.subscribe(e => events.push(e));

    registry.unregister("Counter");

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("port-unregistered");
  });

  it("subscribe() returns an unsubscribe function", () => {
    const registry = createStoreRegistry();
    const listener = vi.fn();
    const unsub = registry.subscribe(listener);

    unsub();
    registry.register(makeEntry("Counter"));

    expect(listener).not.toHaveBeenCalled();
  });

  it("duplicate registration overwrites", () => {
    const registry = createStoreRegistry();
    const entry1 = makeEntry("Counter");
    const entry2 = makeEntry("Counter", { lifetime: "scoped" });

    registry.register(entry1);
    registry.register(entry2);

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.get("Counter")).toBe(entry2);
  });

  it("dispose() clears entries and stops notifications", () => {
    const registry = createStoreRegistry();
    registry.register(makeEntry("Counter"));
    const listener = vi.fn();
    registry.subscribe(listener);

    registry.dispose();

    expect(registry.getAll()).toEqual([]);
    expect(registry.get("Counter")).toBeUndefined();

    // Further registrations are no-ops
    registry.register(makeEntry("Theme"));
    expect(registry.getAll()).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("StoreRegistry scoped entries", () => {
  it("registerScoped() adds entries under a scope ID", () => {
    const registry = createStoreRegistry();
    const entry = makeEntry("Counter");

    registry.registerScoped("scope-1", entry);

    expect(registry.getAllScoped("scope-1")).toHaveLength(1);
    expect(registry.getAllScoped("scope-1")[0]).toBe(entry);
  });

  it("getAllScoped() returns empty array for unknown scope", () => {
    const registry = createStoreRegistry();
    expect(registry.getAllScoped("unknown")).toEqual([]);
  });

  it("unregisterScope() removes all entries for that scope", () => {
    const registry = createStoreRegistry();
    registry.registerScoped("scope-1", makeEntry("Counter"));
    registry.registerScoped("scope-1", makeEntry("Theme"));
    registry.registerScoped("scope-2", makeEntry("Cart"));

    registry.unregisterScope("scope-1");

    expect(registry.getAllScoped("scope-1")).toEqual([]);
    expect(registry.getAllScoped("scope-2")).toHaveLength(1);
  });

  it("subscribe() fires scoped-port-registered events", () => {
    const registry = createStoreRegistry();
    const events: StoreRegistryEvent[] = [];
    registry.subscribe(e => events.push(e));

    const entry = makeEntry("Counter");
    registry.registerScoped("scope-1", entry);

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("scoped-port-registered");
    if (events[0]!.type === "scoped-port-registered") {
      expect(events[0]!.scopeId).toBe("scope-1");
      expect(events[0]!.entry).toBe(entry);
    }
  });

  it("subscribe() fires scope-unregistered events", () => {
    const registry = createStoreRegistry();
    registry.registerScoped("scope-1", makeEntry("Counter"));

    const events: StoreRegistryEvent[] = [];
    registry.subscribe(e => events.push(e));

    registry.unregisterScope("scope-1");

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("scope-unregistered");
    if (events[0]!.type === "scope-unregistered") {
      expect(events[0]!.scopeId).toBe("scope-1");
    }
  });

  it("unregisterScope() is no-op for unknown scope", () => {
    const registry = createStoreRegistry();
    const listener = vi.fn();
    registry.subscribe(listener);

    registry.unregisterScope("unknown");

    expect(listener).not.toHaveBeenCalled();
  });

  it("dispose() clears scoped entries too", () => {
    const registry = createStoreRegistry();
    registry.registerScoped("scope-1", makeEntry("Counter"));

    registry.dispose();

    expect(registry.getAllScoped("scope-1")).toEqual([]);
  });
});
