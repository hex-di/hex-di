import { describe, it, expect } from "vitest";
import { createPermissionGroup } from "../../src/tokens/permission-group.js";
import { isPermission } from "../../src/tokens/permission.js";

describe("createPermissionGroup (array overload)", () => {
  it("creates permissions for each action in the array", () => {
    const UserPerms = createPermissionGroup("user", ["read", "write", "delete"] as const);
    expect(isPermission(UserPerms.read)).toBe(true);
    expect(isPermission(UserPerms.write)).toBe(true);
    expect(isPermission(UserPerms.delete)).toBe(true);
  });

  it("each permission has the correct resource", () => {
    const OrderPerms = createPermissionGroup("order", ["create", "cancel"] as const);
    expect(OrderPerms.create.resource).toBe("order");
    expect(OrderPerms.cancel.resource).toBe("order");
  });

  it("each permission has the correct action", () => {
    const DocPerms = createPermissionGroup("document", ["view", "edit"] as const);
    expect(DocPerms.view.action).toBe("view");
    expect(DocPerms.edit.action).toBe("edit");
  });

  it("the group object is frozen", () => {
    const Perms = createPermissionGroup("item", ["list"] as const);
    expect(Object.isFrozen(Perms)).toBe(true);
  });
});

describe("createPermissionGroup (object overload)", () => {
  it("creates permissions from an options object", () => {
    const Perms = createPermissionGroup("report", {
      view: { description: "View reports" },
      export: { description: "Export reports" },
    });
    expect(isPermission(Perms.view)).toBe(true);
    expect(isPermission(Perms.export)).toBe(true);
  });

  it("each permission has the correct resource", () => {
    const Perms = createPermissionGroup("invoice", {
      create: {},
      delete: {},
    });
    expect(Perms.create.resource).toBe("invoice");
    expect(Perms.delete.resource).toBe("invoice");
  });
});
