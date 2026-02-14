/**
 * FlowEventBus Tests
 *
 * Tests for the cross-machine event pub/sub bus:
 * - emit/subscribe/unsubscribe lifecycle
 * - Multiple subscribers
 * - Dispose clears subscribers and silences future emits
 * - EmitEffect routes through the bus via DIEffectExecutor
 * - Cross-machine delivery (two runners sharing one bus)
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { createFlowEventBus } from "../src/event-bus/flow-event-bus.js";
import type { FlowEvent } from "../src/event-bus/flow-event-bus.js";
import { createDIEffectExecutor } from "../src/integration/di-executor.js";
import type { ScopeResolver } from "../src/integration/types.js";
import { createActivityManager } from "../src/activities/manager.js";
import { createBasicExecutor } from "../src/runner/executor.js";
import { defineMachine } from "../src/machine/define-machine.js";
import { createMachineRunner } from "../src/runner/create-runner.js";
import { Effect } from "../src/effects/constructors.js";

// =============================================================================
// FlowEventBus Unit Tests
// =============================================================================

describe("createFlowEventBus", () => {
  it("should create a bus with emit, subscribe, and dispose", () => {
    const bus = createFlowEventBus();
    expect(bus.emit).toBeTypeOf("function");
    expect(bus.subscribe).toBeTypeOf("function");
    expect(bus.dispose).toBeTypeOf("function");
  });

  it("should deliver events to a single subscriber", () => {
    const bus = createFlowEventBus();
    const received: FlowEvent[] = [];

    bus.subscribe(event => {
      received.push(event);
    });

    bus.emit({ type: "TEST_EVENT" });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ type: "TEST_EVENT" });
  });

  it("should deliver events to multiple subscribers", () => {
    const bus = createFlowEventBus();
    const received1: FlowEvent[] = [];
    const received2: FlowEvent[] = [];

    bus.subscribe(event => {
      received1.push(event);
    });
    bus.subscribe(event => {
      received2.push(event);
    });

    bus.emit({ type: "SHARED_EVENT" });

    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);
    expect(received1[0]).toEqual({ type: "SHARED_EVENT" });
    expect(received2[0]).toEqual({ type: "SHARED_EVENT" });
  });

  it("should stop delivering to unsubscribed callbacks", () => {
    const bus = createFlowEventBus();
    const received: FlowEvent[] = [];

    const unsubscribe = bus.subscribe(event => {
      received.push(event);
    });

    bus.emit({ type: "BEFORE_UNSUB" });
    unsubscribe();
    bus.emit({ type: "AFTER_UNSUB" });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ type: "BEFORE_UNSUB" });
  });

  it("should not deliver events after dispose", () => {
    const bus = createFlowEventBus();
    const received: FlowEvent[] = [];

    bus.subscribe(event => {
      received.push(event);
    });

    bus.emit({ type: "BEFORE_DISPOSE" });
    bus.dispose();
    bus.emit({ type: "AFTER_DISPOSE" });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ type: "BEFORE_DISPOSE" });
  });

  it("should clear all subscribers on dispose", () => {
    const bus = createFlowEventBus();
    const received1: FlowEvent[] = [];
    const received2: FlowEvent[] = [];

    bus.subscribe(event => {
      received1.push(event);
    });
    bus.subscribe(event => {
      received2.push(event);
    });

    bus.dispose();
    bus.emit({ type: "POST_DISPOSE" });

    expect(received1).toHaveLength(0);
    expect(received2).toHaveLength(0);
  });

  it("should not duplicate events if same callback is subscribed twice", () => {
    const bus = createFlowEventBus();
    const received: FlowEvent[] = [];

    const callback = (event: FlowEvent): void => {
      received.push(event);
    };

    bus.subscribe(callback);
    bus.subscribe(callback); // Same reference, Set deduplicates

    bus.emit({ type: "DEDUP_TEST" });

    expect(received).toHaveLength(1);
  });

  it("should preserve extra event properties beyond type", () => {
    const bus = createFlowEventBus();
    const received: FlowEvent[] = [];

    bus.subscribe(event => {
      received.push(event);
    });

    const eventWithPayload = { type: "DATA_EVENT", payload: { count: 42 } };
    bus.emit(eventWithPayload);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ type: "DATA_EVENT", payload: { count: 42 } });
  });

  it("should handle unsubscribe called multiple times safely", () => {
    const bus = createFlowEventBus();
    const received: FlowEvent[] = [];

    const unsubscribe = bus.subscribe(event => {
      received.push(event);
    });

    unsubscribe();
    unsubscribe(); // second call is a no-op

    bus.emit({ type: "AFTER_DOUBLE_UNSUB" });
    expect(received).toHaveLength(0);
  });

  it("should handle subscriber that modifies subscriptions during emit", () => {
    const bus = createFlowEventBus();
    const received: FlowEvent[] = [];

    // Subscriber that unsubscribes itself on first event
    let unsubSelf: (() => void) | undefined;
    unsubSelf = bus.subscribe(event => {
      received.push(event);
      if (unsubSelf) {
        unsubSelf();
      }
    });

    bus.emit({ type: "TRIGGER_UNSUB" });
    bus.emit({ type: "AFTER_SELF_UNSUB" });

    // First event should be received, second should not
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ type: "TRIGGER_UNSUB" });
  });
});

// =============================================================================
// DIEffectExecutor + EventBus Integration Tests
// =============================================================================

describe("DIEffectExecutor with eventBus", () => {
  /**
   * Creates a minimal scope resolver for testing.
   * Uses vi.fn() to satisfy the generic InferService<P> return type.
   */
  function createMockScopeResolver(): ScopeResolver {
    return {
      resolve: vi.fn().mockReturnValue(undefined),
    };
  }

  it("should route EmitEffect events through the eventBus", async () => {
    const bus = createFlowEventBus();
    const received: FlowEvent[] = [];

    bus.subscribe(event => {
      received.push(event);
    });

    const activityManager = createActivityManager({});
    const executor = createDIEffectExecutor({
      scope: createMockScopeResolver(),
      activityManager,
      eventBus: bus,
    });

    const emitEffect = Effect.emit({ type: "BUS_EVENT" });
    const result = await executor.execute(emitEffect);

    expect(result._tag).toBe("Ok");
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ type: "BUS_EVENT" });
  });

  it("should route EmitEffect to both eventSink and eventBus", async () => {
    const bus = createFlowEventBus();
    const busReceived: FlowEvent[] = [];
    const sinkReceived: FlowEvent[] = [];

    bus.subscribe(event => {
      busReceived.push(event);
    });

    const activityManager = createActivityManager({});
    const executor = createDIEffectExecutor({
      scope: createMockScopeResolver(),
      activityManager,
      eventBus: bus,
    });

    // Set an event sink as well
    executor.setEventSink({
      emit: event => {
        sinkReceived.push(event);
      },
    });

    const emitEffect = Effect.emit({ type: "DUAL_EVENT" });
    const result = await executor.execute(emitEffect);

    expect(result._tag).toBe("Ok");
    expect(busReceived).toHaveLength(1);
    expect(sinkReceived).toHaveLength(1);
    expect(busReceived[0]).toEqual({ type: "DUAL_EVENT" });
    expect(sinkReceived[0]).toEqual({ type: "DUAL_EVENT" });
  });

  it("should work without eventBus (backward compatible)", async () => {
    const activityManager = createActivityManager({});
    const sinkReceived: FlowEvent[] = [];

    const executor = createDIEffectExecutor({
      scope: createMockScopeResolver(),
      activityManager,
    });

    executor.setEventSink({
      emit: event => {
        sinkReceived.push(event);
      },
    });

    const emitEffect = Effect.emit({ type: "SINK_ONLY" });
    const result = await executor.execute(emitEffect);

    expect(result._tag).toBe("Ok");
    expect(sinkReceived).toHaveLength(1);
    expect(sinkReceived[0]).toEqual({ type: "SINK_ONLY" });
  });
});

