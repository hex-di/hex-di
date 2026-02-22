import type { Decision } from "@hex-di/guard";

/**
 * The state of a subject in the provider.
 * - "loading": subject is being resolved (async)
 * - AuthSubject: subject is resolved and available
 */
export type SubjectState<TSubject> = TSubject | "loading";

/**
 * Result of the `useCanDeferred` hook — never suspends.
 * Reports whether the subject satisfies a policy.
 */
export interface CanResult {
  /** Whether the subject satisfies the policy. `false` while loading. */
  readonly allowed: boolean;
  /** True when the subject is still loading. */
  readonly loading: boolean;
}

/**
 * Result of a deferred policy hook — never suspends.
 */
export interface PolicyResult {
  /** The authorization decision, or undefined when still loading. */
  readonly decision: Decision | undefined;
  /** True when the subject is still loading. */
  readonly loading: boolean;
}
