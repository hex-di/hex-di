import { describe, it, expect } from "vitest";
import { createRoleGate, RoleGateError } from "../../src/hook/role-gate.js";
import { withAttributes, getAttribute, createAuthSubject } from "../../src/subject/auth-subject.js";
import { evaluateBatch } from "../../src/evaluator/evaluate.js";
import { hasPermission, hasRole } from "../../src/policy/combinators.js";
import { createPermission } from "../../src/tokens/permission.js";

const ReadContent = createPermission({ resource: "content", action: "read" });

function makeSubject(roles: string[] = [], perms: string[] = []) {
  return createAuthSubject("user-1", roles, new Set(perms));
}

describe("createRoleGate()", () => {
  it("allows subject with matching role", () => {
    const gate = createRoleGate("admin");
    const subject = makeSubject(["admin"]);
    expect(() => gate.beforeResolve({ portName: "AdminPort", subject })).not.toThrow();
  });

  it("throws RoleGateError when subject lacks the required role", () => {
    const gate = createRoleGate("admin");
    const subject = makeSubject(["viewer"]);
    expect(() => gate.beforeResolve({ portName: "AdminPort", subject })).toThrow(RoleGateError);
  });

  it("throws RoleGateError when no subject provided", () => {
    const gate = createRoleGate("admin");
    expect(() => gate.beforeResolve({ portName: "AdminPort" })).toThrow(RoleGateError);
  });

  it("RoleGateError carries the required role name and subjectId", () => {
    const gate = createRoleGate("admin");
    const subject = makeSubject(["viewer"]);
    let caught: unknown;
    try {
      gate.beforeResolve({ portName: "SecurePort", subject });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(RoleGateError);
    const err = caught as RoleGateError;
    expect(err.roleName).toBe("admin");
    expect(err.subjectId).toBe("user-1");
  });

  it("a gate for role A does not block subject with only role B", () => {
    const gate = createRoleGate("manager");
    const subject = makeSubject(["admin"]);
    expect(() => gate.beforeResolve({ portName: "Port", subject })).toThrow(RoleGateError);
  });

  it("allows subject with the role among many roles", () => {
    const gate = createRoleGate("editor");
    const subject = makeSubject(["viewer", "editor", "commenter"]);
    expect(() => gate.beforeResolve({ portName: "EditorPort", subject })).not.toThrow();
  });
});

describe("withAttributes() and getAttribute()", () => {
  it("withAttributes merges attributes", () => {
    const base = makeSubject();
    const enhanced = withAttributes(base, { department: "engineering" });
    expect(enhanced.attributes["department"]).toBe("engineering");
  });

  it("withAttributes does not mutate the original subject", () => {
    const base = makeSubject();
    withAttributes(base, { department: "engineering" });
    expect(base.attributes["department"]).toBeUndefined();
  });

  it("withAttributes result is frozen", () => {
    const base = makeSubject();
    const enhanced = withAttributes(base, { x: 1 });
    expect(Object.isFrozen(enhanced)).toBe(true);
  });

  it("getAttribute retrieves a typed attribute", () => {
    const base = makeSubject();
    const s = withAttributes(base, { level: 5 });
    const level = getAttribute(s, "level");
    expect(level).toBe(5);
  });

  it("getAttribute returns undefined for missing attribute", () => {
    const base = makeSubject();
    expect(getAttribute(base, "missing")).toBeUndefined();
  });

  it("withAttributes override: later attributes win", () => {
    const base = createAuthSubject("u", [], new Set(), { x: 1 });
    const updated = withAttributes(base, { x: 2 });
    expect(updated.attributes["x"]).toBe(2);
  });
});

describe("evaluateBatch() — API ergonomics", () => {
  it("handles mixed allow/deny in a single batch", () => {
    const subject = makeSubject(["viewer"], ["content:read"]);
    const results = evaluateBatch(
      {
        canRead: hasPermission(ReadContent),
        isAdmin: hasRole("admin"),
      },
      { subject },
    );
    expect(results.canRead.isOk()).toBe(true);
    if (!results.canRead.isOk()) return;
    expect(results.canRead.value.kind).toBe("allow");

    expect(results.isAdmin.isOk()).toBe(true);
    if (!results.isAdmin.isOk()) return;
    expect(results.isAdmin.value.kind).toBe("deny");
  });

  it("result keys match the input policy keys", () => {
    const subject = makeSubject();
    const results = evaluateBatch(
      { alpha: hasRole("a"), beta: hasRole("b") },
      { subject },
    );
    expect(Object.keys(results).sort()).toEqual(["alpha", "beta"]);
  });
});
