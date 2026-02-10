/**
 * Tests for createFlowLibraryInspector
 *
 * Verifies that the library inspector bridge correctly:
 * - Reports name "flow"
 * - Returns snapshot data from registry and inspector
 * - Freezes all snapshot data
 * - Forwards registry events as LibraryEvent
 * - Delegates dispose to FlowInspector
 * - Port metadata is correct
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { getPortMetadata } from "@hex-di/core";
import { createFlowLibraryInspector } from "../../src/integration/library-inspector-bridge.js";
import { FlowLibraryInspectorPort } from "../../src/integration/types.js";
import type {
  FlowInspector,
  FlowRegistry,
  RegistryEntry,
  RegistryListener,
  HealthEvent,
} from "../../src/introspection/types.js";
import type { MachineSnapshot } from "../../src/runner/types.js";

// =============================================================================
// Test Helpers
// =============================================================================

function mockSnapshot(): MachineSnapshot<string, unknown> {
  return {
    state: "idle",
    context: {},
    activities: [],
    pendingEvents: [],
    stateValue: "idle",
    matches: () => false,
    can: () => false,
  };
}

function createMockRegistryEntry(overrides: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    portName: "TestFlow",
    instanceId: "TestFlow-1",
    machineId: "test-machine",
    state: () => "idle",
    snapshot: mockSnapshot,
    createdAt: Date.now(),
    validEvents: () => ["START"],
    scopeId: "scope-1",
    ...overrides,
  };
}

function createMockFlowInspector(overrides: Partial<FlowInspector> = {}): FlowInspector {
  return {
    getMachineState: vi.fn(),
    getValidTransitions: vi.fn().mockReturnValue([]),
    getRunningActivities: vi.fn().mockReturnValue([]),
    getEventHistory: vi.fn().mockReturnValue([]),
    getStateHistory: vi.fn().mockReturnValue([]),
    getEffectHistory: vi.fn().mockReturnValue([]),
    getAllMachinesSnapshot: vi.fn().mockReturnValue([]),
    getHealthEvents: vi.fn().mockReturnValue([]),
    getEffectResultStatistics: vi.fn().mockReturnValue(new Map()),
    getHighErrorRatePorts: vi.fn().mockReturnValue([]),
    getPendingEvents: vi.fn().mockReturnValue([]),
    recordEffectResult: vi.fn(),
    recordHealthEvent: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    dispose: vi.fn(),
    ...overrides,
  };
}

function createMockFlowRegistry(overrides: Partial<FlowRegistry> = {}): FlowRegistry {
  return {
    register: vi.fn(),
    unregister: vi.fn(),
    getAllMachines: vi.fn().mockReturnValue([]),
    getMachine: vi.fn(),
    getMachinesByState: vi.fn().mockReturnValue([]),
    getAllPortNames: vi.fn().mockReturnValue([]),
    getTotalMachineCount: vi.fn().mockReturnValue(0),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    dispose: vi.fn(),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("createFlowLibraryInspector", () => {
  it("returns object with name 'flow'", () => {
    const inspector = createMockFlowInspector();
    const registry = createMockFlowRegistry();

    const libraryInspector = createFlowLibraryInspector(inspector, registry);

    expect(libraryInspector.name).toBe("flow");
  });

  it("getSnapshot returns machine count and machine data from registry", () => {
    const entry1 = createMockRegistryEntry({
      portName: "FlowA",
      instanceId: "FlowA-1",
      machineId: "machine-a",
      state: () => "running",
      scopeId: "scope-a",
    });
    const entry2 = createMockRegistryEntry({
      portName: "FlowB",
      instanceId: "FlowB-1",
      machineId: "machine-b",
      state: () => "idle",
      scopeId: "scope-b",
    });

    const inspector = createMockFlowInspector();
    const registry = createMockFlowRegistry({
      getAllMachines: vi.fn().mockReturnValue([entry1, entry2]),
    });

    const libraryInspector = createFlowLibraryInspector(inspector, registry);
    const snapshot = libraryInspector.getSnapshot();

    expect(snapshot.machineCount).toBe(2);

    const machines = snapshot.machines;
    expect(Array.isArray(machines)).toBe(true);

    const machineArray = machines as ReadonlyArray<Record<string, unknown>>;
    expect(machineArray).toHaveLength(2);
    expect(machineArray[0]).toEqual({
      portName: "FlowA",
      instanceId: "FlowA-1",
      machineId: "machine-a",
      state: "running",
      scopeId: "scope-a",
    });
    expect(machineArray[1]).toEqual({
      portName: "FlowB",
      instanceId: "FlowB-1",
      machineId: "machine-b",
      state: "idle",
      scopeId: "scope-b",
    });
  });

  it("getSnapshot returns frozen snapshot", () => {
    const entry = createMockRegistryEntry();
    const inspector = createMockFlowInspector();
    const registry = createMockFlowRegistry({
      getAllMachines: vi.fn().mockReturnValue([entry]),
    });

    const libraryInspector = createFlowLibraryInspector(inspector, registry);
    const snapshot = libraryInspector.getSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.machines)).toBe(true);

    const machineArray = snapshot.machines as ReadonlyArray<Record<string, unknown>>;
    expect(Object.isFrozen(machineArray[0])).toBe(true);
    expect(Object.isFrozen(snapshot.healthEvents)).toBe(true);
    expect(Object.isFrozen(snapshot.effectStatistics)).toBe(true);
  });

  it("getSnapshot returns health events from FlowInspector", () => {
    const healthEvents: readonly HealthEvent[] = [
      { type: "flow-error", machineId: "m1", state: "broken", timestamp: 1000 },
      { type: "flow-recovered", machineId: "m1", fromState: "broken", timestamp: 2000 },
    ];

    const inspector = createMockFlowInspector({
      getHealthEvents: vi.fn().mockReturnValue(healthEvents),
    });
    const registry = createMockFlowRegistry();

    const libraryInspector = createFlowLibraryInspector(inspector, registry);
    const snapshot = libraryInspector.getSnapshot();

    expect(snapshot.healthEvents).toEqual(healthEvents);
  });

  it("getSnapshot returns effect statistics from FlowInspector", () => {
    const stats = new Map<string, { ok: number; err: number }>([
      ["portA.method1", { ok: 10, err: 2 }],
      ["portB.method2", { ok: 5, err: 0 }],
    ]);

    const inspector = createMockFlowInspector({
      getEffectResultStatistics: vi.fn().mockReturnValue(stats),
    });
    const registry = createMockFlowRegistry();

    const libraryInspector = createFlowLibraryInspector(inspector, registry);
    const snapshot = libraryInspector.getSnapshot();

    expect(snapshot.effectStatistics).toEqual({
      "portA.method1": { ok: 10, err: 2 },
      "portB.method2": { ok: 5, err: 0 },
    });
  });

  it("subscribe forwards registry machine-registered events as LibraryEvent", () => {
    let capturedListener: RegistryListener | undefined;

    const inspector = createMockFlowInspector();
    const registry = createMockFlowRegistry({
      subscribe: vi.fn((listener: RegistryListener) => {
        capturedListener = listener;
        return () => undefined;
      }),
    });

    const libraryInspector = createFlowLibraryInspector(inspector, registry);

    const listener = vi.fn();
    libraryInspector.subscribe!(listener);

    expect(capturedListener).toBeDefined();

    const entry = createMockRegistryEntry({
      portName: "Modal",
      instanceId: "Modal-1",
      machineId: "modal-machine",
    });

    capturedListener!({ type: "machine-registered", entry });

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0];
    expect(event.source).toBe("flow");
    expect(event.type).toBe("machine-registered");
    expect(event.payload).toEqual({
      portName: "Modal",
      instanceId: "Modal-1",
      machineId: "modal-machine",
    });
    expect(typeof event.timestamp).toBe("number");
  });

  it("subscribe forwards registry machine-unregistered events as LibraryEvent", () => {
    let capturedListener: RegistryListener | undefined;

    const inspector = createMockFlowInspector();
    const registry = createMockFlowRegistry({
      subscribe: vi.fn((listener: RegistryListener) => {
        capturedListener = listener;
        return () => undefined;
      }),
    });

    const libraryInspector = createFlowLibraryInspector(inspector, registry);

    const listener = vi.fn();
    libraryInspector.subscribe!(listener);

    expect(capturedListener).toBeDefined();

    capturedListener!({ type: "machine-unregistered", portName: "Modal", instanceId: "Modal-1" });

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0];
    expect(event.source).toBe("flow");
    expect(event.type).toBe("machine-unregistered");
    expect(event.payload).toEqual({
      portName: "Modal",
      instanceId: "Modal-1",
    });
    expect(typeof event.timestamp).toBe("number");
  });

  it("subscribe returns unsubscribe function", () => {
    const unsubscribeFn = vi.fn();
    const inspector = createMockFlowInspector();
    const registry = createMockFlowRegistry({
      subscribe: vi.fn().mockReturnValue(unsubscribeFn),
    });

    const libraryInspector = createFlowLibraryInspector(inspector, registry);

    const unsub = libraryInspector.subscribe!(vi.fn());
    unsub();

    expect(unsubscribeFn).toHaveBeenCalledOnce();
  });

  it("dispose calls flowInspector.dispose()", () => {
    const inspector = createMockFlowInspector();
    const registry = createMockFlowRegistry();

    const libraryInspector = createFlowLibraryInspector(inspector, registry);
    libraryInspector.dispose!();

    expect(inspector.dispose).toHaveBeenCalledOnce();
  });
});

describe("FlowLibraryInspectorPort", () => {
  it("has category 'library-inspector'", () => {
    const meta = getPortMetadata(FlowLibraryInspectorPort);
    expect(meta?.category).toBe("library-inspector");
  });

  it("has name 'FlowLibraryInspector'", () => {
    expect(FlowLibraryInspectorPort.__portName).toBe("FlowLibraryInspector");
  });
});
