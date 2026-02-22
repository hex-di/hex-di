import { useContext, useMemo } from "react";
import type { AuthSubject, PolicyConstraint, Decision } from "@hex-di/guard";
import { evaluate } from "@hex-di/guard";
import { SubjectContext } from "./context.js";
import { MissingSubjectProviderError } from "./errors.js";
import type { CanResult, PolicyResult } from "./types.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Reads the raw subject state from context.
 * Throws MissingSubjectProviderError if no provider is found.
 */
function useSubjectState(hookName: string): AuthSubject | "loading" {
  const ctx = useContext(SubjectContext);
  if (ctx === null) {
    throw new MissingSubjectProviderError(hookName);
  }
  return ctx;
}

/**
 * Suspends the component when the subject is still loading.
 * Returns the resolved subject once available.
 */
function suspendUntilSubjectResolved(
  state: AuthSubject | "loading",
): AuthSubject {
  if (state === "loading") {
    // Throw a never-settling promise to trigger React Suspense.
    throw new Promise<never>(() => undefined);
  }
  return state;
}

/**
 * Unwraps a Result<Decision, PolicyEvaluationError>.
 * Throws the error (propagating to an error boundary) on evaluation failure.
 */
function unwrapDecision(result: ReturnType<typeof evaluate>): Decision {
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
}

// ---------------------------------------------------------------------------
// Subject hooks
// ---------------------------------------------------------------------------

/**
 * Returns the current authenticated subject.
 * Suspends when the subject is still loading.
 *
 * @throws MissingSubjectProviderError if used outside SubjectProvider
 */
export function useSubject(): AuthSubject {
  const state = useSubjectState("useSubject");
  return suspendUntilSubjectResolved(state);
}

/**
 * Returns the current subject or `null` if still loading.
 * Never suspends.
 *
 * @throws MissingSubjectProviderError if used outside SubjectProvider
 */
export function useSubjectDeferred(): AuthSubject | null {
  const state = useSubjectState("useSubjectDeferred");
  if (state === "loading") {
    return null;
  }
  return state;
}

// ---------------------------------------------------------------------------
// Policy check hooks
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the subject satisfies the given policy.
 * Suspends when the subject is still loading.
 *
 * @throws MissingSubjectProviderError if used outside SubjectProvider
 */
export function useCan(policy: PolicyConstraint): boolean {
  const subject = useSubject();
  return useMemo(
    () => unwrapDecision(evaluate(policy, { subject })).kind === "allow",
    [subject, policy],
  );
}

/**
 * Returns a `CanResult` indicating whether the subject satisfies the policy.
 * Never suspends.
 *
 * @throws MissingSubjectProviderError if used outside SubjectProvider
 */
export function useCanDeferred(policy: PolicyConstraint): CanResult {
  const state = useSubjectState("useCanDeferred");

  return useMemo(() => {
    if (state === "loading") {
      return { allowed: false, loading: true };
    }
    const decision = unwrapDecision(evaluate(policy, { subject: state }));
    return { allowed: decision.kind === "allow", loading: false };
  }, [state, policy]);
}

// ---------------------------------------------------------------------------
// Policy hooks
// ---------------------------------------------------------------------------

/**
 * Evaluates a policy against the current subject and returns the Decision.
 * Suspends when the subject is still loading.
 *
 * @throws MissingSubjectProviderError if used outside SubjectProvider
 */
export function usePolicy(policy: PolicyConstraint): Decision {
  const subject = useSubject();
  return useMemo(
    () => unwrapDecision(evaluate(policy, { subject })),
    [subject, policy],
  );
}

/**
 * Evaluates a policy but never suspends.
 * Returns `undefined` for the decision while the subject is loading.
 *
 * @throws MissingSubjectProviderError if used outside SubjectProvider
 */
export function usePolicyDeferred(policy: PolicyConstraint): PolicyResult {
  const state = useSubjectState("usePolicyDeferred");

  return useMemo(() => {
    if (state === "loading") {
      return { decision: undefined, loading: true };
    }
    const decision = unwrapDecision(evaluate(policy, { subject: state }));
    return { decision, loading: false };
  }, [state, policy]);
}

// ---------------------------------------------------------------------------
// Multiple policy hooks
// ---------------------------------------------------------------------------

/**
 * Evaluates multiple named policies and returns a map of decisions.
 * Suspends when the subject is still loading.
 *
 * @throws MissingSubjectProviderError if used outside SubjectProvider
 */
export function usePolicies(
  policies: Readonly<Record<string, PolicyConstraint>>,
): Readonly<Record<string, Decision>> {
  const subject = useSubject();

  return useMemo(() => {
    const result: Record<string, Decision> = {};
    for (const [key, policy] of Object.entries(policies)) {
      result[key] = unwrapDecision(evaluate(policy, { subject }));
    }
    return result;
  }, [subject, policies]);
}

/**
 * Evaluates multiple named policies but never suspends.
 * Returns an empty record while the subject is loading.
 *
 * @throws MissingSubjectProviderError if used outside SubjectProvider
 */
export function usePoliciesDeferred(
  policies: Readonly<Record<string, PolicyConstraint>>,
): Readonly<Record<string, PolicyResult>> {
  const state = useSubjectState("usePoliciesDeferred");

  return useMemo(() => {
    const result: Record<string, PolicyResult> = {};
    for (const [key, policy] of Object.entries(policies)) {
      if (state === "loading") {
        result[key] = { decision: undefined, loading: true };
      } else {
        const decision = unwrapDecision(evaluate(policy, { subject: state }));
        result[key] = { decision, loading: false };
      }
    }
    return result;
  }, [state, policies]);
}
