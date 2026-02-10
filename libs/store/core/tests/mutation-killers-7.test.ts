/**
 * Targeted mutation-killing tests -- Round 7
 *
 * Targets surviving mutants in:
 * - src/adapters/state-adapter.ts (inspection ports, tracing hook, registration, brand)
 * - src/adapters/atom-adapter.ts (inspection ports, service config, portName, registration, brand)
 * - src/adapters/async-derived-adapter.ts (inspection ports, requires, registration)
 * - src/adapters/derived-adapter.ts (inspection ports, registration)
 * - src/adapters/linked-derived-adapter.ts (arrays, config, portName, arrows, registration)
 * - src/reactivity/batch.ts (cross-container detection, depth tracking, conditions)
 * - src/reactivity/signals.ts (system path, double-dispose)
 * - src/reactivity/path-tracking.ts (non-configurable/non-writable, typeof guard)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  createStateAdapter,
  createAtomAdapter,
  createDerivedAdapter,
  createAsyncDerivedAdapter,
  createLinkedDerivedAdapter,
} from "../src/adapters/index.js";
import {
  createStatePort,
  createAtomPort,
  createDerivedPort,
  createAsyncDerivedPort,
  createLinkedDerivedPort,
} from "../src/ports/index.js";
import {
  __stateAdapterBrand,
  __atomAdapterBrand,
  __derivedAdapterBrand,
  __asyncDerivedAdapterBrand,
  __linkedDerivedAdapterBrand,
} from "../src/adapters/brands.js";
import type { StoreTracingHook, StoreSpanContext } from "../src/integration/tracing-bridge.js";
import { batch, setBatchDiagnostics, isInBatch, getBatchDepth } from "../src/reactivity/batch.js";
import {
  createSignal,
  createComputed,
  createEffect,
  untracked,
} from "../src/reactivity/signals.js";
import { createIsolatedReactiveSystem } from "../src/reactivity/system-factory.js";
import {
  createTrackingProxy,
  trackSelector,
  hasPathChanged,
} from "../src/reactivity/path-tracking.js";
import type { ActionMap } from "../src/types/actions.js";

// =============================================================================
// Helpers
// =============================================================================

interface CounterState {
  count: number;
}

interface CounterActions extends ActionMap<CounterState> {
  increment: (state: CounterState) => CounterState;
}

const CounterPort = createStatePort<CounterState, CounterActions>()({
  name: "MK7Counter",
});

const ThemePort = createAtomPort<"light" | "dark">()({
  name: "MK7Theme",
});

const DoublePort = createDerivedPort<number>()({
  name: "MK7Double",
});

const AsyncRatePort = createAsyncDerivedPort<number>()({
  name: "MK7Rate",
});

const LinkedFahrenheitPort = createLinkedDerivedPort<number>()({
  name: "MK7Fahrenheit",
});

/**
 * Invokes an adapter factory with the given deps record.
 * Works around the excess property check on object literals by accepting
 * deps as Record<string, unknown> and forwarding to adapter.factory.
 */
function invokeFactory(
  adapter: { factory: (deps: Record<string, unknown>) => unknown },
  deps: Record<string, unknown>
): any {
  return adapter.factory(deps);
}

/**
 * Creates a mock StoreRegistry that satisfies the structural type guard
 * used by extractStoreRegistry.
 */
function createMockRegistry() {
  const registered: any[] = [];
  return {
    registered,
    register: vi.fn((entry: any) => {
      registered.push(entry);
    }),
    getAll: vi.fn(() => registered),
    subscribe: vi.fn(() => () => {}),
    unregister: vi.fn(),
    registerScoped: vi.fn(),
    unregisterScope: vi.fn(),
    get: vi.fn(),
    getAllScoped: vi.fn(() => []),
    dispose: vi.fn(),
  };
}

/**
 * Creates a mock StoreInspectorInternal that satisfies the structural type guard
 * used by extractStoreInspectorInternal.
 */
function createMockInspector() {
  return {
    recordAction: vi.fn(),
    emit: vi.fn(),
    incrementPendingEffects: vi.fn(),
    decrementPendingEffects: vi.fn(),
    registerPort: vi.fn(),
    unregisterPort: vi.fn(),
    registerScopedPort: vi.fn(),
    unregisterScope: vi.fn(),
    getSnapshot: vi.fn(() => ({ timestamp: 0, ports: [], totalSubscribers: 0, pendingEffects: 0 })),
    getPortState: vi.fn(),
    listStatePorts: vi.fn(() => []),
    getSubscriberGraph: vi.fn(() => ({ correlationId: "", nodes: [], edges: [] })),
    getActionHistory: vi.fn(() => []),
    subscribe: vi.fn(() => () => {}),
    actionHistory: { record: vi.fn(), query: vi.fn(() => []), size: 0, clear: vi.fn() },
  };
}

