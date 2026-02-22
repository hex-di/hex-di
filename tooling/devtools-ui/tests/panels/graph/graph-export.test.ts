/**
 * Tests for graph export functions.
 */

import { describe, it, expect } from "vitest";
import {
  exportDot,
  buildSubgraphDot,
  exportMermaid,
  encodeGraphUrlState,
  decodeGraphUrlState,
  sanitizeMermaidId,
} from "../../../src/panels/graph/export.js";
import { DEFAULT_FILTER_STATE } from "../../../src/panels/graph/constants.js";
import type { ContainerGraphData, EnrichedGraphNode } from "../../../src/panels/graph/types.js";

function createNode(
  portName: string,
  deps: string[] = [],
  lifetime: "singleton" | "scoped" | "transient" = "singleton"
): EnrichedGraphNode {
  return {
    adapter: {
      portName,
      lifetime,
      factoryKind: "sync",
      dependencyNames: deps,
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
    dependentCount: 0,
    matchesFilter: true,
  };
}

const graphData: ContainerGraphData = {
  adapters: [
    {
      portName: "Logger",
      lifetime: "singleton",
      factoryKind: "sync",
      dependencyNames: [],
      origin: "own",
    },
    {
      portName: "Database",
      lifetime: "scoped",
      factoryKind: "sync",
      dependencyNames: ["Logger"],
      origin: "own",
    },
  ],
  containerName: "TestApp",
  kind: "root",
  parentName: null,
};

// =============================================================================
// exportDot
// =============================================================================

describe("exportDot", () => {
  it("produces valid DOT output", () => {
    const nodes = [createNode("Logger"), createNode("Database", ["Logger"], "scoped")];
    const dot = exportDot(graphData, nodes);
    expect(dot).toContain("digraph");
    expect(dot).toContain("TestApp");
  });

  it("includes node declarations", () => {
    const nodes = [createNode("Logger")];
    const dot = exportDot(graphData, nodes);
    expect(dot).toContain('"Logger"');
  });

  it("includes edge declarations", () => {
    const nodes = [createNode("Logger"), createNode("Database", ["Logger"])];
    const dot = exportDot(graphData, nodes);
    expect(dot).toContain('"Logger" -> "Database"');
  });

  it("includes lifetime in label", () => {
    const nodes = [createNode("Logger", [], "singleton")];
    const dot = exportDot(graphData, nodes);
    expect(dot).toContain("singleton");
  });

  it("handles empty node list", () => {
    const dot = exportDot(graphData, []);
    expect(dot).toContain("digraph");
    expect(dot).toContain("}");
  });
});

// =============================================================================
// buildSubgraphDot
// =============================================================================

describe("buildSubgraphDot", () => {
  it("includes selected nodes", () => {
    const nodes = [createNode("Logger"), createNode("Database", ["Logger"]), createNode("Cache")];
    const dot = buildSubgraphDot(graphData, nodes, new Set(["Logger"]));
    expect(dot).toContain('"Logger"');
  });

  it("includes nodes that depend on selected nodes", () => {
    const nodes = [createNode("Logger"), createNode("Database", ["Logger"]), createNode("Cache")];
    const dot = buildSubgraphDot(graphData, nodes, new Set(["Logger"]));
    expect(dot).toContain('"Database"');
  });

  it("excludes unrelated nodes", () => {
    const nodes = [createNode("Logger"), createNode("Database", ["Logger"]), createNode("Cache")];
    const dot = buildSubgraphDot(graphData, nodes, new Set(["Logger"]));
    expect(dot).not.toContain('"Cache"');
  });
});

// =============================================================================
// exportMermaid
// =============================================================================

describe("exportMermaid", () => {
  it("produces valid Mermaid output", () => {
    const nodes = [createNode("Logger")];
    const mermaid = exportMermaid(nodes);
    expect(mermaid).toContain("graph TD");
  });

  it("includes node definitions", () => {
    const nodes = [createNode("Logger")];
    const mermaid = exportMermaid(nodes);
    expect(mermaid).toContain('Logger["Logger"]');
  });

  it("includes edges", () => {
    const nodes = [createNode("Logger"), createNode("Database", ["Logger"])];
    const mermaid = exportMermaid(nodes);
    expect(mermaid).toContain("Logger --> Database");
  });
});

// =============================================================================
// sanitizeMermaidId
// =============================================================================

describe("sanitizeMermaidId", () => {
  it("passes through simple names", () => {
    expect(sanitizeMermaidId("Logger")).toBe("Logger");
  });

  it("replaces special characters with underscores", () => {
    expect(sanitizeMermaidId("my-port.name")).toBe("my_port_name");
  });
});

// =============================================================================
// URL state encoding/decoding
// =============================================================================

describe("encodeGraphUrlState", () => {
  it("encodes container name", () => {
    const result = encodeGraphUrlState({ containerName: "TestApp" });
    expect(result).toContain("container=TestApp");
  });

  it("encodes selected nodes", () => {
    const result = encodeGraphUrlState({
      selectedNodes: new Set(["A", "B"]),
    });
    expect(result).toContain("selected=");
    expect(result).toContain("A");
    expect(result).toContain("B");
  });

  it("skips default direction (TB)", () => {
    const result = encodeGraphUrlState({ direction: "TB" });
    expect(result).not.toContain("dir");
  });

  it("encodes non-default direction", () => {
    const result = encodeGraphUrlState({ direction: "LR" });
    expect(result).toContain("dir=LR");
  });

  it("encodes search text from filter", () => {
    const result = encodeGraphUrlState({
      filter: { ...DEFAULT_FILTER_STATE, searchText: "user" },
    });
    expect(result).toContain("search=user");
  });

  it("returns empty string for no params", () => {
    const result = encodeGraphUrlState({});
    expect(result).toBe("");
  });
});

describe("decodeGraphUrlState", () => {
  it("decodes container name", () => {
    const result = decodeGraphUrlState("container=TestApp");
    expect(result.containerName).toBe("TestApp");
  });

  it("decodes selected nodes", () => {
    const result = decodeGraphUrlState("selected=A,B");
    expect(result.selectedNodes).toEqual(new Set(["A", "B"]));
  });

  it("decodes direction", () => {
    const result = decodeGraphUrlState("dir=LR");
    expect(result.direction).toBe("LR");
  });

  it("defaults to TB direction", () => {
    const result = decodeGraphUrlState("");
    expect(result.direction).toBe("TB");
  });

  it("decodes search text", () => {
    const result = decodeGraphUrlState("search=user");
    expect(result.searchText).toBe("user");
  });

  it("defaults to empty search text", () => {
    const result = decodeGraphUrlState("");
    expect(result.searchText).toBe("");
  });

  it("round-trips correctly", () => {
    const encoded = encodeGraphUrlState({
      containerName: "App",
      selectedNodes: new Set(["Logger"]),
      direction: "LR",
      filter: { ...DEFAULT_FILTER_STATE, searchText: "log" },
    });
    const decoded = decodeGraphUrlState(encoded);
    expect(decoded.containerName).toBe("App");
    expect(decoded.selectedNodes).toEqual(new Set(["Logger"]));
    expect(decoded.direction).toBe("LR");
    expect(decoded.searchText).toBe("log");
  });
});
