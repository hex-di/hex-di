/**
 * Tests for GraphEdge component.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  GraphEdge,
  pointsToPath,
  getEdgeStyle,
} from "../../../src/panels/graph/components/graph-edge.js";
import type { EnrichedGraphEdge } from "../../../src/panels/graph/types.js";

afterEach(() => {
  cleanup();
});

function createEdge(overrides: Partial<EnrichedGraphEdge> = {}): EnrichedGraphEdge {
  return {
    source: "A",
    target: "B",
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ],
    isHighlighted: false,
    transitiveDepth: -1,
    isInherited: false,
    isOverridden: false,
    ...overrides,
  };
}

describe("pointsToPath", () => {
  it("returns empty for no points", () => {
    expect(pointsToPath([])).toBe("");
  });

  it("returns M for single point", () => {
    expect(pointsToPath([{ x: 10, y: 20 }])).toBe("M 10 20");
  });

  it("returns M + L for multiple points", () => {
    const path = pointsToPath([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
    ]);
    expect(path).toBe("M 0 0 L 50 50");
  });
});

describe("getEdgeStyle", () => {
  it("returns accent style for selected edge", () => {
    const style = getEdgeStyle(createEdge({ isHighlighted: true, transitiveDepth: 0 }));
    expect(style.stroke).toContain("accent");
    expect(style.strokeWidth).toBe(2);
  });

  it("returns faded style for transitive edge", () => {
    const style = getEdgeStyle(createEdge({ isHighlighted: true, transitiveDepth: 2 }));
    expect(style.opacity).toBeLessThan(1);
  });

  it("returns dashed style for inherited edge", () => {
    const style = getEdgeStyle(createEdge({ isInherited: true }));
    expect(style.strokeDasharray).toBeDefined();
  });

  it("returns dotted style for overridden edge", () => {
    const style = getEdgeStyle(createEdge({ isOverridden: true }));
    expect(style.strokeDasharray).toBeDefined();
  });

  it("returns default style for normal edge", () => {
    const style = getEdgeStyle(createEdge());
    expect(style.strokeDasharray).toBeUndefined();
    expect(style.opacity).toBe(1);
  });
});

describe("GraphEdge", () => {
  it("renders with test id", () => {
    render(
      <svg>
        <GraphEdge edge={createEdge()} />
      </svg>
    );
    expect(screen.getByTestId("graph-edge-A-B")).toBeDefined();
  });

  it("calls onClick with source and target", () => {
    const onClick = vi.fn();
    render(
      <svg>
        <GraphEdge edge={createEdge()} onClick={onClick} />
      </svg>
    );
    screen.getByTestId("graph-edge-A-B").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledWith("A", "B");
  });

  it("renders arrowhead marker reference", () => {
    render(
      <svg>
        <GraphEdge edge={createEdge()} />
      </svg>
    );
    const el = screen.getByTestId("graph-edge-A-B");
    const paths = el.querySelectorAll("path");
    const mainPath = paths[paths.length - 1];
    expect(mainPath.getAttribute("marker-end")).toContain("arrowhead");
  });
});