/**
 * Creates a mock StoreTracingHook.
 */
function createMockTracingHook(): StoreTracingHook {
  return {
    onActionStart: vi.fn((): StoreSpanContext => ({ traceId: "t1", spanId: "s1" })),
    onActionEnd: vi.fn(),
  };
}

// =============================================================================
// state-adapter.ts -- inspection ports, tracing, registration, brand
// =============================================================================

describe("state-adapter inspection mutants", () => {
  it("inspection=true adds StoreRegistryPort and StoreInspectorInternalPort to requires", () => {
    // Kills L59: [...inspectionPorts] -> []
    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: { increment: (s: CounterState) => ({ count: s.count + 1 }) },
      inspection: true,
    });

    const adapterObj = adapter as any;
    const requires = adapterObj.requires as any[];
    const portNames = requires.map((p: any) => p.__portName);
    expect(portNames).toContain("StoreRegistry");
    expect(portNames).toContain("StoreInspectorInternal");
  });

  it("inspection=false does NOT include inspection ports in requires", () => {
    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: { increment: (s: CounterState) => ({ count: s.count + 1 }) },
      inspection: false,
    });

    const adapterObj = adapter as any;
    const requires = adapterObj.requires as any[];
    const portNames = requires.map((p: any) => p.__portName);
    expect(portNames).not.toContain("StoreRegistry");
    expect(portNames).not.toContain("StoreInspectorInternal");
  });

  it("auto-tracing from deps: tracingHook falls back to deps.StoreTracingHook when inspection=true", () => {
    // Kills L83-84: tracingHook extraction with && -> ||
    const mockRegistry = createMockRegistry();
    const mockInspector = createMockInspector();
    const mockTracingHook = createMockTracingHook();

    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: { increment: (s: CounterState) => ({ count: s.count + 1 }) },
      inspection: true,
      // No explicit tracingHook -- should auto-extract from deps
    });

    const service = invokeFactory(adapter, {
      StoreRegistry: mockRegistry,
      StoreInspectorInternal: mockInspector,
      StoreTracingHook: mockTracingHook,
    });

    // Dispatch an action -- the tracing hook should be called
    service.actions.increment();

    expect(mockTracingHook.onActionStart).toHaveBeenCalled();
    expect(mockTracingHook.onActionEnd).toHaveBeenCalled();

    service.dispose();
  });

  it("explicit tracingHook takes precedence over deps.StoreTracingHook", () => {
    // Kills L83-84: tracingHook extraction with && -> ||
    const mockRegistry = createMockRegistry();
    const mockInspector = createMockInspector();
    const depsTracingHook = createMockTracingHook();
    const explicitTracingHook = createMockTracingHook();

    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: { increment: (s: CounterState) => ({ count: s.count + 1 }) },
      inspection: true,
      tracingHook: explicitTracingHook,
    });

    const service = invokeFactory(adapter, {
      StoreRegistry: mockRegistry,
      StoreInspectorInternal: mockInspector,
      StoreTracingHook: depsTracingHook,
    });

    service.actions.increment();

    // Explicit should be used, not deps one
    expect(explicitTracingHook.onActionStart).toHaveBeenCalled();
    expect(depsTracingHook.onActionStart).not.toHaveBeenCalled();

    service.dispose();
  });

  it("inspection=true registers with StoreRegistry, entry has brand and correct portName", () => {
    // Kills L99-106: if condition, array/arrow function mutations
    // Kills L103: brand object mutations (true -> false, object -> {})
    const mockRegistry = createMockRegistry();
    const mockInspector = createMockInspector();

    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: { increment: (s: CounterState) => ({ count: s.count + 1 }) },
      inspection: true,
    });

    invokeFactory(adapter, {
      StoreRegistry: mockRegistry,
      StoreInspectorInternal: mockInspector,
    });

    // Registry.register must have been called
    expect(mockRegistry.register).toHaveBeenCalledTimes(1);
    const entry = mockRegistry.registered[0];
    expect(entry).toBeDefined();
    expect(entry.portName).toBe("MK7Counter");

    // The branded object passed to buildStateRegistryEntry should have the brand symbol
    // The adapter property of the entry is the branded object
    expect(entry.adapter).toBeDefined();
    expect(entry.adapter[__stateAdapterBrand]).toBe(true);
  });

  it("inspection=false does NOT register with StoreRegistry", () => {
    const mockRegistry = createMockRegistry();

    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: { increment: (s: CounterState) => ({ count: s.count + 1 }) },
      inspection: false,
    });

    invokeFactory(adapter, { StoreRegistry: mockRegistry });

    expect(mockRegistry.register).not.toHaveBeenCalled();
  });

  it("inspection registration passes correct requireNames from config.requires", () => {
    // Kills L102: (config.requires ?? []).map(p => p.__portName) -> [].map(...)
    const mockRegistry = createMockRegistry();
    const mockInspector = createMockInspector();
    const DepPort = createAtomPort<string>()({ name: "MK7Dep" });

    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: { increment: (s: CounterState) => ({ count: s.count + 1 }) },
      requires: [DepPort],
      inspection: true,
    });

    invokeFactory(adapter, {
      StoreRegistry: mockRegistry,
      StoreInspectorInternal: mockInspector,
      MK7Dep: "dep-value",
    });

    expect(mockRegistry.register).toHaveBeenCalledTimes(1);
    const entry = mockRegistry.registered[0];
    expect(entry.requires).toContain("MK7Dep");
  });
});

