/**
 * Complete workflow integration tests.
 *
 * Tests end-to-end workflows: create ports, adapters, graph, build.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createAdapter, InferAdapterProvides } from "@hex-di/core";
import { GraphBuilder, Graph, InferGraphProvides } from "../../src/index.js";
import { LoggerPort, ConfigPort } from "./shared-fixtures.js";

describe("Integration: Complete workflow", () => {
  it("creates ports, adapters, builds graph, and verifies structure", () => {
    // Step 1: Create adapters
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: () => {},
        error: () => {},
      }),
    });

    const configAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: key => `value-${key}`,
        getNumber: () => 0,
      }),
    });

    // Step 2: Build graph
    const graph = GraphBuilder.create().provide(loggerAdapter).provide(configAdapter).build();

    // Step 3: Verify graph structure
    expect(graph.adapters.length).toBe(2);
    expect(graph.adapters).toContain(loggerAdapter);
    expect(graph.adapters).toContain(configAdapter);
    expect(Object.isFrozen(graph)).toBe(true);

    // Step 4: Verify types
    type GraphType = typeof graph;
    expectTypeOf<GraphType>().toMatchTypeOf<Graph<typeof LoggerPort | typeof ConfigPort>>();
  });

  it("verifies complete type flow from port to graph", () => {
    // Verify port types are correctly inferred through the entire flow
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {}, error: () => {} }),
    });
    expect(adapter).toBeDefined();

    type AdapterProvides = InferAdapterProvides<typeof adapter>;
    expectTypeOf<AdapterProvides>().toEqualTypeOf<typeof LoggerPort>();

    const builder = GraphBuilder.create().provide(adapter);
    expect(builder).toBeDefined();
    type BuilderProvides = InferGraphProvides<typeof builder>;
    expectTypeOf<BuilderProvides>().toEqualTypeOf<typeof LoggerPort>();

    const graph = builder.build();
    expect(graph).toBeDefined();
    // Use conditional type inference since __provides is optional (phantom type)
    type GraphProvides = typeof graph extends { __provides: infer P } ? P : never;
    expectTypeOf<GraphProvides>().toEqualTypeOf<typeof LoggerPort>();
  });
});
