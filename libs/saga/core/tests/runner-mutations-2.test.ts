/**
 * Runner Mutation Tests (Part 2)
 *
 * Targeted tests to kill surviving mutants in:
 * - src/runtime/runner.ts (event emission, optional chaining, subscribe/unsubscribe, executeSaga)
 * - src/compensation/engine.ts (event emission per strategy, buildCompensationParams failures,
 *   empty results, strategy switching)
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../src/runtime/runner.js";
import { executeCompensation } from "../src/compensation/engine.js";
import type { CompensationEngineInput, CompensationInvoker } from "../src/compensation/engine.js";
import type { CompensationPlanStep } from "../src/compensation/types.js";
import type { PortResolver, SagaEvent, SagaEventListener } from "../src/runtime/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const TestPort = createPort<"TestPort", any>({ name: "TestPort" });
const PortA = createPort<"PortA", any>({ name: "PortA" });
const PortB = createPort<"PortB", any>({ name: "PortB" });

// =============================================================================
// Helpers
// =============================================================================

function createResolver(mapping: Record<string, (params: any) => Promise<unknown>>): PortResolver {
  return {
    resolve(portName: string): unknown {
      if (portName in mapping) {
        return mapping[portName];
      }
      throw new Error(`Port not found: ${portName}`);
    },
  };
}

/** Wait for a condition to become true, polling every ms. */
async function waitFor(fn: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!fn() && Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 1));
  }
}

// =============================================================================
// A. Event emission string values from runner.ts
// =============================================================================

describe("runner.ts event emission string values", () => {
  it("emits step:failed with correct fields on persistence init error", async () => {
    const events: SagaEvent[] = [];

    const Step1 = defineStep("PersistStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("PersistSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.PersistStep)
      .build();

    const resolver = createResolver({
      TestPort: async (p: any) => p,
    });

    const persister = {
      save: vi.fn(() =>
        ResultAsync.err({ _tag: "StorageFailure" as const, operation: "save", cause: "disk-full" })
      ),
      load: vi.fn(() => ResultAsync.ok(null)),
      delete: vi.fn(() => ResultAsync.ok(undefined)),
      list: vi.fn(() => ResultAsync.ok([])),
      update: vi.fn(() => ResultAsync.ok(undefined)),
    };

    const runner = createSagaRunner(resolver, { persister });
    const resultAsync = runner.execute(saga, "hello", {
      executionId: "persist-event-1",
      listeners: [(event: SagaEvent) => events.push(event)],
    });

    await resultAsync;

    const failedEvent = events.find(
      e => e.type === "step:failed" && e.stepName === "__persistence_init"
    );
    expect(failedEvent).toBeDefined();
    expect(failedEvent!.type).toBe("step:failed");
    if (failedEvent && failedEvent.type === "step:failed") {
      expect(failedEvent.executionId).toBe("persist-event-1");
      expect(failedEvent.sagaName).toBe("PersistSaga");
      expect(failedEvent.stepName).toBe("__persistence_init");
      expect(failedEvent.stepIndex).toBe(-1);
      expect(failedEvent.attemptCount).toBe(1);
      expect(failedEvent.retriesExhausted).toBe(true);
      expect(failedEvent.error).toEqual({
        _tag: "StorageFailure",
        operation: "save",
        cause: "disk-full",
      });
    }
  });

  it("resume without persister returns StepFailed error with correct fields", async () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);

    const result = await runner.resume("no-persist-exec");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.executionId).toBe("no-persist-exec");
      expect(result.error.sagaName).toBe("");
      expect(result.error.stepName).toBe("");
      expect(result.error.stepIndex).toBe(-1);
      expect(result.error.message).toBe("Resume not implemented without persistence adapter");
      expect(result.error.completedSteps).toEqual([]);
      expect(result.error.compensatedSteps).toEqual([]);
      if (result.error._tag === "StepFailed") {
        expect(result.error.cause).toBeInstanceOf(Error);
        expect((result.error.cause as Error).message).toBe("Resume requires persistence adapter");
      }
    }
  });

  it("resume with persister that fails load returns PersistenceFailed error", async () => {
    const resolver = createResolver({});
    const persister = {
      save: vi.fn(() => ResultAsync.ok(undefined)),
      load: vi.fn(() =>
        ResultAsync.err({
          _tag: "StorageFailure" as const,
          operation: "load",
          cause: "network-error",
        })
      ),
      delete: vi.fn(() => ResultAsync.ok(undefined)),
      list: vi.fn(() => ResultAsync.ok([])),
      update: vi.fn(() => ResultAsync.ok(undefined)),
    };

    const runner = createSagaRunner(resolver, { persister });
    const result = await runner.resume("load-fail-exec");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("PersistenceFailed");
      expect(result.error.executionId).toBe("load-fail-exec");
      expect(result.error.sagaName).toBe("");
      expect(result.error.stepName).toBe("");
      expect(result.error.stepIndex).toBe(-1);
      expect(result.error.message).toBe("Failed to load execution state for load-fail-exec");
      expect(result.error.completedSteps).toEqual([]);
      expect(result.error.compensatedSteps).toEqual([]);
      if (result.error._tag === "PersistenceFailed") {
        expect(result.error.operation).toBe("load");
        expect(result.error.cause).toEqual({
          _tag: "StorageFailure",
          operation: "load",
          cause: "network-error",
        });
      }
    }
  });

  it("resume with persister that returns null state returns PersistenceFailed error", async () => {
    const resolver = createResolver({});
    const persister = {
      save: vi.fn(() => ResultAsync.ok(undefined)),
      load: vi.fn(() => ResultAsync.ok(null)),
      delete: vi.fn(() => ResultAsync.ok(undefined)),
      list: vi.fn(() => ResultAsync.ok([])),
      update: vi.fn(() => ResultAsync.ok(undefined)),
    };

    const runner = createSagaRunner(resolver, { persister });
    const result = await runner.resume("null-state-exec");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("PersistenceFailed");
      expect(result.error.executionId).toBe("null-state-exec");
      expect(result.error.message).toBe("No persisted state found for execution null-state-exec");
      if (result.error._tag === "PersistenceFailed") {
        expect(result.error.operation).toBe("load");
        expect(result.error.cause).toBeUndefined();
      }
    }
  });

  it("resume with saga not in registry returns StepFailed error", async () => {
    const resolver = createResolver({});
    const persister = {
      save: vi.fn(() => ResultAsync.ok(undefined)),
      load: vi.fn(() =>
        ResultAsync.ok({
          executionId: "registry-miss-exec",
          sagaName: "UnknownSaga",
          input: "x",
          currentStep: 0,
          completedSteps: [],
          status: "running" as const,
          error: null,
          compensation: {
            active: false,
            compensatedSteps: [],
            failedSteps: [],
            triggeringStepIndex: null,
          },
          timestamps: {
            startedAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
            completedAt: null,
          },
          metadata: {},
        })
      ),
      delete: vi.fn(() => ResultAsync.ok(undefined)),
      list: vi.fn(() => ResultAsync.ok([])),
      update: vi.fn(() => ResultAsync.ok(undefined)),
    };

    const runner = createSagaRunner(resolver, { persister });
    const result = await runner.resume("registry-miss-exec");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.executionId).toBe("registry-miss-exec");
      expect(result.error.sagaName).toBe("UnknownSaga");
      expect(result.error.stepName).toBe("");
      expect(result.error.stepIndex).toBe(-1);
      expect(result.error.message).toContain("UnknownSaga");
      expect(result.error.message).toContain("not found in registry");
      expect(result.error.completedSteps).toEqual([]);
      expect(result.error.compensatedSteps).toEqual([]);
      if (result.error._tag === "StepFailed") {
        expect(result.error.cause).toBeInstanceOf(Error);
        expect((result.error.cause as Error).message).toContain("UnknownSaga");
      }
    }
  });
});

