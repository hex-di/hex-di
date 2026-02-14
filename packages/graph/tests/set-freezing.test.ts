/**
 * Tests for Set freezing throughout the graph builder.
 *
 * Verifies that all Set objects are frozen at creation to prevent
 * JavaScript-level mutation of override port names.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { GraphBuilder } from "../src/builder/builder.js";
import { addOverrideAdapter } from "../src/builder/builder-provide.js";
import { mergeGraphs } from "../src/builder/builder-merge.js";
import { port, createAdapter } from "@hex-di/core";

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ query: () => null }),
});

describe("Set freezing", () => {
  it("GraphBuilder.create() returns builder with frozen overridePortNames", () => {
    const builder = GraphBuilder.create();
    expect(Object.isFrozen(builder.overridePortNames)).toBe(true);
  });

  it("constructor freezes overridePortNames", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(Object.isFrozen(builder.overridePortNames)).toBe(true);
  });

  it("addOverrideAdapter returns frozen Set", () => {
    const state = {
      adapters: Object.freeze([]),
      overridePortNames: Object.freeze(new Set<string>()),
    };

    const result = addOverrideAdapter(state, LoggerAdapter);
    expect(Object.isFrozen(result.overridePortNames)).toBe(true);
    expect(result.overridePortNames.has("Logger")).toBe(true);
  });

  it("mergeGraphs returns frozen Set", () => {
    const first = {
      adapters: Object.freeze([LoggerAdapter]),
      overridePortNames: Object.freeze(new Set(["Logger"])),
    };
    const second = {
      adapters: Object.freeze([DatabaseAdapter]),
      overridePortNames: Object.freeze(new Set(["Database"])),
    };

    const result = mergeGraphs(first, second);
    expect(Object.isFrozen(result.overridePortNames)).toBe(true);
    expect(result.overridePortNames.has("Logger")).toBe(true);
    expect(result.overridePortNames.has("Database")).toBe(true);
  });

  it("built graph has frozen overridePortNames", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    expect(Object.isFrozen(graph.overridePortNames)).toBe(true);
  });
});
