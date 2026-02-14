/**
 * Tests for viewport culling logic.
 */

import { describe, it, expect } from "vitest";
import { isNodeVisible } from "../../../src/panels/graph/use-viewport-culling.js";
import type { EnrichedGraphNode, GraphViewportState } from "../../../src/panels/graph/types.js";

function createNode(x: number, y: number): EnrichedGraphNode {
  return {
    adapter: {
      portName: "TestPort",
      lifetime: "singleton",
      factoryKind: "sync",
      dependencyNames: [],
      origin: "own",
    },
    x,
    y,
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

const defaultViewport: GraphViewportState = { panX: 0, panY: 0, zoom: 1 };

describe("isNodeVisible", () => {
  it("returns true for node within canvas", () => {
    expect(isNodeVisible(createNode(400, 300), defaultViewport, 800, 600, 200)).toBe(true);
  });

  it("returns false for node far offscreen", () => {
    expect(isNodeVisible(createNode(5000, 5000), defaultViewport, 800, 600, 200)).toBe(false);
  });

  it("returns true for node within margin", () => {
    // Node at x=-100 is offscreen but within 200px margin
    expect(isNodeVisible(createNode(-100, 300), defaultViewport, 800, 600, 200)).toBe(true);
  });

  it("returns false for node outside margin", () => {
    expect(isNodeVisible(createNode(-400, 300), defaultViewport, 800, 600, 200)).toBe(false);
  });

  it("accounts for zoom", () => {
    const zoomedViewport: GraphViewportState = { panX: 0, panY: 0, zoom: 0.5 };
    // At zoom 0.5, node at (1200, 300) maps to screen (600, 150) — within 800x600
    expect(isNodeVisible(createNode(1200, 300), zoomedViewport, 800, 600, 200)).toBe(true);
  });

  it("accounts for pan", () => {
    const pannedViewport: GraphViewportState = { panX: -500, panY: 0, zoom: 1 };
    // Node at (200, 300) with panX=-500 maps to screen (-300, 300) — still within margin
    expect(isNodeVisible(createNode(200, 300), pannedViewport, 800, 600, 200)).toBe(false);
  });

  it("handles zero margin", () => {
    expect(isNodeVisible(createNode(400, 300), defaultViewport, 800, 600, 0)).toBe(true);
  });
});
