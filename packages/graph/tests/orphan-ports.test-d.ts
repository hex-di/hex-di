/**
 * Type-level tests for orphan port detection utility.
 *
 * These tests verify the opt-in utility that detects ports provided
 * but never required by any adapter.
 */

import { describe, it, expectTypeOf } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { OrphanPorts } from "../src/validation/index.js";
import { LoggerPort, DatabasePort, UserServicePort } from "./fixtures.js";

// Local Cache interface (different from fixtures.CacheService)
interface Cache {
  get(key: string): unknown;
}
const CachePort = createPort<Cache>({ name: "Cache" });

// =============================================================================
// OrphanPorts Tests
// =============================================================================

describe("OrphanPorts", () => {
  it("returns never when all provided ports are required", () => {
    // Everything provided is also required
    type Result = OrphanPorts<
      typeof LoggerPort, // provides
      typeof LoggerPort // requires
    >;

    expectTypeOf<Result>().toBeNever();
  });

  it("returns the orphan port when it is provided but not required", () => {
    // LoggerPort is provided but nothing requires it
    type Result = OrphanPorts<
      typeof LoggerPort, // provides Logger
      never // nothing requires anything
    >;

    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort>();
  });

  it("returns multiple orphan ports", () => {
    // Logger and Database are provided, but nothing requires them
    type Result = OrphanPorts<
      typeof LoggerPort | typeof DatabasePort, // provides
      never // nothing requires
    >;

    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort | typeof DatabasePort>();
  });

  it("returns only the ports that are not required", () => {
    // Provides Logger, Database, UserService
    // Only Logger is required
    type Result = OrphanPorts<
      typeof LoggerPort | typeof DatabasePort | typeof UserServicePort,
      typeof LoggerPort
    >;

    // Database and UserService are orphans
    expectTypeOf<Result>().toEqualTypeOf<typeof DatabasePort | typeof UserServicePort>();
  });

  it("returns never for empty graph", () => {
    type Result = OrphanPorts<never, never>;
    expectTypeOf<Result>().toBeNever();
  });

  it("works with GraphBuilder phantom types - all ports used", () => {
    // Build a graph where all ports are connected
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        })
      )
      .provide(
        createAdapter({
          provides: UserServicePort,
          requires: [LoggerPort], // UserService uses Logger
          lifetime: "singleton",
          factory: deps => ({
            getUser: async id => {
              deps.Logger.log(`Fetching ${id}`);
              return { id, name: "Test" };
            },
          }),
        })
      );

    type Result = OrphanPorts<(typeof graph)["__provides"], (typeof graph)["__requires"]>;

    // UserService is orphan (entry point), but Logger is required
    expectTypeOf<Result>().toEqualTypeOf<typeof UserServicePort>();
  });

  it("works with GraphBuilder phantom types - with orphans", () => {
    // Build a graph with an orphan Logger (nothing uses it)
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        })
      )
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [], // Database doesn't need Logger
          lifetime: "scoped",
          factory: () => ({ query: async () => ({}) }),
        })
      );

    type Result = OrphanPorts<(typeof graph)["__provides"], (typeof graph)["__requires"]>;

    // Both Logger and Database are orphans (nothing requires them)
    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort | typeof DatabasePort>();
  });

  it("detects orphans after merge", () => {
    // Graph A: Logger
    const graphA = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    // Graph B: Database
    const graphB = GraphBuilder.create().provide(
      createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ query: async () => ({}) }),
      })
    );

    // After merge, both are provided, neither is required
    type MergedProvides = (typeof graphA)["__provides"] | (typeof graphB)["__provides"];
    type MergedRequires = (typeof graphA)["__requires"] | (typeof graphB)["__requires"];

    type Result = OrphanPorts<MergedProvides, MergedRequires>;

    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort | typeof DatabasePort>();
  });

  it("detects reduced orphans after merge when one graph requires the other", () => {
    // Graph A: Logger (no deps)
    const graphA = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    // Graph B: UserService requires Logger
    const graphB = GraphBuilder.create().provide(
      createAdapter({
        provides: UserServicePort,
        requires: [LoggerPort],
        lifetime: "singleton",
        factory: deps => ({
          getUser: async id => {
            deps.Logger.log(`Fetching ${id}`);
            return { id, name: "Test" };
          },
        }),
      })
    );

    // After merge: Logger is required by UserService, so only UserService is orphan
    type MergedProvides = (typeof graphA)["__provides"] | (typeof graphB)["__provides"];
    type MergedRequires = (typeof graphA)["__requires"] | (typeof graphB)["__requires"];

    type Result = OrphanPorts<MergedProvides, MergedRequires>;

    // Only UserService is orphan now (it's the entry point)
    expectTypeOf<Result>().toEqualTypeOf<typeof UserServicePort>();
  });
});
