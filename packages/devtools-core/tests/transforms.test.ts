/**
 * Tests for devtools-core transform functions.
 *
 * Focuses on core behavior: converting graphs to various output formats.
 */

import { describe, it, expect } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { toJSON, toDOT, toMermaid } from "../src/index.js";
import type { ExportedGraph } from "../src/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = createPort<"Logger", { log: (msg: string) => void }>("Logger");
const ConfigPort = createPort<"Config", { get: (key: string) => string }>("Config");
const ServicePort = createPort<"Service", { run: () => void }>("Service");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ get: () => "" }),
});

const ServiceAdapter = createAdapter({
  provides: ServicePort,
  requires: [LoggerPort, ConfigPort],
  lifetime: "scoped",
  factory: () => ({ run: () => {} }),
});

// =============================================================================
// toJSON Tests
// =============================================================================

describe("toJSON", () => {
  it("extracts nodes from graph adapters", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(ConfigAdapter).build();

    const exported = toJSON(graph);

    expect(exported.nodes).toHaveLength(2);
    expect(exported.nodes.map(n => n.id)).toContain("Logger");
    expect(exported.nodes.map(n => n.id)).toContain("Config");
  });

  it("includes node lifetime and factoryKind", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const exported = toJSON(graph);
    const loggerNode = exported.nodes.find(n => n.id === "Logger");

    expect(loggerNode?.lifetime).toBe("singleton");
    expect(loggerNode?.factoryKind).toBe("sync");
  });

  it("extracts edges from adapter dependencies", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ConfigAdapter)
      .provide(ServiceAdapter)
      .build();

    const exported = toJSON(graph);

    expect(exported.edges).toHaveLength(2);
    expect(exported.edges).toContainEqual({ from: "Service", to: "Config" });
    expect(exported.edges).toContainEqual({ from: "Service", to: "Logger" });
  });

  it("returns frozen immutable structure", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const exported = toJSON(graph);

    expect(Object.isFrozen(exported)).toBe(true);
    expect(Object.isFrozen(exported.nodes)).toBe(true);
    expect(Object.isFrozen(exported.edges)).toBe(true);
  });

  it("sorts nodes alphabetically by id", () => {
    const graph = GraphBuilder.create()
      .provide(ServiceAdapter)
      .provide(LoggerAdapter)
      .provide(ConfigAdapter)
      .build();

    const exported = toJSON(graph);
    const ids = exported.nodes.map(n => n.id);

    expect(ids).toEqual(["Config", "Logger", "Service"]);
  });
});

// =============================================================================
// toDOT Tests
// =============================================================================

describe("toDOT", () => {
  it("produces valid DOT digraph format", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const dot = toDOT(graph);

    expect(dot).toContain("digraph DependencyGraph {");
    expect(dot).toContain("}");
    expect(dot).toContain('"Logger"');
  });

  it("includes node labels with lifetime", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const dot = toDOT(graph);

    expect(dot).toContain('label="Logger\\n(singleton)"');
  });

  it("includes edge relationships", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ServiceAdapter)
      .provide(ConfigAdapter)
      .build();

    const dot = toDOT(graph);

    expect(dot).toContain('"Service" -> "Logger"');
    expect(dot).toContain('"Service" -> "Config"');
  });

  it("respects direction option", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const dotLR = toDOT(graph, { direction: "LR" });
    const dotTB = toDOT(graph, { direction: "TB" });

    expect(dotLR).toContain("rankdir=LR");
    expect(dotTB).toContain("rankdir=TB");
  });

  it("accepts ExportedGraph directly", () => {
    const exported: ExportedGraph = {
      nodes: [{ id: "Test", label: "Test", lifetime: "singleton", factoryKind: "sync" }],
      edges: [],
    };

    const dot = toDOT(exported);

    expect(dot).toContain('"Test"');
    expect(dot).toContain('label="Test\\n(singleton)"');
  });
});

// =============================================================================
// toMermaid Tests
// =============================================================================

describe("toMermaid", () => {
  it("produces valid Mermaid graph syntax", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const mermaid = toMermaid(graph);

    expect(mermaid).toMatch(/^graph TD/);
    expect(mermaid).toContain('Logger["Logger (singleton)"]');
  });

  it("includes edge relationships", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ServiceAdapter)
      .provide(ConfigAdapter)
      .build();

    const mermaid = toMermaid(graph);

    expect(mermaid).toContain("Service --> Logger");
    expect(mermaid).toContain("Service --> Config");
  });

  it("respects direction option", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const mermaidLR = toMermaid(graph, { direction: "LR" });
    const mermaidTD = toMermaid(graph, { direction: "TD" });

    expect(mermaidLR).toMatch(/^graph LR/);
    expect(mermaidTD).toMatch(/^graph TD/);
  });

  it("accepts ExportedGraph directly", () => {
    const exported: ExportedGraph = {
      nodes: [{ id: "Test", label: "Test", lifetime: "scoped", factoryKind: "sync" }],
      edges: [],
    };

    const mermaid = toMermaid(exported);

    expect(mermaid).toContain('Test["Test (scoped)"]');
  });

  it("sanitizes node IDs for Mermaid compatibility", () => {
    const exported: ExportedGraph = {
      nodes: [
        { id: "My-Service.v2", label: "My-Service.v2", lifetime: "singleton", factoryKind: "sync" },
      ],
      edges: [],
    };

    const mermaid = toMermaid(exported);

    // Node ID should be alphanumeric only
    expect(mermaid).toContain('MyServicev2["');
  });
});
