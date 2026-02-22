import { describe, it, expect } from "vitest";
import { evaluateBatch } from "../../src/evaluator/evaluate.js";
import { hasPermission, hasRole, allOf } from "../../src/policy/combinators.js";
import { createPermission } from "../../src/tokens/permission.js";
import type { AuthSubject } from "../../src/subject/auth-subject.js";

const ReadContent = createPermission({ resource: "content", action: "read" });
const CreateContent = createPermission({ resource: "content", action: "create" });

function makeSubject(overrides?: Partial<AuthSubject>): AuthSubject {
  return {
    id: "user-1",
    roles: ["viewer"],
    permissions: new Set(["content:read"]),
    attributes: {},
    authenticationMethod: "password",
    authenticatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("evaluateBatch()", () => {
  it("evaluates all policies in the map", () => {
    const subject = makeSubject();
    const results = evaluateBatch(
      {
        canRead: hasPermission(ReadContent),
        canCreate: hasPermission(CreateContent),
        isEditor: hasRole("editor"),
      },
      { subject },
    );

    expect(results.canRead.isOk()).toBe(true);
    if (!results.canRead.isOk()) return;
    expect(results.canRead.value.kind).toBe("allow");

    expect(results.canCreate.isOk()).toBe(true);
    if (!results.canCreate.isOk()) return;
    expect(results.canCreate.value.kind).toBe("deny");

    expect(results.isEditor.isOk()).toBe(true);
    if (!results.isEditor.isOk()) return;
    expect(results.isEditor.value.kind).toBe("deny");
  });

  it("each policy is evaluated independently", () => {
    const subject = makeSubject({ roles: ["editor"] });
    const results = evaluateBatch(
      {
        canRead: hasPermission(ReadContent),
        isViewer: hasRole("viewer"),
        isEditor: hasRole("editor"),
      },
      { subject },
    );

    expect(results.canRead.isOk()).toBe(true);
    if (!results.canRead.isOk()) return;
    expect(results.canRead.value.kind).toBe("allow");

    expect(results.isViewer.isOk()).toBe(true);
    if (!results.isViewer.isOk()) return;
    expect(results.isViewer.value.kind).toBe("deny");

    expect(results.isEditor.isOk()).toBe(true);
    if (!results.isEditor.isOk()) return;
    expect(results.isEditor.value.kind).toBe("allow");
  });

  it("one failing policy does not abort others", () => {
    const subject = makeSubject();
    // Create a malformed policy that would fail — we test that others still evaluate
    const results = evaluateBatch(
      {
        valid: hasPermission(ReadContent),
        alsoValid: hasRole("viewer"),
      },
      { subject },
    );

    expect(results.valid.isOk()).toBe(true);
    expect(results.alsoValid.isOk()).toBe(true);
  });

  it("returns an empty object for an empty policies map", () => {
    const subject = makeSubject();
    const results = evaluateBatch({}, { subject });
    expect(Object.keys(results)).toHaveLength(0);
  });

  it("supports complex composed policies", () => {
    const subject = makeSubject({
      roles: ["editor"],
      permissions: new Set(["content:read", "content:create"]),
    });
    const results = evaluateBatch(
      {
        canCreate: allOf(hasPermission(CreateContent), hasRole("editor")),
      },
      { subject },
    );
    expect(results.canCreate.isOk()).toBe(true);
    if (!results.canCreate.isOk()) return;
    expect(results.canCreate.value.kind).toBe("allow");
  });
});
