import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep, defineSaga, type SagaExecutionState, type SagaStatusType } from "@hex-di/saga";
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
    const harness = createSagaTestHarness({
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { value: { transactionId: "t-1" } },
      },
    });

    const result = await harness.execute(OrderSaga, { orderId: "order-1" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toEqual({
        reservationId: "r-1",
        transactionId: "t-1",
      });
    }
  });

  it("returns error when a step fails", async () => {
    const harness = createSagaTestHarness({
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { error: new Error("Payment declined") },
      },
    });

    const result = await harness.execute(OrderSaga, { orderId: "order-1" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.stepName).toBe("Charge");
    }
  });

  it("records port invocations", async () => {
    const harness = createSagaTestHarness({
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { value: { transactionId: "t-1" } },
      },
    });

    await harness.execute(OrderSaga, { orderId: "order-1" });

    expect(harness.getCalls("Validate")).toHaveLength(1);
    expect(harness.getCalls("Reserve")).toHaveLength(1);
    expect(harness.getCalls("Charge")).toHaveLength(1);
    expect(harness.getCalls("Unknown")).toHaveLength(0);
  });

  it("supports dynamic response values", async () => {
    const harness = createSagaTestHarness({
      mocks: {
        Validate: {
          valueFn: (params: any) => ({ valid: params.orderId === "ok" }),
        },
      },
    });

    const result = await harness.execute(SimpleSaga, { orderId: "ok" });
    expect(result.isOk()).toBe(true);
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
      compensation: { status: "none", compensatedSteps: [], failedSteps: [] },
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
    if (result.isOk() && result.value) {
      expect(result.value.status).toBe("running");
    }
  });
});

// =============================================================================
// expectSagaResult
// =============================================================================

describe("expectSagaResult", () => {
  it("asserts success", async () => {
    const harness = createSagaTestHarness({
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { value: { transactionId: "t-1" } },
      },
    });

    const result = await harness.execute(OrderSaga, { orderId: "o-1" });
    expectSagaResult(result).toBeSuccess();
  });

  it("asserts success with output", async () => {
    const harness = createSagaTestHarness({
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { value: { transactionId: "t-1" } },
      },
    });

    const result = await harness.execute(OrderSaga, { orderId: "o-1" });
    expectSagaResult(result).toBeSuccessWithOutput({
      reservationId: "r-1",
      transactionId: "t-1",
    });
  });

  it("asserts step failure", async () => {
    const harness = createSagaTestHarness({
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { error: new Error("declined") },
      },
    });

    const result = await harness.execute(OrderSaga, { orderId: "o-1" });
    expectSagaResult(result).toBeStepFailed("Charge");
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
    });
    recorder.listener({
      type: "step:started",
      executionId: "exec-1",
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
      stepName: "Validate",
      stepIndex: 0,
      timestamp: Date.now(),
    });
    recorder.listener({
      type: "step:completed",
      executionId: "exec-1",
      stepName: "Validate",
      stepIndex: 0,
      timestamp: Date.now(),
    });
    recorder.listener({
      type: "step:started",
      executionId: "exec-1",
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
    });
    expect(recorder.eventCount).toBe(1);

    recorder.reset();
    expect(recorder.eventCount).toBe(0);
    expect(recorder.events).toHaveLength(0);
  });
});
