import { describe, it, expect, beforeEach } from "vitest";
import { testPolicy } from "../../src/testing/policy.js";
import { createPolicyDiffReport, policiesAreEquivalent } from "../../src/testing/diff.js";
import { createTestSubject, resetSubjectCounter } from "../../src/fixtures/subjects.js";
import { hasPermission, hasRole, allOf, anyOf, createPermission } from "@hex-di/guard";

const ReadDoc = createPermission({ resource: "document", action: "read" });
const WriteDoc = createPermission({ resource: "document", action: "write" });

describe("testPolicy()", () => {
  beforeEach(() => {
    resetSubjectCounter();
  });

  it("returns allowed=true when policy grants access", () => {
    const subject = createTestSubject({ permissions: ["document:read"] });
    const result = testPolicy(hasPermission(ReadDoc), subject);
    expect(result.allowed).toBe(true);
    expect(result.denied).toBe(false);
    expect(result.decision).toBe("allow");
  });

  it("returns denied=true when policy denies access", () => {
    const subject = createTestSubject({ permissions: [] });
    const result = testPolicy(hasPermission(ReadDoc), subject);
    expect(result.allowed).toBe(false);
    expect(result.denied).toBe(true);
    expect(result.decision).toBe("deny");
  });

  it("evaluates role policies", () => {
    const admin = createTestSubject({ roles: ["admin"] });
    const guest = createTestSubject({ roles: [] });
    expect(testPolicy(hasRole("admin"), admin).allowed).toBe(true);
    expect(testPolicy(hasRole("admin"), guest).allowed).toBe(false);
  });

  it("evaluates allOf composed policies", () => {
    const subject = createTestSubject({
      roles: ["editor"],
      permissions: ["document:read", "document:write"],
    });
    const policy = allOf(hasPermission(ReadDoc), hasRole("editor"));
    expect(testPolicy(policy, subject).allowed).toBe(true);
  });

  it("evaluates anyOf composed policies", () => {
    const subject = createTestSubject({ roles: ["viewer"] });
    const policy = anyOf(hasRole("admin"), hasRole("viewer"));
    expect(testPolicy(policy, subject).allowed).toBe(true);
  });

  it("result.reason is a non-empty string", () => {
    const subject = createTestSubject();
    const result = testPolicy(hasRole("admin"), subject);
    expect(typeof result.reason).toBe("string");
    expect(result.reason.length).toBeGreaterThan(0);
  });
});

describe("createPolicyDiffReport()", () => {
  beforeEach(() => {
    resetSubjectCounter();
  });

  it("reports no changes when policies are identical", () => {
    const subject = createTestSubject({ permissions: ["document:read"] });
    const policy = hasPermission(ReadDoc);
    const report = createPolicyDiffReport(
      { canRead: policy },
      { canRead: policy },
      subject,
    );
    expect(report.hasChanges).toBe(false);
    expect(report.changedCount).toBe(0);
  });

  it("reports change when decision flips", () => {
    const subject = createTestSubject({ permissions: ["document:read"] });
    // Old policy allows, new policy requires write (which subject doesn't have)
    const report = createPolicyDiffReport(
      { canAct: hasPermission(ReadDoc) },
      { canAct: hasPermission(WriteDoc) },
      subject,
    );
    expect(report.hasChanges).toBe(true);
    expect(report.changedCount).toBe(1);
    const entry = report.entries[0];
    if (entry === undefined) return;
    expect(entry.oldDecision).toBe("allow");
    expect(entry.newDecision).toBe("deny");
    expect(entry.changed).toBe(true);
  });

  it("reports error for missing policy key", () => {
    const subject = createTestSubject();
    const report = createPolicyDiffReport(
      { canRead: hasPermission(ReadDoc) },
      {},
      subject,
    );
    const entry = report.entries.find((e) => e.key === "canRead");
    if (entry === undefined) return;
    expect(entry.newDecision).toBe("error");
    expect(entry.changed).toBe(true);
  });

  it("includes all keys from both maps", () => {
    const subject = createTestSubject({ permissions: ["document:read"] });
    const report = createPolicyDiffReport(
      { canRead: hasPermission(ReadDoc) },
      { canWrite: hasPermission(WriteDoc) },
      subject,
    );
    const keys = report.entries.map((e) => e.key).sort();
    expect(keys).toEqual(["canRead", "canWrite"].sort());
  });
});

