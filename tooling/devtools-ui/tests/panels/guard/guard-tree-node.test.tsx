/**
 * Unit tests for PolicyTreeNode component.
 *
 * Spec: 04-tree-view.md (4.3), 10-visual-encoding.md (10.2, 10.5)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PolicyTreeNode } from "../../../src/panels/guard/policy-tree-node.js";
import type { PolicyNodeDescriptor, EvaluationNodeTrace } from "../../../src/panels/guard/types.js";

// ── Test Fixture Factories ──────────────────────────────────────────────────

function makeNode(overrides?: Partial<PolicyNodeDescriptor>): PolicyNodeDescriptor {
  return {
    nodeId: "node-0",
    kind: "hasRole",
    label: undefined,
    children: [],
    leafData: { type: "hasRole", roleName: "admin" },
    depth: 0,
    fieldStrategy: undefined,
    ...overrides,
  };
}

function makeTrace(overrides?: Partial<EvaluationNodeTrace>): EvaluationNodeTrace {
  return {
    nodeId: "node-0",
    kind: "hasRole",
    result: "allow",
    evaluated: true,
    durationMs: 0.5,
    children: [],
    reason: undefined,
    resolvedValue: undefined,
    asyncResolution: false,
    visibleFields: undefined,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("PolicyTreeNode", () => {
  afterEach(cleanup);

  it("renders node with kind icon and label", () => {
    const node = makeNode();

    render(<PolicyTreeNode node={node} trace={undefined} selected={false} onSelect={vi.fn()} />);

    expect(screen.getByTestId("guard-tree-node-icon")).toBeDefined();
    expect(screen.getByTestId("guard-tree-node-label")).toBeDefined();
  });

  it("shows leaf data for hasRole", () => {
    const node = makeNode({
      leafData: { type: "hasRole", roleName: "admin" },
    });

    render(<PolicyTreeNode node={node} trace={undefined} selected={false} onSelect={vi.fn()} />);

    const leafData = screen.getByTestId("guard-tree-node-leaf-data");
    expect(leafData.textContent).toContain("admin");
  });

  it("shows leaf data for hasPermission", () => {
    const node = makeNode({
      kind: "hasPermission",
      leafData: { type: "hasPermission", resource: "docs", action: "write" },
    });

    render(<PolicyTreeNode node={node} trace={undefined} selected={false} onSelect={vi.fn()} />);

    const leafData = screen.getByTestId("guard-tree-node-leaf-data");
    expect(leafData.textContent).toContain("docs:write");
  });

  it("shows decision badge when trace provided", () => {
    const node = makeNode();
    const trace = makeTrace({ result: "deny" });

    render(<PolicyTreeNode node={node} trace={trace} selected={false} onSelect={vi.fn()} />);

    const badge = screen.getByTestId("guard-tree-node-decision");
    expect(badge).toBeDefined();
    expect(badge.getAttribute("data-decision")).toBe("deny");
  });

  it("no decision badge without trace", () => {
    const node = makeNode();

    render(<PolicyTreeNode node={node} trace={undefined} selected={false} onSelect={vi.fn()} />);

    expect(screen.queryByTestId("guard-tree-node-decision")).toBeNull();
  });

  it("marks node as selected", () => {
    const node = makeNode();

    render(<PolicyTreeNode node={node} trace={undefined} selected={true} onSelect={vi.fn()} />);

    const treeNode = screen.getByTestId("guard-tree-node");
    expect(treeNode.getAttribute("data-selected")).toBe("true");
  });

  it("marks skipped nodes with data attribute", () => {
    const node = makeNode();
    const trace = makeTrace({ evaluated: false });

    render(<PolicyTreeNode node={node} trace={trace} selected={false} onSelect={vi.fn()} />);

    const treeNode = screen.getByTestId("guard-tree-node");
    expect(treeNode.getAttribute("data-skipped")).toBe("true");
  });

  it("shows duration from trace", () => {
    const node = makeNode();
    const trace = makeTrace({ durationMs: 2.5 });

    render(<PolicyTreeNode node={node} trace={trace} selected={false} onSelect={vi.fn()} />);

    expect(screen.getByTestId("guard-tree-node-duration")).toBeDefined();
  });

  it("shows async indicator", () => {
    const node = makeNode();
    const trace = makeTrace({ asyncResolution: true });

    render(<PolicyTreeNode node={node} trace={trace} selected={false} onSelect={vi.fn()} />);

    expect(screen.getByTestId("guard-tree-node-async")).toBeDefined();
  });

  it("calls onSelect on click", () => {
    const onSelect = vi.fn();
    const node = makeNode();

    render(<PolicyTreeNode node={node} trace={undefined} selected={false} onSelect={onSelect} />);

    const treeNode = screen.getByTestId("guard-tree-node");
    fireEvent.click(treeNode);

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("uses kind as label when label is undefined", () => {
    const node = makeNode({ label: undefined, kind: "hasRole" });

    render(<PolicyTreeNode node={node} trace={undefined} selected={false} onSelect={vi.fn()} />);

    const label = screen.getByTestId("guard-tree-node-label");
    expect(label.textContent).toBe("hasRole");
  });

  it("shows field strategy badge", () => {
    const node = makeNode({
      kind: "allOf",
      fieldStrategy: "intersection",
      leafData: undefined,
      children: [],
    });

    render(<PolicyTreeNode node={node} trace={undefined} selected={false} onSelect={vi.fn()} />);

    const strategy = screen.getByTestId("guard-tree-node-strategy");
    expect(strategy).toBeDefined();
    expect(strategy.textContent).toContain("intersection");
  });
});
