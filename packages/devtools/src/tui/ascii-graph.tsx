/**
 * TUIGraphRenderer - ASCII art graph renderer for terminal environments.
 *
 * Uses box-drawing characters for connections and implements
 * a tree-based layout algorithm for hierarchical display.
 *
 * @packageDocumentation
 */

/// <reference path="./opentui.d.ts" />

import React from "react";
import type {
  GraphRendererProps,
  GraphNodeViewModelMinimal,
  GraphEdgeViewModelMinimal,
} from "../ports/render-primitives.port.js";
import { TUIStyleSystem } from "./primitives.js";
import { TUISpan, TUIText } from "./opentui-elements.js";

// =============================================================================
// Box-Drawing Characters
// =============================================================================

const BOX_CHARS = {
  horizontal: "\u2500", // -
  vertical: "\u2502",   // |
  cornerTopLeft: "\u250C", // +
  cornerTopRight: "\u2510", // +
  cornerBottomLeft: "\u2514", // L
  cornerBottomRight: "\u2518", // J
  teeRight: "\u251C", // |-
  teeLeft: "\u2524",  // -|
  teeDown: "\u252C",  // T
  teeUp: "\u2534",    // _|_
  cross: "\u253C",    // +
  arrow: "\u2192",    // ->
} as const;

// =============================================================================
// Lifetime Badges
// =============================================================================

/**
 * Get lifetime badge text for display.
 */
function getLifetimeBadge(lifetime: string): string {
  switch (lifetime) {
    case "singleton":
      return "[S1]";
    case "scoped":
      return "[SC]";
    case "transient":
      return "[TR]";
    default:
      return "[--]";
  }
}

/**
 * Get lifetime color using TUI style system.
 */
function getLifetimeColor(lifetime: string): string {
  switch (lifetime) {
    case "singleton":
      return TUIStyleSystem.getColor("success");
    case "scoped":
      return TUIStyleSystem.getColor("primary");
    case "transient":
      return TUIStyleSystem.getColor("warning");
    default:
      return TUIStyleSystem.getColor("muted");
  }
}

// =============================================================================
// Tree Building
// =============================================================================

interface TreeNode {
  id: string;
  node: GraphNodeViewModelMinimal;
  children: TreeNode[];
  depth: number;
}

/**
 * Build a tree structure from the graph for ASCII rendering.
 * Finds root nodes (nodes with no incoming edges) and builds subtrees.
 */
function buildTree(
  nodes: readonly GraphNodeViewModelMinimal[],
  edges: readonly GraphEdgeViewModelMinimal[]
): TreeNode[] {
  // Build adjacency map (parent -> children based on edge direction)
  const childrenMap = new Map<string, string[]>();
  const hasIncoming = new Set<string>();

  for (const edge of edges) {
    const children = childrenMap.get(edge.from) ?? [];
    children.push(edge.to);
    childrenMap.set(edge.from, children);
    hasIncoming.add(edge.to);
  }

  // Find root nodes (nodes with no incoming edges)
  const roots = nodes.filter((n) => !hasIncoming.has(n.id));

  // If no roots found (circular graph), use all nodes as roots
  const rootNodes = roots.length > 0 ? roots : nodes.slice(0, 1);

  // Build tree recursively
  const visited = new Set<string>();

  function buildSubtree(nodeId: string, depth: number): TreeNode | null {
    if (visited.has(nodeId)) {
      return null; // Prevent cycles
    }
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      return null;
    }

    const childIds = childrenMap.get(nodeId) ?? [];
    const children: TreeNode[] = [];

    for (const childId of childIds) {
      const childTree = buildSubtree(childId, depth + 1);
      if (childTree) {
        children.push(childTree);
      }
    }

    return {
      id: nodeId,
      node,
      children,
      depth,
    };
  }

  const trees: TreeNode[] = [];
  for (const root of rootNodes) {
    const tree = buildSubtree(root.id, 0);
    if (tree) {
      trees.push(tree);
    }
  }

  return trees;
}

// TUISpan, TUIText are imported from opentui-elements.js

// =============================================================================
// Tree Node Renderer
// =============================================================================

interface TreeNodeRendererProps {
  readonly tree: TreeNode;
  readonly isLast: boolean;
  readonly prefix: string;
  readonly selectedNodeId: string | null;
}