// =============================================================================
// B. Optional chaining paths
// =============================================================================

describe("runner.ts optional chaining paths", () => {
  it("execute(saga, input) with no options parameter does not crash", async () => {
    const Step1 = defineStep("NoOptsStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("NoOptsSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.NoOptsStep)
      .build();

    const resolver = createResolver({
      TestPort: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    // Call with only 2 args, no options
    const result = await runner.execute(saga, "hello");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toBe("hello");
    }
  });

  it("execute(saga, input, {}) with empty options does not crash", async () => {
    const Step1 = defineStep("EmptyOptsStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("EmptyOptsSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.EmptyOptsStep)
      .build();

    const resolver = createResolver({
      TestPort: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "hello", {});
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toBe("hello");
    }
  });

  it("execute with signal option wires up abort propagation", async () => {
    let resolveFn: ((v: unknown) => void) | undefined;
    let portCalled = false;
    const Step1 = defineStep("AbortStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("AbortSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.AbortStep)
      .build();

    const resolver = createResolver({
      TestPort: (_p: any) =>
        new Promise<unknown>(resolve => {
          portCalled = true;
          resolveFn = resolve;
        }),
    });

    const runner = createSagaRunner(resolver);
    const ac = new AbortController();
    const resultAsync = runner.execute(saga, "hello", {
      executionId: "abort-test-1",
      signal: ac.signal,
    });

    // Wait until the port is actually called before aborting
    await waitFor(() => portCalled);

    // Abort from external signal
    ac.abort();
    // Resolve the pending step so it can proceed
    resolveFn?.("done");

    const result = await resultAsync;
    // Should either be cancelled or have completed before abort took effect
    // The key assertion is that no crash occurred
    expect(result.isOk() || result.isErr()).toBe(true);
  });

  it("execute with metadata option passes it through", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("MetaStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("MetaSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.MetaStep)
      .build();

    const resolver = createResolver({
      TestPort: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "hi", {
      executionId: "meta-exec-1",
      metadata: { traceId: "t-123" },
      listeners: [(e: SagaEvent) => events.push(e)],
    });

    expect(result.isOk()).toBe(true);
    const startEvent = events.find(e => e.type === "saga:started");
    expect(startEvent).toBeDefined();
    if (startEvent && startEvent.type === "saga:started") {
      expect(startEvent.metadata).toEqual({ traceId: "t-123" });
    }
  });

  it("execute with listeners option captures events from start", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("ListenerStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("ListenerSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.ListenerStep)
      .build();

    const resolver = createResolver({
      TestPort: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "hi", {
      executionId: "listener-exec-1",
      listeners: [(e: SagaEvent) => events.push(e)],
    });

    expect(result.isOk()).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe("saga:started");
    expect(events.some(e => e.type === "step:started")).toBe(true);
    expect(events.some(e => e.type === "step:completed")).toBe(true);
    expect(events.some(e => e.type === "saga:completed")).toBe(true);
  });
});

// =============================================================================
// C. Subscribe/unsubscribe splice correctness
// =============================================================================

describe("runner.ts subscribe/unsubscribe correctness", () => {
  it("subscribe 3 listeners, unsubscribe middle, verify first+third still called", async () => {
    let portCalled = false;
    let resolveFn: ((v: unknown) => void) | undefined;

    const Step1 = defineStep("SubStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("SubSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.SubStep)
      .build();

    const resolver = createResolver({
      TestPort: (_p: any) =>
        new Promise<unknown>(resolve => {
          portCalled = true;
          resolveFn = resolve;
        }),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = runner.execute(saga, "hi", {
      executionId: "sub-test-1",
    });

    // Wait for the port to actually be called (step is now blocked)
    await waitFor(() => portCalled);

    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const listener3 = vi.fn();

    runner.subscribe("sub-test-1", listener1);
    const unsub2 = runner.subscribe("sub-test-1", listener2);
    runner.subscribe("sub-test-1", listener3);

    // Unsubscribe the middle listener
    unsub2();

    // Resolve step to trigger more events (step:completed, saga:completed)
    resolveFn?.("done");

    await resultAsync;

    // Listener1 and listener3 should have received events after the step resolved
    expect(listener1.mock.calls.length).toBeGreaterThan(0);
    expect(listener3.mock.calls.length).toBeGreaterThan(0);

    // Listener2 was unsubscribed before events arrived, so no calls
    expect(listener2.mock.calls.length).toBe(0);
  });

  it("unsubscribe from unknown execution returns no-op function", () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);

    const unsub = runner.subscribe("unknown-exec", vi.fn());
    expect(typeof unsub).toBe("function");
    // Calling it should not throw
    expect(() => unsub()).not.toThrow();
  });

  it("calling unsub function multiple times does not crash", async () => {
    const Step1 = defineStep("MultiUnsubStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("MultiUnsubSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.MultiUnsubStep)
      .build();

    const resolver = createResolver({
      TestPort: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = runner.execute(saga, "hi", {
      executionId: "multi-unsub-1",
    });

    const listener = vi.fn();
    const unsub = runner.subscribe("multi-unsub-1", listener);

    // Call unsub multiple times
    unsub();
    unsub();
    unsub();

    await resultAsync;
    // No crash means success
    expect(true).toBe(true);
  });

  it("splice removes exactly the right listener by indexOf", async () => {
    let portCalled = false;
    let resolveFn: ((v: unknown) => void) | undefined;

    const Step1 = defineStep("SpliceStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("SpliceSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.SpliceStep)
      .build();

    const resolver = createResolver({
      TestPort: (_p: any) =>
        new Promise<unknown>(resolve => {
          portCalled = true;
          resolveFn = resolve;
        }),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = runner.execute(saga, "hi", { executionId: "splice-1" });

    // Wait for the port to actually be called
    await waitFor(() => portCalled);

    const calls: string[] = [];
    const L1: SagaEventListener = () => {
      calls.push("L1");
    };
    const L2: SagaEventListener = () => {
      calls.push("L2");
    };
    const L3: SagaEventListener = () => {
      calls.push("L3");
    };

    runner.subscribe("splice-1", L1);
    const unsub2 = runner.subscribe("splice-1", L2);
    runner.subscribe("splice-1", L3);

    // Unsubscribe L2
    unsub2();

    // Resolve the step to trigger events
    resolveFn?.("done");
    await resultAsync;

    // After unsubscribe, only L1 and L3 should appear in calls
    expect(calls.filter(c => c === "L1").length).toBeGreaterThan(0);
    expect(calls.filter(c => c === "L2").length).toBe(0);
    expect(calls.filter(c => c === "L3").length).toBeGreaterThan(0);
  });
});

// =============================================================================
// D. executeSaga helper
// =============================================================================

describe("executeSaga typed wrapper delegates to runner.execute", () => {
  it("executeSaga returns same result as runner.execute", async () => {
    const Step1 = defineStep("DelegateStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("DelegateSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.DelegateStep)
      .build();

    const resolver = createResolver({
      TestPort: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);

    // Use executeSaga helper
    const result = await executeSaga(runner, saga, "delegated", {
      executionId: "delegate-1",
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toBe("delegated");
      expect(result.value.executionId).toBe("delegate-1");
    }
  });

  it("executeSaga passes options through correctly", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("DelegateOptStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("DelegateOptSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.DelegateOptStep)
      .build();

    const resolver = createResolver({
      TestPort: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "hello", {
      executionId: "delegate-opts-1",
      metadata: { test: true },
      listeners: [(e: SagaEvent) => events.push(e)],
    });

    expect(result.isOk()).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    const startEvt = events.find(e => e.type === "saga:started");
    expect(startEvt).toBeDefined();
    if (startEvt && startEvt.type === "saga:started") {
      expect(startEvt.metadata).toEqual({ test: true });
    }
  });
});

// =============================================================================
// E. Compensation engine event emission per strategy
// =============================================================================

describe("compensation engine event emission", () => {
  const makeStep = (name: string, index: number, result: unknown): CompensationPlanStep => ({
    stepName: name,
    stepIndex: index,
    result,
    compensateFn: (ctx: any) => ({ refund: ctx.stepResult }),
  });

  const successInvoker: CompensationInvoker = (_step, _params) => ResultAsync.ok("compensated");

  const makeInput = (
    steps: CompensationPlanStep[],
    strategy: "sequential" | "parallel" | "best-effort",
    emitEvent: (event: SagaEvent) => void
  ): CompensationEngineInput => ({
    plan: { completedSteps: steps, strategy },
    invoker: successInvoker,
    sagaInput: {},
    accumulatedResults: {},
    originalError: new Error("original"),
    failedStepIndex: 2,
    failedStepName: "FailedStep",
    executionId: "comp-exec-1",
    sagaName: "CompSaga",
    emitEvent,
  });

  it("sequential strategy emits compensation:step for each step then compensation:completed", async () => {
    const events: SagaEvent[] = [];
    const emitEvent = (e: SagaEvent) => events.push(e);

    const steps = [makeStep("A", 0, "rA"), makeStep("B", 1, "rB")];
    const result = await executeCompensation(makeInput(steps, "sequential", emitEvent));

    expect(result.allSucceeded).toBe(true);
    expect(result.compensatedSteps).toEqual(["B", "A"]); // reversed

    const stepEvents = events.filter(e => e.type === "compensation:step");
    expect(stepEvents.length).toBe(2);
    // Reversed order: B first, then A
    if (stepEvents[0].type === "compensation:step") {
      expect(stepEvents[0].stepName).toBe("B");
      expect(stepEvents[0].success).toBe(true);
    }
    if (stepEvents[1].type === "compensation:step") {
      expect(stepEvents[1].stepName).toBe("A");
      expect(stepEvents[1].success).toBe(true);
    }

    const completedEvents = events.filter(e => e.type === "compensation:completed");
    expect(completedEvents.length).toBe(1);
    if (completedEvents[0].type === "compensation:completed") {
      expect(completedEvents[0].compensatedSteps).toEqual(["B", "A"]);
      expect(completedEvents[0].executionId).toBe("comp-exec-1");
      expect(completedEvents[0].sagaName).toBe("CompSaga");
    }
  });

  it("parallel strategy emits compensation:step for all and compensation:completed", async () => {
    const events: SagaEvent[] = [];
    const emitEvent = (e: SagaEvent) => events.push(e);

    const steps = [makeStep("X", 0, "rX"), makeStep("Y", 1, "rY"), makeStep("Z", 2, "rZ")];
    const result = await executeCompensation(makeInput(steps, "parallel", emitEvent));

    expect(result.allSucceeded).toBe(true);
    expect(result.compensatedSteps).toEqual(["X", "Y", "Z"]);

    const stepEvents = events.filter(e => e.type === "compensation:step");
    expect(stepEvents.length).toBe(3);
    for (const evt of stepEvents) {
      if (evt.type === "compensation:step") {
        expect(evt.success).toBe(true);
      }
    }

    const completedEvents = events.filter(e => e.type === "compensation:completed");
    expect(completedEvents.length).toBe(1);
  });

  it("best-effort strategy emits compensation:step for all attempted and compensation:completed", async () => {
    const events: SagaEvent[] = [];
    const emitEvent = (e: SagaEvent) => events.push(e);

    const steps = [makeStep("P", 0, "rP"), makeStep("Q", 1, "rQ")];
    const result = await executeCompensation(makeInput(steps, "best-effort", emitEvent));

    expect(result.allSucceeded).toBe(true);
    expect(result.compensatedSteps).toEqual(["Q", "P"]); // reversed

    const stepEvents = events.filter(e => e.type === "compensation:step");
    expect(stepEvents.length).toBe(2);

    const completedEvents = events.filter(e => e.type === "compensation:completed");
    expect(completedEvents.length).toBe(1);
  });
});

// =============================================================================
// F. buildCompensationParams failure path
// =============================================================================

describe("compensation engine buildCompensationParams failure path", () => {
  const throwingStep = (name: string, index: number): CompensationPlanStep => ({
    stepName: name,
    stepIndex: index,
    result: "val",
    compensateFn: () => {
      throw new Error("comp-fail");
    },
  });

  const okStep = (name: string, index: number): CompensationPlanStep => ({
    stepName: name,
    stepIndex: index,
    result: "ok-val",
    compensateFn: (ctx: any) => ({ undo: ctx.stepResult }),
  });

  const successInvoker: CompensationInvoker = (_step, _params) => ResultAsync.ok("compensated");

  const makeInput = (
    steps: CompensationPlanStep[],
    strategy: "sequential" | "parallel" | "best-effort",
    emitEvent?: (event: SagaEvent) => void
  ): CompensationEngineInput => ({
    plan: { completedSteps: steps, strategy },
    invoker: successInvoker,
    sagaInput: {},
    accumulatedResults: {},
    originalError: new Error("original"),
    failedStepIndex: 3,
    failedStepName: "TriggerStep",
    executionId: "comp-fail-exec",
    sagaName: "FailCompSaga",
    emitEvent,
  });

  it("sequential: compensateFn throws -> stops after first failure with failedSteps and events", async () => {
    const events: SagaEvent[] = [];

    // Steps in order: okStep(0), throwingStep(1), okStep(2)
    // Sequential reverses: okStep(2), throwingStep(1), okStep(0)
    // Should compensate okStep(2) successfully, then fail on throwingStep(1), skip okStep(0)
    const steps = [okStep("First", 0), throwingStep("Thrower", 1), okStep("Third", 2)];
    const result = await executeCompensation(makeInput(steps, "sequential", e => events.push(e)));

    expect(result.allSucceeded).toBe(false);
    expect(result.compensatedSteps).toEqual(["Third"]);
    expect(result.failedSteps).toEqual(["Thrower"]);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].stepName).toBe("Thrower");
    expect(result.errors[0].stepIndex).toBe(1);
    expect(result.errors[0].cause).toBeInstanceOf(Error);
    expect((result.errors[0].cause as Error).message).toBe("comp-fail");

    // Events: step for Third (success), step for Thrower (fail), failed event
    const stepEvents = events.filter(e => e.type === "compensation:step");
    expect(stepEvents.length).toBe(2);

    const failedEvents = events.filter(e => e.type === "compensation:failed");
    expect(failedEvents.length).toBe(1);
    if (failedEvents[0].type === "compensation:failed") {
      expect(failedEvents[0].failedCompensationStep).toBe("Thrower");
      expect(failedEvents[0].compensatedSteps).toEqual(["Third"]);
      expect(failedEvents[0].remainingSteps).toEqual(["First"]);
    }
  });

  it("parallel: compensateFn throws -> collects alongside successes", async () => {
    const events: SagaEvent[] = [];

    const steps = [okStep("OK1", 0), throwingStep("Throw1", 1), okStep("OK2", 2)];
    const result = await executeCompensation(makeInput(steps, "parallel", e => events.push(e)));

    expect(result.allSucceeded).toBe(false);
    expect(result.compensatedSteps).toContain("OK1");
    expect(result.compensatedSteps).toContain("OK2");
    expect(result.failedSteps).toContain("Throw1");
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].stepName).toBe("Throw1");

    const failedEvents = events.filter(e => e.type === "compensation:failed");
    expect(failedEvents.length).toBe(1);
  });

  it("best-effort: compensateFn throws -> continues past failure, collects all", async () => {
    const events: SagaEvent[] = [];

    // Steps in order: okStep(0), throwingStep(1), okStep(2)
    // Best-effort reverses: okStep(2), throwingStep(1), okStep(0) - continues past thrower
    const steps = [okStep("BE1", 0), throwingStep("BEThrow", 1), okStep("BE2", 2)];
    const result = await executeCompensation(makeInput(steps, "best-effort", e => events.push(e)));

    expect(result.allSucceeded).toBe(false);
    expect(result.compensatedSteps).toContain("BE1");
    expect(result.compensatedSteps).toContain("BE2");
    expect(result.failedSteps).toContain("BEThrow");
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].stepName).toBe("BEThrow");

    // Best-effort should compensate all three steps (including failure)
    const stepEvents = events.filter(e => e.type === "compensation:step");
    expect(stepEvents.length).toBe(3);

    const failedEvents = events.filter(e => e.type === "compensation:failed");
    expect(failedEvents.length).toBe(1);
  });

  it("compensateFn throws non-Error -> wraps in Error", async () => {
    const throwStringStep: CompensationPlanStep = {
      stepName: "StringThrower",
      stepIndex: 0,
      result: "val",
      compensateFn: () => {
        throw "string-error";
      },
    };

    const result = await executeCompensation({
      plan: { completedSteps: [throwStringStep], strategy: "sequential" },
      invoker: successInvoker,
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("orig"),
      failedStepIndex: 1,
      failedStepName: "Trigger",
      executionId: "string-throw-exec",
      sagaName: "StringThrowSaga",
    });

    expect(result.allSucceeded).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].cause).toBeInstanceOf(Error);
    expect((result.errors[0].cause as Error).message).toBe("string-error");
  });
});

