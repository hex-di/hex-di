/**
 * Graph Visualization Snapshot Tests
 *
 * These tests verify that toDotGraph() and toMermaidGraph() produce
 * consistent, correct output. Snapshots catch unintended format changes.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter, inspectGraph } from "@hex-di/graph";
import { toDotGraph, toMermaidGraph } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): Promise<unknown>;
}
interface Cache {
  get(key: string): unknown;
}
interface UserService {
  getUser(id: string): Promise<object>;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const CachePort = createPort<"Cache", Cache>("Cache");
const UserServicePort = createPort<"UserService", UserService>("UserService");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: "scoped",
  factory: () => ({ query: async () => ({}) }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: () => ({ get: () => ({}) }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort, CachePort],
  lifetime: "transient",
  factory: () => ({ getUser: async () => ({}) }),
});

// =============================================================================
// DOT Graph Format Tests
// =============================================================================

describe("toDotGraph()", () => {
  it("generates correct DOT for simple graph", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    const info = inspectGraph(graph);
    const dot = toDotGraph(info);

    expect(dot).toMatchInlineSnapshot(`
      "digraph G {
        rankdir=TB;
        node [shape=box, style=rounded];
        "Logger" [label="Logger\\n(singleton)"];
        "Database" [label="Database\\n(scoped)"];
        "Database" -> "Logger";
      }"
    `);
  });

  it("generates correct DOT for diamond dependency", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter)
      .build();

    const info = inspectGraph(graph);
    const dot = toDotGraph(info);

    expect(dot).toMatchInlineSnapshot(`
      "digraph G {
        rankdir=TB;
        node [shape=box, style=rounded];
        "Logger" [label="Logger\\n(singleton)"];
        "Database" [label="Database\\n(scoped)"];
        "Cache" [label="Cache\\n(singleton)"];
        "UserService" [label="UserService\\n(transient)"];
        "Database" -> "Logger";
        "Cache" -> "Logger";
        "UserService" -> "Logger";
        "UserService" -> "Database";
        "UserService" -> "Cache";
      }"
    `);
  });

  it("generates correct DOT with title option", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const info = inspectGraph(graph);
    const dot = toDotGraph(info, { title: "My Application" });

    expect(dot).toMatchInlineSnapshot(`
      "digraph G {
        rankdir=TB;
        node [shape=box, style=rounded];
        labelloc="t";
        label="My Application";
        "Logger" [label="Logger\\n(singleton)"];
      }"
    `);
  });

  it("generates correct DOT with LR direction", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    const info = inspectGraph(graph);
    const dot = toDotGraph(info, { direction: "LR" });

    expect(dot).toContain("rankdir=LR;");
  });

  it("hides lifetimes when showLifetimes=false", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const info = inspectGraph(graph);
    const dot = toDotGraph(info, { showLifetimes: false });

    expect(dot).toMatchInlineSnapshot(`
      "digraph G {
        rankdir=TB;
        node [shape=box, style=rounded];
        "Logger" [label="Logger"];
      }"
    `);
  });

  it("highlights missing dependencies", () => {
    // Use buildFragment to allow incomplete graph
    const fragment = GraphBuilder.create().provide(DatabaseAdapter).buildFragment();

    const info = inspectGraph(fragment);
    const dot = toDotGraph(info, { highlightMissing: true });

    // Should have Logger marked as MISSING in red
    expect(dot).toContain('"Logger" [label="Logger\\n(MISSING)", color="red"');
    expect(dot).toContain('"Database" -> "Logger" [color="red", style="dashed"]');
  });

  it("shows orphan ports when enabled", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const info = inspectGraph(graph);
    const dot = toDotGraph(info, { showOrphans: true });

    // Logger is an orphan (no one depends on it)
    expect(dot).toContain('color="orange"');
    expect(dot).toContain('style="rounded,dashed"');
  });
});

// =============================================================================
// Mermaid Graph Format Tests
// =============================================================================

describe("toMermaidGraph()", () => {
  it("generates correct Mermaid for simple graph", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    const info = inspectGraph(graph);
    const mermaid = toMermaidGraph(info);

    expect(mermaid).toMatchInlineSnapshot(`
      "graph TB
        Logger["Logger<br/>(singleton)"]
        Database["Database<br/>(scoped)"]
        Database --> Logger"
    `);
  });

  it("generates correct Mermaid for diamond dependency", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter)
      .build();

    const info = inspectGraph(graph);
    const mermaid = toMermaidGraph(info);

    expect(mermaid).toMatchInlineSnapshot(`
      "graph TB
        Logger["Logger<br/>(singleton)"]
        Database["Database<br/>(scoped)"]
        Cache["Cache<br/>(singleton)"]
        UserService["UserService<br/>(transient)"]
        Database --> Logger
        Cache --> Logger
        UserService --> Logger
        UserService --> Database
        UserService --> Cache"
    `);
  });

  it("generates correct Mermaid with title", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const info = inspectGraph(graph);
    const mermaid = toMermaidGraph(info, { title: "My Application" });

    expect(mermaid).toMatchInlineSnapshot(`
      "---
      title: My Application
      ---
      graph TB
        Logger["Logger<br/>(singleton)"]"
    `);
  });

  it("generates correct Mermaid with LR direction", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    const info = inspectGraph(graph);
    const mermaid = toMermaidGraph(info, { direction: "LR" });

    expect(mermaid).toContain("graph LR");
  });

  it("hides lifetimes when showLifetimes=false", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const info = inspectGraph(graph);
    const mermaid = toMermaidGraph(info, { showLifetimes: false });

    expect(mermaid).toMatchInlineSnapshot(`
      "graph TB
        Logger["Logger"]"
    `);
  });

  it("highlights missing dependencies with dashed lines", () => {
    const fragment = GraphBuilder.create().provide(DatabaseAdapter).buildFragment();

    const info = inspectGraph(fragment);
    const mermaid = toMermaidGraph(info, { highlightMissing: true });

    // Should use dashed line for missing dependency
    expect(mermaid).toContain("Database -.-> Logger");
    expect(mermaid).toContain("(MISSING)");
  });

  it("shows orphan ports with dashed style when enabled", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const info = inspectGraph(graph);
    const mermaid = toMermaidGraph(info, { showOrphans: true });

    expect(mermaid).toContain("stroke-dasharray: 5 5");
    expect(mermaid).toContain("stroke:#f90");
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("visualization edge cases", () => {
  it("handles empty graph", () => {
    const builder = GraphBuilder.create();
    const info = builder.inspect();

    const dot = toDotGraph(info);
    const mermaid = toMermaidGraph(info);

    expect(dot).toMatchInlineSnapshot(`
      "digraph G {
        rankdir=TB;
        node [shape=box, style=rounded];
      }"
    `);

    expect(mermaid).toMatchInlineSnapshot(`"graph TB"`);
  });

  it("handles graph with no dependencies", () => {
    const IndependentPort = createPort<"Independent", object>("Independent");
    const IndependentAdapter = createAdapter({
      provides: IndependentPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({}),
    });

    const graph = GraphBuilder.create().provide(IndependentAdapter).build();
    const info = inspectGraph(graph);

    const dot = toDotGraph(info);
    expect(dot).not.toContain("->");

    const mermaid = toMermaidGraph(info);
    expect(mermaid).not.toContain("-->");
  });

  it("escapes special characters in port names", () => {
    // Port names should be alphanumeric, but test escaping just in case
    const SpecialPort = createPort<"Port<With>Special", object>("Port<With>Special");
    const SpecialAdapter = createAdapter({
      provides: SpecialPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({}),
    });

    const graph = GraphBuilder.create().provide(SpecialAdapter).build();
    const info = inspectGraph(graph);

    // Should not throw and should escape properly
    const dot = toDotGraph(info);
    const mermaid = toMermaidGraph(info);

    expect(dot).toBeDefined();
    expect(mermaid).toBeDefined();
    // Mermaid escapes < and >
    expect(mermaid).toContain("&lt;");
    expect(mermaid).toContain("&gt;");
  });
});
