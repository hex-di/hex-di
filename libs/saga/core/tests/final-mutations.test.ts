/**
 * Final mutation-killing tests for @hex-di/saga.
 *
 * Targets surviving mutants across:
 *   1. compensation/engine.ts (20 survivors)
 *   2. persistence/in-memory.ts (15 survivors)
 *   3. step/builder.ts (12 survivors)
 *   4. integration/executor.ts (6 survivors)
 *   5. ports/factory.ts (4 survivors)
 *   6. saga/builder-bridges.ts (3 survivors)
 *   7. saga/builder.ts (2 survivors)
 *   8. step/builder-bridges.ts (1 NoCoverage)
 *   9. runtime/runner-bridges.ts (1 survivor)
 *  10. runtime/id.ts (1 survivor)
 */

import { describe, it, expect, vi } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createPort } from "@hex-di/core";
import { executeCompensation } from "../src/compensation/engine.js";
import type { CompensationPlanStep } from "../src/compensation/types.js";
import type { CompensationInvoker } from "../src/compensation/engine.js";
import type { SagaEvent } from "../src/runtime/types.js";
import { createInMemoryPersister } from "../src/persistence/in-memory.js";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaExecutor, createSagaManagementExecutor } from "../src/integration/executor.js";
import {
  sagaPort,
  sagaManagementPort,
  SagaPersisterPort,
  SagaRegistryPort,
  SagaInspectorPort,
} from "../src/ports/factory.js";
import { extractBranchSteps, widenStepsArray } from "../src/saga/builder-bridges.js";
import { generateExecutionId } from "../src/runtime/id.js";
import { createResumeNotImplemented } from "../src/runtime/runner-bridges.js";
import { getPort } from "../src/step/builder-bridges.js";
import type { SagaExecutionState, SagaPersister } from "../src/ports/types.js";

// =============================================================================
// Shared Helpers
// =============================================================================

const TestPort = createPort<"TestPort", { execute: (p: unknown) => unknown }>({
  name: "TestPort",
  description: "Test port for mutations",
});

function makeCompensationStep(
  name: string,
  index: number,
  result: unknown = `result-${name}`,
  compensateFn?: (ctx: any) => unknown
): CompensationPlanStep {
  return {
    stepName: name,
    stepIndex: index,
    result,
    compensateFn: compensateFn ?? ((ctx: any) => ({ undo: ctx.stepResult })),
  };
}

function makeThrowingCompensationStep(name: string, index: number): CompensationPlanStep {
  return {
    stepName: name,
    stepIndex: index,
    result: `result-${name}`,
    compensateFn: () => {
      throw new Error(`compensateFn threw for ${name}`);
    },
  };
}

function makeNullCompensateStep(name: string, index: number): CompensationPlanStep {
  return {
    stepName: name,
    stepIndex: index,
    result: `result-${name}`,
    compensateFn: null as any,
  };
}

function makeSuccessInvoker(): { invoker: CompensationInvoker; calls: string[] } {
  const calls: string[] = [];
  const invoker: CompensationInvoker = (step, _params) => {
    calls.push(step.stepName);
    return ResultAsync.ok(undefined);
  };
  return { invoker, calls };
}

function makeFailingInvoker(failSteps: Set<string>): {
  invoker: CompensationInvoker;
  calls: string[];
} {
  const calls: string[] = [];
  const invoker: CompensationInvoker = (step, _params) => {
    calls.push(step.stepName);
    if (failSteps.has(step.stepName)) {
      return ResultAsync.err(new Error(`Invoker failed for ${step.stepName}`));
    }
    return ResultAsync.ok(undefined);
  };
  return { invoker, calls };
}

