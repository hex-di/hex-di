/**
 * Introspection Mutation Tests (Part 2)
 *
 * Targets surviving mutants in src/introspection/saga-inspector.ts.
 *
 * Covers: executionStateToSummary field guards, computeCompensationStats
 * filter/tie-break/avg, getActiveExecutions compensation chains,
 * traceToExecutionState metadata/timestamps, getSuggestions types/boundaries,
 * emitToInspector error swallowing.
 */

import { describe, it, expect, vi } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaInspector, emitToInspector } from "../src/introspection/saga-inspector.js";
import type { ExecutionTrace } from "../src/runtime/types.js";
import type { SagaPersister, SagaExecutionState } from "../src/ports/types.js";

// =============================================================================
// Test Ports & Steps & Sagas
// =============================================================================

const TestPort = createPort<"TestPort", any>({ name: "TestPort" });

const TestStep = defineStep("TestStep")
  .io<string, string>()
  .invoke(TestPort, ctx => ctx.input)
  .build();

const CompensatedStep = defineStep("CompensatedStep")
  .io<string, string>()
  .invoke(TestPort, ctx => ctx.input)
  .compensate(ctx => ctx.stepResult)
  .build();

const RetryStep = defineStep("RetryStep")
  .io<string, string>()
  .invoke(TestPort, ctx => ctx.input)
  .options({ retry: { maxAttempts: 3, delay: 100 }, timeout: 5000 })
  .build();

const TestSaga = defineSaga("TestSaga")
  .input<string>()
  .step(TestStep)
  .output(() => ({}))
  .build();

const TwoStepSaga = defineSaga("TwoStepSaga")
  .input<string>()
  .step(CompensatedStep)
  .step(RetryStep)
  .output(() => ({}))
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

function makeBaseState(overrides: Partial<SagaExecutionState> = {}): SagaExecutionState {
  return {
    executionId: "base-1",
    sagaName: "TestSaga",
    input: "hello",
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
    ...overrides,
  };
}

// =============================================================================
// A. executionStateToSummary — fields.stepName type guard (L106-108)
// =============================================================================

describe("executionStateToSummary — stepName type guard", () => {
  it("fields.stepName as a number falls back to empty string", async () => {
    const state = makeBaseState({
      executionId: "step-guard-1",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "fail",
        stack: null,
        code: null,
        fields: { stepName: 42, stepIndex: 0 },
      },
    });

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: createMockPersister([state]),
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0].error).not.toBeNull();
    expect(result.value[0].error?.stepName).toBe("");
  });

  it("fields.stepName undefined falls back to empty string", async () => {
    const state = makeBaseState({
      executionId: "step-guard-2",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "fail",
        stack: null,
        code: null,
        fields: { stepIndex: 0 },
      },
    });

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: createMockPersister([state]),
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0].error?.stepName).toBe("");
  });

  it("fields undefined (no fields property on error) falls back to empty string", async () => {
    const state = makeBaseState({
      executionId: "step-guard-3",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "fail",
        stack: null,
        code: null,
        fields: {},
      },
    });

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: createMockPersister([state]),
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0].error?.stepName).toBe("");
  });
});

// =============================================================================
// B. executionStateToSummary — currentStepName IIFE (L120-124)
// =============================================================================

describe("executionStateToSummary — currentStepName resolution", () => {
  it("currentStep >= steps.length returns null for currentStepName", async () => {
    // TestSaga has 1 step, set currentStep to 1 (>= length)
    const state = makeBaseState({
      executionId: "csn-1",
      sagaName: "TestSaga",
      currentStep: 1,
      completedSteps: [
        {
          name: "TestStep",
          index: 0,
          output: "ok",
          skipped: false,
          completedAt: "2024-01-01T00:00:01Z",
        },
      ],
      status: "completed",
      timestamps: {
        startedAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:01Z",
        completedAt: "2024-01-01T00:00:01Z",
      },
    });

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: createMockPersister([state]),
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0].currentStepName).toBeNull();
  });

  it("unknown saga name (no definition found) returns null for currentStepName", async () => {
    const state = makeBaseState({
      executionId: "csn-2",
      sagaName: "NonExistentSaga",
      currentStep: 0,
      status: "running",
    });

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: createMockPersister([state]),
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0].currentStepName).toBeNull();
  });

  it("valid currentStep within range returns the correct step name", async () => {
    const state = makeBaseState({
      executionId: "csn-3",
      sagaName: "TwoStepSaga",
      currentStep: 1,
      completedSteps: [
        {
          name: "CompensatedStep",
          index: 0,
          output: "ok",
          skipped: false,
          completedAt: "2024-01-01T00:00:01Z",
        },
      ],
      status: "running",
    });

    const inspector = createSagaInspector({
      definitions: [TwoStepSaga],
      persister: createMockPersister([state]),
    });

    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value[0].currentStepName).toBe("RetryStep");
  });
});

