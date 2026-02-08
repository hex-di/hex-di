/**
 * Saga Assertion Helpers
 *
 * Fluent assertion helpers for saga results.
 *
 * @packageDocumentation
 */

import { expect } from "vitest";
import type { Result } from "@hex-di/result";
import type { SagaSuccess, SagaError } from "@hex-di/saga";

// =============================================================================
// Types
// =============================================================================

/** Fluent assertions for saga results */
export interface SagaResultAssertions {
  /** Assert saga completed successfully */
  toBeSuccess(): void;
  /** Assert saga completed with specific output */
  toBeSuccessWithOutput(output: unknown): void;
  /** Assert saga failed at a specific step */
  toBeStepFailed(stepName: string): void;
  /** Assert saga failed with compensation failure */
  toBeCompensationFailed(): void;
  /** Assert saga was cancelled */
  toBeCancelled(): void;
  /** Assert saga timed out */
  toBeTimedOut(): void;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates fluent assertions for a saga execution result.
 *
 * @example
 * ```typescript
 * const result = await harness.execute(mySaga, input);
 * expectSagaResult(result).toBeSuccess();
 * expectSagaResult(result).toBeSuccessWithOutput({ orderId: '123' });
 * ```
 */
export function expectSagaResult(
  result: Result<SagaSuccess<unknown>, SagaError<unknown>>
): SagaResultAssertions {
  return {
    toBeSuccess(): void {
      expect(result.isOk()).toBe(true);
    },

    toBeSuccessWithOutput(output: unknown): void {
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toEqual(output);
      }
    },

    toBeStepFailed(stepName: string): void {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("StepFailed");
        expect(result.error.stepName).toBe(stepName);
      }
    },

    toBeCompensationFailed(): void {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("CompensationFailed");
      }
    },

    toBeCancelled(): void {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Cancelled");
      }
    },

    toBeTimedOut(): void {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Timeout");
      }
    },
  };
}
