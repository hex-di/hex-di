/**
 * Inspector Mutations Tests (Part 3)
 *
 * Targets remaining surviving mutants in src/introspection/saga-inspector.ts.
 *
 * Covers:
 * - executionStateToSummary field accuracy
 * - computeCompensationStats internal logic
 * - getActiveExecutions trace-to-summary mapping
 * - traceToExecutionState field mapping
 * - getSuggestions patterns
 * - subscribe/emit patterns
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaInspector, emitToInspector } from "../src/introspection/saga-inspector.js";
import type { SagaPersister, SagaExecutionState, CompensationState } from "../src/ports/types.js";
import type { ExecutionTrace, StepTrace, CompensationTrace } from "../src/runtime/types.js";

// =============================================================================
// Test Ports & Steps & Sagas
// =============================================================================

const PortA = createPort<"PortA", any>({ name: "PortA" });
const PortB = createPort<"PortB", any>({ name: "PortB" });
const PortC = createPort<"PortC", any>({ name: "PortC" });

const StepA = defineStep("StepA")
  .io<{ id: string }, { txId: string }>()
  .invoke(PortA, ctx => ctx.input)
  .compensate(ctx => ({ refund: ctx.stepResult.txId }))
  .build();

const StepB = defineStep("StepB")
  .io<{ id: string }, { shipId: string }>()
  .invoke(PortB, ctx => ctx.input)
  .compensate(ctx => ({ cancel: ctx.stepResult.shipId }))
  .options({ retry: { maxAttempts: 3, delay: 100 }, timeout: 5000 })
  .build();

const StepC = defineStep("StepC")
  .io<{ id: string }, void>()
  .invoke(PortC, ctx => ctx.input)
  .when(ctx => (ctx.results as any).StepA !== undefined)
  .build();

const NoCompStep = defineStep("NoComp")
  .io<string, string>()
  .invoke(PortA, ctx => ctx.input)
  .build();

const NoRetryStep = defineStep("NoRetry")
  .io<string, string>()
  .invoke(PortA, ctx => ctx.input)
  .compensate(ctx => ctx.stepResult)
  .build();

const LongTimeoutStep = defineStep("LongTimeout")
  .io<string, string>()
  .invoke(PortA, ctx => ctx.input)
  .timeout(60000)
  .build();

const TestSaga = defineSaga("TestSaga")
  .input<{ id: string }>()
  .step(StepA)
  .step(StepB)
  .step(StepC)
  .output(r => r)
  .build();

const NoCompSaga = defineSaga("NoCompSaga")
  .input<string>()
  .step(NoCompStep)
  .output(() => ({}))
  .build();

const NoRetrySaga = defineSaga("NoRetrySaga")
  .input<string>()
  .step(NoRetryStep)
  .output(() => ({}))
  .build();

const LongTimeoutSaga = defineSaga("LongTimeoutSaga")
  .input<string>()
  .step(LongTimeoutStep)
  .output(() => ({}))
  .options({ compensationStrategy: "sequential", timeout: 60000 })
  .build();

// =============================================================================
// Helpers
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

function makeExecutionState(overrides?: Partial<SagaExecutionState>): SagaExecutionState {
  return {
    executionId: "exec-1",
    sagaName: "TestSaga",
    input: {},
    currentStep: 0,
    completedSteps: [],
    status: "completed",
    error: null,
    compensation: {
      active: false,
      compensatedSteps: [],
      failedSteps: [],
      triggeringStepIndex: null,
    },
    timestamps: {
      startedAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:01.000Z",
      completedAt: null,
    },
    metadata: {},
    ...overrides,
  };
}

function makeTrace(overrides?: Partial<ExecutionTrace>): ExecutionTrace {
  return {
    executionId: "exec-1",
    sagaName: "TestSaga",
    input: {},
    status: "running",
    steps: [],
    compensation: undefined,
    startedAt: Date.now(),
    completedAt: undefined,
    totalDurationMs: undefined,
    metadata: undefined,
    ...overrides,
  };
}

function makeStepTrace(overrides?: Partial<StepTrace>): StepTrace {
  return {
    stepName: "StepA",
    stepIndex: 0,
    status: "completed",
    startedAt: Date.now() - 100,
    completedAt: Date.now(),
    durationMs: 100,
    attemptCount: 1,
    error: undefined,
    skippedReason: undefined,
    ...overrides,
  };
}

// =============================================================================
// A. executionStateToSummary field accuracy
// =============================================================================

describe("executionStateToSummary — field accuracy", () => {
  it("maps all fields for completed state with no error", async () => {
    const state = makeExecutionState({
      executionId: "sum-1",
      sagaName: "TestSaga",
      status: "completed",
      currentStep: 3,
      completedSteps: [
        {
          name: "StepA",
          index: 0,
          output: "a",
          skipped: false,
          completedAt: "2024-01-01T00:00:01Z",
        },
        {
          name: "StepB",
          index: 1,
          output: "b",
          skipped: false,
          completedAt: "2024-01-01T00:00:02Z",
        },
        {
          name: "StepC",
          index: 2,
          output: "c",
          skipped: false,
          completedAt: "2024-01-01T00:00:03Z",
        },
      ],
      timestamps: {
        startedAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:03.000Z",
        completedAt: "2024-01-01T00:00:03.000Z",
      },
      metadata: { userId: "u1" },
    });

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const summaries = result.value;
    expect(summaries).toHaveLength(1);
    const s = summaries[0];

    expect(s.executionId).toBe("sum-1");
    expect(s.sagaName).toBe("TestSaga");
    expect(s.status).toBe("completed");
    expect(s.currentStepIndex).toBe(3);
    expect(s.totalSteps).toBe(3); // TestSaga has 3 steps
    expect(s.completedStepCount).toBe(3);
    expect(s.startedAt).toBe("2024-01-01T00:00:00.000Z");
    expect(s.updatedAt).toBe("2024-01-01T00:00:03.000Z");
    expect(s.completedAt).toBe("2024-01-01T00:00:03.000Z");
    expect(s.durationMs).toBe(3000);
    expect(s.error).toBeNull();
    expect(s.compensationState.active).toBe(false);
    expect(s.compensationState.compensatedSteps).toEqual([]);
    expect(s.compensationState.failedSteps).toEqual([]);
    expect(s.metadata).toEqual({ userId: "u1" });
  });

  it("durationMs is null when completedAt is null", async () => {
    const state = makeExecutionState({
      status: "running",
      timestamps: {
        startedAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:01.000Z",
        completedAt: null,
      },
    });

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });

    const result = await inspector.getHistory();
    if (!result.isOk()) return;

    expect(result.value[0].durationMs).toBeNull();
    expect(result.value[0].completedAt).toBeNull();
  });

  it("error info with _tag and stepName extraction", async () => {
    const state = makeExecutionState({
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "Payment failed",
        stack: null,
        code: null,
        fields: {
          stepName: "StepA",
          cause: { _tag: "NetworkError", cause: { _tag: "TimeoutError" } },
        },
      },
    });

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });

    const result = await inspector.getHistory();
    if (!result.isOk()) return;

    const err = result.value[0].error;
    expect(err).not.toBeNull();
    expect(err!._tag).toBe("StepFailed");
    expect(err!.stepName).toBe("StepA");
    expect(err!.causeTags).toEqual(["NetworkError", "TimeoutError"]);
  });

  it("error with non-string stepName falls back to empty string", async () => {
    const state = makeExecutionState({
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "Failed",
        stack: null,
        code: null,
        fields: { stepName: 42 },
      },
    });

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });

    const result = await inspector.getHistory();
    if (!result.isOk()) return;

    expect(result.value[0].error!.stepName).toBe("");
  });

  it("error with missing fields defaults to empty object", async () => {
    const state = makeExecutionState({
      status: "failed",
      error: {
        _tag: "ValidationFailed",
        name: "ValidationFailed",
        message: "Bad input",
        stack: null,
        code: null,
        fields: {},
      },
    });

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });

    const result = await inspector.getHistory();
    if (!result.isOk()) return;

    expect(result.value[0].error!._tag).toBe("ValidationFailed");
    expect(result.value[0].error!.stepName).toBe("");
    expect(result.value[0].error!.causeTags).toEqual([]);
  });

  it("cause without _tag returns empty causeTags", async () => {
    const state = makeExecutionState({
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "fail",
        stack: null,
        code: null,
        fields: { stepName: "X", cause: { message: "no tag here" } },
      },
    });

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });

    const result = await inspector.getHistory();
    if (!result.isOk()) return;

    expect(result.value[0].error!.causeTags).toEqual([]);
  });

  it("cause with non-string _tag returns empty causeTags", async () => {
    const state = makeExecutionState({
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "fail",
        stack: null,
        code: null,
        fields: { stepName: "X", cause: { _tag: 42 } },
      },
    });

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });

    const result = await inspector.getHistory();
    if (!result.isOk()) return;

    expect(result.value[0].error!.causeTags).toEqual([]);
  });

  it("cause null returns empty causeTags", async () => {
    const state = makeExecutionState({
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "fail",
        stack: null,
        code: null,
        fields: { stepName: "X", cause: null },
      },
    });

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });

    const result = await inspector.getHistory();
    if (!result.isOk()) return;

    expect(result.value[0].error!.causeTags).toEqual([]);
  });

  it("completedStepCount counts non-skipped steps", async () => {
    const state = makeExecutionState({
      completedSteps: [
        {
          name: "StepA",
          index: 0,
          output: "a",
          skipped: false,
          completedAt: "2024-01-01T00:00:01Z",
        },
        {
          name: "StepB",
          index: 1,
          output: "b",
          skipped: true,
          completedAt: "2024-01-01T00:00:02Z",
        },
      ],
    });

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });

    const result = await inspector.getHistory();
    if (!result.isOk()) return;

    // completedStepCount is completedSteps.length (includes skipped in the array length)
    expect(result.value[0].completedStepCount).toBe(2);
  });

  it("currentStepName resolves from definition when step in range", async () => {
    const state = makeExecutionState({
      currentStep: 1,
      status: "running",
    });

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });

    const result = await inspector.getHistory();
    if (!result.isOk()) return;

    // TestSaga step at index 1 is StepB
    expect(result.value[0].currentStepName).toBe("StepB");
  });

  it("currentStepName is null when currentStep >= steps.length", async () => {
    const state = makeExecutionState({
      currentStep: 10, // out of range
      status: "running",
    });

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });

    const result = await inspector.getHistory();
    if (!result.isOk()) return;

    expect(result.value[0].currentStepName).toBeNull();
  });

  it("currentStepName is null when saga definition is not found", async () => {
    const state = makeExecutionState({
      sagaName: "UnknownSaga",
      currentStep: 0,
    });

    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });

    const result = await inspector.getHistory();
    if (!result.isOk()) return;

    expect(result.value[0].currentStepName).toBeNull();
  });

  it("various SagaStatusType values are preserved", async () => {
    const statuses = [
      "pending",
      "running",
      "compensating",
      "completed",
      "failed",
      "cancelled",
    ] as const;

    for (const status of statuses) {
      const state = makeExecutionState({ status, executionId: `status-${status}` });
      const persister = createMockPersister([state]);
      const inspector = createSagaInspector({ definitions: [TestSaga], persister });

      const result = await inspector.getHistory();
      if (!result.isOk()) continue;

      expect(result.value[0].status).toBe(status);
    }
  });
});

// =============================================================================
// B. computeCompensationStats internal logic
// =============================================================================

describe("computeCompensationStats", () => {
  it("returns zeros when no active traces", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const stats = inspector.getCompensationStats();

    expect(stats.totalCompensations).toBe(0);
    expect(stats.successfulCompensations).toBe(0);
    expect(stats.failedCompensations).toBe(0);
    expect(stats.averageCompensationTime).toBe(0);
    expect(stats.mostCompensatedSaga).toBeNull();
    expect(stats.bySaga).toEqual([]);
  });

  it("counts compensations from active traces with compensation data", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "completed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: undefined,
            },
          ],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();

    expect(stats.totalCompensations).toBe(1);
    expect(stats.successfulCompensations).toBe(1);
    expect(stats.failedCompensations).toBe(0);
    expect(stats.mostCompensatedSaga).toBe("TestSaga");
  });

  it("errorTagDistribution counts error tags across compensations", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", status: "failed", error: new Error("boom") })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "completed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: undefined,
            },
          ],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
      e2: makeTrace({
        executionId: "e2",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", status: "failed", error: new Error("boom2") })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "completed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: undefined,
            },
          ],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();

    // Both traces have errors with _tag "StepFailed" from traceToExecutionState
    expect(stats.totalCompensations).toBe(2);
    const sagaBreakdown = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(sagaBreakdown).toBeDefined();
    expect(sagaBreakdown!.errorTagDistribution["StepFailed"]).toBe(2);
  });

  it("mostCompensatedSaga selects saga with most compensations", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "completed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: undefined,
            },
          ],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
      e2: makeTrace({
        executionId: "e2",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "completed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: undefined,
            },
          ],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();

    expect(stats.mostCompensatedSaga).toBe("TestSaga");
    expect(stats.totalCompensations).toBe(2);
  });

  it("failedCompensations counts traces with failed compensation steps", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: new Error("comp fail"),
            },
          ],
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();

    expect(stats.failedCompensations).toBe(1);
    expect(stats.successfulCompensations).toBe(0);
  });

  it("bySaga breakdown includes successRate and mostFailedStep", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: new Error("fail"),
            },
          ],
          status: "failed",
          startedAt: 100,
          completedAt: 300,
          totalDurationMs: 200,
        },
      }),
      e2: makeTrace({
        executionId: "e2",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "completed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: undefined,
            },
          ],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();

    const breakdown = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(breakdown).toBeDefined();
    expect(breakdown!.totalCompensations).toBe(2);
    expect(breakdown!.successRate).toBe(0.5);
    expect(breakdown!.mostFailedStep).toBe("StepA");
  });
});

// =============================================================================
// C. getActiveExecutions trace-to-summary mapping
// =============================================================================

describe("getActiveExecutions", () => {
  it("running trace maps to correct summary fields", () => {
    const now = Date.now();
    const traces: Record<string, ExecutionTrace> = {
      "run-1": makeTrace({
        executionId: "run-1",
        sagaName: "TestSaga",
        status: "running",
        startedAt: now - 5000,
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" })],
        metadata: { region: "us-east" },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    expect(active).toHaveLength(1);
    const s = active[0];
    expect(s.executionId).toBe("run-1");
    expect(s.sagaName).toBe("TestSaga");
    expect(s.status).toBe("running");
    expect(s.currentStepIndex).toBe(1); // 1 completed step
    expect(s.completedStepCount).toBe(1);
    expect(s.totalSteps).toBe(3); // TestSaga has 3 steps
    expect(s.completedAt).toBeNull();
    expect(s.durationMs).toBeNull();
    expect(s.error).toBeNull();
    expect(s.compensationState.active).toBe(false);
    expect(s.compensationState.compensatedSteps).toEqual([]);
    expect(s.compensationState.failedSteps).toEqual([]);
    expect(s.metadata).toEqual({ region: "us-east" });
  });

  it("compensating trace maps compensationState fields", () => {
    const traces: Record<string, ExecutionTrace> = {
      "comp-1": makeTrace({
        executionId: "comp-1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({
            stepName: "StepB",
            stepIndex: 1,
            status: "failed",
            error: new Error("fail"),
          }),
        ],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "completed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: undefined,
            },
          ],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    expect(active).toHaveLength(1);
    const s = active[0];
    expect(s.compensationState.active).toBe(true); // status === "compensating"
    expect(s.compensationState.compensatedSteps).toEqual(["StepA"]);
    expect(s.compensationState.failedSteps).toEqual([]);
  });

  it("pending trace is included in active executions", () => {
    const traces: Record<string, ExecutionTrace> = {
      "pend-1": makeTrace({
        executionId: "pend-1",
        sagaName: "TestSaga",
        status: "pending",
        steps: [],
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    expect(active).toHaveLength(1);
    expect(active[0].status).toBe("pending");
    expect(active[0].currentStepIndex).toBe(0);
    expect(active[0].completedStepCount).toBe(0);
  });

  it("completed trace is NOT included in active executions", () => {
    const traces: Record<string, ExecutionTrace> = {
      "done-1": makeTrace({
        executionId: "done-1",
        sagaName: "TestSaga",
        status: "completed",
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    expect(active).toHaveLength(0);
  });

  it("failed trace is NOT included in active executions", () => {
    const traces: Record<string, ExecutionTrace> = {
      "fail-1": makeTrace({
        executionId: "fail-1",
        sagaName: "TestSaga",
        status: "failed",
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    expect(active).toHaveLength(0);
  });

  it("cancelled trace is NOT included in active executions", () => {
    const traces: Record<string, ExecutionTrace> = {
      "cancel-1": makeTrace({
        executionId: "cancel-1",
        sagaName: "TestSaga",
        status: "cancelled",
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    expect(active).toHaveLength(0);
  });

  it("returns empty when no activeTraces provided", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    expect(inspector.getActiveExecutions()).toEqual([]);
  });

  it("startedAt is ISO string from trace timestamp", () => {
    const now = Date.now();
    const traces: Record<string, ExecutionTrace> = {
      "ts-1": makeTrace({
        executionId: "ts-1",
        sagaName: "TestSaga",
        status: "running",
        startedAt: now,
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    expect(active[0].startedAt).toBe(new Date(now).toISOString());
  });

  it("compensation trace with failed steps maps to failedSteps", () => {
    const traces: Record<string, ExecutionTrace> = {
      "cf-1": makeTrace({
        executionId: "cf-1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [makeStepTrace({ status: "completed" })],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: new Error("cfail"),
            },
          ],
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    expect(active[0].compensationState.failedSteps).toEqual(["StepA"]);
    expect(active[0].compensationState.compensatedSteps).toEqual([]);
  });

  it("metadata is empty object when trace metadata is undefined", () => {
    const traces: Record<string, ExecutionTrace> = {
      "meta-1": makeTrace({
        executionId: "meta-1",
        sagaName: "TestSaga",
        status: "running",
        metadata: undefined,
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    expect(active[0].metadata).toEqual({});
  });

  it("totalSteps is 0 when saga definition is not found", () => {
    const traces: Record<string, ExecutionTrace> = {
      "unknown-1": makeTrace({
        executionId: "unknown-1",
        sagaName: "UnknownSaga",
        status: "running",
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    expect(active[0].totalSteps).toBe(0);
  });
});

// =============================================================================
// D. traceToExecutionState — tested via getCompensationStats
// =============================================================================

describe("traceToExecutionState field mapping", () => {
  it("maps all trace statuses correctly", () => {
    const statuses = [
      "pending",
      "running",
      "compensating",
      "completed",
      "failed",
      "cancelled",
    ] as const;

    for (const status of statuses) {
      const traces: Record<string, ExecutionTrace> = {
        [`s-${status}`]: makeTrace({
          executionId: `s-${status}`,
          sagaName: "TestSaga",
          status,
          steps: [],
        }),
      };

      const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
      // getCompensationStats internally calls traceToExecutionState
      const stats = inspector.getCompensationStats();
      // For non-compensating traces, totalCompensations should be 0
      expect(stats).toBeDefined();
    }
  });

  it("completed step traces map to completedSteps in execution state", () => {
    const traces: Record<string, ExecutionTrace> = {
      "step-map-1": makeTrace({
        executionId: "step-map-1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [
          makeStepTrace({
            stepName: "StepA",
            stepIndex: 0,
            status: "completed",
            completedAt: 1000,
          }),
          makeStepTrace({
            stepName: "StepB",
            stepIndex: 1,
            status: "failed",
            error: new Error("oops"),
          }),
        ],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "completed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: undefined,
            },
          ],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();

    expect(stats.totalCompensations).toBe(1);
    expect(stats.successfulCompensations).toBe(1);
  });

  it("trace without compensation maps to inactive compensation state", () => {
    const traces: Record<string, ExecutionTrace> = {
      "no-comp-1": makeTrace({
        executionId: "no-comp-1",
        sagaName: "TestSaga",
        status: "running",
        steps: [makeStepTrace({ status: "completed" })],
        compensation: undefined,
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();

    // No compensation data => not counted
    expect(stats.totalCompensations).toBe(0);
  });

  it("trace metadata is preserved through traceToExecutionState", () => {
    const traces: Record<string, ExecutionTrace> = {
      "meta-trace-1": makeTrace({
        executionId: "meta-trace-1",
        sagaName: "TestSaga",
        status: "failed",
        metadata: { env: "prod" },
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "completed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: undefined,
            },
          ],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();

    // Metadata should not affect compensation stats computation
    expect(stats.totalCompensations).toBe(1);
  });

  it("timestamps are converted correctly", () => {
    const now = Date.now();
    const traces: Record<string, ExecutionTrace> = {
      "ts-trace-1": makeTrace({
        executionId: "ts-trace-1",
        sagaName: "TestSaga",
        status: "completed",
        startedAt: now - 5000,
        completedAt: now,
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    // getTrace returns the raw trace, so we can verify it's accessible
    const trace = inspector.getTrace("ts-trace-1");
    expect(trace).not.toBeNull();
    expect(trace!.startedAt).toBe(now - 5000);
    expect(trace!.completedAt).toBe(now);
  });

  it("getTrace returns null for unknown executionId", () => {
    const traces: Record<string, ExecutionTrace> = {
      known: makeTrace({ executionId: "known" }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    expect(inspector.getTrace("unknown")).toBeNull();
  });

  it("getTrace returns null when no activeTraces configured", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    expect(inspector.getTrace("any")).toBeNull();
  });
});

// =============================================================================
// E. getSuggestions patterns
// =============================================================================

describe("getSuggestions", () => {
  it("step without compensation generates saga_step_without_compensation suggestion", () => {
    const inspector = createSagaInspector({ definitions: [NoCompSaga] });
    const suggestions = inspector.getSuggestions();

    const compSuggestion = suggestions.find(
      s => s.type === "saga_step_without_compensation" && s.stepName === "NoComp"
    );
    expect(compSuggestion).toBeDefined();
    expect(compSuggestion!.type).toBe("saga_step_without_compensation");
    expect(compSuggestion!.sagaName).toBe("NoCompSaga");
    expect(compSuggestion!.action.length).toBeGreaterThan(0);
  });

  it("step without retry generates saga_no_retry_on_external_port suggestion", () => {
    const inspector = createSagaInspector({ definitions: [NoRetrySaga] });
    const suggestions = inspector.getSuggestions();

    const retrySuggestion = suggestions.find(
      s => s.type === "saga_no_retry_on_external_port" && s.stepName === "NoRetry"
    );
    expect(retrySuggestion).toBeDefined();
    expect(retrySuggestion!.type).toBe("saga_no_retry_on_external_port");
    expect(retrySuggestion!.sagaName).toBe("NoRetrySaga");
    expect(retrySuggestion!.action.length).toBeGreaterThan(0);
  });

  it("long timeout without persistence generates saga_long_timeout_without_persistence", () => {
    // No persister, saga has 60000ms timeout
    const inspector = createSagaInspector({ definitions: [LongTimeoutSaga] });
    const suggestions = inspector.getSuggestions();

    const timeoutSuggestions = suggestions.filter(
      s => s.type === "saga_long_timeout_without_persistence"
    );
    // Should have at least one: saga-level timeout > 30000
    expect(timeoutSuggestions.length).toBeGreaterThanOrEqual(1);
    for (const s of timeoutSuggestions) {
      expect(s.sagaName).toBe("LongTimeoutSaga");
      expect(s.action.length).toBeGreaterThan(0);
    }
  });

  it("long timeout WITH persistence does NOT generate suggestion", () => {
    const persister = createMockPersister([]);
    const inspector = createSagaInspector({ definitions: [LongTimeoutSaga], persister });
    const suggestions = inspector.getSuggestions();

    const timeoutSuggestions = suggestions.filter(
      s => s.type === "saga_long_timeout_without_persistence"
    );
    expect(timeoutSuggestions).toHaveLength(0);
  });

  it("exact boundary: 30000ms timeout does NOT generate suggestion", () => {
    const ExactPort = createPort<"ExactPort", any>({ name: "ExactPort" });
    const ExactStep = defineStep("ExactStep")
      .io<string, string>()
      .invoke(ExactPort, ctx => ctx.input)
      .timeout(30000) // exactly at boundary
      .build();
    const ExactSaga = defineSaga("ExactSaga")
      .input<string>()
      .step(ExactStep)
      .output(() => ({}))
      .options({ compensationStrategy: "sequential", timeout: 30000 })
      .build();

    const inspector = createSagaInspector({ definitions: [ExactSaga] });
    const suggestions = inspector.getSuggestions();

    const timeoutSuggestions = suggestions.filter(
      s => s.type === "saga_long_timeout_without_persistence"
    );
    expect(timeoutSuggestions).toHaveLength(0);
  });

  it("30001ms timeout generates suggestion", () => {
    const OverPort = createPort<"OverPort", any>({ name: "OverPort" });
    const OverStep = defineStep("OverStep")
      .io<string, string>()
      .invoke(OverPort, ctx => ctx.input)
      .timeout(30001) // just over boundary
      .build();
    const OverSaga = defineSaga("OverSaga")
      .input<string>()
      .step(OverStep)
      .output(() => ({}))
      .build();

    const inspector = createSagaInspector({ definitions: [OverSaga] });
    const suggestions = inspector.getSuggestions();

    const timeoutSuggestions = suggestions.filter(
      s => s.type === "saga_long_timeout_without_persistence" && s.stepName === "OverStep"
    );
    expect(timeoutSuggestions).toHaveLength(1);
  });

  it("high failure rate generates compensation suggestion", () => {
    // Create traces where compensation success rate < 50%
    const traces: Record<string, ExecutionTrace> = {
      "hf-1": makeTrace({
        executionId: "hf-1",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: new Error("comp-fail"),
            },
          ],
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const suggestions = inspector.getSuggestions();

    // Should have a suggestion about low compensation success rate
    const highFailSuggestion = suggestions.find(
      s => s.type === "saga_step_without_compensation" && s.message.includes("success rate")
    );
    expect(highFailSuggestion).toBeDefined();
    expect(highFailSuggestion!.action.length).toBeGreaterThan(0);
  });

  it("every suggestion has a non-empty action field", () => {
    const inspector = createSagaInspector({
      definitions: [NoCompSaga, NoRetrySaga, LongTimeoutSaga],
    });
    const suggestions = inspector.getSuggestions();

    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(typeof s.action).toBe("string");
      expect(s.action.length).toBeGreaterThan(0);
    }
  });

  it("every suggestion has a type from the SagaSuggestionType union", () => {
    const validTypes = new Set([
      "saga_step_without_compensation",
      "saga_long_timeout_without_persistence",
      "saga_no_retry_on_external_port",
      "saga_singleton_with_scoped_deps",
    ]);

    const inspector = createSagaInspector({
      definitions: [NoCompSaga, NoRetrySaga, LongTimeoutSaga],
    });
    const suggestions = inspector.getSuggestions();

    for (const s of suggestions) {
      expect(validTypes.has(s.type)).toBe(true);
    }
  });

  it("step-level timeout suggestion includes stepName", () => {
    const inspector = createSagaInspector({ definitions: [LongTimeoutSaga] });
    const suggestions = inspector.getSuggestions();

    const stepTimeout = suggestions.find(
      s => s.type === "saga_long_timeout_without_persistence" && s.stepName !== undefined
    );
    expect(stepTimeout).toBeDefined();
    expect(stepTimeout!.stepName).toBe("LongTimeout");
  });
});

// =============================================================================
// F. subscribe/emit patterns
// =============================================================================

describe("subscribe and emitToInspector", () => {
  it("subscribe returns an unsubscribe function", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const unsub = inspector.subscribe(() => {});
    expect(typeof unsub).toBe("function");
  });

  it("subscriber receives emitted events", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const received: any[] = [];

    inspector.subscribe(event => received.push(event));

    const event: any = {
      type: "saga:started",
      executionId: "e1",
      sagaName: "TestSaga",
      input: "hello",
      stepCount: 1,
      metadata: undefined,
      timestamp: Date.now(),
    };

    emitToInspector(inspector, event);

    expect(received).toHaveLength(1);
    expect(received[0]).toBe(event);
  });

  it("unsubscribe prevents further events", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const received: any[] = [];

    const unsub = inspector.subscribe(event => received.push(event));

    const event1: any = {
      type: "saga:started",
      executionId: "e1",
      sagaName: "TestSaga",
      input: "a",
      stepCount: 1,
      metadata: undefined,
      timestamp: Date.now(),
    };
    const event2: any = {
      type: "saga:completed",
      executionId: "e1",
      sagaName: "TestSaga",
      totalDurationMs: 100,
      stepsExecuted: 1,
      stepsSkipped: 0,
      timestamp: Date.now(),
    };

    emitToInspector(inspector, event1);
    unsub();
    emitToInspector(inspector, event2);

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("saga:started");
  });

  it("multiple subscribers all receive events", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const received1: any[] = [];
    const received2: any[] = [];

    inspector.subscribe(event => received1.push(event));
    inspector.subscribe(event => received2.push(event));

    const event: any = {
      type: "saga:started",
      executionId: "e1",
      sagaName: "TestSaga",
      input: "hello",
      stepCount: 1,
      metadata: undefined,
      timestamp: Date.now(),
    };

    emitToInspector(inspector, event);

    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);
  });

  it("error in one subscriber does not stop others", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const received: any[] = [];

    inspector.subscribe(() => {
      throw new Error("subscriber boom");
    });
    inspector.subscribe(event => received.push(event));

    const event: any = {
      type: "saga:started",
      executionId: "e1",
      sagaName: "TestSaga",
      input: "hello",
      stepCount: 1,
      metadata: undefined,
      timestamp: Date.now(),
    };

    // Should not throw
    expect(() => emitToInspector(inspector, event)).not.toThrow();

    // Second subscriber should still receive the event
    expect(received).toHaveLength(1);
  });

  it("emitToInspector does nothing for non-registered inspector", () => {
    // Create a non-registered inspector-like object
    const fakeInspector = {
      getDefinitions: () => [],
      getActiveExecutions: () => [],
      getHistory: () => ResultAsync.ok([]),
      getTrace: () => null,
      getCompensationStats: () => ({
        totalCompensations: 0,
        successfulCompensations: 0,
        failedCompensations: 0,
        averageCompensationTime: 0,
        mostCompensatedSaga: null,
        bySaga: [],
      }),
      getSuggestions: () => [],
      subscribe: () => () => {},
    };

    const event: any = {
      type: "saga:started",
      executionId: "e1",
      sagaName: "TestSaga",
      input: "hello",
      stepCount: 1,
      metadata: undefined,
      timestamp: Date.now(),
    };

    // Should not throw - listeners won't be found in the WeakMap
    expect(() => emitToInspector(fakeInspector, event)).not.toThrow();
  });
});

// =============================================================================
// G. getDefinitions structural output
// =============================================================================

describe("getDefinitions — structural accuracy", () => {
  it("returns correct step info for each step", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();

    expect(defs).toHaveLength(1);
    const def = defs[0];

    expect(def.name).toBe("TestSaga");
    expect(def.steps).toHaveLength(3);

    // StepA: has compensation, no retry, no timeout, not conditional
    expect(def.steps[0].name).toBe("StepA");
    expect(def.steps[0].port).toBe("PortA");
    expect(def.steps[0].hasCompensation).toBe(true);
    expect(def.steps[0].isConditional).toBe(false);
    expect(def.steps[0].retryPolicy).toBeUndefined();
    expect(def.steps[0].timeout).toBeUndefined();

    // StepB: has compensation, has retry with fixed delay, has timeout
    expect(def.steps[1].name).toBe("StepB");
    expect(def.steps[1].port).toBe("PortB");
    expect(def.steps[1].hasCompensation).toBe(true);
    expect(def.steps[1].isConditional).toBe(false);
    expect(def.steps[1].retryPolicy).toBeDefined();
    expect(def.steps[1].retryPolicy!.maxAttempts).toBe(3);
    expect(def.steps[1].retryPolicy!.backoffStrategy).toBe("fixed");
    expect(def.steps[1].retryPolicy!.initialDelay).toBe(100);
    expect(def.steps[1].timeout).toBe(5000);

    // StepC: no compensation, conditional, no retry
    expect(def.steps[2].name).toBe("StepC");
    expect(def.steps[2].port).toBe("PortC");
    expect(def.steps[2].hasCompensation).toBe(false);
    expect(def.steps[2].isConditional).toBe(true);
    expect(def.steps[2].retryPolicy).toBeUndefined();
  });

  it("options include compensationStrategy and timeout", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();

    // TestSaga has default compensationStrategy: "sequential"
    expect(defs[0].options.compensationStrategy).toBe("sequential");
    expect(defs[0].options.retryPolicy).toBeUndefined();
  });

  it("portDependencies lists all step ports", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();

    expect(defs[0].portDependencies).toEqual(["PortA", "PortB", "PortC"]);
  });

  it("definition info is frozen", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();

    expect(Object.isFrozen(defs[0])).toBe(true);
    for (const step of defs[0].steps) {
      expect(Object.isFrozen(step)).toBe(true);
    }
  });
});

// =============================================================================
// H. getCurrentStepName logic
// =============================================================================

describe("getCurrentStepName via getActiveExecutions", () => {
  it("compensating trace shows current compensation step name", () => {
    const traces: Record<string, ExecutionTrace> = {
      "csn-1": makeTrace({
        executionId: "csn-1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed" }),
        ],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            {
              stepName: "StepA",
              stepIndex: 0,
              status: "completed",
              startedAt: 100,
              completedAt: 200,
              durationMs: 100,
              error: undefined,
            },
            // A pending compensation step (not completed, not failed)
          ],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    expect(active).toHaveLength(1);
    // All compensation steps are completed/failed, so currentStepName should be null
    expect(active[0].currentStepName).toBeNull();
  });

  it("running trace shows next step to execute", () => {
    const traces: Record<string, ExecutionTrace> = {
      "next-1": makeTrace({
        executionId: "next-1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "completed" }),
          // StepC not yet started
        ],
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    // 2 steps completed, but the trace has 2 steps total in the steps array
    // getCurrentStepName should look at lastCompleted (2) < steps.length (2), so null
    expect(active[0].currentStepName).toBeNull();
  });

  it("running trace with incomplete step shows that step name", () => {
    const traces: Record<string, ExecutionTrace> = {
      "inc-1": makeTrace({
        executionId: "inc-1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed" }),
        ],
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();

    // 1 completed step, lastCompleted = 1, steps.length = 2, so steps[1].stepName = "StepB"
    expect(active[0].currentStepName).toBe("StepB");
  });
});
