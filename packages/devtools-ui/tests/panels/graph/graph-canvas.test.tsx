/**
 * Tests for GraphCanvas component.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { GraphCanvas } from "../../../src/panels/graph/components/graph-canvas.js";
import type {
  EnrichedGraphNode,
  EnrichedGraphEdge,
  GraphViewportState,
} from "../../../src/panels/graph/types.js";

afterEach(() => {
  cleanup();
});

function createNode(portName: string): EnrichedGraphNode {
  return {
    adapter: {
      portName,
      lifetime: "singleton",
      factoryKind: "sync",
      dependencyNames: [],
      origin: "own",
    },
    x: 100,
    y: 100,
    width: 160,
    height: 48,
    isResolved: true,
    errorRate: undefined,
    hasHighErrorRate: false,
    totalCalls: 0,
    okCount: 0,
    errCount: 0,
    errorsByCode: new Map(),
    direction: undefined,
    category: undefined,
    tags: [],
    description: undefined,
    libraryKind: undefined,
    dependentCount: 0,
    matchesFilter: true,
  };
}

function createEdge(source: string, target: string): EnrichedGraphEdge {
  return {
    source,
    target,
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ],
    isHighlighted: false,
    transitiveDepth: -1,
    isInherited: false,
    isOverridden: false,
  };
}

const defaultViewport: GraphViewportState = { panX: 0, panY: 0, zoom: 1 };

describe("GraphCanvas", () => {
  it("renders with test id", () => {
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
      />
    );
    expect(screen.getByTestId("graph-canvas")).toBeDefined();
  });

  it("has role=img for accessibility", () => {
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
      />
    );
    expect(screen.getByTestId("graph-canvas").getAttribute("role")).toBe("img");
  });

  it("has aria-label", () => {
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
      />
    );
    expect(screen.getByTestId("graph-canvas").getAttribute("aria-label")).toContain("graph");
  });

  it("renders nodes", () => {
    render(
      <GraphCanvas
        nodes={[createNode("Logger"), createNode("Database")]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
      />
    );
    expect(screen.getByTestId("graph-node-Logger")).toBeDefined();
    expect(screen.getByTestId("graph-node-Database")).toBeDefined();
  });

  it("renders edges", () => {
    render(
      <GraphCanvas
        nodes={[createNode("Logger"), createNode("Database")]}
        edges={[createEdge("Logger", "Database")]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
      />
    );
    expect(screen.getByTestId("graph-edge-Logger-Database")).toBeDefined();
  });

  it("calls onNodeClick when node is clicked", () => {
    const onNodeClick = vi.fn();
    const onBackgroundClick = vi.fn();
    render(
      <GraphCanvas
        nodes={[createNode("Logger")]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
        onNodeClick={onNodeClick}
        onBackgroundClick={onBackgroundClick}
      />
    );
    fireEvent.click(screen.getByTestId("graph-node-Logger"));
    expect(onNodeClick).toHaveBeenCalledWith("Logger");
    // Background click should NOT have fired since the click was on a node
    expect(onBackgroundClick).not.toHaveBeenCalled();
  });

  it("renders arrowhead marker def", () => {
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
      />
    );
    const svg = screen.getByTestId("graph-canvas");
    const markers = svg.querySelectorAll("marker");
    expect(markers.length).toBeGreaterThan(0);
  });

  it("renders background click target", () => {
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
      />
    );
    expect(screen.getByTestId("graph-bg")).toBeDefined();
  });

  it("sets correct dimensions", () => {
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
      />
    );
    const canvas = screen.getByTestId("graph-canvas");
    expect(canvas.getAttribute("width")).toBe("800");
    expect(canvas.getAttribute("height")).toBe("600");
  });

  it("drag on background fires onViewportChange with new pan", () => {
    const onViewportChange = vi.fn();
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={{ panX: 0, panY: 0, zoom: 1 }}
        width={800}
        height={600}
        onViewportChange={onViewportChange}
      />
    );
    const bg = screen.getByTestId("graph-bg");
    // mousedown on background to start drag
    fireEvent.mouseDown(bg, { button: 0, clientX: 100, clientY: 100 });
    // mousemove to drag
    const canvas = screen.getByTestId("graph-canvas");
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 120 });
    expect(onViewportChange).toHaveBeenCalledWith(expect.objectContaining({ panX: 50, panY: 20 }));
  });

  it("mouse up stops the drag — further mousemove does not fire viewport change", () => {
    const onViewportChange = vi.fn();
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={{ panX: 0, panY: 0, zoom: 1 }}
        width={800}
        height={600}
        onViewportChange={onViewportChange}
      />
    );
    const bg = screen.getByTestId("graph-bg");
    const canvas = screen.getByTestId("graph-canvas");
    // Start drag
    fireEvent.mouseDown(bg, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 120 });
    expect(onViewportChange).toHaveBeenCalledTimes(1);
    // Release
    fireEvent.mouseUp(canvas);
    onViewportChange.mockClear();
    // Further moves should not fire
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 200 });
    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it("mouse leave stops the drag", () => {
    const onViewportChange = vi.fn();
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={{ panX: 0, panY: 0, zoom: 1 }}
        width={800}
        height={600}
        onViewportChange={onViewportChange}
      />
    );
    const bg = screen.getByTestId("graph-bg");
    const canvas = screen.getByTestId("graph-canvas");
    // Start drag
    fireEvent.mouseDown(bg, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 120, clientY: 110 });
    expect(onViewportChange).toHaveBeenCalledTimes(1);
    // Mouse leaves the canvas
    fireEvent.mouseLeave(canvas);
    onViewportChange.mockClear();
    // Further moves should not fire
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 200 });
    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it("drag does not start when clicking on a node", () => {
    const onViewportChange = vi.fn();
    render(
      <GraphCanvas
        nodes={[createNode("Logger")]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={{ panX: 0, panY: 0, zoom: 1 }}
        width={800}
        height={600}
        onViewportChange={onViewportChange}
      />
    );
    const nodeEl = screen.getByTestId("graph-node-Logger");
    const canvas = screen.getByTestId("graph-canvas");
    // mousedown on a node (not background)
    fireEvent.mouseDown(nodeEl, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 120 });
    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it("drag accumulates from existing viewport offset", () => {
    const onViewportChange = vi.fn();
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={{ panX: 200, panY: 100, zoom: 1.5 }}
        width={800}
        height={600}
        onViewportChange={onViewportChange}
      />
    );
    const bg = screen.getByTestId("graph-bg");
    const canvas = screen.getByTestId("graph-canvas");
    // mousedown at clientX=300, clientY=250
    // panStart = { x: 300 - 200, y: 250 - 100 } = { x: 100, y: 150 }
    fireEvent.mouseDown(bg, { button: 0, clientX: 300, clientY: 250 });
    // mousemove to clientX=350, clientY=270
    // panX = 350 - 100 = 250, panY = 270 - 150 = 120
    fireEvent.mouseMove(canvas, { clientX: 350, clientY: 270 });
    expect(onViewportChange).toHaveBeenCalledWith(
      expect.objectContaining({ panX: 250, panY: 120 })
    );
  });

  it("right-click does not start drag", () => {
    const onViewportChange = vi.fn();
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={{ panX: 0, panY: 0, zoom: 1 }}
        width={800}
        height={600}
        onViewportChange={onViewportChange}
      />
    );
    const bg = screen.getByTestId("graph-bg");
    const canvas = screen.getByTestId("graph-canvas");
    // Right-click (button 2)
    fireEvent.mouseDown(bg, { button: 2, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 120 });
    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it("shows grab cursor by default", () => {
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
      />
    );
    const canvas = screen.getByTestId("graph-canvas");
    expect(canvas.style.cursor).toBe("grab");
  });

  it("shows grabbing cursor during drag", () => {
    render(
      <GraphCanvas
        nodes={[]}
        edges={[]}
        selectedNodes={new Set()}
        hoveredNode={undefined}
        viewport={defaultViewport}
        width={800}
        height={600}
      />
    );
    const bg = screen.getByTestId("graph-bg");
    const canvas = screen.getByTestId("graph-canvas");
    fireEvent.mouseDown(bg, { button: 0, clientX: 100, clientY: 100 });
    // After mousedown, cursor should be "grabbing"
    expect(canvas.style.cursor).toBe("grabbing");
  });
});
