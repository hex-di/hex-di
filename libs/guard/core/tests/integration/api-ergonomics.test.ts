import { describe, it, expect } from "vitest";
import { createRoleGate, RoleGateError } from "../../src/hook/role-gate.js";
import { withAttributes } from "../../src/subject/auth-subject.js";
import { evaluateBatch } from "../../src/evaluator/evaluate.js";
import { hasPermission, hasRole, hasAttribute, allOf } from "../../src/policy/combinators.js";
import { createPermission } from "../../src/tokens/permission.js";
import { createAuthSubject } from "../../src/subject/auth-subject.js";
import { eq, literal } from "../../src/policy/matchers.js";

const ReadDoc = createPermission({ resource: "document", action: "read" });
const WriteDoc = createPermission({ resource: "document", action: "write" });
const AdminDoc = createPermission({ resource: "document", action: "admin" });

function makeSubject(
  roles: string[] = [],
  perms: string[] = [],
  attrs: Record<string, unknown> = {},
) {
  return createAuthSubject("user-1", roles, new Set(perms), attrs);
}

describe("DoD 21 — API ergonomics integration", () => {
  it("createRoleGate + evaluateBatch used together end-to-end", () => {
    const gate = createRoleGate("editor");

    // Subject with editor role passes the gate
    const editorSubject = makeSubject(
      ["editor"],
      ["document:read", "document:write"],
    );
    expect(() =>
      gate.beforeResolve({ portName: "DocumentPort", subject: editorSubject }),
    ).not.toThrow();

    // Batch evaluation of multiple permissions for the editor subject
    const results = evaluateBatch(
      {
        canRead: hasPermission(ReadDoc),
        canWrite: hasPermission(WriteDoc),
        canAdmin: hasPermission(AdminDoc),
        isEditor: hasRole("editor"),
      },
      { subject: editorSubject },
    );

    expect(results.canRead.isOk() && results.canRead.value.kind).toBe("allow");
    expect(results.canWrite.isOk() && results.canWrite.value.kind).toBe("allow");
    expect(results.canAdmin.isOk() && results.canAdmin.value.kind).toBe("deny");
    expect(results.isEditor.isOk() && results.isEditor.value.kind).toBe("allow");

    // Subject without editor role fails the gate
    const viewerSubject = makeSubject(["viewer"], ["document:read"]);
    let gateCaught: unknown;
    try {
      gate.beforeResolve({ portName: "DocumentPort", subject: viewerSubject });
    } catch (e) {
      gateCaught = e;
    }
    expect(gateCaught).toBeInstanceOf(RoleGateError);

    // Batch for viewer
    const viewerResults = evaluateBatch(
      {
        canRead: hasPermission(ReadDoc),
        canWrite: hasPermission(WriteDoc),
        isEditor: hasRole("editor"),
      },
      { subject: viewerSubject },
    );
    expect(viewerResults.canRead.isOk() && viewerResults.canRead.value.kind).toBe("allow");
    expect(viewerResults.canWrite.isOk() && viewerResults.canWrite.value.kind).toBe("deny");
    expect(viewerResults.isEditor.isOk() && viewerResults.isEditor.value.kind).toBe("deny");
  });

  it("withAttributes + evaluateBatch: enriched subject properly evaluated", () => {
    const base = makeSubject(["analyst"], ["document:read"]);

    // Enrich the subject with additional attributes (e.g., from JWT claims or context)
    const enriched = withAttributes(base, {
      department: "engineering",
      clearanceLevel: 3,
    });

    // Verify enriched subject attributes are present
    expect(enriched.attributes["department"]).toBe("engineering");
    expect(enriched.attributes["clearanceLevel"]).toBe(3);

    // The original subject is not mutated
    expect(base.attributes["department"]).toBeUndefined();

    // Policy that checks an attribute on the enriched subject
    const engOnlyPolicy = hasAttribute("department", eq(literal("engineering")));
    const clearancePolicy = hasAttribute("clearanceLevel", eq(literal(3)));
    const composedPolicy = allOf(
      hasPermission(ReadDoc),
      engOnlyPolicy,
    );

    const results = evaluateBatch(
      {
        canRead: hasPermission(ReadDoc),
        isEngineer: engOnlyPolicy,
        hasClearance: clearancePolicy,
        composed: composedPolicy,
      },
      { subject: enriched },
    );

    expect(results.canRead.isOk() && results.canRead.value.kind).toBe("allow");
    expect(results.isEngineer.isOk() && results.isEngineer.value.kind).toBe("allow");
    expect(results.hasClearance.isOk() && results.hasClearance.value.kind).toBe("allow");
    expect(results.composed.isOk() && results.composed.value.kind).toBe("allow");

    // Enriched subject with wrong department
    const marketingSubject = withAttributes(base, { department: "marketing", clearanceLevel: 1 });
    const marketingResults = evaluateBatch(
      {
        isEngineer: engOnlyPolicy,
        hasClearance: clearancePolicy,
      },
      { subject: marketingSubject },
    );

    expect(marketingResults.isEngineer.isOk() && marketingResults.isEngineer.value.kind).toBe(
      "deny",
    );
    expect(marketingResults.hasClearance.isOk() && marketingResults.hasClearance.value.kind).toBe(
      "deny",
    );
  });
});
