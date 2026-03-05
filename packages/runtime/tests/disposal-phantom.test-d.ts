/**
 * Type-level tests for disposal state phantom types.
 *
 * These tests verify compile-time validation of the DisposalPhase phantom type:
 * 1. Container<..., "active"> has resolve, resolveAsync, createScope, dispose methods
 * 2. Container<..., "disposed"> lacks resolution and scope creation methods
 * 3. dispose() returns Container<..., "disposed"> (type transitions)
 * 4. Scope<..., "active"> has resolve, resolveAsync, createScope, dispose methods
 * 5. Scope<..., "disposed"> lacks resolution and scope creation methods
 * 6. DisposalPhase is exactly "active" | "disposed"
 * 7. Default TDisposal is "active" (backward compatible)
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it, expect } from "vitest";
import { port, createAdapter, type DisposalPhase } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import type { Container, Scope } from "../src/types.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Config {
  getValue(key: string): string;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = port<Logger>()({ name: "Logger" });
const ConfigPort = port<Config>()({ name: "Config" });

type LoggerPortType = typeof LoggerPort;
type ConfigPortType = typeof ConfigPort;

// Suppress unused warnings
expect(LoggerPort).toBeDefined();
expect(ConfigPort).toBeDefined();

// =============================================================================
// Test Adapters
// =============================================================================

const LoggerAdapter = createAdapter({
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

// =============================================================================
// DisposalPhase Type Tests
// =============================================================================

describe("DisposalPhase type", () => {
  it("is exactly 'active' | 'disposed'", () => {
    expectTypeOf<DisposalPhase>().toEqualTypeOf<"active" | "disposed">();
  });

  it("accepts 'active' as valid value", () => {
    expectTypeOf<"active">().toMatchTypeOf<DisposalPhase>();
  });

  it("accepts 'disposed' as valid value", () => {
    expectTypeOf<"disposed">().toMatchTypeOf<DisposalPhase>();
  });
});

// =============================================================================
// Active Container Type Tests
// =============================================================================

describe("Container<..., 'active'> (default)", () => {
  it("createContainer returns active container by default", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Default TDisposal is "active", so all methods are available
    expectTypeOf(container).toHaveProperty("resolve");
    expectTypeOf(container).toHaveProperty("resolveAsync");
    expectTypeOf(container).toHaveProperty("createScope");
    expectTypeOf(container).toHaveProperty("dispose");
    expectTypeOf(container).toHaveProperty("createChild");
  });

  it("active container resolve returns correct service type", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const logger = container.resolve(LoggerPort);
    expectTypeOf(logger).toEqualTypeOf<Logger>();
  });

  it("active container resolveAsync returns Promise of correct service type", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const loggerPromise = container.resolveAsync(LoggerPort);
    expectTypeOf(loggerPromise).toEqualTypeOf<Promise<Logger>>();
  });

  it("active container createScope returns active scope", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope();
    expectTypeOf(scope).toHaveProperty("resolve");
    expectTypeOf(scope).toHaveProperty("dispose");
  });

  it("explicit Container<..., 'active'> equals default Container", () => {
    type ExplicitActive = Container<LoggerPortType, never, never, "uninitialized", "active">;
    type ImplicitActive = Container<LoggerPortType, never, never, "uninitialized">;

    // Both should be structurally equivalent
    expectTypeOf<ExplicitActive>().toEqualTypeOf<ImplicitActive>();
  });
});

// =============================================================================
// Disposed Container Type Tests
// =============================================================================

describe("Container<..., 'disposed'>", () => {
  it("disposed container lacks resolve method", () => {
    type DisposedContainer = Container<LoggerPortType, never, never, "uninitialized", "disposed">;

    // Disposed container should NOT have resolve
    expectTypeOf<DisposedContainer>().not.toHaveProperty("resolve");
  });

  it("disposed container lacks resolveAsync method", () => {
    type DisposedContainer = Container<LoggerPortType, never, never, "uninitialized", "disposed">;

    expectTypeOf<DisposedContainer>().not.toHaveProperty("resolveAsync");
  });

  it("disposed container lacks createScope method", () => {
    type DisposedContainer = Container<LoggerPortType, never, never, "uninitialized", "disposed">;

    expectTypeOf<DisposedContainer>().not.toHaveProperty("createScope");
  });

  it("disposed container lacks createChild method", () => {
    type DisposedContainer = Container<LoggerPortType, never, never, "uninitialized", "disposed">;

    expectTypeOf<DisposedContainer>().not.toHaveProperty("createChild");
  });

  it("disposed container lacks dispose method", () => {
    type DisposedContainer = Container<LoggerPortType, never, never, "uninitialized", "disposed">;

    // Disposed container should NOT have dispose (cannot dispose twice)
    expectTypeOf<DisposedContainer>().not.toHaveProperty("dispose");
  });

  it("disposed container retains metadata properties", () => {
    type DisposedContainer = Container<LoggerPortType, never, never, "uninitialized", "disposed">;

    // Metadata should still be available
    expectTypeOf<DisposedContainer>().toHaveProperty("isDisposed");
    expectTypeOf<DisposedContainer>().toHaveProperty("isInitialized");
    expectTypeOf<DisposedContainer>().toHaveProperty("has");
    expectTypeOf<DisposedContainer>().toHaveProperty("name");
    expectTypeOf<DisposedContainer>().toHaveProperty("kind");
    expectTypeOf<DisposedContainer>().toHaveProperty("inspector");
  });

  it("disposed container is not assignable to active container", () => {
    type Active = Container<LoggerPortType, never, never, "uninitialized", "active">;
    type Disposed = Container<LoggerPortType, never, never, "uninitialized", "disposed">;

    // Disposed should NOT be assignable to Active (missing methods)
    expectTypeOf<Disposed>().not.toMatchTypeOf<Active>();
  });

  it("active container is assignable to disposed container (structural subtyping)", () => {
    type Active = Container<LoggerPortType, never, never, "uninitialized", "active">;
    type Disposed = Container<LoggerPortType, never, never, "uninitialized", "disposed">;

    // Active has all the base properties plus more, so it is a subtype of Disposed (the base)
    expectTypeOf<Active>().toMatchTypeOf<Disposed>();
  });
});

// =============================================================================
// dispose() Return Type Tests
// =============================================================================

describe("dispose() type transition", () => {
  it("container dispose returns Promise<Container<..., 'disposed'>>", () => {
    type ActiveContainer = Container<LoggerPortType, never, never, "uninitialized", "active">;
    type DisposeReturn = ReturnType<ActiveContainer["dispose"]>;

    // dispose() should return a Container with TDisposal = "disposed"
    expectTypeOf<DisposeReturn>().toEqualTypeOf<
      Promise<Container<LoggerPortType, never, never, "uninitialized", "disposed">>
    >();
  });

  it("scope dispose returns Promise<Scope<..., 'disposed'>>", () => {
    type ActiveScope = Scope<LoggerPortType, never, "uninitialized", "active">;
    type DisposeReturn = ReturnType<ActiveScope["dispose"]>;

    expectTypeOf<DisposeReturn>().toEqualTypeOf<
      Promise<Scope<LoggerPortType, never, "uninitialized", "disposed">>
    >();
  });

  it("container dispose result lacks resolve", () => {
    type ActiveContainer = Container<LoggerPortType, never, never, "uninitialized", "active">;
    type DisposedResult = Awaited<ReturnType<ActiveContainer["dispose"]>>;

    // The disposed container should not have resolve
    expectTypeOf<DisposedResult>().not.toHaveProperty("resolve");
    expectTypeOf<DisposedResult>().not.toHaveProperty("resolveAsync");
    expectTypeOf<DisposedResult>().not.toHaveProperty("createScope");
  });

  it("multi-port container dispose preserves port types in disposed result", () => {
    type MultiPortContainer = Container<
      LoggerPortType | ConfigPortType,
      never,
      never,
      "uninitialized",
      "active"
    >;
    type DisposeReturn = ReturnType<MultiPortContainer["dispose"]>;

    expectTypeOf<DisposeReturn>().toEqualTypeOf<
      Promise<Container<LoggerPortType | ConfigPortType, never, never, "uninitialized", "disposed">>
    >();
  });
});

// =============================================================================
// Active Scope Type Tests
// =============================================================================

describe("Scope<..., 'active'> (default)", () => {
  it("active scope has resolve method", () => {
    type ActiveScope = Scope<LoggerPortType, never, "uninitialized", "active">;

    expectTypeOf<ActiveScope>().toHaveProperty("resolve");
    expectTypeOf<ActiveScope>().toHaveProperty("resolveAsync");
    expectTypeOf<ActiveScope>().toHaveProperty("createScope");
    expectTypeOf<ActiveScope>().toHaveProperty("dispose");
  });

  it("default Scope is active", () => {
    type DefaultScope = Scope<LoggerPortType>;
    type ExplicitActive = Scope<LoggerPortType, never, "uninitialized", "active">;

    expectTypeOf<DefaultScope>().toEqualTypeOf<ExplicitActive>();
  });
});

// =============================================================================
// Disposed Scope Type Tests
// =============================================================================

describe("Scope<..., 'disposed'>", () => {
  it("disposed scope lacks resolve method", () => {
    type DisposedScope = Scope<LoggerPortType, never, "uninitialized", "disposed">;

    expectTypeOf<DisposedScope>().not.toHaveProperty("resolve");
  });

  it("disposed scope lacks resolveAsync method", () => {
    type DisposedScope = Scope<LoggerPortType, never, "uninitialized", "disposed">;

    expectTypeOf<DisposedScope>().not.toHaveProperty("resolveAsync");
  });

  it("disposed scope lacks createScope method", () => {
    type DisposedScope = Scope<LoggerPortType, never, "uninitialized", "disposed">;

    expectTypeOf<DisposedScope>().not.toHaveProperty("createScope");
  });

  it("disposed scope lacks dispose method", () => {
    type DisposedScope = Scope<LoggerPortType, never, "uninitialized", "disposed">;

    expectTypeOf<DisposedScope>().not.toHaveProperty("dispose");
  });

  it("disposed scope retains metadata properties", () => {
    type DisposedScope = Scope<LoggerPortType, never, "uninitialized", "disposed">;

    expectTypeOf<DisposedScope>().toHaveProperty("isDisposed");
    expectTypeOf<DisposedScope>().toHaveProperty("has");
    expectTypeOf<DisposedScope>().toHaveProperty("subscribe");
    expectTypeOf<DisposedScope>().toHaveProperty("getDisposalState");
  });

  it("disposed scope is not assignable to active scope", () => {
    type Active = Scope<LoggerPortType, never, "uninitialized", "active">;
    type Disposed = Scope<LoggerPortType, never, "uninitialized", "disposed">;

    expectTypeOf<Disposed>().not.toMatchTypeOf<Active>();
  });

  it("active scope is assignable to disposed scope (structural subtyping)", () => {
    type Active = Scope<LoggerPortType, never, "uninitialized", "active">;
    type Disposed = Scope<LoggerPortType, never, "uninitialized", "disposed">;

    expectTypeOf<Active>().toMatchTypeOf<Disposed>();
  });
});

// =============================================================================
// Container/Scope Disposal Distinction Tests
// =============================================================================

describe("Container and Scope disposal state distinction", () => {
  it("active Container and active Scope are distinct", () => {
    type ActiveContainer = Container<LoggerPortType, never, never, "uninitialized", "active">;
    type ActiveScope = Scope<LoggerPortType, never, "uninitialized", "active">;

    expectTypeOf<ActiveContainer>().not.toEqualTypeOf<ActiveScope>();
  });

  it("disposed Container and disposed Scope are distinct", () => {
    type DisposedContainer = Container<LoggerPortType, never, never, "uninitialized", "disposed">;
    type DisposedScope = Scope<LoggerPortType, never, "uninitialized", "disposed">;

    expectTypeOf<DisposedContainer>().not.toEqualTypeOf<DisposedScope>();
  });

  it("active and disposed versions of same Container are different types", () => {
    type Active = Container<LoggerPortType, never, never, "uninitialized", "active">;
    type Disposed = Container<LoggerPortType, never, never, "uninitialized", "disposed">;

    expectTypeOf<Active>().not.toEqualTypeOf<Disposed>();
  });

  it("active and disposed versions of same Scope are different types", () => {
    type Active = Scope<LoggerPortType, never, "uninitialized", "active">;
    type Disposed = Scope<LoggerPortType, never, "uninitialized", "disposed">;

    expectTypeOf<Active>().not.toEqualTypeOf<Disposed>();
  });
});

// =============================================================================
// Integration: createContainer -> dispose flow
// =============================================================================

describe("createContainer disposal flow", () => {
  it("createContainer returns active, dispose returns disposed", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Container starts as active
    expectTypeOf(container).toHaveProperty("resolve");
    expectTypeOf(container).toHaveProperty("dispose");

    // dispose() return type is Promise<Container<..., "disposed">>
    const disposeResult = container.dispose();
    expectTypeOf(disposeResult).toMatchTypeOf<Promise<{ isDisposed: boolean; name: string }>>();

    // The awaited result should not have resolve
    type DisposedResult = Awaited<typeof disposeResult>;
    expectTypeOf<DisposedResult>().not.toHaveProperty("resolve");
    expectTypeOf<DisposedResult>().not.toHaveProperty("createScope");
  });

  it("child container dispose returns disposed child container", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(ConfigAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    // Child starts as active
    expectTypeOf(child).toHaveProperty("resolve");

    // Child dispose returns disposed container
    const disposeResult = child.dispose();
    type DisposedChild = Awaited<typeof disposeResult>;
    expectTypeOf<DisposedChild>().not.toHaveProperty("resolve");
    expectTypeOf<DisposedChild>().toHaveProperty("isDisposed");
  });

  it("scope created from active container starts as active", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope();

    // Scope starts as active
    expectTypeOf(scope).toHaveProperty("resolve");
    expectTypeOf(scope).toHaveProperty("dispose");

    // Scope dispose returns disposed scope
    const disposeResult = scope.dispose();
    type DisposedScope = Awaited<typeof disposeResult>;
    expectTypeOf<DisposedScope>().not.toHaveProperty("resolve");
    expectTypeOf<DisposedScope>().toHaveProperty("isDisposed");
  });
});
