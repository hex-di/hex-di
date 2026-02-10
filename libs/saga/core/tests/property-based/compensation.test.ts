/**
 * Property-Based Compensation Tests
 *
 * Verifies structural invariants of the compensation engine using fast-check.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { executeCompensation } from "../../src/compensation/engine.js";
import type { CompensationEngineInput } from "../../src/compensation/engine.js";
import type { CompensationPlanStep, CompensationStrategy } from "../../src/compensation/types.js";
import {
  fcConfig,
  compensationPlanArb,
  failurePatternArb,
  strategyArb,
  createMockInvoker,
} from "./compensation-helpers.js";

// =============================================================================
// Helpers
// =============================================================================

function makeEngineInput(
  steps: readonly CompensationPlanStep[],
  strategy: CompensationStrategy,
  failingIndices: ReadonlySet<number>
): CompensationEngineInput {
  return {
    plan: { completedSteps: steps, strategy },
    invoker: createMockInvoker(failingIndices),
    sagaInput: "test-input",
    accumulatedResults: {},
    originalError: new Error("original"),
    failedStepIndex: steps.length,
    failedStepName: "FailedStep",
    executionId: "exec-1",
    sagaName: "TestSaga",
  };
}

// =============================================================================
// Properties
// =============================================================================

describe("Compensation Engine — Property-Based", () => {
  it("allSucceeded is true iff failedSteps is empty", async () => {
    await fc.assert(
      fc.asyncProperty(compensationPlanArb(), strategyArb, async (plan, strategy) => {
        const failurePattern = fc.sample(failurePatternArb(plan.length), 1)[0];
        const input = makeEngineInput(plan, strategy, failurePattern);
        const result = await executeCompensation(input);

        expect(result.allSucceeded).toBe(result.failedSteps.length === 0);
      }),
      fcConfig(100)
    );
  });

  it("no step name appears in both compensatedSteps and failedSteps", async () => {
    await fc.assert(
      fc.asyncProperty(compensationPlanArb(), strategyArb, async (plan, strategy) => {
        const failurePattern = fc.sample(failurePatternArb(plan.length), 1)[0];
        const input = makeEngineInput(plan, strategy, failurePattern);
        const result = await executeCompensation(input);

        const compensatedSet = new Set(result.compensatedSteps);
        for (const failed of result.failedSteps) {
          expect(compensatedSet.has(failed)).toBe(false);
        }
      }),
      fcConfig(100)
    );
  });

  it("errors.length matches failedSteps.length", async () => {
    await fc.assert(
      fc.asyncProperty(compensationPlanArb(), strategyArb, async (plan, strategy) => {
        const failurePattern = fc.sample(failurePatternArb(plan.length), 1)[0];
        const input = makeEngineInput(plan, strategy, failurePattern);
        const result = await executeCompensation(input);

        expect(result.errors.length).toBe(result.failedSteps.length);
      }),
      fcConfig(100)
    );
  });

  it("all step names in result are from the original plan", async () => {
    await fc.assert(
      fc.asyncProperty(compensationPlanArb(), strategyArb, async (plan, strategy) => {
        const failurePattern = fc.sample(failurePatternArb(plan.length), 1)[0];
        const input = makeEngineInput(plan, strategy, failurePattern);
        const result = await executeCompensation(input);

        const planNames = new Set(plan.map(s => s.stepName));
        for (const name of result.compensatedSteps) {
          expect(planNames.has(name)).toBe(true);
        }
        for (const name of result.failedSteps) {
          expect(planNames.has(name)).toBe(true);
        }
      }),
      fcConfig(100)
    );
  });

  it("sequential strategy: at most 1 failure and stops early", async () => {
    await fc.assert(
      fc.asyncProperty(compensationPlanArb(), async plan => {
        const failurePattern = fc.sample(failurePatternArb(plan.length), 1)[0];
        const input = makeEngineInput(plan, "sequential", failurePattern);
        const result = await executeCompensation(input);

        // Sequential stops on first failure: at most 1 failed step
        expect(result.failedSteps.length).toBeLessThanOrEqual(1);

        // Total processed steps should not exceed total plan steps
        const totalProcessed = result.compensatedSteps.length + result.failedSteps.length;
        expect(totalProcessed).toBeLessThanOrEqual(plan.length);
      }),
      fcConfig(100)
    );
  });

  it("best-effort strategy: attempts all steps", async () => {
    await fc.assert(
      fc.asyncProperty(compensationPlanArb(), async plan => {
        const failurePattern = fc.sample(failurePatternArb(plan.length), 1)[0];
        const input = makeEngineInput(plan, "best-effort", failurePattern);
        const result = await executeCompensation(input);

        // Best-effort tries every step regardless of failures
        const totalProcessed = result.compensatedSteps.length + result.failedSteps.length;
        expect(totalProcessed).toBe(plan.length);
      }),
      fcConfig(100)
    );
  });

  it("parallel strategy: failure count matches number of failing invokers", async () => {
    await fc.assert(
      fc.asyncProperty(compensationPlanArb(), async plan => {
        const failurePattern = fc.sample(failurePatternArb(plan.length), 1)[0];
        const input = makeEngineInput(plan, "parallel", failurePattern);
        const result = await executeCompensation(input);

        // Parallel runs all steps; every failing index produces a failure
        expect(result.failedSteps.length).toBe(failurePattern.size);
        expect(result.compensatedSteps.length).toBe(plan.length - failurePattern.size);
      }),
      fcConfig(100)
    );
  });

  it("empty plan always succeeds", async () => {
    await fc.assert(
      fc.asyncProperty(strategyArb, async strategy => {
        const input = makeEngineInput([], strategy, new Set());
        const result = await executeCompensation(input);

        expect(result.allSucceeded).toBe(true);
        expect(result.compensatedSteps).toEqual([]);
        expect(result.failedSteps).toEqual([]);
        expect(result.errors).toEqual([]);
      }),
      fcConfig(20)
    );
  });
});
