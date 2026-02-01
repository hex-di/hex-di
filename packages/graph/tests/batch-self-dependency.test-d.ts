/**
 * Batch Self-Dependency Detection Type Tests.
 *
 * This test file validates that self-dependencies in batch operations
 * are caught with the specific HEX006 error instead of the generic
 * HEX002 circular dependency error.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type {
  HasSelfDependencyInBatch,
  FindSelfDependencyPort,
} from "../src/validation/types/self-dependency.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const PortA = createPort<{ a: string }>({ name: "A" });
const PortB = createPort<{ b: string }>({ name: "B" });
const PortC = createPort<{ c: string }>({ name: "C" });

// Normal adapters (no self-dependency)
const AdapterA = createAdapter({
  provides: PortA,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ a: "a" }),
});

const AdapterB = createAdapter({
  provides: PortB,
  requires: [PortA],
  lifetime: "singleton",
  factory: () => ({ b: "b" }),
});

// Self-referential adapter (has self-dependency)
const SelfRefAdapter = createAdapter({
  provides: PortC,
  requires: [PortC], // Self-dependency!
  lifetime: "singleton",
  factory: () => ({ c: "c" }),
});

// =============================================================================
// HasSelfDependencyInBatch Tests
// =============================================================================

describe("HasSelfDependencyInBatch", () => {
  it("returns false for empty batch", () => {
    type Result = HasSelfDependencyInBatch<readonly []>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns false for batch with no self-dependencies", () => {
    type Result = HasSelfDependencyInBatch<readonly [typeof AdapterA, typeof AdapterB]>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns true for batch with self-dependency", () => {
    type Result = HasSelfDependencyInBatch<readonly [typeof AdapterA, typeof SelfRefAdapter]>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns true when self-dependency is first in batch", () => {
    type Result = HasSelfDependencyInBatch<readonly [typeof SelfRefAdapter, typeof AdapterA]>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns true for single self-referential adapter", () => {
    type Result = HasSelfDependencyInBatch<readonly [typeof SelfRefAdapter]>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// FindSelfDependencyPort Tests
// =============================================================================

describe("FindSelfDependencyPort", () => {
  it("returns never for empty batch", () => {
    type Result = FindSelfDependencyPort<readonly []>;
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });

  it("returns never for batch with no self-dependencies", () => {
    type Result = FindSelfDependencyPort<readonly [typeof AdapterA, typeof AdapterB]>;
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });

  it("returns port name for batch with self-dependency", () => {
    type Result = FindSelfDependencyPort<readonly [typeof AdapterA, typeof SelfRefAdapter]>;
    expectTypeOf<Result>().toEqualTypeOf<"C">();
  });

  it("returns first self-dependency port when multiple exist", () => {
    // Create another self-referential adapter
    const PortD = createPort<{ d: string }>({ name: "D" });
    const SelfRefD = createAdapter({
      provides: PortD,
      requires: [PortD],
      lifetime: "singleton",
      factory: () => ({ d: "d" }),
    });

    type Result = FindSelfDependencyPort<readonly [typeof SelfRefAdapter, typeof SelfRefD]>;
    // Should return first one found ("C")
    expectTypeOf<Result>().toEqualTypeOf<"C">();
  });
});

// =============================================================================
// provideMany() Integration Tests
// =============================================================================

describe("provideMany() returns HEX006 for batch self-dependency", () => {
  it("returns HEX006 error when batch contains self-referential adapter", () => {
    const result = GraphBuilder.create().provideMany([AdapterA, SelfRefAdapter]);

    type Result = typeof result;
    type IsHex006Error =
      Result extends `ERROR[HEX006]: Self-dependency detected. Adapter for 'C'${string}`
        ? true
        : false;

    expectTypeOf<IsHex006Error>().toEqualTypeOf<true>();
  });

  it("succeeds when batch has no self-dependencies", () => {
    const result = GraphBuilder.create().provideMany([AdapterA, AdapterB]);

    type Result = typeof result;
    type IsGraphBuilder =
      Result extends GraphBuilder<infer P, infer R, infer A, infer O, infer I> ? true : false;

    expectTypeOf<IsGraphBuilder>().toEqualTypeOf<true>();
  });

  it("returns HEX006 before HEX002 cycle error", () => {
    // Self-dependency would also be detected as a cycle, but HEX006 should come first
    const result = GraphBuilder.create().provideMany([SelfRefAdapter]);

    type Result = typeof result;

    // Should NOT be HEX002
    type IsNotHex002 = Result extends `ERROR[HEX002]:${string}` ? false : true;
    expectTypeOf<IsNotHex002>().toEqualTypeOf<true>();

    // Should be HEX006
    type IsHex006 = Result extends `ERROR[HEX006]:${string}` ? true : false;
    expectTypeOf<IsHex006>().toEqualTypeOf<true>();
  });
});
