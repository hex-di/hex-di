/**
 * FlowInspector subscribe() Tests
 *
 * Verifies push-based notification mechanism:
 * - Listeners fire on recordEffectResult
 * - Listeners fire on recordHealthEvent
 * - Listeners fire on collector transition events
 * - Unsubscribe removes listener
 * - dispose() clears all listeners
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createFlowInspector } from "../../src/introspection/flow-inspector.js";
import { createFlowRegistry } from "../../src/introspection/flow-registry.js";
import type {
  FlowInspector,
  FlowRegistry,
  EffectResultRecord,
  HealthEvent,
} from "../../src/introspection/types.js";
import type { FlowTransitionEventAny } from "../../src/tracing/types.js";

// =============================================================================
// Helpers
// =============================================================================

function createMockCollector() {
  const transitions: FlowTransitionEventAny[] = [];
  const subscribers: Array<(event: FlowTransitionEventAny) => void> = [];

  return {
    getTransitions(filter?: { machineId?: string }) {
      if (filter?.machineId !== undefined) {
        return transitions.filter(t => t.machineId === filter.machineId);
      }
      return [...transitions];
    },
    subscribe(callback: (event: FlowTransitionEventAny) => void) {
      subscribers.push(callback);
      return () => {
        const idx = subscribers.indexOf(callback);
        if (idx >= 0) subscribers.splice(idx, 1);
      };
    },
    addTransition(t: FlowTransitionEventAny) {
      transitions.push(t);
      for (const sub of subscribers) {
        sub(t);
      }
    },
  };
}

function makeTransition(overrides: Partial<FlowTransitionEventAny> = {}): FlowTransitionEventAny {
  return {
    id: `t-${Math.random()}`,
    machineId: "test-machine",
    prevState: "idle",
    event: { type: "START" },
    nextState: "active",
    effects: [],
    timestamp: Date.now(),
    duration: 1,
    isPinned: false,
    ...overrides,
  };
}

function makeEffectRecord(overrides: Partial<EffectResultRecord> = {}): EffectResultRecord {
  return {
    portName: "TestPort",
    method: "doStuff",
    ok: true,
    timestamp: Date.now(),
    duration: 10,
    ...overrides,
  };
}

function makeHealthEvent(
  overrides: Partial<HealthEvent & { type: "flow-error" }> = {}
): HealthEvent {
  return {
    type: "flow-error",
    machineId: "m1",
    state: "error",
    timestamp: Date.now(),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("FlowInspector.subscribe()", () => {
  let registry: FlowRegistry;
  let collector: ReturnType<typeof createMockCollector>;
  let inspector: FlowInspector;

  beforeEach(() => {
    registry = createFlowRegistry();
    collector = createMockCollector();
    inspector = createFlowInspector({ registry, collector });
  });

  // ---------------------------------------------------------------------------
  // recordEffectResult notifications
  // ---------------------------------------------------------------------------

  it("fires listener when recordEffectResult is called", () => {
    const listener = vi.fn();
    inspector.subscribe(listener);

    inspector.recordEffectResult(makeEffectRecord());

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("fires listener for each recordEffectResult call", () => {
    const listener = vi.fn();
    inspector.subscribe(listener);

    inspector.recordEffectResult(makeEffectRecord());
    inspector.recordEffectResult(makeEffectRecord());
    inspector.recordEffectResult(makeEffectRecord());

    expect(listener).toHaveBeenCalledTimes(3);
  });

  // ---------------------------------------------------------------------------
  // recordHealthEvent notifications
  // ---------------------------------------------------------------------------

  it("fires listener when recordHealthEvent is called", () => {
    const listener = vi.fn();
    inspector.subscribe(listener);

    inspector.recordHealthEvent(makeHealthEvent());

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("fires listener for each recordHealthEvent call", () => {
    const listener = vi.fn();
    inspector.subscribe(listener);

    inspector.recordHealthEvent(makeHealthEvent());
    inspector.recordHealthEvent(makeHealthEvent());

    expect(listener).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------------------
  // Collector transition notifications
  // ---------------------------------------------------------------------------

  it("fires listener when collector emits a transition event", () => {
    const listener = vi.fn();
    inspector.subscribe(listener);

    collector.addTransition(makeTransition());

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("fires listener for each collector transition", () => {
    const listener = vi.fn();
    inspector.subscribe(listener);

    collector.addTransition(makeTransition({ id: "t1" }));
    collector.addTransition(makeTransition({ id: "t2" }));

    expect(listener).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------------------
  // Multiple listeners
  // ---------------------------------------------------------------------------

  it("notifies all subscribed listeners", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    inspector.subscribe(listener1);
    inspector.subscribe(listener2);

    inspector.recordEffectResult(makeEffectRecord());

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Unsubscribe
  // ---------------------------------------------------------------------------

  it("unsubscribe removes listener from future notifications", () => {
    const listener = vi.fn();
    const unsubscribe = inspector.subscribe(listener);

    inspector.recordEffectResult(makeEffectRecord());
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    inspector.recordEffectResult(makeEffectRecord());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe of one listener does not affect others", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const unsub1 = inspector.subscribe(listener1);
    inspector.subscribe(listener2);

    unsub1();

    inspector.recordEffectResult(makeEffectRecord());

    expect(listener1).toHaveBeenCalledTimes(0);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it("double unsubscribe is safe", () => {
    const listener = vi.fn();
    const unsubscribe = inspector.subscribe(listener);

    unsubscribe();
    unsubscribe(); // should not throw

    inspector.recordEffectResult(makeEffectRecord());
    expect(listener).toHaveBeenCalledTimes(0);
  });

  // ---------------------------------------------------------------------------
  // dispose() clears listeners
  // ---------------------------------------------------------------------------

  it("dispose clears all listeners", () => {
    const listener = vi.fn();
    inspector.subscribe(listener);

    inspector.dispose();

    // recordEffectResult is a no-op after dispose, so listener should not fire
    inspector.recordEffectResult(makeEffectRecord());
    expect(listener).toHaveBeenCalledTimes(0);
  });

  // ---------------------------------------------------------------------------
  // Mixed notification sources
  // ---------------------------------------------------------------------------

  it("listener receives notifications from all sources", () => {
    const listener = vi.fn();
    inspector.subscribe(listener);

    inspector.recordEffectResult(makeEffectRecord());
    inspector.recordHealthEvent(makeHealthEvent());
    collector.addTransition(makeTransition());

    expect(listener).toHaveBeenCalledTimes(3);
  });
});
