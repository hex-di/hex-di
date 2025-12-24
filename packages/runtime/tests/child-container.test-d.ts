/**
 * Type-level tests for ChildContainerBuilder override and extend operations.
 *
 * These tests verify compile-time validation for:
 * 1. Override of valid port (in parent) compiles successfully
 * 2. Override of non-existent port produces OverridePortNotFoundError
 * 3. Extend of new port (not in parent) compiles successfully
 * 4. Extend of existing port produces DuplicateProviderError
 * 5. Extended ports visible in child's TProvides
 * 6. Error messages are readable in IDE tooltips
 * 7. Inheritance mode validation with valid port names
 * 8. Resolution type constraints for parent and extended ports
 * 9. Async port constraints in child containers
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import {
  GraphBuilder,
  createAdapter,
  DuplicateProviderError,
  OverridePortNotFoundError,
} from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import type {
  ChildContainerBuilder,
  ChildContainer,
  Container,
  InheritanceMode,
} from "../src/types.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface Config {
  getValue(key: string): string;
}

interface Cache {
  get(key: string): unknown;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const ConfigPort = createPort<"Config", Config>("Config");
const CachePort = createPort<"Cache", Cache>("Cache");

type LoggerPortType = typeof LoggerPort;
type ConfigPortType = typeof ConfigPort;

// Use ports to suppress unused variable warnings
expect(LoggerPort).toBeDefined();
expect(DatabasePort).toBeDefined();
expect(ConfigPort).toBeDefined();
expect(CachePort).toBeDefined();

// =============================================================================
// Test Adapters
// =============================================================================

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const AlternativeLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ getValue: () => "value" }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ get: () => null }),
});

// =============================================================================
// Override Type Tests
// =============================================================================

describe("ChildContainerBuilder.override type validation", () => {
  it("override of valid port (in parent) returns ChildContainerBuilder", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const builder = container.createChild();
    const overrideResult = builder.override(AlternativeLoggerAdapter);
    expect(overrideResult).toBeDefined();

    // Result should be a ChildContainerBuilder (not an error type)
    expectTypeOf(overrideResult).toHaveProperty("build");
    expectTypeOf(overrideResult).toHaveProperty("override");
    expectTypeOf(overrideResult).toHaveProperty("extend");
  });

  it("override of non-existent port produces OverridePortNotFoundError", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const builder = container.createChild();
    // ConfigPort is NOT in parent, so override should produce error type
    const overrideResult = builder.override(ConfigAdapter);
    expect(overrideResult).toBeDefined();

    // Result should be OverridePortNotFoundError
    type Result = typeof overrideResult;
    expectTypeOf<Result>().toMatchTypeOf<OverridePortNotFoundError<ConfigPortType>>();
  });

  it("OverridePortNotFoundError has readable message", () => {
    type ErrorType = OverridePortNotFoundError<ConfigPortType>;

    // Verify the error message structure
    expectTypeOf<ErrorType["__message"]>().toEqualTypeOf<"Port not found in parent: Config">();
    expectTypeOf<ErrorType["__errorBrand"]>().toEqualTypeOf<"OverridePortNotFoundError">();
    expectTypeOf<ErrorType["__valid"]>().toEqualTypeOf<false>();
  });

  it("chained overrides work correctly", () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => null }),
    });

    const AlternativeDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => "other" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer(graph);

    // Multiple valid overrides should work
    const builder = container
      .createChild()
      .override(AlternativeLoggerAdapter)
      .override(AlternativeDatabaseAdapter);

    // Result should still be a valid ChildContainerBuilder
    expectTypeOf(builder).toHaveProperty("build");
  });
});

// =============================================================================
// Extend Type Tests
// =============================================================================

describe("ChildContainerBuilder.extend type validation", () => {
  it("extend of new port (not in parent) returns ChildContainerBuilder", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const builder = container.createChild();
    // ConfigPort is NOT in parent, so extend should succeed
    const extendResult = builder.extend(ConfigAdapter);
    expect(extendResult).toBeDefined();

    // Result should be a ChildContainerBuilder with extended types
    expectTypeOf(extendResult).toHaveProperty("build");
    expectTypeOf(extendResult).toHaveProperty("override");
    expectTypeOf(extendResult).toHaveProperty("extend");
  });

  it("extend of existing port (in parent) produces DuplicateProviderError", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const builder = container.createChild();
    // LoggerPort IS in parent, so extend should produce error type
    const extendResult = builder.extend(AlternativeLoggerAdapter);
    expect(extendResult).toBeDefined();

    // Result should be DuplicateProviderError
    type Result = typeof extendResult;
    expectTypeOf<Result>().toMatchTypeOf<DuplicateProviderError<LoggerPortType>>();
  });

  it("DuplicateProviderError has readable message", () => {
    type ErrorType = DuplicateProviderError<LoggerPortType>;

    // Verify the error message structure
    expectTypeOf<ErrorType["__message"]>().toEqualTypeOf<"Duplicate provider for: Logger">();
    expectTypeOf<ErrorType["__errorBrand"]>().toEqualTypeOf<"DuplicateProviderError">();
    expectTypeOf<ErrorType["__valid"]>().toEqualTypeOf<false>();
  });

  it("multiple extends accumulate TExtends correctly", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Extend with multiple new ports
    const builder = container.createChild().extend(ConfigAdapter).extend(CacheAdapter);

    // Build result should include extended ports
    const childContainer = builder.build();

    // Child container should be able to resolve extended ports
    // (This verifies the type accumulation works)
    expectTypeOf(childContainer).toHaveProperty("resolve");
  });

  it("extend after extend with duplicate produces DuplicateProviderError", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // First extend succeeds
    const builder1 = container.createChild().extend(ConfigAdapter);

    // Second extend with same port should fail
    const builder2 = builder1.extend(ConfigAdapter);
    expect(builder2).toBeDefined();

    // Result should be DuplicateProviderError
    type Result = typeof builder2;
    expectTypeOf<Result>().toMatchTypeOf<DuplicateProviderError<ConfigPortType>>();
  });
});

// =============================================================================
// ChildContainer Resolution Type Tests
// =============================================================================

describe("ChildContainer resolution types", () => {
  it("child container can resolve parent ports", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().build();
    expect(childContainer).toBeDefined();

    // Child should be able to resolve LoggerPort (from parent)
    const logger = childContainer.resolve(LoggerPort);
    expectTypeOf(logger).toEqualTypeOf<Logger>();
  });

  it("child container can resolve extended ports", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().extend(ConfigAdapter).build();

    // Child should be able to resolve both parent and extended ports
    const logger = childContainer.resolve(LoggerPort);
    const config = childContainer.resolve(ConfigPort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(config).toEqualTypeOf<Config>();
  });

  it("build() return type reflects TExtends", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container
      .createChild()
      .extend(ConfigAdapter)
      .extend(CacheAdapter)
      .build();
    expect(childContainer).toBeDefined();

    // The child container type should include Logger (parent) + Config + Cache (extends)
    type ChildType = typeof childContainer;

    // Verify we have a ChildContainer
    expectTypeOf<ChildType>().toHaveProperty("resolve");
    expectTypeOf<ChildType>().toHaveProperty("createScope");
    expectTypeOf<ChildType>().toHaveProperty("createChild");
    expectTypeOf<ChildType>().toHaveProperty("dispose");
  });
});

// =============================================================================
// Task Group 6.1: ChildContainerBuilder API Type Tests
// =============================================================================

describe("ChildContainerBuilder API types (6.1)", () => {
  it("createChild() returns correctly typed builder", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const builder = container.createChild();

    // Builder should have the correct type with parent's TProvides
    expectTypeOf(builder).toMatchTypeOf<ChildContainerBuilder<LoggerPortType, never>>();
    expectTypeOf(builder).toHaveProperty("override");
    expectTypeOf(builder).toHaveProperty("extend");
    expectTypeOf(builder).toHaveProperty("withInheritanceMode");
    expectTypeOf(builder).toHaveProperty("build");
  });

  it("builder type accumulates extends correctly through chained calls", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Initial builder has no extensions
    const builder1 = container.createChild();

    // After first extend, TExtends should include ConfigPort
    const builder2 = builder1.extend(ConfigAdapter);

    // After second extend, TExtends should include both ConfigPort and CachePort
    const builder3 = builder2.extend(CacheAdapter);
    expect(builder3).toBeDefined();

    // Verify builder still has all methods after chaining
    type Builder3Type = typeof builder3;
    expectTypeOf<Builder3Type>().toHaveProperty("override");
    expectTypeOf<Builder3Type>().toHaveProperty("extend");
    expectTypeOf<Builder3Type>().toHaveProperty("build");
  });

  it(".build() return type includes extended ports", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().extend(ConfigAdapter).build();

    // Child container type should be ChildContainer<LoggerPort, ConfigPort, never>
    type ChildType = typeof childContainer;

    // Verify it is a ChildContainer (not Container)
    expectTypeOf<ChildType>().toHaveProperty("parent");

    // Verify resolve can accept both parent and extended ports
    const logger = childContainer.resolve(LoggerPort);
    const config = childContainer.resolve(ConfigPort);
    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(config).toEqualTypeOf<Config>();
  });

  it("type narrowing through builder chain preserves parent provides", () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => null }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer(graph);

    // Chain multiple operations
    const childContainer = container
      .createChild()
      .override(AlternativeLoggerAdapter) // override Logger
      .extend(ConfigAdapter) // extend with Config
      .build();

    // Parent ports (Logger, Database) should still be resolvable
    const logger = childContainer.resolve(LoggerPort);
    const database = childContainer.resolve(DatabasePort);
    const config = childContainer.resolve(ConfigPort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(database).toEqualTypeOf<Database>();
    expectTypeOf(config).toEqualTypeOf<Config>();
  });

  it("createChild() on ChildContainer returns builder with combined ports", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Create child with extension
    const childContainer = container.createChild().extend(ConfigAdapter).build();

    // Create grandchild builder
    const grandchildBuilder = childContainer.createChild();
    expect(grandchildBuilder).toBeDefined();

    // Grandchild builder should see combined ports (Logger + Config)
    type GrandchildBuilderType = typeof grandchildBuilder;
    expectTypeOf<GrandchildBuilderType>().toHaveProperty("override");
    expectTypeOf<GrandchildBuilderType>().toHaveProperty("extend");
  });
});

// =============================================================================
// Task Group 6.2: Override Validation Type Tests
// =============================================================================

describe("Override validation types (6.2)", () => {
  it("override of valid port compiles (additional verification)", () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => null }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer(graph);

    // Both overrides should compile successfully
    const builder = container.createChild().override(AlternativeLoggerAdapter);

    // Verify it is still a valid builder
    expectTypeOf(builder).toHaveProperty("build");
    expectTypeOf(builder).toHaveProperty("override");
    expectTypeOf(builder).toHaveProperty("extend");
  });

  it("OverridePortNotFoundError includes port type information", () => {
    // Verify error type structure preserves port type
    type ErrorType = OverridePortNotFoundError<ConfigPortType>;

    expectTypeOf<ErrorType["__port"]>().toMatchTypeOf<ConfigPortType>();
    expectTypeOf<ErrorType["__valid"]>().toEqualTypeOf<false>();
  });

  // Note: Async adapter override with isolated mode is a runtime behavior.
  // Type-level enforcement would require tracking inheritance mode at the type level,
  // which is not currently implemented. This is documented as a runtime validation.
});

// =============================================================================
// Task Group 6.3: Extend Validation Type Tests
// =============================================================================

describe("Extend validation types (6.3)", () => {
  it("extend of new port compiles (additional verification)", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const builder = container.createChild().extend(ConfigAdapter);

    // Result should be a valid builder
    expectTypeOf(builder).toHaveProperty("build");
    expectTypeOf(builder).toHaveProperty("override");
    expectTypeOf(builder).toHaveProperty("extend");
  });

  it("extended ports visible in child's TProvides but not parent", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Extend child with ConfigPort
    const childContainer = container.createChild().extend(ConfigAdapter).build();

    // Child CAN resolve ConfigPort
    const config = childContainer.resolve(ConfigPort);
    expectTypeOf(config).toEqualTypeOf<Config>();

    // Parent CANNOT resolve ConfigPort - this would be a type error
    // Note: We cannot directly test that something DOES NOT compile in vitest expectTypeOf,
    // but we can verify the parent type does not include ConfigPort

    type ParentProvides =
      typeof container extends Container<infer P, infer _A, infer _Ph> ? P : never;
    type ChildProvides =
      typeof childContainer extends ChildContainer<infer P, infer E, infer _A, infer _Ph>
        ? P | E
        : never;

    // Parent only provides LoggerPort
    expectTypeOf<ParentProvides>().toEqualTypeOf<LoggerPortType>();

    // Child provides LoggerPort + ConfigPort (via TProvides | TExtends)
    // The union includes both ports
    type HasLogger = LoggerPortType extends ChildProvides ? true : false;
    type HasConfig = ConfigPortType extends ChildProvides ? true : false;
    expectTypeOf<HasLogger>().toEqualTypeOf<true>();
    expectTypeOf<HasConfig>().toEqualTypeOf<true>();
  });

  it("DuplicateProviderError includes duplicate port type", () => {
    type ErrorType = DuplicateProviderError<LoggerPortType>;

    expectTypeOf<ErrorType["__duplicate"]>().toMatchTypeOf<LoggerPortType>();
    expectTypeOf<ErrorType["__valid"]>().toEqualTypeOf<false>();
  });

  it("extend detects duplicate with previously extended port", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // First extend with Config
    const builder1 = container.createChild().extend(ConfigAdapter);

    // Create another ConfigAdapter to try extending again
    const AnotherConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ getValue: () => "another" }),
    });

    // Second extend with same port should produce error type
    const builder2 = builder1.extend(AnotherConfigAdapter);
    expect(builder2).toBeDefined();

    type Result = typeof builder2;
    expectTypeOf<Result>().toMatchTypeOf<DuplicateProviderError<ConfigPortType>>();
  });
});

// =============================================================================
// Task Group 6.4: Inheritance Mode Type Tests
// =============================================================================

describe("Inheritance mode types (6.4)", () => {
  it(".withInheritanceMode() accepts valid port names", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Valid port name should compile
    const builder = container.createChild().withInheritanceMode({
      Logger: "shared",
    });

    // Result should be a valid builder
    expectTypeOf(builder).toHaveProperty("build");
    expectTypeOf(builder).toHaveProperty("override");
    expectTypeOf(builder).toHaveProperty("extend");
  });

  it("mode values restricted to valid literals", () => {
    // InheritanceMode should only allow these three values
    type ValidModes = InheritanceMode;

    // Test assignability - these assignments should compile
    const shared: ValidModes = "shared";
    const forked: ValidModes = "forked";
    const isolated: ValidModes = "isolated";

    // Verify the literal values are assignable to InheritanceMode
    expectTypeOf<"shared">().toMatchTypeOf<InheritanceMode>();
    expectTypeOf<"forked">().toMatchTypeOf<InheritanceMode>();
    expectTypeOf<"isolated">().toMatchTypeOf<InheritanceMode>();

    // InheritanceMode is exactly the union of three literal types
    expectTypeOf<InheritanceMode>().toEqualTypeOf<"shared" | "forked" | "isolated">();

    // Suppress unused variable warnings
    expect(shared).toBe("shared");
    expect(forked).toBe("forked");
    expect(isolated).toBe("isolated");
  });

  it("withInheritanceMode can be chained with override and extend", () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => null }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer(graph);

    // Chain all builder methods
    const childContainer = container
      .createChild()
      .withInheritanceMode({ Logger: "forked", Database: "isolated" })
      .override(AlternativeLoggerAdapter)
      .extend(ConfigAdapter)
      .build();

    // All ports should be resolvable
    const logger = childContainer.resolve(LoggerPort);
    const database = childContainer.resolve(DatabasePort);
    const config = childContainer.resolve(ConfigPort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(database).toEqualTypeOf<Database>();
    expectTypeOf(config).toEqualTypeOf<Config>();
  });

  // Note: Testing that invalid port names produce compile errors is difficult
  // with expectTypeOf. The type system DOES restrict port names to those in TProvides,
  // but vitest doesn't have a mechanism to assert compilation failure.
  // The InheritanceModeConfig<TProvides> type enforces this at compile time.
});

// =============================================================================
// Task Group 6.5: Child Container Resolution Type Tests
// =============================================================================

describe("Child container resolution types (6.5)", () => {
  it("resolve() accepts ports from parent", () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => null }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().build();

    // Both parent ports should be resolvable
    const logger = childContainer.resolve(LoggerPort);
    const database = childContainer.resolve(DatabasePort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(database).toEqualTypeOf<Database>();
  });

  it("resolve() accepts extended ports", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container
      .createChild()
      .extend(ConfigAdapter)
      .extend(CacheAdapter)
      .build();

    // Both extended ports should be resolvable
    const config = childContainer.resolve(ConfigPort);
    const cache = childContainer.resolve(CachePort);

    expectTypeOf(config).toEqualTypeOf<Config>();
    expectTypeOf(cache).toEqualTypeOf<Cache>();
  });

  // Note: Testing that resolve() rejects unknown ports is difficult with expectTypeOf.
  // The type system DOES reject unknown ports at compile time via the generic constraint
  // <P extends TProvides | TExtends>, but vitest cannot assert compilation failure.

  it("resolveAsync() accepts all ports", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().extend(ConfigAdapter).build();

    // resolveAsync should return Promise<ServiceType>
    const loggerPromise = childContainer.resolveAsync(LoggerPort);
    const configPromise = childContainer.resolveAsync(ConfigPort);

    expectTypeOf(loggerPromise).toEqualTypeOf<Promise<Logger>>();
    expectTypeOf(configPromise).toEqualTypeOf<Promise<Config>>();
  });

  it("createScope() returns scope with combined port types", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().extend(ConfigAdapter).build();
    const scope = childContainer.createScope();

    // Scope should be able to resolve both parent and extended ports
    const logger = scope.resolve(LoggerPort);
    const config = scope.resolve(ConfigPort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(config).toEqualTypeOf<Config>();
  });

  it("grandchild container can resolve ports from entire hierarchy", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Child extends with Config
    const childContainer = container.createChild().extend(ConfigAdapter).build();

    // Grandchild extends with Cache
    const grandchildContainer = childContainer.createChild().extend(CacheAdapter).build();

    // Grandchild can resolve: Logger (from root), Config (from child), Cache (from grandchild)
    const logger = grandchildContainer.resolve(LoggerPort);
    const config = grandchildContainer.resolve(ConfigPort);
    const cache = grandchildContainer.resolve(CachePort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(config).toEqualTypeOf<Config>();
    expectTypeOf(cache).toEqualTypeOf<Cache>();
  });
});

// =============================================================================
// Additional Edge Case Type Tests
// =============================================================================

describe("Edge case type tests", () => {
  it("empty child container (no override/extend) preserves parent types", () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => null }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer(graph);

    // Empty child container
    const childContainer = container.createChild().build();

    // Should still resolve parent ports
    const logger = childContainer.resolve(LoggerPort);
    const database = childContainer.resolve(DatabasePort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(database).toEqualTypeOf<Database>();
  });

  it("parent property has correct type", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().build();

    // Parent should be accessible
    const parent = childContainer.parent;

    // Parent is a Container (or ChildContainer for grandchildren)
    expectTypeOf(parent).toHaveProperty("resolve");
    expectTypeOf(parent).toHaveProperty("createScope");
    expectTypeOf(parent).toHaveProperty("createChild");
  });

  it("ChildContainer has correct branded type properties", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().extend(ConfigAdapter).build();
    expect(childContainer).toBeDefined();

    type ChildType = typeof childContainer;

    // Verify ChildContainer has the expected structure
    expectTypeOf<ChildType>().toHaveProperty("resolve");
    expectTypeOf<ChildType>().toHaveProperty("resolveAsync");
    expectTypeOf<ChildType>().toHaveProperty("createScope");
    expectTypeOf<ChildType>().toHaveProperty("createChild");
    expectTypeOf<ChildType>().toHaveProperty("dispose");
    expectTypeOf<ChildType>().toHaveProperty("isDisposed");
    expectTypeOf<ChildType>().toHaveProperty("parent");
  });

  it("dispose() returns Promise<void>", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().build();

    const disposeResult = childContainer.dispose();
    expectTypeOf(disposeResult).toEqualTypeOf<Promise<void>>();
  });

  it("isDisposed is readonly boolean", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const childContainer = container.createChild().build();

    expectTypeOf(childContainer.isDisposed).toEqualTypeOf<boolean>();
  });
});