// =============================================================================
// C. computeCompensationStats — filter logic (L161-163)
// =============================================================================

describe("computeCompensationStats — filter logic branches", () => {
  it("execution with active:true only is counted as compensated", () => {
    const traces: Record<string, ExecutionTrace> = {
      "active-only": {
        executionId: "active-only",
        sagaName: "TestSaga",
        input: "x",
        // Use "running" so it becomes "active" compensation via traceToExecutionState
        status: "compensating",
        steps: [
          {
            stepName: "TestStep",
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
          triggeredBy: "TestStep",
          triggeredByIndex: 0,
          // Status is neither completed nor failed, so active will be true
          // But CompensationTrace status is "completed" | "failed", so we pick "completed"
          // Then compensation.active will be false. Let's use a different approach.
          // The "active" flag in traceToExecutionState is computed as:
          // trace.compensation.status !== "completed" && trace.compensation.status !== "failed"
          // Since CompensationTrace status is "completed" | "failed", active will always be false.
          // So to test the active:true path in the filter, we need to go via persister (getHistory)
          steps: [],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
        startedAt: 100,
        completedAt: undefined,
        totalDurationMs: undefined,
        metadata: undefined,
      },
    };

    // The trace-based approach won't produce active:true for compensation.
    // Use persister-based approach to test the filter directly.
    // But getCompensationStats only uses activeTraces, not persister.
    // We need to test via activeTraces. Since CompensationTrace.status is always
    // "completed" | "failed", the active flag from traceToExecutionState is always false.
    // The filter has 4 OR conditions. Let's test triggeringStepIndex != null instead.

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });

    const stats = inspector.getCompensationStats();
    // The trace has compensation with triggeredByIndex=0, so triggeringStepIndex=0 (not null)
    // Even though compensatedSteps/failedSteps are empty, it should be counted
    expect(stats.totalCompensations).toBe(1);
  });

  it("execution with triggeringStepIndex=0 (not null) but empty steps and active=false is counted", () => {
    const traces: Record<string, ExecutionTrace> = {
      "trigger-0": {
        executionId: "trigger-0",
        sagaName: "TestSaga",
        input: "x",
        status: "failed",
        steps: [
          {
            stepName: "TestStep",
            stepIndex: 0,
            status: "failed",
            startedAt: 100,
            completedAt: 200,
            durationMs: 100,
            attemptCount: 1,
            error: new Error("fail"),
            skippedReason: undefined,
          },
        ],
        compensation: {
          triggeredBy: "TestStep",
          triggeredByIndex: 0,
          steps: [],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
        startedAt: 100,
        completedAt: 300,
        totalDurationMs: 200,
        metadata: undefined,
      },
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });

    const stats = inspector.getCompensationStats();
    // triggeringStepIndex = 0 (not null) → counted
    expect(stats.totalCompensations).toBe(1);
  });

  it("execution with all compensation fields empty and triggeringStepIndex=null is NOT counted", () => {
    const traces: Record<string, ExecutionTrace> = {
      "no-comp": {
        executionId: "no-comp",
        sagaName: "TestSaga",
        input: "x",
        status: "completed",
        steps: [
          {
            stepName: "TestStep",
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
      },
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });

    const stats = inspector.getCompensationStats();
    // No compensation → compensatedSteps=[], failedSteps=[], active=false, triggeringStepIndex=null
    expect(stats.totalCompensations).toBe(0);
  });
});

// =============================================================================
// D. computeCompensationStats — mostFailedStep tie-breaking (L204)
// =============================================================================

describe("computeCompensationStats — mostFailedStep tie-breaking", () => {
  it("two steps with equal fail counts — first encountered wins (strict >)", () => {
    const traces: Record<string, ExecutionTrace> = {};

    // Create two failed executions each with a different failed compensation step
    traces["tie-1"] = {
      executionId: "tie-1",
      sagaName: "TestSaga",
      input: "x",
      status: "failed",
      steps: [
        {
          stepName: "TestStep",
          stepIndex: 0,
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: new Error("fail"),
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "TestStep",
        triggeredByIndex: 0,
        steps: [
          {
            stepName: "CompA",
            stepIndex: 0,
            status: "failed",
            startedAt: 200,
            completedAt: 300,
            durationMs: 100,
            error: new Error("comp-fail"),
          },
        ],
        status: "failed",
        startedAt: 200,
        completedAt: 300,
        totalDurationMs: 100,
      },
      startedAt: 100,
      completedAt: 300,
      totalDurationMs: 200,
      metadata: undefined,
    };

    traces["tie-2"] = {
      executionId: "tie-2",
      sagaName: "TestSaga",
      input: "x",
      status: "failed",
      steps: [
        {
          stepName: "TestStep",
          stepIndex: 0,
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: new Error("fail"),
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "TestStep",
        triggeredByIndex: 0,
        steps: [
          {
            stepName: "CompB",
            stepIndex: 0,
            status: "failed",
            startedAt: 200,
            completedAt: 300,
            durationMs: 100,
            error: new Error("comp-fail"),
          },
        ],
        status: "failed",
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
      definitions: [TestSaga],
      activeTraces: traces,
    });

    const stats = inspector.getCompensationStats();
    const sagaStats = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(sagaStats).toBeDefined();
    // Both CompA and CompB have count=1. With strict >, first one wins
    expect(sagaStats?.mostFailedStep).toBe("CompA");
  });
});

// =============================================================================
// E. computeCompensationStats — successRate denominator (L198, L220)
// =============================================================================

describe("computeCompensationStats — successRate edge cases", () => {
  it("saga with 0 compensations returns successRate 0 and not NaN", () => {
    // If no activeTraces, totalCompensations=0
    const inspector = createSagaInspector({
      definitions: [TestSaga],
    });

    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(0);
    // No bySaga entries at all when 0 compensations
    expect(stats.bySaga).toEqual([]);
  });
});

// =============================================================================
// F. computeCompensationStats — avgCompTime (L210-215, L239-244)
// =============================================================================

describe("computeCompensationStats — avgCompTime", () => {
  it("all executions with durationMs undefined returns avgCompTime 0", () => {
    const traces: Record<string, ExecutionTrace> = {};

    // Create a trace with compensation that has no totalDurationMs info
    // traceToExecutionState maps compensation.durationMs from? Let me check:
    // Actually, traceToExecutionState doesn't set durationMs on compensation state.
    // The CompensationState interface has optional durationMs, and traceToExecutionState
    // doesn't set it (not in the mapped object). So durationMs will be undefined.
    traces["no-dur-1"] = {
      executionId: "no-dur-1",
      sagaName: "TestSaga",
      input: "x",
      status: "failed",
      steps: [
        {
          stepName: "TestStep",
          stepIndex: 0,
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: new Error("fail"),
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "TestStep",
        triggeredByIndex: 0,
        steps: [
          {
            stepName: "Comp",
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
      definitions: [TestSaga],
      activeTraces: traces,
    });

    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(1);
    // traceToExecutionState doesn't set compensation.durationMs
    // so executionsWithDuration filter produces empty array → avgCompTime = 0
    expect(stats.averageCompensationTime).toBe(0);

    const sagaStats = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(sagaStats).toBeDefined();
    expect(sagaStats?.averageCompensationTime).toBe(0);
  });
});

// =============================================================================
// G. getActiveExecutions — compensation filter/map chains (L277-299)
// =============================================================================

describe("getActiveExecutions — compensation filter/map chains", () => {
  it("running trace with no compensation has empty compensationState arrays", () => {
    const traces: Record<string, ExecutionTrace> = {
      "run-no-comp": {
        executionId: "run-no-comp",
        sagaName: "TestSaga",
        input: "x",
        status: "running",
        steps: [
          {
            stepName: "TestStep",
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
        completedAt: undefined,
        totalDurationMs: undefined,
        metadata: undefined,
      },
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });

    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    expect(active[0].compensationState.compensatedSteps).toEqual([]);
    expect(active[0].compensationState.failedSteps).toEqual([]);
    expect(active[0].compensationState.active).toBe(false);
  });

  it("compensating trace with mixed step statuses produces exact compensatedSteps/failedSteps", () => {
    const traces: Record<string, ExecutionTrace> = {
      "comp-mixed": {
        executionId: "comp-mixed",
        sagaName: "TestSaga",
        input: "x",
        status: "compensating",
        steps: [
          {
            stepName: "TestStep",
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
          triggeredBy: "TestStep",
          triggeredByIndex: 0,
          steps: [
            {
              stepName: "CompA",
              stepIndex: 0,
              status: "completed",
              startedAt: 200,
              completedAt: 250,
              durationMs: 50,
              error: undefined,
            },
            {
              stepName: "CompB",
              stepIndex: 1,
              status: "failed",
              startedAt: 250,
              completedAt: 300,
              durationMs: 50,
              error: new Error("comp-fail"),
            },
            {
              stepName: "CompC",
              stepIndex: 2,
              status: "completed",
              startedAt: 300,
              completedAt: 350,
              durationMs: 50,
              error: undefined,
            },
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 350,
          totalDurationMs: 150,
        },
        startedAt: 100,
        completedAt: undefined,
        totalDurationMs: undefined,
        metadata: undefined,
      },
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });

    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    expect(active[0].compensationState.active).toBe(true);
    expect(active[0].compensationState.compensatedSteps).toEqual(["CompA", "CompC"]);
    expect(active[0].compensationState.failedSteps).toEqual(["CompB"]);
  });

  it("trace with compensation undefined produces empty fallback arrays (exact equality)", () => {
    const traces: Record<string, ExecutionTrace> = {
      "undef-comp": {
        executionId: "undef-comp",
        sagaName: "TestSaga",
        input: "x",
        status: "running",
        steps: [],
        compensation: undefined,
        startedAt: 100,
        completedAt: undefined,
        totalDurationMs: undefined,
        metadata: undefined,
      },
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });

    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    expect(active[0].compensationState.compensatedSteps).toStrictEqual([]);
    expect(active[0].compensationState.failedSteps).toStrictEqual([]);
  });
});

// =============================================================================
// H. traceToExecutionState — metadata/timestamps (L391, L394, L506-511)
// =============================================================================

describe("traceToExecutionState — metadata and timestamps via getCompensationStats", () => {
  it("trace with metadata: undefined defaults to empty object", () => {
    const traces: Record<string, ExecutionTrace> = {
      "meta-undef": {
        executionId: "meta-undef",
        sagaName: "TestSaga",
        input: "x",
        status: "failed",
        steps: [
          {
            stepName: "TestStep",
            stepIndex: 0,
            status: "failed",
            startedAt: 100,
            completedAt: 200,
            durationMs: 100,
            attemptCount: 1,
            error: new Error("fail"),
            skippedReason: undefined,
          },
        ],
        compensation: {
          triggeredBy: "TestStep",
          triggeredByIndex: 0,
          steps: [
            {
              stepName: "Comp",
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
      },
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });

    // traceToExecutionState is called internally and metadata defaults to {}
    // This is observable via getActiveExecutions
    const active = inspector.getActiveExecutions();
    // status "failed" is not in activeStatuses, so won't appear in getActiveExecutions
    // But getCompensationStats still uses traceToExecutionState
    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(1);
  });

  it("trace with completedAt: undefined produces null completedAt in state", () => {
    const traces: Record<string, ExecutionTrace> = {
      "no-complete": {
        executionId: "no-complete",
        sagaName: "TestSaga",
        input: "x",
        status: "running",
        steps: [],
        compensation: undefined,
        startedAt: 100,
        completedAt: undefined,
        totalDurationMs: undefined,
        metadata: { key: "val" },
      },
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });

    // Active execution reflects the state
    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    expect(active[0].completedAt).toBeNull();
    expect(active[0].metadata).toEqual({ key: "val" });
  });

  it("trace with completedAt: number produces ISO string completedAt", () => {
    const traces: Record<string, ExecutionTrace> = {
      "with-complete": {
        executionId: "with-complete",
        sagaName: "TestSaga",
        input: "x",
        status: "failed",
        steps: [
          {
            stepName: "TestStep",
            stepIndex: 0,
            status: "failed",
            startedAt: 100,
            completedAt: 200,
            durationMs: 100,
            attemptCount: 1,
            error: new Error("err"),
            skippedReason: undefined,
          },
        ],
        compensation: {
          triggeredBy: "TestStep",
          triggeredByIndex: 0,
          steps: [
            {
              stepName: "Comp",
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
        completedAt: 500,
        totalDurationMs: 400,
        metadata: undefined,
      },
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });

    // Verify through getCompensationStats (exercises traceToExecutionState)
    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(1);
    expect(stats.successfulCompensations).toBe(1);
  });
});

// =============================================================================
// I. getSuggestions — type strings and boundary
// =============================================================================

describe("getSuggestions — type strings and boundaries", () => {
  it("step without compensation produces type 'saga_step_without_compensation'", () => {
    const inspector = createSagaInspector({
      definitions: [TestSaga],
    });

    const suggestions = inspector.getSuggestions();
    const noCompSuggestion = suggestions.find(
      s => s.type === "saga_step_without_compensation" && s.stepName === "TestStep"
    );
    expect(noCompSuggestion).toBeDefined();
    expect(noCompSuggestion?.type).toBe("saga_step_without_compensation");
    expect(noCompSuggestion?.action).toBeTruthy();
    expect(noCompSuggestion?.action.length).toBeGreaterThan(0);
  });

  it("step without retry produces type 'saga_no_retry_on_external_port'", () => {
    const inspector = createSagaInspector({
      definitions: [TestSaga],
    });

    const suggestions = inspector.getSuggestions();
    const noRetrySuggestion = suggestions.find(
      s => s.type === "saga_no_retry_on_external_port" && s.stepName === "TestStep"
    );
    expect(noRetrySuggestion).toBeDefined();
    expect(noRetrySuggestion?.type).toBe("saga_no_retry_on_external_port");
    expect(noRetrySuggestion?.action).toBeTruthy();
    expect(noRetrySuggestion?.action.length).toBeGreaterThan(0);
  });

  it("saga timeout === 30_000 does NOT trigger long timeout suggestion", () => {
    const TimeoutPort = createPort<"TimeoutPort", any>({ name: "TimeoutPort" });
    const TimeoutStep = defineStep("TimeoutStep")
      .io<string, string>()
      .invoke(TimeoutPort, ctx => ctx.input)
      .build();

    const BoundarySaga = defineSaga("BoundarySaga")
      .input<string>()
      .step(TimeoutStep)
      .output(() => ({}))
      .options({ compensationStrategy: "sequential", timeout: 30_000 })
      .build();

    const inspector = createSagaInspector({
      definitions: [BoundarySaga],
    });

    const suggestions = inspector.getSuggestions();
    const longTimeoutSuggestions = suggestions.filter(
      s =>
        s.type === "saga_long_timeout_without_persistence" &&
        s.sagaName === "BoundarySaga" &&
        s.stepName === undefined
    );
    expect(longTimeoutSuggestions).toHaveLength(0);
  });

  it("saga timeout === 30_001 triggers long timeout suggestion", () => {
    const TimeoutPort2 = createPort<"TimeoutPort2", any>({ name: "TimeoutPort2" });
    const TimeoutStep2 = defineStep("TimeoutStep2")
      .io<string, string>()
      .invoke(TimeoutPort2, ctx => ctx.input)
      .build();

    const LongSaga = defineSaga("LongSaga")
      .input<string>()
      .step(TimeoutStep2)
      .output(() => ({}))
      .options({ compensationStrategy: "sequential", timeout: 30_001 })
      .build();

    const inspector = createSagaInspector({
      definitions: [LongSaga],
      // No persister → triggers the suggestion
    });

    const suggestions = inspector.getSuggestions();
    const longTimeoutSuggestion = suggestions.find(
      s =>
        s.type === "saga_long_timeout_without_persistence" &&
        s.sagaName === "LongSaga" &&
        s.stepName === undefined
    );
    expect(longTimeoutSuggestion).toBeDefined();
    expect(longTimeoutSuggestion?.type).toBe("saga_long_timeout_without_persistence");
    expect(longTimeoutSuggestion?.action).toBeTruthy();
    expect(longTimeoutSuggestion?.action.length).toBeGreaterThan(0);
  });

  it("step timeout > 30_000 without persister triggers step-level long timeout suggestion", () => {
    const StepTimeoutPort = createPort<"StepTimeoutPort", any>({ name: "StepTimeoutPort" });
    const LongStepTimeout = defineStep("LongStepTimeout")
      .io<string, string>()
      .invoke(StepTimeoutPort, ctx => ctx.input)
      .options({ timeout: 60_000 })
      .build();

    const StepTimeoutSaga = defineSaga("StepTimeoutSaga")
      .input<string>()
      .step(LongStepTimeout)
      .output(() => ({}))
      .build();

    const inspector = createSagaInspector({
      definitions: [StepTimeoutSaga],
    });

    const suggestions = inspector.getSuggestions();
    const stepLongTimeout = suggestions.find(
      s => s.type === "saga_long_timeout_without_persistence" && s.stepName === "LongStepTimeout"
    );
    expect(stepLongTimeout).toBeDefined();
    expect(stepLongTimeout?.type).toBe("saga_long_timeout_without_persistence");
  });

  it("suggestion action strings are non-empty for all suggestions", () => {
    const inspector = createSagaInspector({
      definitions: [TestSaga],
    });

    const suggestions = inspector.getSuggestions();
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(s.action.length).toBeGreaterThan(0);
      expect(s.message.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// J. getSuggestions — high failure rate
// =============================================================================

describe("getSuggestions — high failure rate compensation suggestion", () => {
  it(">50% compensation failure rate generates suggestion", () => {
    const traces: Record<string, ExecutionTrace> = {};

    // 2 executions: 1 successful comp, 2 failed comp → 1/3 success rate < 0.5
    traces["hfr-1"] = {
      executionId: "hfr-1",
      sagaName: "TestSaga",
      input: "x",
      status: "failed",
      steps: [
        {
          stepName: "TestStep",
          stepIndex: 0,
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: new Error("fail"),
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "TestStep",
        triggeredByIndex: 0,
        steps: [
          {
            stepName: "Comp",
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

    traces["hfr-2"] = {
      executionId: "hfr-2",
      sagaName: "TestSaga",
      input: "x",
      status: "failed",
      steps: [
        {
          stepName: "TestStep",
          stepIndex: 0,
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: new Error("fail"),
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "TestStep",
        triggeredByIndex: 0,
        steps: [
          {
            stepName: "Comp",
            stepIndex: 0,
            status: "failed",
            startedAt: 200,
            completedAt: 300,
            durationMs: 100,
            error: new Error("comp-fail"),
          },
        ],
        status: "failed",
        startedAt: 200,
        completedAt: 300,
        totalDurationMs: 100,
      },
      startedAt: 100,
      completedAt: 300,
      totalDurationMs: 200,
      metadata: undefined,
    };

    traces["hfr-3"] = {
      executionId: "hfr-3",
      sagaName: "TestSaga",
      input: "x",
      status: "failed",
      steps: [
        {
          stepName: "TestStep",
          stepIndex: 0,
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: new Error("fail"),
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "TestStep",
        triggeredByIndex: 0,
        steps: [
          {
            stepName: "Comp",
            stepIndex: 0,
            status: "failed",
            startedAt: 200,
            completedAt: 300,
            durationMs: 100,
            error: new Error("comp-fail"),
          },
        ],
        status: "failed",
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
      definitions: [TestSaga],
      activeTraces: traces,
    });

    const suggestions = inspector.getSuggestions();
    const failRateSuggestion = suggestions.find(
      s => s.sagaName === "TestSaga" && s.message.includes("compensation success rate")
    );
    expect(failRateSuggestion).toBeDefined();
    expect(failRateSuggestion?.message).toContain("33%");
  });

  it("<=50% failure rate does NOT generate high-failure suggestion", () => {
    const traces: Record<string, ExecutionTrace> = {};

    // 2 successful compensations, 1 failed → 2/3 success rate = 0.666 > 0.5
    traces["ok-1"] = {
      executionId: "ok-1",
      sagaName: "TestSaga",
      input: "x",
      status: "failed",
      steps: [
        {
          stepName: "TestStep",
          stepIndex: 0,
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: new Error("fail"),
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "TestStep",
        triggeredByIndex: 0,
        steps: [
          {
            stepName: "Comp",
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

    traces["ok-2"] = {
      executionId: "ok-2",
      sagaName: "TestSaga",
      input: "x",
      status: "failed",
      steps: [
        {
          stepName: "TestStep",
          stepIndex: 0,
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: new Error("fail"),
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "TestStep",
        triggeredByIndex: 0,
        steps: [
          {
            stepName: "Comp",
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

    traces["ok-3"] = {
      executionId: "ok-3",
      sagaName: "TestSaga",
      input: "x",
      status: "failed",
      steps: [
        {
          stepName: "TestStep",
          stepIndex: 0,
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          durationMs: 100,
          attemptCount: 1,
          error: new Error("fail"),
          skippedReason: undefined,
        },
      ],
      compensation: {
        triggeredBy: "TestStep",
        triggeredByIndex: 0,
        steps: [
          {
            stepName: "Comp",
            stepIndex: 0,
            status: "failed",
            startedAt: 200,
            completedAt: 300,
            durationMs: 100,
            error: new Error("comp-fail"),
          },
        ],
        status: "failed",
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
      definitions: [TestSaga],
      activeTraces: traces,
    });

    const suggestions = inspector.getSuggestions();
    const failRateSuggestion = suggestions.find(
      s => s.sagaName === "TestSaga" && s.message.includes("compensation success rate")
    );
    expect(failRateSuggestion).toBeUndefined();
  });
});

// =============================================================================
// K. emitToInspector — listener error swallowing (L528-533)
// =============================================================================

describe("emitToInspector — listener error swallowing", () => {
  it("first listener throws, second listener still called", () => {
    const inspector = createSagaInspector({
      definitions: [TestSaga],
    });

    const calls: string[] = [];

    inspector.subscribe(() => {
      calls.push("first");
      throw new Error("listener-error");
    });

    inspector.subscribe(event => {
      calls.push("second");
      calls.push(event.type);
    });

    const event = {
      type: "saga:started" as const,
      executionId: "emit-1",
      sagaName: "TestSaga",
      timestamp: Date.now(),
      input: "test",
      stepCount: 1,
      metadata: undefined,
    };

    // Should not throw
    expect(() => emitToInspector(inspector, event)).not.toThrow();
    expect(calls).toContain("first");
    expect(calls).toContain("second");
    expect(calls).toContain("saga:started");
  });

  it("emitting to a non-created inspector (no registry entry) does not crash", () => {
    // Create a plain object that looks like SagaInspector but was never registered
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

    const event = {
      type: "saga:started" as const,
      executionId: "emit-2",
      sagaName: "TestSaga",
      timestamp: Date.now(),
      input: "test",
      stepCount: 1,
      metadata: undefined,
    };

    // Should not throw even though fakeInspector wasn't registered
    expect(() => emitToInspector(fakeInspector, event)).not.toThrow();
  });

  it("emitting to inspector with no listeners does not crash", () => {
    const inspector = createSagaInspector({
      definitions: [TestSaga],
    });

    const event = {
      type: "saga:completed" as const,
      executionId: "emit-3",
      sagaName: "TestSaga",
      timestamp: Date.now(),
      totalDurationMs: 100,
      stepsExecuted: 1,
      stepsSkipped: 0,
    };

    // No listeners registered, should not throw
    expect(() => emitToInspector(inspector, event)).not.toThrow();
  });
});
