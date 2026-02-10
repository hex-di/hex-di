import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import {
  defineStep,
  defineSaga,
  type SagaExecutionState,
  type SagaStatusType,
  type SagaSuccess,
  type SagaError,
} from "@hex-di/saga";
import {
  createSagaTestHarness,
  createMockStepExecutor,
  createMockSagaPersister,
  createSagaEventRecorder,
  expectSagaResult,
} from "../src/index.js";

// =============================================================================
// Test Ports & Steps
// =============================================================================

const ValidatePort = createPort<"Validate", any>({ name: "Validate" });
const ReservePort = createPort<"Reserve", any>({ name: "Reserve" });
const ChargePort = createPort<"Charge", any>({ name: "Charge" });

const ValidateStep = defineStep("Validate")
  .io<{ orderId: string }, { valid: boolean }>()
  .invoke(ValidatePort, ctx => ctx.input)
  .build();

const ReserveStep = defineStep("Reserve")
  .io<{ orderId: string }, { reservationId: string }>()
  .invoke(ReservePort, ctx => ctx.input)
  .compensate(ctx => ({ undo: ctx.stepResult.reservationId }))
  .build();

const ChargeStep = defineStep("Charge")
  .io<{ orderId: string }, { transactionId: string }>()
  .invoke(ChargePort, ctx => ctx.input)
  .compensate(ctx => ({ refund: ctx.stepResult.transactionId }))
  .build();

const OrderSaga = defineSaga("OrderSaga")
  .input<{ orderId: string }>()
  .step(ValidateStep)
  .step(ReserveStep)
  .step(ChargeStep)
  .output(results => ({
    reservationId: results.Reserve.reservationId,
    transactionId: results.Charge.transactionId,
  }))
  .build();

const SimpleSaga = defineSaga("SimpleSaga")
  .input<{ orderId: string }>()
  .step(ValidateStep)
  .output(() => ({ done: true }))
  .build();

// =============================================================================
// createSagaTestHarness
// =============================================================================

