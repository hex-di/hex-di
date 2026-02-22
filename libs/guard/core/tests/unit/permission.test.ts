import { describe, it, expect, vi } from "vitest";
import {
  createPermission,
  isPermission,
  formatPermission,
  PERMISSION_BRAND,
  createPermissionRegistry,
} from "../../src/tokens/permission.js";
import type { DuplicatePermissionWarning } from "../../src/tokens/permission.js";

describe("createPermission", () => {
  it("creates a permission with resource and action", () => {
    const perm = createPermission({ resource: "user", action: "read" });
    expect(perm.resource).toBe("user");
    expect(perm.action).toBe("read");
  });

  it("has the PERMISSION_BRAND symbol", () => {
    const perm = createPermission({ resource: "user", action: "read" });
    expect((perm as Record<symbol, unknown>)[PERMISSION_BRAND]).toBe(true);
  });

  it("is frozen", () => {
    const perm = createPermission({ resource: "user", action: "read" });
    expect(Object.isFrozen(perm)).toBe(true);
  });

  it("two permissions with same resource+action are structurally compatible at runtime", () => {
    const permA = createPermission({ resource: "user", action: "read" });
    const permB = createPermission({ resource: "user", action: "read" });
    expect(permA.resource).toBe(permB.resource);
    expect(permA.action).toBe(permB.action);
  });
});

describe("isPermission", () => {
  it("returns true for a created permission", () => {
    const perm = createPermission({ resource: "user", action: "read" });
    expect(isPermission(perm)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isPermission(null)).toBe(false);
  });

  it("returns false for a plain object without brand", () => {
    expect(isPermission({ resource: "user", action: "read" })).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isPermission("user:read")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isPermission(undefined)).toBe(false);
  });
});

describe("formatPermission", () => {
  it("formats as resource:action", () => {
    const perm = createPermission({ resource: "user", action: "read" });
    expect(formatPermission(perm)).toBe("user:read");
  });

  it("formats with multi-word resource and action", () => {
    const perm = createPermission({ resource: "order-item", action: "bulk-delete" });
    expect(formatPermission(perm)).toBe("order-item:bulk-delete");
  });
});

describe("PermissionRegistry", () => {
  it("register() returns the permission token", () => {
    const registry = createPermissionRegistry();
    const perm = createPermission({ resource: "doc", action: "read" });
    const registered = registry.register(perm);
    expect(registered).toBe(perm);
  });

  it("getAll() returns all registered permissions", () => {
    const registry = createPermissionRegistry();
    const p1 = createPermission({ resource: "doc", action: "read" });
    const p2 = createPermission({ resource: "doc", action: "write" });
    registry.register(p1);
    registry.register(p2);
    expect(registry.getAll()).toHaveLength(2);
  });

  it("getAll() preserves insertion order", () => {
    const registry = createPermissionRegistry();
    const p1 = createPermission({ resource: "a", action: "read" });
    const p2 = createPermission({ resource: "b", action: "read" });
    const p3 = createPermission({ resource: "c", action: "read" });
    registry.register(p1);
    registry.register(p2);
    registry.register(p3);
    const all = registry.getAll();
    expect(all[0]).toBe(p1);
    expect(all[1]).toBe(p2);
    expect(all[2]).toBe(p3);
  });

  it("duplicate registration calls onDuplicate callback (ACL006)", () => {
    const registry = createPermissionRegistry();
    const perm = createPermission({ resource: "user", action: "read" });
    registry.register(perm);

    const warnings: DuplicatePermissionWarning[] = [];
    registry.register(perm, (w) => warnings.push(w));

    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe("ACL006");
    expect(warnings[0].key).toBe("user:read");
  });

  it("duplicate registration does not add duplicate to getAll()", () => {
    const registry = createPermissionRegistry();
    const perm = createPermission({ resource: "user", action: "read" });
    registry.register(perm);
    registry.register(perm, () => {});
    expect(registry.getAll()).toHaveLength(1);
  });

  it("registries are isolated from each other", () => {
    const r1 = createPermissionRegistry();
    const r2 = createPermissionRegistry();
    const perm = createPermission({ resource: "doc", action: "read" });
    r1.register(perm);
    expect(r1.getAll()).toHaveLength(1);
    expect(r2.getAll()).toHaveLength(0);
  });

  it("no onDuplicate callback: no error thrown for duplicate", () => {
    const registry = createPermissionRegistry();
    const perm = createPermission({ resource: "user", action: "read" });
    registry.register(perm);
    expect(() => registry.register(perm)).not.toThrow();
  });

  it("onDuplicate callback is called with spy", () => {
    const registry = createPermissionRegistry();
    const perm = createPermission({ resource: "x", action: "y" });
    registry.register(perm);
    const spy = vi.fn();
    registry.register(perm, spy);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toMatchObject({ code: "ACL006", key: "x:y" });
  });
});