function TreeNodeRenderer({
  tree,
  isLast,
  prefix,
  selectedNodeId,
}: TreeNodeRendererProps): React.ReactElement {
  const { node, children } = tree;

  // Determine if this node is selected
  const isSelected = selectedNodeId === node.id;

  // Build the connector prefix
  const connector = isLast ? BOX_CHARS.cornerBottomLeft : BOX_CHARS.teeRight;
  const nodePrefix = prefix + connector + BOX_CHARS.horizontal;

  // Build prefix for children
  const childPrefix = prefix + (isLast ? "  " : BOX_CHARS.vertical + " ");

  // Get lifetime badge and color
  const badge = getLifetimeBadge(node.lifetime);
  const lifetimeColor = getLifetimeColor(node.lifetime);

  // Selected node styling
  const labelColor = isSelected
    ? TUIStyleSystem.getColor("accent")
    : TUIStyleSystem.getColor("foreground");
  const borderColor = isSelected
    ? TUIStyleSystem.getColor("accent")
    : TUIStyleSystem.getColor("border");

  return (
    <box flexDirection="column">
      {/* Node line */}
      <box flexDirection="row">
        <TUIText>
          {TUISpan({ fg: borderColor, children: nodePrefix })}
          {" "}
          {TUISpan({ fg: lifetimeColor, children: badge })}
          {" "}
          {TUISpan({ fg: labelColor, children: node.label })}
          {node.factoryKind === "async" && TUISpan({ fg: TUIStyleSystem.getColor("warning"), children: " [A]" })}
        </TUIText>
      </box>

      {/* Children */}
      {children.map((child, index) => (
        <TreeNodeRenderer
          key={child.id}
          tree={child}
          isLast={index === children.length - 1}
          prefix={childPrefix}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </box>
  );
}

// =============================================================================
// Root Tree Renderer
// =============================================================================

interface RootTreeRendererProps {
  readonly tree: TreeNode;
  readonly selectedNodeId: string | null;
}

function RootTreeRenderer({
  tree,
  selectedNodeId,
}: RootTreeRendererProps): React.ReactElement {
  const { node, children } = tree;

  // Determine if this node is selected
  const isSelected = selectedNodeId === node.id;

  // Get lifetime badge and color
  const badge = getLifetimeBadge(node.lifetime);
  const lifetimeColor = getLifetimeColor(node.lifetime);

  // Selected node styling
  const labelColor = isSelected
    ? TUIStyleSystem.getColor("accent")
    : TUIStyleSystem.getColor("foreground");

  return (
    <box flexDirection="column">
      {/* Root node */}
      <box flexDirection="row">
        <TUIText>
          {TUISpan({ fg: lifetimeColor, children: badge })}
          {" "}
          {TUISpan({ fg: labelColor, children: node.label })}
          {node.factoryKind === "async" && TUISpan({ fg: TUIStyleSystem.getColor("warning"), children: " [A]" })}
        </TUIText>
      </box>

      {/* Children */}
      {children.map((child, index) => (
        <TreeNodeRenderer
          key={child.id}
          tree={child}
          isLast={index === children.length - 1}
          prefix=""
          selectedNodeId={selectedNodeId}
        />
      ))}
    </box>
  );
}

// =============================================================================
// Main TUIGraphRenderer Component
// =============================================================================

/**
 * TUI-based ASCII graph renderer.
 *
 * Renders a dependency graph as ASCII art with:
 * - Box-drawing characters for tree structure
 * - Lifetime badges with color coding
 * - Focusable nodes for navigation
 *
 * @remarks
 * In TUI environments, selection is typically handled via focus events
 * rather than click events. The focusable prop on node boxes enables
 * keyboard-based navigation between nodes.
 */
export function TUIGraphRenderer({
  viewModel,
  onNodeSelect: _onNodeSelect,
}: GraphRendererProps): React.ReactElement {
  // Handle empty graph
  if (viewModel.isEmpty || viewModel.nodes.length === 0) {
    return (
      <box flexDirection="column" paddingTop={1} paddingBottom={1}>
        <TUIText>
          {TUISpan({
            fg: TUIStyleSystem.getColor("muted"),
            children: "(empty graph - no services registered)",
          })}
        </TUIText>
      </box>
    );
  }

  // Build tree structure from graph
  const trees = buildTree(viewModel.nodes, viewModel.edges);

  return (
    <box flexDirection="column" paddingTop={1} paddingBottom={1}>
      {/* Header */}
      <TUIText>
        {TUISpan({
          fg: TUIStyleSystem.getColor("primary"),
          children: `Dependency Graph (${viewModel.nodeCount} nodes, ${viewModel.edgeCount} edges)`,
        })}
      </TUIText>

      {/* Divider */}
      <TUIText>
        {TUISpan({
          fg: TUIStyleSystem.getColor("border"),
          children: BOX_CHARS.horizontal.repeat(50),
        })}
      </TUIText>

      {/* Render each tree */}
      {trees.map((tree) => (
        <RootTreeRenderer
          key={tree.id}
          tree={tree}
          selectedNodeId={viewModel.selectedNodeId}
        />
      ))}

      {/* Legend */}
      <box flexDirection="column" paddingTop={1}>
        <TUIText>
          {TUISpan({
            fg: TUIStyleSystem.getColor("muted"),
            children: "Legend: ",
          })}
          {TUISpan({
            fg: TUIStyleSystem.getColor("success"),
            children: "[S1]=Singleton ",
          })}
          {TUISpan({
            fg: TUIStyleSystem.getColor("primary"),
            children: "[SC]=Scoped ",
          })}
          {TUISpan({
            fg: TUIStyleSystem.getColor("warning"),
            children: "[TR]=Transient [A]=Async",
          })}
        </TUIText>
      </box>
    </box>
  );
}
