/**
 * Type-level tests for GraphBuilder.forParent() and compile-time override validation.
 */

import { describe, it, expectTypeOf, assertType } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "../src/index.js";

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

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const CachePort = createPort<"Cache", Cache>("Cache");

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

const MockLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ get: () => {} }),
});

// =============================================================================
// forParent() Basic Tests
// =============================================================================

describe("GraphBuilder.forParent()", () => {
  it("creates a builder from parent graph", () => {
    const parentGraph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    const childBuilder = GraphBuilder.forParent(parentGraph);
    assertType<typeof childBuilder>(childBuilder);
  });

  it("tracks parent provides in TParentProvides type parameter", () => {
    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

    const childBuilder = GraphBuilder.forParent(parentGraph);

    // The child builder should have TParentProvides set to the parent's provides
    type ChildParentProvides = (typeof childBuilder)["__parentProvides"];
    expectTypeOf<ChildParentProvides>().toEqualTypeOf<typeof LoggerPort>();
  });
});

// =============================================================================
// override() with forParent() Validation
// =============================================================================

describe("override() with forParent() validation", () => {
  it("allows overriding a port that exists in parent (returns GraphBuilder)", () => {
    const parentGraph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    // Should compile and return a GraphBuilder - Logger exists in parent
    const childBuilder = GraphBuilder.forParent(parentGraph).override(MockLoggerAdapter);

    // Result should be a GraphBuilder, not a string error
    expectTypeOf<typeof childBuilder>().not.toBeString();
    assertType<typeof childBuilder>(childBuilder);
  });

  it("returns error string for invalid override (port not in parent)", () => {
    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Cache doesn't exist in parent - should return error string type
    const result = GraphBuilder.forParent(parentGraph).override(CacheAdapter);

    // The result should be a string (error message), not a GraphBuilder
    expectTypeOf<typeof result>().toBeString();
  });

  it("error message includes port name and available ports", () => {
    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

    const result = GraphBuilder.forParent(parentGraph).override(CacheAdapter);

    // The error message should mention 'Cache' and show available ports
    expectTypeOf<
      typeof result
    >().toEqualTypeOf<`ERROR[HEX008]: Cannot override 'Cache' - not in parent graph. Available for override: Logger. Fix: Use .provide() to add new ports.`>();
  });
});

// =============================================================================
// provide() still works normally on forParent builders
// =============================================================================

describe("provide() on forParent() builders", () => {
  it("allows providing new ports not in parent", () => {
    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Should compile - provide() adds new ports, not override
    const childBuilder = GraphBuilder.forParent(parentGraph).provide(CacheAdapter);

    // Result should be a GraphBuilder, not a string
    expectTypeOf<typeof childBuilder>().not.toBeString();
  });

  it("can mix override and provide", () => {
    const parentGraph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    // Should compile - override Logger (exists in parent), provide Cache (new)
    const childBuilder = GraphBuilder.forParent(parentGraph)
      .override(MockLoggerAdapter) // Override existing
      .provide(CacheAdapter); // Add new

    expectTypeOf<typeof childBuilder>().not.toBeString();
  });
});

// =============================================================================
// Comparison: forParent() vs create() for override
// =============================================================================

describe("forParent() vs create() override behavior", () => {
  it("returns error when override() called without forParent()", () => {
    // Without forParent - override() should return an error
    const result = GraphBuilder.create().override(CacheAdapter);

    // Should be a string error message (HEX009)
    expectTypeOf<typeof result>().toBeString();
    expectTypeOf<typeof result>().toMatchTypeOf<`ERROR[HEX009]: Cannot use override()${string}`>();
  });

  it("forParent() provides compile-time override validation", () => {
    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

    // With forParent - compile-time validation
    // Invalid override returns error string (HEX008 - port not in parent)
    const result = GraphBuilder.forParent(parentGraph).override(CacheAdapter);

    // Should be a string error message
    expectTypeOf<typeof result>().toBeString();
  });
});
