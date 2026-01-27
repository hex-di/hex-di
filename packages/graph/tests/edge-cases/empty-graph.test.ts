/**
 * Empty graph edge case tests.
 *
 * Tests behavior at boundary conditions for empty graphs and merges.
 */

import { describe, expect, it } from "vitest";
import { GraphBuilder, createAdapter } from "../../src/index.js";
import { LoggerPort } from "../fixtures.js";

describe("empty graph edge cases", () => {
  it("can build empty graph", () => {
    const graph = GraphBuilder.create().build();

    expect(graph.adapters).toEqual([]);
    expect(graph.adapters.length).toBe(0);
    expect(Object.isFrozen(graph)).toBe(true);
  });

  it("can merge empty graphs", () => {
    const graph1 = GraphBuilder.create();
    const graph2 = GraphBuilder.create();

    const merged = graph1.merge(graph2);

    expect(merged.adapters).toEqual([]);
    expect(merged.adapters.length).toBe(0);
  });

  it("can merge empty with non-empty graph", () => {
    const empty = GraphBuilder.create();
    const withLogger = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    const merged1 = empty.merge(withLogger);
    const merged2 = withLogger.merge(empty);

    expect(merged1.adapters.length).toBe(1);
    expect(merged2.adapters.length).toBe(1);
  });

  it("buildFragment on empty builder returns empty graph", () => {
    const graph = GraphBuilder.create().buildFragment();

    expect(graph.adapters).toEqual([]);
    expect(Object.isFrozen(graph)).toBe(true);
  });

  it("provideMany with empty array returns equivalent builder", () => {
    const builder1 = GraphBuilder.create();
    const builder2 = builder1.provideMany([]);

    expect(builder1).not.toBe(builder2); // New instance
    expect(builder2.adapters).toEqual([]);
  });
});