// =============================================================================
// atom-adapter.ts -- inspection ports, service config, portName, registration, brand
// =============================================================================

describe("atom-adapter inspection mutants", () => {
  it("inspection=true adds inspection ports to requires", () => {
    // Kills L36: inspectionPorts -> []
    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "light",
      inspection: true,
    });

    const adapterObj = adapter as any;
    const requires = adapterObj.requires as any[];
    const portNames = requires.map((p: any) => p.__portName);
    expect(portNames).toContain("StoreRegistry");
    expect(portNames).toContain("StoreInspectorInternal");
  });

  it("inspection=false has no inspection ports in requires", () => {
    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "light",
      inspection: false,
    });

    const adapterObj = adapter as any;
    const requires = adapterObj.requires as any[];
    expect(requires.length).toBe(0);
  });

  it("factory creates service with correct portName and initial value", () => {
    // Kills L52: Object literal (service config) -> {}
    // Kills L54: portName string -> ""
    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "dark" as "light" | "dark",
    });

    const service = invokeFactory(adapter, {});
    // The atom service should have the correct initial value
    expect(service.value).toBe("dark");
    service.dispose();
  });

  it("inspection=true registers with registry, entry has brand", () => {
    // Kills L61-65: registration block mutations
    // Kills L64: brand object and boolean mutations
    const mockRegistry = createMockRegistry();
    const mockInspector = createMockInspector();

    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "light",
      inspection: true,
    });

    invokeFactory(adapter, {
      StoreRegistry: mockRegistry,
      StoreInspectorInternal: mockInspector,
    });

    expect(mockRegistry.register).toHaveBeenCalledTimes(1);
    const entry = mockRegistry.registered[0];
    expect(entry).toBeDefined();
    expect(entry.portName).toBe("MK7Theme");
    expect(entry.adapter).toBeDefined();
    expect(entry.adapter[__atomAdapterBrand]).toBe(true);
  });

  it("inspection=false does not register", () => {
    const mockRegistry = createMockRegistry();

    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "light",
    });

    invokeFactory(adapter, { StoreRegistry: mockRegistry });
    expect(mockRegistry.register).not.toHaveBeenCalled();
  });
});

// =============================================================================
// async-derived-adapter.ts -- inspection ports, requires, registration
// =============================================================================

