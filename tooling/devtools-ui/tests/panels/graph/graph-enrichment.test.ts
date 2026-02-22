/**
 * Tests for node and edge enrichment logic.
 */

import { describe, it, expect } from "vitest";
import {
  enrichNode,
  enrichEdge,
  buildDependentCounts,
  buildTransitiveDepthMap,
  buildDependentMap,
} from "../../../src/panels/graph/enrichment.js";
import { DEFAULT_FILTER_STATE } from "../../../src/panels/graph/constants.js";
import type {
  VisualizableAdapter,
  LayoutNode,
  LayoutEdge,
  ResultStatistics,
} from "../../../src/panels/graph/types.js";
import type { PortInfo } from "@hex-di/graph/advanced";

function createAdapter(overrides: Partial<VisualizableAdapter> = {}): VisualizableAdapter {
  return {
    portName: "TestPort",
    lifetime: "singleton",
    factoryKind: "sync",
    dependencyNames: [],
    origin: "own",
    ...overrides,
  };
}

function createLayoutNode(adapter: VisualizableAdapter): LayoutNode {
  return { adapter, x: 0, y: 0, width: 160, height: 48 };
}

function createStats(overrides: Partial<ResultStatistics> = {}): ResultStatistics {
  return {
    portName: "TestPort",
    totalCalls: 100,
    okCount: 90,
    errCount: 10,
    errorRate: 0.1,
    errorsByCode: new Map([["FACTORY_ERROR", 10]]),
    lastError: undefined,
    ...overrides,
  };
}

// =============================================================================
// enrichNode
// =============================================================================

describe("enrichNode", () => {
  it("produces enriched node with correct coordinates", () => {
    const adapter = createAdapter();
    const layout = createLayoutNode(adapter);
    const result = enrichNode(layout, undefined, undefined, 0, true, DEFAULT_FILTER_STATE);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(160);
    expect(result.height).toBe(48);
  });

  it("copies adapter reference", () => {
    const adapter = createAdapter({ portName: "MyPort" });
    const layout = createLayoutNode(adapter);
    const result = enrichNode(layout, undefined, undefined, 0, true, DEFAULT_FILTER_STATE);
    expect(result.adapter.portName).toBe("MyPort");
  });

  it("sets isResolved flag", () => {
    const layout = createLayoutNode(createAdapter());
    const resolved = enrichNode(layout, undefined, undefined, 0, true, DEFAULT_FILTER_STATE);
    expect(resolved.isResolved).toBe(true);
    const unresolved = enrichNode(layout, undefined, undefined, 0, false, DEFAULT_FILTER_STATE);
    expect(unresolved.isResolved).toBe(false);
  });

  it("computes error rate from stats", () => {
    const layout = createLayoutNode(createAdapter());
    const stats = createStats({ errorRate: 0.25 });
    const result = enrichNode(layout, stats, undefined, 0, true, DEFAULT_FILTER_STATE);
    expect(result.errorRate).toBe(0.25);
    expect(result.hasHighErrorRate).toBe(true);
  });

  it("marks high error rate at threshold", () => {
    const layout = createLayoutNode(createAdapter());
    const stats = createStats({ errorRate: 0.1 });
    const result = enrichNode(layout, stats, undefined, 0, true, DEFAULT_FILTER_STATE);
    expect(result.hasHighErrorRate).toBe(true);
  });

  it("does not mark high error rate below threshold", () => {
    const layout = createLayoutNode(createAdapter());
    const stats = createStats({ errorRate: 0.05 });
    const result = enrichNode(layout, stats, undefined, 0, true, DEFAULT_FILTER_STATE);
    expect(result.hasHighErrorRate).toBe(false);
  });

  it("maps port info direction and category", () => {
    const layout = createLayoutNode(createAdapter());
    const portInfo: PortInfo = {
      name: "TestPort",
      lifetime: "singleton",
      direction: "inbound",
      category: "persistence",
      tags: ["db"],
    };
    const result = enrichNode(layout, undefined, portInfo, 0, true, DEFAULT_FILTER_STATE);
    expect(result.direction).toBe("inbound");
    expect(result.category).toBe("persistence");
    expect(result.tags).toEqual(["db"]);
  });

  it("defaults tags to empty array when no port info", () => {
    const layout = createLayoutNode(createAdapter());
    const result = enrichNode(layout, undefined, undefined, 0, true, DEFAULT_FILTER_STATE);
    expect(result.tags).toEqual([]);
  });

  it("reads description from metadata", () => {
    const adapter = createAdapter({ metadata: { description: "A test adapter" } });
    const layout = createLayoutNode(adapter);
    const result = enrichNode(layout, undefined, undefined, 0, true, DEFAULT_FILTER_STATE);
    expect(result.description).toBe("A test adapter");
  });

  it("sets dependentCount", () => {
    const layout = createLayoutNode(createAdapter());
    const result = enrichNode(layout, undefined, undefined, 5, true, DEFAULT_FILTER_STATE);
    expect(result.dependentCount).toBe(5);
  });

  it("computes matchesFilter", () => {
    const layout = createLayoutNode(createAdapter({ portName: "Logger" }));
    const filter = { ...DEFAULT_FILTER_STATE, searchText: "log" };
    const result = enrichNode(layout, undefined, undefined, 0, true, filter);
    expect(result.matchesFilter).toBe(true);
  });

  it("detects library kind from adapter category", () => {
    const adapter = createAdapter({
      portName: "Counter",
      metadata: { category: "store/state" },
    });
    const layout = createLayoutNode(adapter);
    const result = enrichNode(layout, undefined, undefined, 0, true, DEFAULT_FILTER_STATE);
    expect(result.libraryKind).toEqual({ library: "store", kind: "state" });
  });
});

