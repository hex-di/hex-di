/**
 * Type-level tests for graph builder error channel enforcement.
 *
 * These tests verify that the GraphBuilder's `build()` and `tryBuild()` methods
 * correctly enforce error channel handling at compile time:
 * - Infallible adapters (TError = never) build successfully
 * - Fallible adapters (TError != never) produce compile-time error strings
 * - adapterOrDie() and adapterOrElse() clear error channels for graph acceptance
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { port, createAdapter, adapterOrDie, adapterOrElse } from "@hex-di/core";
import type { FactoryResult } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { Graph } from "../src/index.js";
import { __emptyDepGraphBrand, __emptyLifetimeMapBrand } from "../src/internal.js";

// These imports are needed for TypeScript to name the symbol types
// in EmptyDependencyGraph/EmptyLifetimeMap which appear in GraphBuilder types.
void __emptyDepGraphBrand;
void __emptyLifetimeMapBrand;

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}

interface Config {
  host: string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const ConfigPort = port<Config>()({ name: "Config" });

type MyError = { code: string; message: string };

// Infallible adapters (no error channel)
const InfallibleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => ({ log: () => {} }),
});

const InfallibleConfigAdapter = createAdapter({
  provides: ConfigPort,
  factory: () => ({ host: "localhost" }),
});

// Fallible adapter (returns FactoryResult with error type)
const FallibleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: (): FactoryResult<Logger, MyError> => ({
    _tag: "Ok" as const,
    value: { log: () => {} },
  }),
});

// =============================================================================
// build() with only infallible adapters -> returns Graph
// =============================================================================

describe("build() with only infallible adapters returns Graph", () => {
  it("single infallible adapter builds to Graph", () => {
    const builder = GraphBuilder.create().provide(InfallibleLoggerAdapter);
    type BuildResult = ReturnType<typeof builder.build>;

    // Should be a Graph, not a string
    type IsGraph = BuildResult extends Graph<unknown, unknown, unknown> ? true : false;
    expectTypeOf<IsGraph>().toEqualTypeOf<true>();

    // Should NOT be a string
    type IsString = BuildResult extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<false>();
  });

  it("multiple infallible adapters build to Graph", () => {
    const builder = GraphBuilder.create()
      .provide(InfallibleLoggerAdapter)
      .provide(InfallibleConfigAdapter);
    type BuildResult = ReturnType<typeof builder.build>;

    type IsGraph = BuildResult extends Graph<unknown, unknown, unknown> ? true : false;
    expectTypeOf<IsGraph>().toEqualTypeOf<true>();

    type IsString = BuildResult extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// build() with unhandled fallible adapter -> returns error string
// =============================================================================

describe("build() with unhandled fallible adapter returns error string", () => {
  it("fallible adapter without handling produces error string", () => {
    const builder = GraphBuilder.create().provide(FallibleLoggerAdapter);
    type BuildResult = ReturnType<typeof builder.build>;

    // Should be a string (error message)
    expectTypeOf<BuildResult>().toBeString();

    // Should contain "Unhandled adapter error"
    type ContainsError = BuildResult extends `${string}Unhandled adapter error${string}`
      ? true
      : false;
    expectTypeOf<ContainsError>().toEqualTypeOf<true>();
  });

  it("error message mentions adapterOrDie or adapterOrElse", () => {
    const builder = GraphBuilder.create().provide(FallibleLoggerAdapter);
    type BuildResult = ReturnType<typeof builder.build>;

    type ContainsOrDie = BuildResult extends `${string}adapterOrDie(adapter)${string}` ? true : false;
    type ContainsOrElse = BuildResult extends `${string}adapterOrElse(adapter, fallbackAdapter)${string}` ? true : false;
    expectTypeOf<ContainsOrDie>().toEqualTypeOf<true>();
    expectTypeOf<ContainsOrElse>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// build() with adapterOrDie() -> returns Graph
// =============================================================================

describe("build() with adapterOrDie-wrapped fallible adapter returns Graph", () => {
  it("adapterOrDie clears error channel for build()", () => {
    const SafeAdapter = adapterOrDie(FallibleLoggerAdapter);
    const builder = GraphBuilder.create().provide(SafeAdapter);
    type BuildResult = ReturnType<typeof builder.build>;

    // Should be a Graph, not a string
    type IsGraph = BuildResult extends Graph<unknown, unknown, unknown> ? true : false;
    expectTypeOf<IsGraph>().toEqualTypeOf<true>();

    type IsString = BuildResult extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// build() with adapterOrElse() -> returns Graph
// =============================================================================

describe("build() with adapterOrElse-wrapped fallible adapter returns Graph", () => {
  it("adapterOrElse clears error channel for build()", () => {
    const SafeAdapter = adapterOrElse(FallibleLoggerAdapter, InfallibleLoggerAdapter);
    const builder = GraphBuilder.create().provide(SafeAdapter);
    type BuildResult = ReturnType<typeof builder.build>;

    // Should be a Graph, not a string
    type IsGraph = BuildResult extends Graph<unknown, unknown, unknown> ? true : false;
    expectTypeOf<IsGraph>().toEqualTypeOf<true>();

    type IsString = BuildResult extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// tryBuild() with only infallible adapters -> returns Result<Graph, ...>
// =============================================================================

describe("tryBuild() with only infallible adapters returns Result", () => {
  it("single infallible adapter tryBuild returns non-string type", () => {
    const builder = GraphBuilder.create().provide(InfallibleLoggerAdapter);
    type TryBuildResult = ReturnType<typeof builder.tryBuild>;

    // Should NOT be a string (error message)
    type IsString = TryBuildResult extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<false>();
  });

  it("multiple infallible adapters tryBuild returns non-string type", () => {
    const builder = GraphBuilder.create()
      .provide(InfallibleLoggerAdapter)
      .provide(InfallibleConfigAdapter);
    type TryBuildResult = ReturnType<typeof builder.tryBuild>;

    type IsString = TryBuildResult extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// tryBuild() with unhandled fallible adapter -> returns error string
// =============================================================================

describe("tryBuild() with unhandled fallible adapter returns error string", () => {
  it("fallible adapter without handling produces error string from tryBuild", () => {
    const builder = GraphBuilder.create().provide(FallibleLoggerAdapter);
    type TryBuildResult = ReturnType<typeof builder.tryBuild>;

    // Should be a string (error message)
    expectTypeOf<TryBuildResult>().toBeString();

    // Should contain "Unhandled adapter error"
    type ContainsError = TryBuildResult extends `${string}Unhandled adapter error${string}`
      ? true
      : false;
    expectTypeOf<ContainsError>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// tryBuild() with adapterOrDie() -> returns Result (not error string)
// =============================================================================

describe("tryBuild() with adapterOrDie-wrapped adapter returns Result", () => {
  it("adapterOrDie clears error channel for tryBuild()", () => {
    const SafeAdapter = adapterOrDie(FallibleLoggerAdapter);
    const builder = GraphBuilder.create().provide(SafeAdapter);
    type TryBuildResult = ReturnType<typeof builder.tryBuild>;

    // Should NOT be a string (error message)
    type IsString = TryBuildResult extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// tryBuild() with adapterOrElse() -> returns Result (not error string)
// =============================================================================

describe("tryBuild() with adapterOrElse-wrapped adapter returns Result", () => {
  it("adapterOrElse clears error channel for tryBuild()", () => {
    const SafeAdapter = adapterOrElse(FallibleLoggerAdapter, InfallibleLoggerAdapter);
    const builder = GraphBuilder.create().provide(SafeAdapter);
    type TryBuildResult = ReturnType<typeof builder.tryBuild>;

    // Should NOT be a string (error message)
    type IsString = TryBuildResult extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<false>();
  });
});
