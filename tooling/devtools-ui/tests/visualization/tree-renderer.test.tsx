/**
 * Tests for TreeRenderer.
 *
 * Spec Section 43.3.3:
 * 1. Renders root node
 * 2. Expands/collapses children
 * 3. Renders children recursively
 * 4. Selection callback fires
 * 5. Keyboard navigation (ArrowDown)
 * 6. Focus tracking
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TreeRenderer } from "../../src/visualization/tree/tree-renderer.js";

afterEach(() => {
  cleanup();
});

// Simple tree structure
interface TreeNode {
  readonly id: string;
  readonly label: string;
  readonly children: readonly TreeNode[];
}

const testTree: TreeNode = {
  id: "root",
  label: "Root",
  children: [
    {
      id: "child1",
      label: "Child 1",
      children: [{ id: "grandchild", label: "Grandchild", children: [] }],
    },
    { id: "child2", label: "Child 2", children: [] },
  ],
};

function getChildren(node: TreeNode): readonly TreeNode[] {
  return node.children;
}

function getKey(node: TreeNode): string {
  return node.id;
}

function renderLabel(node: TreeNode): React.ReactNode {
  return <span data-testid={`label-${node.id}`}>{node.label}</span>;
}

describe("TreeRenderer", () => {
  it("renders the root node", () => {
    render(
      <TreeRenderer
        root={testTree}
        getChildren={getChildren}
        getKey={getKey}
        renderNode={renderLabel}
      />
    );

    expect(screen.getByTestId("tree-renderer")).toBeDefined();
    expect(screen.getByTestId("tree-node-root")).toBeDefined();
    expect(screen.getByTestId("label-root").textContent).toBe("Root");
  });

  it("expands root by default and shows children", () => {
    render(
      <TreeRenderer
        root={testTree}
        getChildren={getChildren}
        getKey={getKey}
        renderNode={renderLabel}
      />
    );

    // Root is expanded by default, so children should be visible
    expect(screen.getByTestId("tree-node-child1")).toBeDefined();
    expect(screen.getByTestId("tree-node-child2")).toBeDefined();
  });

  it("toggles children expand/collapse on chevron click", () => {
    render(
      <TreeRenderer
        root={testTree}
        getChildren={getChildren}
        getKey={getKey}
        renderNode={renderLabel}
      />
    );

    // Grandchild should not be visible (child1 is not expanded)
    expect(screen.queryByTestId("tree-node-grandchild")).toBeNull();

    // Expand child1
    fireEvent.click(screen.getByTestId("tree-chevron-child1"));

    expect(screen.getByTestId("tree-node-grandchild")).toBeDefined();

    // Collapse child1
    fireEvent.click(screen.getByTestId("tree-chevron-child1"));

    expect(screen.queryByTestId("tree-node-grandchild")).toBeNull();
  });

  it("fires onSelect callback", () => {
    const onSelect = vi.fn();

    render(
      <TreeRenderer
        root={testTree}
        getChildren={getChildren}
        getKey={getKey}
        renderNode={renderLabel}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByTestId("tree-node-child1"));

    expect(onSelect).toHaveBeenCalledWith("child1");
  });

  it("supports keyboard ArrowDown navigation", () => {
    const onSelect = vi.fn();

    render(
      <TreeRenderer
        root={testTree}
        getChildren={getChildren}
        getKey={getKey}
        renderNode={renderLabel}
        onSelect={onSelect}
      />
    );

    const treeEl = screen.getByTestId("tree-renderer");

    // ArrowDown from root -> child1
    fireEvent.keyDown(treeEl, { key: "ArrowDown" });

    // Enter to select
    fireEvent.keyDown(treeEl, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith("child1");
  });

  it("renders with custom defaultExpanded set", () => {
    render(
      <TreeRenderer
        root={testTree}
        getChildren={getChildren}
        getKey={getKey}
        renderNode={renderLabel}
        defaultExpanded={new Set(["root", "child1"])}
      />
    );

    // child1 is expanded so grandchild should be visible
    expect(screen.getByTestId("tree-node-grandchild")).toBeDefined();
  });
});
