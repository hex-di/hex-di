/**
 * Mixed lifetime integration tests.
 *
 * Tests graphs with singleton, scoped, and transient adapters together.
 */

import { describe, expect, it } from "vitest";
import { createAdapter, GraphBuilder } from "../../src/index.js";
import { LoggerPort, ConfigPort, CachePort } from "./shared-fixtures.js";

describe("Integration: Graph with mixed lifetime adapters", () => {
  it("allows singleton, scoped, and request adapters in same graph", () => {
    const singletonAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "", getNumber: () => 0 }),
    });

    const scopedAdapter = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      lifetime: "scoped",
      factory: () => ({ log: () => {}, error: () => {} }),
    });

    const requestAdapter = createAdapter({
      provides: CachePort,
      requires: [LoggerPort],
      lifetime: "transient",
      factory: () => ({ get: () => undefined, set: () => {}, invalidate: () => {} }),
    });

    const graph = GraphBuilder.create()
      .provide(singletonAdapter)
      .provide(scopedAdapter)
      .provide(requestAdapter)
      .build();

    // Verify all adapters are included
    expect(graph.adapters.length).toBe(3);

    // Use safer access pattern for array elements
    const firstAdapter = graph.adapters[0];
    const secondAdapter = graph.adapters[1];
    const thirdAdapter = graph.adapters[2];

    expect(firstAdapter?.lifetime).toBe("singleton");
    expect(secondAdapter?.lifetime).toBe("scoped");
    expect(thirdAdapter?.lifetime).toBe("transient");
  });
});