describe("async-derived-adapter inspection mutants", () => {
  it("inspection=true adds inspection ports to requires", () => {
    // Kills L55: inspectionPorts -> []
    const adapter = createAsyncDerivedAdapter({
      provides: AsyncRatePort,
      requires: [],
      select: () => ResultAsync.ok(42),
      inspection: true,
    });

    const adapterObj = adapter as any;
    const requires = adapterObj.requires as any[];
    const portNames = requires.map((p: any) => p.__portName);
    expect(portNames).toContain("StoreRegistry");
    expect(portNames).toContain("StoreInspectorInternal");
  });

  it("config.requires are included in adapter requires along with inspection ports", () => {
    // Kills L58: requires array -> []
    const DepPort = createAtomPort<string>()({ name: "MK7AsyncDep" });
    const adapter = createAsyncDerivedAdapter({
      provides: AsyncRatePort,
      requires: [DepPort],
      select: () => ResultAsync.ok(42),
      inspection: true,
    });

    const adapterObj = adapter as any;
    const requires = adapterObj.requires as any[];
    const portNames = requires.map((p: any) => p.__portName);
    expect(portNames).toContain("MK7AsyncDep");
    expect(portNames).toContain("StoreRegistry");
    expect(portNames).toContain("StoreInspectorInternal");
    expect(requires.length).toBe(3);
  });

  it("inspection=true registers with registry, brand present", () => {
    // Kills L87-91: registration block, condition, arrow, object, boolean
    const mockRegistry = createMockRegistry();
    const mockInspector = createMockInspector();

    const adapter = createAsyncDerivedAdapter({
      provides: AsyncRatePort,
      requires: [],
      select: () => ResultAsync.ok(42),
      inspection: true,
    });

    invokeFactory(adapter, {
      StoreRegistry: mockRegistry,
      StoreInspectorInternal: mockInspector,
    });

    expect(mockRegistry.register).toHaveBeenCalledTimes(1);
    const entry = mockRegistry.registered[0];
    expect(entry).toBeDefined();
    expect(entry.portName).toBe("MK7Rate");
    expect(entry.adapter[__asyncDerivedAdapterBrand]).toBe(true);
  });

  it("inspection=false does not register", () => {
    const mockRegistry = createMockRegistry();

    const adapter = createAsyncDerivedAdapter({
      provides: AsyncRatePort,
      requires: [],
      select: () => ResultAsync.ok(42),
    });

    invokeFactory(adapter, { StoreRegistry: mockRegistry });
    expect(mockRegistry.register).not.toHaveBeenCalled();
  });

  it("registration passes correct requireNames", () => {
    const mockRegistry = createMockRegistry();
    const mockInspector = createMockInspector();
    const DepPort = createAtomPort<string>()({ name: "MK7AsyncReqDep" });

    const adapter = createAsyncDerivedAdapter({
      provides: AsyncRatePort,
      requires: [DepPort],
      select: () => ResultAsync.ok(42),
      inspection: true,
    });

    invokeFactory(adapter, {
      StoreRegistry: mockRegistry,
      StoreInspectorInternal: mockInspector,
      MK7AsyncReqDep: "some-dep",
    });

    const entry = mockRegistry.registered[0];
    expect(entry.requires).toContain("MK7AsyncReqDep");
  });
});

// =============================================================================
// derived-adapter.ts -- inspection ports, registration
// =============================================================================

describe("derived-adapter inspection mutants", () => {
  it("inspection=true adds inspection ports to requires", () => {
    // Kills L53: inspectionPorts -> []
    const adapter = createDerivedAdapter({
      provides: DoublePort,
      requires: [],
      select: () => 42,
      inspection: true,
    });

    const adapterObj = adapter as any;
    const requires = adapterObj.requires as any[];
    const portNames = requires.map((p: any) => p.__portName);
    expect(portNames).toContain("StoreRegistry");
    expect(portNames).toContain("StoreInspectorInternal");
  });

  it("inspection=true registers with registry, entry has brand", () => {
    // Kills L80-84: registration block mutations
    const mockRegistry = createMockRegistry();
    const mockInspector = createMockInspector();

    const adapter = createDerivedAdapter({
      provides: DoublePort,
      requires: [],
      select: () => 42,
      inspection: true,
    });

    invokeFactory(adapter, {
      StoreRegistry: mockRegistry,
      StoreInspectorInternal: mockInspector,
    });

    expect(mockRegistry.register).toHaveBeenCalledTimes(1);
    const entry = mockRegistry.registered[0];
    expect(entry.portName).toBe("MK7Double");
    expect(entry.adapter[__derivedAdapterBrand]).toBe(true);
  });

  it("registration passes correct requireNames from config.requires", () => {
    const mockRegistry = createMockRegistry();
    const mockInspector = createMockInspector();
    const DepPort = createAtomPort<string>()({ name: "MK7DerivedDep" });

    const adapter = createDerivedAdapter({
      provides: DoublePort,
      requires: [DepPort],
      select: () => 42,
      inspection: true,
    });

    invokeFactory(adapter, {
      StoreRegistry: mockRegistry,
      StoreInspectorInternal: mockInspector,
      MK7DerivedDep: "dep-val",
    });

    const entry = mockRegistry.registered[0];
    expect(entry.requires).toContain("MK7DerivedDep");
  });

  it("inspection=false does not register", () => {
    const mockRegistry = createMockRegistry();

    const adapter = createDerivedAdapter({
      provides: DoublePort,
      requires: [],
      select: () => 42,
    });

    invokeFactory(adapter, { StoreRegistry: mockRegistry });
    expect(mockRegistry.register).not.toHaveBeenCalled();
  });
});

// =============================================================================
// linked-derived-adapter.ts -- arrays, config, portName, arrows, registration
// =============================================================================

