import type { PolicyConstraint } from "../policy/constraint.js";

/**
 * Trace of a single policy node evaluation.
 */
export interface EvaluationTrace {
  readonly policyKind: string;
  readonly label?: string;
  readonly result: "allow" | "deny";
  readonly reason?: string;
  readonly durationMs: number;
  readonly children?: readonly EvaluationTrace[];
  /** Field-level visibility set propagated from leaf policies. */
  readonly visibleFields?: ReadonlyArray<string>;
}

/**
 * An Allow decision with full context.
 */
export interface Allow {
  readonly kind: "allow";
  readonly evaluationId: string;
  readonly evaluatedAt: string;
  readonly subjectId: string;
  readonly policy: PolicyConstraint;
  readonly trace: EvaluationTrace;
  readonly durationMs: number;
  readonly visibleFields?: ReadonlyArray<string>;
}

/**
 * A Deny decision with full context.
 */
export interface Deny {
  readonly kind: "deny";
  readonly evaluationId: string;
  readonly evaluatedAt: string;
  readonly subjectId: string;
  readonly policy: PolicyConstraint;
  readonly trace: EvaluationTrace;
  readonly durationMs: number;
  readonly reason: string;
}

/** Union of Allow and Deny. */
export type Decision = Allow | Deny;