describe("policiesAreEquivalent()", () => {
  it("returns true for structurally identical policies", () => {
    const subject = createTestSubject({ permissions: ["document:read"] });
    const policyA = hasPermission(ReadDoc);
    const policyB = hasPermission(ReadDoc);
    expect(policiesAreEquivalent(policyA, policyB, [subject])).toBe(true);
  });

  it("returns false when policies produce different decisions", () => {
    const subject = createTestSubject({ permissions: ["document:read"] });
    expect(
      policiesAreEquivalent(
        hasPermission(ReadDoc),
        hasPermission(WriteDoc),
        [subject],
      ),
    ).toBe(false);
  });

  it("returns true for empty subjects array", () => {
    expect(
      policiesAreEquivalent(hasRole("admin"), hasRole("viewer"), []),
    ).toBe(true);
  });

  it("returns true for equivalent allOf policies", () => {
    const policyA = allOf(hasPermission(ReadDoc), hasRole("editor"));
    const policyB = allOf(hasPermission(ReadDoc), hasRole("editor"));
    const subject = createTestSubject({
      permissions: ["document:read"],
      roles: ["editor"],
    });
    expect(policiesAreEquivalent(policyA, policyB, [subject])).toBe(true);
  });
});

describe("testPolicy() fluent API", () => {
  beforeEach(() => {
    resetSubjectCounter();
  });

  it(".against(subject).expectAllow() passes for allowed policy", () => {
    const subject = createTestSubject({ permissions: ["document:read"] });
    const result = testPolicy(hasPermission(ReadDoc)).against(subject).expectAllow();
    expect(result.allowed).toBe(true);
  });

  it(".against(subject).expectDeny() passes for denied policy", () => {
    const subject = createTestSubject({ permissions: [] });
    const result = testPolicy(hasPermission(ReadDoc)).against(subject).expectDeny();
    expect(result.denied).toBe(true);
  });

  it(".against(subject).expectDeny(reason) checks reason substring", () => {
    const subject = createTestSubject({ permissions: [] });
    // Should contain something about the permission being denied
    expect(() =>
      testPolicy(hasPermission(ReadDoc)).against(subject).expectDeny("FAKE_REASON_NOT_PRESENT"),
    ).toThrow("does not include");
  });

  it(".against(subject).result() returns raw result without asserting", () => {
    const subject = createTestSubject({ permissions: ["document:read"] });
    const result = testPolicy(hasPermission(ReadDoc)).against(subject).result();
    expect(result.allowed).toBe(true);
    expect(result.decision).toBe("allow");
    expect(typeof result.reason).toBe("string");
  });
});

describe("createPolicyDiffReport() — additional coverage", () => {
  beforeEach(() => {
    resetSubjectCounter();
  });

  it("identical single-key policies report hasChanges:false", () => {
    const subject = createTestSubject({ roles: ["admin"] });
    const policy = hasRole("admin");
    const report = createPolicyDiffReport(
      { check: policy },
      { check: policy },
      subject,
    );
    expect(report.hasChanges).toBe(false);
    expect(report.changedCount).toBe(0);
  });

  it("reports added key as change", () => {
    const subject = createTestSubject({ permissions: ["document:read"] });
    const report = createPolicyDiffReport(
      {},
      { canRead: hasPermission(ReadDoc) },
      subject,
    );
    expect(report.hasChanges).toBe(true);
    const entry = report.entries.find((e) => e.key === "canRead");
    expect(entry?.oldDecision).toBe("error"); // missing from old
    expect(entry?.newDecision).toBe("allow");
    expect(entry?.changed).toBe(true);
  });
});
