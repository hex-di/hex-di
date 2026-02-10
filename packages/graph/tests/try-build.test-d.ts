/**
 * Type-level tests for tryBuild() and tryBuildFragment().
 */
import { expectTypeOf, test } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import { GraphBuilder, type Graph, type GraphBuildError } from "../src/index.js";

// =============================================================================
// Fixtures
// =============================================================================

const LoggerPort = port<{ log: () => void }>()({ name: "Logger" });
const DbPort = port<{ query: () => string }>()({ name: "Db" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DbAdapter = createAdapter({
  provides: DbPort,
  requires: [LoggerPort] as const,
  lifetime: "singleton",
  factory: () => ({ query: () => "result" }),
});

// =============================================================================
// tryBuild() type tests
// =============================================================================

test("tryBuild() returns Result when dependencies satisfied", () => {
  const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DbAdapter);

  type TryBuildResult = ReturnType<typeof builder.tryBuild>;

  // Should be a Result type, not a template literal error
  type IsResult = TryBuildResult extends Result<infer _T, infer _E> ? true : false;
  expectTypeOf<IsResult>().toEqualTypeOf<true>();

  // The Ok type should be a Graph
  type OkType = TryBuildResult extends Result<infer T, infer _E> ? T : never;
  type IsGraph = OkType extends Graph<infer _P> ? true : false;
  expectTypeOf<IsGraph>().toEqualTypeOf<true>();

  // The Err type should be GraphBuildError
  type ErrType = TryBuildResult extends Result<infer _T, infer E> ? E : never;
  expectTypeOf<ErrType>().toEqualTypeOf<GraphBuildError>();
});

test("tryBuild() returns template literal error when dependencies unsatisfied", () => {
  const builder = GraphBuilder.create().provide(DbAdapter);

  type TryBuildResult = ReturnType<typeof builder.tryBuild>;

  // Should be template literal error (same as build())
  expectTypeOf<TryBuildResult>().toEqualTypeOf<"ERROR[HEX008]: Missing adapters for Logger. Call .provide() first.">();
});

test("tryBuildFragment() always returns Result (no dependency check)", () => {
  const builder = GraphBuilder.create().provide(DbAdapter);

  type TryBuildFragmentResult = ReturnType<typeof builder.tryBuildFragment>;

  // Should be Result even with unsatisfied deps (fragments don't check)
  type IsResult = TryBuildFragmentResult extends Result<infer _T, infer _E> ? true : false;
  expectTypeOf<IsResult>().toEqualTypeOf<true>();
});

test("GraphBuildError is exhaustive union", () => {
  type Tags = GraphBuildError["_tag"];
  expectTypeOf<Tags>().toEqualTypeOf<"CyclicDependency" | "CaptiveDependency">();
});
