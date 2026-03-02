/**
 * Unit tests for PolicyEvaluationTree component.
 *
 * Spec: 03-views-and-wireframes.md (3.3), 04-tree-view.md
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PolicyEvaluationTree } from "../../../src/panels/guard/policy-evaluation-tree.js";
import type {
  GuardEvaluationDescriptor,
  GuardEvaluationExecution,
  PolicyNodeDescriptor,
  EvaluationNodeTrace,
} from "../../../src/panels/guard/types.js";

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

function makeDescriptor(overrides?: Partial<GuardEvaluationDescriptor>): GuardEvaluationDescriptor {
  return {
    descriptorId: "guard:testPort",
    portName: "testPort",
    label: "testPort",
    rootNode: makeNode(),
    leafCount: 1,
    maxDepth: 0,
    policyKinds: new Set(["hasRole"]),
    hasAsyncPolicies: false,
    sourceLocation: undefined,
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

function makeExecution(overrides?: Partial<GuardEvaluationExecution>): GuardEvaluationExecution {
  return {
    executionId: "exec-1",
    descriptorId: "guard:testPort",
    portName: "testPort",
    subject: {
      id: "user-1",
      roles: ["admin"],
      permissions: ["docs:read"],
      attributes: {},
      authenticationMethod: "jwt",
      authenticatedAt: "2026-01-01T00:00:00Z",
      identityProvider: undefined,
    },
    decision: "allow",
    rootTrace: makeTrace(),
    durationMs: 0.5,
    evaluatedAt: "2026-01-01T00:00:00Z",
    reason: undefined,
    visibleFields: undefined,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("PolicyEvaluationTree", () => {
  afterEach(cleanup);

  it("renders tree with single leaf node", () => {
    const descriptor = makeDescriptor();

    render(
      <PolicyEvaluationTree
        descriptorId={descriptor.descriptorId}
        descriptor={descriptor}
        execution={undefined}
        onNodeSelect={vi.fn()}
      />
    );

    const tree = screen.getByTestId("guard-policy-tree");
    expect(tree).toBeDefined();
    expect(tree.getAttribute("role")).toBe("tree");
  });

  it("shows descriptor label and leaf count", () => {
    const descriptor = makeDescriptor({ label: "MyGuard", leafCount: 1 });

    render(
      <PolicyEvaluationTree
        descriptorId={descriptor.descriptorId}
        descriptor={descriptor}
        execution={undefined}
        onNodeSelect={vi.fn()}
      />
    );

    const header = screen.getByTestId("guard-policy-tree-header");
    expect(header.textContent).toContain("MyGuard");
    expect(header.textContent).toContain("1 policies");
  });

  it("shows decision badge when execution provided", () => {
    const descriptor = makeDescriptor();
    const execution = makeExecution({ decision: "allow" });

    render(
      <PolicyEvaluationTree
        descriptorId={descriptor.descriptorId}
        descriptor={descriptor}
        execution={execution}
        onNodeSelect={vi.fn()}
      />
    );

    const badge = screen.getByTestId("guard-policy-tree-decision");
    expect(badge).toBeDefined();
    expect(badge.getAttribute("data-decision")).toBe("allow");
  });

  it("renders without decision badge when no execution", () => {
    const descriptor = makeDescriptor();

    render(
      <PolicyEvaluationTree
        descriptorId={descriptor.descriptorId}
        descriptor={descriptor}
        execution={undefined}
        onNodeSelect={vi.fn()}
      />
    );

    expect(screen.queryByTestId("guard-policy-tree-decision")).toBeNull();
  });

  it("renders nested tree with children", () => {
    const childA = makeNode({
      nodeId: "node-1",
      kind: "hasRole",
      depth: 1,
      leafData: { type: "hasRole", roleName: "editor" },
    });
    const childB = makeNode({
      nodeId: "node-2",
      kind: "hasPermission",
      depth: 1,
      leafData: { type: "hasPermission", resource: "docs", action: "read" },
    });
    const root = makeNode({
      nodeId: "node-0",
      kind: "allOf",
      children: [childA, childB],
      leafData: undefined,
      depth: 0,
    });
    const descriptor = makeDescriptor({
      rootNode: root,
      leafCount: 2,
      maxDepth: 1,
    });

    render(
      <PolicyEvaluationTree
        descriptorId={descriptor.descriptorId}
        descriptor={descriptor}
        execution={undefined}
        onNodeSelect={vi.fn()}
      />
    );

    const treeItems = screen.getAllByRole("treeitem");
    expect(treeItems.length).toBe(3);
  });

  it("calls onNodeSelect when tree node clicked", () => {
    const onNodeSelect = vi.fn();
    const descriptor = makeDescriptor();

    render(
      <PolicyEvaluationTree
        descriptorId={descriptor.descriptorId}
        descriptor={descriptor}
        execution={undefined}
        onNodeSelect={onNodeSelect}
      />
    );

    const node = screen.getByTestId("guard-tree-node");
    fireEvent.click(node);

    expect(onNodeSelect).toHaveBeenCalledWith("node-0");
  });

  it("overlays trace data from execution", () => {
    const descriptor = makeDescriptor();
    const execution = makeExecution({
      rootTrace: makeTrace({ nodeId: "node-0", evaluated: true }),
    });

    render(
      <PolicyEvaluationTree
        descriptorId={descriptor.descriptorId}
        descriptor={descriptor}
        execution={execution}
        onNodeSelect={vi.fn()}
      />
    );

    const node = screen.getByTestId("guard-tree-node");
    expect(node.getAttribute("data-evaluated")).toBe("true");
  });

  it("shows max depth in header", () => {
    const descriptor = makeDescriptor({ maxDepth: 0 });

    render(
      <PolicyEvaluationTree
        descriptorId={descriptor.descriptorId}
        descriptor={descriptor}
        execution={undefined}
        onNodeSelect={vi.fn()}
      />
    );

    const header = screen.getByTestId("guard-policy-tree-header");
    expect(header.textContent).toContain("Depth 0");
  });

  it("handles empty children gracefully", () => {
    const root = makeNode({
      nodeId: "node-0",
      kind: "hasRole",
      children: [],
      depth: 0,
    });
    const descriptor = makeDescriptor({ rootNode: root });

    render(
      <PolicyEvaluationTree
        descriptorId={descriptor.descriptorId}
        descriptor={descriptor}
        execution={undefined}
        onNodeSelect={vi.fn()}
      />
    );

    const tree = screen.getByTestId("guard-policy-tree");
    expect(tree).toBeDefined();
  });

  it("marks skipped nodes when trace has unevaluated entries", () => {
    const descriptor = makeDescriptor();
    const execution = makeExecution({
      rootTrace: makeTrace({ nodeId: "node-0", evaluated: false }),
    });

    render(
      <PolicyEvaluationTree
        descriptorId={descriptor.descriptorId}
        descriptor={descriptor}
        execution={execution}
        onNodeSelect={vi.fn()}
      />
    );

    const node = screen.getByTestId("guard-tree-node");
    expect(node.getAttribute("data-skipped")).toBe("true");
  });
});
