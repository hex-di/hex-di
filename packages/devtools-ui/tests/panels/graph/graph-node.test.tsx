/**
 * Tests for GraphNode component.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { GraphNode } from "../../../src/panels/graph/components/graph-node.js";
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
      dependencyNames: [],
      origin: "own",
    },
    x: 100,
    y: 200,
    width: 200,
    height: 72,
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
    ...overrides,
  };
}

function renderInSvg(element: React.ReactElement): ReturnType<typeof render> {
  return render(<svg>{element}</svg>);
}

describe("GraphNode", () => {
  it("renders with test id", () => {
    renderInSvg(
      <GraphNode node={createNode()} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    expect(screen.getByTestId("graph-node-TestPort")).toBeDefined();
  });

  it("renders port name text", () => {
    renderInSvg(
      <GraphNode node={createNode()} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.textContent).toContain("TestPort");
  });

  it("truncates long port names at 22 chars", () => {
    const node = createNode({
      adapter: {
        portName: "VeryLongPortNameExceedingTwentyTwoChars",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "own",
      },
    });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-VeryLongPortNameExceedingTwentyTwoChars");
    expect(el.textContent).toContain("...");
  });

  it("does not truncate port names at 22 chars or fewer", () => {
    const node = createNode({
      adapter: {
        portName: "ExactlyTwentyTwoChar",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "own",
      },
    });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-ExactlyTwentyTwoChar");
    expect(el.textContent).toContain("ExactlyTwentyTwoChar");
    expect(el.textContent).not.toContain("...");
  });

  it("positions via transform", () => {
    renderInSvg(
      <GraphNode
        node={createNode({ x: 50, y: 75 })}
        isSelected={false}
        isMultiSelected={false}
        isHovered={false}
      />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.getAttribute("transform")).toBe("translate(50, 75)");
  });

  it("has button role for accessibility", () => {
    renderInSvg(
      <GraphNode node={createNode()} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.getAttribute("role")).toBe("button");
  });

  it("has aria-label", () => {
    renderInSvg(
      <GraphNode node={createNode()} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.getAttribute("aria-label")).toContain("TestPort");
    expect(el.getAttribute("aria-label")).toContain("singleton");
  });

  it("calls onClick with port name", () => {
    const onClick = vi.fn();
    renderInSvg(
      <GraphNode
        node={createNode()}
        isSelected={false}
        isMultiSelected={false}
        isHovered={false}
        onClick={onClick}
      />
    );
    screen
      .getByTestId("graph-node-TestPort")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledWith("TestPort");
  });

  it("calls onMouseEnter with port name", () => {
    const onMouseEnter = vi.fn();
    renderInSvg(
      <GraphNode
        node={createNode()}
        isSelected={false}
        isMultiSelected={false}
        isHovered={false}
        onMouseEnter={onMouseEnter}
      />
    );
    fireEvent.mouseEnter(screen.getByTestId("graph-node-TestPort"));
    expect(onMouseEnter).toHaveBeenCalledWith("TestPort");
  });

  it("renders at reduced opacity when filter doesn't match", () => {
    const node = createNode({ matchesFilter: false });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.getAttribute("opacity")).toBe("0.15");
  });

  it("renders at half opacity when unresolved", () => {
    const node = createNode({ isResolved: false });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.getAttribute("opacity")).toBe("0.5");
  });

  it("renders at full opacity when resolved and matching", () => {
    const node = createNode({ isResolved: true, matchesFilter: true });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.getAttribute("opacity")).toBe("1");
  });

  it("renders category bar when category is set and no library kind", () => {
    const node = createNode({ category: "persistence", libraryKind: undefined });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    const rects = el.querySelectorAll("rect");
    expect(rects.length).toBeGreaterThan(0);
  });

  it("does not render category bar when category is undefined and no library kind", () => {
    const node = createNode({ category: undefined, libraryKind: undefined });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    const rects = el.querySelectorAll("rect");
    expect(rects.length).toBe(0);
  });

  it("renders error rate badge for high error rate", () => {
    const node = createNode({ errorRate: 0.25, hasHighErrorRate: true });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.textContent).toContain("25%");
  });

  it("does not render error badge for low error rate", () => {
    const node = createNode({ errorRate: 0.01, hasHighErrorRate: false });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.textContent).not.toContain("%");
  });

  it("renders override badge for overridden adapter", () => {
    const node = createNode({
      adapter: {
        portName: "TestPort",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "own",
        isOverride: true,
      },
    });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.textContent).toContain("OVR");
  });

  it("renders inheritance mode badge when set", () => {
    const node = createNode({
      adapter: {
        portName: "TestPort",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "inherited",
        inheritanceMode: "shared",
      },
    });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.textContent).toContain("S");
  });

  it("renders forked inheritance mode as F", () => {
    const node = createNode({
      adapter: {
        portName: "TestPort",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "inherited",
        inheritanceMode: "forked",
      },
    });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.textContent).toContain("F");
  });

  it("renders inbound direction indicator", () => {
    const node = createNode({ direction: "inbound" });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.textContent).toContain("\u25B6");
  });

  it("renders outbound direction indicator", () => {
    const node = createNode({ direction: "outbound" });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.textContent).toContain("\u25C0");
  });

  it("renders library logo for library adapter", () => {
    const node = createNode({ libraryKind: { library: "store", kind: "state" } });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    expect(screen.getByTestId("library-logo")).toBeDefined();
  });

  it("does not render logo for undefined library kind", () => {
    const node = createNode({ libraryKind: undefined });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    expect(screen.queryByTestId("library-logo")).toBeNull();
  });

  it("renders async badge for async factory", () => {
    const node = createNode({
      adapter: {
        portName: "TestPort",
        lifetime: "singleton",
        factoryKind: "async",
        dependencyNames: [],
        origin: "own",
      },
    });
    renderInSvg(
      <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
    );
    const el = screen.getByTestId("graph-node-TestPort");
    expect(el.textContent).toContain("\u26A1");
  });

  // === Enhanced card UI tests ===

  describe("fill opacity (contrast fix)", () => {
    it("uses 0.15 fill opacity for resolved nodes", () => {
      renderInSvg(
        <GraphNode
          node={createNode({ isResolved: true })}
          isSelected={false}
          isMultiSelected={false}
          isHovered={false}
        />
      );
      const el = screen.getByTestId("graph-node-TestPort");
      const path = el.querySelector("path");
      expect(path?.getAttribute("fill-opacity")).toBe("0.15");
    });

    it("uses 0.08 fill opacity for unresolved nodes", () => {
      renderInSvg(
        <GraphNode
          node={createNode({ isResolved: false })}
          isSelected={false}
          isMultiSelected={false}
          isHovered={false}
        />
      );
      const el = screen.getByTestId("graph-node-TestPort");
      const path = el.querySelector("path");
      expect(path?.getAttribute("fill-opacity")).toBe("0.08");
    });

    it("uses --hex-text-primary for port name text color", () => {
      renderInSvg(
        <GraphNode
          node={createNode()}
          isSelected={false}
          isMultiSelected={false}
          isHovered={false}
        />
      );
      const el = screen.getByTestId("graph-node-TestPort");
      const texts = el.querySelectorAll("text");
      // First text element is the port name
      expect(texts[0]?.getAttribute("fill")).toBe("var(--hex-text-primary)");
    });
  });

  describe("3-line card anatomy", () => {
    it("renders line 2 with lifetime label for core/undefined kind", () => {
      renderInSvg(
        <GraphNode
          node={createNode()}
          isSelected={false}
          isMultiSelected={false}
          isHovered={false}
        />
      );
      const line2 = screen.getByTestId("node-line2");
      expect(line2.textContent).toBe("singleton");
    });

    it("renders line 2 with library kind + lifetime for library adapters", () => {
      const node = createNode({ libraryKind: { library: "store", kind: "state" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const line2 = screen.getByTestId("node-line2");
      expect(line2.textContent).toContain("state");
      expect(line2.textContent).toContain("singleton");
      expect(line2.textContent).toContain("\u00B7");
    });

    it("renders line 3 with dependency and dependent counts", () => {
      const node = createNode({
        adapter: {
          portName: "TestPort",
          lifetime: "singleton",
          factoryKind: "sync",
          dependencyNames: ["DepA", "DepB", "DepC"],
          origin: "own",
        },
        dependentCount: 2,
      });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const line3 = screen.getByTestId("node-line3");
      expect(line3.textContent).toContain("deps: 3");
      expect(line3.textContent).toContain("dependents: 2");
    });

    it("renders line 2 with query kind label", () => {
      const node = createNode({ libraryKind: { library: "query", kind: "mutation" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const line2 = screen.getByTestId("node-line2");
      expect(line2.textContent).toContain("mutation");
    });

    it("renders line 2 with saga kind label", () => {
      const node = createNode({ libraryKind: { library: "saga", kind: "saga" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const line2 = screen.getByTestId("node-line2");
      expect(line2.textContent).toContain("saga");
    });

    it("renders line 2 with flow kind label", () => {
      const node = createNode({ libraryKind: { library: "flow", kind: "activity" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const line2 = screen.getByTestId("node-line2");
      expect(line2.textContent).toContain("activity");
    });

    it("renders line 2 with logger label", () => {
      const node = createNode({ libraryKind: { library: "logger", kind: "logger" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const line2 = screen.getByTestId("node-line2");
      expect(line2.textContent).toContain("logger");
    });

    it("renders line 2 with handler label", () => {
      const node = createNode({ libraryKind: { library: "logger", kind: "handler" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const line2 = screen.getByTestId("node-line2");
      expect(line2.textContent).toContain("handler");
    });

    it("renders line 2 with tracer label", () => {
      const node = createNode({ libraryKind: { library: "tracing", kind: "tracer" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const line2 = screen.getByTestId("node-line2");
      expect(line2.textContent).toContain("tracer");
    });

    it("renders line 2 with exporter label", () => {
      const node = createNode({ libraryKind: { library: "tracing", kind: "exporter" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const line2 = screen.getByTestId("node-line2");
      expect(line2.textContent).toContain("exporter");
    });
  });

  describe("library accent strip", () => {
    it("renders accent strip for store adapter", () => {
      const node = createNode({ libraryKind: { library: "store", kind: "state" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const strip = screen.getByTestId("library-accent-strip");
      expect(strip.getAttribute("fill")).toBe("#059669");
    });

    it("renders accent strip for query adapter", () => {
      const node = createNode({ libraryKind: { library: "query", kind: "query" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const strip = screen.getByTestId("library-accent-strip");
      expect(strip.getAttribute("fill")).toBe("#0891B2");
    });

    it("renders accent strip for saga adapter", () => {
      const node = createNode({ libraryKind: { library: "saga", kind: "saga" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const strip = screen.getByTestId("library-accent-strip");
      expect(strip.getAttribute("fill")).toBe("#BE123C");
    });

    it("renders accent strip for flow adapter", () => {
      const node = createNode({ libraryKind: { library: "flow", kind: "flow" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const strip = screen.getByTestId("library-accent-strip");
      expect(strip.getAttribute("fill")).toBe("#4338CA");
    });

    it("renders accent strip for logger adapter", () => {
      const node = createNode({ libraryKind: { library: "logger", kind: "logger" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const strip = screen.getByTestId("library-accent-strip");
      expect(strip.getAttribute("fill")).toBe("#475569");
    });

    it("renders accent strip for tracing adapter", () => {
      const node = createNode({ libraryKind: { library: "tracing", kind: "tracer" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const strip = screen.getByTestId("library-accent-strip");
      expect(strip.getAttribute("fill")).toBe("#D97706");
    });

    it("does not render accent strip for core/generic adapter", () => {
      const node = createNode({ libraryKind: { library: "core", kind: "generic" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      expect(screen.queryByTestId("library-accent-strip")).toBeNull();
    });

    it("does not render accent strip for undefined library kind", () => {
      const node = createNode({ libraryKind: undefined });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      expect(screen.queryByTestId("library-accent-strip")).toBeNull();
    });

    it("renders category bar for core adapter with category", () => {
      const node = createNode({
        libraryKind: { library: "core", kind: "generic" },
        category: "persistence",
      });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      expect(screen.queryByTestId("library-accent-strip")).toBeNull();
      const el = screen.getByTestId("graph-node-TestPort");
      const rects = el.querySelectorAll("rect");
      expect(rects.length).toBeGreaterThan(0);
    });

    it("does not render category bar when library accent strip is present", () => {
      const node = createNode({
        libraryKind: { library: "store", kind: "state" },
        category: "persistence",
      });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const el = screen.getByTestId("graph-node-TestPort");
      const rects = el.querySelectorAll("rect");
      // Only the accent strip rect, not the category bar
      expect(rects.length).toBe(1);
      expect(rects[0]?.getAttribute("fill")).toBe("#059669");
    });

    it("accent strip width is 4px", () => {
      const node = createNode({ libraryKind: { library: "store", kind: "state" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      const strip = screen.getByTestId("library-accent-strip");
      expect(strip.getAttribute("width")).toBe("4");
    });
  });

  describe("library logo", () => {
    it("renders logo for store adapter", () => {
      const node = createNode({ libraryKind: { library: "store", kind: "state" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      expect(screen.getByTestId("library-logo")).toBeDefined();
    });

    it("renders logo for query adapter", () => {
      const node = createNode({ libraryKind: { library: "query", kind: "query" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      expect(screen.getByTestId("library-logo")).toBeDefined();
    });

    it("renders logo for saga adapter", () => {
      const node = createNode({ libraryKind: { library: "saga", kind: "saga" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      expect(screen.getByTestId("library-logo")).toBeDefined();
    });

    it("renders logo for flow adapter", () => {
      const node = createNode({ libraryKind: { library: "flow", kind: "flow" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      expect(screen.getByTestId("library-logo")).toBeDefined();
    });

    it("renders logo for logger adapter", () => {
      const node = createNode({ libraryKind: { library: "logger", kind: "logger" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      expect(screen.getByTestId("library-logo")).toBeDefined();
    });

    it("renders logo for tracing adapter", () => {
      const node = createNode({ libraryKind: { library: "tracing", kind: "tracer" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      expect(screen.getByTestId("library-logo")).toBeDefined();
    });

    it("does not render logo for undefined library kind", () => {
      const node = createNode({ libraryKind: undefined });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      expect(screen.queryByTestId("library-logo")).toBeNull();
    });

    it("does not render logo for core/generic adapter", () => {
      const node = createNode({ libraryKind: { library: "core", kind: "generic" } });
      renderInSvg(
        <GraphNode node={node} isSelected={false} isMultiSelected={false} isHovered={false} />
      );
      expect(screen.queryByTestId("library-logo")).toBeNull();
    });
  });
});
