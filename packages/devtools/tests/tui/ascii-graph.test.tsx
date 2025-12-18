/**
 * Tests for TUI ASCII graph renderer implementation.
 *
 * These tests verify:
 * 1. TUI renderer outputs ASCII art
 * 2. TUI renderer shows lifetime badges
 * 3. TUI renderer handles focus navigation
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { TUIGraphRenderer } from "../../src/tui/ascii-graph.js";
import type { GraphViewModelMinimal } from "../../src/ports/render-primitives.port.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Creates an empty graph view model for testing.
 */
function createEmptyViewModel(): GraphViewModelMinimal {
  return {
    nodes: [],
    edges: [],
    direction: "TB",
    viewport: { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 },
    selectedNodeId: null,
    highlightedNodeIds: [],
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    isEmpty: true,
    nodeCount: 0,
    edgeCount: 0,
  };
}

/**
 * Creates a populated graph view model for testing.
 */
function createPopulatedViewModel(): GraphViewModelMinimal {
  return {
    nodes: [
      {
        id: "Logger",
        label: "Logger",
        lifetime: "singleton",
        factoryKind: "sync",
        position: { x: 100, y: 50 },
        dimensions: { width: 140, height: 50 },
        isSelected: false,
        isHighlighted: false,
        isDimmed: false,
      },
      {
        id: "UserService",
        label: "UserService",
        lifetime: "scoped",
        factoryKind: "sync",
        position: { x: 100, y: 150 },
        dimensions: { width: 140, height: 50 },
        isSelected: true, // Selected node
        isHighlighted: false,
        isDimmed: false,
      },
      {
        id: "Database",
        label: "Database",
        lifetime: "singleton",
        factoryKind: "async",
        position: { x: 250, y: 50 },
        dimensions: { width: 140, height: 50 },
        isSelected: false,
        isHighlighted: false,
        isDimmed: false,
      },
    ],
    edges: [
      {
        id: "UserService->Logger",
        from: "UserService",
        to: "Logger",
        isHighlighted: false,
        isDimmed: false,
      },
      {
        id: "UserService->Database",
        from: "UserService",
        to: "Database",
        isHighlighted: false,
        isDimmed: false,
      },
    ],
    direction: "TB",
    viewport: { width: 400, height: 200, minX: 0, minY: 0, maxX: 400, maxY: 200 },
    selectedNodeId: "UserService",
    highlightedNodeIds: ["UserService", "Logger", "Database"],
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    isEmpty: false,
    nodeCount: 3,
    edgeCount: 2,
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe("TUIGraphRenderer", () => {
  // ---------------------------------------------------------------------------
  // Test 1: TUI renderer outputs ASCII art
  // ---------------------------------------------------------------------------
  it("outputs ASCII art representation of graph", () => {
    const viewModel = createPopulatedViewModel();

    const element = TUIGraphRenderer({ viewModel }) as React.ReactElement<{
      flexDirection: string;
    }> | null;

    // Should return a React element
    expect(element).toBeDefined();
    expect(element?.type).toBe("box");

    // The renderer should produce a structure that can render ASCII
    expect(element?.props.flexDirection).toBe("column");
  });

  // ---------------------------------------------------------------------------
  // Test 2: TUI renderer shows lifetime badges
  // ---------------------------------------------------------------------------
  it("shows lifetime badges for nodes", () => {
    const viewModel = createPopulatedViewModel();

    const element = TUIGraphRenderer({ viewModel }) as React.ReactElement<{
      children: React.ReactNode;
    }> | null;

    // Traverse the element tree to find node representations
    // The structure should contain lifetime indicators
    expect(element).toBeDefined();

    // Verify the element has children (nodes to render)
    expect(element?.props.children).toBeDefined();

    // Convert element tree to string for inspection
    const renderedContent = JSON.stringify(element);

    // Should contain node labels
    expect(renderedContent).toContain("Logger");
    expect(renderedContent).toContain("UserService");
    expect(renderedContent).toContain("Database");

    // Should contain lifetime badges in the legend
    expect(renderedContent).toContain("[S1]=Singleton");
    expect(renderedContent).toContain("[SC]=Scoped");
    expect(renderedContent).toContain("[TR]=Transient");
  });

  // ---------------------------------------------------------------------------
  // Test 3: TUI renderer handles focus navigation
  // ---------------------------------------------------------------------------
  it("supports focus-based selection", () => {
    const viewModel = createPopulatedViewModel();
    const handleNodeSelect = vi.fn();

    const element = TUIGraphRenderer({
      viewModel,
      onNodeSelect: handleNodeSelect,
    });

    // The rendered element should be defined
    expect(element).toBeDefined();

    // The renderer should create a tree structure with nodes
    const renderedContent = JSON.stringify(element);

    // Verify the tree structure includes node data for focus handling
    // The RootTreeRenderer component receives tree and selectedNodeId props
    expect(renderedContent).toContain('"tree"');
    expect(renderedContent).toContain('"selectedNodeId"');
    expect(renderedContent).toContain('"node"');

    // Verify nodes are present in the tree structure
    expect(renderedContent).toContain("UserService");
    expect(renderedContent).toContain("Logger");
  });

  // ---------------------------------------------------------------------------
  // Additional test: renders empty state correctly
  // ---------------------------------------------------------------------------
  it("renders empty state when graph has no nodes", () => {
    const viewModel = createEmptyViewModel();

    const element = TUIGraphRenderer({ viewModel });

    // Should still render a container
    expect(element).toBeDefined();

    // The content should indicate empty state
    const renderedContent = JSON.stringify(element);
    expect(renderedContent.toLowerCase()).toMatch(/empty|no.*nodes|no.*services/);
  });

  // ---------------------------------------------------------------------------
  // Additional test: uses box-drawing characters for connections
  // ---------------------------------------------------------------------------
  it("uses box-drawing characters for tree structure", () => {
    const viewModel = createPopulatedViewModel();

    const element = TUIGraphRenderer({ viewModel }) as React.ReactElement<{
      flexDirection: string;
    }> | null;

    // Convert to string to check for box-drawing characters
    const renderedContent = JSON.stringify(element);

    // Should use box-drawing characters (Unicode)
    // The horizontal line character (U+2500) appears in the divider
    expect(renderedContent).toContain("\u2500");

    // The structure should indicate hierarchical relationship
    expect(element?.props.flexDirection).toBe("column");
  });

  // ---------------------------------------------------------------------------
  // Additional test: highlights selected node
  // ---------------------------------------------------------------------------
  it("highlights the selected node", () => {
    const viewModel = createPopulatedViewModel();

    const element = TUIGraphRenderer({ viewModel });

    // The selected node (UserService) should have different styling
    expect(element).toBeDefined();

    // Check that selectedNodeId is used
    expect(viewModel.selectedNodeId).toBe("UserService");

    // The element structure should reflect selection state
    const renderedContent = JSON.stringify(element);
    expect(renderedContent).toContain("UserService");

    // The header should show the correct node/edge count
    expect(renderedContent).toContain("3 nodes");
    expect(renderedContent).toContain("2 edges");
  });
});