// =============================================================================
// Cross-machine Event Delivery Tests
// =============================================================================

describe("cross-machine event delivery via FlowEventBus", () => {
  /**
   * Creates a simple two-state machine that transitions on a given event type.
   */
  function createTwoStateMachine(id: string, eventType: string) {
    return defineMachine({
      id,
      initial: "idle",
      context: { received: false },
      states: {
        idle: {
          on: {
            [eventType]: {
              target: "done",
              actions: [() => ({ received: true })],
            },
          },
        },
        done: {
          on: {},
        },
      },
    });
  }

  it("should deliver events from one machine to another via shared bus", () => {
    const bus = createFlowEventBus();
    const activityManager = createActivityManager({});
    const executor = createBasicExecutor();

    // Machine A: emitter (transitions idle -> done on TRIGGER, which emits SYNC)
    const machineA = defineMachine({
      id: "machineA",
      initial: "idle",
      context: {},
      states: {
        idle: {
          on: {
            TRIGGER: {
              target: "done",
              effects: [Effect.emit({ type: "SYNC" })],
            },
          },
        },
        done: {
          on: {},
        },
      },
    });

    // Machine B: receiver (transitions idle -> done on SYNC)
    const machineB = createTwoStateMachine("machineB", "SYNC");

    const runnerA = createMachineRunner(machineA, { executor, activityManager });
    const runnerB = createMachineRunner(machineB, { executor, activityManager });

    // Subscribe runner B to receive events from the bus
    bus.subscribe(event => {
      runnerB.send(event);
    });

    // Wire runner A's emit effect through the bus via a simple callback.
    // In the real system, DIEffectExecutor does this. Here we simulate by
    // extracting effects from runner A's send result and routing emits to the bus.
    const resultA = runnerA.send({ type: "TRIGGER" });
    expect(resultA._tag).toBe("Ok");

    if (resultA._tag === "Ok") {
      // Execute the emit effect manually by publishing to the bus
      for (const effect of resultA.value) {
        if (effect._tag === "Emit" && "event" in effect) {
          const eventProp = Object.getOwnPropertyDescriptor(effect, "event");
          if (
            eventProp !== undefined &&
            typeof eventProp.value === "object" &&
            eventProp.value !== null
          ) {
            const typeProp = Object.getOwnPropertyDescriptor(eventProp.value, "type");
            if (typeProp !== undefined && typeof typeProp.value === "string") {
              bus.emit({ type: typeProp.value });
            }
          }
        }
      }
    }

    expect(runnerA.state()).toBe("done");
    expect(runnerB.state()).toBe("done");
    expect(runnerB.context()).toEqual({ received: true });
  });

  it("should support bidirectional communication via shared bus", () => {
    const bus = createFlowEventBus();
    const activityManager = createActivityManager({});
    const executor = createBasicExecutor();

    const machineA = createTwoStateMachine("machineA", "FROM_B");
    const machineB = createTwoStateMachine("machineB", "FROM_A");

    const runnerA = createMachineRunner(machineA, { executor, activityManager });
    const runnerB = createMachineRunner(machineB, { executor, activityManager });

    // Both runners subscribe to the bus
    bus.subscribe(event => {
      runnerA.send(event);
    });
    bus.subscribe(event => {
      runnerB.send(event);
    });

    // Emit FROM_A event
    bus.emit({ type: "FROM_A" });
    expect(runnerB.state()).toBe("done");
    expect(runnerA.state()).toBe("idle"); // A doesn't handle FROM_A

    // Emit FROM_B event
    bus.emit({ type: "FROM_B" });
    expect(runnerA.state()).toBe("done");
  });
});