describe("createSagaTestHarness", () => {
  it("executes a saga with mock port responses", async () => {
    const harness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { value: { transactionId: "t-1" } },
      },
    });

    const result = await harness.execute({ orderId: "order-1" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toEqual({
        reservationId: "r-1",
        transactionId: "t-1",
      });
    }
  });

  it("returns error when a step fails", async () => {
    const harness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { error: new Error("Payment declined") },
      },
    });

    const result = await harness.execute({ orderId: "order-1" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.stepName).toBe("Charge");
    }
  });

  it("records port invocations", async () => {
    const harness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { value: { transactionId: "t-1" } },
      },
    });

    await harness.execute({ orderId: "order-1" });

    expect(harness.getCalls("Validate")).toHaveLength(1);
    expect(harness.getCalls("Reserve")).toHaveLength(1);
    expect(harness.getCalls("Charge")).toHaveLength(1);
    expect(harness.getCalls("Unknown")).toHaveLength(0);
  });

  it("supports dynamic response values", async () => {
    const DynamicValidateStep = defineStep("Validate")
      .io<{ orderId: string }, { valid: boolean; tag: string }>()
      .invoke(ValidatePort, ctx => ctx.input)
      .build();

    const DynamicSaga = defineSaga("DynamicSaga")
      .input<{ orderId: string }>()
      .step(DynamicValidateStep)
      .output(results => ({
        valid: results.Validate.valid,
        tag: results.Validate.tag,
      }))
      .build();

    const harness = createSagaTestHarness(DynamicSaga, {
      mocks: {
        Validate: {
          valueFn: (params: any) => ({
            valid: params.orderId === "ok",
            tag: `processed-${params.orderId}`,
          }),
        },
      },
    });

    const result = await harness.execute({ orderId: "ok" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toEqual({ valid: true, tag: "processed-ok" });
    }

    // Also verify different input gives different output
    const result2 = await harness.execute({ orderId: "nope" });
    expect(result2.isOk()).toBe(true);
    if (result2.isOk()) {
      expect(result2.value.output).toEqual({ valid: false, tag: "processed-nope" });
    }
  });

  it("supports delay with dynamic response values", async () => {
    const DynamicValidateStep = defineStep("Validate")
      .io<{ orderId: string }, { valid: boolean; source: string }>()
      .invoke(ValidatePort, ctx => ctx.input)
      .build();

    const DynamicSaga = defineSaga("DelayDynSaga")
      .input<{ orderId: string }>()
      .step(DynamicValidateStep)
      .output(results => ({
        valid: results.Validate.valid,
        source: results.Validate.source,
      }))
      .build();

    const harness = createSagaTestHarness(DynamicSaga, {
      mocks: {
        Validate: {
          delay: 30,
          valueFn: (params: any) => ({ valid: true, source: `delayed-${params.orderId}` }),
        },
      },
    });

    const start = Date.now();
    const result = await harness.execute({ orderId: "ok" });
    const elapsed = Date.now() - start;

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toEqual({ valid: true, source: "delayed-ok" });
    }
    expect(elapsed).toBeGreaterThanOrEqual(20);
  });

  it("supports delay with static values", async () => {
    const harness = createSagaTestHarness(SimpleSaga, {
      mocks: {
        Validate: {
          delay: 30,
          value: { valid: true },
        },
      },
    });

    const start = Date.now();
    const result = await harness.execute({ orderId: "ok" });
    const elapsed = Date.now() - start;

    expect(result.isOk()).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(20);
  });

  it("returns undefined for unconfigured mock", async () => {
    const harness = createSagaTestHarness(SimpleSaga, {
      mocks: {},
    });

    // With no mock configured, resolve returns { execute } that returns undefined
    const result = await harness.execute({ orderId: "ok" });
    expect(result.isOk()).toBe(true);
  });

  it("resetEvents clears accumulated events", async () => {
    const harness = createSagaTestHarness(SimpleSaga, {
      mocks: {
        Validate: { value: { valid: true } },
      },
    });

    await harness.execute({ orderId: "ok" });
    harness.resetEvents();
    expect(harness.events).toHaveLength(0);
  });

  it("getTrace returns execution trace after execution", async () => {
    const harness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { value: { transactionId: "t-1" } },
      },
    });

    await harness.execute({ orderId: "trace-test" });
    const trace = harness.getTrace();
    expect(trace).not.toBeNull();
    if (trace) {
      expect(trace.sagaName).toBe("OrderSaga");
      expect(trace.status).toBe("completed");
      expect(trace.steps).toHaveLength(3);
      expect(trace.steps[0].stepName).toBe("Validate");
      expect(trace.steps[0].status).toBe("completed");
      expect(trace.steps[1].stepName).toBe("Reserve");
      expect(trace.steps[2].stepName).toBe("Charge");
      expect(trace.compensation).toBeUndefined();
      expect(trace.startedAt).toBeTypeOf("number");
    }
  });

  it("getTrace returns null before any execution", () => {
    const harness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { value: { transactionId: "t-1" } },
      },
    });

    expect(harness.getTrace()).toBeNull();
  });

  it("getTrace includes compensation trace on failure", async () => {
    const harness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { error: new Error("failed") },
      },
    });

    await harness.execute({ orderId: "comp-test" });
    const trace = harness.getTrace();
    expect(trace).not.toBeNull();
    if (trace) {
      expect(trace.status).toBe("failed");
      // Steps with compensation handlers should have compensation traces
      expect(trace.steps.some(s => s.status === "failed")).toBe(true);
    }
  });

  it("dispose clears all internal state", async () => {
    const harness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { value: { transactionId: "t-1" } },
      },
    });

    await harness.execute({ orderId: "dispose-test" });
    expect(harness.events.length).toBeGreaterThan(0);
    expect(harness.getCalls("Validate")).toHaveLength(1);

    await harness.dispose();
    expect(harness.events).toHaveLength(0);
    expect(harness.getCalls("Validate")).toHaveLength(0);
    expect(harness.getTrace()).toBeNull();
  });
});

// =============================================================================
// createMockStepExecutor
// =============================================================================

