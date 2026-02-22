import { evaluate } from "@hex-di/guard";
import type { PolicyConstraint, AuthSubject } from "@hex-di/guard";
import { expect } from "vitest";

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isPolicyConstraint(v: unknown): v is PolicyConstraint {
  if (!isPlainRecord(v)) return false;
  const kind = v["kind"];
  return (
    kind === "hasPermission" ||
    kind === "hasRole" ||
    kind === "hasAttribute" ||
    kind === "hasResourceAttribute" ||
    kind === "hasSignature" ||
    kind === "hasRelationship" ||
    kind === "allOf" ||
    kind === "anyOf" ||
    kind === "not" ||
    kind === "labeled"
  );
}

function hasEvaluationCount(v: unknown): v is { evaluationCount: number } {
  if (!isPlainRecord(v)) return false;
  return typeof v["evaluationCount"] === "number";
}

declare module "vitest" {
  interface Assertion<T> {
    /** Assert that the policy allows the subject. */
    toAllowPolicy(policy: PolicyConstraint, subject: AuthSubject): T;
    /** Assert that the policy denies the subject. */
    toDenyPolicy(policy: PolicyConstraint, subject: AuthSubject): T;
    /** Assert that the policy (as the received value) allows the subject. */
    toAllow(subject: AuthSubject): T;
    /** Assert that the policy (as the received value) denies the subject. */
    toDeny(subject: AuthSubject): T;
    /** Assert that the policy denies the subject with a reason matching the given string. */
    toDenyWith(subject: AuthSubject, reason: string): T;
    /** Assert that an engine evaluated exactly N times. */
    toHaveEvaluated(count: number): T;
  }
  interface AsymmetricMatchersContaining {
    toAllowPolicy(policy: PolicyConstraint, subject: AuthSubject): void;
    toDenyPolicy(policy: PolicyConstraint, subject: AuthSubject): void;
    toAllow(subject: AuthSubject): void;
    toDeny(subject: AuthSubject): void;
    toDenyWith(subject: AuthSubject, reason: string): void;
    toHaveEvaluated(count: number): void;
  }
}

/**
 * Evaluates a policy for the given subject and returns the decision string or "error".
 */
function getDecision(
  policy: PolicyConstraint,
  subject: AuthSubject,
): { kind: "allow" | "deny" | "error"; reason?: string } {
  const result = evaluate(policy, { subject });
  if (result.isErr()) return { kind: "error" };
  const decision = result.value;
  if (decision.kind === "deny") return { kind: "deny", reason: decision.reason };
  return { kind: "allow", reason: decision.trace.reason ?? "" };
}

/**
 * Registers custom vitest matchers for guard policy testing.
 *
 * Call this once in your vitest setup file:
 * ```ts
 * import { setupGuardMatchers } from "@hex-di/guard-testing";
 * setupGuardMatchers();
 * ```
 *
 * Then use in tests:
 * ```ts
 * expect(subject).toAllowPolicy(hasPermission(ReadDoc), subject);
 * expect(hasRole("admin")).toAllow(adminSubject);
 * expect(hasRole("admin")).toDeny(viewerSubject);
 * expect(hasRole("admin")).toDenyWith(viewerSubject, "lacks role");
 * expect(engine).toHaveEvaluated(3);
 * ```
 */
export function setupGuardMatchers(): void {
  expect.extend({
    toAllowPolicy(
      _received: unknown,
      policy: PolicyConstraint,
      subject: AuthSubject,
    ) {
      const { kind } = getDecision(policy, subject);
      const pass = kind === "allow";
      return {
        pass,
        message: () =>
          pass
            ? `Expected policy to DENY but it ALLOWED for subject ${subject.id}`
            : `Expected policy to ALLOW but it DENIED for subject ${subject.id}`,
      };
    },

    toDenyPolicy(
      _received: unknown,
      policy: PolicyConstraint,
      subject: AuthSubject,
    ) {
      const { kind } = getDecision(policy, subject);
      const pass = kind === "deny";
      return {
        pass,
        message: () =>
          pass
            ? `Expected policy to ALLOW but it DENIED for subject ${subject.id}`
            : `Expected policy to DENY but it ALLOWED for subject ${subject.id}`,
      };
    },

    toAllow(received: unknown, subject: AuthSubject) {
      if (!isPolicyConstraint(received)) {
        return {
          pass: false,
          message: () => `Expected a PolicyConstraint but received ${typeof received}`,
        };
      }
      const { kind } = getDecision(received, subject);
      const pass = kind === "allow";
      return {
        pass,
        message: () =>
          pass
            ? `Expected policy to DENY but it ALLOWED for subject ${subject.id}`
            : `Expected policy to ALLOW but it DENIED for subject ${subject.id}`,
      };
    },

    toDeny(received: unknown, subject: AuthSubject) {
      if (!isPolicyConstraint(received)) {
        return {
          pass: false,
          message: () => `Expected a PolicyConstraint but received ${typeof received}`,
        };
      }
      const { kind } = getDecision(received, subject);
      const pass = kind === "deny";
      return {
        pass,
        message: () =>
          pass
            ? `Expected policy to ALLOW but it DENIED for subject ${subject.id}`
            : `Expected policy to DENY but it ALLOWED for subject ${subject.id}`,
      };
    },

    toDenyWith(received: unknown, subject: AuthSubject, reason: string) {
      if (!isPolicyConstraint(received)) {
        return {
          pass: false,
          message: () => `Expected a PolicyConstraint but received ${typeof received}`,
        };
      }
      const { kind, reason: actualReason } = getDecision(received, subject);
      const pass = kind === "deny" && (actualReason ?? "").includes(reason);
      return {
        pass,
        message: () =>
          pass
            ? `Expected policy NOT to deny with "${reason}" but it did`
            : kind !== "deny"
              ? `Expected policy to DENY with "${reason}" but it ALLOWED for subject ${subject.id}`
              : `Expected deny reason to include "${reason}" but got "${actualReason ?? ""}"`,
      };
    },

    toHaveEvaluated(received: unknown, count: number) {
      if (!hasEvaluationCount(received)) {
        return {
          pass: false,
          message: () => `Expected an object with a numeric evaluationCount property`,
        };
      }
      const actual = received.evaluationCount;
      const pass = actual === count;
      return {
        pass,
        message: () =>
          pass
            ? `Expected engine NOT to have evaluated ${count} times but it did`
            : `Expected engine to have evaluated ${count} times but got ${actual}`,
      };
    },
  });
}