describe("linked-derived-adapter inspection mutants", () => {
  it("inspection=true adds inspection ports to requires", () => {
    // Kills L54, L57: Array mutations
    const adapter = createLinkedDerivedAdapter({
      provides: LinkedFahrenheitPort,
      requires: [],
      select: () => 212,
      write: () => {},
      inspection: true,
    });

    const adapterObj = adapter as any;
    const requires = adapterObj.requires as any[];
    const portNames = requires.map((p: any) => p.__portName);
    expect(portNames).toContain("StoreRegistry");
    expect(portNames).toContain("StoreInspectorInternal");
  });

  it("config.requires are preserved in adapter requires", () => {
    // Kills L57: requires array -> []
    const DepPort = createAtomPort<number>()({ name: "MK7LinkedDep" });
    const adapter = createLinkedDerivedAdapter({
      provides: LinkedFahrenheitPort,
      requires: [DepPort],
      select: () => 212,
      write: () => {},
      inspection: true,
    });

    const adapterObj = adapter as any;
    const requires = adapterObj.requires as any[];
    const portNames = requires.map((p: any) => p.__portName);
    expect(portNames).toContain("MK7LinkedDep");
    expect(requires.length).toBe(3); // 1 dep + 2 inspection ports
  });

  it("factory creates service with correct portName, select, and write delegates", () => {
    // Kills L71-78: Object literal for linked-derived config -> {}
    // Kills L73: portName string -> ""
    // Kills L74-75: Arrow functions -> () => undefined
    const selectSpy = vi.fn(() => 100);
    const writeSpy = vi.fn();

    const adapter = createLinkedDerivedAdapter({
      provides: LinkedFahrenheitPort,
      requires: [],
      select: selectSpy,
      write: writeSpy,
    });

    const service = invokeFactory(adapter, {});

    // Accessing value calls select
    const val = service.value;
    expect(selectSpy).toHaveBeenCalled();
    expect(val).toBe(100);

    // Setting calls write
    service.set(200);
    expect(writeSpy).toHaveBeenCalledWith(200, {});

    service.dispose();
  });

  it("inspection=true registers with registry, entry has brand and correct data", () => {
    // Kills L81-86: registration block with all usual mutations
    const mockRegistry = createMockRegistry();
    const mockInspector = createMockInspector();
    const SourcePort = createAtomPort<number>()({ name: "MK7Source" });
    const WritesToPort = createAtomPort<number>()({ name: "MK7WritesTo" });

    const adapter = createLinkedDerivedAdapter({
      provides: LinkedFahrenheitPort,
      requires: [SourcePort],
      select: () => 212,
      write: () => {},
      writesTo: [WritesToPort],
      inspection: true,
    });

    invokeFactory(adapter, {
      StoreRegistry: mockRegistry,
      StoreInspectorInternal: mockInspector,
      MK7Source: 100,
    });

    expect(mockRegistry.register).toHaveBeenCalledTimes(1);
    const entry = mockRegistry.registered[0];
    expect(entry.portName).toBe("MK7Fahrenheit");
    expect(entry.adapter[__linkedDerivedAdapterBrand]).toBe(true);
    expect(entry.requires).toContain("MK7Source");
    expect(entry.writesTo).toContain("MK7WritesTo");
  });

  it("inspection=false does not register", () => {
    const mockRegistry = createMockRegistry();

    const adapter = createLinkedDerivedAdapter({
      provides: LinkedFahrenheitPort,
      requires: [],
      select: () => 212,
      write: () => {},
    });

    invokeFactory(adapter, { StoreRegistry: mockRegistry });
    expect(mockRegistry.register).not.toHaveBeenCalled();
  });
});

// =============================================================================
// batch.ts -- cross-container detection, depth tracking, conditions
// =============================================================================

describe("batch cross-container detection", () => {
  afterEach(() => {
    setBatchDiagnostics(null);
  });

  it("fires callback when different container enters batch while another is active", () => {
    // Kills L104: condition -> true
    const calls: any[] = [];
    setBatchDiagnostics((newTarget, existingTarget) => {
      calls.push({ newTarget, existingTarget });
    });

    const containerA = { name: "A" };
    const containerB = { name: "B" };

    // Start a nested batch: containerA first, then containerB inside
    batch(containerA, () => {
      batch(containerB, () => {
        // Both are in batch
      });
    });

    expect(calls.length).toBe(1);
    expect(calls[0].newTarget).toBe(containerB);
    expect(calls[0].existingTarget).toBe(containerA);
  });

  it("does NOT fire callback when same container enters nested batch", () => {
    const calls: any[] = [];
    setBatchDiagnostics((newTarget, existingTarget) => {
      calls.push({ newTarget, existingTarget });
    });

    const container = { name: "same" };

    batch(container, () => {
      batch(container, () => {
        // Nested same container -- should not fire
      });
    });

    expect(calls.length).toBe(0);
  });

  it("does NOT fire callback when no diagnostics callback is set", () => {
    // Kills L104: _onCrossContainerBatch !== null && _activeBatchTarget !== null -> true
    // Without callback, even if condition is true, nothing should happen
    const containerA = { name: "A" };
    const containerB = { name: "B" };

    // Should not throw
    batch(containerA, () => {
      batch(containerB, () => {});
    });
  });
});

