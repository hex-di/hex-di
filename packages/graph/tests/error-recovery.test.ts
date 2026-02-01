/**
 * Error Recovery Path Tests for @hex-di/graph
 *
 * Tests that verify users can recover from validation errors by:
 * - Fixing circular dependencies
 * - Fixing captive dependencies
 * - Fixing duplicate providers
 * - Fixing lifetime inconsistencies
 *
 * These tests ensure the GraphBuilder remains usable after errors and
 * that the immutable builder pattern enables easy recovery.
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(): void;
}
interface UserService {
  getUser(id: string): void;
}
interface Cache {
  get(key: string): void;
}
interface Config {
  getValue(): string;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const CachePort = createPort<"Cache", Cache>("Cache");
const ConfigPort = createPort<"Config", Config>("Config");

// =============================================================================
// Recovery from Circular Dependencies
// =============================================================================

describe("Recovery: Circular Dependencies", () => {
  it("can rebuild after removing a cycle-causing adapter", () => {
    // Step 1: Create adapters that would form a cycle: A -> B -> A
    const AdapterA = createAdapter({
      provides: LoggerPort,
      requires: [DatabasePort],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const AdapterB = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort], // This creates cycle: Logger -> Database -> Logger
      lifetime: "singleton",
      factory: () => ({ query: () => {} }),
    });

    // Step 2: First approach causes cycle error
    // (we don't test the error here - that's covered by other tests)
    void AdapterB; // Suppress unused variable warning

    // Step 3: Recovery - create a fixed adapter without the cycle
    const FixedAdapterB = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => {} }),
    });

    // Step 4: Build successfully with fixed adapter
    const graph = GraphBuilder.create().provide(FixedAdapterB).provide(AdapterA).buildFragment();

    expect(graph.adapters).toHaveLength(2);
  });

  it("can branch from builder before cycle and take different path", () => {
    // Step 1: Create a base builder with safe adapter
    const baseBuilder = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    // Step 2: User attempts to add cycle-causing adapter (hypothetically)
    // Instead, they create a different adapter that works

    const SafeDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort], // This is fine - Logger doesn't depend on Database
      lifetime: "singleton",
      factory: () => ({ query: () => {} }),
    });

    // Step 3: Branch from base and add safe adapter
    const workingGraph = baseBuilder.provide(SafeDatabaseAdapter).buildFragment();

    expect(workingGraph.adapters).toHaveLength(2);
    const inspection = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        })
      )
      .provide(SafeDatabaseAdapter)
      .inspect();
    expect(inspection.isComplete).toBe(true);
  });

  it("immutable builder allows trying multiple approaches", () => {
    // Create base config
    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ getValue: () => "value" }),
    });

    const baseBuilder = GraphBuilder.create().provide(ConfigAdapter);

    // Approach 1: Logger depends on Database (will need Database)
    const loggerWithDb = createAdapter({
      provides: LoggerPort,
      requires: [DatabasePort],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // Approach 2: Logger is standalone (simpler)
    const standaloneLogger = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // User can try both approaches from same base
    const approach1 = baseBuilder.provide(loggerWithDb);
    const approach2 = baseBuilder.provide(standaloneLogger);

    // Approach 2 is complete without Database
    expect(approach2.inspect().isComplete).toBe(true);

    // Approach 1 still needs Database
    expect(approach1.inspect().isComplete).toBe(false);
    expect(approach1.inspect().unsatisfiedRequirements).toContain("Database");
  });
});

// =============================================================================
// Recovery from Captive Dependencies
// =============================================================================

describe("Recovery: Captive Dependencies", () => {
  it("can fix captive dependency by changing consumer lifetime", () => {
    // Step 1: Scoped service that shouldn't be captured by singleton
    const ScopedCacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ get: () => {} }),
    });

    // Step 2: Create fixed singleton that doesn't depend on scoped
    const FixedUserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ getUser: () => {} }),
    });

    // Step 3: Build successfully
    const graph = GraphBuilder.create()
      .provide(ScopedCacheAdapter)
      .provide(FixedUserServiceAdapter)
      .buildFragment();

    expect(graph.adapters).toHaveLength(2);
  });

  it("can fix captive dependency by changing provider lifetime", () => {
    // Step 1: Instead of scoped, make cache singleton
    const SingletonCacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton", // Changed from scoped
      factory: () => ({ get: () => {} }),
    });

    // Step 2: Now singleton can safely depend on singleton
    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [CachePort],
      lifetime: "singleton",
      factory: () => ({ getUser: () => {} }),
    });

    // Step 3: Build successfully
    const graph = GraphBuilder.create()
      .provide(SingletonCacheAdapter)
      .provide(UserServiceAdapter)
      .buildFragment();

    expect(graph.adapters).toHaveLength(2);
    expect(graph.adapters.some(a => a.provides.__portName === "Cache")).toBe(true);
    expect(graph.adapters.some(a => a.provides.__portName === "UserService")).toBe(true);
  });

  it("can make consumer transient to avoid captive dependency", () => {
    // Transient can safely depend on anything
    const ScopedDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ query: () => {} }),
    });

    const TransientLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [DatabasePort],
      lifetime: "transient", // Transient can depend on scoped
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create()
      .provide(ScopedDatabaseAdapter)
      .provide(TransientLoggerAdapter)
      .buildFragment();

    expect(graph.adapters).toHaveLength(2);
  });

  it("scoped can depend on scoped without captive issue", () => {
    const ScopedCacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ get: () => {} }),
    });

    const ScopedUserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [CachePort],
      lifetime: "scoped", // Scoped can depend on scoped
      factory: () => ({ getUser: () => {} }),
    });

    const graph = GraphBuilder.create()
      .provide(ScopedCacheAdapter)
      .provide(ScopedUserServiceAdapter)
      .buildFragment();

    expect(graph.adapters).toHaveLength(2);
  });
});

// =============================================================================
// Recovery from Duplicate Providers
// =============================================================================

describe("Recovery: Duplicate Providers", () => {
  it("can use different port name to avoid duplicate", () => {
    const LoggerAdapter1 = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // Instead of providing same port twice, create alternative port
    const AltLoggerPort = createPort<"AltLogger", Logger>("AltLogger");
    const LoggerAdapter2 = createAdapter({
      provides: AltLoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // Both can coexist
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter1)
      .provide(LoggerAdapter2)
      .buildFragment();

    expect(graph.adapters).toHaveLength(2);
  });

  it("can use override() for intentional replacement in child graphs", () => {
    // Parent graph
    const ProductionLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }), // Production logger
    });

    const parentGraph = GraphBuilder.create().provide(ProductionLoggerAdapter).build();

    // Child graph with test logger as override using forParent()
    const TestLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }), // No-op for tests
    });

    const childBuilder = GraphBuilder.forParent(parentGraph).override(TestLoggerAdapter);

    // Child builder builds a valid fragment with the override
    const childFragment = childBuilder.buildFragment();

    expect(childFragment.adapters).toHaveLength(1);
    expect(childFragment.overridePortNames.has("Logger")).toBe(true);
  });

  it("can branch and take only one adapter when duplicate detected", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const builder = GraphBuilder.create().provide(LoggerAdapter);

    // User realizes they already have Logger, so they just use existing builder
    // without adding duplicate
    const graph = builder.buildFragment();

    expect(graph.adapters).toHaveLength(1);
  });
});

// =============================================================================
// Recovery from Missing Dependencies
// =============================================================================

describe("Recovery: Missing Dependencies", () => {
  it("can add missing dependency after inspection reveals it", () => {
    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, LoggerPort],
      lifetime: "singleton",
      factory: () => ({ getUser: () => {} }),
    });

    // Step 1: Builder with missing dependencies
    const incompleteBuilder = GraphBuilder.create().provide(UserServiceAdapter);

    // Step 2: Inspect reveals missing dependencies
    const inspection = incompleteBuilder.inspect();
    expect(inspection.isComplete).toBe(false);
    expect(inspection.unsatisfiedRequirements).toContain("Database");
    expect(inspection.unsatisfiedRequirements).toContain("Logger");

    // Step 3: Add missing adapters
    const completeBuilder = incompleteBuilder
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ query: () => {} }),
        })
      )
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        })
      );

    // Step 4: Now complete
    expect(completeBuilder.inspect().isComplete).toBe(true);
    const graph = completeBuilder.buildFragment();
    expect(graph.adapters).toHaveLength(3);
  });

  it("buildFragment allows partial graphs for composition", () => {
    // Module A provides UserService but requires external Database
    const moduleA = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: UserServicePort,
          requires: [DatabasePort],
          lifetime: "singleton",
          factory: () => ({ getUser: () => {} }),
        })
      )
      .buildFragment(); // OK even with missing dependency

    // Module B provides Database
    const moduleB = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ query: () => {} }),
        })
      )
      .buildFragment();

    expect(moduleA.adapters).toHaveLength(1);
    expect(moduleB.adapters).toHaveLength(1);
  });
});

// =============================================================================
// Recovery from Lifetime Inconsistency (Merge)
// =============================================================================

describe("Recovery: Lifetime Inconsistency in Merge", () => {
  it("can fix inconsistency by aligning lifetimes before merge", () => {
    // Graph A with singleton Logger
    const builderA = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    // Graph B originally had scoped Logger (inconsistent)
    // Fixed by using same lifetime
    const builderBFixed = GraphBuilder.create().provide(
      createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: () => {} }),
      })
    );

    // Now merge works
    const merged = builderA.merge(builderBFixed);
    expect(merged.inspect().adapterCount).toBe(2);
  });

  it("can remove conflicting adapter before merge", () => {
    // Graph A with Logger
    const builderA = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    // Graph B without conflicting Logger - just Database
    const builderB = GraphBuilder.create().provide(
      createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ query: () => {} }),
      })
    );

    // No conflict since they provide different ports
    const merged = builderA.merge(builderB);
    expect(merged.inspect().adapterCount).toBe(2);
  });
});

// =============================================================================
// Complex Recovery Scenarios
// =============================================================================

describe("Recovery: Complex Scenarios", () => {
  it("can iteratively fix multiple issues revealed by inspection", () => {
    // Start with complex requirements
    const ComplexServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, LoggerPort, CachePort],
      lifetime: "singleton",
      factory: () => ({ getUser: () => {} }),
    });

    let builder: any = GraphBuilder.create().provide(ComplexServiceAdapter);

    // Iteration 1: Check and fix
    let inspection = builder.inspect();
    expect(inspection.unsatisfiedRequirements).toHaveLength(3);

    // Add Database
    builder = builder.provide(
      createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: () => {} }),
      })
    );

    // Iteration 2: Check progress
    inspection = builder.inspect();
    expect(inspection.unsatisfiedRequirements).toHaveLength(2);

    // Add Logger
    builder = builder.provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    // Iteration 3: Almost there
    inspection = builder.inspect();
    expect(inspection.unsatisfiedRequirements).toHaveLength(1);
    expect(inspection.unsatisfiedRequirements).toContain("Cache");

    // Add Cache
    builder = builder.provide(
      createAdapter({
        provides: CachePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ get: () => {} }),
      })
    );

    // Final check
    inspection = builder.inspect();
    expect(inspection.isComplete).toBe(true);
    expect(inspection.unsatisfiedRequirements).toHaveLength(0);
  });

  it("recovery preserves original builder for comparison", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [DatabasePort],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const original = GraphBuilder.create().provide(adapter);
    const originalSnapshot = original.inspect();

    // User experiments with fixes
    const fixed = original.provide(
      createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: () => {} }),
      })
    );

    // Original unchanged
    expect(original.inspect().adapterCount).toBe(originalSnapshot.adapterCount);
    expect(original.inspect().isComplete).toBe(false);

    // Fixed version is complete
    expect(fixed.inspect().isComplete).toBe(true);
    expect(fixed.inspect().adapterCount).toBe(2);
  });
});
