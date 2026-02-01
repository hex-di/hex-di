/**
 * Type tests for RuntimeResolver and its conversion functions.
 *
 * These tests verify that:
 * 1. toRuntimeResolver() accepts Container and Scope without casts
 * 2. toRuntimeContainer() preserves initialize() and createChild()
 * 3. assertResolverProvides() narrows RuntimeResolver to TypedResolver
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { createPort } from "@hex-di/core";
import type { Container, Scope } from "@hex-di/runtime";
import type {
  RuntimeResolver,
  RuntimeContainer,
  TypedResolver,
} from "../src/internal/runtime-resolver.js";
import {
  isRuntimeContainer,
  assertResolverProvides,
  toRuntimeResolver,
  toRuntimeContainer,
} from "../src/internal/runtime-resolver.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown[]>;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");

type TestPorts = typeof LoggerPort | typeof DatabasePort;

// =============================================================================
// toRuntimeResolver Accepts Container
// =============================================================================

describe("toRuntimeResolver accepts Container", () => {
  it("accepts uninitialized container", () => {
    // Use a function parameter to create the typed value for testing
    function test(container: Container<TestPorts, never, typeof DatabasePort, "uninitialized">) {
      // toRuntimeResolver should accept this container without cast
      const resolver = toRuntimeResolver(container);
      expectTypeOf(resolver).toEqualTypeOf<RuntimeResolver>();
    }
    // Suppress unused warning
    void test;
  });

  it("accepts initialized container", () => {
    function test(container: Container<TestPorts, never, typeof DatabasePort, "initialized">) {
      const resolver = toRuntimeResolver(container);
      expectTypeOf(resolver).toEqualTypeOf<RuntimeResolver>();
    }
    void test;
  });

  it("accepts container with single port", () => {
    function test(container: Container<typeof LoggerPort, never, never, "initialized">) {
      const resolver = toRuntimeResolver(container);
      expectTypeOf(resolver).toEqualTypeOf<RuntimeResolver>();
    }
    void test;
  });
});

// =============================================================================
// toRuntimeResolver Accepts Scope
// =============================================================================

describe("toRuntimeResolver accepts Scope", () => {
  it("accepts uninitialized scope", () => {
    function test(scope: Scope<TestPorts, typeof DatabasePort, "uninitialized">) {
      const resolver = toRuntimeResolver(scope);
      expectTypeOf(resolver).toEqualTypeOf<RuntimeResolver>();
    }
    void test;
  });

  it("accepts initialized scope", () => {
    function test(scope: Scope<TestPorts, typeof DatabasePort, "initialized">) {
      const resolver = toRuntimeResolver(scope);
      expectTypeOf(resolver).toEqualTypeOf<RuntimeResolver>();
    }
    void test;
  });
});

// =============================================================================
// toRuntimeResolver Accepts Child Container
// =============================================================================

describe("toRuntimeResolver accepts child container", () => {
  it("accepts child container (Container with TExtends)", () => {
    function test(
      child: Container<
        TestPorts,
        typeof LoggerPort, // extends
        typeof DatabasePort, // async
        "initialized"
      >
    ) {
      const resolver = toRuntimeResolver(child);
      expectTypeOf(resolver).toEqualTypeOf<RuntimeResolver>();
    }
    void test;
  });
});

// =============================================================================
// toRuntimeContainer Preserves Container Methods
// =============================================================================

describe("toRuntimeContainer preserves container methods", () => {
  it("returns RuntimeContainer with initialize", () => {
    function test(container: Container<TestPorts, never, typeof DatabasePort, "uninitialized">) {
      const runtimeContainer = toRuntimeContainer(container);
      expectTypeOf(runtimeContainer).toEqualTypeOf<RuntimeContainer>();

      // RuntimeContainer has initialize
      expectTypeOf(runtimeContainer.initialize).toEqualTypeOf<() => Promise<RuntimeResolver>>();
    }
    void test;
  });

  it("initialize returns RuntimeResolver", () => {
    function test(container: Container<TestPorts, never, typeof DatabasePort, "uninitialized">) {
      const runtimeContainer = toRuntimeContainer(container);

      // The return type is Promise<RuntimeResolver>
      const initialized = runtimeContainer.initialize();
      expectTypeOf(initialized).toEqualTypeOf<Promise<RuntimeResolver>>();
    }
    void test;
  });
});

// =============================================================================
// TypedResolver Narrowing
// =============================================================================

describe("assertResolverProvides narrows correctly", () => {
  it("narrows RuntimeResolver to TypedResolver", () => {
    function test(runtimeResolver: RuntimeResolver) {
      const typed = assertResolverProvides<TestPorts>(runtimeResolver);
      expectTypeOf(typed).toEqualTypeOf<TypedResolver<TestPorts>>();
    }
    void test;
  });

  it("TypedResolver.resolve returns correctly typed service", () => {
    function test(typed: TypedResolver<TestPorts>) {
      const logger = typed.resolve(LoggerPort);
      expectTypeOf(logger).toEqualTypeOf<Logger>();

      const db = typed.resolve(DatabasePort);
      expectTypeOf(db).toEqualTypeOf<Database>();
    }
    void test;
  });

  it("TypedResolver.resolveAsync returns Promise of correct type", () => {
    function test(typed: TypedResolver<TestPorts>) {
      const loggerPromise = typed.resolveAsync(LoggerPort);
      expectTypeOf(loggerPromise).toEqualTypeOf<Promise<Logger>>();
    }
    void test;
  });

  it("TypedResolver.createScope returns TypedResolver", () => {
    function test(typed: TypedResolver<TestPorts>) {
      const scope = typed.createScope();
      expectTypeOf(scope).toEqualTypeOf<TypedResolver<TestPorts>>();
    }
    void test;
  });
});

// =============================================================================
// Type Guard
// =============================================================================

describe("isRuntimeContainer type guard", () => {
  it("narrows RuntimeResolver to RuntimeContainer", () => {
    function test(resolver: RuntimeResolver) {
      if (isRuntimeContainer(resolver)) {
        expectTypeOf(resolver).toMatchTypeOf<RuntimeContainer>();
        expectTypeOf(resolver.initialize).toEqualTypeOf<() => Promise<RuntimeResolver>>();
      }
    }
    void test;
  });
});

// =============================================================================
// Complete Flow: Convert -> Store -> Narrow -> Use
// =============================================================================

describe("complete type-safe flow", () => {
  it("demonstrates the full pattern without casts", () => {
    function test(container: Container<TestPorts, never, typeof DatabasePort, "initialized">) {
      // 1. Convert to RuntimeResolver for storage (NO CAST)
      const resolver: RuntimeResolver = toRuntimeResolver(container);

      // 2. Store in React state (type is RuntimeResolver | null)
      type StateType = RuntimeResolver | null;
      const state: StateType = resolver;

      // Use separate assertions for union types
      expectTypeOf(resolver).toMatchTypeOf<RuntimeResolver>();

      // 3. Narrow back when consuming (EXPLICIT TRUST BOUNDARY)
      if (state !== null) {
        const typed = assertResolverProvides<TestPorts>(state);

        // 4. Use with full type safety
        const logger = typed.resolve(LoggerPort);
        expectTypeOf(logger).toEqualTypeOf<Logger>();
      }
    }
    void test;
  });

  it("demonstrates initialization flow", () => {
    function test(
      uninitialized: Container<TestPorts, never, typeof DatabasePort, "uninitialized">
    ) {
      // 1. Convert to RuntimeContainer (NO CAST)
      const runtimeContainer = toRuntimeContainer(uninitialized);
      expectTypeOf(runtimeContainer).toEqualTypeOf<RuntimeContainer>();

      // 2. Initialize returns RuntimeResolver (type-erased)
      const initialized = runtimeContainer.initialize();
      expectTypeOf(initialized).toEqualTypeOf<Promise<RuntimeResolver>>();

      // 3. Store the result - RuntimeResolver is assignable to StateType (RuntimeResolver | null)
      type StateType = RuntimeResolver | null;
      expectTypeOf<Awaited<typeof initialized>>().toMatchTypeOf<StateType>();
    }
    void test;
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("edge cases", () => {
  it("works with never as TAsyncPorts", () => {
    function test(container: Container<typeof LoggerPort, never, never, "initialized">) {
      const resolver = toRuntimeResolver(container);
      expectTypeOf(resolver).toEqualTypeOf<RuntimeResolver>();
    }
    void test;
  });

  it("RuntimeResolver methods have correct types", () => {
    function test(resolver: RuntimeResolver) {
      // resolve accepts any Port
      expectTypeOf(resolver.resolve).toEqualTypeOf<
        (port: import("@hex-di/core").Port<unknown, string>) => unknown
      >();

      // resolveAsync accepts any Port
      expectTypeOf(resolver.resolveAsync).toEqualTypeOf<
        (port: import("@hex-di/core").Port<unknown, string>) => Promise<unknown>
      >();

      // createScope accepts optional name and returns RuntimeResolver
      expectTypeOf(resolver.createScope).toEqualTypeOf<(name?: string) => RuntimeResolver>();

      // dispose returns Promise<void>
      expectTypeOf(resolver.dispose).toEqualTypeOf<() => Promise<void>>();

      // isDisposed is boolean
      expectTypeOf(resolver.isDisposed).toEqualTypeOf<boolean>();
    }
    void test;
  });
});