describe("batch depth tracking", () => {
  afterEach(() => {
    setBatchDiagnostics(null);
  });

  it("tracks nested batch depth correctly for a container", () => {
    const container = {};

    expect(getBatchDepth(container)).toBe(0);
    expect(isInBatch(container)).toBe(false);

    batch(container, () => {
      expect(getBatchDepth(container)).toBe(1);
      expect(isInBatch(container)).toBe(true);

      batch(container, () => {
        expect(getBatchDepth(container)).toBe(2);
      });

      // After inner batch ends, depth goes back to 1
      expect(getBatchDepth(container)).toBe(1);
    });

    // After all batches end, depth is 0
    expect(getBatchDepth(container)).toBe(0);
    expect(isInBatch(container)).toBe(false);
  });

  it("batch with null container skips depth tracking", () => {
    // Kills L132: containerOrScope !== null -> true
    // With null, no depth tracking should occur
    batch(null, () => {
      // No container to track
    });
    // No error thrown is sufficient
  });

  it("depth <= 1 clears the entry, depth > 1 decrements", () => {
    // Kills L134: depth <= 1 -> depth < 1
    // When depth is exactly 1, <= 1 is true (delete entry)
    // When depth is exactly 1, < 1 is false (would decrement to 0 instead of deleting)
    const container = {};

    batch(container, () => {
      // depth=1 inside
      expect(getBatchDepth(container)).toBe(1);
    });

    // After batch with depth exactly 1, the entry should be deleted (depth=0)
    expect(getBatchDepth(container)).toBe(0);

    // Test depth=2 scenario to verify decrement path
    batch(container, () => {
      batch(container, () => {
        expect(getBatchDepth(container)).toBe(2);
      });
      // Decremented from 2 to 1 (not deleted)
      expect(getBatchDepth(container)).toBe(1);
    });
    expect(getBatchDepth(container)).toBe(0);
  });

  it("_activeBatchTarget is set on first batch and cleared when outermost completes", () => {
    // Kills L113: _activeBatchTarget === null || _activeBatchTarget.deref() === undefined -> true
    // Kills L141: _activeBatchTarget !== null -> true
    // Kills L143: ref === containerOrScope && (...) -> true
    const containerA = {};
    const containerB = {};
    const calls: any[] = [];
    setBatchDiagnostics((newT, existingT) => {
      calls.push({ newT, existingT });
    });

    // First batch sets _activeBatchTarget to containerA
    batch(containerA, () => {
      // Nested batch with different container should detect cross-container
      batch(containerB, () => {});
      expect(calls.length).toBe(1);
    });

    // After containerA batch ends and depth is 0, _activeBatchTarget should be cleared.
    // Now starting a new batch with containerB should NOT detect cross-container
    // (because _activeBatchTarget was cleared).
    calls.length = 0;
    batch(containerB, () => {});
    expect(calls.length).toBe(0);
  });
});

describe("batch with reactive system", () => {
  it("uses system.startBatch/endBatch when system is provided", () => {
    const system = createIsolatedReactiveSystem();
    const container = {};
    const startSpy = vi.spyOn(system, "startBatch");
    const endSpy = vi.spyOn(system, "endBatch");

    batch(container, () => {}, system);

    expect(startSpy).toHaveBeenCalled();
    expect(endSpy).toHaveBeenCalled();
  });
});

// =============================================================================
// signals.ts -- system path, double-dispose
// =============================================================================