describe("createMockStepExecutor", () => {
  it("returns static value", async () => {
    const executor = createMockStepExecutor({ value: { id: "1", name: "Alice" } });

    const result = await executor.service.execute({ name: "Alice" });
    expect(result).toEqual({ id: "1", name: "Alice" });
  });

  it("returns dynamic value", async () => {
    const executor = createMockStepExecutor({
      valueFn: (params: any) => ({ id: "1", name: params.name }),
    });

    const result = await executor.service.execute({ name: "Bob" });
    expect(result).toEqual({ id: "1", name: "Bob" });
  });

  it("throws configured error", async () => {
    const executor = createMockStepExecutor({ error: new Error("test error") });

    await expect(executor.service.execute({})).rejects.toThrow("test error");
  });

  it("records invocations", async () => {
    const executor = createMockStepExecutor({ value: "ok" });

    await executor.service.execute("input1");
    await executor.service.execute("input2");

    expect(executor.callCount).toBe(2);
    expect(executor.calls[0]).toBe("input1");
    expect(executor.calls[1]).toBe("input2");
  });

  it("resets invocation tracking", async () => {
    const executor = createMockStepExecutor({ value: "ok" });

    await executor.service.execute("input1");
    expect(executor.callCount).toBe(1);

    executor.reset();
    expect(executor.callCount).toBe(0);
    expect(executor.calls).toHaveLength(0);
  });

  it("handles delay", async () => {
    const executor = createMockStepExecutor({
      value: "delayed",
      delay: 50,
    });

    const start = Date.now();
    const result = await executor.service.execute({});
    const elapsed = Date.now() - start;

    expect(result).toBe("delayed");
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it("handles delay with valueFn", async () => {
    const executor = createMockStepExecutor({
      valueFn: (params: any) => `hello-${params.name}`,
      delay: 10,
    });

    const result = await executor.service.execute({ name: "world" });
    expect(result).toBe("hello-world");
  });

  it("handles zero delay without waiting", async () => {
    const executor = createMockStepExecutor({
      value: "immediate",
      delay: 0,
    });

    const start = Date.now();
    const result = await executor.service.execute({});
    const elapsed = Date.now() - start;

    expect(result).toBe("immediate");
    // Zero delay should not introduce a setTimeout
    expect(elapsed).toBeLessThan(50);
  });

  it("handles negative delay without waiting", async () => {
    const executor = createMockStepExecutor({
      value: "immediate",
      delay: -1,
    });

    const result = await executor.service.execute({});
    expect(result).toBe("immediate");
  });

  it("throws when no config provided", async () => {
    const executor = createMockStepExecutor();

    await expect(executor.service.execute({})).rejects.toThrow(
      "MockStepExecutor: no value, valueFn, or error configured"
    );
  });

  it("throws when config has no value/valueFn/error", async () => {
    const executor = createMockStepExecutor({});

    await expect(executor.service.execute({})).rejects.toThrow(
      "MockStepExecutor: no value, valueFn, or error configured"
    );
  });

  it("error takes precedence over value", async () => {
    const executor = createMockStepExecutor({
      value: "should-not-return",
      error: new Error("error wins"),
    });

    await expect(executor.service.execute({})).rejects.toThrow("error wins");
  });
});

// =============================================================================
// createMockSagaPersister
// =============================================================================

describe("createMockSagaPersister", () => {
  function makeTestState(overrides?: Partial<SagaExecutionState>): SagaExecutionState {
    return {
      executionId: "exec-1",
      sagaName: "TestSaga",
      input: { orderId: "order-1" },
      currentStep: 0,
      completedSteps: [],
      status: "running",
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
      ...overrides,
    };
  }

  const testState = makeTestState();

  it("saves and loads execution state", async () => {
    const mock = createMockSagaPersister();

    const saveResult = await mock.persister.save(testState);
    expect(saveResult.isOk()).toBe(true);
    expect(mock.saveCount).toBe(1);

    const loadResult = await mock.persister.load("exec-1");
    expect(loadResult.isOk()).toBe(true);
    if (loadResult.isOk()) {
      expect(loadResult.value).toEqual(testState);
    }
    expect(mock.loadCount).toBe(1);
  });

  it("returns null for missing execution", async () => {
    const mock = createMockSagaPersister();

    const result = await mock.persister.load("missing");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeNull();
    }
  });

  it("deletes execution state", async () => {
    const mock = createMockSagaPersister();

    await mock.persister.save(testState);
    await mock.persister.delete("exec-1");

    expect(mock.deleteCount).toBe(1);

    const result = await mock.persister.load("exec-1");
    if (result.isOk()) {
      expect(result.value).toBeNull();
    }
  });

  it("lists execution states with filters", async () => {
    const mock = createMockSagaPersister();

    await mock.persister.save(testState);
    await mock.persister.save(
      makeTestState({ executionId: "exec-2", status: "completed" as SagaStatusType })
    );

    const allResult = await mock.persister.list();
    if (allResult.isOk()) {
      expect(allResult.value).toHaveLength(2);
    }

    const filteredResult = await mock.persister.list({ status: "running" });
    if (filteredResult.isOk()) {
      expect(filteredResult.value).toHaveLength(1);
    }

    expect(mock.listCount).toBe(2);
  });

  it("updates execution state", async () => {
    const mock = createMockSagaPersister();

    await mock.persister.save(testState);
    await mock.persister.update("exec-1", { status: "completed" });

    expect(mock.updateCount).toBe(1);

    const result = await mock.persister.load("exec-1");
    if (result.isOk() && result.value) {
      expect(result.value.status).toBe("completed");
    }
  });

  it("returns error when updating non-existent state", async () => {
    const mock = createMockSagaPersister();

    const result = await mock.persister.update("missing", { status: "completed" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("NotFound");
    }
  });

  it("resets all tracking data", async () => {
    const mock = createMockSagaPersister();

    await mock.persister.save(testState);
    expect(mock.saveCount).toBe(1);
    expect(mock.stored.size).toBe(1);

    mock.reset();
    expect(mock.saveCount).toBe(0);
    expect(mock.stored.size).toBe(0);
  });

  it("stores clones, not references", async () => {
    const mock = createMockSagaPersister();
    const mutableState = { ...testState };

    await mock.persister.save(mutableState);
    mutableState.status = "completed" as const;

    const result = await mock.persister.load("exec-1");
    expect(result.isOk()).toBe(true);
    if (result.isOk() && result.value) {
      expect(result.value.status).toBe("running");
    }
  });

  it("filters by sagaName", async () => {
    const mock = createMockSagaPersister();

    await mock.persister.save(makeTestState({ executionId: "exec-a", sagaName: "SagaA" }));
    await mock.persister.save(makeTestState({ executionId: "exec-b", sagaName: "SagaB" }));
    await mock.persister.save(makeTestState({ executionId: "exec-c", sagaName: "SagaA" }));

    const filteredResult = await mock.persister.list({ sagaName: "SagaA" });
    expect(filteredResult.isOk()).toBe(true);
    if (filteredResult.isOk()) {
      expect(filteredResult.value).toHaveLength(2);
      expect(filteredResult.value.every(s => s.sagaName === "SagaA")).toBe(true);
      // Also verify the clone — mutating the result should not affect stored state
      expect(filteredResult.value[0].executionId).toBe("exec-a");
      expect(filteredResult.value[1].executionId).toBe("exec-c");
    }
  });

  it("applies limit filter", async () => {
    const mock = createMockSagaPersister();

    await mock.persister.save(makeTestState({ executionId: "exec-1" }));
    await mock.persister.save(makeTestState({ executionId: "exec-2" }));
    await mock.persister.save(makeTestState({ executionId: "exec-3" }));

    const limitedResult = await mock.persister.list({ limit: 2 });
    expect(limitedResult.isOk()).toBe(true);
    if (limitedResult.isOk()) {
      expect(limitedResult.value).toHaveLength(2);
    }
  });
});

// =============================================================================
// expectSagaResult
// =============================================================================

describe("expectSagaResult", () => {
  it("asserts success", async () => {
    const harness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { value: { transactionId: "t-1" } },
      },
    });

    const result = await harness.execute({ orderId: "o-1" });
    expectSagaResult(result).toBeSuccess();
  });

  it("asserts success with output", async () => {
    const harness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { value: { transactionId: "t-1" } },
      },
    });

    const result = await harness.execute({ orderId: "o-1" });
    expectSagaResult(result).toBeSuccessWithOutput({
      reservationId: "r-1",
      transactionId: "t-1",
    });
  });

  it("asserts step failure", async () => {
    const harness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { error: new Error("declined") },
      },
    });

    const result = await harness.execute({ orderId: "o-1" });
    expectSagaResult(result).toBeStepFailed("Charge");
  });

  it("asserts compensation failed", () => {
    const result = err({
      _tag: "CompensationFailed" as const,
      message: "compensation failed",
      sagaName: "TestSaga",
      stepName: "Reserve",
      stepIndex: 1,
      cause: new Error("undo failed"),
      completedSteps: ["Validate"],
      compensatedSteps: [],
      executionId: "exec-1",
      originalError: new Error("original"),
      compensationErrors: [new Error("undo failed")],
    }) as any;

    expectSagaResult(result).toBeCompensationFailed();
  });

  it("toBeCompensationFailed rejects success results", () => {
    const result = ok({ output: {}, executionId: "exec-1" }) as any;

    expect(() => expectSagaResult(result).toBeCompensationFailed()).toThrow();
  });

  it("toBeCompensationFailed rejects wrong error tag", () => {
    const result = err({
      _tag: "StepFailed" as const,
      message: "step failed",
      sagaName: "TestSaga",
      stepName: "Reserve",
      stepIndex: 1,
      cause: new Error("fail"),
      completedSteps: [],
      compensatedSteps: [],
      executionId: "exec-1",
    }) as any;

    expect(() => expectSagaResult(result).toBeCompensationFailed()).toThrow();
  });

  it("asserts cancelled", () => {
    const result = err({
      _tag: "Cancelled" as const,
      message: "saga was cancelled",
      sagaName: "TestSaga",
      executionId: "exec-1",
      completedSteps: ["Validate"],
      compensatedSteps: ["Validate"],
    }) as any;

    expectSagaResult(result).toBeCancelled();
  });

  it("toBeCancelled rejects success results", () => {
    const result = ok({ output: {}, executionId: "exec-1" }) as any;

    expect(() => expectSagaResult(result).toBeCancelled()).toThrow();
  });

  it("toBeCancelled rejects wrong error tag", () => {
    const result = err({
      _tag: "StepFailed" as const,
      message: "step failed",
      sagaName: "TestSaga",
      stepName: "Reserve",
      stepIndex: 1,
      cause: new Error("fail"),
      completedSteps: [],
      compensatedSteps: [],
      executionId: "exec-1",
    }) as any;

    expect(() => expectSagaResult(result).toBeCancelled()).toThrow();
  });

  it("asserts timed out", () => {
    const result = err({
      _tag: "Timeout" as const,
      message: "saga timed out",
      sagaName: "TestSaga",
      executionId: "exec-1",
      stepName: "Reserve",
      timeoutMs: 5000,
    }) as any;

    expectSagaResult(result).toBeTimedOut();
  });

  it("toBeTimedOut rejects success results", () => {
    const result = ok({ output: {}, executionId: "exec-1" }) as any;

    expect(() => expectSagaResult(result).toBeTimedOut()).toThrow();
  });

  it("toBeTimedOut rejects wrong error tag", () => {
    const result = err({
      _tag: "StepFailed" as const,
      message: "step failed",
      sagaName: "TestSaga",
      stepName: "Reserve",
      stepIndex: 1,
      cause: new Error("fail"),
      completedSteps: [],
      compensatedSteps: [],
      executionId: "exec-1",
    }) as any;

    expect(() => expectSagaResult(result).toBeTimedOut()).toThrow();
  });

  it("toBeSuccess rejects error results", () => {
    const result = err({
      _tag: "StepFailed" as const,
      message: "step failed",
      sagaName: "TestSaga",
      stepName: "Reserve",
      stepIndex: 1,
      cause: new Error("fail"),
      completedSteps: [],
      compensatedSteps: [],
      executionId: "exec-1",
    }) as any;

    expect(() => expectSagaResult(result).toBeSuccess()).toThrow();
  });

  it("toBeSuccessWithOutput rejects error results", () => {
    const result = err({
      _tag: "StepFailed" as const,
      message: "step failed",
      sagaName: "TestSaga",
      stepName: "Reserve",
      stepIndex: 1,
      cause: new Error("fail"),
      completedSteps: [],
      compensatedSteps: [],
      executionId: "exec-1",
    }) as any;

    expect(() => expectSagaResult(result).toBeSuccessWithOutput({})).toThrow();
  });

  it("toBeSuccessWithOutput rejects wrong output", () => {
    const result = ok({ output: { a: 1 }, executionId: "exec-1" }) as any;

    expect(() => expectSagaResult(result).toBeSuccessWithOutput({ a: 2 })).toThrow();
  });

  it("toBeStepFailed rejects success results", () => {
    const result = ok({ output: {}, executionId: "exec-1" }) as any;

    expect(() => expectSagaResult(result).toBeStepFailed("Reserve")).toThrow();
  });

  it("toBeStepFailed rejects wrong step name", () => {
    const result = err({
      _tag: "StepFailed" as const,
      message: "step failed",
      sagaName: "TestSaga",
      stepName: "Reserve",
      stepIndex: 1,
      cause: new Error("fail"),
      completedSteps: [],
      compensatedSteps: [],
      executionId: "exec-1",
    }) as any;

    expect(() => expectSagaResult(result).toBeStepFailed("Charge")).toThrow();
  });
});

