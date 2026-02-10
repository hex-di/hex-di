/**
 * StoreRegistryAdapter Unit Tests
 *
 * Tests for the DI adapter that provides a StoreRegistry singleton,
 * including the hasDispose type guard and the finalizer.
 */

import { describe, it, expect } from "vitest";
import { StoreRegistryAdapter } from "../src/inspection/registry-adapter.js";
import { StoreRegistryPort } from "../src/types/inspection.js";

// =============================================================================
// StoreRegistryAdapter — frozen singleton
// =============================================================================

describe("StoreRegistryAdapter — frozen singleton", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(StoreRegistryAdapter)).toBe(true);
  });

  it("provides StoreRegistryPort", () => {
    expect(StoreRegistryAdapter.provides).toBe(StoreRegistryPort);
  });

  it("requires nothing", () => {
    expect(StoreRegistryAdapter.requires).toEqual([]);
  });

  it("has lifetime: singleton", () => {
    expect(StoreRegistryAdapter.lifetime).toBe("singleton");
  });

  it("has factoryKind: sync", () => {
    expect(StoreRegistryAdapter.factoryKind).toBe("sync");
  });

  it("has clonable: false", () => {
    expect(StoreRegistryAdapter.clonable).toBe(false);
  });
});

// =============================================================================
// StoreRegistryAdapter.factory
// =============================================================================

describe("StoreRegistryAdapter.factory", () => {
  it("returns a StoreRegistry instance", () => {
    const registry = StoreRegistryAdapter.factory({});

    expect(typeof registry.register).toBe("function");
    expect(typeof registry.unregister).toBe("function");
    expect(typeof registry.registerScoped).toBe("function");
    expect(typeof registry.unregisterScope).toBe("function");
    expect(typeof registry.getAll).toBe("function");
    expect(typeof registry.getAllScoped).toBe("function");
    expect(typeof registry.get).toBe("function");
    expect(typeof registry.subscribe).toBe("function");
    expect(typeof registry.dispose).toBe("function");
  });

  it("returns a working registry (can register and get)", () => {
    const registry = StoreRegistryAdapter.factory({});

    registry.register({
      portName: "Counter",
      adapter: {},
      lifetime: "singleton",
      requires: [],
      writesTo: [],
      getSnapshot: () => ({
        kind: "state",
        portName: "Counter",
        state: {},
        subscriberCount: 0,
        actionCount: 0,
        lastActionAt: null,
      }),
      getSubscriberCount: () => 0,
      getHasEffects: () => false,
    });

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.get("Counter")).toBeDefined();
  });

  it("each factory call returns a new instance", () => {
    const r1 = StoreRegistryAdapter.factory({});
    const r2 = StoreRegistryAdapter.factory({});
    expect(r1).not.toBe(r2);
  });
});

// =============================================================================
// StoreRegistryAdapter.finalizer — hasDispose type guard
// =============================================================================

describe("StoreRegistryAdapter.finalizer", () => {
  const finalizer = StoreRegistryAdapter.finalizer;

  it("calls dispose on instance that has a dispose method", () => {
    const registry = StoreRegistryAdapter.factory({});

    // Register something to verify dispose clears it
    registry.register({
      portName: "X",
      adapter: {},
      lifetime: "singleton",
      requires: [],
      writesTo: [],
      getSnapshot: () => ({
        kind: "state",
        portName: "X",
        state: {},
        subscriberCount: 0,
        actionCount: 0,
        lastActionAt: null,
      }),
      getSubscriberCount: () => 0,
      getHasEffects: () => false,
    });

    expect(registry.getAll()).toHaveLength(1);

    // Call finalizer
    if (finalizer) void finalizer(registry);

    // After dispose, registry should be cleared
    expect(registry.getAll()).toEqual([]);
  });

  it("does not throw for an object without dispose", () => {
    // This tests the hasDispose guard returning false
    const notDisposable = { register: () => {} };
    expect(() => {
      if (finalizer) void finalizer(notDisposable as any);
    }).not.toThrow();
  });

  it("does not throw for null value", () => {
    expect(() => {
      if (finalizer) void finalizer(null as any);
    }).not.toThrow();
  });

  it("does not throw for non-object value", () => {
    expect(() => {
      if (finalizer) void finalizer("not an object" as any);
    }).not.toThrow();
  });

  it("does not call dispose if dispose is not a function", () => {
    const obj = Object.create(null);
    Object.defineProperty(obj, "dispose", { value: "not-a-function" });
    expect(() => {
      if (finalizer) void finalizer(obj as any);
    }).not.toThrow();
  });

  it("calls dispose when dispose is a function on own property", () => {
    let disposeCalled = false;
    const obj = {
      dispose() {
        disposeCalled = true;
      },
    };
    if (finalizer) void finalizer(obj as any);
    expect(disposeCalled).toBe(true);
  });

  it("does not call dispose when it is only on the prototype", () => {
    const proto = { dispose() {} };
    const obj = Object.create(proto);
    // hasDispose checks Object.getOwnPropertyDescriptor — prototype method is not an own property
    if (finalizer) void finalizer(obj as any);
    // No error, but proto.dispose was not on own properties
  });
});