describe("signals with system vs without system", () => {
  it("createSignal without system uses global alien-signals", () => {
    // Kills L31: system !== undefined -> false (always takes global path)
    const sig = createSignal(0);
    sig.set(5);
    expect(sig.get()).toBe(5);
    expect(sig.peek()).toBe(5);
  });

  it("createSignal with system uses isolated system", () => {
    // Kills L31: system !== undefined -> false
    // Kills L34-38: block statements for system-path
    const system = createIsolatedReactiveSystem();
    const sig = createSignal(10, system);
    sig.set(20);
    expect(sig.get()).toBe(20);
    expect(sig.peek()).toBe(20);
  });

  it("signals from different systems are independent", () => {
    const systemA = createIsolatedReactiveSystem();
    const systemB = createIsolatedReactiveSystem();

    const sigA = createSignal(1, systemA);
    const sigB = createSignal(2, systemB);

    // Computed in system A should not see signals from system B
    const compA = createComputed(() => sigA.get() * 10, systemA);
    expect(compA.get()).toBe(10);

    sigA.set(3);
    expect(compA.get()).toBe(30);

    // sigB changes don't affect compA
    sigB.set(99);
    expect(compA.get()).toBe(30);
  });

  it("createComputed with system uses isolated system", () => {
    const system = createIsolatedReactiveSystem();
    const sig = createSignal(5, system);
    const comp = createComputed(() => sig.get() + 1, system);
    expect(comp.get()).toBe(6);
    expect(comp.peek()).toBe(6);
    sig.set(10);
    expect(comp.get()).toBe(11);
  });

  it("createComputed without system uses global alien-signals", () => {
    const sig = createSignal(5);
    const comp = createComputed(() => sig.get() + 1);
    expect(comp.get()).toBe(6);
    sig.set(10);
    expect(comp.get()).toBe(11);
  });

  it("createEffect with system uses isolated system", () => {
    const system = createIsolatedReactiveSystem();
    const sig = createSignal(0, system);
    const values: number[] = [];

    const eff = createEffect(() => {
      values.push(sig.get());
    }, system);

    expect(values).toEqual([0]); // effect runs immediately

    system.startBatch();
    sig.set(1);
    system.endBatch();

    expect(values).toContain(1);
    eff.dispose();
  });

  it("createEffect without system uses global alien-signals", () => {
    const sig = createSignal(0);
    const values: number[] = [];

    const eff = createEffect(() => {
      values.push(sig.get());
    });

    expect(values).toEqual([0]);

    sig.set(1);
    expect(values).toContain(1);
    eff.dispose();
  });

  it("double-dispose does not throw and second dispose is a no-op", () => {
    // Kills L149: !disposed -> true (double-dispose)
    const sig = createSignal(0);
    const values: number[] = [];

    const eff = createEffect(() => {
      values.push(sig.get());
    });

    expect(values).toEqual([0]);

    // First dispose
    eff.dispose();

    // Second dispose should be a no-op (not throw)
    expect(() => eff.dispose()).not.toThrow();
  });

  it("disposed effect run() is a no-op", () => {
    const sig = createSignal(0);
    let runCount = 0;

    const eff = createEffect(() => {
      runCount++;
      sig.get(); // track dependency
    });

    expect(runCount).toBe(1);
    eff.dispose();

    // After dispose, run() should be a no-op
    eff.run();
    expect(runCount).toBe(1);
  });

  it("untracked with system uses system subscriber tracking", () => {
    const system = createIsolatedReactiveSystem();
    const sig = createSignal(42, system);

    const result = untracked(() => sig.get(), system);
    expect(result).toBe(42);
  });

  it("untracked without system uses global alien-signals tracking", () => {
    const sig = createSignal(42);

    const result = untracked(() => sig.get());
    expect(result).toBe(42);
  });
});

// =============================================================================
// path-tracking.ts -- typeof guard, non-configurable/non-writable checks
// =============================================================================