// =============================================================================
// enrichEdge
// =============================================================================

describe("enrichEdge", () => {
  const edge: LayoutEdge = {
    source: "A",
    target: "B",
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ],
  };

  it("marks edge as highlighted when source is selected", () => {
    const result = enrichEdge(edge, new Set(["A"]), new Map(), new Map());
    expect(result.isHighlighted).toBe(true);
  });

  it("marks edge as highlighted when target is selected", () => {
    const result = enrichEdge(edge, new Set(["B"]), new Map(), new Map());
    expect(result.isHighlighted).toBe(true);
  });

  it("marks edge as not highlighted when neither endpoint is selected", () => {
    const result = enrichEdge(edge, new Set(["C"]), new Map(), new Map());
    expect(result.isHighlighted).toBe(false);
  });

  it("computes transitive depth from depth map", () => {
    const depths = new Map([
      ["A", 1],
      ["B", 2],
    ]);
    const result = enrichEdge(edge, new Set(), depths, new Map());
    expect(result.transitiveDepth).toBe(1);
  });

  it("returns -1 for transitive depth when not in map", () => {
    const result = enrichEdge(edge, new Set(), new Map(), new Map());
    expect(result.transitiveDepth).toBe(-1);
  });

  it("detects inherited edge", () => {
    const adapterMap = new Map<string, VisualizableAdapter>([
      ["A", createAdapter({ portName: "A", origin: "inherited" })],
    ]);
    const result = enrichEdge(edge, new Set(), new Map(), adapterMap);
    expect(result.isInherited).toBe(true);
  });

  it("detects overridden edge", () => {
    const adapterMap = new Map<string, VisualizableAdapter>([
      ["A", createAdapter({ portName: "A", isOverride: true })],
    ]);
    const result = enrichEdge(edge, new Set(), new Map(), adapterMap);
    expect(result.isOverridden).toBe(true);
  });
});

// =============================================================================
// buildDependentCounts
// =============================================================================

describe("buildDependentCounts", () => {
  it("returns empty map for no adapters", () => {
    expect(buildDependentCounts([]).size).toBe(0);
  });

  it("counts dependents correctly", () => {
    const adapters = [
      createAdapter({ portName: "A", dependencyNames: [] }),
      createAdapter({ portName: "B", dependencyNames: ["A"] }),
      createAdapter({ portName: "C", dependencyNames: ["A", "B"] }),
    ];
    const counts = buildDependentCounts(adapters);
    expect(counts.get("A")).toBe(2);
    expect(counts.get("B")).toBe(1);
    expect(counts.has("C")).toBe(false);
  });
});

// =============================================================================
// buildTransitiveDepthMap
// =============================================================================

describe("buildTransitiveDepthMap", () => {
  it("returns empty map for no selected nodes", () => {
    expect(buildTransitiveDepthMap(new Set(), new Map(), new Map()).size).toBe(0);
  });

  it("sets depth 0 for selected node", () => {
    const depMap = new Map<string, readonly string[]>([["A", []]]);
    const result = buildTransitiveDepthMap(new Set(["A"]), depMap, new Map());
    expect(result.get("A")).toBe(0);
  });

  it("traverses dependencies at increasing depth", () => {
    const depMap = new Map<string, readonly string[]>([
      ["B", ["A"]],
      ["A", []],
    ]);
    const depndtMap = new Map<string, readonly string[]>();
    const result = buildTransitiveDepthMap(new Set(["B"]), depMap, depndtMap);
    expect(result.get("B")).toBe(0);
    expect(result.get("A")).toBe(1);
  });

  it("traverses dependents at increasing depth", () => {
    const depMap = new Map<string, readonly string[]>();
    const depndtMap = new Map<string, readonly string[]>([
      ["A", ["B"]],
      ["B", ["C"]],
    ]);
    const result = buildTransitiveDepthMap(new Set(["A"]), depMap, depndtMap);
    expect(result.get("A")).toBe(0);
    expect(result.get("B")).toBe(1);
    expect(result.get("C")).toBe(2);
  });
});

// =============================================================================
// buildDependentMap
// =============================================================================

describe("buildDependentMap", () => {
  it("returns empty map for no adapters", () => {
    expect(buildDependentMap([]).size).toBe(0);
  });

  it("builds correct reverse dependency map", () => {
    const adapters = [
      createAdapter({ portName: "A", dependencyNames: [] }),
      createAdapter({ portName: "B", dependencyNames: ["A"] }),
      createAdapter({ portName: "C", dependencyNames: ["A"] }),
    ];
    const map = buildDependentMap(adapters);
    expect(map.get("A")).toEqual(["B", "C"]);
  });
});
