/**
 * Type-level tests for parentProvides merging in GraphBuilder.merge().
 *
 * ## Bug Report
 *
 * When merging two child builders created with `forParent()` from DIFFERENT
 * parent graphs, only the first child's parentProvides is preserved in the
 * merged result. This causes:
 *
 * 1. Ports from the second parent cannot be overridden (type error)
 * 2. Type-level behavior diverges from runtime (overridePortNames IS merged)
 * 3. Asymmetric behavior: A.merge(B) ≠ B.merge(A) for override capability
 *
 * ## Expected Behavior
 *
 * After merging two child builders, the resulting builder should allow
 * overriding ports from BOTH parents.
 */

import { describe, it, expectTypeOf } from "vitest";
import { port } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}
interface Database {
  query(): void;
}
interface Cache {
  get(key: string): void;
}
interface Metrics {
  record(): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });
const MetricsPort = port<Metrics>()({ name: "Metrics" });

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
  factory: () => ({ query: () => {} }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ get: () => {} }),
});

const MetricsAdapter = createAdapter({
  provides: MetricsPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ record: () => {} }),
});

// Override adapters
const MockLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const MockDatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ query: () => {} }),
});

// =============================================================================
// Bug Demonstration: parentProvides Not Merged
// =============================================================================

describe("parentProvides merge bug", () => {
  describe("merging child builders from different parents", () => {
    it("should allow override() for ports from BOTH parents after merge", () => {
      // Create two different parent graphs
      const parentA = GraphBuilder.create().provide(LoggerAdapter).provide(CacheAdapter).build();

      const parentB = GraphBuilder.create()
        .provide(DatabaseAdapter)
        .provide(MetricsAdapter)
        .build();

      // Create child builders from each parent
      const childA = GraphBuilder.forParent(parentA);
      const childB = GraphBuilder.forParent(parentB);

      // Merge the child builders
      const merged = childA.merge(childB);

      // BUG: After merge, can only override ports from parentA
      // This SHOULD work (Logger is in parentA)
      const withLoggerOverride = merged.override(MockLoggerAdapter);
      expectTypeOf<typeof withLoggerOverride>().not.toBeString();

      // BUG: This SHOULD also work (Database is in parentB) but currently FAILS
      // The type system thinks Database cannot be overridden because
      // parentProvides only contains parentA's ports
      const withDatabaseOverride = merged.override(MockDatabaseAdapter);

      // EXPECTED: GraphBuilder (success)
      // ACTUAL: Error string because Database not in parentProvides
      expectTypeOf<typeof withDatabaseOverride>().not.toBeString();
    });

    it("merge should be symmetric for override capability", () => {
      const parentA = GraphBuilder.create().provide(LoggerAdapter).build();
      const parentB = GraphBuilder.create().provide(DatabaseAdapter).build();

      const childA = GraphBuilder.forParent(parentA);
      const childB = GraphBuilder.forParent(parentB);

      // Merge in both orders
      const mergedAB = childA.merge(childB);
      const mergedBA = childB.merge(childA);

      // Both should allow overriding Logger
      const abLogger = mergedAB.override(MockLoggerAdapter);
      const baLogger = mergedBA.override(MockLoggerAdapter);
      expectTypeOf<typeof abLogger>().not.toBeString();
      expectTypeOf<typeof baLogger>().not.toBeString();

      // Both should allow overriding Database
      const abDatabase = mergedAB.override(MockDatabaseAdapter);
      const baDatabase = mergedBA.override(MockDatabaseAdapter);
      expectTypeOf<typeof abDatabase>().not.toBeString();
      expectTypeOf<typeof baDatabase>().not.toBeString();
    });
  });

  describe("merging child builder with regular builder", () => {
    it("should preserve override capability from child builder", () => {
      const parent = GraphBuilder.create().provide(LoggerAdapter).build();

      const child = GraphBuilder.forParent(parent);
      const regular = GraphBuilder.create().provide(DatabaseAdapter);

      // Merge child with regular
      const merged = child.merge(regular);

      // Should still be able to override Logger (from parent)
      const withOverride = merged.override(MockLoggerAdapter);
      expectTypeOf<typeof withOverride>().not.toBeString();
    });

    it("should preserve override capability regardless of merge order", () => {
      const parent = GraphBuilder.create().provide(LoggerAdapter).build();

      const child = GraphBuilder.forParent(parent);
      const regular = GraphBuilder.create().provide(DatabaseAdapter);

      // Merge in opposite order (regular first)
      const merged = regular.merge(child);

      // Should still be able to override Logger (from parent)
      // BUG: Currently fails because regular's parentProvides (unknown) takes precedence
      const withOverride = merged.override(MockLoggerAdapter);
      expectTypeOf<typeof withOverride>().not.toBeString();
    });
  });
});

// =============================================================================
// Type extraction tests for verification
// =============================================================================

describe("parentProvides type extraction", () => {
  it("child builder should have parent ports in parentProvides", () => {
    const parent = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    const child = GraphBuilder.forParent(parent);

    type ChildParentProvides = (typeof child)["__parentProvides"];

    // The parentProvides should be a union that includes both ports
    // We verify by checking if each port is assignable TO the union (not from)
    type LoggerInParent = typeof LoggerPort extends ChildParentProvides ? true : false;
    type DatabaseInParent = typeof DatabasePort extends ChildParentProvides ? true : false;

    expectTypeOf<LoggerInParent>().toEqualTypeOf<true>();
    expectTypeOf<DatabaseInParent>().toEqualTypeOf<true>();
  });

  it("merged builder should have combined parentProvides", () => {
    const parentA = GraphBuilder.create().provide(LoggerAdapter).build();
    const parentB = GraphBuilder.create().provide(DatabaseAdapter).build();

    const childA = GraphBuilder.forParent(parentA);
    const childB = GraphBuilder.forParent(parentB);

    const merged = childA.merge(childB);

    type MergedParentProvides = (typeof merged)["__parentProvides"];

    // After fix: Should include ports from BOTH parents
    // Verify by checking if each port is assignable to the union
    type LoggerInMerged = typeof LoggerPort extends MergedParentProvides ? true : false;
    type DatabaseInMerged = typeof DatabasePort extends MergedParentProvides ? true : false;

    expectTypeOf<LoggerInMerged>().toEqualTypeOf<true>();
    expectTypeOf<DatabaseInMerged>().toEqualTypeOf<true>();
  });
});
