/**
 * Tests for src/container/wrapper-utils.ts
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { parseInheritanceModes, parseChildGraph } from "../src/container/wrapper-utils.js";
import { createContainer } from "../src/container/factory.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

describe("parseInheritanceModes", () => {
  it("returns empty map when undefined", () => {
    const result = parseInheritanceModes(undefined);
    expect(result.size).toBe(0);
  });

  it("parses valid inheritance modes", () => {
    const modes = {
      Logger: "shared" as const,
      Database: "isolated" as const,
    };
    const result = parseInheritanceModes(modes);
    expect(result.get("Logger")).toBe("shared");
    expect(result.get("Database")).toBe("isolated");
    expect(result.size).toBe(2);
  });

  it("filters out invalid inheritance modes", () => {
    const modes = {
      Logger: "shared" as const,
      Database: "invalid-mode" as any,
    };
    const result = parseInheritanceModes(modes);
    expect(result.get("Logger")).toBe("shared");
    expect(result.has("Database")).toBe(false);
    expect(result.size).toBe(1);
  });

  it("parses all three valid modes", () => {
    const modes = {
      Logger: "shared" as const,
      Database: "forked" as const,
      Cache: "isolated" as const,
    };
    const result = parseInheritanceModes(modes);
    expect(result.get("Logger")).toBe("shared");
    expect(result.get("Database")).toBe("forked");
    expect(result.get("Cache")).toBe("isolated");
  });
});

describe("parseChildGraph", () => {
  it("separates overrides and extensions", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    // Build a graph with Logger as override and Database as extension
    const parentGraph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
    const childGraph = GraphBuilder.forParent(parentGraph)
      .override(loggerAdapter)
      .override(dbAdapter)
      .build();

    const { overrides, extensions } = parseChildGraph(childGraph);

    // Both should be overrides since override() marks them
    expect(overrides.size).toBe(2);
    expect(extensions.size).toBe(0);
  });

  it("correctly identifies extensions (non-override ports)", () => {
    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    // Build a normal graph (not override)
    const childGraph = GraphBuilder.create().provide(dbAdapter).build();

    const { overrides, extensions } = parseChildGraph(childGraph);

    // Should be an extension, not an override
    expect(extensions.size).toBe(1);
    expect(overrides.size).toBe(0);
  });
});

describe("attachBuiltinAPIs", () => {
  it("attaches inspector property to container-like object", () => {
    const container = createContainer({
      graph: GraphBuilder.create()
        .provide(
          createAdapter({
            provides: LoggerPort,
            requires: [],
            lifetime: "singleton",
            factory: () => ({ log: vi.fn() }),
          })
        )
        .build(),
      name: "Test",
    });

    // Container should already have inspector (attachBuiltinAPIs is called during creation)
    expect((container as any).inspector).toBeDefined();
  });
});
