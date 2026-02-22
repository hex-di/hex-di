/**
 * Tests for graph layout engine.
 */

import { describe, it, expect } from "vitest";
import { computeGraphLayout } from "../../../src/panels/graph/layout-engine.js";
import type { ContainerGraphData } from "@hex-di/core";

function createGraphData(overrides: Partial<ContainerGraphData> = {}): ContainerGraphData {
  return {
    adapters: [
      {
        portName: "A",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "own",
      },
      {
        portName: "B",
        lifetime: "scoped",
        factoryKind: "sync",
        dependencyNames: ["A"],
        origin: "own",
      },
    ],
    containerName: "TestApp",
    kind: "root",
    parentName: null,
    ...overrides,
  };
}

describe("computeGraphLayout", () => {
  it("returns nodes for all adapters", () => {
    const layout = computeGraphLayout(createGraphData());
    expect(layout.nodes).toHaveLength(2);
  });

  it("returns edges for dependencies", () => {
    const layout = computeGraphLayout(createGraphData());
    expect(layout.edges.length).toBeGreaterThanOrEqual(1);
    const edge = layout.edges[0];
    expect(edge.source).toBe("A");
    expect(edge.target).toBe("B");
  });

  it("assigns node positions", () => {
    const layout = computeGraphLayout(createGraphData());
    for (const node of layout.nodes) {
      expect(typeof node.x).toBe("number");
      expect(typeof node.y).toBe("number");
    }
  });

  it("assigns node dimensions", () => {
    const layout = computeGraphLayout(createGraphData());
    for (const node of layout.nodes) {
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    }
  });

  it("computes total graph dimensions", () => {
    const layout = computeGraphLayout(createGraphData());
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });

  it("supports LR layout direction", () => {
    const layoutTB = computeGraphLayout(createGraphData(), "TB");
    const layoutLR = computeGraphLayout(createGraphData(), "LR");
    // LR layout should have different aspect ratio
    expect(layoutTB.width).not.toBe(layoutLR.width);
  });

  it("handles empty adapter list", () => {
    const data = createGraphData({ adapters: [] });
    const layout = computeGraphLayout(data);
    expect(layout.nodes).toHaveLength(0);
    expect(layout.edges).toHaveLength(0);
  });

  it("skips edges to missing nodes", () => {
    const data = createGraphData({
      adapters: [
        {
          portName: "B",
          lifetime: "scoped",
          factoryKind: "sync",
          dependencyNames: ["NonExistent"],
          origin: "own",
        },
      ],
    });
    const layout = computeGraphLayout(data);
    expect(layout.edges).toHaveLength(0);
  });
});
