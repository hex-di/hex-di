/**
 * Tests for @hex-di/graph-viz package.
 *
 * These 6 focused tests verify the generic graph visualization components
 * work correctly with custom TMetadata types and render props.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  GraphRenderer,
  GraphNode,
  GraphEdge,
  GraphControls,
  computeLayout,
  type GraphNodeType,
  type GraphEdgeType,
  type LayoutResult,
  type RenderNodeProps,
  type RenderTooltipProps,
} from "../src/index.js";

// =============================================================================
// Test Metadata Type
// =============================================================================

interface TestMetadata {
  type: "input" | "output" | "process";
  priority: number;
}

// =============================================================================
// Test Helpers
// =============================================================================

function createTestLayout(): LayoutResult<TestMetadata> {
  const nodes: GraphNodeType<TestMetadata>[] = [
    { id: "A", label: "Node A", metadata: { type: "input", priority: 1 } },
    { id: "B", label: "Node B", metadata: { type: "process", priority: 2 } },
    { id: "C", label: "Node C", metadata: { type: "output", priority: 3 } },
  ];

  const edges: GraphEdgeType[] = [
    { from: "A", to: "B" },
    { from: "B", to: "C" },
  ];

  return computeLayout(nodes, edges);
}

// =============================================================================
// Test 1: GraphRenderer renders with generic TMetadata
// =============================================================================

describe("GraphRenderer", () => {
  it("renders with generic TMetadata", () => {
    const layout = createTestLayout();

    render(
      <GraphRenderer<TestMetadata>
        layout={layout}
        hoveredNodeId={null}
        selectedNodeId={null}
        highlightedNodeIds={new Set()}
        highlightedEdgeKeys={new Set()}
        showControls={false}
      />
    );

    // Verify all nodes are rendered
    expect(screen.getByText("Node A")).toBeDefined();
    expect(screen.getByText("Node B")).toBeDefined();
    expect(screen.getByText("Node C")).toBeDefined();
  });
});

// =============================================================================
// Test 2: GraphNode accepts renderNode prop
// =============================================================================

describe("GraphNode", () => {
  it("accepts renderNode prop for custom content", () => {
    const layout = createTestLayout();
    const node = layout.nodes[0];
    if (!node) throw new Error("Test setup error: no nodes in layout");

    // Custom render function that uses metadata
    const renderContent = (props: RenderNodeProps<TestMetadata>) => (
      <g data-testid="custom-node">
        <rect
          x={props.x}
          y={props.y}
          width={props.node.width}
          height={props.node.height}
          data-type={props.node.metadata?.type}
          data-priority={props.node.metadata?.priority}
        />
        <text x={props.node.x} y={props.node.y}>
          Custom: {props.node.label}
        </text>
      </g>
    );

    render(
      <svg>
        <GraphNode<TestMetadata>
          node={node}
          isHovered={false}
          isSelected={false}
          isDimmed={false}
          renderContent={renderContent}
        />
      </svg>
    );

    // Verify custom content is rendered
    expect(screen.getByTestId("custom-node")).toBeDefined();
    expect(screen.getByText("Custom: Node A")).toBeDefined();

    // Verify metadata is accessible in render prop
    const rect = screen.getByTestId("custom-node").querySelector("rect");
    expect(rect).toBeDefined();
    expect(rect?.getAttribute("data-type")).toBe("input");
    expect(rect?.getAttribute("data-priority")).toBe("1");
  });
});

// =============================================================================
// Test 3: GraphEdge renders connections
// =============================================================================

describe("GraphEdge", () => {
  it("renders edge connections between nodes", () => {
    const layout = createTestLayout();
    const edge = layout.edges[0];
    if (!edge) throw new Error("Test setup error: no edges in layout");

    render(
      <svg>
        <defs>
          <marker id="test-marker" />
          <marker id="test-marker-highlighted" />
        </defs>
        <GraphEdge
          edge={edge}
          isHighlighted={false}
          isDimmed={false}
          markerId="test-marker"
          highlightedMarkerId="test-marker-highlighted"
        />
      </svg>
    );

    // Verify edge is rendered as a path
    const path = document.querySelector(".graph-edge");
    expect(path).toBeDefined();
    expect(path).not.toBeNull();
    expect(path?.getAttribute("data-edge-from")).toBe("A");
    expect(path?.getAttribute("data-edge-to")).toBe("B");

    // Verify path has a valid d attribute
    const d = path?.getAttribute("d");
    expect(d).toBeTruthy();
    expect(d).toMatch(/^M\s/); // Should start with Move command
  });
});

// =============================================================================
// Test 4: GraphControls handles zoom/pan
// =============================================================================

describe("GraphControls", () => {
  it("handles zoom in, zoom out, fit view, and reset", () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onFitView = vi.fn();
    const onResetZoom = vi.fn();

    render(
      <GraphControls
        zoom={1}
        minZoom={0.25}
        maxZoom={2}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFitView={onFitView}
        onResetZoom={onResetZoom}
      />
    );

    // Verify zoom level is displayed
    expect(screen.getByText("100%")).toBeDefined();

    // Test zoom in button
    const zoomInButton = screen.getByRole("button", { name: /zoom in/i });
    fireEvent.click(zoomInButton);
    expect(onZoomIn).toHaveBeenCalledTimes(1);

    // Test zoom out button
    const zoomOutButton = screen.getByRole("button", { name: /zoom out/i });
    fireEvent.click(zoomOutButton);
    expect(onZoomOut).toHaveBeenCalledTimes(1);

    // Test fit view button
    const fitButton = screen.getByRole("button", { name: /fit graph to view/i });
    fireEvent.click(fitButton);
    expect(onFitView).toHaveBeenCalledTimes(1);

    // Test reset zoom button
    const resetButton = screen.getByRole("button", { name: /reset zoom to 100%/i });
    fireEvent.click(resetButton);
    expect(onResetZoom).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Test 5: graph-layout.ts algorithm with generic nodes
// =============================================================================

describe("computeLayout", () => {
  it("computes layout with generic TMetadata preserved", () => {
    const nodes: GraphNodeType<TestMetadata>[] = [
      { id: "input", label: "Input Node", metadata: { type: "input", priority: 1 } },
      { id: "process", label: "Process Node", metadata: { type: "process", priority: 2 } },
      { id: "output", label: "Output Node", metadata: { type: "output", priority: 3 } },
    ];

    const edges: GraphEdgeType[] = [
      { from: "input", to: "process" },
      { from: "process", to: "output" },
    ];

    const layout = computeLayout<TestMetadata>(nodes, edges, {
      direction: "TB",
      nodeWidth: 120,
      nodeHeight: 40,
    });

    // Verify layout structure
    expect(layout.nodes).toHaveLength(3);
    expect(layout.edges).toHaveLength(2);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);

    // Verify nodes have positions
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThan(0);
      expect(node.y).toBeGreaterThan(0);
      expect(node.width).toBe(120);
      expect(node.height).toBe(40);
    }

    // Verify metadata is preserved
    const inputNode = layout.nodes.find(n => n.id === "input");
    expect(inputNode?.metadata?.type).toBe("input");
    expect(inputNode?.metadata?.priority).toBe(1);

    const processNode = layout.nodes.find(n => n.id === "process");
    expect(processNode?.metadata?.type).toBe("process");

    const outputNode = layout.nodes.find(n => n.id === "output");
    expect(outputNode?.metadata?.type).toBe("output");

    // Verify edges have points
    for (const edge of layout.edges) {
      expect(edge.points.length).toBeGreaterThan(0);
      for (const point of edge.points) {
        expect(typeof point.x).toBe("number");
        expect(typeof point.y).toBe("number");
      }
    }

    // Verify hierarchical layout (input at top, output at bottom in TB mode)
    const inputY = layout.nodes.find(n => n.id === "input")?.y ?? 0;
    const outputY = layout.nodes.find(n => n.id === "output")?.y ?? 0;
    expect(inputY).toBeLessThan(outputY);
  });
});

// =============================================================================
// Test 6: renderTooltip prop receives correct metadata
// =============================================================================

describe("renderTooltip", () => {
  it("receives correct metadata in render prop", () => {
    const layout = createTestLayout();

    const renderTooltip = vi.fn((props: RenderTooltipProps<TestMetadata>) => (
      <div data-testid="tooltip">
        <span data-testid="tooltip-label">{props.node.label}</span>
        <span data-testid="tooltip-type">{props.node.metadata?.type}</span>
        <span data-testid="tooltip-priority">{props.node.metadata?.priority}</span>
        <span data-testid="tooltip-x">{Math.round(props.x)}</span>
        <span data-testid="tooltip-y">{Math.round(props.y)}</span>
      </div>
    ));

    render(
      <GraphRenderer<TestMetadata>
        layout={layout}
        hoveredNodeId="A"
        selectedNodeId={null}
        highlightedNodeIds={new Set()}
        highlightedEdgeKeys={new Set()}
        showControls={false}
        renderTooltip={renderTooltip}
      />
    );

    // Verify tooltip is rendered
    expect(screen.getByTestId("tooltip")).toBeDefined();

    // Verify correct node data is passed
    expect(screen.getByTestId("tooltip-label").textContent).toBe("Node A");
    expect(screen.getByTestId("tooltip-type").textContent).toBe("input");
    expect(screen.getByTestId("tooltip-priority").textContent).toBe("1");

    // Verify position is passed (values will be transformed based on zoom/pan)
    expect(screen.getByTestId("tooltip-x")).toBeDefined();
    expect(screen.getByTestId("tooltip-y")).toBeDefined();

    // Verify renderTooltip was called with correct props
    expect(renderTooltip).toHaveBeenCalled();
    const callArgs = renderTooltip.mock.calls[0]?.[0];
    expect(callArgs?.node.id).toBe("A");
    expect(callArgs?.node.metadata?.type).toBe("input");
  });
});
