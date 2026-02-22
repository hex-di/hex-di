/**
 * Tests for GraphTooltip component.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GraphTooltip } from "../../../src/panels/graph/components/graph-tooltip.js";
import type { EnrichedGraphNode } from "../../../src/panels/graph/types.js";

afterEach(() => {
  cleanup();
});

function createNode(overrides: Partial<EnrichedGraphNode> = {}): EnrichedGraphNode {
  return {
    adapter: {
      portName: "TestPort",
      lifetime: "singleton",
      factoryKind: "sync",
      dependencyNames: ["Dep1"],
      origin: "own",
    },
    x: 0,
    y: 0,
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
    dependentCount: 2,
    matchesFilter: true,
    ...overrides,
  };
}

describe("GraphTooltip", () => {
  it("renders nothing when no node", () => {
    render(<GraphTooltip node={undefined} x={100} y={200} canvasWidth={800} canvasHeight={600} />);
    expect(screen.queryByTestId("graph-tooltip")).toBeNull();
  });

  it("renders tooltip when node is provided", () => {
    render(
      <GraphTooltip node={createNode()} x={100} y={200} canvasWidth={800} canvasHeight={600} />
    );
    expect(screen.getByTestId("graph-tooltip")).toBeDefined();
  });

  it("shows port name", () => {
    render(
      <GraphTooltip node={createNode()} x={100} y={200} canvasWidth={800} canvasHeight={600} />
    );
    expect(screen.getByTestId("graph-tooltip").textContent).toContain("TestPort");
  });

  it("shows lifetime and origin", () => {
    render(
      <GraphTooltip node={createNode()} x={100} y={200} canvasWidth={800} canvasHeight={600} />
    );
    const text = screen.getByTestId("graph-tooltip").textContent ?? "";
    expect(text).toContain("singleton");
    expect(text).toContain("own");
  });

  it("shows description when provided", () => {
    render(
      <GraphTooltip
        node={createNode({ description: "A test description" })}
        x={100}
        y={200}
        canvasWidth={800}
        canvasHeight={600}
      />
    );
    expect(screen.getByTestId("graph-tooltip").textContent).toContain("A test description");
  });

  it("shows category when provided", () => {
    render(
      <GraphTooltip
        node={createNode({ category: "persistence" })}
        x={100}
        y={200}
        canvasWidth={800}
        canvasHeight={600}
      />
    );
    expect(screen.getByTestId("graph-tooltip").textContent).toContain("persistence");
  });

  it("shows error rate when non-zero", () => {
    render(
      <GraphTooltip
        node={createNode({ errorRate: 0.15, hasHighErrorRate: true })}
        x={100}
        y={200}
        canvasWidth={800}
        canvasHeight={600}
      />
    );
    expect(screen.getByTestId("graph-tooltip").textContent).toContain("15%");
  });

  it("shows dependency and dependent counts", () => {
    render(
      <GraphTooltip node={createNode()} x={100} y={200} canvasWidth={800} canvasHeight={600} />
    );
    const text = screen.getByTestId("graph-tooltip").textContent ?? "";
    expect(text).toContain("Dependencies: 1");
    expect(text).toContain("Dependents: 2");
  });

  it("has tooltip role", () => {
    render(
      <GraphTooltip node={createNode()} x={100} y={200} canvasWidth={800} canvasHeight={600} />
    );
    expect(screen.getByTestId("graph-tooltip").getAttribute("role")).toBe("tooltip");
  });
});
