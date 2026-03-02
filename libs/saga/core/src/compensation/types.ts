/**
 * Compensation Engine Types
 *
 * @packageDocumentation
 */

import type { CompensationContext } from "../step/types.js";

export type CompensationStrategy = "sequential" | "parallel" | "best-effort";

/** S2: Dead-letter entry for compensation failures */
export interface DeadLetterEntry {
  readonly executionId: string;
  readonly sagaName: string;
  readonly stepName: string;
  readonly stepIndex: number;
  readonly originalError: unknown;
  readonly failedAt: string;
  readonly retryCount: number;
}

export interface CompensationResult {
  /** Names of steps that were successfully compensated */
  readonly compensatedSteps: readonly string[];
  /** Names of steps whose compensation failed */
  readonly failedSteps: readonly string[];
  /** Errors from failed compensation handlers */
  readonly errors: readonly CompensationStepError[];
  /** Whether all compensations succeeded */
  readonly allSucceeded: boolean;
  /** S2: Dead-letter entries for failed compensations */
  readonly deadLetterEntries?: readonly DeadLetterEntry[];
}

export interface CompensationStepError {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly cause: unknown;
}

export interface CompensationPlan {
  /** Steps to compensate, in the order they completed (will be reversed for execution) */
  readonly completedSteps: readonly CompensationPlanStep[];
  /** Strategy to use for compensation */
  readonly strategy: CompensationStrategy;
}

export interface CompensationPlanStep {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly result: unknown;
  readonly compensateFn: (ctx: CompensationContext<unknown, unknown, unknown, unknown>) => unknown;
  /** S6: Optional timeout in ms for the compensation handler */
  readonly timeout?: number;
}
