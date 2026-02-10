/**
 * Property-Based Test Helpers for Compensation Engine
 *
 * Shared arbitraries and utilities for property-based testing of the
 * compensation engine with fast-check.
 *
 * @packageDocumentation
 */

import fc from "fast-check";
import { ResultAsync } from "@hex-di/result";
import type {
  CompensationPlanStep,
  CompensationStrategy,
  CompensationInvoker,
} from "../../src/compensation/index.js";

// =============================================================================
// Seed Configuration for Reproducibility
// =============================================================================

declare const process: { env: Record<string, string | undefined> };

function parseSeedFromEnv(): number | undefined {
  const seedStr = process.env.FC_SEED;
  if (!seedStr) return undefined;
  const seed = parseInt(seedStr, 10);
  if (Number.isNaN(seed)) return undefined;
  return seed;
}

const SHARED_SEED = parseSeedFromEnv();

/**
 * Creates fast-check config with seed support.
 *
 * Usage: FC_SEED=-1819918769 pnpm test tests/property-based/compensation.test.ts
 */
export function fcConfig(numRuns: number): { numRuns: number; seed?: number; verbose: boolean } {
  return {
    numRuns,
    ...(SHARED_SEED !== undefined ? { seed: SHARED_SEED } : {}),
    verbose: true,
  };
}

// =============================================================================
// Arbitraries
// =============================================================================

/** Generates a unique step name */
const stepNameArb = fc.stringMatching(/^[A-Z][a-zA-Z0-9]{1,14}Step$/);

/**
 * Generates a compensation plan with 1-20 steps, each with unique names and indices.
 */
export function compensationPlanArb(
  minSteps = 1,
  maxSteps = 20
): fc.Arbitrary<readonly CompensationPlanStep[]> {
  return fc
    .array(stepNameArb, { minLength: minSteps, maxLength: maxSteps })
    .map(names => [...new Set(names)])
    .filter(names => names.length >= minSteps)
    .map(names =>
      names.map(
        (name, i): CompensationPlanStep => ({
          stepName: name,
          stepIndex: i,
          result: `result-${name}`,
          compensateFn: () => `compensate-${name}`,
        })
      )
    );
}

/**
 * Generates a set of step indices (from a plan) that the invoker should fail on.
 */
export function failurePatternArb(planSize: number): fc.Arbitrary<ReadonlySet<number>> {
  return fc
    .subarray(
      Array.from({ length: planSize }, (_, i) => i),
      { minLength: 0, maxLength: planSize }
    )
    .map(indices => new Set(indices));
}

/**
 * Generates a compensation strategy.
 */
export const strategyArb: fc.Arbitrary<CompensationStrategy> = fc.constantFrom(
  "sequential",
  "parallel",
  "best-effort"
);

// =============================================================================
// Mock Invoker Factory
// =============================================================================

/**
 * Creates a CompensationInvoker that fails on steps whose indices are in the
 * failure set, and succeeds for all others.
 */
export function createMockInvoker(failingIndices: ReadonlySet<number>): CompensationInvoker {
  return (step: CompensationPlanStep, _params: unknown): ResultAsync<unknown, unknown> => {
    if (failingIndices.has(step.stepIndex)) {
      return ResultAsync.err(new Error(`Compensation failed for ${step.stepName}`));
    }
    return ResultAsync.ok(`compensated-${step.stepName}`);
  };
}
