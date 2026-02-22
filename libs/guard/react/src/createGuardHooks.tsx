import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AuthSubject, PolicyConstraint, Decision } from "@hex-di/guard";
import { evaluate } from "@hex-di/guard";
import { MissingSubjectProviderError } from "./errors.js";
import type { SubjectState, CanResult, PolicyResult } from "./types.js";

// ---------------------------------------------------------------------------
// Internal helper — unwrap Result<Decision, PolicyEvaluationError>
// ---------------------------------------------------------------------------

function unwrapDecision(result: ReturnType<typeof evaluate>): Decision {
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
}

/**
 * Isolated guard hooks factory for multi-tenant or multi-scope scenarios.
 *
 * Each call to `createGuardHooks()` creates an independent React context
 * with its own Subject provider and hook set, preventing cross-context
 * subject leakage in multi-tenant applications.
 *
 * @example
 * ```tsx
 * // Create isolated contexts per tenant
 * const { SubjectProvider, useCan, Can } = createGuardHooks();
 *
 * function App() {
 *   return (
 *     <SubjectProvider subject={tenantUser}>
 *       <Dashboard />
 *     </SubjectProvider>
 *   );
 * }
 * ```
 */
export function createGuardHooks(): GuardHooks {
  const IsolatedSubjectContext = createContext<SubjectState<AuthSubject> | null>(null);

  function useSubjectState(hookName: string): AuthSubject | "loading" {
    const ctx = useContext(IsolatedSubjectContext);
    if (ctx === null) {
      throw new MissingSubjectProviderError(hookName);
    }
    return ctx;
  }

  function suspendUntilResolved(state: AuthSubject | "loading"): AuthSubject {
    if (state === "loading") {
      throw new Promise<never>(() => undefined);
    }
    return state;
  }

  // -------------------------------------------------------------------------
  // Provider
  // -------------------------------------------------------------------------

  function SubjectProvider({
    subject,
    children,
  }: {
    readonly subject: AuthSubject | "loading";
    readonly children: ReactNode;
  }): ReactNode {
    const frozenSubject = useMemo<SubjectState<AuthSubject>>(() => {
      if (subject === "loading") {
        return "loading";
      }
      return Object.freeze({ ...subject });
    }, [subject]);

    return (
      <IsolatedSubjectContext.Provider value={frozenSubject}>
        {children}
      </IsolatedSubjectContext.Provider>
    );
  }

  // -------------------------------------------------------------------------
  // Hooks
  // -------------------------------------------------------------------------

  function useSubject(): AuthSubject {
    const state = useSubjectState("useSubject");
    return suspendUntilResolved(state);
  }

  function useSubjectDeferred(): AuthSubject | null {
    const state = useSubjectState("useSubjectDeferred");
    if (state === "loading") return null;
    return state;
  }

  function useCan(policy: PolicyConstraint): boolean {
    const subject = useSubject();
    return useMemo(
      () => unwrapDecision(evaluate(policy, { subject })).kind === "allow",
      [subject, policy],
    );
  }

  function useCanDeferred(policy: PolicyConstraint): CanResult {
    const state = useSubjectState("useCanDeferred");
    return useMemo(() => {
      if (state === "loading") return { allowed: false, loading: true };
      const decision = unwrapDecision(evaluate(policy, { subject: state }));
      return { allowed: decision.kind === "allow", loading: false };
    }, [state, policy]);
  }

  function usePolicy(policy: PolicyConstraint): Decision {
    const subject = useSubject();
    return useMemo(
      () => unwrapDecision(evaluate(policy, { subject })),
      [subject, policy],
    );
  }

  function usePolicyDeferred(policy: PolicyConstraint): PolicyResult {
    const state = useSubjectState("usePolicyDeferred");
    return useMemo(() => {
      if (state === "loading") return { decision: undefined, loading: true };
      const decision = unwrapDecision(evaluate(policy, { subject: state }));
      return { decision, loading: false };
    }, [state, policy]);
  }

  function usePolicies(
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

  function usePoliciesDeferred(
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

  // -------------------------------------------------------------------------
  // Components
  // -------------------------------------------------------------------------

  function Can({
    policy,
    fallback,
    children,
  }: {
    readonly policy: PolicyConstraint;
    readonly fallback?: ReactNode;
    readonly children: ReactNode;
  }): ReactNode {
    const decision = usePolicy(policy);
    return decision.kind === "deny" ? (fallback ?? null) : children;
  }

  function Cannot({
    policy,
    children,
  }: {
    readonly policy: PolicyConstraint;
    readonly children: ReactNode;
  }): ReactNode {
    const decision = usePolicy(policy);
    return decision.kind === "deny" ? children : null;
  }

  return {
    SubjectProvider,
    useSubject,
    useSubjectDeferred,
    useCan,
    useCanDeferred,
    usePolicy,
    usePolicyDeferred,
    usePolicies,
    usePoliciesDeferred,
    Can,
    Cannot,
  };
}

/**
 * The return type of `createGuardHooks()`.
 */
export interface GuardHooks {
  /** Provides the subject to the component tree. */
  SubjectProvider(props: {
    readonly subject: AuthSubject | "loading";
    readonly children: ReactNode;
  }): ReactNode;

  /** Returns the subject, suspends when loading. */
  useSubject(): AuthSubject;

  /** Returns the subject or null when loading. Never suspends. */
  useSubjectDeferred(): AuthSubject | null;

  /** Returns true if the subject satisfies the policy. Suspends when loading. */
  useCan(policy: PolicyConstraint): boolean;

  /** Returns a CanResult. Never suspends. */
  useCanDeferred(policy: PolicyConstraint): CanResult;

  /** Evaluates a policy, suspends when loading. */
  usePolicy(policy: PolicyConstraint): Decision;

  /** Evaluates a policy, never suspends. */
  usePolicyDeferred(policy: PolicyConstraint): PolicyResult;

  /** Evaluates multiple policies, suspends when loading. */
  usePolicies(
    policies: Readonly<Record<string, PolicyConstraint>>,
  ): Readonly<Record<string, Decision>>;

  /** Evaluates multiple policies, never suspends. */
  usePoliciesDeferred(
    policies: Readonly<Record<string, PolicyConstraint>>,
  ): Readonly<Record<string, PolicyResult>>;

  /** Renders children when policy is allowed. */
  Can(props: {
    readonly policy: PolicyConstraint;
    readonly fallback?: ReactNode;
    readonly children: ReactNode;
  }): ReactNode;

  /** Renders children when policy is denied. */
  Cannot(props: {
    readonly policy: PolicyConstraint;
    readonly children: ReactNode;
  }): ReactNode;
}
