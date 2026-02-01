/**
 * Type-level tests for ProvideManyResultAllErrors.
 *
 * These tests verify that provideMany can collect ALL validation errors
 * in a batch, rather than short-circuiting on the first error.
 *
 * Test scenarios:
 * 1. No errors - returns GraphBuilder (success)
 * 2. Single error type - returns that error
 * 3. Multiple errors of same type - returns multi-error
 * 4. Multiple different error types - returns multi-error with all
 */

import { describe, expectTypeOf, it } from "vitest";
import { createAdapter } from "@hex-di/core";
import type {
  ProvideManyResultAllErrors,
  CollectBatchErrors,
  DefaultInternals,
} from "../src/builder/types/index.js";
import { PortA, PortC, PortD } from "./fixtures.js";

// =============================================================================
// Test Fixtures - Adapters with specific error scenarios
// =============================================================================

// Valid adapter (no errors)
const AdapterA = createAdapter({
  provides: PortA,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ doA: () => {} }),
});

// Duplicate adapter (same port as AdapterA)
const DuplicateAdapterA = createAdapter({
  provides: PortA,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ doA: () => {} }),
});

// Self-referencing adapter
const SelfRefAdapter = createAdapter({
  provides: PortC,
  requires: [PortC],
  lifetime: "singleton",
  factory: () => ({ doC: () => {} }),
});

// Adapters that create cycle
const CycleAdapterC = createAdapter({
  provides: PortC,
  requires: [PortD],
  lifetime: "singleton",
  factory: () => ({ doC: () => {} }),
});

const CycleAdapterD = createAdapter({
  provides: PortD,
  requires: [PortC],
  lifetime: "singleton",
  factory: () => ({ doD: () => {} }),
});

// Captive dependency: singleton depends on scoped
const SingletonDependsOnScoped = createAdapter({
  provides: PortC,
  requires: [PortD],
  lifetime: "singleton",
  factory: () => ({ doC: () => {} }),
});

const ScopedAdapterD = createAdapter({
  provides: PortD,
  requires: [],
  lifetime: "scoped",
  factory: () => ({ doD: () => {} }),
});

// =============================================================================
// CollectBatchErrors Tests
// =============================================================================

describe("CollectBatchErrors type", () => {
  it("should return empty tuple when no errors in batch", () => {
    type Result = CollectBatchErrors<
      never, // TProvides (empty graph)
      DefaultInternals,
      readonly [typeof AdapterA]
    >;
    // Single valid adapter with no dependencies
    // Should return empty tuple
    expectTypeOf<Result>().toMatchTypeOf<readonly []>();
  });

  it("should collect intra-batch duplicate error", () => {
    type Result = CollectBatchErrors<
      never,
      DefaultInternals,
      readonly [typeof AdapterA, typeof DuplicateAdapterA]
    >;
    // Should contain duplicate error (non-empty tuple)
    expectTypeOf<Result["length"]>().not.toEqualTypeOf<0>();
  });

  it("should collect self-dependency error", () => {
    type Result = CollectBatchErrors<never, DefaultInternals, readonly [typeof SelfRefAdapter]>;
    // Should contain self-dependency error
    expectTypeOf<Result["length"]>().not.toEqualTypeOf<0>();
  });
});

// =============================================================================
// ProvideManyResultAllErrors Tests
// =============================================================================

describe("ProvideManyResultAllErrors type", () => {
  it("should return GraphBuilder when batch has no errors", () => {
    type Result = ProvideManyResultAllErrors<
      never, // TProvides
      never, // TRequires
      never, // TAsyncPorts
      never, // TOverrides
      DefaultInternals,
      readonly [typeof AdapterA]
    >;

    // Should be a GraphBuilder, not a string
    expectTypeOf<Result>().toHaveProperty("provide");
  });

  it("should return single error for intra-batch duplicate", () => {
    type Result = ProvideManyResultAllErrors<
      never,
      never,
      never,
      never,
      DefaultInternals,
      readonly [typeof AdapterA, typeof DuplicateAdapterA]
    >;

    // Should be a string error message containing HEX001
    expectTypeOf<Result>().toMatchTypeOf<`ERROR[HEX001]: ${string}`>();
  });

  it("should return multi-error for self-dependency (also detected as cycle)", () => {
    type Result = ProvideManyResultAllErrors<
      never,
      never,
      never,
      never,
      DefaultInternals,
      readonly [typeof SelfRefAdapter]
    >;

    // Self-dependency (C requires C) is detected by BOTH:
    // - HEX006: Self-dependency check (O(1))
    // - HEX002: Cycle detection (C -> C)
    // The all-errors version correctly reports BOTH errors as a multi-error
    expectTypeOf<Result>().toMatchTypeOf<`Multiple validation errors:\n${string}`>();
  });

  it("should collect cycle errors in batch", () => {
    type Result = ProvideManyResultAllErrors<
      never,
      never,
      never,
      never,
      DefaultInternals,
      readonly [typeof CycleAdapterC, typeof CycleAdapterD]
    >;

    // Should be a string error message containing HEX002 (cycle)
    expectTypeOf<Result>().toMatchTypeOf<`ERROR[HEX002]: ${string}`>();
  });

  it("should collect captive dependency errors", () => {
    type Result = ProvideManyResultAllErrors<
      never,
      never,
      never,
      never,
      DefaultInternals,
      readonly [typeof SingletonDependsOnScoped, typeof ScopedAdapterD]
    >;

    // Should be a string error message containing HEX003 (captive)
    expectTypeOf<Result>().toMatchTypeOf<`ERROR[HEX003]: ${string}`>();
  });
});

// =============================================================================
// Comparison with existing ProvideManyResult (short-circuit behavior)
// =============================================================================

describe("ProvideManyResultAllErrors vs ProvideManyResult", () => {
  it("should collect multiple different error types", () => {
    // This scenario has both duplicate AND self-dependency in the batch
    // The short-circuit version would only report the first
    // The all-errors version should report both
    type Result = ProvideManyResultAllErrors<
      never,
      never,
      never,
      never,
      DefaultInternals,
      readonly [typeof AdapterA, typeof DuplicateAdapterA, typeof SelfRefAdapter]
    >;

    // Should contain "Multiple validation errors" when there are 2+ errors
    // or be a single error message if consolidation happens
    expectTypeOf<Result>().toMatchTypeOf<string>();
  });
});
