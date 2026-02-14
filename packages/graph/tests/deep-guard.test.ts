/**
 * Tests for deep isGraph() type guard validation.
 *
 * Verifies that the guard validates the full adapter structure,
 * preventing structurally similar but semantically invalid objects
 * from passing.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { isGraph } from "../src/graph/guards.js";
import { GraphBuilder } from "../src/builder/builder.js";
import { port, createAdapter } from "@hex-di/core";

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}
interface Cache {
  get(key: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });

describe("isGraph deep validation", () => {
  it("accepts valid Graph built via GraphBuilder", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    expect(isGraph(graph)).toBe(true);
  });

  it("accepts graph with empty adapters", () => {
    expect(isGraph({ adapters: [], overridePortNames: new Set() })).toBe(true);
  });

  it("accepts graph with multiple valid adapters", () => {
    const adapterA = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });
    const adapterB = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: () => ({ query: () => null }),
    });
    const adapterC = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ get: () => null }),
    });

    const graph = GraphBuilder.create()
      .provide(adapterA)
      .provide(adapterB)
      .provide(adapterC)
      .build();
    expect(isGraph(graph)).toBe(true);
  });

  it("rejects missing __portName on provides", () => {
    expect(
      isGraph({
        adapters: [{ provides: {}, requires: [], lifetime: "singleton" }],
        overridePortNames: new Set(),
      })
    ).toBe(false);
  });

  it("rejects non-string __portName", () => {
    expect(
      isGraph({
        adapters: [{ provides: { __portName: 42 }, requires: [], lifetime: "singleton" }],
        overridePortNames: new Set(),
      })
    ).toBe(false);
  });

  it("rejects empty __portName", () => {
    expect(
      isGraph({
        adapters: [{ provides: { __portName: "" }, requires: [], lifetime: "singleton" }],
        overridePortNames: new Set(),
      })
    ).toBe(false);
  });

  it("rejects non-array requires", () => {
    expect(
      isGraph({
        adapters: [
          {
            provides: { __portName: "Test" },
            requires: "not-an-array",
            lifetime: "singleton",
          },
        ],
        overridePortNames: new Set(),
      })
    ).toBe(false);
  });

  it("rejects requires element without __portName", () => {
    expect(
      isGraph({
        adapters: [
          {
            provides: { __portName: "Test" },
            requires: [{}],
            lifetime: "singleton",
          },
        ],
        overridePortNames: new Set(),
      })
    ).toBe(false);
  });

  it("rejects invalid lifetime", () => {
    expect(
      isGraph({
        adapters: [
          {
            provides: { __portName: "Test" },
            requires: [],
            lifetime: "permanent",
          },
        ],
        overridePortNames: new Set(),
      })
    ).toBe(false);
  });

  it("rejects missing lifetime", () => {
    expect(
      isGraph({
        adapters: [{ provides: { __portName: "Test" }, requires: [] }],
        overridePortNames: new Set(),
      })
    ).toBe(false);
  });

  it("rejects null value", () => {
    expect(isGraph(null)).toBe(false);
  });

  it("rejects non-object value", () => {
    expect(isGraph("string")).toBe(false);
    expect(isGraph(42)).toBe(false);
    expect(isGraph(undefined)).toBe(false);
  });

  it("rejects object without overridePortNames", () => {
    expect(
      isGraph({
        adapters: [
          {
            provides: { __portName: "Test" },
            requires: [],
            lifetime: "singleton",
          },
        ],
      })
    ).toBe(false);
  });

  it("rejects overridePortNames that is not a Set", () => {
    expect(
      isGraph({
        adapters: [],
        overridePortNames: [],
      })
    ).toBe(false);
  });
});
