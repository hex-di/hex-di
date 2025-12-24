/**
 * Type-level tests for lifetime consistency validation in merge operations.
 *
 * These tests verify that merging two graphs with the same port but different
 * lifetimes produces a clear compile-time error message.
 */

import { describe, it, expectTypeOf } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");

// =============================================================================
// Lifetime Consistency Tests
// =============================================================================

describe("Lifetime consistency in merge", () => {
  it("detects singleton vs scoped inconsistency", () => {
    // Graph A: Logger as singleton
    const graphA = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    // Graph B: Logger as scoped (CONFLICT!)
    const graphB = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: () => {} }),
      })
    );

    // Merge should produce lifetime inconsistency error
    const merged = graphA.merge(graphB);

    expectTypeOf(
      merged
    ).toEqualTypeOf<"ERROR: Lifetime inconsistency for 'Logger': Graph A provides Singleton, Graph B provides Scoped">();
  });

  it("detects singleton vs transient inconsistency", () => {
    // Graph A: Logger as singleton
    const graphA = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    // Graph B: Logger as transient (CONFLICT!)
    const graphB = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: () => {} }),
      })
    );

    const merged = graphA.merge(graphB);

    expectTypeOf(
      merged
    ).toEqualTypeOf<"ERROR: Lifetime inconsistency for 'Logger': Graph A provides Singleton, Graph B provides Transient">();
  });

  it("detects scoped vs transient inconsistency", () => {
    // Graph A: Logger as scoped
    const graphA = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: () => {} }),
      })
    );

    // Graph B: Logger as transient (CONFLICT!)
    const graphB = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: () => {} }),
      })
    );

    const merged = graphA.merge(graphB);

    expectTypeOf(
      merged
    ).toEqualTypeOf<"ERROR: Lifetime inconsistency for 'Logger': Graph A provides Scoped, Graph B provides Transient">();
  });

  it("shows duplicate error when lifetimes match (same port, same lifetime)", () => {
    // Graph A: Logger as singleton
    const graphA = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    // Graph B: Logger as singleton (same lifetime)
    const graphB = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    // Same port with same lifetime should show duplicate error, not lifetime error
    const merged = graphA.merge(graphB);

    expectTypeOf(merged).toEqualTypeOf<"ERROR: Duplicate adapter for Logger. Already provided.">();
  });

  it("succeeds when different ports are provided", () => {
    // Graph A: Logger as singleton
    const graphA = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    // Graph B: Database as scoped (different port, no conflict)
    const graphB = GraphBuilder.create().provide(
      createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ query: () => Promise.resolve({}) }),
      })
    );

    // Different ports should merge successfully
    const merged = graphA.merge(graphB);

    expectTypeOf(merged).toBeObject();
    expectTypeOf(merged).toHaveProperty("adapters");
  });

  it("detects inconsistency in reverse merge order", () => {
    // Graph A: Logger as scoped
    const graphA = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: () => {} }),
      })
    );

    // Graph B: Logger as singleton
    const graphB = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    // Reverse order: B.merge(A) should also detect inconsistency
    const merged = graphB.merge(graphA);

    expectTypeOf(
      merged
    ).toEqualTypeOf<"ERROR: Lifetime inconsistency for 'Logger': Graph A provides Singleton, Graph B provides Scoped">();
  });
});
