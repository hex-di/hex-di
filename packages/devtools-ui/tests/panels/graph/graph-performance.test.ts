/**
 * Tests for viewport culling and performance-related logic.
 *
 * Tests the pure functions that implement viewport culling
 * and virtual scroll thresholds.
 */

import { describe, it, expect } from "vitest";
import { isNodeVisible } from "../../../src/panels/graph/use-viewport-culling.js";
import {
  VIEWPORT_CULLING_THRESHOLD,
  VIEWPORT_CULLING_MARGIN,
  VIRTUAL_SCROLL_THRESHOLD,
  LAYOUT_WORKER_THRESHOLD,
} from "../../../src/panels/graph/constants.js";
import type { EnrichedGraphNode, GraphViewportState } from "../../../src/panels/graph/types.js";

function createNode(x: number, y: number, w = 160, h = 48): EnrichedGraphNode {
  return {
    adapter: {
      portName: "P",
      lifetime: "singleton",
      factoryKind: "sync",
      dependencyNames: [],
      origin: "own",
    },
    x,
    y,
    width: w,
    height: h,
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

const vp: GraphViewportState = { panX: 0, panY: 0, zoom: 1 };

describe("isNodeVisible — edge cases", () => {
  it("node exactly at left boundary is visible", () => {
    expect(isNodeVisible(createNode(0, 300), vp, 800, 600, 0)).toBe(true);
  });

  it("node exactly at right boundary is visible", () => {
    // Node at x=800-160=640 should be exactly fitting
    expect(isNodeVisible(createNode(640, 300), vp, 800, 600, 0)).toBe(true);
  });

  it("node one pixel past right edge without margin is not visible", () => {
    // With center-based logic, node at x=881 has left edge at 881-80=801 > canvasWidth=800
    expect(isNodeVisible(createNode(881, 300), vp, 800, 600, 0)).toBe(false);
  });

  it("node one pixel past right edge with margin is visible", () => {
    expect(isNodeVisible(createNode(801, 300), vp, 800, 600, 200)).toBe(true);
  });

  it("node at negative y within margin is visible", () => {
    expect(isNodeVisible(createNode(400, -40), vp, 800, 600, 200)).toBe(true);
  });

  it("node at negative y outside margin is not visible", () => {
    expect(isNodeVisible(createNode(400, -300), vp, 800, 600, 200)).toBe(false);
  });

  it("with zoom=2, node at (200,150) maps to screen (400,300)", () => {
    const zoomed: GraphViewportState = { panX: 0, panY: 0, zoom: 2 };
    expect(isNodeVisible(createNode(200, 150), zoomed, 800, 600, 0)).toBe(true);
  });

  it("with zoom=0.5, visible area is 1600x1200", () => {
    const zoomed: GraphViewportState = { panX: 0, panY: 0, zoom: 0.5 };
    // Node at (1500, 1100) should be visible with margin
    expect(isNodeVisible(createNode(1500, 1100), zoomed, 800, 600, 200)).toBe(true);
  });

  it("with pan, node position shifts", () => {
    const panned: GraphViewportState = { panX: 200, panY: 100, zoom: 1 };
    // Node at (-200, -100) should be at screen (0, 0) with pan
    expect(isNodeVisible(createNode(-200, -100), panned, 800, 600, 0)).toBe(true);
  });

  it("large node partially in viewport is visible", () => {
    // Node is 400x400, positioned at -100,-100. Right edge = -100+200=100 > 0, so visible
    expect(isNodeVisible(createNode(-100, -100, 400, 400), vp, 800, 600, 0)).toBe(true);
  });
});

describe("threshold constants", () => {
  it("viewport culling threshold is 50", () => {
    expect(VIEWPORT_CULLING_THRESHOLD).toBe(50);
  });

  it("viewport culling margin is 200", () => {
    expect(VIEWPORT_CULLING_MARGIN).toBe(200);
  });

  it("virtual scroll threshold is 50", () => {
    expect(VIRTUAL_SCROLL_THRESHOLD).toBe(50);
  });

  it("layout worker threshold is 100", () => {
    expect(LAYOUT_WORKER_THRESHOLD).toBe(100);
  });
});

describe("culling with many nodes", () => {
  it("only visible nodes pass the check in a large graph", () => {
    const margin = VIEWPORT_CULLING_MARGIN;
    const nodes: EnrichedGraphNode[] = [];
    // Create 100 nodes, some in viewport, some far out
    for (let i = 0; i < 100; i++) {
      const x = i < 50 ? i * 15 : 5000 + i * 10;
      const y = i < 50 ? i * 10 : 5000 + i * 10;
      nodes.push(createNode(x, y));
    }

    const visibleCount = nodes.filter(n => isNodeVisible(n, vp, 800, 600, margin)).length;

    // First 50 are near the viewport, second 50 are far away
    expect(visibleCount).toBeLessThan(100);
    expect(visibleCount).toBeGreaterThan(0);
  });
});
