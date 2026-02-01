/**
 * Error recovery integration tests.
 *
 * Tests that adding missing dependencies fixes build errors.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder, type Graph } from "../../src/index.js";
import { LoggerPort, DatabasePort, UserServicePort } from "./shared-fixtures.js";

describe("Integration: Error recovery", () => {
  it("adding missing dependency fixes build type error", () => {
    const userServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: () => ({
        getUser: () => Promise.resolve(null),
        createUser: () => Promise.resolve({ id: "1" }),
      }),
    });

    // Step 1: Incomplete graph - only Logger provided
    const incompleteBuilder = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {}, error: () => {} }),
        })
      )
      .provide(userServiceAdapter);
    expect(incompleteBuilder).toBeDefined();

    // Verify build returns error string when incomplete
    type IncompleteResult = ReturnType<typeof incompleteBuilder.build>;
    // Error should be a template literal with the missing port name
    expectTypeOf<IncompleteResult>().toEqualTypeOf<"ERROR[HEX008]: Missing adapters for Database. Call .provide() first.">();

    // Step 2: Add the missing Database adapter
    const completeBuilder = incompleteBuilder.provide(
      createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: () => Promise.resolve([]), execute: () => Promise.resolve() }),
      })
    );
    expect(completeBuilder).toBeDefined();

    // Verify it's now a valid graph - build takes no arguments
    type CompleteParams = Parameters<typeof completeBuilder.build>;
    type TakesNoArgs = CompleteParams extends [] ? true : false;
    expectTypeOf<TakesNoArgs>().toEqualTypeOf<true>();

    type CompleteResult = ReturnType<typeof completeBuilder.build>;
    type IsValidGraph = CompleteResult extends Graph<infer _P> ? true : false;
    expectTypeOf<IsValidGraph>().toEqualTypeOf<true>();

    // Build the graph
    const graph = completeBuilder.build();
    expect(graph.adapters.length).toBe(3);
  });
});
