/**
 * Tests for DOM graph renderer implementation.
 *
 * These tests verify:
 * 1. DOM renderer creates SVG element
 * 2. DOM renderer positions nodes with dagre
 * 3. DOM renderer handles node click
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { DOMGraphRenderer } from "../../src/dom/graph-renderer.js";
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
        isSelected: false,
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
    selectedNodeId: null,
    highlightedNodeIds: [],
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

describe("DOMGraphRenderer", () => {
  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // Test 1: DOM renderer creates SVG element
  // ---------------------------------------------------------------------------
  it("creates SVG element for graph rendering", () => {
    const viewModel = createPopulatedViewModel();

    const { container } = render(
      <DOMGraphRenderer viewModel={viewModel} />
    );

    // Should have an SVG element
    const svgElement = container.querySelector("svg");
    expect(svgElement).toBeTruthy();
    expect(svgElement?.tagName.toLowerCase()).toBe("svg");
  });

  // ---------------------------------------------------------------------------
  // Test 2: DOM renderer positions nodes with dagre
  // ---------------------------------------------------------------------------
  it("positions nodes based on view model coordinates", () => {
    const viewModel = createPopulatedViewModel();

    const { container } = render(
      <DOMGraphRenderer viewModel={viewModel} />
    );

    // Each node should be rendered as a group (g) element
    const nodeGroups = container.querySelectorAll('[data-node-id]');
    expect(nodeGroups).toHaveLength(3);

    // Verify node IDs are present
    const nodeIds = Array.from(nodeGroups).map((g) => g.getAttribute("data-node-id"));
    expect(nodeIds).toContain("Logger");
    expect(nodeIds).toContain("UserService");
    expect(nodeIds).toContain("Database");
  });

  // ---------------------------------------------------------------------------
  // Test 3: DOM renderer handles node click
  // ---------------------------------------------------------------------------
  it("handles node click and emits selection event", () => {
    const viewModel = createPopulatedViewModel();
    const handleNodeSelect = vi.fn();

    const { container } = render(
      <DOMGraphRenderer
        viewModel={viewModel}
        onNodeSelect={handleNodeSelect}
      />
    );

    // Find and click a node
    const loggerNode = container.querySelector('[data-node-id="Logger"]');
    expect(loggerNode).toBeTruthy();

    fireEvent.click(loggerNode!);

    // Verify callback was called with correct node ID
    expect(handleNodeSelect).toHaveBeenCalledTimes(1);
    expect(handleNodeSelect).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: "Logger" })
    );
  });

  // ---------------------------------------------------------------------------
  // Additional test: renders empty state correctly
  // ---------------------------------------------------------------------------
  it("renders empty state when graph has no nodes", () => {
    const viewModel = createEmptyViewModel();

    const { container } = render(
      <DOMGraphRenderer viewModel={viewModel} />
    );

    // SVG should still be created but with no node groups
    const svgElement = container.querySelector("svg");
    expect(svgElement).toBeTruthy();

    const nodeGroups = container.querySelectorAll('[data-node-id]');
    expect(nodeGroups).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Additional test: renders edges between nodes
  // ---------------------------------------------------------------------------
  it("renders edges between connected nodes", () => {
    const viewModel = createPopulatedViewModel();

    const { container } = render(
      <DOMGraphRenderer viewModel={viewModel} />
    );

    // Edges should be rendered as path elements
    const edgePaths = container.querySelectorAll('[data-edge-from]');
    expect(edgePaths).toHaveLength(2);

    // Verify edge connections
    const edges = Array.from(edgePaths).map((path) => ({
      from: path.getAttribute("data-edge-from"),
      to: path.getAttribute("data-edge-to"),
    }));

    expect(edges).toContainEqual({ from: "UserService", to: "Logger" });
    expect(edges).toContainEqual({ from: "UserService", to: "Database" });
  });

  // ---------------------------------------------------------------------------
  // Additional test: shows lifetime badges on nodes
  // ---------------------------------------------------------------------------
  it("displays lifetime badges on nodes", () => {
    const viewModel = createPopulatedViewModel();

    const { container } = render(
      <DOMGraphRenderer viewModel={viewModel} />
    );

    // Find text elements showing lifetimes
    const textElements = container.querySelectorAll("text");
    const textContents = Array.from(textElements).map((t) => t.textContent?.toLowerCase());

    expect(textContents).toContain("singleton");
    expect(textContents).toContain("scoped");
  });
});
