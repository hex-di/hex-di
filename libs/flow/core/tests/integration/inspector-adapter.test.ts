/**
 * Tests for createFlowInspectorAdapter
 *
 * Verifies that the adapter provides the correct port, requires FlowRegistryPort,
 * has singleton lifetime, and creates a working inspector from deps.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { createFlowInspectorAdapter } from "../../src/integration/inspector-adapter.js";
import { FlowInspectorPort, FlowRegistryPort } from "../../src/integration/types.js";
import { createFlowRegistry } from "../../src/introspection/flow-registry.js";
import type { MachineSnapshot } from "../../src/runner/types.js";

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

describe("createFlowInspectorAdapter", () => {
  const mockCollector = {
    getTransitions: vi.fn().mockReturnValue([]),
    subscribe: vi.fn().mockReturnValue(() => undefined),
  };

  it("provides FlowInspectorPort", () => {
    const adapter = createFlowInspectorAdapter({ collector: mockCollector });
    expect(adapter.provides).toBe(FlowInspectorPort);
  });

  it("requires FlowRegistryPort", () => {
    const adapter = createFlowInspectorAdapter({ collector: mockCollector });
    expect(adapter.requires).toHaveLength(1);
    expect(adapter.requires[0]).toBe(FlowRegistryPort);
  });

  it("has singleton lifetime", () => {
    const adapter = createFlowInspectorAdapter({ collector: mockCollector });
    expect(adapter.lifetime).toBe("singleton");
  });

  it("factory creates a working inspector given registry in deps", () => {
    const adapter = createFlowInspectorAdapter({ collector: mockCollector });
    const registry = createFlowRegistry();

    // Construct a deps object with FlowRegistry keyed by port name
    const deps = { FlowRegistry: registry };

    const inspector = adapter.factory(deps);

    // Register a machine in the registry
    registry.register({
      portName: "TestFlow",
      instanceId: "TestFlow-1",
      machineId: "test-machine",
      state: () => "idle",
      snapshot: mockSnapshot,
      createdAt: Date.now(),
      validEvents: () => ["START"],
    });

    // Inspector should be able to query the registry
    const snapshot = inspector.getMachineState("TestFlow", "TestFlow-1");
    expect(snapshot).toBeDefined();
    expect(snapshot?.state).toBe("idle");

    const transitions = inspector.getValidTransitions("TestFlow", "TestFlow-1");
    expect(transitions).toEqual(["START"]);

    // Cleanup
    inspector.dispose();
    registry.dispose();
  });
});
