/**
 * Type-level tests to verify depth-exceeded warning tracking.
 *
 * When users enable `withUnsafeDepthOverride()` and depth is exceeded,
 * the warning should be recorded in the builder's internal state so
 * tooling can detect and display it.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { GetDepthExceededWarning } from "../src/builder/types/state.js";
import type { IsNever } from "@hex-di/core";

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = createPort<"Logger", { log(msg: string): void }>("Logger");
const DatabasePort = createPort<"Database", { query(): void }>("Database");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort] as const,
  lifetime: "singleton",
  factory: () => ({ query: () => {} }),
});

// =============================================================================
// No Warning When Depth Not Exceeded
// =============================================================================

describe("GetDepthExceededWarning with normal graphs", () => {
  it("should be never for empty graph", () => {
    const builder = GraphBuilder.create();
    type Warning = GetDepthExceededWarning<(typeof builder)["__internalState"]>;
    type IsWarningNever = IsNever<Warning>;
    expectTypeOf<IsWarningNever>().toEqualTypeOf<true>();
  });

  it("should be never for graph with adapters (no depth exceeded)", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    type Warning = GetDepthExceededWarning<(typeof builder)["__internalState"]>;
    type IsWarningNever = IsNever<Warning>;
    expectTypeOf<IsWarningNever>().toEqualTypeOf<true>();
  });

  it("should be never for withUnsafeDepthOverride when no depth exceeded", () => {
    const builder = GraphBuilder.withUnsafeDepthOverride().create().provide(LoggerAdapter);
    type Warning = GetDepthExceededWarning<(typeof builder)["__internalState"]>;
    type IsWarningNever = IsNever<Warning>;
    expectTypeOf<IsWarningNever>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Warning Inspection Types
// =============================================================================

describe("Depth warning inspection utilities", () => {
  it("GetDepthExceededWarning should extract warning from internals", () => {
    // Test the extraction type directly
    // Note: depGraph and lifetimeMap use `object` to satisfy AnyBuilderInternals constraint
    type TestInternals = {
      depGraph: object;
      lifetimeMap: object;
      parentProvides: unknown;
      maxDepth: 50;
      unsafeDepthOverride: true;
      depthExceededWarning: "DeepPort";
      uncheckedUsed: false;
    };
    type Warning = GetDepthExceededWarning<TestInternals>;
    expectTypeOf<Warning>().toEqualTypeOf<"DeepPort">();
  });

  it("GetDepthExceededWarning should return never for no warnings", () => {
    // Note: depGraph and lifetimeMap use `object` to satisfy AnyBuilderInternals constraint
    type TestInternals = {
      depGraph: object;
      lifetimeMap: object;
      parentProvides: unknown;
      maxDepth: 50;
      unsafeDepthOverride: false;
      depthExceededWarning: never;
      uncheckedUsed: false;
    };
    type Warning = GetDepthExceededWarning<TestInternals>;
    type IsWarningNever = IsNever<Warning>;
    expectTypeOf<IsWarningNever>().toEqualTypeOf<true>();
  });

  it("should support union of warning ports", () => {
    // Note: depGraph and lifetimeMap use `object` to satisfy AnyBuilderInternals constraint
    type TestInternals = {
      depGraph: object;
      lifetimeMap: object;
      parentProvides: unknown;
      maxDepth: 50;
      unsafeDepthOverride: true;
      depthExceededWarning: "Port1" | "Port2";
      uncheckedUsed: false;
    };
    type Warning = GetDepthExceededWarning<TestInternals>;
    expectTypeOf<Warning>().toEqualTypeOf<"Port1" | "Port2">();
  });
});

// =============================================================================
// Type Utility for Checking Warnings
// =============================================================================

/**
 * Helper type to check if a builder has any depth-exceeded warnings.
 */
type HasDepthWarning<B> =
  B extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
    ? IsNever<GetDepthExceededWarning<I>> extends true
      ? false
      : true
    : never;

describe("HasDepthWarning utility type", () => {
  it("should return false for normal graph", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    type Result = HasDepthWarning<typeof builder>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });
});
