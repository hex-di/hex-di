import type { ReactNode } from "react";
import type { PolicyConstraint } from "@hex-di/guard";
import { usePolicy } from "./hooks.js";

/**
 * Props for the Can component.
 */
export interface CanProps {
  /** The policy to evaluate. */
  readonly policy: PolicyConstraint;
  /**
   * Rendered when the policy is denied.
   * Not rendered while the subject is loading (component suspends instead).
   */
  readonly fallback?: ReactNode;
  /** Rendered when the policy is allowed. */
  readonly children: ReactNode;
}

/**
 * Renders children when the subject satisfies the given policy.
 *
 * Suspends when the subject is still loading (works with React.Suspense).
 * Renders `fallback` (or nothing) when access is denied.
 *
 * @example
 * ```tsx
 * <Can policy={hasPermission("documents:write")} fallback={<AccessDenied />}>
 *   <EditButton />
 * </Can>
 * ```
 */
export function Can({ policy, fallback, children }: CanProps): ReactNode {
  const decision = usePolicy(policy);
  if (decision.kind === "deny") {
    return fallback ?? null;
  }
  return children;
}
