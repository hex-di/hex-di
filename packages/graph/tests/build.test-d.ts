/**
 * Type-level tests for GraphBuilder.build() method.
 *
 * These tests verify:
 * 1. build() callable when all deps satisfied
 * 2. build() blocked with type error when deps missing
 * 3. Error message shows missing port names
 * 4. Empty graph (no adapters) builds successfully
 * 5. build() returns Graph with correct type information
 * 6. Built graph is immutable (type-level readonly)
 * 7. Built graph contains all registered adapters
 * 8. Error appears at .build() call site
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import type { Port } from "@hex-di/ports";
import {
  GraphBuilder,
  createAdapter,
  Graph,
  InferGraphProvides,
  AdapterAny,
} from "../src/index.js";
import {
  LoggerPort,
  DatabasePort,
  UserServicePort,
  ConfigPortStrict as ConfigPort,
  CachePortSimple as CachePort,
  LoggerPortType,
  DatabasePortType,
  UserServicePortType,
  ConfigPortStrictType as ConfigPortType,
  CachePortSimpleType as CachePortType,
} from "./fixtures.js";

// =============================================================================
// Test Adapters
// =============================================================================

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
  factory: () => ({ query: () => Promise.resolve({}) }),
});

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ get: () => "" }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [ConfigPort],
  lifetime: "singleton",
  factory: () => ({ get: () => null, set: () => {} }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: () => ({ getUser: id => Promise.resolve({ id, name: "test" }) }),
});

// =============================================================================
// build() Callable When All Deps Satisfied Tests
// =============================================================================

describe("build() callable when all deps satisfied", () => {
  it("builds successfully when no dependencies required", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(builder).toBeDefined();
    const graph = builder.build();
    expect(graph).toBeDefined();

    // Should return Graph type, not error type
    type BuildResult = typeof graph;
    type IsGraph = BuildResult extends Graph<LoggerPortType> ? true : false;
    expectTypeOf<IsGraph>().toEqualTypeOf<true>();
  });

  it("builds successfully when all dependencies provided", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    const graph = builder.build();
    expect(graph).toBeDefined();

    // Should return Graph with all ports
    type BuildResult = typeof graph;
    type IsGraph =
      BuildResult extends Graph<LoggerPortType | DatabasePortType | UserServicePortType>
        ? true
        : false;
    expectTypeOf<IsGraph>().toEqualTypeOf<true>();
  });

  it("builds successfully with complex dependency chain", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Should not be an error type
    type IsError = BuildResult extends { __errorBrand: string } ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<false>();
  });

  it("order of provide() does not affect build success", () => {
    // Provide dependencies before the adapter that needs them
    const builderA = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(builderA).toBeDefined();

    // Provide adapter before its dependencies
    const builderB = GraphBuilder.create()
      .provide(UserServiceAdapter)
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter);
    expect(builderB).toBeDefined();

    type ResultA = ReturnType<typeof builderA.build>;
    type ResultB = ReturnType<typeof builderB.build>;

    // Both should succeed (not be error types)
    type IsErrorA = ResultA extends { __errorBrand: string } ? true : false;
    type IsErrorB = ResultB extends { __errorBrand: string } ? true : false;

    expectTypeOf<IsErrorA>().toEqualTypeOf<false>();
    expectTypeOf<IsErrorB>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// build() Blocked With Type Error When Deps Missing Tests
// =============================================================================

describe("build() returns error type when deps missing", () => {
  it("returns error string when single dependency missing", () => {
    const builder = GraphBuilder.create().provide(CacheAdapter);
    expect(builder).toBeDefined();

    // build() returns an error string when deps are missing
    type BuildResult = ReturnType<typeof builder.build>;

    // The return type should be an error template literal
    expectTypeOf<BuildResult>().toEqualTypeOf<"ERROR: Missing adapters for Config. Call .provide() first.">();
  });

  it("returns error string when multiple dependencies missing", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Should return single error string with all missing ports combined
    expectTypeOf<BuildResult>().toEqualTypeOf<"ERROR: Missing adapters for Database, Logger. Call .provide() first.">();
  });

  it("returns error string when some but not all deps provided", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter).provide(LoggerAdapter);
    expect(builder).toBeDefined();
    // Database is still missing

    type BuildResult = ReturnType<typeof builder.build>;

    // Should return error with just Database missing
    expectTypeOf<BuildResult>().toEqualTypeOf<"ERROR: Missing adapters for Database. Call .provide() first.">();
  });

  it("error message is a readable template literal", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Should be a template literal with "ERROR: Missing adapters for" prefix
    type HasPrefix = BuildResult extends `ERROR: Missing adapters for ${string}` ? true : false;
    expectTypeOf<HasPrefix>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Error Message Shows Missing Port Names Tests
// =============================================================================

describe("error return type shows missing port names", () => {
  it("error message includes single missing port name", () => {
    const builder = GraphBuilder.create().provide(CacheAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // The return type IS the error message (a template literal string)
    expectTypeOf<BuildResult>().toEqualTypeOf<"ERROR: Missing adapters for Config. Call .provide() first.">();
  });

  it("error message includes multiple missing port names", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Should return single error string with all missing ports combined
    expectTypeOf<BuildResult>().toEqualTypeOf<"ERROR: Missing adapters for Database, Logger. Call .provide() first.">();
  });

  it("error message has correct prefix format", () => {
    const builder = GraphBuilder.create().provide(CacheAdapter);
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Verify the message starts with the expected prefix
    type HasPrefix = BuildResult extends `ERROR: Missing adapters for ${string}` ? true : false;
    expectTypeOf<HasPrefix>().toEqualTypeOf<true>();
  });

  it("error message directly shows the missing port name", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter).provide(LoggerAdapter);
    expect(builder).toBeDefined();
    // Only Database is missing

    type BuildResult = ReturnType<typeof builder.build>;

    // The message should contain "Database" since that's the only missing port
    type ContainsDatabase = BuildResult extends `${string}Database${string}` ? true : false;
    expectTypeOf<ContainsDatabase>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Empty Graph Builds Successfully Tests
// =============================================================================

describe("empty graph (no adapters) builds successfully", () => {
  it("empty builder builds to Graph<never>", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();
    const graph = builder.build();
    expect(graph).toBeDefined();

    type BuildResult = typeof graph;

    // Should be Graph<never>
    type IsEmptyGraph = BuildResult extends Graph<never> ? true : false;
    expectTypeOf<IsEmptyGraph>().toEqualTypeOf<true>();
  });

  it("empty graph is not an error type", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();

    type BuildResult = ReturnType<typeof builder.build>;

    // Should not have error brand
    type IsError = BuildResult extends { __errorBrand: string } ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<false>();
  });

  it("empty graph has adapters property", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();
    const graph = builder.build();
    expect(graph).toBeDefined();

    type BuildResult = typeof graph;

    // Should have adapters property
    type HasAdapters = BuildResult extends { adapters: readonly unknown[] } ? true : false;
    expectTypeOf<HasAdapters>().toEqualTypeOf<true>();
  });

  it("empty graph has __provides tracking type", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();
    const graph = builder.build();
    expect(graph).toBeDefined();

    type BuildResult = typeof graph;

    // Should have __provides property (even if never) - phantom types are used for compile-time tracking
    type ProvidesType = BuildResult extends { __provides: infer P } ? P : unknown;
    expectTypeOf<ProvidesType>().toBeNever();
  });
});

// =============================================================================
// build() Returns Graph With Correct Type Information Tests
// =============================================================================

describe("build() returns Graph with correct type information", () => {
  it("Graph has TProvides matching provided ports", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    const graph = builder.build();
    expect(graph).toBeDefined();

    type BuildResult = typeof graph;
    type Provides = BuildResult extends Graph<infer P> ? P : never;

    expectTypeOf<Provides>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("Graph __provides property tracks provided ports union", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    const graph = builder.build();
    expect(graph).toBeDefined();

    // Use conditional type inference since __provides is optional (phantom type)
    type ProvidesType = typeof graph extends { __provides: infer P } ? P : never;

    expectTypeOf<ProvidesType>().toEqualTypeOf<
      LoggerPortType | DatabasePortType | UserServicePortType
    >();
  });

  it("Graph adapters array is readonly", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(builder).toBeDefined();
    const graph = builder.build();
    expect(graph).toBeDefined();

    type AdaptersType = (typeof graph)["adapters"];

    // Should be a readonly array
    type IsReadonly = AdaptersType extends readonly unknown[] ? true : false;
    expectTypeOf<IsReadonly>().toEqualTypeOf<true>();
  });

  it("Graph type is distinct from error type", () => {
    const validBuilder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(validBuilder).toBeDefined();

    const invalidBuilder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(invalidBuilder).toBeDefined();

    type ValidResult = ReturnType<typeof validBuilder.build>;

    // Valid result should have adapters (Graph has adapters)
    type HasAdapters = ValidResult extends { adapters: readonly unknown[] } ? true : false;
    expectTypeOf<HasAdapters>().toEqualTypeOf<true>();

    // Valid result should NOT be a string literal
    type ValidIsString = ValidResult extends string ? true : false;
    expectTypeOf<ValidIsString>().toEqualTypeOf<false>();

    // Invalid builder returns error string - check return type is a template literal
    type InvalidResult = ReturnType<typeof invalidBuilder.build>;
    type IsTemplateLiteral = InvalidResult extends `ERROR: Missing adapters for ${string}`
      ? true
      : false;
    expectTypeOf<IsTemplateLiteral>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Built Graph Is Immutable Tests
// =============================================================================

describe("built graph is immutable (type-level readonly)", () => {
  it("Graph adapters array type is readonly", () => {
    type GraphAdapters = Graph<LoggerPortType>["adapters"];

    // Verify it's a readonly array at type level
    type IsReadonly = GraphAdapters extends readonly AdapterAny[] ? true : false;
    expectTypeOf<IsReadonly>().toEqualTypeOf<true>();
  });

  it("Graph __provides is tracked correctly", () => {
    type TestGraph = Graph<LoggerPortType | DatabasePortType>;

    // Use conditional type inference to extract the phantom type parameter
    // Direct property access returns T | undefined since __provides is optional
    type Provides = TestGraph extends { __provides: infer P } ? P : never;
    expectTypeOf<Provides>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("Graph structure is readonly", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();
    expect(graph).toBeDefined();

    // Adapters should be readonly
    type AdaptersType = (typeof graph)["adapters"];
    type IsReadonlyArray = AdaptersType extends readonly unknown[] ? true : false;
    expectTypeOf<IsReadonlyArray>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Built Graph Contains All Registered Adapters Tests
// =============================================================================

describe("built graph contains all registered adapters", () => {
  it("graph adapters array has correct element type", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    expect(graph).toBeDefined();

    type AdaptersType = (typeof graph)["adapters"];
    type ElementType = AdaptersType[number];

    // Element type should be compatible with AdapterAny
    type IsAdapter = ElementType extends AdapterAny ? true : false;
    expectTypeOf<IsAdapter>().toEqualTypeOf<true>();
  });

  it("graph carries information about all provided ports", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter)
      .build();
    expect(graph).toBeDefined();

    // Use conditional type inference since __provides is optional (phantom type)
    type ProvidesType = typeof graph extends { __provides: infer P } ? P : never;

    // All 5 ports should be tracked
    expectTypeOf<ProvidesType>().toEqualTypeOf<
      LoggerPortType | DatabasePortType | ConfigPortType | CachePortType | UserServicePortType
    >();
  });
});

// =============================================================================
// Error Appears At .build() Call Site Tests
// =============================================================================

describe("error appears when using build() result", () => {
  it("build() return type shows error information when deps missing", () => {
    const incompleteBuilder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(incompleteBuilder).toBeDefined();

    // The error information is in the return type of build()
    type BuildResult = ReturnType<typeof incompleteBuilder.build>;

    // Error should be a template literal string with the missing port names
    type IsTemplateLiteral = BuildResult extends `ERROR: Missing adapters for ${string}`
      ? true
      : false;
    expectTypeOf<IsTemplateLiteral>().toEqualTypeOf<true>();

    // Single combined error message with all missing ports
    expectTypeOf<BuildResult>().toEqualTypeOf<"ERROR: Missing adapters for Database, Logger. Call .provide() first.">();
  });

  it("builder type before build() does not show error", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    // Builder itself should still be a valid GraphBuilder
    type BuilderType = typeof builder;

    // Should have provide and build methods
    expectTypeOf<BuilderType>().toHaveProperty("provide");
    expectTypeOf<BuilderType>().toHaveProperty("build");

    // Verify it matches GraphBuilder shape
    type Provides = InferGraphProvides<BuilderType>;
    expectTypeOf<Provides>().toEqualTypeOf<UserServicePortType>();
  });

  it("error is in return type, causing compile error when assigned to Graph", () => {
    // This tests that the error appears when you TRY to use the build() result
    // as a Graph without providing the required dependencies

    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    // The build method is still a function
    expectTypeOf(builder.build).toBeFunction();

    // Return type is error message, not Graph
    type BuildResult = ReturnType<typeof builder.build>;
    type IsErrorMessage = BuildResult extends `ERROR: Missing adapters for ${string}`
      ? true
      : false;
    expectTypeOf<IsErrorMessage>().toEqualTypeOf<true>();
  });
});
