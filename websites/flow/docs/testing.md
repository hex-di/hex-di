---
sidebar_position: 1
title: Testing
---

# Testing

The `@hex-di/flow-testing` package provides comprehensive utilities for testing state machines, including test harnesses, mock executors, assertions, and deterministic time control.

## Installation

```bash
pnpm add -D @hex-di/flow-testing
```

## Test Harness

The test harness provides a complete testing environment:

```typescript
import { createFlowTestHarness } from "@hex-di/flow-testing";
import { myMachine } from "./my-machine";

describe("MyMachine", () => {
  it("should handle transitions", async () => {
    const harness = createFlowTestHarness({
      machine: myMachine,
      initialContext: { count: 0 },
      mockEffects: true,
    });

    // Send event
    harness.send({ type: "INCREMENT" });

    // Assert state
    expect(harness.state()).toBe("counting");
    expect(harness.context().count).toBe(1);

    // Check effect execution
    expect(harness.getExecutedEffects()).toContainEqual({
      _tag: "log",
      message: "Count incremented",
    });

    // Clean up
    harness.dispose();
  });
});
```

## Mock Effect Executor

Record and mock effect execution:

```typescript
import { createMockEffectExecutor } from "@hex-di/flow-testing";

describe("Effects", () => {
  it("should execute effects in order", async () => {
    const executor = createMockEffectExecutor();

    // Configure mock responses
    executor.mockResponse("invoke", {
      port: "UserService",
      method: "fetchUser",
      response: { id: "1", name: "Alice" },
    });

    const runner = createMachineRunner(machine, { executor });

    // Send event that triggers effects
    await runner.sendAndExecute({ type: "LOAD_USER" });

    // Verify effects were executed
    const recorded = executor.getRecordedEffects();
    expect(recorded).toHaveLength(2);
    expect(recorded[0]).toMatchObject({
      _tag: "invoke",
      port: "UserService",
      method: "fetchUser",
    });

    // Verify effect order
    expect(executor.getEffectSequence()).toEqual([
      "invoke:UserService.fetchUser",
      "log:User loaded",
    ]);
  });

  it("should handle effect failures", async () => {
    const executor = createMockEffectExecutor();

    executor.mockError("invoke", {
      port: "PaymentService",
      method: "charge",
      error: new Error("Insufficient funds"),
    });

    const runner = createMachineRunner(machine, { executor });
    const result = await runner.sendAndExecute({ type: "PURCHASE" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch("Insufficient funds");
  });
});
```

## Assertions

Specialized assertions for Flow testing:

### expectFlowState

Assert machine state:

```typescript
import { expectFlowState } from "@hex-di/flow-testing";

describe("State Assertions", () => {
  it("should be in correct state", () => {
    const runner = createMachineRunner(machine);

    expectFlowState(runner)
      .toBe("idle")
      .toHaveContext({ isLoading: false })
      .toMatch("idle") // Pattern matching
      .canTransitionTo("loading")
      .cannotTransitionTo("error");

    runner.send({ type: "FETCH" });

    expectFlowState(runner).toBe("loading").toHaveActivity("dataFetcher", "running");
  });
});
```

### expectEvents

Assert emitted events:

```typescript
import { expectEvents, expectEventTypes } from "@hex-di/flow-testing";

describe("Event Assertions", () => {
  it("should emit correct events", () => {
    const recorder = createFlowEventRecorder();
    const runner = createMachineRunner(machine, {
      collector: recorder,
    });

    runner.send({ type: "START_PROCESS" });

    expectEvents(recorder)
      .toHaveLength(3)
      .toContainType("PROCESS_STARTED")
      .toMatchSequence([
        { type: "START_PROCESS" },
        { type: "PROCESS_STARTED" },
        { type: "STEP_1_COMPLETE" },
      ]);

    expectEventTypes(recorder).toEqual(["START_PROCESS", "PROCESS_STARTED", "STEP_1_COMPLETE"]);
  });
});
```

### expectSnapshot

Assert snapshot properties:

```typescript
import { expectSnapshot } from "@hex-di/flow-testing";

describe("Snapshot Assertions", () => {
  it("should match snapshot", () => {
    const runner = createMachineRunner(machine);
    const snapshot = runner.snapshot();

    expectSnapshot(snapshot)
      .toMatchState("idle")
      .toHaveContext({ user: null })
      .toHaveNoActivities()
      .toHaveNoPendingEvents()
      .toBeAbleTo("LOGIN")
      .notToBeAbleTo("LOGOUT");
  });
});
```

