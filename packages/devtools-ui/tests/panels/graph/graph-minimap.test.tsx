/**
 * Tests for GraphMinimap component.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GraphMinimap } from "../../../src/panels/graph/components/graph-minimap.js";
import type {
  EnrichedGraphNode,
  GraphLayout,
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

const defaultLayout: GraphLayout = { nodes: [], edges: [], width: 400, height: 300 };
const defaultViewport: GraphViewportState = { panX: 0, panY: 0, zoom: 1 };

describe("GraphMinimap", () => {
  it("renders when visible and has nodes", () => {
    render(
      <GraphMinimap
        nodes={[createNode("A")]}
        layout={defaultLayout}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
        visible={true}
      />
    );
    expect(screen.getByTestId("graph-minimap")).toBeDefined();
  });

  it("does not render when not visible", () => {
    render(
      <GraphMinimap
        nodes={[createNode("A")]}
        layout={defaultLayout}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
        visible={false}
      />
    );
    expect(screen.queryByTestId("graph-minimap")).toBeNull();
  });

  it("does not render when no nodes", () => {
    render(
      <GraphMinimap
        nodes={[]}
        layout={defaultLayout}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
        visible={true}
      />
    );
    expect(screen.queryByTestId("graph-minimap")).toBeNull();
  });

  it("has complementary role for accessibility", () => {
    render(
      <GraphMinimap
        nodes={[createNode("A")]}
        layout={defaultLayout}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
        visible={true}
      />
    );
    expect(screen.getByTestId("graph-minimap").getAttribute("role")).toBe("complementary");
  });

  it("renders node dots", () => {
    render(
      <GraphMinimap
        nodes={[createNode("A"), createNode("B")]}
        layout={defaultLayout}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
        visible={true}
      />
    );
    const minimap = screen.getByTestId("graph-minimap");
    const circles = minimap.querySelectorAll("circle");
    expect(circles.length).toBe(2);
  });

  it("renders viewport rectangle", () => {
    render(
      <GraphMinimap
        nodes={[createNode("A")]}
        layout={defaultLayout}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
        visible={true}
      />
    );
    const minimap = screen.getByTestId("graph-minimap");
    const rects = minimap.querySelectorAll("rect");
    expect(rects.length).toBe(1);
  });

  it("has aria-label", () => {
    render(
      <GraphMinimap
        nodes={[createNode("A")]}
        layout={defaultLayout}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
        visible={true}
      />
    );
    expect(screen.getByTestId("graph-minimap").getAttribute("aria-label")).toContain("minimap");
  });
});