function makeState(overrides: Partial<SagaExecutionState> = {}): SagaExecutionState {
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

// =============================================================================
// 1. compensation/engine.ts - Kill 20 survivors
// =============================================================================

describe("compensation/engine.ts mutation killers", () => {
  // -------------------------------------------------------------------------
  // emitEvent callback mutations (L92, L157, L158, L224)
  // ArrowFunction => () => undefined
  // -------------------------------------------------------------------------

  describe("sequential strategy with emitEvent", () => {
    it("emits compensation:step events with success=true for each compensated step", async () => {
      const events: SagaEvent[] = [];
      const emitEvent = (event: SagaEvent) => {
        events.push(event);
      };
      const { invoker } = makeSuccessInvoker();

      const result = await executeCompensation({
        plan: {
          completedSteps: [makeCompensationStep("stepA", 0), makeCompensationStep("stepB", 1)],
          strategy: "sequential",
        },
        invoker,
        sagaInput: { orderId: 1 },
        accumulatedResults: { stepA: "a", stepB: "b" },
        originalError: new Error("original"),
        failedStepIndex: 2,
        failedStepName: "stepC",
        executionId: "exec-42",
        sagaName: "MySaga",
        emitEvent,
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.compensatedSteps).toEqual(["stepB", "stepA"]);
      expect(result.failedSteps).toEqual([]);

      // Verify step events were emitted (not replaced by () => undefined)
      const stepEvents = events.filter(e => e.type === "compensation:step");
      expect(stepEvents).toHaveLength(2);
      for (const evt of stepEvents) {
        if (evt.type === "compensation:step") {
          expect(evt.success).toBe(true);
          expect(evt.executionId).toBe("exec-42");
          expect(evt.sagaName).toBe("MySaga");
          expect(typeof evt.durationMs).toBe("number");
          expect(evt.durationMs).toBeGreaterThanOrEqual(0);
        }
      }

      // Verify compensation:completed event
      const completedEvents = events.filter(e => e.type === "compensation:completed");
      expect(completedEvents).toHaveLength(1);
      if (completedEvents[0].type === "compensation:completed") {
        expect(completedEvents[0].compensatedSteps).toEqual(["stepB", "stepA"]);
        expect(completedEvents[0].totalDurationMs).toBeGreaterThanOrEqual(0);
      }
    });

    it("emits compensation:step with success=false and compensation:failed on invoker failure", async () => {
      const events: SagaEvent[] = [];
      const emitEvent = (event: SagaEvent) => {
        events.push(event);
      };
      const { invoker } = makeFailingInvoker(new Set(["stepB"]));

      const result = await executeCompensation({
        plan: {
          completedSteps: [
            makeCompensationStep("stepA", 0),
            makeCompensationStep("stepB", 1),
            makeCompensationStep("stepC", 2),
          ],
          strategy: "sequential",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("original"),
        failedStepIndex: 3,
        failedStepName: "stepD",
        executionId: "exec-seq-fail",
        sagaName: "FailSaga",
        emitEvent,
      });

      // Sequential reverses: stepC, stepB, stepA. stepB fails => stops.
      expect(result.allSucceeded).toBe(false);
      expect(result.compensatedSteps).toEqual(["stepC"]);
      expect(result.failedSteps).toEqual(["stepB"]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stepName).toBe("stepB");
      expect(result.errors[0].stepIndex).toBe(1);

      // Verify failure event
      const failedEvents = events.filter(e => e.type === "compensation:failed");
      expect(failedEvents).toHaveLength(1);
      if (failedEvents[0].type === "compensation:failed") {
        expect(failedEvents[0].failedCompensationStep).toBe("stepB");
        expect(failedEvents[0].compensatedSteps).toEqual(["stepC"]);
        expect(failedEvents[0].remainingSteps).toEqual(["stepA"]);
      }

      // No compensation:completed when there are failures
      const completedEvents = events.filter(e => e.type === "compensation:completed");
      expect(completedEvents).toHaveLength(0);
    });

    it("emits compensation:failed when compensateFn itself throws (paramsResult.isErr)", async () => {
      const events: SagaEvent[] = [];
      const emitEvent = (event: SagaEvent) => {
        events.push(event);
      };
      const { invoker } = makeSuccessInvoker();

      const result = await executeCompensation({
        plan: {
          completedSteps: [
            makeCompensationStep("stepA", 0),
            makeThrowingCompensationStep("stepB", 1),
            makeCompensationStep("stepC", 2),
          ],
          strategy: "sequential",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("original"),
        failedStepIndex: 3,
        failedStepName: "stepD",
        executionId: "exec-throw",
        sagaName: "ThrowSaga",
        emitEvent,
      });

      // Reversed: stepC, stepB (throws), stepA (not reached)
      expect(result.allSucceeded).toBe(false);
      expect(result.compensatedSteps).toEqual(["stepC"]);
      expect(result.failedSteps).toEqual(["stepB"]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stepName).toBe("stepB");
      expect(result.errors[0].cause).toBeInstanceOf(Error);

      // Verify events
      const stepEvents = events.filter(e => e.type === "compensation:step");
      expect(stepEvents.length).toBeGreaterThanOrEqual(2);

      const failedStepEvents = stepEvents.filter(e => e.type === "compensation:step" && !e.success);
      expect(failedStepEvents).toHaveLength(1);
      if (failedStepEvents[0].type === "compensation:step") {
        expect(failedStepEvents[0].stepName).toBe("stepB");
      }

      const compensationFailedEvents = events.filter(e => e.type === "compensation:failed");
      expect(compensationFailedEvents).toHaveLength(1);
      if (compensationFailedEvents[0].type === "compensation:failed") {
        expect(compensationFailedEvents[0].remainingSteps).toEqual(["stepA"]);
      }
    });
  });

  describe("parallel strategy with emitEvent", () => {
    it("emits step events for each parallel step and compensation:completed on success", async () => {
      const events: SagaEvent[] = [];
      const emitEvent = (event: SagaEvent) => {
        events.push(event);
      };
      const { invoker } = makeSuccessInvoker();

      const result = await executeCompensation({
        plan: {
          completedSteps: [makeCompensationStep("stepA", 0), makeCompensationStep("stepB", 1)],
          strategy: "parallel",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: { stepA: "a", stepB: "b" },
        originalError: new Error("orig"),
        failedStepIndex: 2,
        failedStepName: "stepC",
        executionId: "exec-par-ok",
        sagaName: "ParSaga",
        emitEvent,
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.compensatedSteps).toContain("stepA");
      expect(result.compensatedSteps).toContain("stepB");
      expect(result.failedSteps).toEqual([]);
      expect(result.errors).toEqual([]);

      const stepEvents = events.filter(e => e.type === "compensation:step");
      expect(stepEvents).toHaveLength(2);
      for (const evt of stepEvents) {
        if (evt.type === "compensation:step") {
          expect(evt.success).toBe(true);
        }
      }

      const completedEvents = events.filter(e => e.type === "compensation:completed");
      expect(completedEvents).toHaveLength(1);
    });

    it("emits compensation:failed on parallel strategy when some steps fail", async () => {
      const events: SagaEvent[] = [];
      const emitEvent = (event: SagaEvent) => {
        events.push(event);
      };
      const { invoker } = makeFailingInvoker(new Set(["stepA"]));

      const result = await executeCompensation({
        plan: {
          completedSteps: [makeCompensationStep("stepA", 0), makeCompensationStep("stepB", 1)],
          strategy: "parallel",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("orig"),
        failedStepIndex: 2,
        failedStepName: "stepC",
        executionId: "exec-par-fail",
        sagaName: "ParFailSaga",
        emitEvent,
      });

      expect(result.allSucceeded).toBe(false);
      expect(result.failedSteps).toContain("stepA");
      expect(result.compensatedSteps).toContain("stepB");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stepName).toBe("stepA");

      const failedEvents = events.filter(e => e.type === "compensation:failed");
      expect(failedEvents).toHaveLength(1);
      if (failedEvents[0].type === "compensation:failed") {
        expect(failedEvents[0].failedCompensationStep).toBe("stepA");
      }

      // No completed event when there are failures
      const completedEvents = events.filter(e => e.type === "compensation:completed");
      expect(completedEvents).toHaveLength(0);
    });

    it("parallel: compensateFn throwing causes stepCompensationFailed outcome", async () => {
      const events: SagaEvent[] = [];
      const emitEvent = (event: SagaEvent) => {
        events.push(event);
      };
      const { invoker } = makeSuccessInvoker();

      const result = await executeCompensation({
        plan: {
          completedSteps: [
            makeThrowingCompensationStep("stepA", 0),
            makeCompensationStep("stepB", 1),
          ],
          strategy: "parallel",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("orig"),
        failedStepIndex: 2,
        failedStepName: "stepC",
        executionId: "exec-par-throw",
        sagaName: "ParThrowSaga",
        emitEvent,
      });

      expect(result.allSucceeded).toBe(false);
      expect(result.failedSteps).toContain("stepA");
      expect(result.compensatedSteps).toContain("stepB");

      // Verify error object construction (L97/L162/L229 ObjectLiteral NoCoverage)
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stepName).toBe("stepA");
      expect(result.errors[0].stepIndex).toBe(0);
      expect(result.errors[0].cause).toBeInstanceOf(Error);
    });
  });

  describe("best-effort strategy with emitEvent", () => {
    it("continues compensating after invoker failure and emits all events", async () => {
      const events: SagaEvent[] = [];
      const emitEvent = (event: SagaEvent) => {
        events.push(event);
      };
      const { invoker, calls } = makeFailingInvoker(new Set(["stepB"]));

      const result = await executeCompensation({
        plan: {
          completedSteps: [
            makeCompensationStep("stepA", 0),
            makeCompensationStep("stepB", 1),
            makeCompensationStep("stepC", 2),
          ],
          strategy: "best-effort",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("orig"),
        failedStepIndex: 3,
        failedStepName: "stepD",
        executionId: "exec-be",
        sagaName: "BestEffortSaga",
        emitEvent,
      });

      // Best effort: reversed is stepC, stepB (fail), stepA. All attempted.
      expect(result.allSucceeded).toBe(false);
      expect(result.compensatedSteps).toEqual(["stepC", "stepA"]);
      expect(result.failedSteps).toEqual(["stepB"]);
      expect(calls).toEqual(["stepC", "stepB", "stepA"]);

      // Verify errors array
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stepName).toBe("stepB");
      expect(result.errors[0].stepIndex).toBe(1);
      expect(result.errors[0].cause).toBeInstanceOf(Error);

      // Verify step events
      const stepEvents = events.filter(e => e.type === "compensation:step");
      expect(stepEvents).toHaveLength(3);

      // Verify compensation:failed event (not compensation:completed)
      const failedEvents = events.filter(e => e.type === "compensation:failed");
      expect(failedEvents).toHaveLength(1);
      if (failedEvents[0].type === "compensation:failed") {
        expect(failedEvents[0].failedCompensationStep).toBe("stepB");
      }

      const completedEvents = events.filter(e => e.type === "compensation:completed");
      expect(completedEvents).toHaveLength(0);
    });

    it("best-effort with all successes emits compensation:completed", async () => {
      const events: SagaEvent[] = [];
      const emitEvent = (event: SagaEvent) => {
        events.push(event);
      };
      const { invoker } = makeSuccessInvoker();

      const result = await executeCompensation({
        plan: {
          completedSteps: [makeCompensationStep("stepA", 0), makeCompensationStep("stepB", 1)],
          strategy: "best-effort",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("orig"),
        failedStepIndex: 2,
        failedStepName: "stepC",
        executionId: "exec-be-ok",
        sagaName: "BEOkSaga",
        emitEvent,
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.compensatedSteps).toEqual(["stepB", "stepA"]);

      const completedEvents = events.filter(e => e.type === "compensation:completed");
      expect(completedEvents).toHaveLength(1);
    });

    it("best-effort with compensateFn throwing continues to next step", async () => {
      const events: SagaEvent[] = [];
      const emitEvent = (event: SagaEvent) => {
        events.push(event);
      };
      const { invoker, calls } = makeSuccessInvoker();

      const result = await executeCompensation({
        plan: {
          completedSteps: [
            makeCompensationStep("stepA", 0),
            makeThrowingCompensationStep("stepB", 1),
            makeCompensationStep("stepC", 2),
          ],
          strategy: "best-effort",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("orig"),
        failedStepIndex: 3,
        failedStepName: "stepD",
        executionId: "exec-be-throw",
        sagaName: "BEThrowSaga",
        emitEvent,
      });

      // Reversed: stepC, stepB (throws in compensateFn), stepA
      // stepB fails at paramsResult level, stepC and stepA succeed
      expect(result.compensatedSteps).toEqual(["stepC", "stepA"]);
      expect(result.failedSteps).toEqual(["stepB"]);
      expect(calls).toEqual(["stepC", "stepA"]); // stepB never reaches invoker

      // Verify error has correct structure
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stepName).toBe("stepB");
      expect(result.errors[0].stepIndex).toBe(1);
      expect(result.errors[0].cause).toBeInstanceOf(Error);
    });
  });

  // -------------------------------------------------------------------------
  // L256: allSucceeded check (ConditionalExpression => false)
  // -------------------------------------------------------------------------
  describe("allSucceeded correctness", () => {
    it("sequential: allSucceeded is true when no failures", async () => {
      const { invoker } = makeSuccessInvoker();
      const result = await executeCompensation({
        plan: {
          completedSteps: [makeCompensationStep("s1", 0)],
          strategy: "sequential",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("e"),
        failedStepIndex: 1,
        failedStepName: "s2",
        executionId: "e1",
        sagaName: "S",
      });
      expect(result.allSucceeded).toBe(true);
      expect(result.failedSteps.length).toBe(0);
    });

    it("parallel: allSucceeded is false when any step fails", async () => {
      const { invoker } = makeFailingInvoker(new Set(["s1"]));
      const result = await executeCompensation({
        plan: {
          completedSteps: [makeCompensationStep("s1", 0), makeCompensationStep("s2", 1)],
          strategy: "parallel",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("e"),
        failedStepIndex: 2,
        failedStepName: "s3",
        executionId: "e1",
        sagaName: "S",
      });
      expect(result.allSucceeded).toBe(false);
      expect(result.failedSteps.length).toBeGreaterThan(0);
    });

    it("best-effort: allSucceeded is false when any step fails", async () => {
      const { invoker } = makeFailingInvoker(new Set(["s2"]));
      const result = await executeCompensation({
        plan: {
          completedSteps: [makeCompensationStep("s1", 0), makeCompensationStep("s2", 1)],
          strategy: "best-effort",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("e"),
        failedStepIndex: 2,
        failedStepName: "s3",
        executionId: "e1",
        sagaName: "S",
      });
      expect(result.allSucceeded).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // L302: empty compensation plan
  // L305/L306: ArrayDeclaration => ["Stryker was here"]
  // -------------------------------------------------------------------------
  describe("empty compensation plan", () => {
    it("returns allSucceeded=true with empty arrays when no steps to compensate", async () => {
      const { invoker } = makeSuccessInvoker();
      const result = await executeCompensation({
        plan: {
          completedSteps: [],
          strategy: "sequential",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("e"),
        failedStepIndex: 0,
        failedStepName: "s",
        executionId: "e1",
        sagaName: "S",
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.compensatedSteps).toEqual([]);
      expect(result.failedSteps).toEqual([]);
      expect(result.errors).toEqual([]);
      // Specifically test empty arrays are not ["Stryker was here"]
      expect(result.compensatedSteps).toHaveLength(0);
      expect(result.failedSteps).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("filters out steps with null compensateFn", async () => {
      const { invoker, calls } = makeSuccessInvoker();
      const result = await executeCompensation({
        plan: {
          completedSteps: [makeNullCompensateStep("noComp", 0), makeCompensationStep("hasComp", 1)],
          strategy: "sequential",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("e"),
        failedStepIndex: 2,
        failedStepName: "s",
        executionId: "e1",
        sagaName: "S",
      });

      expect(result.compensatedSteps).toEqual(["hasComp"]);
      expect(calls).toEqual(["hasComp"]);
    });
  });

  // -------------------------------------------------------------------------
  // L323: strategy switch (ConditionalExpression => case "parallel")
  // Ensure each strategy path is actually called
  // -------------------------------------------------------------------------
  describe("strategy dispatch", () => {
    it("sequential reverses execution order", async () => {
      const { invoker, calls } = makeSuccessInvoker();
      await executeCompensation({
        plan: {
          completedSteps: [
            makeCompensationStep("first", 0),
            makeCompensationStep("second", 1),
            makeCompensationStep("third", 2),
          ],
          strategy: "sequential",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("e"),
        failedStepIndex: 3,
        failedStepName: "fourth",
        executionId: "e1",
        sagaName: "S",
      });
      expect(calls).toEqual(["third", "second", "first"]);
    });

    it("parallel runs all steps (not reversed)", async () => {
      const { invoker, calls } = makeSuccessInvoker();
      await executeCompensation({
        plan: {
          completedSteps: [
            makeCompensationStep("first", 0),
            makeCompensationStep("second", 1),
            makeCompensationStep("third", 2),
          ],
          strategy: "parallel",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("e"),
        failedStepIndex: 3,
        failedStepName: "fourth",
        executionId: "e1",
        sagaName: "S",
      });
      // Parallel runs all steps, order preserved in input (not reversed)
      expect(calls).toHaveLength(3);
      expect(calls).toContain("first");
      expect(calls).toContain("second");
      expect(calls).toContain("third");
    });

    it("best-effort reverses and continues after failure", async () => {
      const { invoker, calls } = makeFailingInvoker(new Set(["second"]));
      const result = await executeCompensation({
        plan: {
          completedSteps: [
            makeCompensationStep("first", 0),
            makeCompensationStep("second", 1),
            makeCompensationStep("third", 2),
          ],
          strategy: "best-effort",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("e"),
        failedStepIndex: 3,
        failedStepName: "fourth",
        executionId: "e1",
        sagaName: "S",
      });
      // All 3 invoked despite second failing
      expect(calls).toEqual(["third", "second", "first"]);
      expect(result.compensatedSteps).toEqual(["third", "first"]);
      expect(result.failedSteps).toEqual(["second"]);
    });
  });

  // -------------------------------------------------------------------------
  // L178: ObjectLiteral => {} (accumulated results for parallel)
  // -------------------------------------------------------------------------
  describe("accumulated results passthrough", () => {
    it("passes accumulatedResults through to compensateFn context", async () => {
      const receivedCtxs: any[] = [];
      const step = makeCompensationStep("s1", 0, "the-result", (ctx: any) => {
        receivedCtxs.push(ctx);
        return { undone: true };
      });

      const { invoker } = makeSuccessInvoker();
      await executeCompensation({
        plan: {
          completedSteps: [step],
          strategy: "sequential",
        },
        invoker,
        sagaInput: { orderId: 99 },
        accumulatedResults: { s0: "prev-result" },
        originalError: new Error("fail"),
        failedStepIndex: 1,
        failedStepName: "s2",
        executionId: "exec-ctx",
        sagaName: "CtxSaga",
      });

      expect(receivedCtxs).toHaveLength(1);
      expect(receivedCtxs[0].input).toEqual({ orderId: 99 });
      expect(receivedCtxs[0].results).toEqual({ s0: "prev-result" });
      expect(receivedCtxs[0].stepResult).toBe("the-result");
      expect(receivedCtxs[0].error).toBeInstanceOf(Error);
      expect(receivedCtxs[0].failedStepIndex).toBe(1);
      expect(receivedCtxs[0].failedStepName).toBe("s2");
      expect(receivedCtxs[0].executionId).toBe("exec-ctx");
    });
  });

  // -------------------------------------------------------------------------
  // Test without emitEvent (undefined path)
  // -------------------------------------------------------------------------
  describe("no emitEvent", () => {
    it("works correctly without emitEvent callback", async () => {
      const { invoker } = makeSuccessInvoker();
      const result = await executeCompensation({
        plan: {
          completedSteps: [makeCompensationStep("s1", 0)],
          strategy: "sequential",
        },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("e"),
        failedStepIndex: 1,
        failedStepName: "s2",
        executionId: "e1",
        sagaName: "S",
        // emitEvent intentionally omitted
      });
      expect(result.allSucceeded).toBe(true);
    });
  });
});

// =============================================================================
// 2. persistence/in-memory.ts - Kill 15 survivors
// =============================================================================

describe("persistence/in-memory.ts mutation killers", () => {
  it("save error has _tag 'SerializationFailure' not any other tag", async () => {
    const persister = createInMemoryPersister();
    const state = makeState({ input: () => {} });
    const result = await persister.save(state);
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error("expected err");
      },
      err => {
        expect(err._tag).toBe("SerializationFailure");
        // Kill StringLiteral mutations
        expect(err._tag.length).toBeGreaterThan(0);
        if (err._tag === "SerializationFailure") {
          expect(err.cause).toBeDefined();
          expect(err.cause).not.toBeNull();
        }
      }
    );
  });

  it("load returns cloned state for existing ID", async () => {
    const persister = createInMemoryPersister();
    await persister.save(makeState({ executionId: "x1" }));
    const loadResult = await persister.load("x1");
    expect(loadResult.isOk()).toBe(true);
    loadResult.match(
      val => {
        expect(val).not.toBeNull();
        expect(val!.executionId).toBe("x1");
      },
      () => {
        throw new Error("expected ok");
      }
    );
  });

  it("update error has _tag 'SerializationFailure' with cause property", async () => {
    const persister = createInMemoryPersister();
    await persister.save(makeState());
    const result = await persister.update("exec-1", { input: () => {} } as any);
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error("expected err");
      },
      err => {
        expect(err._tag).toBe("SerializationFailure");
        if (err._tag === "SerializationFailure") {
          expect(err.cause).toBeDefined();
          expect(typeof err.cause).not.toBe("undefined");
        }
      }
    );
  });

  it("update NotFound includes executionId string", async () => {
    const persister = createInMemoryPersister();
    const result = await persister.update("missing-id", { status: "failed" });
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error("expected err");
      },
      err => {
        expect(err._tag).toBe("NotFound");
        if (err._tag === "NotFound") {
          expect(err.executionId).toBe("missing-id");
          expect(err.executionId.length).toBeGreaterThan(0);
        }
      }
    );
  });

  it("list filters correctly by sagaName and status", async () => {
    const persister = createInMemoryPersister();
    await persister.save(makeState({ executionId: "a", sagaName: "S1", status: "completed" }));
    await persister.save(makeState({ executionId: "b", sagaName: "S2", status: "failed" }));

    // Verify filter by sagaName works correctly
    const r1 = await persister.list({ sagaName: "S1" });
    r1.match(
      val => {
        expect(val).toHaveLength(1);
        expect(val[0].sagaName).toBe("S1");
        expect(val[0].sagaName).not.toBe("S2");
      },
      () => {
        throw new Error("expected ok");
      }
    );

    // Verify filter by status works correctly
    const r2 = await persister.list({ status: "failed" });
    r2.match(
      val => {
        expect(val).toHaveLength(1);
        expect(val[0].status).toBe("failed");
        expect(val[0].status).not.toBe("completed");
      },
      () => {
        throw new Error("expected ok");
      }
    );
  });

  it("list with combined sagaName and status filters", async () => {
    const persister = createInMemoryPersister();
    await persister.save(makeState({ executionId: "a", sagaName: "S1", status: "completed" }));
    await persister.save(makeState({ executionId: "b", sagaName: "S1", status: "failed" }));
    await persister.save(makeState({ executionId: "c", sagaName: "S2", status: "completed" }));

    const result = await persister.list({ sagaName: "S1", status: "completed" });
    result.match(
      val => {
        expect(val).toHaveLength(1);
        expect(val[0].executionId).toBe("a");
      },
      () => {
        throw new Error("expected ok");
      }
    );
  });

  it("load on non-existent key returns Ok(null) not Ok(undefined)", async () => {
    const persister = createInMemoryPersister();
    const result = await persister.load("nope");
    expect(result.isOk()).toBe(true);
    result.match(
      val => {
        expect(val).toBeNull();
        expect(val).not.toBeUndefined();
      },
      () => {
        throw new Error("expected ok");
      }
    );
  });

  it("delete on non-existent key succeeds silently", async () => {
    const persister = createInMemoryPersister();
    const result = await persister.delete("nonexistent");
    expect(result.isOk()).toBe(true);
  });

  it("save then load returns structurally equal but different reference", async () => {
    const persister = createInMemoryPersister();
    const state = makeState({ executionId: "ref-test", metadata: { key: "value" } });
    await persister.save(state);
    const result = await persister.load("ref-test");
    result.match(
      val => {
        expect(val).toEqual(state);
        expect(val).not.toBe(state);
        // Deep property also cloned
        expect(val!.metadata).toEqual({ key: "value" });
        expect(val!.metadata).not.toBe(state.metadata);
      },
      () => {
        throw new Error("expected ok");
      }
    );
  });
});

// =============================================================================
// 3. step/builder.ts - Kill 12 survivors
// =============================================================================

describe("step/builder.ts mutation killers", () => {
  const invokeMapper = (ctx: any) => ctx.input;

  // L116: typeof delay !== "number" mutations
  it("retry with numeric delay preserves number, not converted to function", () => {
    const step = defineStep("NumDelay")
      .io<{ x: number }, { y: number }>()
      .invoke(TestPort, invokeMapper)
      .retry({ maxAttempts: 3, delay: 1000 })
      .build();

    expect(step.options.retry).toBeDefined();
    expect(step.options.retry!.maxAttempts).toBe(3);
    expect(step.options.retry!.delay).toBe(1000);
    expect(typeof step.options.retry!.delay).toBe("number");
  });

  it("retry with function delay preserves function, not converted to number", () => {
    const delayFn = (attempt: number, _err: unknown) => attempt * 200;
    const step = defineStep("FnDelay")
      .io<{ x: number }, { y: number }>()
      .invoke(TestPort, invokeMapper)
      .retry({ maxAttempts: 3, delay: delayFn })
      .build();

    expect(step.options.retry).toBeDefined();
    expect(typeof step.options.retry!.delay).toBe("function");
    if (typeof step.options.retry!.delay === "function") {
      expect(step.options.retry!.delay(3, new Error("x"))).toBe(600);
    }
  });

  // L136: ObjectLiteral => {} (options bag initialization)
  it("fresh step has all optionsBag fields as undefined", () => {
    const step = defineStep("Fresh")
      .io<{ x: number }, { y: number }>()
      .invoke(TestPort, invokeMapper)
      .build();

    expect(step.options.retry).toBeUndefined();
    expect(step.options.timeout).toBeUndefined();
    expect(step.options.skipCompensation).toBeUndefined();
    expect(step.options.metadata).toBeUndefined();
  });

  // L218, L221: ConditionalExpression mutations on undefined checks
  it("options() with only timeout=undefined does not set timeout", () => {
    const step = defineStep("UndTimeout")
      .io<{ x: number }, { y: number }>()
      .invoke(TestPort, invokeMapper)
      .options({ timeout: undefined })
      .build();

    // timeout: undefined means the check `opts.timeout !== undefined` is false
    expect(step.options.timeout).toBeUndefined();
  });

  it("options() with only skipCompensation=undefined does not set skipCompensation", () => {
    const step = defineStep("UndSkip")
      .io<{ x: number }, { y: number }>()
      .invoke(TestPort, invokeMapper)
      .options({ skipCompensation: undefined })
      .build();

    expect(step.options.skipCompensation).toBeUndefined();
  });

  it("options() with only metadata=undefined does not set metadata", () => {
    const step = defineStep("UndMeta")
      .io<{ x: number }, { y: number }>()
      .invoke(TestPort, invokeMapper)
      .options({ metadata: undefined })
      .build();

    expect(step.options.metadata).toBeUndefined();
  });

  it("options() with all fields defined sets them all", () => {
    const step = defineStep("AllDefined")
      .io<{ x: number }, { y: number }>()
      .invoke(TestPort, invokeMapper)
      .options({
        timeout: 3000,
        skipCompensation: true,
        metadata: { env: "test" },
        retry: { maxAttempts: 2, delay: 100 },
      })
      .build();

    expect(step.options.timeout).toBe(3000);
    expect(step.options.skipCompensation).toBe(true);
    expect(step.options.metadata).toEqual({ env: "test" });
    expect(step.options.retry!.maxAttempts).toBe(2);
    expect(step.options.retry!.delay).toBe(100);
  });

  it("timeout() method sets timeout independently", () => {
    const step = defineStep("Timeout")
      .io<{ x: number }, { y: number }>()
      .invoke(TestPort, invokeMapper)
      .timeout(5000)
      .build();

    expect(step.options.timeout).toBe(5000);
    expect(step.options.retry).toBeUndefined();
  });

  it("retry with retryIf function preserves it after widening", () => {
    const retryIf = (err: unknown) => err instanceof Error;
    const step = defineStep("RetryIf")
      .io<{ x: number }, { y: number }>()
      .invoke(TestPort, invokeMapper)
      .retry({ maxAttempts: 2, delay: 100, retryIf })
      .build();

    expect(step.options.retry!.retryIf).toBeDefined();
    expect(step.options.retry!.retryIf!(new Error("yes"))).toBe(true);
    expect(step.options.retry!.retryIf!("string")).toBe(false);
  });

  it("retry without retryIf leaves retryIf as undefined", () => {
    const step = defineStep("NoRetryIf")
      .io<{ x: number }, { y: number }>()
      .invoke(TestPort, invokeMapper)
      .retry({ maxAttempts: 2, delay: 100 })
      .build();

    expect(step.options.retry!.retryIf).toBeUndefined();
  });
});

// =============================================================================
// 4. integration/executor.ts - Kill 6 survivors
// =============================================================================

describe("integration/executor.ts mutation killers", () => {
  function makeMockRunner(): any {
    return {
      execute: vi.fn().mockReturnValue(ResultAsync.ok({ output: "out", executionId: "e" })),
      resume: vi.fn().mockReturnValue(ResultAsync.ok({ output: "out", executionId: "e" })),
      cancel: vi.fn().mockReturnValue(ResultAsync.ok(undefined)),
      getStatus: vi.fn(),
      subscribe: vi.fn(),
      getTrace: vi.fn(),
    };
  }

  function makePersisterWithStates(states: SagaExecutionState[]): SagaPersister {
    return {
      save: vi.fn(),
      load: vi.fn(),
      delete: vi.fn(),
      list: vi.fn().mockReturnValue(ResultAsync.ok(states)),
      update: vi.fn(),
    };
  }

  // L48: BlockStatement NoCoverage (no persister path)
  it("listExecutions without persister returns Ok([])", async () => {
    const mgmt = createSagaManagementExecutor(makeMockRunner());
    const result = await mgmt.listExecutions();
    expect(result.isOk()).toBe(true);
    result.match(
      summaries => {
        expect(summaries).toEqual([]);
        expect(Array.isArray(summaries)).toBe(true);
        expect(summaries.length).toBe(0);
      },
      () => {
        throw new Error("expected ok");
      }
    );
  });

  // L64-67: toSummary construction (ObjectLiteral/StringLiteral NoCoverage)
  it("toSummary maps all fields from SagaExecutionState", async () => {
    const state = makeState({
      executionId: "exec-sum",
      sagaName: "SumSaga",
      status: "running",
      totalSteps: 4,
      completedSteps: [
        { name: "s1", index: 0, output: null, skipped: false, completedAt: "2024-01-01T00:00:00Z" },
        { name: "s2", index: 1, output: null, skipped: true, completedAt: "2024-01-01T00:00:00Z" },
      ],
      compensation: {
        active: false,
        compensatedSteps: ["s0"],
        failedSteps: [],
        triggeringStepIndex: 0,
      },
      timestamps: {
        startedAt: "2024-06-01T10:00:00Z",
        updatedAt: "2024-06-01T10:01:00Z",
        completedAt: "2024-06-01T10:02:00Z",
      },
    });

    const persister = makePersisterWithStates([state]);
    const mgmt = createSagaManagementExecutor(makeMockRunner(), persister);
    const result = await mgmt.listExecutions();

    result.match(
      summaries => {
        const s = summaries[0];
        expect(s.executionId).toBe("exec-sum");
        expect(s.sagaName).toBe("SumSaga");
        expect(s.status).toBe("running");
        expect(s.stepCount).toBe(4);
        expect(s.completedStepCount).toBe(1); // only s1 is not skipped
        expect(s.compensated).toBe(true); // compensatedSteps > 0 && failedSteps === 0
        expect(s.startedAt).toBe(new Date("2024-06-01T10:00:00Z").getTime());
        expect(s.completedAt).toBe(new Date("2024-06-01T10:02:00Z").getTime());

        // Kill StringLiteral => "" mutations
        expect(s.executionId.length).toBeGreaterThan(0);
        expect(s.sagaName.length).toBeGreaterThan(0);
        expect(s.status.length).toBeGreaterThan(0);
      },
      () => {
        throw new Error("expected ok");
      }
    );
  });

  // L64: ArrowFunction Survived (toSummary mapper)
  it("listExecutions with filters passes through to persister.list", async () => {
    const state = makeState();
    const persister = makePersisterWithStates([state]);
    const mgmt = createSagaManagementExecutor(makeMockRunner(), persister);

    await mgmt.listExecutions({ sagaName: "MySaga", status: "completed", limit: 10 });
    expect(persister.list).toHaveBeenCalledWith({
      sagaName: "MySaga",
      status: "completed",
      limit: 10,
    });
  });

  it("listExecutions without filters passes undefined to persister.list", async () => {
    const persister = makePersisterWithStates([]);
    const mgmt = createSagaManagementExecutor(makeMockRunner(), persister);

    await mgmt.listExecutions();
    expect(persister.list).toHaveBeenCalledWith(undefined);
  });

  it("listExecutions maps persistence error to ManagementError", async () => {
    const persister: SagaPersister = {
      save: vi.fn(),
      load: vi.fn(),
      delete: vi.fn(),
      list: vi
        .fn()
        .mockReturnValue(
          ResultAsync.err({
            _tag: "StorageFailure" as const,
            operation: "list",
            cause: new Error("db down"),
          })
        ),
      update: vi.fn(),
    };
    const mgmt = createSagaManagementExecutor(makeMockRunner(), persister);
    const result = await mgmt.listExecutions();
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error("expected err");
      },
      err => {
        expect(err._tag).toBe("PersistenceFailed");
        if (err._tag === "PersistenceFailed") {
          expect(err.message).toBe("Failed to list executions");
          expect(err.message.length).toBeGreaterThan(0);
          expect(err.operation).toBe("list");
          expect(err.operation.length).toBeGreaterThan(0);
        }
      }
    );
  });

  it("createSagaExecutor execute delegates to runner.execute", async () => {
    const runner = makeMockRunner();
    const saga = defineSaga("TestSaga")
      .input<{ x: number }>()
      .output(r => r)
      .build();

    const executor = createSagaExecutor(runner, saga);
    await executor.execute({ x: 1 } as any);
    expect(runner.execute).toHaveBeenCalledWith(saga, { x: 1 }, undefined);
  });

  it("management executor delegates resume, cancel, getStatus", async () => {
    const runner = makeMockRunner();
    runner.getStatus = vi.fn().mockReturnValue(
      ResultAsync.ok({
        state: "completed",
        executionId: "e1",
        sagaName: "S",
        completedSteps: [],
        startedAt: Date.now(),
        completedAt: Date.now(),
        durationMs: 100,
      })
    );
    const mgmt = createSagaManagementExecutor(runner);
    await mgmt.resume("e1");
    expect(runner.resume).toHaveBeenCalledWith("e1");
    await mgmt.cancel("e1");
    expect(runner.cancel).toHaveBeenCalledWith("e1");
    await mgmt.getStatus("e1");
    expect(runner.getStatus).toHaveBeenCalledWith("e1");
  });
});

// =============================================================================
// 5. ports/factory.ts - Kill 4 survivors (StringLiteral => "")
// =============================================================================

describe("ports/factory.ts mutation killers", () => {
  it("sagaPort factory creates port with non-empty __portName", () => {
    const port = sagaPort<{ x: number }, { y: number }>()({ name: "OrderSaga" });
    expect(port.__portName).toBe("OrderSaga");
    expect(port.__portName.length).toBeGreaterThan(0);
    expect(port.__portName).not.toBe("");
  });

  it("sagaManagementPort factory creates port with non-empty __portName", () => {
    const port = sagaManagementPort<{ y: number }>()({ name: "OrderMgmt" });
    expect(port.__portName).toBe("OrderMgmt");
    expect(port.__portName.length).toBeGreaterThan(0);
    expect(port.__portName).not.toBe("");
  });

  it("SagaPersisterPort has non-empty name", () => {
    expect(SagaPersisterPort.__portName).toBe("SagaPersister");
    expect(SagaPersisterPort.__portName).not.toBe("");
  });

  it("SagaRegistryPort has non-empty name", () => {
    expect(SagaRegistryPort.__portName).toBe("SagaRegistry");
    expect(SagaRegistryPort.__portName).not.toBe("");
  });

  it("SagaInspectorPort has non-empty name", () => {
    expect(SagaInspectorPort.__portName).toBe("SagaInspector");
    expect(SagaInspectorPort.__portName).not.toBe("");
  });

  it("sagaPort with description passes it through", () => {
    const port = sagaPort<unknown, unknown>()({
      name: "Described",
      description: "A saga port with description",
    });
    expect(port.__portName).toBe("Described");
  });
});

// =============================================================================
// 6. saga/builder-bridges.ts - Kill 3 survivors
// =============================================================================

describe("saga/builder-bridges.ts mutation killers", () => {
  // L200: ArrayDeclaration => ["Stryker was here"]
  // L201, L202: BlockStatement => {}
  it("extractBranchSteps collects all steps from all branches", () => {
    const step1 = defineStep("branchStep1")
      .io<unknown, unknown>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();
    const step2 = defineStep("branchStep2")
      .io<unknown, unknown>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();
    const step3 = defineStep("branchStep3")
      .io<unknown, unknown>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();

    const branches = {
      a: [step1],
      b: [step2, step3],
    };

    const extracted = [...extractBranchSteps(branches)];
    expect(extracted).toHaveLength(3);
    expect(extracted[0].name).toBe("branchStep1");
    expect(extracted[1].name).toBe("branchStep2");
    expect(extracted[2].name).toBe("branchStep3");
  });

  it("extractBranchSteps with empty branches returns empty iterable", () => {
    const extracted = [...extractBranchSteps({})];
    expect(extracted).toHaveLength(0);
    expect(extracted).toEqual([]);
  });

  it("extractBranchSteps with single-branch single-step", () => {
    const step = defineStep("onlyStep")
      .io<unknown, unknown>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();

    const extracted = [...extractBranchSteps({ only: [step] })];
    expect(extracted).toHaveLength(1);
    expect(extracted[0].name).toBe("onlyStep");
  });

  it("widenStepsArray returns a new copy array", () => {
    const step = defineStep("s1")
      .io<unknown, unknown>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();

    const original = [step];
    const widened = widenStepsArray(original);
    expect(widened).toEqual(original);
    expect(widened).not.toBe(original);
    expect(widened).toHaveLength(1);
  });

  it("buildSagaDefinition produces correct structure with steps array", () => {
    const step = defineStep("s1")
      .io<unknown, unknown>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();

    const saga = defineSaga("BridgeSaga")
      .input<unknown>()
      .step(step)
      .output(r => r)
      .build();

    expect(saga.name).toBe("BridgeSaga");
    expect(saga.steps).toHaveLength(1);
    expect(saga.steps[0].name).toBe("s1");
    expect(saga.outputMapper).toBeDefined();
    expect(saga.options).toBeDefined();
    expect(saga.options.compensationStrategy).toBe("sequential");
  });
});

// =============================================================================
// 7. saga/builder.ts - Kill 2 survivors (L217, L247: BlockStatement => {})
// =============================================================================

describe("saga/builder.ts mutation killers", () => {
  // L217: parallel() block
  it("parallel() adds steps to the saga steps array", () => {
    const step1 = defineStep("ps1")
      .io<unknown, unknown>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();
    const step2 = defineStep("ps2")
      .io<unknown, unknown>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();

    const saga = defineSaga("ParSaga")
      .input<unknown>()
      .parallel([step1, step2])
      .output(r => r)
      .build();

    // Use runtime access to avoid tuple type errors
    const steps: any[] = saga.steps;
    expect(steps).toHaveLength(2);
    expect(steps[0].name).toBe("ps1");
    expect(steps[1].name).toBe("ps2");
  });

  // L247: branch() block
  it("branch() adds branch steps to saga steps and creates branch node", () => {
    const step1 = defineStep("bs1")
      .io<unknown, unknown>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();
    const step2 = defineStep("bs2")
      .io<unknown, unknown>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();

    const saga = defineSaga("BranchSaga")
      .input<unknown>()
      .branch(() => "a" as "a" | "b", { a: [step1], b: [step2] })
      .output(r => r)
      .build();

    // Branch steps should be added to the saga's steps array (use runtime access)
    const steps: any[] = saga.steps;
    expect(steps).toHaveLength(2);
    expect(steps[0].name).toBe("bs1");
    expect(steps[1].name).toBe("bs2");

    const descriptor = Object.getOwnPropertyDescriptor(saga, "_nodes");
    const nodes = descriptor?.value as any[];
    expect(nodes).toHaveLength(1);
    expect(nodes[0]._type).toBe("branch");
  });

  it("saga() adds subSaga node", () => {
    const innerStep = defineStep("InnerStep")
      .io<{ x: number }, { x: number }>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();

    const innerSaga = defineSaga("Inner")
      .input<{ x: number }>()
      .step(innerStep)
      .output(r => r.InnerStep)
      .build();

    const saga = defineSaga("Outer")
      .input<{ x: number }>()
      .saga(innerSaga, (ctx: any) => ctx.input)
      .output(r => r)
      .build();

    const descriptor = Object.getOwnPropertyDescriptor(saga, "_nodes");
    const nodes = descriptor?.value as any[];
    expect(nodes).toHaveLength(1);
    expect(nodes[0]._type).toBe("subSaga");
    expect(nodes[0].saga).toBe(innerSaga);
  });

  it("options() updates sagaOptions", () => {
    const step = defineStep("os1")
      .io<unknown, unknown>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();

    const saga = defineSaga("OptSaga")
      .input<unknown>()
      .step(step)
      .output(r => r)
      .options({ compensationStrategy: "parallel" })
      .build();

    expect(saga.options.compensationStrategy).toBe("parallel");
    expect(saga.options.compensationStrategy).not.toBe("sequential");
  });
});

// =============================================================================
// 8. step/builder-bridges.ts - Kill 1 NoCoverage (L136: getPort return)
// =============================================================================

describe("step/builder-bridges.ts mutation killers", () => {
  it("getPort returns the port set on builder state (non-null)", () => {
    // We exercise getPort by building a step and checking the port field.
    // The port field of StepDefinition comes from getPort in buildStepDefinition.
    const step = defineStep("PortTest")
      .io<unknown, unknown>()
      .invoke(TestPort, (ctx: any) => ctx.input)
      .build();

    // Port must be the exact same reference
    expect(step.port).toBe(TestPort);
    expect(step.port.__portName).toBe("TestPort");
    expect(step.port.__portName).not.toBe("");
  });

  it("getPort returns null when port is not set on state", () => {
    // Call getPort directly on a state object with null port.
    const state: any = {
      name: "test",
      port: null,
      invokeMapper: null,
      compensateMapper: null,
      conditionPredicate: null,
      optionsBag: {
        retry: undefined,
        timeout: undefined,
        skipCompensation: undefined,
        metadata: undefined,
      },
    };

    const result = getPort(state);
    expect(result).toBeNull();
  });
});

// =============================================================================
// 9. runtime/runner-bridges.ts - Kill 1 survivor (L95: StringLiteral => "")
// =============================================================================

describe("runtime/runner-bridges.ts mutation killers", () => {
  it("createResumeNotImplemented error message is non-empty string", async () => {
    const result = await createResumeNotImplemented("exec-99");
    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error("expected err");
      },
      err => {
        expect(err._tag).toBe("StepFailed");
        expect(err.message).toBe("Resume not implemented without persistence adapter");
        expect(err.message.length).toBeGreaterThan(0);
        expect(err.message).not.toBe("");
        expect(err.executionId).toBe("exec-99");
        expect(err.sagaName).toBe("");
        expect(err.stepName).toBe("");
        expect(err.stepIndex).toBe(-1);
        expect(err.completedSteps).toEqual([]);
        expect(err.compensatedSteps).toEqual([]);
        if (err._tag === "StepFailed") {
          expect(err.cause).toBeInstanceOf(Error);
          expect((err.cause as Error).message).toContain("persistence");
        }
      }
    );
  });
});

// =============================================================================
// 10. runtime/id.ts - Kill 1 survivor (L16: counter -= 1 => counter += 1)
// =============================================================================

describe("runtime/id.ts mutation killers", () => {
  it("counter increments (not decrements) between calls", () => {
    const id1 = generateExecutionId();
    const id2 = generateExecutionId();
    const id3 = generateExecutionId();

    // Parse counters from the last segment (base-36)
    const getCounter = (id: string) => parseInt(id.split("-").pop()!, 36);

    const c1 = getCounter(id1);
    const c2 = getCounter(id2);
    const c3 = getCounter(id3);

    // Must be strictly increasing (kills -= 1 mutation)
    expect(c2).toBeGreaterThan(c1);
    expect(c3).toBeGreaterThan(c2);
    expect(c2 - c1).toBe(1);
    expect(c3 - c2).toBe(1);
  });

  it("generates IDs with exec- prefix and timestamp", () => {
    const id = generateExecutionId();
    expect(id.startsWith("exec-")).toBe(true);
    // Format: exec-{timestamp}-{counter}
    const parts = id.split("-");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe("exec");
    // Timestamp part should be a valid number
    const ts = parseInt(parts[1], 10);
    expect(ts).toBeGreaterThan(0);
  });
});
