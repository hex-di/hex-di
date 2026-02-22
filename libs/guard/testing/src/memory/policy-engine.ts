import { evaluate } from "@hex-di/guard";
import type {
  PolicyConstraint,
  AuthSubject,
  EvaluationContext,
  Decision,
} from "@hex-di/guard";
import type { Result } from "@hex-di/result";
import type { PolicyEvaluationError } from "@hex-di/guard";

/**
 * A minimal in-memory policy engine for testing.
 * Evaluates policies against subjects and records evaluation history.
 */
export interface MemoryPolicyEngine {
  /** Evaluates a policy for a subject and records the result. */
  evaluate(
    policy: PolicyConstraint,
    context: EvaluationContext,
  ): Result<Decision, PolicyEvaluationError>;
  /** Total number of evaluations performed. */
  readonly evaluationCount: number;
  /** Clears the evaluation count. */
  reset(): void;
}

/**
 * Creates an in-memory policy engine suitable for testing.
 * Wraps the evaluate() function and tracks call count.
 *
 * @example
 * ```ts
 * const engine = createMemoryPolicyEngine();
 * const result = engine.evaluate(hasRole("admin"), { subject });
 * expect(engine.evaluationCount).toBe(1);
 * ```
 */
export function createMemoryPolicyEngine(): MemoryPolicyEngine {
  let _count = 0;

  return {
    get evaluationCount(): number {
      return _count;
    },

    evaluate(
      policy: PolicyConstraint,
      context: EvaluationContext,
    ): Result<Decision, PolicyEvaluationError> {
      _count += 1;
      return evaluate(policy, context);
    },

    reset(): void {
      _count = 0;
    },
  };
}

/**
 * Creates a static subject provider that always returns the same subject.
 *
 * @example
 * ```ts
 * const provider = createStaticSubjectProvider(adminSubject);
 * provider.getSubject(); // always adminSubject
 * ```
 */
export function createStaticSubjectProvider(subject: AuthSubject): {
  getSubject(): AuthSubject;
  readonly callCount: number;
} {
  let _callCount = 0;
  return {
    get callCount(): number {
      return _callCount;
    },
    getSubject(): AuthSubject {
      _callCount += 1;
      return subject;
    },
  };
}

/**
 * Creates a cycling subject provider that cycles through an array of subjects.
 * Each call to getSubject() advances to the next subject; wraps around.
 *
 * @example
 * ```ts
 * const provider = createCyclingSubjectProvider([subjectA, subjectB]);
 * provider.getSubject(); // subjectA
 * provider.getSubject(); // subjectB
 * provider.getSubject(); // subjectA (wraps)
 * ```
 */
export function createCyclingSubjectProvider(subjects: readonly AuthSubject[]): {
  getSubject(): AuthSubject;
  readonly callCount: number;
  readonly currentIndex: number;
} {
  if (subjects.length === 0) {
    throw new Error("createCyclingSubjectProvider: subjects array must not be empty");
  }
  let _index = 0;
  let _callCount = 0;

  return {
    get callCount(): number {
      return _callCount;
    },
    get currentIndex(): number {
      return _index;
    },
    getSubject(): AuthSubject {
      const subject = subjects[_index];
      if (subject === undefined) {
        throw new Error(`createCyclingSubjectProvider: no subject at index ${_index}`);
      }
      _callCount += 1;
      _index = (_index + 1) % subjects.length;
      return subject;
    },
  };
}