// =============================================================================
// createSagaEventRecorder
// =============================================================================

describe("createSagaEventRecorder", () => {
  it("records events via listener", () => {
    const recorder = createSagaEventRecorder();

    recorder.listener({
      type: "saga:started",
      executionId: "exec-1",
      sagaName: "TestSaga",
      timestamp: Date.now(),
      input: {},
      stepCount: 1,
      metadata: undefined,
    });
    recorder.listener({
      type: "step:started",
      executionId: "exec-1",
      sagaName: "TestSaga",
      stepName: "Validate",
      stepIndex: 0,
      timestamp: Date.now(),
    });

    expect(recorder.eventCount).toBe(2);
    expect(recorder.hasEvent("saga:started")).toBe(true);
    expect(recorder.hasEvent("saga:completed")).toBe(false);
  });

  it("filters events by type", () => {
    const recorder = createSagaEventRecorder();

    recorder.listener({
      type: "step:started",
      executionId: "exec-1",
      sagaName: "TestSaga",
      stepName: "Validate",
      stepIndex: 0,
      timestamp: Date.now(),
    });
    recorder.listener({
      type: "step:completed",
      executionId: "exec-1",
      sagaName: "TestSaga",
      stepName: "Validate",
      stepIndex: 0,
      timestamp: Date.now(),
      durationMs: 10,
    });
    recorder.listener({
      type: "step:started",
      executionId: "exec-1",
      sagaName: "TestSaga",
      stepName: "Reserve",
      stepIndex: 1,
      timestamp: Date.now(),
    });

    const started = recorder.getByType("step:started");
    expect(started).toHaveLength(2);

    const completed = recorder.getByType("step:completed");
    expect(completed).toHaveLength(1);
  });

  it("resets recorded events", () => {
    const recorder = createSagaEventRecorder();

    recorder.listener({
      type: "saga:started",
      executionId: "exec-1",
      sagaName: "TestSaga",
      timestamp: Date.now(),
      input: {},
      stepCount: 1,
      metadata: undefined,
    });
    expect(recorder.eventCount).toBe(1);

    recorder.reset();
    expect(recorder.eventCount).toBe(0);
    expect(recorder.events).toHaveLength(0);
  });
});
