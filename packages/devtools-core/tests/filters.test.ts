/**
 * Tests for devtools-core filter functions.
 *
 * Focuses on core filtering behavior for dependency graphs.
 */

import { describe, it, expect } from "vitest";
import { filterGraph, byLifetime, byPortName } from "../src/index.js";
import type { ExportedGraph, ExportedNode } from "../src/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const createTestGraph = (): ExportedGraph => ({
  nodes: [
    { id: "Logger", label: "Logger", portName: "Logger", lifetime: "singleton", factoryKind: "sync" },
    { id: "Config", label: "Config", portName: "Config", lifetime: "singleton", factoryKind: "sync" },
    { id: "UserService", label: "UserService", portName: "UserService", lifetime: "scoped", factoryKind: "sync" },
    { id: "UserRepository", label: "UserRepository", portName: "UserRepository", lifetime: "scoped", factoryKind: "sync" },
    { id: "RequestHandler", label: "RequestHandler", portName: "RequestHandler", lifetime: "transient", factoryKind: "sync" },
  ],
  edges: [
    { from: "UserService", to: "Logger" },
    { from: "UserService", to: "UserRepository" },
    { from: "UserRepository", to: "Config" },
    { from: "RequestHandler", to: "UserService" },
  ],
});

// =============================================================================
// filterGraph Tests
// =============================================================================

describe("filterGraph", () => {
  it("filters nodes by predicate", () => {
    const graph = createTestGraph();
    const predicate = (node: ExportedNode) => node.id.startsWith("User");

    const filtered = filterGraph(graph, predicate);

    expect(filtered.nodes).toHaveLength(2);
    expect(filtered.nodes.map((n) => n.id)).toEqual(["UserService", "UserRepository"]);
  });

  it("removes edges referencing filtered-out nodes", () => {
    const graph = createTestGraph();
    // Keep only singleton nodes (Logger, Config)
    const filtered = filterGraph(graph, byLifetime("singleton"));

    expect(filtered.nodes).toHaveLength(2);
    // All edges reference non-singleton nodes, so none should remain
    expect(filtered.edges).toHaveLength(0);
  });

  it("preserves edges between remaining nodes", () => {
    const graph = createTestGraph();
    // Keep UserService, UserRepository, Logger, Config (excludes RequestHandler)
    const filtered = filterGraph(graph, (n) => n.id !== "RequestHandler");

    expect(filtered.nodes).toHaveLength(4);
    // Should keep 3 edges (excluding RequestHandler -> UserService)
    expect(filtered.edges).toHaveLength(3);
    expect(filtered.edges).toContainEqual({ from: "UserService", to: "Logger" });
    expect(filtered.edges).toContainEqual({ from: "UserService", to: "UserRepository" });
    expect(filtered.edges).toContainEqual({ from: "UserRepository", to: "Config" });
  });

  it("returns frozen immutable structure", () => {
    const graph = createTestGraph();
    const filtered = filterGraph(graph, () => true);

    expect(Object.isFrozen(filtered)).toBe(true);
    expect(Object.isFrozen(filtered.nodes)).toBe(true);
    expect(Object.isFrozen(filtered.edges)).toBe(true);
  });

  it("does not modify original graph", () => {
    const graph = createTestGraph();
    const originalNodeCount = graph.nodes.length;
    const originalEdgeCount = graph.edges.length;

    filterGraph(graph, (n) => n.id === "Logger");

    expect(graph.nodes.length).toBe(originalNodeCount);
    expect(graph.edges.length).toBe(originalEdgeCount);
  });
});

// =============================================================================
// byLifetime Tests
// =============================================================================

describe("byLifetime", () => {
  it("creates predicate that matches singleton lifetime", () => {
    const graph = createTestGraph();
    const filtered = filterGraph(graph, byLifetime("singleton"));

    expect(filtered.nodes).toHaveLength(2);
    expect(filtered.nodes.every((n) => n.lifetime === "singleton")).toBe(true);
  });

  it("creates predicate that matches scoped lifetime", () => {
    const graph = createTestGraph();
    const filtered = filterGraph(graph, byLifetime("scoped"));

    expect(filtered.nodes).toHaveLength(2);
    expect(filtered.nodes.map((n) => n.id)).toContain("UserService");
    expect(filtered.nodes.map((n) => n.id)).toContain("UserRepository");
  });

  it("creates predicate that matches transient lifetime", () => {
    const graph = createTestGraph();
    const filtered = filterGraph(graph, byLifetime("transient"));

    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.nodes[0]?.id).toBe("RequestHandler");
  });
});

// =============================================================================
// byPortName Tests
// =============================================================================

describe("byPortName", () => {
  it("creates predicate that matches suffix pattern", () => {
    const graph = createTestGraph();
    const filtered = filterGraph(graph, byPortName(/Service$/));

    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.nodes[0]?.id).toBe("UserService");
  });

  it("creates predicate that matches prefix pattern", () => {
    const graph = createTestGraph();
    const filtered = filterGraph(graph, byPortName(/^User/));

    expect(filtered.nodes).toHaveLength(2);
    expect(filtered.nodes.map((n) => n.id)).toContain("UserService");
    expect(filtered.nodes.map((n) => n.id)).toContain("UserRepository");
  });

  it("creates predicate that matches containing pattern", () => {
    const graph = createTestGraph();
    const filtered = filterGraph(graph, byPortName(/Handler/));

    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.nodes[0]?.id).toBe("RequestHandler");
  });

  it("supports case-insensitive patterns", () => {
    const graph = createTestGraph();
    const filtered = filterGraph(graph, byPortName(/logger/i));

    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.nodes[0]?.id).toBe("Logger");
  });
});