describe("path-tracking proxy", () => {
  it("non-object values are returned as-is without proxy", () => {
    // Kills L49: typeof value !== "object" condition
    const { proxy, paths } = createTrackingProxy(42 as any);
    // Primitives can't be proxied, so proxy should be the value itself
    expect(proxy).toBe(42);
    expect(paths.size).toBe(0);
  });

  it("null is returned as-is (isRecord returns false)", () => {
    const { proxy, paths } = createTrackingProxy(null as any);
    expect(proxy).toBeNull();
    expect(paths.size).toBe(0);
  });

  it("tracks paths on regular objects", () => {
    const state = { a: { b: { c: 1 } }, d: 2 };
    const { proxy, paths } = createTrackingProxy(state);

    // Access nested path
    const _val = (proxy as any).a.b.c;
    const _val2 = (proxy as any).d;

    expect(paths.has("a")).toBe(true);
    expect(paths.has("a.b")).toBe(true);
    expect(paths.has("a.b.c")).toBe(true);
    expect(paths.has("d")).toBe(true);
  });

  it("non-configurable non-writable property returns original value (no nested proxy)", () => {
    // Kills L66-68: desc existence and desc.configurable / desc.writable checks
    const obj: any = {};
    const nested = { inner: 42 };
    Object.defineProperty(obj, "frozen", {
      value: nested,
      configurable: false,
      writable: false,
      enumerable: true,
    });

    const { proxy, paths } = createTrackingProxy(obj);

    // Accessing the non-configurable non-writable property should return the
    // original value (not a proxy), but the path should still be tracked
    const result = (proxy as any).frozen;
    expect(paths.has("frozen")).toBe(true);
    expect(result).toBe(nested); // Same object reference, not a proxy
  });

  it("configurable property returns a proxy for nested access", () => {
    const obj: any = {};
    const nested = { inner: 42 };
    Object.defineProperty(obj, "mutable", {
      value: nested,
      configurable: true,
      writable: true,
      enumerable: true,
    });

    const { proxy, paths } = createTrackingProxy(obj);

    const inner = (proxy as any).mutable.inner;
    expect(paths.has("mutable")).toBe(true);
    expect(paths.has("mutable.inner")).toBe(true);
    expect(inner).toBe(42);
  });

  it("non-configurable but writable property returns a proxy (only both non-configurable AND non-writable skips proxy)", () => {
    const obj: any = {};
    const nested = { value: 10 };
    Object.defineProperty(obj, "ncw", {
      value: nested,
      configurable: false,
      writable: true,
      enumerable: true,
    });

    const { proxy, paths } = createTrackingProxy(obj);

    // non-configurable but writable: the condition `!desc.configurable && !desc.writable`
    // is false because writable is true. So nested proxy should be created.
    const inner = (proxy as any).ncw.value;
    expect(paths.has("ncw")).toBe(true);
    expect(paths.has("ncw.value")).toBe(true);
    expect(inner).toBe(10);
  });

  it("configurable but non-writable property returns a proxy", () => {
    const obj: any = {};
    const nested = { value: 20 };
    Object.defineProperty(obj, "cnw", {
      value: nested,
      configurable: true,
      writable: false,
      enumerable: true,
    });

    const { proxy, paths } = createTrackingProxy(obj);

    const inner = (proxy as any).cnw.value;
    expect(paths.has("cnw")).toBe(true);
    expect(paths.has("cnw.value")).toBe(true);
    expect(inner).toBe(20);
  });

  it("frozen object property returns original value (frozen = non-configurable + non-writable)", () => {
    const frozen = Object.freeze({ x: 1, y: 2 });

    // Use Object.defineProperty to make `data` non-configurable and non-writable
    const obj: any = {};
    Object.defineProperty(obj, "data", {
      value: frozen,
      configurable: false,
      writable: false,
      enumerable: true,
    });

    const { proxy, paths } = createTrackingProxy(obj);
    const result = (proxy as any).data;
    expect(paths.has("data")).toBe(true);
    // Should return the original frozen object, not a proxy
    expect(result).toBe(frozen);
  });

  it("symbol keys are not tracked", () => {
    const sym = Symbol("test");
    const state = { [sym]: "hidden", visible: "tracked" };
    const { proxy, paths } = createTrackingProxy(state);

    const _s = (proxy as any)[sym];
    const _v = (proxy as any).visible;

    // Only string key should be tracked
    expect(paths.has("visible")).toBe(true);
    expect(paths.size).toBe(1);
  });

  it("property without own descriptor (inherited) still creates nested proxy", () => {
    // When desc is undefined (property inherited from prototype), the condition
    // `if (desc && !desc.configurable && !desc.writable)` is false, so proxy is created.
    const proto = { nested: { val: 42 } };
    const obj = Object.create(proto);

    const { proxy, paths } = createTrackingProxy(obj);
    const val = (proxy as any).nested.val;
    expect(paths.has("nested")).toBe(true);
    expect(paths.has("nested.val")).toBe(true);
    expect(val).toBe(42);
  });
});

describe("trackSelector", () => {
  it("tracks accessed paths during selector execution", () => {
    const state = { user: { name: "Alice", age: 30 }, settings: { theme: "dark" } };
    const result = trackSelector(state, (s: any) => s.user.name);

    expect(result.value).toBe("Alice");
    expect(result.paths.has("user")).toBe(true);
    expect(result.paths.has("user.name")).toBe(true);
    expect(result.paths.has("settings")).toBe(false);
  });
});

describe("hasPathChanged", () => {
  it("returns true when a tracked path differs", () => {
    const prev = { a: { b: 1 } };
    const next = { a: { b: 2 } };
    const paths = new Set(["a.b"]);
    expect(hasPathChanged(prev, next, paths)).toBe(true);
  });

  it("returns false when all tracked paths are identical", () => {
    const prev = { a: { b: 1 }, c: 3 };
    const next = { a: { b: 1 }, c: 99 };
    const paths = new Set(["a.b"]);
    expect(hasPathChanged(prev, next, paths)).toBe(false);
  });

  it("handles non-object intermediates gracefully", () => {
    const prev = { a: null as any };
    const next = { a: { b: 1 } };
    const paths = new Set(["a.b"]);
    // prev.a is null, so prev.a.b is undefined; next.a.b is 1
    expect(hasPathChanged(prev, next, paths)).toBe(true);
  });
});
