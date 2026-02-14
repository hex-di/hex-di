/**
 * Tests for NodeDetailPanel component.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NodeDetailPanel } from "../../../src/panels/graph/components/node-detail-panel.js";
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
      dependencyNames: ["Dep1", "Dep2"],
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
    dependentCount: 3,
    matchesFilter: true,
    ...overrides,
  };
}

describe("NodeDetailPanel", () => {
  it("renders nothing when no node", () => {
    render(<NodeDetailPanel node={undefined} transitiveDeps={[]} transitiveDependents={[]} />);
    expect(screen.queryByTestId("node-detail-panel")).toBeNull();
  });

  it("renders when node provided", () => {
    render(
      <NodeDetailPanel node={createNode()} transitiveDeps={[]} transitiveDependents={["A", "B"]} />
    );
    expect(screen.getByTestId("node-detail-panel")).toBeDefined();
  });

  it("shows port name", () => {
    render(<NodeDetailPanel node={createNode()} transitiveDeps={[]} transitiveDependents={[]} />);
    expect(screen.getByTestId("node-detail-panel").textContent).toContain("TestPort");
  });

  it("has region role and aria-label", () => {
    render(<NodeDetailPanel node={createNode()} transitiveDeps={[]} transitiveDependents={[]} />);
    const panel = screen.getByTestId("node-detail-panel");
    expect(panel.getAttribute("role")).toBe("region");
    expect(panel.getAttribute("aria-label")).toContain("TestPort");
  });

  it("shows lifetime and origin", () => {
    render(<NodeDetailPanel node={createNode()} transitiveDeps={[]} transitiveDependents={[]} />);
    const text = screen.getByTestId("node-detail-panel").textContent ?? "";
    expect(text).toContain("singleton");
    expect(text).toContain("own");
  });

  it("shows factory kind", () => {
    render(<NodeDetailPanel node={createNode()} transitiveDeps={[]} transitiveDependents={[]} />);
    expect(screen.getByTestId("node-detail-panel").textContent).toContain("sync");
  });

  it("shows dependency count and names", () => {
    render(<NodeDetailPanel node={createNode()} transitiveDeps={[]} transitiveDependents={[]} />);
    const text = screen.getByTestId("node-detail-panel").textContent ?? "";
    expect(text).toContain("Dependencies (2)");
    expect(text).toContain("Dep1");
    expect(text).toContain("Dep2");
  });

  it("shows dependent count", () => {
    render(
      <NodeDetailPanel
        node={createNode()}
        transitiveDeps={[]}
        transitiveDependents={["A", "B", "C"]}
      />
    );
    expect(screen.getByTestId("node-detail-panel").textContent).toContain("Dependents (3)");
  });

  it("shows 'None' when no dependencies", () => {
    render(
      <NodeDetailPanel
        node={createNode({
          adapter: {
            portName: "Leaf",
            lifetime: "singleton",
            factoryKind: "sync",
            dependencyNames: [],
            origin: "own",
          },
        })}
        transitiveDeps={[]}
        transitiveDependents={[]}
      />
    );
    expect(screen.getByTestId("node-detail-panel").textContent).toContain("None");
  });

  it("shows direction when provided", () => {
    render(
      <NodeDetailPanel
        node={createNode({ direction: "inbound" })}
        transitiveDeps={[]}
        transitiveDependents={[]}
      />
    );
    expect(screen.getByTestId("node-detail-panel").textContent).toContain("inbound");
  });

  it("shows category when provided", () => {
    render(
      <NodeDetailPanel
        node={createNode({ category: "persistence" })}
        transitiveDeps={[]}
        transitiveDependents={[]}
      />
    );
    expect(screen.getByTestId("node-detail-panel").textContent).toContain("persistence");
  });

  it("shows error rate when present", () => {
    render(
      <NodeDetailPanel
        node={createNode({
          errorRate: 0.25,
          hasHighErrorRate: true,
          totalCalls: 100,
          errCount: 25,
        })}
        transitiveDeps={[]}
        transitiveDependents={[]}
      />
    );
    expect(screen.getByTestId("node-detail-panel").textContent).toContain("25%");
  });

  it("shows tags when present", () => {
    render(
      <NodeDetailPanel
        node={createNode({ tags: ["api", "core"] })}
        transitiveDeps={[]}
        transitiveDependents={[]}
      />
    );
    const text = screen.getByTestId("node-detail-panel").textContent ?? "";
    expect(text).toContain("api");
    expect(text).toContain("core");
  });

  it("shows View Metadata button when handler provided", () => {
    const onViewMetadata = vi.fn();
    render(
      <NodeDetailPanel
        node={createNode()}
        transitiveDeps={[]}
        transitiveDependents={[]}
        onViewMetadata={onViewMetadata}
      />
    );
    const btn = screen.getByText("View Metadata");
    fireEvent.click(btn);
    expect(onViewMetadata).toHaveBeenCalledWith("TestPort");
  });

  it("shows Highlight Chain button when handler provided", () => {
    const onHighlightChain = vi.fn();
    render(
      <NodeDetailPanel
        node={createNode()}
        transitiveDeps={[]}
        transitiveDependents={[]}
        onHighlightChain={onHighlightChain}
      />
    );
    const btn = screen.getByText("Highlight Chain");
    fireEvent.click(btn);
    expect(onHighlightChain).toHaveBeenCalledWith("TestPort");
  });

  it("clicking dependency chip calls onNodeClick", () => {
    const onNodeClick = vi.fn();
    render(
      <NodeDetailPanel
        node={createNode()}
        transitiveDeps={[]}
        transitiveDependents={[]}
        onNodeClick={onNodeClick}
      />
    );
    fireEvent.click(screen.getByText("Dep1"));
    expect(onNodeClick).toHaveBeenCalledWith("Dep1");
  });

  it("shows library kind when present", () => {
    render(
      <NodeDetailPanel
        node={createNode({
          libraryKind: { library: "store", kind: "state" },
        })}
        transitiveDeps={[]}
        transitiveDependents={[]}
      />
    );
    expect(screen.getByTestId("node-detail-panel").textContent).toContain("store/state");
  });

  it("shows +N more when many dependents", () => {
    const deps = Array.from({ length: 15 }, (_, i) => `Dep${i}`);
    render(
      <NodeDetailPanel
        node={createNode({ dependentCount: 15 })}
        transitiveDeps={[]}
        transitiveDependents={deps}
      />
    );
    expect(screen.getByTestId("node-detail-panel").textContent).toContain("+5 more");
  });

  it("shows inheritance mode when present", () => {
    render(
      <NodeDetailPanel
        node={createNode({
          adapter: {
            portName: "TestPort",
            lifetime: "singleton",
            factoryKind: "sync",
            dependencyNames: [],
            origin: "inherited",
            inheritanceMode: "forked",
          },
        })}
        transitiveDeps={[]}
        transitiveDependents={[]}
      />
    );
    expect(screen.getByTestId("node-detail-panel").textContent).toContain("forked");
  });
});