## Event Recorder

Record and analyze transition events:

```typescript
import { createFlowEventRecorder } from "@hex-di/flow-testing";

describe("Event Recording", () => {
  it("should record transitions", () => {
    const recorder = createFlowEventRecorder();
    const runner = createMachineRunner(machine, {
      collector: recorder,
    });

    runner.send({ type: "START" });
    runner.send({ type: "PAUSE" });
    runner.send({ type: "RESUME" });

    const transitions = recorder.getTransitions();
    expect(transitions).toHaveLength(3);

    // Analyze specific transition
    const pauseTransition = transitions[1];
    expect(pauseTransition.from).toBe("running");
    expect(pauseTransition.to).toBe("paused");
    expect(pauseTransition.event.type).toBe("PAUSE");
    expect(pauseTransition.duration).toBeLessThan(10);

    // Get transition path
    const path = recorder.getStatePath();
    expect(path).toEqual(["idle", "running", "paused", "running"]);

    // Filter transitions
    const filtered = recorder.queryTransitions({
      eventType: "PAUSE",
    });
    expect(filtered).toHaveLength(1);
  });
});
```

## Mock Activities

Create mock activities for testing:

```typescript
import { createMockActivity } from "@hex-di/flow-testing";

describe("Activity Testing", () => {
  it("should handle activity lifecycle", async () => {
    const mockActivity = createMockActivity({
      id: "poller",
      emitEvents: [
        { delay: 100, event: { type: "POLL_START" } },
        { delay: 200, event: { type: "DATA_RECEIVED", payload: { value: 42 } } },
        { delay: 300, event: { type: "POLL_COMPLETE" } },
      ],
      result: { success: true },
    });

    const manager = createActivityManager();
    manager.register("poller", mockActivity);

    const runner = createMachineRunner(machine, {
      activityManager: manager,
    });

    runner.send({ type: "START_POLLING" });

    // Wait for activity to emit events
    await mockActivity.waitForEmission(2);

    expect(runner.state()).toBe("receiving");
    expect(runner.context().lastValue).toBe(42);

    // Stop activity
    runner.send({ type: "STOP_POLLING" });
    expect(mockActivity.wasAborted()).toBe(true);
  });
});
```

## Snapshot Utilities

Serialize and compare snapshots:

```typescript
import { serializeSnapshot, snapshotMachine } from "@hex-di/flow-testing";

describe("Snapshot Testing", () => {
  it("should serialize snapshot", () => {
    const runner = createMachineRunner(machine);
    runner.send({ type: "LOGIN", payload: { user: "Alice" } });

    const serialized = serializeSnapshot(runner);
    expect(serialized).toMatchInlineSnapshot(`
      {
        "state": "authenticated",
        "context": {
          "user": "Alice",
          "isAuthenticated": true
        },
        "activities": {},
        "pendingEvents": []
      }
    `);
  });

  it("should snapshot machine at different states", () => {
    const snapshots = snapshotMachine(machine, [
      { type: "START" },
      { type: "PROCESS" },
      { type: "COMPLETE" },
    ]);

    expect(snapshots).toEqual([
      { state: "idle", context: {} },
      { state: "processing", context: {} },
      { state: "done", context: {} },
    ]);
  });
});
```

## Virtual Clock

Control time deterministically:

```typescript
import { createVirtualClock } from "@hex-di/flow-testing";

describe("Time Control", () => {
  it("should control delays", async () => {
    const clock = createVirtualClock();
    const runner = createMachineRunner(machine, { clock });

    runner.send({ type: "START_TIMER" });

    // Advance time
    await clock.advance(1000);
    expect(runner.state()).toBe("tick");

    await clock.advance(1000);
    expect(runner.state()).toBe("tock");

    // Jump to specific time
    await clock.setTime(5000);
    expect(runner.context().elapsed).toBe(5000);

    // Run all pending timers
    await clock.runAll();
    expect(runner.state()).toBe("complete");
  });

  it("should handle scheduled effects", async () => {
    const clock = createVirtualClock();
    const executor = createBasicExecutor({ clock });

    const effect = Effect.sequence([
      Effect.delay(1000),
      Effect.log("One second passed"),
      Effect.delay(2000),
      Effect.log("Three seconds total"),
    ]);

    const promise = executor.execute(effect, {});

    await clock.advance(1000);
    // First log executed

    await clock.advance(2000);
    // Second log executed

    await promise;
  });
});
```

