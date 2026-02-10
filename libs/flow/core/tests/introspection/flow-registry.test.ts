/**
 * FlowRegistry Tests
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createFlowRegistry } from "../../src/introspection/flow-registry.js";
import type { FlowRegistry, RegistryEntry, RegistryEvent } from "../../src/introspection/types.js";

function createMockEntry(overrides: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    portName: "TestPort",
    instanceId: "inst-1",
    machineId: "test-machine",
    state: () => "idle",
    snapshot: () => ({
      state: "idle",
      context: {},
      activities: [],
      pendingEvents: [],
      stateValue: "idle",
      matches: () => false,
      can: () => false,
    }),
    createdAt: Date.now(),
    validEvents: () => ["START"],
    ...overrides,
  };
}

describe("FlowRegistry", () => {
  let registry: FlowRegistry;

  beforeEach(() => {
    registry = createFlowRegistry();
  });

  it("register() adds entry, getAllMachines() returns it", () => {
    const entry = createMockEntry();
    registry.register(entry);

    const machines = registry.getAllMachines();
    expect(machines).toHaveLength(1);
    expect(machines[0]?.portName).toBe("TestPort");
    expect(machines[0]?.instanceId).toBe("inst-1");
  });

  it("unregister() removes entry", () => {
    const entry = createMockEntry();
    registry.register(entry);
    expect(registry.getAllMachines()).toHaveLength(1);

    registry.unregister("TestPort", "inst-1");
    expect(registry.getAllMachines()).toHaveLength(0);
  });

  it("getMachine() by portName + instanceId", () => {
    const entry = createMockEntry();
    registry.register(entry);

    const found = registry.getMachine("TestPort", "inst-1");
    expect(found).toBeDefined();
    expect(found?.machineId).toBe("test-machine");
  });

  it("getMachine() returns undefined for missing", () => {
    const found = registry.getMachine("NonExistent", "nope");
    expect(found).toBeUndefined();
  });

  it("getMachinesByState() filters by current state", () => {
    registry.register(createMockEntry({ portName: "A", instanceId: "1", state: () => "idle" }));
    registry.register(createMockEntry({ portName: "B", instanceId: "2", state: () => "active" }));
    registry.register(createMockEntry({ portName: "C", instanceId: "3", state: () => "idle" }));

    const idle = registry.getMachinesByState("idle");
    expect(idle).toHaveLength(2);
    expect(idle.map(e => e.portName).sort()).toEqual(["A", "C"]);
  });

  it("getMachinesByState() returns empty for no matches", () => {
    registry.register(createMockEntry({ state: () => "idle" }));

    const result = registry.getMachinesByState("nonexistent");
    expect(result).toHaveLength(0);
  });

  it("subscribe() receives 'machine-registered' event", () => {
    const events: RegistryEvent[] = [];
    registry.subscribe(e => events.push(e));

    const entry = createMockEntry();
    registry.register(entry);

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("machine-registered");
    if (events[0]?.type === "machine-registered") {
      expect(events[0].entry.portName).toBe("TestPort");
    }
  });

  it("subscribe() receives 'machine-unregistered' event", () => {
    const entry = createMockEntry();
    registry.register(entry);

    const events: RegistryEvent[] = [];
    registry.subscribe(e => events.push(e));

    registry.unregister("TestPort", "inst-1");

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("machine-unregistered");
    if (events[0]?.type === "machine-unregistered") {
      expect(events[0].portName).toBe("TestPort");
      expect(events[0].instanceId).toBe("inst-1");
    }
  });

  it("unsubscribe stops notifications", () => {
    const events: RegistryEvent[] = [];
    const unsub = registry.subscribe(e => events.push(e));

    registry.register(createMockEntry({ instanceId: "1" }));
    expect(events).toHaveLength(1);

    unsub();
    registry.register(createMockEntry({ instanceId: "2" }));
    expect(events).toHaveLength(1); // No new event
  });

  it("dispose() clears all entries", () => {
    registry.register(createMockEntry({ instanceId: "1" }));
    registry.register(createMockEntry({ instanceId: "2" }));
    expect(registry.getAllMachines()).toHaveLength(2);

    registry.dispose();
    expect(registry.getAllMachines()).toHaveLength(0);
  });

  it("dispose() clears all listeners (subsequent register has no effect on disposed listeners)", () => {
    const events: RegistryEvent[] = [];
    registry.subscribe(e => events.push(e));

    registry.dispose();

    // After dispose, register should not notify and entry should not be stored
    registry.register(createMockEntry());
    expect(events).toHaveLength(0);
    expect(registry.getAllMachines()).toHaveLength(0);
  });

  it("unregister after dispose does not emit events", () => {
    // Subscribe BEFORE dispose so the listener is present, then dispose clears it
    // Re-register a listener after dispose, then unregister
    registry.register(createMockEntry());

    // Dispose clears entries and listeners
    registry.dispose();

    // Re-add a listener (on the disposed registry)
    const events: RegistryEvent[] = [];
    registry.subscribe(e => events.push(e));

    // Unregister should be a no-op since dispose guards prevent it
    registry.unregister("TestPort", "inst-1");

    // The disposed guard should prevent notification
    expect(events).toHaveLength(0);

    // Also verify entries are still empty (dispose cleared them)
    expect(registry.getAllMachines()).toHaveLength(0);
  });

  it("register after dispose does not add entry", () => {
    registry.dispose();

    registry.register(createMockEntry({ instanceId: "new" }));
    expect(registry.getAllMachines()).toHaveLength(0);
    expect(registry.getMachine("TestPort", "new")).toBeUndefined();
  });

  it("getMachinesByState with no registered machines returns empty array", () => {
    const result = registry.getMachinesByState("idle");
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("subscribe and unsubscribe during callback does not crash", () => {
    let unsub2: (() => void) | undefined;

    // Subscribe a listener that unsubscribes another listener during its callback
    const events1: RegistryEvent[] = [];
    registry.subscribe(e => {
      events1.push(e);
      // Unsubscribe the second listener while handling the event
      if (unsub2) {
        unsub2();
        unsub2 = undefined;
      }
    });

    const events2: RegistryEvent[] = [];
    unsub2 = registry.subscribe(e => {
      events2.push(e);
    });

    // Register should trigger both listeners (unless iterating copy vs live)
    registry.register(createMockEntry({ instanceId: "1" }));

    // First listener should have received the event
    expect(events1).toHaveLength(1);
    // Second listener behavior depends on implementation: if callbacks are
    // iterated over a copy, it may or may not receive the event.
    // The important thing is it doesn't throw.

    // After unsubscribe, second listener should not receive new events
    registry.register(createMockEntry({ instanceId: "2" }));
    expect(events1).toHaveLength(2);
    // events2 should have at most 1 (from the first register)
    expect(events2.length).toBeLessThanOrEqual(1);
  });

  it("multiple unsubscribe calls are idempotent", () => {
    const events: RegistryEvent[] = [];
    const unsub = registry.subscribe(e => events.push(e));

    unsub();
    unsub(); // Should be a no-op

    registry.register(createMockEntry());
    expect(events).toHaveLength(0);
  });

  // ===========================================================================
  // getAllPortNames()
  // ===========================================================================

  it("getAllPortNames() returns empty array when no machines", () => {
    expect(registry.getAllPortNames()).toEqual([]);
  });

  it("getAllPortNames() returns unique port names", () => {
    registry.register(createMockEntry({ portName: "FlowA", instanceId: "1" }));
    registry.register(createMockEntry({ portName: "FlowA", instanceId: "2" }));
    registry.register(createMockEntry({ portName: "FlowB", instanceId: "3" }));

    const names = registry.getAllPortNames();
    expect([...names].sort()).toEqual(["FlowA", "FlowB"]);
  });

  // ===========================================================================
  // getTotalMachineCount()
  // ===========================================================================

  it("getTotalMachineCount() returns 0 initially", () => {
    expect(registry.getTotalMachineCount()).toBe(0);
  });

  it("getTotalMachineCount() increments on register", () => {
    registry.register(createMockEntry({ instanceId: "1" }));
    expect(registry.getTotalMachineCount()).toBe(1);

    registry.register(createMockEntry({ instanceId: "2" }));
    expect(registry.getTotalMachineCount()).toBe(2);
  });

  it("getTotalMachineCount() decrements on unregister", () => {
    registry.register(createMockEntry({ portName: "A", instanceId: "1" }));
    registry.register(createMockEntry({ portName: "B", instanceId: "2" }));
    expect(registry.getTotalMachineCount()).toBe(2);

    registry.unregister("A", "1");
    expect(registry.getTotalMachineCount()).toBe(1);
  });

  it("register with scopeId stores it in entry", () => {
    const entry = createMockEntry({ scopeId: "scope-42" });
    registry.register(entry);

    const found = registry.getMachine("TestPort", "inst-1");
    expect(found).toBeDefined();
    expect(found?.scopeId).toBe("scope-42");
  });

  it("scopeId is optional for backward compatibility", () => {
    // Register without scopeId (default mock entry doesn't include it)
    const entry = createMockEntry();
    registry.register(entry);

    const found = registry.getMachine("TestPort", "inst-1");
    expect(found).toBeDefined();
    expect(found?.scopeId).toBeUndefined();
  });
});
