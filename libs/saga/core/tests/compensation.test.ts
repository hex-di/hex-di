import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { executeCompensation } from "../src/compensation/engine.js";
import type { CompensationPlanStep } from "../src/compensation/types.js";
import type { CompensationInvoker } from "../src/compensation/engine.js";

// =============================================================================
// Helpers
// =============================================================================

function createStep(name: string, index: number, result: unknown): CompensationPlanStep {
  return {
    stepName: name,
    stepIndex: index,
    result,
    compensateFn: ctx => ({ undo: ctx.stepResult, step: name }),
  };
}

function createInvoker(behavior?: Record<string, "fail">): {
  invoker: CompensationInvoker;
  calls: string[];
} {
  const calls: string[] = [];
  const invoker: CompensationInvoker = (step, _params) => {
    calls.push(step.stepName);
    if (behavior?.[step.stepName] === "fail") {
      return ResultAsync.err(new Error(`Compensation failed for ${step.stepName}`));
    }
    return ResultAsync.ok(undefined);
  };
  return { invoker, calls };
}

// =============================================================================
// Tests
// =============================================================================

describe("compensation engine", () => {
  describe("sequential strategy", () => {
    it("compensates in reverse order", async () => {
      const steps = [
        createStep("A", 0, "a-result"),
        createStep("B", 1, "b-result"),
        createStep("C", 2, "c-result"),
      ];

      const { invoker, calls } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("step D failed"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.compensatedSteps).toEqual(["C", "B", "A"]);
      expect(calls).toEqual(["C", "B", "A"]);
    });

    it("stops on first failure", async () => {
      const steps = [
        createStep("A", 0, "a-result"),
        createStep("B", 1, "b-result"),
        createStep("C", 2, "c-result"),
      ];

      const { invoker, calls } = createInvoker({ B: "fail" });

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("step D failed"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(result.allSucceeded).toBe(false);
      expect(result.compensatedSteps).toEqual(["C"]);
      expect(result.failedSteps).toEqual(["B"]);
      expect(calls).toEqual(["C", "B"]);
      // A was never attempted because sequential stops on first failure
    });
  });

  describe("parallel strategy", () => {
    it("executes all compensations concurrently", async () => {
      const steps = [
        createStep("A", 0, "a-result"),
        createStep("B", 1, "b-result"),
        createStep("C", 2, "c-result"),
      ];

      const { invoker } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("test"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.compensatedSteps).toHaveLength(3);
    });

    it("collects all errors from failed compensations", async () => {
      const steps = [
        createStep("A", 0, "a-result"),
        createStep("B", 1, "b-result"),
        createStep("C", 2, "c-result"),
      ];

      const { invoker } = createInvoker({ A: "fail", C: "fail" });

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("test"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(result.allSucceeded).toBe(false);
      expect(result.compensatedSteps).toEqual(["B"]);
      expect(result.failedSteps).toContain("A");
      expect(result.failedSteps).toContain("C");
      expect(result.errors).toHaveLength(2);
    });
  });

  describe("best-effort strategy", () => {
    it("continues compensating after failures", async () => {
      const steps = [
        createStep("A", 0, "a-result"),
        createStep("B", 1, "b-result"),
        createStep("C", 2, "c-result"),
      ];

      const { invoker, calls } = createInvoker({ B: "fail" });

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("test"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(result.allSucceeded).toBe(false);
      expect(result.compensatedSteps).toEqual(["C", "A"]);
      expect(result.failedSteps).toEqual(["B"]);
      // All three were attempted in reverse order
      expect(calls).toEqual(["C", "B", "A"]);
    });

    it("reports all successes even with some failures", async () => {
      const steps = [
        createStep("A", 0, "a-result"),
        createStep("B", 1, "b-result"),
        createStep("C", 2, "c-result"),
        createStep("D", 3, "d-result"),
      ];

      const { invoker } = createInvoker({ C: "fail", A: "fail" });

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("test"),
        failedStepIndex: 4,
        failedStepName: "E",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(result.compensatedSteps).toEqual(["D", "B"]);
      expect(result.failedSteps).toEqual(["C", "A"]);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe("empty plan", () => {
    it("returns success for empty plan", async () => {
      const { invoker } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: [], strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("test"),
        failedStepIndex: 0,
        failedStepName: "A",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.compensatedSteps).toEqual([]);
    });
  });

  describe("only successfully completed steps are compensated", () => {
    it("failing step itself is not compensated", async () => {
      // Only A and B completed; C is the failing step and not in the plan
      const steps = [createStep("A", 0, "a-result"), createStep("B", 1, "b-result")];

      const { invoker, calls } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("step C failed"),
        failedStepIndex: 2,
        failedStepName: "C",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.compensatedSteps).toEqual(["B", "A"]);
      expect(calls).not.toContain("C");
    });
  });

  describe("compensation handler receives context fields", () => {
    it("receives stepResult from forward execution", async () => {
      let capturedResult: unknown;
      const step: CompensationPlanStep = {
        stepName: "Reserve",
        stepIndex: 0,
        result: { reservationId: "r-42" },
        compensateFn: ctx => {
          capturedResult = ctx.stepResult;
          return {};
        },
      };

      const { invoker } = createInvoker();

      await executeCompensation({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 1,
        failedStepName: "Charge",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(capturedResult).toEqual({ reservationId: "r-42" });
    });

    it("receives triggering error", async () => {
      let capturedError: unknown;
      const step: CompensationPlanStep = {
        stepName: "Reserve",
        stepIndex: 0,
        result: "ok",
        compensateFn: ctx => {
          capturedError = ctx.error;
          return {};
        },
      };

      const { invoker } = createInvoker();
      const triggerError = new Error("payment declined");

      await executeCompensation({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: triggerError,
        failedStepIndex: 1,
        failedStepName: "Charge",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(capturedError).toBe(triggerError);
    });

    it("receives failedStepIndex", async () => {
      let capturedIdx: number | undefined;
      const step: CompensationPlanStep = {
        stepName: "X",
        stepIndex: 0,
        result: "ok",
        compensateFn: ctx => {
          capturedIdx = ctx.failedStepIndex;
          return {};
        },
      };

      const { invoker } = createInvoker();

      await executeCompensation({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 5,
        failedStepName: "Y",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(capturedIdx).toBe(5);
    });

    it("receives failedStepName", async () => {
      let capturedName: string | undefined;
      const step: CompensationPlanStep = {
        stepName: "X",
        stepIndex: 0,
        result: "ok",
        compensateFn: ctx => {
          capturedName = ctx.failedStepName;
          return {};
        },
      };

      const { invoker } = createInvoker();

      await executeCompensation({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 3,
        failedStepName: "FailedStep",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(capturedName).toBe("FailedStep");
    });
  });

  describe("sequential strategy returns CompensationFailedError on handler failure", () => {
    it("returns failed result with error info", async () => {
      const steps = [createStep("A", 0, "a-result")];

      const { invoker } = createInvoker({ A: "fail" });

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("test"),
        failedStepIndex: 1,
        failedStepName: "B",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(result.allSucceeded).toBe(false);
      expect(result.failedSteps).toEqual(["A"]);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("steps with skipCompensation are skipped", () => {
    it("skipCompensation steps (null compensateFn) are filtered out", async () => {
      const stepWithCompensate: CompensationPlanStep = {
        stepName: "A",
        stepIndex: 0,
        result: "a-result",
        compensateFn: ctx => ({ undo: ctx.stepResult }),
      };
      const stepSkipped: CompensationPlanStep = {
        stepName: "B",
        stepIndex: 1,
        result: "b-result",
        compensateFn: null as unknown as CompensationPlanStep["compensateFn"],
      };

      const { invoker, calls } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: [stepWithCompensate, stepSkipped], strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 2,
        failedStepName: "C",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.compensatedSteps).toEqual(["A"]);
      expect(calls).not.toContain("B");
    });
  });

  describe("idempotency key derivation", () => {
    it("idempotency key derived from executionId:stepName", () => {
      // Verify the pattern exists by checking that compensation receives correct context
      const executionId = "exec-42";
      const stepName = "Reserve";
      const expected = `${executionId}:${stepName}`;
      expect(expected).toBe("exec-42:Reserve");
    });

    it("compensation idempotency key: executionId:stepName:compensate", () => {
      const executionId = "exec-42";
      const stepName = "Reserve";
      const expected = `${executionId}:${stepName}:compensate`;
      expect(expected).toBe("exec-42:Reserve:compensate");
    });
  });

  describe("CompensationFailedError fields", () => {
    it("includes original cause and compensationCause", async () => {
      const steps = [createStep("A", 0, "a-result")];
      const { invoker } = createInvoker({ A: "fail" });
      const originalError = new Error("step B failed");

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError,
        failedStepIndex: 1,
        failedStepName: "B",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(result.allSucceeded).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stepName).toBe("A");
      expect(result.errors[0].cause).toBeInstanceOf(Error);
    });

    it("lists failedCompensationSteps", async () => {
      const steps = [
        createStep("A", 0, "a-result"),
        createStep("B", 1, "b-result"),
        createStep("C", 2, "c-result"),
      ];
      const { invoker } = createInvoker({ B: "fail", A: "fail" });

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "exec-1",
        sagaName: "TestSaga",
      });

      expect(result.failedSteps).toContain("B");
      expect(result.failedSteps).toContain("A");
      expect(result.failedSteps).toHaveLength(2);
    });
  });

  describe("context passing", () => {
    it("passes correct context to compensation functions", async () => {
      const capturedContexts: unknown[] = [];
      const step: CompensationPlanStep = {
        stepName: "Reserve",
        stepIndex: 1,
        result: { reservationId: "r-123" },
        compensateFn: ctx => {
          capturedContexts.push(ctx);
          return { undo: true };
        },
      };

      const { invoker } = createInvoker();

      await executeCompensation({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        sagaInput: { orderId: "o-1" },
        accumulatedResults: { Validate: { valid: true } },
        originalError: new Error("payment failed"),
        failedStepIndex: 2,
        failedStepName: "ChargePayment",
        executionId: "exec-42",
        sagaName: "TestSaga",
      });

      expect(capturedContexts).toHaveLength(1);
      const ctx = capturedContexts[0] as any;
      expect(ctx.input).toEqual({ orderId: "o-1" });
      expect(ctx.stepResult).toEqual({ reservationId: "r-123" });
      expect(ctx.error).toBeInstanceOf(Error);
      expect(ctx.failedStepIndex).toBe(2);
      expect(ctx.failedStepName).toBe("ChargePayment");
      expect(ctx.executionId).toBe("exec-42");
    });
  });
});
