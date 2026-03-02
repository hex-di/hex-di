/**
 * Unit tests for RoleDetail component.
 *
 * Spec: 07-role-hierarchy.md (7.3)
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RoleDetail } from "../../../src/panels/guard/role-detail.js";
import type { SerializedRole } from "../../../src/panels/guard/types.js";

// ── Test Fixture Factories ──────────────────────────────────────────────────

function makeRole(overrides?: Partial<SerializedRole>): SerializedRole {
  return {
    name: "admin",
    inherits: [],
    directPermissions: ["users:manage"],
    flattenedPermissions: ["users:manage"],
    hasCircularInheritance: false,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("RoleDetail", () => {
  afterEach(cleanup);

  it("renders role detail", () => {
    render(
      <RoleDetail role={makeRole({ name: "admin" })} allRoles={[makeRole({ name: "admin" })]} />
    );

    const detail = screen.getByTestId("guard-role-detail");
    expect(detail).toBeDefined();
    expect(detail.getAttribute("data-role")).toBe("admin");
  });

  it("shows direct permissions", () => {
    render(
      <RoleDetail
        role={makeRole({
          directPermissions: ["users:manage", "posts:write"],
          flattenedPermissions: ["users:manage", "posts:write"],
        })}
        allRoles={[]}
      />
    );

    const directSection = screen.getByTestId("guard-role-detail-direct");
    expect(directSection).toBeDefined();

    const items = directSection.querySelectorAll("[data-testid='guard-role-detail-permission']");
    expect(items.length).toBe(2);
  });

  it("shows inherited permissions", () => {
    const role = makeRole({
      name: "admin",
      inherits: ["viewer"],
      directPermissions: ["users:manage"],
      flattenedPermissions: ["users:manage", "posts:read"],
    });
    const viewerRole = makeRole({
      name: "viewer",
      directPermissions: ["posts:read"],
      flattenedPermissions: ["posts:read"],
    });

    render(<RoleDetail role={role} allRoles={[role, viewerRole]} />);

    const inheritedSection = screen.getByTestId("guard-role-detail-inherited");
    expect(inheritedSection).toBeDefined();

    const inheritedItems = inheritedSection.querySelectorAll(
      "[data-testid='guard-role-detail-permission'][data-source='inherited']"
    );
    expect(inheritedItems.length).toBe(1);
    expect(inheritedItems[0].textContent).toBe("posts:read");
  });

  it("shows parent roles", () => {
    const viewerRole = makeRole({
      name: "viewer",
      directPermissions: ["posts:read"],
      flattenedPermissions: ["posts:read"],
    });
    const adminRole = makeRole({
      name: "admin",
      inherits: ["viewer"],
      directPermissions: ["users:manage"],
      flattenedPermissions: ["users:manage", "posts:read"],
    });

    render(<RoleDetail role={adminRole} allRoles={[adminRole, viewerRole]} />);

    const parents = screen.getAllByTestId("guard-role-detail-parent");
    expect(parents.length).toBe(1);
    expect(parents[0].textContent).toContain("viewer");
  });

  it("shows circular inheritance warning", () => {
    render(<RoleDetail role={makeRole({ hasCircularInheritance: true })} allRoles={[]} />);

    expect(screen.getByTestId("guard-role-detail-circular")).toBeDefined();
  });

  it("shows stats summary", () => {
    render(
      <RoleDetail
        role={makeRole({
          directPermissions: ["users:manage", "posts:write"],
          flattenedPermissions: ["users:manage", "posts:write", "posts:read"],
        })}
        allRoles={[]}
      />
    );

    const stats = screen.getByTestId("guard-role-detail-stats");
    expect(stats.textContent).toContain("2 direct permissions");
    expect(stats.textContent).toContain("3 total");
  });
});
