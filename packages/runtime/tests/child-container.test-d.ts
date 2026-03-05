/**
 * Type-level tests for child container creation with Graph-based API.
 *
 * These tests verify compile-time validation for:
 * 1. createChild(graph) returns Container with combined types
 * 2. Child container can resolve parent ports
 * 3. Child container can resolve extended ports (via provide)
 * 4. Child container can resolve overridden ports (via override)
 * 5. Inheritance mode configuration accepts valid port names
 * 6. Resolution type constraints for parent and extended ports
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it, expect } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import type {
  Container,
  InheritanceMode,
  InferContainerProvides,
  InferContainerEffectiveProvides,
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

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const ConfigPort = port<Config>()({ name: "Config" });
const CachePort = port<Cache>()({ name: "Cache" });

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

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ query: () => null }),
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
// Child Container Creation Type Tests
// =============================================================================

describe("createChild() type validation", () => {
  it("createChild(graph) returns Container", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const childGraph = GraphBuilder.create().build();
    const childContainer = container.createChild(childGraph, { name: "Child" });
    expect(childContainer).toBeDefined();

    // Result should be a Container
    expectTypeOf(childContainer).toHaveProperty("resolve");
    expectTypeOf(childContainer).toHaveProperty("resolveAsync");
    expectTypeOf(childContainer).toHaveProperty("createScope");
    expectTypeOf(childContainer).toHaveProperty("createChild");
    expectTypeOf(childContainer).toHaveProperty("dispose");
  });

  it("child container can resolve parent ports", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const childGraph = GraphBuilder.create().build();
    const childContainer = container.createChild(childGraph, { name: "Child" });
    expect(childContainer).toBeDefined();

    // Child should be able to resolve LoggerPort (from parent)
    const logger = childContainer.resolve(LoggerPort);
    expectTypeOf(logger).toEqualTypeOf<Logger>();
  });

  it("child container can resolve extended ports from graph", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const childGraph = GraphBuilder.create().provide(ConfigAdapter).build();
    const childContainer = container.createChild(childGraph, { name: "Child" });

    // Child should be able to resolve both parent and extended ports
    const logger = childContainer.resolve(LoggerPort);
    const config = childContainer.resolve(ConfigPort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(config).toEqualTypeOf<Config>();
  });

  it("child container with override can resolve overridden port", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const childGraph = GraphBuilder.forParent(graph).override(AlternativeLoggerAdapter).build();
    const childContainer = container.createChild(childGraph, { name: "Child" });

    // Child should be able to resolve overridden port
    const logger = childContainer.resolve(LoggerPort);
    expectTypeOf(logger).toEqualTypeOf<Logger>();
  });

  it("multiple provides accumulate types correctly", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Extend with multiple new ports
    const childGraph = GraphBuilder.create().provide(ConfigAdapter).provide(CacheAdapter).build();
    const childContainer = container.createChild(childGraph, { name: "Child" });

    // Child container should be able to resolve all ports
    const logger = childContainer.resolve(LoggerPort);
    const config = childContainer.resolve(ConfigPort);
    const cache = childContainer.resolve(CachePort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(config).toEqualTypeOf<Config>();
    expectTypeOf(cache).toEqualTypeOf<Cache>();
  });
});

// =============================================================================
// ChildContainer Resolution Type Tests
// =============================================================================

describe("ChildContainer resolution types", () => {
  it("empty child container preserves parent types", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Empty child container
    const childGraph = GraphBuilder.create().build();
    const childContainer = container.createChild(childGraph, { name: "Child" });

    // Should still resolve parent ports
    const logger = childContainer.resolve(LoggerPort);
    const database = childContainer.resolve(DatabasePort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(database).toEqualTypeOf<Database>();
  });

  it("resolveAsync() accepts all ports", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const childGraph = GraphBuilder.create().provide(ConfigAdapter).build();
    const childContainer = container.createChild(childGraph, { name: "Child" });

    // resolveAsync should return Promise<ServiceType>
    const loggerPromise = childContainer.resolveAsync(LoggerPort);
    const configPromise = childContainer.resolveAsync(ConfigPort);

    expectTypeOf(loggerPromise).toEqualTypeOf<Promise<Logger>>();
    expectTypeOf(configPromise).toEqualTypeOf<Promise<Config>>();
  });

  it("createScope() returns scope with combined port types", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const childGraph = GraphBuilder.create().provide(ConfigAdapter).build();
    const childContainer = container.createChild(childGraph, { name: "Child" });
    const scope = childContainer.createScope();

    // Scope should be able to resolve both parent and extended ports
    const logger = scope.resolve(LoggerPort);
    const config = scope.resolve(ConfigPort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(config).toEqualTypeOf<Config>();
  });

  it("grandchild container can resolve ports from entire hierarchy", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Child extends with Config
    const childGraph = GraphBuilder.create().provide(ConfigAdapter).build();
    const childContainer = container.createChild(childGraph, { name: "Child" });

    // Grandchild extends with Cache
    const grandchildGraph = GraphBuilder.create().provide(CacheAdapter).build();
    const grandchildContainer = childContainer.createChild(grandchildGraph, { name: "Grandchild" });

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
// Inheritance Mode Type Tests
// =============================================================================

describe("Inheritance mode types", () => {
  it("inheritance modes accept valid port names", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Valid port name should compile
    const childGraph = GraphBuilder.create().build();
    const childContainer = container.createChild(childGraph, {
      name: "Child",
      inheritanceModes: { Logger: "shared" },
    });

    expect(childContainer).toBeDefined();
    expectTypeOf(childContainer).toHaveProperty("resolve");
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

  it("inheritance modes can be combined with graph overrides and provides", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Child graph with override and extension
    const childGraph = GraphBuilder.forParent(graph)
      .override(AlternativeLoggerAdapter)
      .provide(ConfigAdapter)
      .build();

    // Create child with inheritance modes
    const childContainer = container.createChild(childGraph, {
      name: "Child",
      inheritanceModes: { Database: "isolated" },
    });

    // All ports should be resolvable
    const logger = childContainer.resolve(LoggerPort);
    const database = childContainer.resolve(DatabasePort);
    const config = childContainer.resolve(ConfigPort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(database).toEqualTypeOf<Database>();
    expectTypeOf(config).toEqualTypeOf<Config>();
  });
});

// =============================================================================
// Child Container Properties Type Tests
// =============================================================================

describe("Child container property types", () => {
  it("parent property has correct type", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const childGraph = GraphBuilder.create().build();
    const childContainer = container.createChild(childGraph, { name: "Child" });

    // Parent should be accessible
    const parent = childContainer.parent;

    // Parent is a Container
    expectTypeOf(parent).toHaveProperty("resolve");
    expectTypeOf(parent).toHaveProperty("createScope");
    expectTypeOf(parent).toHaveProperty("createChild");
  });

  it("ChildContainer has correct structure", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const childGraph = GraphBuilder.create().provide(ConfigAdapter).build();
    const childContainer = container.createChild(childGraph, { name: "Child" });
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

  it("dispose() returns Promise of disposed container", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const childGraph = GraphBuilder.create().build();
    const childContainer = container.createChild(childGraph, { name: "Child" });

    const disposeResult = childContainer.dispose();
    // dispose() returns a Promise containing a disposed container (not void)
    expectTypeOf(disposeResult).toMatchTypeOf<Promise<{ isDisposed: boolean; name: string }>>();
  });

  it("isDisposed is readonly boolean", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const childGraph = GraphBuilder.create().build();
    const childContainer = container.createChild(childGraph, { name: "Child" });

    expectTypeOf(childContainer.isDisposed).toEqualTypeOf<boolean>();
  });
});

// =============================================================================
// Extended Ports Type Tests
// =============================================================================

describe("Extended ports type validation", () => {
  it("extended ports visible in child's types but not parent", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Extend child with ConfigPort
    const childGraph = GraphBuilder.create().provide(ConfigAdapter).build();
    const childContainer = container.createChild(childGraph, { name: "Child" });

    // Child CAN resolve ConfigPort
    const config = childContainer.resolve(ConfigPort);
    expectTypeOf(config).toEqualTypeOf<Config>();

    // Use brand-based inference for Container type parameters
    type ParentProvides = InferContainerProvides<typeof container>;
    type ChildEffectiveProvides = InferContainerEffectiveProvides<typeof childContainer>;

    // Parent only provides LoggerPort
    expectTypeOf<ParentProvides>().toEqualTypeOf<LoggerPortType>();

    // Child provides LoggerPort + ConfigPort (via TProvides | TExtends)
    type HasLogger = LoggerPortType extends ChildEffectiveProvides ? true : false;
    type HasConfig = ConfigPortType extends ChildEffectiveProvides ? true : false;
    expectTypeOf<HasLogger>().toEqualTypeOf<true>();
    expectTypeOf<HasConfig>().toEqualTypeOf<true>();
  });

  it("createChild on child container creates grandchild with combined ports", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Create child with extension
    const childGraph = GraphBuilder.create().provide(ConfigAdapter).build();
    const childContainer = container.createChild(childGraph, { name: "Child" });

    // Create grandchild
    const grandchildGraph = GraphBuilder.create().build();
    const grandchildContainer = childContainer.createChild(grandchildGraph, { name: "Grandchild" });
    expect(grandchildContainer).toBeDefined();

    // Grandchild sees combined ports (Logger + Config)
    const logger = grandchildContainer.resolve(LoggerPort);
    const config = grandchildContainer.resolve(ConfigPort);

    expectTypeOf(logger).toEqualTypeOf<Logger>();
    expectTypeOf(config).toEqualTypeOf<Config>();
  });
});
