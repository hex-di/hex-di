/**
 * Tests for FlowLibraryInspectorAdapter
 *
 * Verifies that the frozen singleton adapter correctly:
 * - Is frozen (immutable)
 * - Provides FlowLibraryInspectorPort
 * - Requires [FlowInspectorPort, FlowRegistryPort]
 * - Has singleton lifetime and sync factoryKind
 * - Factory returns valid LibraryInspector (name, getSnapshot, subscribe, dispose)
 * - Factory delegates getSnapshot to provided FlowRegistry mock
 * - Port has category "library-inspector" metadata (auto-registration precondition)
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { getPortMetadata } from "@hex-di/core";
import { FlowLibraryInspectorAdapter } from "../../src/integration/library-inspector-adapter.js";
import {
  FlowLibraryInspectorPort,
  FlowInspectorPort,
  FlowRegistryPort,
} from "../../src/integration/types.js";
import type { FlowInspector, FlowRegistry } from "../../src/introspection/types.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockFlowInspector(): FlowInspector {
  return {
    getMachineState: vi.fn().mockReturnValue(undefined),
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
  };
}

function createMockFlowRegistry(): FlowRegistry {
  return {
    register: vi.fn(),
    unregister: vi.fn(),
    getAllMachines: vi.fn().mockReturnValue([]),
    getMachine: vi.fn().mockReturnValue(undefined),
    getMachinesByState: vi.fn().mockReturnValue([]),
    getAllPortNames: vi.fn().mockReturnValue([]),
    getTotalMachineCount: vi.fn().mockReturnValue(0),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    dispose: vi.fn(),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("FlowLibraryInspectorAdapter", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(FlowLibraryInspectorAdapter)).toBe(true);
  });

  it("provides FlowLibraryInspectorPort", () => {
    expect(FlowLibraryInspectorAdapter.provides).toBe(FlowLibraryInspectorPort);
  });

  it("requires [FlowInspectorPort, FlowRegistryPort]", () => {
    expect(FlowLibraryInspectorAdapter.requires).toHaveLength(2);
    expect(FlowLibraryInspectorAdapter.requires[0]).toBe(FlowInspectorPort);
    expect(FlowLibraryInspectorAdapter.requires[1]).toBe(FlowRegistryPort);
  });

  it("has singleton lifetime", () => {
    expect(FlowLibraryInspectorAdapter.lifetime).toBe("singleton");
  });

  it("has sync factoryKind", () => {
    expect(FlowLibraryInspectorAdapter.factoryKind).toBe("sync");
  });

  it("is not clonable", () => {
    expect(FlowLibraryInspectorAdapter.clonable).toBe(false);
  });

  it("factory returns a LibraryInspector with name 'flow'", () => {
    const result = FlowLibraryInspectorAdapter.factory({
      FlowInspector: createMockFlowInspector(),
      FlowRegistry: createMockFlowRegistry(),
    });

    expect(result.name).toBe("flow");
    expect(typeof result.getSnapshot).toBe("function");
    expect(typeof result.subscribe).toBe("function");
    expect(typeof result.dispose).toBe("function");
  });

  it("factory delegates to createFlowLibraryInspector", () => {
    const mockInspector = createMockFlowInspector();
    const mockRegistry = createMockFlowRegistry();

    const result = FlowLibraryInspectorAdapter.factory({
      FlowInspector: mockInspector,
      FlowRegistry: mockRegistry,
    });

    // getSnapshot should call through to FlowRegistry.getAllMachines
    result.getSnapshot();
    expect(mockRegistry.getAllMachines).toHaveBeenCalled();
  });
});

describe("FlowLibraryInspectorPort (auto-registration precondition)", () => {
  it("has category 'library-inspector'", () => {
    const meta = getPortMetadata(FlowLibraryInspectorPort);
    expect(meta?.category).toBe("library-inspector");
  });
});
