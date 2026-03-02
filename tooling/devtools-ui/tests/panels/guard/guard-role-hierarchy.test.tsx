/**
 * Unit tests for RoleHierarchyGraph component.
 *
 * Spec: 03-views-and-wireframes.md (3.8), 07-role-hierarchy.md
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RoleHierarchyGraph } from "../../../src/panels/guard/role-hierarchy-graph.js";
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

describe("RoleHierarchyGraph", () => {
  afterEach(cleanup);

  it("renders hierarchy graph", () => {
    render(<RoleHierarchyGraph roles={[makeRole()]} onRoleSelect={vi.fn()} />);

    expect(screen.getByTestId("guard-role-hierarchy")).toBeDefined();
  });

  it("renders SVG", () => {
    render(<RoleHierarchyGraph roles={[makeRole()]} onRoleSelect={vi.fn()} />);

    expect(screen.getByTestId("guard-role-hierarchy-svg")).toBeDefined();
  });

  it("shows role nodes", () => {
    const roles = [
      makeRole({ name: "admin" }),
      makeRole({ name: "editor" }),
      makeRole({ name: "viewer" }),
    ];

    render(<RoleHierarchyGraph roles={roles} onRoleSelect={vi.fn()} />);

    const nodes = screen.getAllByTestId("guard-role-node");
    expect(nodes.length).toBe(3);
  });

  it("renders edges for inheritance", () => {
    const roles = [makeRole({ name: "viewer" }), makeRole({ name: "admin", inherits: ["viewer"] })];

    render(<RoleHierarchyGraph roles={roles} onRoleSelect={vi.fn()} />);

    const edges = screen.getAllByTestId("guard-role-edge");
    expect(edges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows circular inheritance warning", () => {
    const roles = [makeRole({ name: "admin", hasCircularInheritance: true })];

    render(<RoleHierarchyGraph roles={roles} onRoleSelect={vi.fn()} />);

    expect(screen.getByTestId("guard-role-circular-warning")).toBeDefined();
  });

  it("calls onRoleSelect on node click", () => {
    const onRoleSelect = vi.fn();
    const roles = [makeRole({ name: "admin" })];

    render(<RoleHierarchyGraph roles={roles} onRoleSelect={onRoleSelect} />);

    const node = screen.getByTestId("guard-role-node");
    fireEvent.click(node);

    expect(onRoleSelect).toHaveBeenCalledWith("admin");
  });

  it("shows permission count on nodes", () => {
    const roles = [
      makeRole({
        name: "admin",
        flattenedPermissions: ["users:manage", "posts:write", "posts:read"],
      }),
    ];

    render(<RoleHierarchyGraph roles={roles} onRoleSelect={vi.fn()} />);

    const node = screen.getByTestId("guard-role-node");
    expect(node.textContent).toContain("3p");
  });

  it("handles empty roles", () => {
    render(<RoleHierarchyGraph roles={[]} onRoleSelect={vi.fn()} />);

    // Should not throw — renders without nodes
    expect(screen.getByTestId("guard-role-hierarchy")).toBeDefined();
    expect(screen.queryAllByTestId("guard-role-node").length).toBe(0);
  });

  it("shows role summary", () => {
    const roles = [makeRole({ name: "admin" }), makeRole({ name: "editor" })];

    render(<RoleHierarchyGraph roles={roles} onRoleSelect={vi.fn()} />);

    const summary = screen.getByTestId("guard-role-summary");
    expect(summary.textContent).toContain("2 roles");
  });
});
