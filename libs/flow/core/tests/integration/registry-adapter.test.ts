/**
 * Tests for FlowRegistryAdapter
 *
 * Verifies that the adapter provides the correct port, has singleton lifetime,
 * creates a working registry, and properly disposes via the finalizer.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { FlowRegistryAdapter } from "../../src/integration/registry-adapter.js";
import { FlowRegistryPort } from "../../src/integration/types.js";
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

describe("FlowRegistryAdapter", () => {
  it("provides FlowRegistryPort", () => {
    expect(FlowRegistryAdapter.provides).toBe(FlowRegistryPort);
  });

  it("has singleton lifetime", () => {
    expect(FlowRegistryAdapter.lifetime).toBe("singleton");
  });

  it("factory creates a working registry", () => {
    const registry = FlowRegistryAdapter.factory({} as never);

    // Register a machine entry
    registry.register({
      portName: "TestFlow",
      instanceId: "TestFlow-1",
      machineId: "test-machine",
      state: () => "idle",
      snapshot: mockSnapshot,
      createdAt: Date.now(),
      validEvents: () => ["START"],
    });

    const machines = registry.getAllMachines();
    expect(machines).toHaveLength(1);
    expect(machines[0].portName).toBe("TestFlow");
    expect(machines[0].instanceId).toBe("TestFlow-1");

    registry.dispose();
  });

  it("finalizer disposes registry", () => {
    const registry = FlowRegistryAdapter.factory({} as never);

    // Register a machine entry
    registry.register({
      portName: "TestFlow",
      instanceId: "TestFlow-1",
      machineId: "test-machine",
      state: () => "idle",
      snapshot: mockSnapshot,
      createdAt: Date.now(),
      validEvents: () => [],
    });

    expect(registry.getAllMachines()).toHaveLength(1);

    // Call the finalizer
    void FlowRegistryAdapter.finalizer?.(registry);

    // After disposal, the registry should be cleared
    expect(registry.getAllMachines()).toHaveLength(0);
  });
});
