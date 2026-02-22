import { describe, it, expect } from "vitest";
import { evaluate } from "../../src/evaluator/evaluate.js";
import {
  hasPermission,
  hasRole,
  hasAttribute,
  hasResourceAttribute,
  hasSignature,
  allOf,
  anyOf,
  not,
  withLabel,
} from "../../src/policy/combinators.js";
import { eq, literal, subject, exists, inArray, gte, lt, someMatch, contains, everyMatch, size } from "../../src/policy/matchers.js";
import { createPermission } from "../../src/tokens/permission.js";
import type { AuthSubject } from "../../src/subject/auth-subject.js";
import type { EvaluationContext } from "../../src/evaluator/evaluate.js";
import type { PolicyConstraint } from "../../src/policy/constraint.js";

const ReadUser = createPermission({ resource: "user", action: "read" });
const WriteUser = createPermission({ resource: "user", action: "write" });

function makeSubject(overrides?: Partial<AuthSubject>): AuthSubject {
  return {
    id: "user-1",
    roles: ["viewer"],
    permissions: new Set(["user:read"]),
    attributes: {},
    authenticationMethod: "password",
    authenticatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeContext(overrides?: Partial<EvaluationContext>): EvaluationContext {
  return {
    subject: makeSubject(),
    ...overrides,
  };
}

describe("evaluate() — hasPermission", () => {
  it("returns Allow when subject has the permission", () => {
    const policy = hasPermission(ReadUser);
    const ctx = makeContext();
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("returns Deny when subject lacks the permission", () => {
    const policy = hasPermission(WriteUser);
    const ctx = makeContext();
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("Deny decision contains reason", () => {
    const policy = hasPermission(WriteUser);
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    expect(decision.kind).toBe("deny");
    if (decision.kind === "deny") {
      expect(decision.reason).toContain("user:write");
    }
  });
});

describe("evaluate() — hasRole", () => {
  it("returns Allow when subject has the role", () => {
    const policy = hasRole("viewer");
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("returns Deny when subject lacks the role", () => {
    const policy = hasRole("admin");
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });
});

describe("evaluate() — hasAttribute", () => {
  it("returns Allow when attribute equals subject ref", () => {
    const ctx = makeContext({
      subject: makeSubject({ id: "user-42", attributes: { ownerId: "user-42" } }),
    });
    const policy = hasAttribute("ownerId", eq(subject("id")));
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("returns Deny when attribute does not match", () => {
    const ctx = makeContext({
      subject: makeSubject({ id: "user-1", attributes: { ownerId: "user-99" } }),
    });
    const policy = hasAttribute("ownerId", eq(subject("id")));
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("supports literal matcher", () => {
    const ctx = makeContext({
      subject: makeSubject({ attributes: { status: "active" } }),
    });
    const policy = hasAttribute("status", eq(literal("active")));
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("supports exists matcher", () => {
    const ctx = makeContext({
      subject: makeSubject({ attributes: { sessionId: "abc" } }),
    });
    const policy = hasAttribute("sessionId", exists());
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("exists returns Deny when attribute is undefined", () => {
    const ctx = makeContext({ subject: makeSubject({ attributes: {} }) });
    const policy = hasAttribute("missing", exists());
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("inArray matcher", () => {
    const ctx = makeContext({
      subject: makeSubject({ attributes: { tier: "gold" } }),
    });
    const policy = hasAttribute("tier", inArray(["silver", "gold", "platinum"]));
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("gte matcher", () => {
    const ctx = makeContext({
      subject: makeSubject({ attributes: { age: 25 } }),
    });
    const r1 = evaluate(hasAttribute("age", gte(18)), ctx);
    expect(r1.isOk()).toBe(true);
    if (!r1.isOk()) return;
    expect(r1.value.kind).toBe("allow");

    const r2 = evaluate(hasAttribute("age", gte(30)), ctx);
    expect(r2.isOk()).toBe(true);
    if (!r2.isOk()) return;
    expect(r2.value.kind).toBe("deny");
  });

  it("lt matcher", () => {
    const ctx = makeContext({
      subject: makeSubject({ attributes: { count: 5 } }),
    });
    const r1 = evaluate(hasAttribute("count", lt(10)), ctx);
    expect(r1.isOk()).toBe(true);
    if (!r1.isOk()) return;
    expect(r1.value.kind).toBe("allow");

    const r2 = evaluate(hasAttribute("count", lt(3)), ctx);
    expect(r2.isOk()).toBe(true);
    if (!r2.isOk()) return;
    expect(r2.value.kind).toBe("deny");
  });

  it("contains matcher for array", () => {
    const ctx = makeContext({
      subject: makeSubject({ attributes: { tags: ["admin", "reviewer"] } }),
    });
    const r1 = evaluate(hasAttribute("tags", contains("admin")), ctx);
    expect(r1.isOk()).toBe(true);
    if (!r1.isOk()) return;
    expect(r1.value.kind).toBe("allow");

    const r2 = evaluate(hasAttribute("tags", contains("banned")), ctx);
    expect(r2.isOk()).toBe(true);
    if (!r2.isOk()) return;
    expect(r2.value.kind).toBe("deny");
  });

  it("someMatch matcher", () => {
    const ctx = makeContext({
      subject: makeSubject({ attributes: { scores: [2, 5, 8] } }),
    });
    const r1 = evaluate(hasAttribute("scores", someMatch(gte(7))), ctx);
    expect(r1.isOk()).toBe(true);
    if (!r1.isOk()) return;
    expect(r1.value.kind).toBe("allow");

    const r2 = evaluate(hasAttribute("scores", someMatch(gte(10))), ctx);
    expect(r2.isOk()).toBe(true);
    if (!r2.isOk()) return;
    expect(r2.value.kind).toBe("deny");
  });

  it("everyMatch matcher", () => {
    const ctx = makeContext({
      subject: makeSubject({ attributes: { values: [3, 6, 9] } }),
    });
    const r1 = evaluate(hasAttribute("values", everyMatch(gte(1))), ctx);
    expect(r1.isOk()).toBe(true);
    if (!r1.isOk()) return;
    expect(r1.value.kind).toBe("allow");

    const r2 = evaluate(hasAttribute("values", everyMatch(gte(5))), ctx);
    expect(r2.isOk()).toBe(true);
    if (!r2.isOk()) return;
    expect(r2.value.kind).toBe("deny");
  });

  it("size matcher", () => {
    const ctx = makeContext({
      subject: makeSubject({ attributes: { tags: ["a", "b", "c"] } }),
    });
    const r1 = evaluate(hasAttribute("tags", size(gte(2))), ctx);
    expect(r1.isOk()).toBe(true);
    if (!r1.isOk()) return;
    expect(r1.value.kind).toBe("allow");

    const r2 = evaluate(hasAttribute("tags", size(lt(2))), ctx);
    expect(r2.isOk()).toBe(true);
    if (!r2.isOk()) return;
    expect(r2.value.kind).toBe("deny");
  });
});

describe("evaluate() — hasResourceAttribute", () => {
  it("returns Allow when resource attribute matches", () => {
    const ctx = makeContext({ resource: { status: "active" } });
    const policy = hasResourceAttribute("status", eq(literal("active")));
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("returns Deny when no resource in context", () => {
    const policy = hasResourceAttribute("status", eq(literal("active")));
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });
});

describe("evaluate() — hasSignature", () => {
  it("returns Allow when a valid matching signature is present", () => {
    const ctx = makeContext({
      signatures: [
        {
          signerId: "user-1",
          signedAt: "2026-01-01T00:00:00.000Z",
          meaning: "approved",
          validated: true,
          reauthenticated: true,
        },
      ],
    });
    const policy = hasSignature("approved");
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("returns Deny when no signatures", () => {
    const policy = hasSignature("approved");
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("returns Deny when signature meaning does not match", () => {
    const ctx = makeContext({
      signatures: [
        {
          signerId: "user-1",
          signedAt: "2026-01-01T00:00:00.000Z",
          meaning: "reviewed",
          validated: true,
          reauthenticated: true,
        },
      ],
    });
    const policy = hasSignature("approved");
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("returns Deny when signature not reauthenticated", () => {
    const ctx = makeContext({
      signatures: [
        {
          signerId: "user-1",
          signedAt: "2026-01-01T00:00:00.000Z",
          meaning: "approved",
          validated: true,
          reauthenticated: false,
        },
      ],
    });
    const policy = hasSignature("approved");
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("checks signerRole when specified", () => {
    const ctxWithRole = makeContext({
      signatures: [
        {
          signerId: "user-1",
          signedAt: "2026-01-01T00:00:00.000Z",
          meaning: "approved",
          validated: true,
          reauthenticated: true,
          signerRoles: ["reviewer"],
        },
      ],
    });
    const r1 = evaluate(hasSignature("approved", { signerRole: "reviewer" }), ctxWithRole);
    expect(r1.isOk()).toBe(true);
    if (!r1.isOk()) return;
    expect(r1.value.kind).toBe("allow");

    const r2 = evaluate(hasSignature("approved", { signerRole: "admin" }), ctxWithRole);
    expect(r2.isOk()).toBe(true);
    if (!r2.isOk()) return;
    expect(r2.value.kind).toBe("deny");
  });
});

describe("evaluate() — allOf (short-circuit)", () => {
  it("returns Allow when all children pass", () => {
    const ctx = makeContext({ subject: makeSubject({ roles: ["admin"] }) });
    const policy = allOf(hasPermission(ReadUser), hasRole("admin"));
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("returns Deny on first failed child (short-circuit)", () => {
    const policy = allOf(hasPermission(WriteUser), hasRole("admin"));
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    expect(decision.kind).toBe("deny");
    if (decision.kind === "deny") {
      expect(decision.trace.children?.length).toBe(1); // stopped after first Deny
    }
  });

  it("propagates Deny reason from child", () => {
    const policy = allOf(hasRole("superadmin"));
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    if (decision.kind === "deny") {
      expect(decision.reason).toContain("superadmin");
    }
  });
});

describe("evaluate() — anyOf (short-circuit)", () => {
  it("returns Allow on first passing child (short-circuit)", () => {
    const ctx = makeContext({ subject: makeSubject({ roles: ["viewer"] }) });
    const policy = anyOf(hasRole("viewer"), hasRole("admin"));
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    expect(decision.kind).toBe("allow");
    if (decision.kind === "allow") {
      expect(decision.trace.children?.length).toBe(1); // stopped after first Allow
    }
  });

  it("returns Deny when no children pass", () => {
    const policy = anyOf(hasRole("admin"), hasRole("moderator"));
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });
});

describe("evaluate() — not", () => {
  it("negates a passing policy to deny", () => {
    const policy = not(hasRole("viewer")); // viewer passes, not denies
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("negates a denying policy to allow", () => {
    const policy = not(hasRole("admin")); // admin denies, not allows
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });
});

describe("evaluate() — labeled", () => {
  it("propagates child result", () => {
    const policy = withLabel("canRead", hasPermission(ReadUser));
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("label appears in trace", () => {
    const policy = withLabel("myLabel", hasPermission(ReadUser));
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.trace.label).toBe("myLabel");
  });
});

describe("evaluate() — decision structure", () => {
  it("Allow decision has evaluationId and evaluatedAt", () => {
    const policy = hasPermission(ReadUser);
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    expect(typeof decision.evaluationId).toBe("string");
    expect(decision.evaluationId.length).toBeGreaterThan(0);
    expect(typeof decision.evaluatedAt).toBe("string");
  });

  it("uses provided evaluationId from context", () => {
    const policy = hasPermission(ReadUser);
    const result = evaluate(policy, makeContext({ evaluationId: "test-id" }));
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.evaluationId).toBe("test-id");
  });

  it("trace has durationMs", () => {
    const policy = hasPermission(ReadUser);
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(typeof result.value.trace.durationMs).toBe("number");
  });
});

describe("evaluate() — depth limit", () => {
  it("throws PolicyEvaluationError when depth limit exceeded", () => {
    // Build a deeply nested allOf that exceeds maxDepth
    let policy: PolicyConstraint = hasPermission(ReadUser);
    for (let i = 0; i < 10; i++) {
      policy = allOf(policy);
    }
    const result = evaluate(policy, makeContext(), { maxDepth: 3 });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("ACL003");
    }
  });
});

describe("evaluate() — visibleFields propagation", () => {
  it("hasPermission with fields populates visibleFields on Allow", () => {
    const policy = hasPermission(ReadUser, { fields: ["name", "email"] });
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    expect(decision.kind).toBe("allow");
    if (decision.kind === "allow") {
      expect(decision.visibleFields).toEqual(["name", "email"]);
    }
  });

  it("hasPermission deny does not set visibleFields", () => {
    const policy = hasPermission(WriteUser, { fields: ["name"] });
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    expect(decision.kind).toBe("deny");
    if (decision.kind === "allow") {
      expect(decision.visibleFields).toBeUndefined();
    }
  });

  it("hasAttribute with fields populates visibleFields on Allow", () => {
    const ctx = makeContext({
      subject: makeSubject({ attributes: { status: "active" } }),
    });
    const policy = hasAttribute("status", eq(literal("active")), { fields: ["id", "name"] });
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    expect(decision.kind).toBe("allow");
    if (decision.kind === "allow") {
      expect(decision.visibleFields).toEqual(["id", "name"]);
    }
  });

  it("allOf intersects visibleFields from all allowing children (least privilege)", () => {
    const ctx = makeContext({ subject: makeSubject({ roles: ["admin"] }) });
    const policy = allOf(
      hasPermission(ReadUser, { fields: ["id", "name", "email"] }),
      hasRole("admin"),
      hasPermission(ReadUser, { fields: ["id", "name"] }),
    );
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    expect(decision.kind).toBe("allow");
    if (decision.kind === "allow") {
      // Intersection of ["id","name","email"] ∩ undefined ∩ ["id","name"] = ["id","name"]
      expect(decision.visibleFields).toEqual(["id", "name"]);
    }
  });

  it("allOf with one child having no fields treats it as universal set", () => {
    const ctx = makeContext({ subject: makeSubject({ roles: ["admin"] }) });
    // hasRole has no fields (undefined = universal), hasPermission has ["name"]
    const policy = allOf(
      hasRole("admin"),
      hasPermission(ReadUser, { fields: ["name"] }),
    );
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    expect(decision.kind).toBe("allow");
    if (decision.kind === "allow") {
      expect(decision.visibleFields).toEqual(["name"]);
    }
  });

  it("anyOf propagates first-allowing child visibleFields", () => {
    const policy = anyOf(
      hasPermission(ReadUser, { fields: ["id", "name"] }),
      hasRole("admin"),
    );
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    expect(decision.kind).toBe("allow");
    if (decision.kind === "allow") {
      expect(decision.visibleFields).toEqual(["id", "name"]);
    }
  });

  it("labeled propagates child visibleFields", () => {
    const policy = withLabel("canRead", hasPermission(ReadUser, { fields: ["id"] }));
    const result = evaluate(policy, makeContext());
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    expect(decision.kind).toBe("allow");
    if (decision.kind === "allow") {
      expect(decision.visibleFields).toEqual(["id"]);
    }
  });

  it("allOf with empty intersection yields empty array", () => {
    const ctx = makeContext({ subject: makeSubject({ roles: ["admin"] }) });
    const policy = allOf(
      hasPermission(ReadUser, { fields: ["name"] }),
      hasRole("admin"),
      hasPermission(ReadUser, { fields: ["email"] }),
    );
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const decision = result.value;
    expect(decision.kind).toBe("allow");
    if (decision.kind === "allow") {
      expect(decision.visibleFields).toEqual([]);
    }
  });
});

describe("evaluate() — temporal authorization via attribute matchers", () => {
  it("gte matcher on hour-of-day attribute: allows during business hours", () => {
    // Simulate: subject.attributes.hourOfDay = 10 (10am, business hours)
    const ctx = makeContext({
      subject: makeSubject({ attributes: { hourOfDay: 10 } }),
    });
    const policy = hasAttribute("hourOfDay", gte(9));
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("lt matcher on hour-of-day attribute: denies after hours", () => {
    const ctx = makeContext({
      subject: makeSubject({ attributes: { hourOfDay: 20 } }),
    });
    // Business hours: 9 <= hour < 17
    const policy = allOf(
      hasAttribute("hourOfDay", gte(9)),
      hasAttribute("hourOfDay", lt(17)),
    );
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("inArray for day-of-week: allows on working days", () => {
    // dayOfWeek: 1=Monday, 5=Friday
    const ctx = makeContext({
      subject: makeSubject({ attributes: { dayOfWeek: 3 } }), // Wednesday
    });
    const policy = hasAttribute("dayOfWeek", inArray([1, 2, 3, 4, 5]));
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("allow");
  });

  it("inArray for day-of-week: denies on weekends", () => {
    const ctx = makeContext({
      subject: makeSubject({ attributes: { dayOfWeek: 6 } }), // Saturday
    });
    const policy = hasAttribute("dayOfWeek", inArray([1, 2, 3, 4, 5]));
    const result = evaluate(policy, ctx);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("deny");
  });

  it("combined temporal policy: business hours on working days", () => {
    const ctxAllowed = makeContext({
      subject: makeSubject({ attributes: { hourOfDay: 14, dayOfWeek: 2 } }),
    });
    const ctxDenied = makeContext({
      subject: makeSubject({ attributes: { hourOfDay: 14, dayOfWeek: 7 } }),
    });
    const policy = allOf(
      hasAttribute("dayOfWeek", inArray([1, 2, 3, 4, 5])),
      hasAttribute("hourOfDay", gte(9)),
      hasAttribute("hourOfDay", lt(18)),
    );
    const r1 = evaluate(policy, ctxAllowed);
    expect(r1.isOk()).toBe(true);
    if (!r1.isOk()) return;
    expect(r1.value.kind).toBe("allow");

    const r2 = evaluate(policy, ctxDenied);
    expect(r2.isOk()).toBe(true);
    if (!r2.isOk()) return;
    expect(r2.value.kind).toBe("deny");
  });
});