## Guard Testing

Test guards in isolation:

```typescript
import { testGuard, testGuardSafe } from "@hex-di/flow-testing";

describe("Guard Testing", () => {
  const isAuthenticated = guard(ctx => ctx.user !== null);
  const hasPermission = guard((ctx, event) => ctx.user?.roles.includes(event.payload.requiredRole));

  it("should test guard conditions", () => {
    const result = testGuard(isAuthenticated, {
      context: { user: { id: "1", name: "Alice" } },
      event: { type: "ACCESS" },
    });

    expect(result.passed).toBe(true);
    expect(result.duration).toBeLessThan(1);
  });

  it("should test guard combinations", () => {
    const combined = and(isAuthenticated, hasPermission);

    const result = testGuardSafe(combined, {
      context: { user: { id: "1", roles: ["admin"] } },
      event: { type: "ACCESS", payload: { requiredRole: "admin" } },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.passed).toBe(true);
    }
  });
});
```

## Transition Testing

Test individual transitions:

```typescript
import { testTransition } from "@hex-di/flow-testing";

describe("Transition Testing", () => {
  it("should test transition", () => {
    const result = testTransition(machine, {
      fromState: "idle",
      event: { type: "START", payload: { mode: "fast" } },
      context: { speed: 0 },
    });

    expect(result.transitioned).toBe(true);
    expect(result.toState).toBe("running");
    expect(result.nextContext).toEqual({ speed: 100 });
    expect(result.effects).toContainEqual({
      _tag: "log",
      message: "Started in fast mode",
    });
  });

  it("should test guarded transition", () => {
    const result = testTransition(machine, {
      fromState: "form",
      event: { type: "SUBMIT" },
      context: { isValid: false },
    });

    expect(result.transitioned).toBe(false);
    expect(result.guardsFailed).toContain("isFormValid");
  });
});
```

## Effect Testing

Test effects in isolation:

```typescript
import { testEffect, testEffectSafe } from "@hex-di/flow-testing";

describe("Effect Testing", () => {
  it("should test effect execution", async () => {
    const effect = Effect.sequence([
      Effect.invoke("UserService", "fetchUser", { id: "1" }),
      Effect.log("User fetched"),
      Effect.emit({ type: "USER_LOADED" }),
    ]);

    const result = await testEffect(effect, {
      context: {},
      mocks: {
        UserService: {
          fetchUser: async ({ id }) => ({ id, name: "Alice" }),
        },
      },
    });

    expect(result.success).toBe(true);
    expect(result.emittedEvents).toContainEqual({
      type: "USER_LOADED",
    });
  });

  it("should handle effect errors safely", async () => {
    const result = await testEffectSafe(Effect.invoke("Service", "method"), {
      context: {},
      mocks: {
        Service: {
          method: async () => {
            throw new Error("Service error");
          },
        },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Service error");
    }
  });
});
```

## Integration Testing

Test machines within a DI container:

```typescript
import { testFlowInContainer } from "@hex-di/flow-testing";

describe("Container Integration", () => {
  it("should test flow in container", async () => {
    const result = await testFlowInContainer({
      machine: orderMachine,
      adapters: [OrderServiceAdapter, PaymentServiceAdapter],
      mocks: {
        EmailService: {
          sendConfirmation: async () => ({ sent: true }),
        },
      },
      scenario: [
        { type: "CREATE_ORDER", payload: { items: ["item1"] } },
        { type: "CONFIRM_ORDER" },
        { type: "PROCESS_PAYMENT", payload: { amount: 100 } },
      ],
    });

    expect(result.finalState).toBe("completed");
    expect(result.finalContext.orderId).toBeDefined();
    expect(result.invocations).toContainEqual({
      port: "EmailService",
      method: "sendConfirmation",
      args: expect.objectContaining({ orderId: expect.any(String) }),
    });
  });
});
```

## Best Practices

1. **Use test harness for integration tests**: Provides complete environment
2. **Mock effects for unit tests**: Focus on state logic
3. **Use virtual clock for time-dependent tests**: Deterministic timing
4. **Test guards in isolation**: Ensure conditions are correct
5. **Record events for debugging**: Helps understand test failures
6. **Snapshot complex states**: Use for regression testing
7. **Test error paths**: Ensure graceful failure handling
8. **Clean up resources**: Always dispose of runners and activities
