/**
 * Type-level tests for merge intent detection utilities.
 *
 * These tests verify the opt-in utilities that detect when merging
 * two graphs accidentally satisfies dependencies.
 */

import { describe, it, expectTypeOf } from "vitest";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type {
  NewlySatisfiedDependencies,
  MergeSatisfiesDependencies,
} from "../src/validation/index.js";
import { LoggerPort, DatabasePort, UserServicePort } from "./fixtures.js";

// =============================================================================
// NewlySatisfiedDependencies Tests
// =============================================================================

describe("NewlySatisfiedDependencies", () => {
  it("returns never when no dependencies are satisfied", () => {
    // Graph A provides X, requires nothing
    // Graph B provides Y
    // No overlap, nothing satisfied
    type Result = NewlySatisfiedDependencies<
      typeof LoggerPort, // A provides
      never, // A requires
      typeof DatabasePort // B provides
    >;

    expectTypeOf<Result>().toBeNever();
  });

  it("returns never when required port is already provided by A", () => {
    // Graph A provides Logger, requires Logger (self-satisfying)
    // Graph B also provides Logger
    // But A already satisfies its own requirement
    type Result = NewlySatisfiedDependencies<
      typeof LoggerPort, // A provides
      typeof LoggerPort, // A requires (self-satisfied)
      typeof LoggerPort // B provides
    >;

    expectTypeOf<Result>().toBeNever();
  });

  it("returns the port when B satisfies A's unsatisfied dependency", () => {
    // Graph A provides UserService, requires Logger (not provided)
    // Graph B provides Logger
    // Logger becomes satisfied!
    type Result = NewlySatisfiedDependencies<
      typeof UserServicePort, // A provides
      typeof LoggerPort, // A requires (unsatisfied)
      typeof LoggerPort // B provides
    >;

    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort>();
  });

  it("returns multiple ports when B satisfies multiple unsatisfied dependencies", () => {
    // Graph A provides UserService, requires Logger AND Database
    // Graph B provides both Logger AND Database
    type Result = NewlySatisfiedDependencies<
      typeof UserServicePort, // A provides
      typeof LoggerPort | typeof DatabasePort, // A requires (unsatisfied)
      typeof LoggerPort | typeof DatabasePort // B provides
    >;

    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort | typeof DatabasePort>();
  });

  it("returns only the satisfied port when B provides subset", () => {
    // Graph A provides UserService, requires Logger AND Database
    // Graph B only provides Logger
    type Result = NewlySatisfiedDependencies<
      typeof UserServicePort, // A provides
      typeof LoggerPort | typeof DatabasePort, // A requires
      typeof LoggerPort // B only provides Logger
    >;

    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort>();
  });
});

// =============================================================================
// MergeSatisfiesDependencies Tests
// =============================================================================

describe("MergeSatisfiesDependencies", () => {
  it("returns never when no implicit coupling exists", () => {
    // Graph A: Logger (no deps)
    // Graph B: Database (no deps)
    // Clean merge!
    type Result = MergeSatisfiesDependencies<
      typeof LoggerPort, // A provides
      never, // A requires
      typeof DatabasePort, // B provides
      never // B requires
    >;

    expectTypeOf<Result>().toBeNever();
  });

  it("detects when A satisfies B's dependencies", () => {
    // Graph A: Logger (no deps)
    // Graph B: UserService (requires Logger)
    // A's Logger satisfies B's requirement!
    type Result = MergeSatisfiesDependencies<
      typeof LoggerPort, // A provides
      never, // A requires
      typeof UserServicePort, // B provides
      typeof LoggerPort // B requires (will be satisfied by A)
    >;

    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort>();
  });

  it("detects when B satisfies A's dependencies", () => {
    // Graph A: UserService (requires Logger)
    // Graph B: Logger (no deps)
    // B's Logger satisfies A's requirement!
    type Result = MergeSatisfiesDependencies<
      typeof UserServicePort, // A provides
      typeof LoggerPort, // A requires (will be satisfied by B)
      typeof LoggerPort, // B provides
      never // B requires
    >;

    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort>();
  });

  it("detects bidirectional coupling", () => {
    // Graph A: Logger (requires Database)
    // Graph B: Database (requires Logger)
    // Both satisfy each other!
    type Result = MergeSatisfiesDependencies<
      typeof LoggerPort, // A provides
      typeof DatabasePort, // A requires
      typeof DatabasePort, // B provides
      typeof LoggerPort // B requires
    >;

    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort | typeof DatabasePort>();
  });

  it("works with GraphBuilder phantom types", () => {
    // Create actual graphs
    const graphA = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

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

    // Check for implicit coupling using phantom types
    type Result = MergeSatisfiesDependencies<
      (typeof graphA)["__provides"],
      (typeof graphA)["__requires"],
      (typeof graphB)["__provides"],
      (typeof graphB)["__requires"]
    >;

    // A provides Logger, B requires Logger -> Logger becomes satisfied
    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort>();
  });

  it("returns never for fully independent graphs", () => {
    // Create independent graphs
    const graphA = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    const graphB = GraphBuilder.create().provide(
      createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ query: async () => ({}) }),
      })
    );

    type Result = MergeSatisfiesDependencies<
      (typeof graphA)["__provides"],
      (typeof graphA)["__requires"],
      (typeof graphB)["__provides"],
      (typeof graphB)["__requires"]
    >;

    // No coupling - clean merge
    expectTypeOf<Result>().toBeNever();
  });
});
