import { evaluate } from "@hex-di/guard";
import type {
  PolicyConstraint,
  EvaluationContext,
  AuthSubject,
} from "@hex-di/guard";

/**
 * Result of a testPolicy() call.
 */
export interface PolicyTestResult {
  /** Whether the policy allowed the action. */
  readonly allowed: boolean;
  /** Whether the policy denied the action. */
  readonly denied: boolean;
  /** The raw decision kind. */
  readonly decision: "allow" | "deny";
  /** The reason from the decision trace. */
  readonly reason: string;
}

/**
 * Fluent builder for chained policy test assertions.
 */
export interface PolicyTestBuilder {
  /** Sets the subject to test against. */
  against(subject: AuthSubject, extras?: Partial<Omit<EvaluationContext, "subject">>): PolicyTestAssertions;
}

/**
 * Assertion methods returned after calling against().
 */
export interface PolicyTestAssertions {
  /** Asserts the policy allows. Throws if it denies. */
  expectAllow(): PolicyTestResult;
  /** Asserts the policy denies. Throws if it allows. Optionally checks that reason contains the given string. */
  expectDeny(reasonContains?: string): PolicyTestResult;
  /** Returns the raw test result without asserting. */
  result(): PolicyTestResult;
}

/**
 * Evaluates a policy synchronously and returns a plain test result object.
 * Throws if evaluation itself errors (unexpected — indicates a malformed policy).
 *
 * Can be used in two ways:
 *
 * @example Non-fluent (direct call):
 * ```ts
 * const result = testPolicy(hasPermission(ReadDoc), subject);
 * expect(result.allowed).toBe(true);
 * ```
 *
 * @example Fluent builder:
 * ```ts
 * testPolicy(hasPermission(ReadDoc)).against(subject).expectAllow();
 * testPolicy(hasRole("admin")).against(viewerSubject).expectDeny("lacks role");
 * ```
 */
export function testPolicy(
  policy: PolicyConstraint,
  subject?: AuthSubject,
  extras?: Partial<Omit<EvaluationContext, "subject">>,
): PolicyTestResult & PolicyTestBuilder {
  function runWith(s: AuthSubject, ex?: Partial<Omit<EvaluationContext, "subject">>): PolicyTestResult {
    const context: EvaluationContext = { subject: s, ...ex };
    const result = evaluate(policy, context);

    if (result.isErr()) {
      throw new Error(
        `testPolicy: unexpected evaluation error: ${result.error.message}`,
      );
    }

    const decision = result.value;
    const reason =
      decision.kind === "deny" ? decision.reason : (decision.trace.reason ?? "");
    return {
      allowed: decision.kind === "allow",
      denied: decision.kind === "deny",
      decision: decision.kind,
      reason,
    };
  }

  const builder: PolicyTestBuilder = {
    against(s: AuthSubject, ex?: Partial<Omit<EvaluationContext, "subject">>): PolicyTestAssertions {
      return {
        result(): PolicyTestResult {
          return runWith(s, ex);
        },
        expectAllow(): PolicyTestResult {
          const r = runWith(s, ex);
          if (!r.allowed) {
            throw new Error(
              `testPolicy.expectAllow: policy denied with reason "${r.reason}"`,
            );
          }
          return r;
        },
        expectDeny(reasonContains?: string): PolicyTestResult {
          const r = runWith(s, ex);
          if (!r.denied) {
            throw new Error(
              `testPolicy.expectDeny: policy allowed unexpectedly`,
            );
          }
          if (reasonContains !== undefined && !r.reason.includes(reasonContains)) {
            throw new Error(
              `testPolicy.expectDeny: reason "${r.reason}" does not include "${reasonContains}"`,
            );
          }
          return r;
        },
      };
    },
  };

  // If subject provided directly (non-fluent usage), run immediately
  if (subject !== undefined) {
    const direct = runWith(subject, extras);
    return Object.assign(direct, builder);
  }

  // Fluent-only mode: return a sentinel PolicyTestResult that throws if used directly
  const sentinel: PolicyTestResult = {
    allowed: false,
    denied: false,
    decision: "deny",
    reason: "",
  };
  return Object.assign(sentinel, builder);
}
