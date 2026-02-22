import { describe, it, expect } from "vitest";
import { createPermission } from "../../src/tokens/permission.js";
import {
  createRole,
  flattenPermissions,
  isRole,
  ROLE_BRAND,
  createMutuallyExclusiveRoles,
  validateSoDConstraints,
} from "../../src/tokens/role.js";

const Read = createPermission({ resource: "user", action: "read" });
const Write = createPermission({ resource: "user", action: "write" });
const Delete = createPermission({ resource: "user", action: "delete" });
const Admin = createPermission({ resource: "system", action: "admin" });

describe("createRole", () => {
  it("creates a role with a name", () => {
    const Viewer = createRole({ name: "viewer", permissions: [Read] });
    expect(Viewer.name).toBe("viewer");
  });

  it("has the ROLE_BRAND symbol", () => {
    const Viewer = createRole({ name: "viewer", permissions: [Read] });
    expect((Viewer as Record<symbol, unknown>)[ROLE_BRAND]).toBe(true);
  });

  it("is frozen", () => {
    const Viewer = createRole({ name: "viewer", permissions: [Read] });
    expect(Object.isFrozen(Viewer)).toBe(true);
  });

  it("includes direct permissions", () => {
    const Viewer = createRole({ name: "viewer", permissions: [Read] });
    expect(Viewer.permissions).toContain(Read);
  });

  it("flattens inherited permissions eagerly", () => {
    const Viewer = createRole({ name: "viewer", permissions: [Read] });
    const Editor = createRole({
      name: "editor",
      permissions: [Write],
      inherits: [Viewer],
    });
    const permKeys = Editor.permissions.map((p) => `${p.resource}:${p.action}`);
    expect(permKeys).toContain("user:read");
    expect(permKeys).toContain("user:write");
  });

  it("deduplicates permissions when ancestor is shared (DAG)", () => {
    const Viewer = createRole({ name: "viewer", permissions: [Read] });
    const EditorA = createRole({ name: "editorA", permissions: [Write], inherits: [Viewer] });
    const EditorB = createRole({ name: "editorB", permissions: [Delete], inherits: [Viewer] });
    const Lead = createRole({ name: "lead", permissions: [], inherits: [EditorA, EditorB] });

    const readPerms = Lead.permissions.filter(
      (p) => p.resource === "user" && p.action === "read",
    );
    expect(readPerms.length).toBe(1);
  });

  it("creates role with no inherits", () => {
    const Root = createRole({ name: "root", permissions: [Admin] });
    expect(Root.inherits).toHaveLength(0);
  });
});

describe("flattenPermissions", () => {
  it("returns Ok with direct permissions", () => {
    const Viewer = createRole({ name: "viewer", permissions: [Read] });
    const result = flattenPermissions(Viewer);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const perms = result.value.map((p) => `${p.resource}:${p.action}`);
    expect(perms).toContain("user:read");
  });

  it("returns Ok with flattened inherited permissions", () => {
    const Viewer = createRole({ name: "viewer", permissions: [Read] });
    const Editor = createRole({ name: "editor", permissions: [Write], inherits: [Viewer] });
    const result = flattenPermissions(Editor);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const perms = result.value.map((p) => `${p.resource}:${p.action}`);
    expect(perms).toContain("user:read");
    expect(perms).toContain("user:write");
  });

  it("detects circular inheritance and returns Err", () => {
    // Build a circular structure manually (bypassing createRole type checks)
    const roleA: {
      [ROLE_BRAND]: true;
      name: string;
      permissions: typeof Read[];
      inherits: typeof roleB[];
    } = {
      [ROLE_BRAND]: true as const,
      name: "roleA",
      permissions: [Read],
      inherits: [],
    };
    const roleB: {
      [ROLE_BRAND]: true;
      name: string;
      permissions: typeof Write[];
      inherits: typeof roleA[];
    } = {
      [ROLE_BRAND]: true as const,
      name: "roleB",
      permissions: [Write],
      inherits: [roleA],
    };
    // Create the cycle
    (roleA.inherits as unknown as typeof roleB[]).push(roleB);

    const result = flattenPermissions(roleA);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("ACL002");
    }
  });
});

describe("isRole", () => {
  it("returns true for a created role", () => {
    const Viewer = createRole({ name: "viewer", permissions: [] });
    expect(isRole(Viewer)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isRole(null)).toBe(false);
  });

  it("returns false for a plain object", () => {
    expect(isRole({ name: "admin" })).toBe(false);
  });
});

describe("MutuallyExclusiveRoles (SoD constraints)", () => {
  it("createMutuallyExclusiveRoles creates frozen constraint", () => {
    const constraint = createMutuallyExclusiveRoles(["approver", "requester"], "Four-eyes");
    expect(constraint._tag).toBe("MutuallyExclusiveRoles");
    expect(constraint.roles).toEqual(["approver", "requester"]);
    expect(constraint.reason).toBe("Four-eyes");
    expect(Object.isFrozen(constraint)).toBe(true);
  });

  it("validateSoDConstraints returns empty array when no violation", () => {
    const constraint = createMutuallyExclusiveRoles(["approver", "requester"], "Four-eyes");
    const conflicts = validateSoDConstraints(["approver", "viewer"], [constraint]);
    expect(conflicts).toHaveLength(0);
  });

  it("validateSoDConstraints returns conflict when subject holds two exclusive roles", () => {
    const constraint = createMutuallyExclusiveRoles(["approver", "requester"], "Four-eyes");
    const conflicts = validateSoDConstraints(["approver", "requester", "viewer"], [constraint]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].constraint).toBe(constraint);
    expect(conflicts[0].conflictingRoles).toContain("approver");
    expect(conflicts[0].conflictingRoles).toContain("requester");
  });

  it("validateSoDConstraints handles multiple constraints", () => {
    const c1 = createMutuallyExclusiveRoles(["approver", "requester"], "Four-eyes");
    const c2 = createMutuallyExclusiveRoles(["auditor", "admin"], "Separation");
    const conflicts = validateSoDConstraints(
      ["approver", "requester", "auditor", "admin"],
      [c1, c2],
    );
    expect(conflicts).toHaveLength(2);
  });

  it("validateSoDConstraints returns empty for subject with only one exclusive role", () => {
    const constraint = createMutuallyExclusiveRoles(["approver", "requester", "reviewer"], "SoD");
    const conflicts = validateSoDConstraints(["approver"], [constraint]);
    expect(conflicts).toHaveLength(0);
  });

  it("conflict includes only conflicting roles (not all subject roles)", () => {
    const constraint = createMutuallyExclusiveRoles(["a", "b", "c"], "Three-way exclusion");
    const conflicts = validateSoDConstraints(["a", "b", "viewer"], [constraint]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictingRoles).toContain("a");
    expect(conflicts[0].conflictingRoles).toContain("b");
    expect(conflicts[0].conflictingRoles).not.toContain("viewer");
  });
});
