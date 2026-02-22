import type { ReactNode } from "react";
import type { PolicyConstraint } from "@hex-di/guard";
import { usePolicy } from "./hooks.js";

/**
 * Props for the Cannot component.
 */
export interface CannotProps {
  /** The policy to evaluate. */
  readonly policy: PolicyConstraint;
  /** Rendered when the policy is denied. */
  readonly children: ReactNode;
}

/**
 * Renders children when the subject does NOT satisfy the given policy.
 *
 * Suspends when the subject is still loading (works with React.Suspense).
 * Useful for rendering fallback UI for users without a specific permission.
 *
 * @example
 * ```tsx
 * <Cannot policy={hasPermission("admin:access")}>
 *   <ReadOnlyBanner />
 * </Cannot>
 * ```
 */
export function Cannot({ policy, children }: CannotProps): ReactNode {
  const decision = usePolicy(policy);
  if (decision.kind === "deny") {
    return children;
  }
  return null;
}
