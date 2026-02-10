/**
 * Introspection Mutation Tests
 *
 * Targets src/introspection/saga-inspector.ts internal functions
 * through the public createSagaInspector API.
 *
 * Covers: extractStepInfo, extractDefinitionInfo, executionStateToSummary,
 * extractCauseTags, getCurrentStepName, computeCompensationStats,
 * traceToExecutionState.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaInspector } from "../src/introspection/saga-inspector.js";
import type { ExecutionTrace } from "../src/runtime/types.js";
import type { SagaPersister, SagaExecutionState } from "../src/ports/types.js";

// =============================================================================
// Test Ports & Steps
// =============================================================================

const PaymentPort = createPort<"Payment", any>({ name: "Payment" });
const ShippingPort = createPort<"Shipping", any>({ name: "Shipping" });
const NotifyPort = createPort<"Notify", any>({ name: "Notify" });
const InventoryPort = createPort<"Inventory", any>({ name: "Inventory" });

const PaymentStep = defineStep("Payment")
  .io<{ orderId: string }, { txId: string }>()
  .invoke(PaymentPort, ctx => ctx.input)
  .compensate(ctx => ({ refund: ctx.stepResult.txId }))
  .build();

const ShippingStep = defineStep("Shipping")
  .io<{ orderId: string }, { trackingId: string }>()
  .invoke(ShippingPort, ctx => ctx.input)
  .compensate(ctx => ({ cancel: ctx.stepResult.trackingId }))
  .options({ retry: { maxAttempts: 3, delay: 100 }, timeout: 5000 })
  .build();

const NotifyStep = defineStep("Notify")
  .io<{ orderId: string }, void>()
  .invoke(NotifyPort, ctx => ctx.input)
  .when(ctx => (ctx.results as any).Payment !== undefined)
  .build();

const ExponentialRetryStep = defineStep("ExponentialRetry")
  .io<string, string>()
  .invoke(PaymentPort, ctx => ctx.input)
  .retry({ maxAttempts: 5, delay: attempt => attempt * 100 })
  .build();

const PlainStep = defineStep("PlainStep")
  .io<string, string>()
  .invoke(InventoryPort, ctx => ctx.input)
  .build();

// =============================================================================
// Test Sagas
// =============================================================================

const OrderSaga = defineSaga("OrderSaga")
  .input<{ orderId: string }>()
  .step(PaymentStep)
  .step(ShippingStep)
  .step(NotifyStep)
  .output(r => r)
  .build();

const ExponentialSaga = defineSaga("ExponentialSaga")
  .input<string>()
  .step(ExponentialRetryStep)
  .output(() => ({}))
  .build();

const PlainSaga = defineSaga("PlainSaga")
  .input<string>()
  .step(PlainStep)
  .output(() => ({}))
  .build();

// =============================================================================
// extractStepInfo — exponential backoff path
// =============================================================================

describe("extractStepInfo — exponential backoff", () => {
  it("function-typed delay produces backoffStrategy=exponential, initialDelay=0", () => {
    const inspector = createSagaInspector({
      definitions: [ExponentialSaga],
    });

    const [def] = inspector.getDefinitions();
    const stepInfo = def.steps[0];

    expect(stepInfo.retryPolicy).toBeDefined();
    expect(stepInfo.retryPolicy?.backoffStrategy).toBe("exponential");
    expect(stepInfo.retryPolicy?.initialDelay).toBe(0);
    expect(stepInfo.retryPolicy?.maxAttempts).toBe(5);
  });
});

// =============================================================================
// extractDefinitionInfo — exact value assertions
// =============================================================================

describe("extractDefinitionInfo — exact values", () => {
  it("step with no retry/compensation/condition has correct defaults", () => {
    const inspector = createSagaInspector({
      definitions: [PlainSaga],
    });

    const [def] = inspector.getDefinitions();
    const stepInfo = def.steps[0];

    expect(stepInfo.name).toBe("PlainStep");
    expect(stepInfo.port).toBe("Inventory");
    expect(stepInfo.hasCompensation).toBe(false);
    expect(stepInfo.isConditional).toBe(false);
    expect(stepInfo.retryPolicy).toBeUndefined();
    expect(stepInfo.timeout).toBeUndefined();
  });

  it("step with all features has correct values", () => {
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const [def] = inspector.getDefinitions();

    // Payment step: has compensation, no condition, no retry, no timeout
    const payment = def.steps[0];
    expect(payment.name).toBe("Payment");
    expect(payment.port).toBe("Payment");
    expect(payment.hasCompensation).toBe(true);
    expect(payment.isConditional).toBe(false);
    expect(payment.retryPolicy).toBeUndefined();
    expect(payment.timeout).toBeUndefined();

    // Shipping step: has compensation, has retry and timeout
    const shipping = def.steps[1];
    expect(shipping.name).toBe("Shipping");
    expect(shipping.port).toBe("Shipping");
    expect(shipping.hasCompensation).toBe(true);
    expect(shipping.isConditional).toBe(false);
    expect(shipping.retryPolicy).toBeDefined();
    expect(shipping.retryPolicy?.maxAttempts).toBe(3);
    expect(shipping.retryPolicy?.backoffStrategy).toBe("fixed");
    expect(shipping.retryPolicy?.initialDelay).toBe(100);
    expect(shipping.timeout).toBe(5000);

    // Notify step: no compensation, has condition
    const notify = def.steps[2];
    expect(notify.name).toBe("Notify");
    expect(notify.port).toBe("Notify");
    expect(notify.hasCompensation).toBe(false);
    expect(notify.isConditional).toBe(true);
    expect(notify.retryPolicy).toBeUndefined();
    expect(notify.timeout).toBeUndefined();
  });

  it("saga options include correct values", () => {
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const [def] = inspector.getDefinitions();
    expect(def.options.compensationStrategy).toBe("sequential");
    expect(def.options.timeout).toBeUndefined();
    expect(def.options.retryPolicy).toBeUndefined();
  });

  it("portDependencies is exact array of port names", () => {
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const [def] = inspector.getDefinitions();
    expect(def.portDependencies).toEqual(["Payment", "Shipping", "Notify"]);
  });
});

// =============================================================================
// getHistory with mock persister (executionStateToSummary + extractCauseTags)
// =============================================================================

function createMockPersister(states: SagaExecutionState[]): SagaPersister {
  return {
    save: () => ResultAsync.ok(undefined),
    load: () => ResultAsync.ok(null),
    delete: () => ResultAsync.ok(undefined),
    list: () => ResultAsync.ok(states),
    update: () => ResultAsync.ok(undefined),
  };
}

describe("getHistory with mock persister", () => {
  it("converts completed execution state to summary with durationMs", async () => {
    const state: SagaExecutionState = {
      executionId: "hist-1",
      sagaName: "OrderSaga",
      input: { orderId: "o-1" },
      currentStep: 3,
      completedSteps: [
        {
          name: "Payment",
          index: 0,
          output: { txId: "t1" },
          skipped: false,
          completedAt: "2024-01-01T00:00:01Z",
        },
        {
          name: "Shipping",
          index: 1,
          output: { trackingId: "tr1" },
          skipped: false,
          completedAt: "2024-01-01T00:00:02Z",
        },
        {
          name: "Notify",
          index: 2,
          output: undefined,
          skipped: false,
          completedAt: "2024-01-01T00:00:03Z",
        },
      ],
      status: "completed",
      error: null,
      compensation: {
        active: false,
        compensatedSteps: [],
        failedSteps: [],
        triggeringStepIndex: null,
      },
      timestamps: {
        startedAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:03Z",
        completedAt: "2024-01-01T00:00:03Z",
      },
      metadata: { source: "test" },
    };

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      persister,
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const history = result.value;
    expect(history).toHaveLength(1);

    const summary = history[0];
    expect(summary.executionId).toBe("hist-1");
    expect(summary.sagaName).toBe("OrderSaga");
    expect(summary.status).toBe("completed");
    expect(summary.completedStepCount).toBe(3);
    expect(summary.totalSteps).toBe(3);
    expect(summary.durationMs).toBeTypeOf("number");
    expect(summary.durationMs).toBe(3000); // 3 seconds
    expect(summary.error).toBeNull();
    expect(summary.compensationState.active).toBe(false);
    expect(summary.compensationState.compensatedSteps).toEqual([]);
    expect(summary.compensationState.failedSteps).toEqual([]);
    expect(summary.metadata).toEqual({ source: "test" });
    expect(summary.startedAt).toBe("2024-01-01T00:00:00Z");
    expect(summary.completedAt).toBe("2024-01-01T00:00:03Z");
  });

  it("converts failed execution with nested error cause chain to causeTags", async () => {
    const state: SagaExecutionState = {
      executionId: "hist-2",
      sagaName: "OrderSaga",
      input: {},
      currentStep: 1,
      completedSteps: [
        {
          name: "Payment",
          index: 0,
          output: { txId: "t1" },
          skipped: false,
          completedAt: "2024-01-01T00:00:01Z",
        },
      ],
      status: "failed",
      error: {
        _tag: "PaymentDeclined",
        name: "PaymentDeclined",
        message: "Insufficient funds",
        stack: null,
        code: null,
        fields: {
          stepName: "Payment",
          stepIndex: 0,
          cause: { _tag: "InsufficientFunds", cause: { _tag: "BalanceZero" } },
        },
      },
      compensation: {
        active: true,
        compensatedSteps: ["Payment"],
        failedSteps: [],
        triggeringStepIndex: null,
      },
      timestamps: {
        startedAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:02Z",
        completedAt: null,
      },
      metadata: {},
    };

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      persister,
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const history = result.value;
    expect(history).toHaveLength(1);

    const summary = history[0];
    expect(summary.error).not.toBeNull();
    expect(summary.error?._tag).toBe("PaymentDeclined");
    expect(summary.error?.stepName).toBe("Payment");
    expect(summary.error?.causeTags).toEqual(["InsufficientFunds", "BalanceZero"]);
    expect(summary.durationMs).toBeNull(); // completedAt is null
    expect(summary.compensationState.active).toBe(true);
    expect(summary.compensationState.compensatedSteps).toEqual(["Payment"]);
  });

  it("returns ok([]) when persister is not provided", async () => {
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it("returns err when persister.list fails", async () => {
    const failingPersister: SagaPersister = {
      save: () => ResultAsync.ok(undefined),
      load: () => ResultAsync.ok(null),
      delete: () => ResultAsync.ok(undefined),
      list: () =>
        ResultAsync.err({ _tag: "StorageFailure", operation: "list", cause: new Error("fail") }),
      update: () => ResultAsync.ok(undefined),
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      persister: failingPersister,
    });

    const result = await inspector.getHistory();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StorageFailure");
    }
  });

  it("passes filters through to persister.list", async () => {
    const states: SagaExecutionState[] = [];
    let receivedFilters: unknown;
    const capturingPersister: SagaPersister = {
      save: () => ResultAsync.ok(undefined),
      load: () => ResultAsync.ok(null),
      delete: () => ResultAsync.ok(undefined),
      list: filters => {
        receivedFilters = filters;
        return ResultAsync.ok(states);
      },
      update: () => ResultAsync.ok(undefined),
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      persister: capturingPersister,
    });

    const result = await inspector.getHistory({ sagaName: "OrderSaga", limit: 10 });
    expect(result.isOk()).toBe(true);
    expect(receivedFilters).toEqual({ sagaName: "OrderSaga", limit: 10 });
  });

  it("handles execution without matching definition (totalSteps=0)", async () => {
    const state: SagaExecutionState = {
      executionId: "hist-3",
      sagaName: "UnknownSaga",
      input: {},
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
        updatedAt: "2024-01-01T00:00:01Z",
        completedAt: null,
      },
      metadata: {},
    };

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({
      definitions: [OrderSaga], // Does NOT contain "UnknownSaga"
      persister,
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0].totalSteps).toBe(0);
  });
});

// =============================================================================
// extractCauseTags edge cases (via getHistory)
// =============================================================================

describe("extractCauseTags edge cases via getHistory", () => {
  it("cause: null → empty causeTags", async () => {
    const state: SagaExecutionState = {
      executionId: "cause-1",
      sagaName: "OrderSaga",
      input: {},
      currentStep: 0,
      completedSteps: [],
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "fail",
        stack: null,
        code: null,
        fields: { stepName: "Payment", stepIndex: 0, cause: null },
      },
      compensation: {
        active: false,
        compensatedSteps: [],
        failedSteps: [],
        triggeringStepIndex: null,
      },
      timestamps: {
        startedAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:01Z",
        completedAt: null,
      },
      metadata: {},
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      persister: createMockPersister([state]),
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0].error?.causeTags).toEqual([]);
  });

  it("cause with non-string _tag → empty causeTags", async () => {
    const state: SagaExecutionState = {
      executionId: "cause-2",
      sagaName: "OrderSaga",
      input: {},
      currentStep: 0,
      completedSteps: [],
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "fail",
        stack: null,
        code: null,
        fields: { stepName: "Payment", stepIndex: 0, cause: { _tag: 42 } },
      },
      compensation: {
        active: false,
        compensatedSteps: [],
        failedSteps: [],
        triggeringStepIndex: null,
      },
      timestamps: {
        startedAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:01Z",
        completedAt: null,
      },
      metadata: {},
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      persister: createMockPersister([state]),
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0].error?.causeTags).toEqual([]);
  });

  it("cause as non-object → empty causeTags", async () => {
    const state: SagaExecutionState = {
      executionId: "cause-3",
      sagaName: "OrderSaga",
      input: {},
      currentStep: 0,
      completedSteps: [],
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "fail",
        stack: null,
        code: null,
        fields: { stepName: "Payment", stepIndex: 0, cause: "not-an-object" },
      },
      compensation: {
        active: false,
        compensatedSteps: [],
        failedSteps: [],
        triggeringStepIndex: null,
      },
      timestamps: {
        startedAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:01Z",
        completedAt: null,
      },
      metadata: {},
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      persister: createMockPersister([state]),
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0].error?.causeTags).toEqual([]);
  });

  it("cause with _tag but undefined nested cause → single tag", async () => {
    const state: SagaExecutionState = {
      executionId: "cause-4",
      sagaName: "OrderSaga",
      input: {},
      currentStep: 0,
      completedSteps: [],
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "fail",
        stack: null,
        code: null,
        fields: { stepName: "Payment", stepIndex: 0, cause: { _tag: "OnlyTag", cause: undefined } },
      },
      compensation: {
        active: false,
        compensatedSteps: [],
        failedSteps: [],
        triggeringStepIndex: null,
      },
      timestamps: {
        startedAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:01Z",
        completedAt: null,
      },
      metadata: {},
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      persister: createMockPersister([state]),
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0].error?.causeTags).toEqual(["OnlyTag"]);
  });

  it("cause: undefined → empty causeTags", async () => {
    const state: SagaExecutionState = {
      executionId: "cause-5",
      sagaName: "OrderSaga",
      input: {},
      currentStep: 0,
      completedSteps: [],
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "fail",
        stack: null,
        code: null,
        fields: { stepName: "Payment", stepIndex: 0, cause: undefined },
      },
      compensation: {
        active: false,
        compensatedSteps: [],
        failedSteps: [],
        triggeringStepIndex: null,
      },
      timestamps: {
        startedAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:01Z",
        completedAt: null,
      },
      metadata: {},
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      persister: createMockPersister([state]),
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0].error?.causeTags).toEqual([]);
  });
});

// =============================================================================
// getActiveExecutions — getCurrentStepName paths
// =============================================================================

describe("getActiveExecutions — getCurrentStepName paths", () => {
  it("running trace: first step completed → currentStepName = second step", () => {
    const traces: Record<string, ExecutionTrace> = {};
    traces["active-1"] = {
      executionId: "active-1",
      sagaName: "OrderSaga",
      input: {},
      status: "running",
      steps: [
        {
          stepName: "Payment",
          stepIndex: 0,
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
        {
          stepName: "Shipping",
          stepIndex: 1,
          status: "failed",
          startedAt: 200,
          completedAt: undefined,
          durationMs: undefined,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
      ],
      compensation: undefined,
      startedAt: 100,
      completedAt: undefined,
      totalDurationMs: undefined,
      metadata: { runId: "r1" },
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: traces,
    });

    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    expect(active[0].executionId).toBe("active-1");
    expect(active[0].sagaName).toBe("OrderSaga");
    expect(active[0].currentStepName).toBe("Shipping");
    expect(active[0].currentStepIndex).toBe(1);
    expect(active[0].completedStepCount).toBe(1);
    expect(active[0].totalSteps).toBe(3); // OrderSaga has 3 steps
    expect(active[0].compensationState.active).toBe(false);
    expect(active[0].metadata).toEqual({ runId: "r1" });
  });

  it("compensating trace: pending compensation step → currentStepName = that step", () => {
    const traces: Record<string, ExecutionTrace> = {};
    traces["active-2"] = {
      executionId: "active-2",
      sagaName: "OrderSaga",
      input: {},
      status: "compensating",
      steps: [
        {
          stepName: "Payment",
          stepIndex: 0,
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
        {
          stepName: "Shipping",
          stepIndex: 1,
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          durationMs: 100,
          attemptCount: 1,
          error: new Error("fail"),
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "Shipping",
        triggeredByIndex: 1,
        steps: [
          {
            stepName: "Payment",
            stepIndex: 0,
            status: "completed",
            startedAt: 300,
            completedAt: 350,
            durationMs: 50,
            error: undefined,
          },
          {
            stepName: "ShippingComp",
            stepIndex: 1,
            status: "failed",
            startedAt: 350,
            completedAt: 400,
            durationMs: 50,
            error: new Error("comp-fail"),
          },
        ],
        status: "failed",
        startedAt: 300,
        completedAt: 400,
        totalDurationMs: 100,
      },
      startedAt: 100,
      completedAt: undefined,
      totalDurationMs: undefined,
      metadata: undefined,
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: traces,
    });

    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    expect(active[0].compensationState.active).toBe(true);
    expect(active[0].compensationState.compensatedSteps).toEqual(["Payment"]);
    expect(active[0].compensationState.failedSteps).toEqual(["ShippingComp"]);
    expect(active[0].completedStepCount).toBe(1);
    expect(active[0].status).toBe("compensating");
  });

  it("compensating trace with pending compensation step returns its stepName", () => {
    const traces: Record<string, ExecutionTrace> = {};
    traces["active-3"] = {
      executionId: "active-3",
      sagaName: "OrderSaga",
      input: {},
      status: "compensating",
      steps: [
        {
          stepName: "Payment",
          stepIndex: 0,
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "Shipping",
        triggeredByIndex: 1,
        steps: [
          {
            stepName: "PendingComp",
            stepIndex: 0,
            status: "completed",
            startedAt: 300,
            completedAt: 350,
            durationMs: 50,
            error: undefined,
          },
        ],
        status: "completed",
        startedAt: 300,
        completedAt: 350,
        totalDurationMs: 50,
      },
      startedAt: 100,
      completedAt: undefined,
      totalDurationMs: undefined,
      metadata: undefined,
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: traces,
    });

    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    // All compensation steps are completed, so getCurrentStepName returns null
    expect(active[0].currentStepName).toBeNull();
  });

  it("running trace: all steps completed → currentStepName = null", () => {
    const traces: Record<string, ExecutionTrace> = {};
    traces["active-4"] = {
      executionId: "active-4",
      sagaName: "OrderSaga",
      input: {},
      status: "running",
      steps: [
        {
          stepName: "Payment",
          stepIndex: 0,
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
        {
          stepName: "Shipping",
          stepIndex: 1,
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          durationMs: 100,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
        {
          stepName: "Notify",
          stepIndex: 2,
          status: "completed",
          startedAt: 300,
          completedAt: 400,
          durationMs: 100,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
      ],
      compensation: undefined,
      startedAt: 100,
      completedAt: undefined,
      totalDurationMs: undefined,
      metadata: undefined,
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: traces,
    });

    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    expect(active[0].currentStepName).toBeNull();
    expect(active[0].completedStepCount).toBe(3);
  });

  it("returns empty when no activeTraces provided", () => {
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    expect(inspector.getActiveExecutions()).toHaveLength(0);
  });

  it("pending trace is included in active executions", () => {
    const traces: Record<string, ExecutionTrace> = {};
    traces["pending-1"] = {
      executionId: "pending-1",
      sagaName: "OrderSaga",
      input: {},
      status: "pending",
      steps: [],
      compensation: undefined,
      startedAt: 100,
      completedAt: undefined,
      totalDurationMs: undefined,
      metadata: undefined,
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: traces,
    });

    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    expect(active[0].status).toBe("pending");
    expect(active[0].currentStepName).toBeNull();
    expect(active[0].completedStepCount).toBe(0);
  });
});

// =============================================================================
// computeCompensationStats — multi-saga
// =============================================================================

describe("computeCompensationStats — multi-saga", () => {
  function createCompensationTrace(
    id: string,
    sagaName: string,
    compensationStatus: "completed" | "failed",
    failedCompSteps: string[],
    errorTag: string
  ): ExecutionTrace {
    return {
      executionId: id,
      sagaName,
      input: {},
      status: "failed",
      steps: [
        {
          stepName: "Payment",
          stepIndex: 0,
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: { _tag: errorTag },
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "Payment",
        triggeredByIndex: 0,
        steps: [
          ...(compensationStatus === "completed"
            ? [
                {
                  stepName: "CompStep",
                  stepIndex: 0,
                  status: "completed" as const,
                  startedAt: 200,
                  completedAt: 300,
                  durationMs: 100,
                  error: undefined,
                },
              ]
            : []),
          ...failedCompSteps.map((name, i) => ({
            stepName: name,
            stepIndex: i + 1,
            status: "failed" as const,
            startedAt: 200,
            completedAt: 300,
            durationMs: 100,
            error: new Error("comp-fail"),
          })),
        ],
        status: compensationStatus,
        startedAt: 200,
        completedAt: 300,
        totalDurationMs: 100,
      },
      startedAt: 100,
      completedAt: 300,
      totalDurationMs: 200,
      metadata: undefined,
    };
  }

  it("computes correct stats across 2 sagas with mixed results", () => {
    const traces: Record<string, ExecutionTrace> = {};

    // SagaA: 3 compensations: 2 completed, 1 failed with failed comp step
    traces["a1"] = createCompensationTrace("a1", "SagaA", "completed", [], "StepFailed");
    traces["a2"] = createCompensationTrace("a2", "SagaA", "completed", [], "TimeoutError");
    traces["a3"] = createCompensationTrace("a3", "SagaA", "failed", ["CompPayment"], "StepFailed");

    // SagaB: 1 completed compensation
    traces["b1"] = createCompensationTrace("b1", "SagaB", "completed", [], "StepFailed");

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: traces,
    });

    const stats = inspector.getCompensationStats();

    expect(stats.totalCompensations).toBe(4);
    expect(stats.successfulCompensations).toBe(3);
    expect(stats.failedCompensations).toBe(1);
    expect(stats.mostCompensatedSaga).toBe("SagaA");
    expect(stats.bySaga).toHaveLength(2);

    // Find SagaA breakdown
    const sagaA = stats.bySaga.find(b => b.sagaName === "SagaA");
    expect(sagaA).toBeDefined();
    expect(sagaA?.totalCompensations).toBe(3);
    expect(sagaA?.successRate).toBeCloseTo(2 / 3);
    expect(sagaA?.mostFailedStep).toBe("CompPayment");
    // traceToExecutionState always sets error._tag = "StepFailed"
    // so all 3 SagaA compensations count as "StepFailed"
    expect(sagaA?.errorTagDistribution["StepFailed"]).toBe(3);

    // Find SagaB breakdown
    const sagaB = stats.bySaga.find(b => b.sagaName === "SagaB");
    expect(sagaB).toBeDefined();
    expect(sagaB?.totalCompensations).toBe(1);
    expect(sagaB?.successRate).toBe(1);
    expect(sagaB?.mostFailedStep).toBeNull();
  });

  it("returns zero stats when no activeTraces provided", () => {
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(0);
    expect(stats.successfulCompensations).toBe(0);
    expect(stats.failedCompensations).toBe(0);
    expect(stats.mostCompensatedSaga).toBeNull();
    expect(stats.bySaga).toEqual([]);
  });

  it("traces without compensation are excluded from stats", () => {
    const traces: Record<string, ExecutionTrace> = {};
    traces["no-comp"] = {
      executionId: "no-comp",
      sagaName: "OrderSaga",
      input: {},
      status: "completed",
      steps: [
        {
          stepName: "Payment",
          stepIndex: 0,
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
      ],
      compensation: undefined,
      startedAt: 100,
      completedAt: 200,
      totalDurationMs: 100,
      metadata: undefined,
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: traces,
    });

    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(0);
  });
});

// =============================================================================
// traceToExecutionState coverage (via getCompensationStats)
// =============================================================================

describe("traceToExecutionState coverage via getCompensationStats", () => {
  it("trace with failed step constructs error field in converted state", () => {
    const traces: Record<string, ExecutionTrace> = {};
    traces["conv-1"] = {
      executionId: "conv-1",
      sagaName: "OrderSaga",
      input: { orderId: "o1" },
      status: "failed",
      steps: [
        {
          stepName: "Payment",
          stepIndex: 0,
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: new Error("payment-error"),
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "Payment",
        triggeredByIndex: 0,
        steps: [
          {
            stepName: "CompStep",
            stepIndex: 0,
            status: "completed",
            startedAt: 200,
            completedAt: 300,
            durationMs: 100,
            error: undefined,
          },
        ],
        status: "completed",
        startedAt: 200,
        completedAt: 300,
        totalDurationMs: 100,
      },
      startedAt: 100,
      completedAt: 300,
      totalDurationMs: 200,
      metadata: { key: "val" },
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: traces,
    });

    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(1);
    expect(stats.successfulCompensations).toBe(1);
  });

  it("trace without compensation maps to none status", () => {
    const traces: Record<string, ExecutionTrace> = {};
    traces["conv-2"] = {
      executionId: "conv-2",
      sagaName: "OrderSaga",
      input: {},
      status: "completed",
      steps: [
        {
          stepName: "Payment",
          stepIndex: 0,
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
      ],
      compensation: undefined,
      startedAt: 100,
      completedAt: 200,
      totalDurationMs: 100,
      metadata: undefined,
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: traces,
    });

    // No compensation → not included in stats
    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(0);
  });

  it("trace with no failed steps but compensation present gets counted", () => {
    const traces: Record<string, ExecutionTrace> = {};
    traces["conv-3"] = {
      executionId: "conv-3",
      sagaName: "OrderSaga",
      input: {},
      status: "failed",
      steps: [
        {
          stepName: "Payment",
          stepIndex: 0,
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: undefined,
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "Shipping",
        triggeredByIndex: 1,
        steps: [
          {
            stepName: "Payment",
            stepIndex: 0,
            status: "completed",
            startedAt: 200,
            completedAt: 300,
            durationMs: 100,
            error: undefined,
          },
        ],
        status: "completed",
        startedAt: 200,
        completedAt: 300,
        totalDurationMs: 100,
      },
      startedAt: 100,
      completedAt: 300,
      totalDurationMs: 200,
      metadata: undefined,
    };

    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: traces,
    });

    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(1);
    expect(stats.successfulCompensations).toBe(1);
  });
});

// =============================================================================
// getTrace
// =============================================================================

describe("getTrace edge cases", () => {
  it("returns null when activeTraces not provided", () => {
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    expect(inspector.getTrace("any-id")).toBeNull();
  });

  it("returns null for nonexistent execution in activeTraces", () => {
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
      activeTraces: {},
    });

    expect(inspector.getTrace("nonexistent")).toBeNull();
  });
});

// =============================================================================
// subscribe
// =============================================================================

describe("subscribe edge cases", () => {
  it("subscribe returns unsubscribe that removes listener", () => {
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const unsub = inspector.subscribe(() => {});
    expect(typeof unsub).toBe("function");

    // Call unsubscribe
    unsub();

    // Calling again should not throw
    unsub();
  });

  it("multiple subscribers can be added and removed independently", () => {
    const inspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const unsub1 = inspector.subscribe(() => {});
    const unsub2 = inspector.subscribe(() => {});

    unsub1();
    // unsub2 is still active, unsub1 is gone
    unsub2();
  });
});