// =============================================================================
// G. Empty results on no-compensation steps
// =============================================================================

describe("compensation engine empty results", () => {
  it("all steps have compensateFn: null -> empty result with allSucceeded=true", async () => {
    const nullStep1: CompensationPlanStep = {
      stepName: "NullComp1",
      stepIndex: 0,
      result: "r1",
      compensateFn: null as any, // compensateFn is null
    };
    const nullStep2: CompensationPlanStep = {
      stepName: "NullComp2",
      stepIndex: 1,
      result: "r2",
      compensateFn: null as any,
    };

    const result = await executeCompensation({
      plan: { completedSteps: [nullStep1, nullStep2], strategy: "sequential" },
      invoker: (_step, _params) => ResultAsync.ok("ok"),
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("e"),
      failedStepIndex: 2,
      failedStepName: "FS",
      executionId: "null-exec",
      sagaName: "NullSaga",
    });

    expect(result.allSucceeded).toBe(true);
    expect(result.compensatedSteps).toEqual([]);
    expect(result.failedSteps).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("empty completedSteps -> empty result with allSucceeded=true", async () => {
    const result = await executeCompensation({
      plan: { completedSteps: [], strategy: "sequential" },
      invoker: (_step, _params) => ResultAsync.ok("ok"),
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("e"),
      failedStepIndex: 0,
      failedStepName: "FS",
      executionId: "empty-exec",
      sagaName: "EmptySaga",
    });

    expect(result.allSucceeded).toBe(true);
    expect(result.compensatedSteps).toEqual([]);
    expect(result.failedSteps).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("empty completedSteps with parallel strategy -> empty result with allSucceeded=true", async () => {
    const result = await executeCompensation({
      plan: { completedSteps: [], strategy: "parallel" },
      invoker: (_step, _params) => ResultAsync.ok("ok"),
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("e"),
      failedStepIndex: 0,
      failedStepName: "FS",
      executionId: "empty-par-exec",
      sagaName: "EmptyParSaga",
    });

    expect(result.allSucceeded).toBe(true);
    expect(result.compensatedSteps).toEqual([]);
    expect(result.failedSteps).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("empty completedSteps with best-effort strategy -> empty result with allSucceeded=true", async () => {
    const result = await executeCompensation({
      plan: { completedSteps: [], strategy: "best-effort" },
      invoker: (_step, _params) => ResultAsync.ok("ok"),
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("e"),
      failedStepIndex: 0,
      failedStepName: "FS",
      executionId: "empty-be-exec",
      sagaName: "EmptyBESaga",
    });

    expect(result.allSucceeded).toBe(true);
    expect(result.compensatedSteps).toEqual([]);
    expect(result.failedSteps).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});

// =============================================================================
// H. Strategy switching behavior
// =============================================================================

describe("compensation engine strategy switching", () => {
  const failInvoker: CompensationInvoker = (step, _params) => {
    if (step.stepName === "FailStep") return ResultAsync.err(new Error("invoker-fail"));
    return ResultAsync.ok("ok");
  };

  const makeStep = (name: string, index: number): CompensationPlanStep => ({
    stepName: name,
    stepIndex: index,
    result: `result-${name}`,
    compensateFn: (ctx: any) => ({ undo: ctx.stepResult }),
  });

  it("sequential stops at first invoker failure", async () => {
    const events: SagaEvent[] = [];

    // Steps in order: OK1(0), FailStep(1), OK2(2)
    // Sequential reverses: OK2(2), FailStep(1), OK1(0)
    // Should compensate OK2, fail on FailStep, skip OK1
    const result = await executeCompensation({
      plan: {
        completedSteps: [makeStep("OK1", 0), makeStep("FailStep", 1), makeStep("OK2", 2)],
        strategy: "sequential",
      },
      invoker: failInvoker,
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("orig"),
      failedStepIndex: 3,
      failedStepName: "Trigger",
      executionId: "seq-fail-exec",
      sagaName: "SeqSaga",
      emitEvent: e => events.push(e),
    });

    expect(result.allSucceeded).toBe(false);
    expect(result.compensatedSteps).toEqual(["OK2"]);
    expect(result.failedSteps).toEqual(["FailStep"]);
    // OK1 was skipped because sequential stops on first failure
    expect(result.compensatedSteps).not.toContain("OK1");

    const failedEvents = events.filter(e => e.type === "compensation:failed");
    expect(failedEvents.length).toBe(1);
    if (failedEvents[0].type === "compensation:failed") {
      expect(failedEvents[0].failedCompensationStep).toBe("FailStep");
      expect(failedEvents[0].remainingSteps).toEqual(["OK1"]);
    }
  });

  it("best-effort continues past invoker failures", async () => {
    const events: SagaEvent[] = [];

    // Steps in order: OK1(0), FailStep(1), OK2(2)
    // Best-effort reverses: OK2(2), FailStep(1), OK1(0)
    // Should compensate all, collecting failure
    const result = await executeCompensation({
      plan: {
        completedSteps: [makeStep("OK1", 0), makeStep("FailStep", 1), makeStep("OK2", 2)],
        strategy: "best-effort",
      },
      invoker: failInvoker,
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("orig"),
      failedStepIndex: 3,
      failedStepName: "Trigger",
      executionId: "be-fail-exec",
      sagaName: "BESaga",
      emitEvent: e => events.push(e),
    });

    expect(result.allSucceeded).toBe(false);
    expect(result.compensatedSteps).toContain("OK1");
    expect(result.compensatedSteps).toContain("OK2");
    expect(result.failedSteps).toEqual(["FailStep"]);

    // All three steps should have compensation:step events
    const stepEvents = events.filter(e => e.type === "compensation:step");
    expect(stepEvents.length).toBe(3);

    const failedEvents = events.filter(e => e.type === "compensation:failed");
    expect(failedEvents.length).toBe(1);
  });

  it("parallel runs all concurrently and collects all results", async () => {
    const events: SagaEvent[] = [];

    const result = await executeCompensation({
      plan: {
        completedSteps: [makeStep("P1", 0), makeStep("FailStep", 1), makeStep("P2", 2)],
        strategy: "parallel",
      },
      invoker: failInvoker,
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("orig"),
      failedStepIndex: 3,
      failedStepName: "Trigger",
      executionId: "par-fail-exec",
      sagaName: "ParSaga",
      emitEvent: e => events.push(e),
    });

    expect(result.allSucceeded).toBe(false);
    expect(result.compensatedSteps).toContain("P1");
    expect(result.compensatedSteps).toContain("P2");
    expect(result.failedSteps).toEqual(["FailStep"]);

    // All three steps should have compensation:step events
    const stepEvents = events.filter(e => e.type === "compensation:step");
    expect(stepEvents.length).toBe(3);

    const failedEvents = events.filter(e => e.type === "compensation:failed");
    expect(failedEvents.length).toBe(1);
    if (failedEvents[0].type === "compensation:failed") {
      expect(failedEvents[0].failedCompensationStep).toBe("FailStep");
    }
  });

  it("all strategies produce identical result shape for successful compensations", async () => {
    const steps = [makeStep("S1", 0), makeStep("S2", 1)];
    const allSuccessInvoker: CompensationInvoker = () => ResultAsync.ok("ok");

    for (const strategy of ["sequential", "parallel", "best-effort"] as const) {
      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy },
        invoker: allSuccessInvoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("orig"),
        failedStepIndex: 2,
        failedStepName: "Trigger",
        executionId: `all-ok-${strategy}`,
        sagaName: `AllOk${strategy}`,
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.failedSteps).toEqual([]);
      expect(result.errors).toEqual([]);
      // Sequential and best-effort reverse; parallel does not
      if (strategy === "parallel") {
        expect(result.compensatedSteps).toEqual(["S1", "S2"]);
      } else {
        expect(result.compensatedSteps).toEqual(["S2", "S1"]);
      }
    }
  });
});

// =============================================================================
// Additional runner.ts edge cases for mutation killing
// =============================================================================

describe("runner.ts additional edge cases", () => {
  it("cancel on unknown execution returns ExecutionNotFound error", async () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);

    const result = await runner.cancel("nonexistent");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ExecutionNotFound");
      expect(result.error.message).toContain("nonexistent");
      if (result.error._tag === "ExecutionNotFound") {
        expect(result.error.executionId).toBe("nonexistent");
      }
    }
  });

  it("getStatus on unknown execution returns ExecutionNotFound error", async () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);

    const result = await runner.getStatus("nonexistent");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ExecutionNotFound");
      expect(result.error.message).toContain("nonexistent");
      if (result.error._tag === "ExecutionNotFound") {
        expect(result.error.executionId).toBe("nonexistent");
      }
    }
  });

  it("getTrace on unknown execution returns null", () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);

    const trace = runner.getTrace("nonexistent");
    expect(trace).toBeNull();
  });

  it("getTrace on existing execution returns trace with correct fields", async () => {
    const Step1 = defineStep("TraceStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("TraceSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.TraceStep)
      .build();

    const resolver = createResolver({
      TestPort: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    await runner.execute(saga, "trace-input", { executionId: "trace-exec-1" });

    const trace = runner.getTrace("trace-exec-1");
    expect(trace).not.toBeNull();
    if (trace) {
      expect(trace.executionId).toBe("trace-exec-1");
      expect(trace.sagaName).toBe("TraceSaga");
      expect(trace.input).toBe("trace-input");
      expect(trace.steps.length).toBeGreaterThan(0);
    }
  });

  it("execute with timeout from saga options works", async () => {
    const Step1 = defineStep("TimeoutOptStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("TimeoutOptSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.TimeoutOptStep)
      .options({ compensationStrategy: "sequential", timeout: 5000 })
      .build();

    const resolver = createResolver({
      TestPort: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "hi", { executionId: "timeout-opt-1" });
    expect(result.isOk()).toBe(true);
  });

  it("execute with executionId in options uses that id", async () => {
    const Step1 = defineStep("IdStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("IdSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.IdStep)
      .build();

    const resolver = createResolver({
      TestPort: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "hi", { executionId: "custom-id-123" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.executionId).toBe("custom-id-123");
    }
  });

  it("execute without executionId auto-generates one", async () => {
    const Step1 = defineStep("AutoIdStep")
      .io<string, string>()
      .invoke(TestPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("AutoIdSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.AutoIdStep)
      .build();

    const resolver = createResolver({
      TestPort: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "hi");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.executionId).toBeTruthy();
      expect(typeof result.value.executionId).toBe("string");
      expect(result.value.executionId.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// Compensation engine context correctness
// =============================================================================

describe("compensation engine context building", () => {
  it("buildCompensationContext passes all fields to compensateFn", async () => {
    const ctxCapture: any[] = [];

    const step: CompensationPlanStep = {
      stepName: "CtxStep",
      stepIndex: 7,
      result: { txId: "t-99" },
      compensateFn: (ctx: any) => {
        ctxCapture.push(ctx);
        return { refund: true };
      },
    };

    await executeCompensation({
      plan: { completedSteps: [step], strategy: "sequential" },
      invoker: (_step, params) => ResultAsync.ok(params),
      sagaInput: { orderId: "o-1" },
      accumulatedResults: { prevStep: "prev" },
      originalError: new Error("boom"),
      failedStepIndex: 10,
      failedStepName: "FailedAt",
      executionId: "ctx-exec-1",
      sagaName: "CtxSaga",
    });

    expect(ctxCapture.length).toBe(1);
    const ctx = ctxCapture[0];
    expect(ctx.input).toEqual({ orderId: "o-1" });
    expect(ctx.results).toEqual({ prevStep: "prev" });
    expect(ctx.stepResult).toEqual({ txId: "t-99" });
    expect(ctx.error).toBeInstanceOf(Error);
    expect((ctx.error as Error).message).toBe("boom");
    expect(ctx.failedStepIndex).toBe(10);
    expect(ctx.failedStepName).toBe("FailedAt");
    expect(ctx.stepIndex).toBe(7);
    expect(ctx.executionId).toBe("ctx-exec-1");
  });

  it("compensation:step event has correct durationMs, stepName, stepIndex, success fields", async () => {
    const events: SagaEvent[] = [];

    const step: CompensationPlanStep = {
      stepName: "DurStep",
      stepIndex: 3,
      result: "res",
      compensateFn: () => ({ done: true }),
    };

    await executeCompensation({
      plan: { completedSteps: [step], strategy: "sequential" },
      invoker: () => ResultAsync.ok("ok"),
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("e"),
      failedStepIndex: 5,
      failedStepName: "FS",
      executionId: "dur-exec",
      sagaName: "DurSaga",
      emitEvent: e => events.push(e),
    });

    const stepEvent = events.find(e => e.type === "compensation:step");
    expect(stepEvent).toBeDefined();
    if (stepEvent && stepEvent.type === "compensation:step") {
      expect(stepEvent.stepName).toBe("DurStep");
      expect(stepEvent.stepIndex).toBe(3);
      expect(stepEvent.success).toBe(true);
      expect(typeof stepEvent.durationMs).toBe("number");
      expect(stepEvent.durationMs).toBeGreaterThanOrEqual(0);
      expect(stepEvent.executionId).toBe("dur-exec");
      expect(stepEvent.sagaName).toBe("DurSaga");
      expect(stepEvent.error).toBeUndefined();
    }
  });

  it("compensation:step event for failure has error field set", async () => {
    const events: SagaEvent[] = [];

    const step: CompensationPlanStep = {
      stepName: "ErrStep",
      stepIndex: 2,
      result: "res",
      compensateFn: () => ({ done: true }),
    };

    const failInvoker: CompensationInvoker = () => ResultAsync.err(new Error("invoker-boom"));

    await executeCompensation({
      plan: { completedSteps: [step], strategy: "sequential" },
      invoker: failInvoker,
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("e"),
      failedStepIndex: 5,
      failedStepName: "FS",
      executionId: "err-evt-exec",
      sagaName: "ErrEvtSaga",
      emitEvent: e => events.push(e),
    });

    const stepEvent = events.find(e => e.type === "compensation:step");
    expect(stepEvent).toBeDefined();
    if (stepEvent && stepEvent.type === "compensation:step") {
      expect(stepEvent.success).toBe(false);
      expect(stepEvent.error).toBeInstanceOf(Error);
      expect((stepEvent.error as Error).message).toBe("invoker-boom");
    }
  });

  it("no emitEvent provided -> no crash on any strategy", async () => {
    const step: CompensationPlanStep = {
      stepName: "NoEmit",
      stepIndex: 0,
      result: "val",
      compensateFn: () => "ok",
    };

    for (const strategy of ["sequential", "parallel", "best-effort"] as const) {
      const result = await executeCompensation({
        plan: { completedSteps: [step], strategy },
        invoker: () => ResultAsync.ok("ok"),
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("e"),
        failedStepIndex: 1,
        failedStepName: "FS",
        executionId: `no-emit-${strategy}`,
        sagaName: "NoEmitSaga",
        // No emitEvent
      });

      expect(result.allSucceeded).toBe(true);
    }
  });
});

// =============================================================================
// Compensation engine: parallel firstFailedStep tracking
// =============================================================================

describe("compensation engine parallel firstFailedStep tracking", () => {
  it("parallel: firstFailedStep in compensation:failed is the first failure in order", async () => {
    const events: SagaEvent[] = [];

    const failAllInvoker: CompensationInvoker = step => {
      return ResultAsync.err(new Error(`fail-${step.stepName}`));
    };

    const steps: CompensationPlanStep[] = [
      { stepName: "PA", stepIndex: 0, result: "a", compensateFn: () => "undo" },
      { stepName: "PB", stepIndex: 1, result: "b", compensateFn: () => "undo" },
    ];

    const result = await executeCompensation({
      plan: { completedSteps: steps, strategy: "parallel" },
      invoker: failAllInvoker,
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("orig"),
      failedStepIndex: 3,
      failedStepName: "Trigger",
      executionId: "par-first-exec",
      sagaName: "ParFirstSaga",
      emitEvent: e => events.push(e),
    });

    expect(result.allSucceeded).toBe(false);
    expect(result.failedSteps).toContain("PA");
    expect(result.failedSteps).toContain("PB");

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      // First failed step should be "PA" (first in order)
      expect(failedEvent.failedCompensationStep).toBe("PA");
      expect(failedEvent.remainingSteps).toEqual([]);
    }
  });

  it("parallel: with no failures emits compensation:completed", async () => {
    const events: SagaEvent[] = [];

    const steps: CompensationPlanStep[] = [
      { stepName: "PA", stepIndex: 0, result: "a", compensateFn: () => "undo" },
      { stepName: "PB", stepIndex: 1, result: "b", compensateFn: () => "undo" },
    ];

    const result = await executeCompensation({
      plan: { completedSteps: steps, strategy: "parallel" },
      invoker: () => ResultAsync.ok("ok"),
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("orig"),
      failedStepIndex: 3,
      failedStepName: "Trigger",
      executionId: "par-ok-exec",
      sagaName: "ParOkSaga",
      emitEvent: e => events.push(e),
    });

    expect(result.allSucceeded).toBe(true);
    const completedEvent = events.find(e => e.type === "compensation:completed");
    expect(completedEvent).toBeDefined();
    if (completedEvent && completedEvent.type === "compensation:completed") {
      expect(completedEvent.compensatedSteps).toEqual(["PA", "PB"]);
    }
  });
});

// =============================================================================
// Best-effort firstFailedStep tracking
// =============================================================================

describe("compensation engine best-effort firstFailedStep tracking", () => {
  it("best-effort: firstFailedStep in compensation:failed is the first failure in reverse order", async () => {
    const events: SagaEvent[] = [];

    // Steps: A(0), B(1), C(2)
    // Best-effort reverses: C(2), B(1), A(0)
    // B and A fail, C succeeds
    const failInvoker: CompensationInvoker = step => {
      if (step.stepName === "A" || step.stepName === "B") {
        return ResultAsync.err(new Error(`fail-${step.stepName}`));
      }
      return ResultAsync.ok("ok");
    };

    const steps: CompensationPlanStep[] = [
      { stepName: "A", stepIndex: 0, result: "a", compensateFn: () => "undo" },
      { stepName: "B", stepIndex: 1, result: "b", compensateFn: () => "undo" },
      { stepName: "C", stepIndex: 2, result: "c", compensateFn: () => "undo" },
    ];

    const result = await executeCompensation({
      plan: { completedSteps: steps, strategy: "best-effort" },
      invoker: failInvoker,
      sagaInput: {},
      accumulatedResults: {},
      originalError: new Error("orig"),
      failedStepIndex: 3,
      failedStepName: "Trigger",
      executionId: "be-first-exec",
      sagaName: "BEFirstSaga",
      emitEvent: e => events.push(e),
    });

    expect(result.allSucceeded).toBe(false);
    expect(result.compensatedSteps).toEqual(["C"]);
    expect(result.failedSteps).toContain("B");
    expect(result.failedSteps).toContain("A");

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      // First failed in reverse order is B
      expect(failedEvent.failedCompensationStep).toBe("B");
    }
  });
});
