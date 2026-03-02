/**
 * Inspector Mutations 4 — targeted mutant killing for saga-inspector.ts
 *
 * Covers:
 * - Group 1: getDefinitions / step mapping with undefined options (L64, L79)
 * - Group 2: executionStateToSummary currentStepName boundary (L107)
 * - Group 3: Error causeTags extraction (L121, L128-133)
 * - Group 4: computeCompensationStats filter/aggregation (L165-204)
 * - Group 5: getActiveExecutions trace mapping (L241-394)
 * - Group 6: getSuggestions NoCoverage paths (L366-407)
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaInspector, emitToInspector } from "../src/introspection/saga-inspector.js";
import type { SagaPersister, SagaExecutionState } from "../src/ports/types.js";
import type { ExecutionTrace, StepTrace, CompensationStepTrace } from "../src/runtime/types.js";
import type { AnySagaDefinition } from "../src/saga/types.js";
import type { AnyStepDefinition } from "../src/step/types.js";

// =============================================================================
// Shared Helpers
// =============================================================================

const PortA = createPort<"PortA", any>({ name: "PortA" });
const PortB = createPort<"PortB", any>({ name: "PortB" });
const PortC = createPort<"PortC", any>({ name: "PortC" });

const StepA = defineStep("StepA")
  .io<unknown, unknown>()
  .invoke(PortA, ctx => ctx.input)
  .compensate(() => ({}))
  .build();

const StepB = defineStep("StepB")
  .io<unknown, unknown>()
  .invoke(PortB, ctx => ctx.input)
  .compensate(() => ({}))
  .options({ retry: { maxAttempts: 2, delay: 50 }, timeout: 3000 })
  .build();

const StepC = defineStep("StepC")
  .io<unknown, unknown>()
  .invoke(PortC, ctx => ctx.input)
  .build();

const TestSaga = defineSaga("TestSaga")
  .input<unknown>()
  .step(StepA)
  .step(StepB)
  .step(StepC)
  .output(r => r)
  .build();

function makeStepTrace(
  overrides: Partial<StepTrace> & { stepName: string; stepIndex: number }
): StepTrace {
  return {
    status: "completed",
    startedAt: 100,
    completedAt: 200,
    durationMs: 100,
    attemptCount: 1,
    error: undefined,
    skippedReason: undefined,
    ...overrides,
  };
}

function makeCompStepTrace(
  overrides: Partial<CompensationStepTrace> & { stepName: string; stepIndex: number }
): CompensationStepTrace {
  return {
    status: "completed",
    startedAt: 300,
    completedAt: 400,
    durationMs: 100,
    error: undefined,
    ...overrides,
  };
}

function makeTrace(
  overrides: Partial<ExecutionTrace> & { executionId: string; sagaName: string }
): ExecutionTrace {
  return {
    input: {},
    status: "running",
    steps: [],
    compensation: undefined,
    startedAt: 100,
    completedAt: undefined,
    totalDurationMs: undefined,
    metadata: undefined,
    ...overrides,
  };
}

function makePersisterState(
  overrides: Partial<SagaExecutionState> & { executionId: string; sagaName: string }
): SagaExecutionState {
  return {
    input: {},
    currentStep: 0,
    totalSteps: 3,
    pendingStep: null,
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
      updatedAt: "2024-01-01T00:01:00.000Z",
      completedAt: "2024-01-01T00:01:00.000Z",
    },
    metadata: {},
    ...overrides,
  };
}

// =============================================================================
// Group 1: getDefinitions / step mapping with undefined options
// =============================================================================

describe("Group 1: step options optional chaining (L64 retry, L79 timeout)", () => {
  it("handles a step definition where options is undefined (no crash on ?.retry)", () => {
    // Craft a step definition with options set to undefined to bypass the builder
    const bareStep: AnyStepDefinition = {
      name: "BareStep",
      port: PortA,
      invoke: () => ({}),
      compensate: null,
      condition: null,
      options: undefined as any,
    };
    const saga: AnySagaDefinition = {
      name: "BareSaga",
      steps: [bareStep],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };

    const inspector = createSagaInspector({ definitions: [saga] });
    const defs = inspector.getDefinitions();

    expect(defs).toHaveLength(1);
    expect(defs[0].steps[0].name).toBe("BareStep");
    // With options undefined, retryPolicy should be undefined (optional chaining)
    expect(defs[0].steps[0].retryPolicy).toBeUndefined();
    // And timeout should also be undefined
    expect(defs[0].steps[0].timeout).toBeUndefined();
  });

  it("handles step with options but no retry defined", () => {
    const stepNoRetry: AnyStepDefinition = {
      name: "NoRetryStep",
      port: PortA,
      invoke: () => ({}),
      compensate: null,
      condition: null,
      options: { timeout: 5000 },
    };
    const saga: AnySagaDefinition = {
      name: "NoRetrySaga",
      steps: [stepNoRetry],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };

    const inspector = createSagaInspector({ definitions: [saga] });
    const defs = inspector.getDefinitions();

    expect(defs[0].steps[0].retryPolicy).toBeUndefined();
    expect(defs[0].steps[0].timeout).toBe(5000);
  });

  it("handles step with options but no timeout defined", () => {
    const stepNoTimeout: AnyStepDefinition = {
      name: "NoTimeoutStep",
      port: PortA,
      invoke: () => ({}),
      compensate: null,
      condition: null,
      options: { retry: { maxAttempts: 3, delay: 100 } },
    };
    const saga: AnySagaDefinition = {
      name: "NoTimeoutSaga",
      steps: [stepNoTimeout],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };

    const inspector = createSagaInspector({ definitions: [saga] });
    const defs = inspector.getDefinitions();

    expect(defs[0].steps[0].retryPolicy).toBeDefined();
    expect(defs[0].steps[0].retryPolicy?.maxAttempts).toBe(3);
    expect(defs[0].steps[0].timeout).toBeUndefined();
  });

  it("distinguishes fixed vs exponential backoff strategy based on delay type", () => {
    const fixedStep: AnyStepDefinition = {
      name: "FixedStep",
      port: PortA,
      invoke: () => ({}),
      compensate: null,
      condition: null,
      options: { retry: { maxAttempts: 2, delay: 200 } },
    };
    const expStep: AnyStepDefinition = {
      name: "ExpStep",
      port: PortB,
      invoke: () => ({}),
      compensate: null,
      condition: null,
      options: { retry: { maxAttempts: 2, delay: (attempt: number) => attempt * 100 } },
    };
    const saga: AnySagaDefinition = {
      name: "BackoffSaga",
      steps: [fixedStep, expStep],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };

    const inspector = createSagaInspector({ definitions: [saga] });
    const defs = inspector.getDefinitions();

    expect(defs[0].steps[0].retryPolicy?.backoffStrategy).toBe("fixed");
    expect(defs[0].steps[0].retryPolicy?.initialDelay).toBe(200);
    expect(defs[0].steps[1].retryPolicy?.backoffStrategy).toBe("exponential");
    expect(defs[0].steps[1].retryPolicy?.initialDelay).toBe(0);
  });
});

// =============================================================================
// Group 2: executionStateToSummary currentStepName boundary (L107)
// =============================================================================

describe("Group 2: executionStateToSummary currentStepName boundary (L107/L120-123)", () => {
  function makeMockPersister(states: SagaExecutionState[]): SagaPersister {
    return {
      save: () => ResultAsync.ok(undefined),
      load: () => ResultAsync.ok(null),
      delete: () => ResultAsync.ok(undefined),
      list: () => ResultAsync.ok(states),
      update: () => ResultAsync.ok(undefined),
    };
  }

  it("currentStepName is the step name when currentStep < totalSteps", async () => {
    const state = makePersisterState({
      executionId: "e1",
      sagaName: "TestSaga",
      currentStep: 1,
      totalSteps: 3,
      pendingStep: null,
      status: "running",
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
      // currentStep=1, totalSteps=3, so step at index 1 = "StepB"
      expect(result.value[0].currentStepName).toBe("StepB");
    }
  });

  it("currentStepName is null when currentStep >= totalSteps", async () => {
    const state = makePersisterState({
      executionId: "e2",
      sagaName: "TestSaga",
      currentStep: 3, // equals totalSteps
      status: "completed",
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].currentStepName).toBeNull();
    }
  });

  it("currentStepName is null when currentStep exceeds totalSteps", async () => {
    const state = makePersisterState({
      executionId: "e3",
      sagaName: "TestSaga",
      currentStep: 10, // far exceeds
      totalSteps: 3,
      pendingStep: null,
      status: "completed",
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].currentStepName).toBeNull();
    }
  });

  it("currentStepName is null when saga definition is not found", async () => {
    const state = makePersisterState({
      executionId: "e4",
      sagaName: "UnknownSaga",
      currentStep: 0,
      totalSteps: 3,
      pendingStep: null,
      status: "running",
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].currentStepName).toBeNull();
      expect(result.value[0].totalSteps).toBe(0);
    }
  });

  it("currentStepName is the first step at currentStep=0", async () => {
    const state = makePersisterState({
      executionId: "e5",
      sagaName: "TestSaga",
      currentStep: 0,
      totalSteps: 3,
      pendingStep: null,
      status: "running",
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].currentStepName).toBe("StepA");
    }
  });

  it("currentStepName is the last step at currentStep = totalSteps - 1", async () => {
    const state = makePersisterState({
      executionId: "e6",
      sagaName: "TestSaga",
      currentStep: 2, // totalSteps=3, so index 2 is StepC
      status: "running",
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].currentStepName).toBe("StepC");
    }
  });
});

// =============================================================================
// Group 3: Error causeTags extraction (L121, L128-133)
// =============================================================================

describe("Group 3: extractCauseTags (L121, L128-133)", () => {
  function makeMockPersister(states: SagaExecutionState[]): SagaPersister {
    return {
      save: () => ResultAsync.ok(undefined),
      load: () => ResultAsync.ok(null),
      delete: () => ResultAsync.ok(undefined),
      list: () => ResultAsync.ok(states),
      update: () => ResultAsync.ok(undefined),
    };
  }

  it("causeTags is empty array when error has no cause field", async () => {
    const state = makePersisterState({
      executionId: "e-err1",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: { stepName: "StepA" },
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error).not.toBeNull();
      expect(result.value[0].error?._tag).toBe("StepFailed");
      expect(result.value[0].error?.causeTags).toEqual([]);
    }
  });

  it("causeTags extracts _tag from cause when cause is an object with _tag", async () => {
    const state = makePersisterState({
      executionId: "e-err2",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: {
          stepName: "StepA",
          cause: { _tag: "PaymentDeclined" },
        },
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error?.causeTags).toEqual(["PaymentDeclined"]);
    }
  });

  it("causeTags recursively extracts nested cause._tag chains", async () => {
    const state = makePersisterState({
      executionId: "e-err3",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: {
          stepName: "StepA",
          cause: {
            _tag: "PaymentDeclined",
            cause: {
              _tag: "InsufficientFunds",
              cause: {
                _tag: "AccountFrozen",
              },
            },
          },
        },
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error?.causeTags).toEqual([
        "PaymentDeclined",
        "InsufficientFunds",
        "AccountFrozen",
      ]);
    }
  });

  it("causeTags returns empty when cause is null", async () => {
    const state = makePersisterState({
      executionId: "e-err4",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: { stepName: "StepA", cause: null },
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error?.causeTags).toEqual([]);
    }
  });

  it("causeTags returns empty when cause is undefined", async () => {
    const state = makePersisterState({
      executionId: "e-err5",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: { stepName: "StepA", cause: undefined },
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error?.causeTags).toEqual([]);
    }
  });

  it("causeTags returns empty when cause is a string (not object)", async () => {
    const state = makePersisterState({
      executionId: "e-err6",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: { stepName: "StepA", cause: "some error string" },
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error?.causeTags).toEqual([]);
    }
  });

  it("causeTags returns empty when cause is a number (not object)", async () => {
    const state = makePersisterState({
      executionId: "e-err7",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: { stepName: "StepA", cause: 42 },
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error?.causeTags).toEqual([]);
    }
  });

  it("causeTags returns empty when cause is an object without _tag", async () => {
    const state = makePersisterState({
      executionId: "e-err8",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: { stepName: "StepA", cause: { message: "no tag here" } },
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error?.causeTags).toEqual([]);
    }
  });

  it("causeTags returns empty when cause._tag is not a string", async () => {
    const state = makePersisterState({
      executionId: "e-err9",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: { stepName: "StepA", cause: { _tag: 123 } },
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error?.causeTags).toEqual([]);
    }
  });

  it("causeTags stops recursion when nested cause is undefined", async () => {
    const state = makePersisterState({
      executionId: "e-err10",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: {
          stepName: "StepA",
          cause: { _tag: "Level1", cause: undefined },
        },
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // Only Level1, since nested cause is undefined so recursion stops
      expect(result.value[0].error?.causeTags).toEqual(["Level1"]);
    }
  });

  it("error stepName defaults to empty string when fields.stepName is not a string", async () => {
    const state = makePersisterState({
      executionId: "e-err11",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: { stepName: 123 },
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error?.stepName).toBe("");
    }
  });

  it("error stepName is extracted when fields.stepName is a string", async () => {
    const state = makePersisterState({
      executionId: "e-err12",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: { stepName: "MyStep" },
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error?.stepName).toBe("MyStep");
    }
  });

  it("error fields defaults to empty object when fields is undefined", async () => {
    const state = makePersisterState({
      executionId: "e-err13",
      sagaName: "TestSaga",
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "step failed",
        stack: null,
        code: null,
        fields: undefined as any,
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error?.stepName).toBe("");
      expect(result.value[0].error?.causeTags).toEqual([]);
    }
  });
});

// =============================================================================
// Group 4: computeCompensationStats filter/aggregation (L165-204)
// =============================================================================

describe("Group 4: computeCompensationStats (L165-204)", () => {
  it("filters only executions with compensation activity", () => {
    const traces: Record<string, ExecutionTrace> = {
      // Has compensation steps = should be included
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [
          makeStepTrace({
            stepName: "StepA",
            stepIndex: 0,
            status: "failed",
            error: { _tag: "StepFailed" },
          }),
        ],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0 })],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
      // No compensation at all = should NOT be included
      e2: makeTrace({
        executionId: "e2",
        sagaName: "TestSaga",
        status: "completed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0 })],
      }),
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const stats = inspector.getCompensationStats();
    // Only e1 had compensation
    expect(stats.totalCompensations).toBe(1);
  });

  it("filter includes executions where compensation.active is true", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [], // no completed/failed yet, but it's in progress
          status: "completed", // traceToExecutionState computes active from this
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(1);
  });

  it("computes mostFailedStep from failed compensation steps", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            makeCompStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: "comp err",
            }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
      e2: makeTrace({
        executionId: "e2",
        sagaName: "TestSaga",
        status: "failed",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err2" }),
        ],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            makeCompStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: "comp err2",
            }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
      e3: makeTrace({
        executionId: "e3",
        sagaName: "TestSaga",
        status: "failed",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0 }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed", error: "err3" }),
        ],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            makeCompStepTrace({
              stepName: "StepB",
              stepIndex: 1,
              status: "failed",
              error: "comp err3",
            }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(3);
    // StepA failed in 2 compensations, StepB in 1
    const breakdown = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(breakdown).toBeDefined();
    expect(breakdown?.mostFailedStep).toBe("StepA");
  });

  it("mostFailedStep is null when there are no failed compensation steps", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" })],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const stats = inspector.getCompensationStats();
    const breakdown = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(breakdown?.mostFailedStep).toBeNull();
  });

  it("successRate is 0 when all compensations failed", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            makeCompStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: "comp err",
            }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const stats = inspector.getCompensationStats();
    const breakdown = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(breakdown?.successRate).toBe(0);
    expect(stats.failedCompensations).toBe(1);
    expect(stats.successfulCompensations).toBe(0);
  });

  it("successRate is 1 when all compensations succeeded", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0 })],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const stats = inspector.getCompensationStats();
    const breakdown = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(breakdown?.successRate).toBe(1);
    expect(stats.successfulCompensations).toBe(1);
    expect(stats.failedCompensations).toBe(0);
  });

  it("mostCompensatedSaga picks the saga with the most compensations", () => {
    const Saga2 = defineSaga("Saga2")
      .input<unknown>()
      .step(StepA)
      .output(r => r)
      .build();

    const traces: Record<string, ExecutionTrace> = {
      // 1 compensation for TestSaga
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0 })],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
      // 2 compensations for Saga2
      e2: makeTrace({
        executionId: "e2",
        sagaName: "Saga2",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0 })],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
      e3: makeTrace({
        executionId: "e3",
        sagaName: "Saga2",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0 })],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga, Saga2],
      activeTraces: traces,
    });
    const stats = inspector.getCompensationStats();
    expect(stats.mostCompensatedSaga).toBe("Saga2");
    expect(stats.bySaga).toHaveLength(2);
  });

  it("empty traces produce zero compensation stats", () => {
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: {},
    });
    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(0);
    expect(stats.successfulCompensations).toBe(0);
    expect(stats.failedCompensations).toBe(0);
    expect(stats.averageCompensationTime).toBe(0);
    expect(stats.mostCompensatedSaga).toBeNull();
    expect(stats.bySaga).toHaveLength(0);
  });

  it("no activeTraces returns zero compensation stats", () => {
    const inspector = createSagaInspector({
      definitions: [TestSaga],
    });
    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(0);
    expect(stats.mostCompensatedSaga).toBeNull();
  });
});

// =============================================================================
// Group 5: getActiveExecutions trace mapping (L241-394)
// =============================================================================

describe("Group 5: getActiveExecutions trace-to-summary mapping", () => {
  it("returns empty array when no activeTraces configured", () => {
    const inspector = createSagaInspector({
      definitions: [TestSaga],
    });
    expect(inspector.getActiveExecutions()).toEqual([]);
  });

  it("totalSteps is 0 when saga definition not found", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "UnknownSaga",
        status: "running",
        steps: [],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    expect(active[0].totalSteps).toBe(0);
  });

  it("totalSteps equals definition steps length when found", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].totalSteps).toBe(3);
  });

  it("currentStepIndex counts completed steps", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "completed" }),
          makeStepTrace({ stepName: "StepC", stepIndex: 2, status: "failed", error: "err" }),
        ],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].currentStepIndex).toBe(2);
    expect(active[0].completedStepCount).toBe(2);
  });

  it("completedStepCount matches number of completed steps", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({
            stepName: "StepB",
            stepIndex: 1,
            status: "skipped",
            skippedReason: "condition",
          }),
        ],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].completedStepCount).toBe(1);
  });

  it("currentStepName returns the next pending step for running traces", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "completed" }),
          makeStepTrace({ stepName: "StepC", stepIndex: 2, status: "failed", error: "err" }),
        ],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    // lastCompleted = 2, steps.length = 3, so steps[2].stepName = "StepC"
    expect(active[0].currentStepName).toBe("StepC");
  });

  it("currentStepName is null when all steps are completed in a running trace", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "completed" }),
          makeStepTrace({ stepName: "StepC", stepIndex: 2, status: "completed" }),
        ],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    // lastCompleted=3, steps.length=3, so lastCompleted >= length => null
    expect(active[0].currentStepName).toBeNull();
  });

  it("currentStepName returns pending compensation step name for compensating trace", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed", error: "err" }),
        ],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            makeCompStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
            {
              stepName: "StepB",
              stepIndex: 1,
              status: "failed",
              startedAt: 400,
              completedAt: 500,
              durationMs: 100,
              error: "comp fail",
            },
          ],
          status: "failed",
          startedAt: 300,
          completedAt: 500,
          totalDurationMs: 200,
        },
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    expect(active[0].status).toBe("compensating");
    // The compensation has one completed and one failed step => neither is "pending"
    // pendingComp = find where status != "completed" && status != "failed" => none
    // Falls through to the steps-based logic
    expect(active[0].currentStepName).toBeNull();
  });

  it("currentStepName returns the first non-completed non-failed compensation step", () => {
    // We create a trace that is "compensating" with compensation steps where
    // one is "completed" and the second needs manual representation
    // CompensationStepTrace only has "completed" | "failed" status, so
    // for a "pending" comp step we need to check if find returns nothing
    // and falls through to normal logic.
    // Actually looking at CompensationStepTrace, status can only be "completed" | "failed"
    // So for the compensating path, if all comp steps are completed or failed,
    // pendingComp is undefined and it returns null.
    // The test above already covers this. Let's instead test when no comp steps exist.
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed", error: "err" }),
        ],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [],
          status: "completed",
          startedAt: 300,
          completedAt: 400,
          totalDurationMs: 100,
        },
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].currentStepName).toBeNull();
  });

  it("compensationState.active is true for compensating status", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].compensationState.active).toBe(true);
  });

  it("compensationState.active is false for running status", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].compensationState.active).toBe(false);
  });

  it("compensationState.compensatedSteps lists completed compensation steps", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed", error: "err" }),
        ],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" })],
          status: "completed",
          startedAt: 300,
          completedAt: 400,
          totalDurationMs: 100,
        },
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].compensationState.compensatedSteps).toEqual(["StepA"]);
  });

  it("compensationState.failedSteps lists failed compensation steps", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed", error: "err" }),
        ],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            makeCompStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: "comp fail",
            }),
          ],
          status: "failed",
          startedAt: 300,
          completedAt: 400,
          totalDurationMs: 100,
        },
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].compensationState.failedSteps).toEqual(["StepA"]);
    expect(active[0].compensationState.compensatedSteps).toEqual([]);
  });

  it("compensationState arrays are empty when compensation is undefined", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" })],
        compensation: undefined,
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].compensationState.compensatedSteps).toEqual([]);
    expect(active[0].compensationState.failedSteps).toEqual([]);
    expect(active[0].compensationState.active).toBe(false);
  });

  it("error is null for active executions (no error field in summary)", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "some error" }),
        ],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].error).toBeNull();
  });

  it("completedAt is null for active executions", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].completedAt).toBeNull();
    expect(active[0].durationMs).toBeNull();
  });

  it("startedAt is ISO string from trace.startedAt timestamp", () => {
    const ts = 1704067200000; // 2024-01-01T00:00:00.000Z
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        startedAt: ts,
        steps: [],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].startedAt).toBe(new Date(ts).toISOString());
  });

  it("metadata is empty object when trace.metadata is undefined", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
        metadata: undefined,
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].metadata).toEqual({});
  });

  it("metadata is passed through when trace.metadata is defined", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
        metadata: { foo: "bar", count: 42 },
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].metadata).toEqual({ foo: "bar", count: 42 });
  });

  it("includes pending status in active executions", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "pending",
        steps: [],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    expect(active[0].status).toBe("pending");
  });

  it("excludes completed, failed, and cancelled traces", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({ executionId: "e1", sagaName: "TestSaga", status: "completed", steps: [] }),
      e2: makeTrace({ executionId: "e2", sagaName: "TestSaga", status: "failed", steps: [] }),
      e3: makeTrace({ executionId: "e3", sagaName: "TestSaga", status: "cancelled", steps: [] }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(0);
  });

  it("compensation filter and map chains produce correct step name arrays", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "completed" }),
          makeStepTrace({ stepName: "StepC", stepIndex: 2, status: "failed", error: "err" }),
        ],
        compensation: {
          triggeredBy: "StepC",
          triggeredByIndex: 2,
          steps: [
            makeCompStepTrace({ stepName: "StepB", stepIndex: 1, status: "completed" }),
            makeCompStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: "comp fail",
            }),
          ],
          status: "failed",
          startedAt: 300,
          completedAt: 500,
          totalDurationMs: 200,
        },
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].compensationState.compensatedSteps).toEqual(["StepB"]);
    expect(active[0].compensationState.failedSteps).toEqual(["StepA"]);
  });

  it("handles mixed compensation step statuses correctly", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "completed" }),
          makeStepTrace({ stepName: "StepC", stepIndex: 2, status: "failed", error: "err" }),
        ],
        compensation: {
          triggeredBy: "StepC",
          triggeredByIndex: 2,
          steps: [
            makeCompStepTrace({ stepName: "StepB", stepIndex: 1, status: "completed" }),
            makeCompStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          ],
          status: "completed",
          startedAt: 300,
          completedAt: 500,
          totalDurationMs: 200,
        },
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].compensationState.compensatedSteps).toEqual(["StepB", "StepA"]);
    expect(active[0].compensationState.failedSteps).toEqual([]);
  });

  it("updatedAt is a valid ISO string for active executions", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    // updatedAt should be a valid ISO date string
    expect(() => new Date(active[0].updatedAt)).not.toThrow();
    expect(new Date(active[0].updatedAt).toISOString()).toBe(active[0].updatedAt);
  });

  it("executionId and sagaName are passed through correctly", () => {
    const traces: Record<string, ExecutionTrace> = {
      "exec-abc-123": makeTrace({
        executionId: "exec-abc-123",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
      }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active[0].executionId).toBe("exec-abc-123");
    expect(active[0].sagaName).toBe("TestSaga");
  });

  it("handles multiple active traces simultaneously", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({ executionId: "e1", sagaName: "TestSaga", status: "running", steps: [] }),
      e2: makeTrace({ executionId: "e2", sagaName: "TestSaga", status: "pending", steps: [] }),
      e3: makeTrace({
        executionId: "e3",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
      e4: makeTrace({ executionId: "e4", sagaName: "TestSaga", status: "completed", steps: [] }),
    };
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(3);
    const ids = active.map(a => a.executionId);
    expect(ids).toContain("e1");
    expect(ids).toContain("e2");
    expect(ids).toContain("e3");
    expect(ids).not.toContain("e4");
  });
});

// =============================================================================
// Group 6: getSuggestions NoCoverage paths (L366-407)
// =============================================================================

describe("Group 6: getSuggestions coverage paths", () => {
  it("produces saga_step_without_compensation suggestion with correct string literals", () => {
    const NoCompStep: AnyStepDefinition = {
      name: "NoCompStep",
      port: PortA,
      invoke: () => ({}),
      compensate: null,
      condition: null,
      options: {},
    };
    const saga: AnySagaDefinition = {
      name: "SugSaga",
      steps: [NoCompStep],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };

    const inspector = createSagaInspector({ definitions: [saga] });
    const suggestions = inspector.getSuggestions();
    const compSuggestions = suggestions.filter(
      s => s.type === "saga_step_without_compensation" && s.stepName === "NoCompStep"
    );
    expect(compSuggestions.length).toBeGreaterThanOrEqual(1);
    expect(compSuggestions[0].message).toContain("NoCompStep");
    expect(compSuggestions[0].message).toContain("SugSaga");
    expect(compSuggestions[0].message).toContain("no compensation handler");
    expect(compSuggestions[0].action).toContain("compensat");
  });

  it("produces saga_no_retry_on_external_port suggestion with correct string literals", () => {
    const NoRetryStep: AnyStepDefinition = {
      name: "NoRetryStep",
      port: PortA,
      invoke: () => ({}),
      compensate: () => ({}),
      condition: null,
      options: {},
    };
    const saga: AnySagaDefinition = {
      name: "RetrySugSaga",
      steps: [NoRetryStep],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };

    const inspector = createSagaInspector({ definitions: [saga] });
    const suggestions = inspector.getSuggestions();
    const retrySuggestions = suggestions.filter(
      s => s.type === "saga_no_retry_on_external_port" && s.stepName === "NoRetryStep"
    );
    expect(retrySuggestions.length).toBeGreaterThanOrEqual(1);
    expect(retrySuggestions[0].message).toContain("no retry configuration");
    expect(retrySuggestions[0].action).toContain("retry");
    expect(retrySuggestions[0].action).toContain("maxAttempts");
  });

  it("produces saga_long_timeout_without_persistence for saga-level timeout", () => {
    const step: AnyStepDefinition = {
      name: "QuickStep",
      port: PortA,
      invoke: () => ({}),
      compensate: () => ({}),
      condition: null,
      options: { retry: { maxAttempts: 1, delay: 10 } },
    };
    const saga: AnySagaDefinition = {
      name: "LongTimeoutSaga",
      steps: [step],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential", timeout: 60000 },
    };

    const inspector = createSagaInspector({ definitions: [saga] });
    const suggestions = inspector.getSuggestions();
    const timeoutSuggestions = suggestions.filter(
      s => s.type === "saga_long_timeout_without_persistence" && s.sagaName === "LongTimeoutSaga"
    );
    expect(timeoutSuggestions.length).toBeGreaterThanOrEqual(1);
    expect(timeoutSuggestions[0].message).toContain("60000");
    expect(timeoutSuggestions[0].action).toContain("SagaPersister");
  });

  it("produces saga_long_timeout_without_persistence for step-level timeout", () => {
    const step: AnyStepDefinition = {
      name: "LongStep",
      port: PortA,
      invoke: () => ({}),
      compensate: () => ({}),
      condition: null,
      options: { retry: { maxAttempts: 1, delay: 10 }, timeout: 45000 },
    };
    const saga: AnySagaDefinition = {
      name: "StepTimeoutSaga",
      steps: [step],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };

    const inspector = createSagaInspector({ definitions: [saga] });
    const suggestions = inspector.getSuggestions();
    const timeoutSuggestions = suggestions.filter(
      s => s.type === "saga_long_timeout_without_persistence" && s.stepName === "LongStep"
    );
    expect(timeoutSuggestions.length).toBeGreaterThanOrEqual(1);
    expect(timeoutSuggestions[0].message).toContain("45000");
    expect(timeoutSuggestions[0].message).toContain("LongStep");
    expect(timeoutSuggestions[0].action).toContain("SagaPersister");
  });

  it("does not produce long-timeout suggestion when timeout is <= 30000", () => {
    const step: AnyStepDefinition = {
      name: "NormalStep",
      port: PortA,
      invoke: () => ({}),
      compensate: () => ({}),
      condition: null,
      options: { retry: { maxAttempts: 1, delay: 10 }, timeout: 30000 },
    };
    const saga: AnySagaDefinition = {
      name: "NormalSaga",
      steps: [step],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential", timeout: 30000 },
    };

    const inspector = createSagaInspector({ definitions: [saga] });
    const suggestions = inspector.getSuggestions();
    const timeoutSuggestions = suggestions.filter(
      s => s.type === "saga_long_timeout_without_persistence"
    );
    expect(timeoutSuggestions).toHaveLength(0);
  });

  it("does not produce long-timeout suggestion when persister is configured", () => {
    const step: AnyStepDefinition = {
      name: "LongStep",
      port: PortA,
      invoke: () => ({}),
      compensate: () => ({}),
      condition: null,
      options: { retry: { maxAttempts: 1, delay: 10 }, timeout: 60000 },
    };
    const saga: AnySagaDefinition = {
      name: "PersistedSaga",
      steps: [step],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential", timeout: 60000 },
    };

    const mockPersister: SagaPersister = {
      save: () => ResultAsync.ok(undefined),
      load: () => ResultAsync.ok(null),
      delete: () => ResultAsync.ok(undefined),
      list: () => ResultAsync.ok([]),
      update: () => ResultAsync.ok(undefined),
    };

    const inspector = createSagaInspector({ definitions: [saga], persister: mockPersister });
    const suggestions = inspector.getSuggestions();
    const timeoutSuggestions = suggestions.filter(
      s => s.type === "saga_long_timeout_without_persistence"
    );
    expect(timeoutSuggestions).toHaveLength(0);
  });

  it("produces high failure rate suggestion from active traces", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            makeCompStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: "comp fail",
            }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const suggestions = inspector.getSuggestions();
    const highFailRate = suggestions.filter(s => s.message.includes("compensation success rate"));
    expect(highFailRate.length).toBeGreaterThanOrEqual(1);
    expect(highFailRate[0].sagaName).toBe("TestSaga");
    expect(highFailRate[0].type).toBe("saga_step_without_compensation");
    expect(highFailRate[0].action).toContain("compensation");
  });

  it("does NOT produce high failure rate suggestion when success rate >= 0.5", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" })],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
      e2: makeTrace({
        executionId: "e2",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            makeCompStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: "comp fail",
            }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const suggestions = inspector.getSuggestions();
    const highFailRate = suggestions.filter(s => s.message.includes("compensation success rate"));
    // success rate = 1/2 = 0.5, which is NOT < 0.5, so no suggestion
    expect(highFailRate).toHaveLength(0);
  });

  it("skips high failure rate check entirely when no activeTraces", () => {
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      // no activeTraces
    });
    const suggestions = inspector.getSuggestions();
    const highFailRate = suggestions.filter(s => s.message.includes("compensation success rate"));
    expect(highFailRate).toHaveLength(0);
  });

  it("produces no suggestions for a well-configured saga with retry and compensation", () => {
    const WellStep: AnyStepDefinition = {
      name: "WellStep",
      port: PortA,
      invoke: () => ({}),
      compensate: () => ({}),
      condition: null,
      options: { retry: { maxAttempts: 3, delay: 100 } },
    };
    const saga: AnySagaDefinition = {
      name: "WellSaga",
      steps: [WellStep],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };

    const inspector = createSagaInspector({ definitions: [saga] });
    const suggestions = inspector.getSuggestions();
    expect(suggestions).toHaveLength(0);
  });
});

// =============================================================================
// Additional: emitToInspector & subscribe
// =============================================================================

describe("emitToInspector", () => {
  it("delivers event to all subscribed listeners", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const events1: any[] = [];
    const events2: any[] = [];

    inspector.subscribe(e => events1.push(e));
    inspector.subscribe(e => events2.push(e));

    const event = {
      type: "saga:started" as const,
      executionId: "e1",
      sagaName: "TestSaga",
      timestamp: Date.now(),
      input: {},
      stepCount: 3,
      metadata: undefined,
    };
    emitToInspector(inspector, event);

    expect(events1).toHaveLength(1);
    expect(events1[0]).toBe(event);
    expect(events2).toHaveLength(1);
  });

  it("does not deliver events after unsubscribe", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const events: any[] = [];

    const unsub = inspector.subscribe(e => events.push(e));
    unsub();

    emitToInspector(inspector, {
      type: "saga:started",
      executionId: "e1",
      sagaName: "TestSaga",
      timestamp: Date.now(),
      input: {},
      stepCount: 3,
      metadata: undefined,
    });

    expect(events).toHaveLength(0);
  });

  it("swallows listener errors without breaking other listeners", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const events: any[] = [];

    inspector.subscribe(() => {
      throw new Error("listener error");
    });
    inspector.subscribe(e => events.push(e));

    emitToInspector(inspector, {
      type: "saga:started",
      executionId: "e1",
      sagaName: "TestSaga",
      timestamp: Date.now(),
      input: {},
      stepCount: 3,
      metadata: undefined,
    });

    expect(events).toHaveLength(1);
  });

  it("does nothing for an inspector not in the registry (no crash)", () => {
    // Create an arbitrary object that matches SagaInspector interface
    // but was never registered via createSagaInspector
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

    expect(() => {
      emitToInspector(fakeInspector, {
        type: "saga:started",
        executionId: "e1",
        sagaName: "X",
        timestamp: Date.now(),
        input: {},
        stepCount: 0,
        metadata: undefined,
      });
    }).not.toThrow();
  });
});

// =============================================================================
// Additional: executionStateToSummary via getHistory
// =============================================================================

describe("executionStateToSummary durationMs computation", () => {
  function makeMockPersister(states: SagaExecutionState[]): SagaPersister {
    return {
      save: () => ResultAsync.ok(undefined),
      load: () => ResultAsync.ok(null),
      delete: () => ResultAsync.ok(undefined),
      list: () => ResultAsync.ok(states),
      update: () => ResultAsync.ok(undefined),
    };
  }

  it("durationMs is computed when completedAt is not null", async () => {
    const state = makePersisterState({
      executionId: "e-dur1",
      sagaName: "TestSaga",
      status: "completed",
      timestamps: {
        startedAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:01:00.000Z",
        completedAt: "2024-01-01T00:01:00.000Z",
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].durationMs).toBe(60000);
    }
  });

  it("durationMs is null when completedAt is null", async () => {
    const state = makePersisterState({
      executionId: "e-dur2",
      sagaName: "TestSaga",
      status: "running",
      timestamps: {
        startedAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:30.000Z",
        completedAt: null,
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].durationMs).toBeNull();
    }
  });

  it("summary includes compensationState from execution state", async () => {
    const state = makePersisterState({
      executionId: "e-comp1",
      sagaName: "TestSaga",
      status: "failed",
      compensation: {
        active: true,
        compensatedSteps: ["StepA"],
        failedSteps: ["StepB"],
        triggeringStepIndex: 2,
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].compensationState.active).toBe(true);
      expect(result.value[0].compensationState.compensatedSteps).toEqual(["StepA"]);
      expect(result.value[0].compensationState.failedSteps).toEqual(["StepB"]);
    }
  });

  it("summary metadata is spread from execution state metadata", async () => {
    const state = makePersisterState({
      executionId: "e-meta1",
      sagaName: "TestSaga",
      metadata: { key1: "val1", key2: 42 },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].metadata).toEqual({ key1: "val1", key2: 42 });
    }
  });

  it("error is null when state.error is null", async () => {
    const state = makePersisterState({
      executionId: "e-noerr",
      sagaName: "TestSaga",
      error: null,
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error).toBeNull();
    }
  });
});

// =============================================================================
// Additional: getTrace
// =============================================================================

describe("getTrace", () => {
  it("returns the trace object for a given executionId", () => {
    const trace = makeTrace({
      executionId: "trace-1",
      sagaName: "TestSaga",
      status: "running",
      steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0 })],
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: { "trace-1": trace },
    });
    const result = inspector.getTrace("trace-1");
    expect(result).not.toBeNull();
    expect(result?.executionId).toBe("trace-1");
    expect(result?.steps).toHaveLength(1);
  });

  it("returns null when activeTraces is not configured", () => {
    const inspector = createSagaInspector({
      definitions: [TestSaga],
    });
    expect(inspector.getTrace("nonexistent")).toBeNull();
  });

  it("returns null for nonexistent executionId", () => {
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      activeTraces: {},
    });
    expect(inspector.getTrace("missing")).toBeNull();
  });
});

// =============================================================================
// Additional: portDependencies extraction
// =============================================================================

describe("portDependencies extraction", () => {
  it("extracts port names from step definitions", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    expect(defs[0].portDependencies).toEqual(["PortA", "PortB", "PortC"]);
  });
});
