import { evaluate, serializePolicy } from "@hex-di/guard";
import type { PolicyConstraint, AuthSubject } from "@hex-di/guard";

/**
 * A single entry in a policy diff report.
 */
export interface PolicyDiffEntry {
  readonly key: string;
  readonly oldDecision: "allow" | "deny" | "error";
  readonly newDecision: "allow" | "deny" | "error";
  readonly changed: boolean;
}

/**
 * The result of comparing two policy maps against a subject.
 */
export interface PolicyDiffReport {
  readonly subject: AuthSubject;
  readonly entries: readonly PolicyDiffEntry[];
  /** Number of entries where the decision changed. */
  readonly changedCount: number;
  /** Whether any decision changed between old and new policy maps. */
  readonly hasChanges: boolean;
}

/**
 * Compares two policy maps and reports which decisions changed for a subject.
 *
 * @example
 * ```ts
 * const report = createPolicyDiffReport(
 *   { canRead: oldReadPolicy },
 *   { canRead: newReadPolicy },
 *   testSubject
 * );
 * expect(report.hasChanges).toBe(true);
 * ```
 */
export function createPolicyDiffReport(
  oldPolicies: Record<string, PolicyConstraint>,
  newPolicies: Record<string, PolicyConstraint>,
  subject: AuthSubject,
): PolicyDiffReport {
  const allKeys = new Set([
    ...Object.keys(oldPolicies),
    ...Object.keys(newPolicies),
  ]);

  const entries: PolicyDiffEntry[] = [];

  for (const key of allKeys) {
    const oldPolicy = oldPolicies[key];
    const newPolicy = newPolicies[key];

    const oldDecision = resolveDecision(oldPolicy, subject);
    const newDecision = resolveDecision(newPolicy, subject);

    entries.push({
      key,
      oldDecision,
      newDecision,
      changed: oldDecision !== newDecision,
    });
  }

  const changedCount = entries.filter((e) => e.changed).length;

  return {
    subject,
    entries,
    changedCount,
    hasChanges: changedCount > 0,
  };
}

function resolveDecision(
  policy: PolicyConstraint | undefined,
  subject: AuthSubject,
): "allow" | "deny" | "error" {
  if (policy === undefined) return "error";
  const result = evaluate(policy, { subject });
  if (result.isErr()) return "error";
  return result.value.kind;
}

/**
 * Checks if two policies are semantically equivalent for a set of subjects.
 * Returns true if every subject produces the same decision from both policies.
 */
export function policiesAreEquivalent(
  policyA: PolicyConstraint,
  policyB: PolicyConstraint,
  subjects: readonly AuthSubject[],
): boolean {
  // Fast check: same serialization means same structure
  if (serializePolicy(policyA) === serializePolicy(policyB)) return true;

  for (const subject of subjects) {
    const a = resolveDecision(policyA, subject);
    const b = resolveDecision(policyB, subject);
    if (a !== b) return false;
  }
  return true;
}
