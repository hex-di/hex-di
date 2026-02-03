/**
 * Comprehensive Type-Level Tests: Bidirectional Captive Dependency Detection
 *
 * ## Purpose
 *
 * This test suite validates that BOTH forward and reverse captive dependencies
 * are detected at compile time, particularly in batch operations (provideMany).
 *
 * ## Key Finding
 *
 * `WouldAnyCreateReverseCaptive` type EXISTS but the gap documented in
 * `batch-reverse-captive.test-d.ts:46-82` shows that reverse captive
 * detection may not be properly integrated in `provideMany()`.
 *
 * ## Test Strategy (TDD Red Phase)
 *
 * Tests marked with "Expected to FAIL" document gaps in current implementation.
 * Tests marked with "Expected to PASS" verify existing functionality works.
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { createAdapter, port } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { ReverseCaptiveDependencyError } from "../src/validation/types/captive/errors.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface ServiceA {
  doA(): void;
}
interface ServiceB {
  doB(): void;
}
interface ServiceC {
  doC(): void;
}
interface ServiceD {
  doD(): void;
}

const PortA = port<ServiceA>()({ name: "PortA" });
const PortB = port<ServiceB>()({ name: "PortB" });
const PortC = port<ServiceC>()({ name: "PortC" });
const PortD = port<ServiceD>()({ name: "PortD" });

// =============================================================================
// Area 1: provideMany() Reverse Captive Detection
// =============================================================================

describe("Bidirectional Captive - provideMany reverse captive", () => {
  describe("Reverse captive: existing adapter captures batch adapter", () => {
    it("HEX004 when existing singleton has forward ref to port provided as scoped in batch", () => {
      // Setup: Singleton A requires PortB (forward reference - PortB not yet provided)
      const SingletonA = createAdapter({
        provides: PortA,
        requires: [PortB],
        lifetime: "singleton",
        factory: _deps => ({ doA: () => {} }),
      });

      // Batch adapter: Scoped B provides PortB
      const ScopedB = createAdapter({
        provides: PortB,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ doB: () => {} }),
      });

      // Step 1: Register SingletonA (creates forward reference to PortB)
      const builder = GraphBuilder.create().provide(SingletonA);

      // Step 2: provideMany with ScopedB should detect reverse captive
      // SingletonA (level 1) would capture ScopedB (level 2)
      const result = builder.provideMany([ScopedB]);

      type ResultType = typeof result;

      // EXPECTED TO FAIL - TDD Red Phase
      // Current implementation may not check reverse captive in provideMany
      // If this fails: reverse captive detection gap exists
      expectTypeOf<ResultType>().toBeString();

      // Should be a REVERSE captive error (HEX004)
      type IsReverseCaptiveError =
        ResultType extends `ERROR[HEX004]: Reverse captive dependency: ${string}` ? true : false;
      expectTypeOf<IsReverseCaptiveError>().toEqualTypeOf<true>();
    });

    it("HEX004 when existing singleton requires port, batch provides as transient", () => {
      // Setup: Singleton A requires PortB (forward reference)
      const SingletonA = createAdapter({
        provides: PortA,
        requires: [PortB],
        lifetime: "singleton",
        factory: _deps => ({ doA: () => {} }),
      });

      // Batch adapter: Transient B provides PortB
      const TransientB = createAdapter({
        provides: PortB,
        requires: [],
        lifetime: "transient",
        factory: () => ({ doB: () => {} }),
      });

      const builder = GraphBuilder.create().provide(SingletonA);
      const result = builder.provideMany([TransientB]);

      type ResultType = typeof result;

      // EXPECTED TO FAIL - TDD Red Phase
      // Singleton (level 1) capturing Transient (level 3) is a reverse captive
      expectTypeOf<ResultType>().toBeString();

      type IsReverseCaptiveError =
        ResultType extends `ERROR[HEX004]: Reverse captive dependency: ${string}` ? true : false;
      expectTypeOf<IsReverseCaptiveError>().toEqualTypeOf<true>();
    });

    it("HEX004 when existing scoped requires port, batch provides as transient", () => {
      // Setup: Scoped A requires PortB (forward reference)
      const ScopedA = createAdapter({
        provides: PortA,
        requires: [PortB],
        lifetime: "scoped",
        factory: _deps => ({ doA: () => {} }),
      });

      // Batch adapter: Transient B provides PortB
      const TransientB = createAdapter({
        provides: PortB,
        requires: [],
        lifetime: "transient",
        factory: () => ({ doB: () => {} }),
      });

      const builder = GraphBuilder.create().provide(ScopedA);
      const result = builder.provideMany([TransientB]);

      type ResultType = typeof result;

      // EXPECTED TO FAIL - TDD Red Phase
      // Scoped (level 2) capturing Transient (level 3) is a reverse captive
      expectTypeOf<ResultType>().toBeString();

      type IsReverseCaptiveError =
        ResultType extends `ERROR[HEX004]: Reverse captive dependency: ${string}` ? true : false;
      expectTypeOf<IsReverseCaptiveError>().toEqualTypeOf<true>();
    });

    it("reports first HEX004 when multiple reverse captives exist in batch", () => {
      // Setup: Singleton A requires PortB and PortC (both forward refs)
      const SingletonA = createAdapter({
        provides: PortA,
        requires: [PortB, PortC],
        lifetime: "singleton",
        factory: _deps => ({ doA: () => {} }),
      });

      // Batch: PortB as scoped, PortC as transient
      const ScopedB = createAdapter({
        provides: PortB,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ doB: () => {} }),
      });

      const TransientC = createAdapter({
        provides: PortC,
        requires: [],
        lifetime: "transient",
        factory: () => ({ doC: () => {} }),
      });

      const builder = GraphBuilder.create().provide(SingletonA);
      const result = builder.provideMany([ScopedB, TransientC]);

      type ResultType = typeof result;

      // EXPECTED TO FAIL - TDD Red Phase
      // At least ONE reverse captive error should be reported
      expectTypeOf<ResultType>().toBeString();
    });
  });

  describe("Valid scenarios (should NOT error)", () => {
    it("allows batch when existing scoped depends on port provided as singleton", () => {
      // Setup: Scoped A requires PortB (forward reference)
      const ScopedA = createAdapter({
        provides: PortA,
        requires: [PortB],
        lifetime: "scoped",
        factory: _deps => ({ doA: () => {} }),
      });

      // Batch: Singleton B provides PortB (valid: scoped can depend on singleton)
      const SingletonB = createAdapter({
        provides: PortB,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ doB: () => {} }),
      });

      const builder = GraphBuilder.create().provide(ScopedA);
      const result = builder.provideMany([SingletonB]);

      type ResultType = typeof result;

      // EXPECTED TO PASS - Scoped depending on singleton is valid
      expectTypeOf<ResultType>().not.toBeString();
    });

    it("allows batch when existing transient depends on any lifetime", () => {
      // Transient (level 3) can depend on any lifetime without captive issues

      // Setup: Transient A requires PortB
      const TransientA = createAdapter({
        provides: PortA,
        requires: [PortB],
        lifetime: "transient",
        factory: _deps => ({ doA: () => {} }),
      });

      // Case 1: Batch provides singleton B
      const SingletonB = createAdapter({
        provides: PortB,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ doB: () => {} }),
      });

      const result1 = GraphBuilder.create().provide(TransientA).provideMany([SingletonB]);
      type Result1Type = typeof result1;
      expectTypeOf<Result1Type>().not.toBeString();

      // Case 2: Batch provides scoped B
      const ScopedB = createAdapter({
        provides: PortB,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ doB: () => {} }),
      });

      const result2 = GraphBuilder.create().provide(TransientA).provideMany([ScopedB]);
      type Result2Type = typeof result2;
      expectTypeOf<Result2Type>().not.toBeString();

      // Case 3: Batch provides transient B
      const TransientB = createAdapter({
        provides: PortB,
        requires: [],
        lifetime: "transient",
        factory: () => ({ doB: () => {} }),
      });

      const result3 = GraphBuilder.create().provide(TransientA).provideMany([TransientB]);
      type Result3Type = typeof result3;
      expectTypeOf<Result3Type>().not.toBeString();
    });

    it("allows batch when existing singleton depends on singleton in batch", () => {
      // Same lifetime is valid

      const SingletonA = createAdapter({
        provides: PortA,
        requires: [PortB],
        lifetime: "singleton",
        factory: _deps => ({ doA: () => {} }),
      });

      const SingletonB = createAdapter({
        provides: PortB,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ doB: () => {} }),
      });

      const builder = GraphBuilder.create().provide(SingletonA);
      const result = builder.provideMany([SingletonB]);

      type ResultType = typeof result;

      // EXPECTED TO PASS - Same lifetime is always valid
      expectTypeOf<ResultType>().not.toBeString();
    });
  });

  describe("Interaction with intra-batch captive validation", () => {
    it("detects intra-batch captive even when reverse captive also exists", () => {
      // Setup: Singleton A requires PortB (forward ref)
      const SingletonA = createAdapter({
        provides: PortA,
        requires: [PortB],
        lifetime: "singleton",
        factory: _deps => ({ doA: () => {} }),
      });

      // Batch has BOTH:
      // 1. Intra-batch captive: SingletonC requires ScopedB
      // 2. Reverse captive: SingletonA requires ScopedB

      const ScopedB = createAdapter({
        provides: PortB,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ doB: () => {} }),
      });

      const SingletonC = createAdapter({
        provides: PortC,
        requires: [PortB], // Creates intra-batch captive
        lifetime: "singleton",
        factory: _deps => ({ doC: () => {} }),
      });

      const builder = GraphBuilder.create().provide(SingletonA);
      const result = builder.provideMany([ScopedB, SingletonC]);

      type ResultType = typeof result;

      // Should be an error (either HEX003 or HEX004)
      expectTypeOf<ResultType>().toBeString();

      // Check that it's a captive-related error
      type IsCaptiveError = ResultType extends `ERROR[HEX003]: ${string}`
        ? true
        : ResultType extends `ERROR[HEX004]: ${string}`
          ? true
          : false;
      expectTypeOf<IsCaptiveError>().toEqualTypeOf<true>();
    });
  });
});

// =============================================================================
// Area 1B: Single provide() Reverse Captive Detection (Verification)
// =============================================================================

describe("Bidirectional Captive - single provide() reverse captive", () => {
  it("HEX004 when adding scoped that satisfies singleton forward ref", () => {
    // This tests the single-adapter .provide() path

    const SingletonA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: _deps => ({ doA: () => {} }),
    });

    const ScopedB = createAdapter({
      provides: PortB,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ doB: () => {} }),
    });

    const step1 = GraphBuilder.create().provide(SingletonA);
    const step2 = step1.provide(ScopedB);

    type Step2Type = typeof step2;

    // EXPECTED TO PASS - Single provide() should detect reverse captive
    type IsErrorMessage = Step2Type extends `ERROR${string}` ? true : false;
    expectTypeOf<IsErrorMessage>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Type Utilities for Test Assertions
// =============================================================================

describe("Type utility verification", () => {
  it("WouldAnyCreateReverseCaptive type exists and is usable", () => {
    // Verify the type exists and can be imported
    type WouldAnyCreateReverseCaptive =
      import("../src/validation/types/captive/detection.js").WouldAnyCreateReverseCaptive<
        { PortA: "PortB" },
        { PortA: 1 },
        readonly [{ provides: { __portName: "PortB" }; lifetime: "scoped" }]
      >;

    // This should return either false or ReverseCaptiveDependencyError
    type IsValidResult = WouldAnyCreateReverseCaptive extends
      | false
      | ReverseCaptiveDependencyError<string, string, string, string>
      ? true
      : false;
    expectTypeOf<IsValidResult>().toEqualTypeOf<true>();
  });

  it("FindReverseCaptiveDependency correctly identifies reverse captives", () => {
    // Direct test of the underlying type
    type FindReverseCaptiveDependency =
      import("../src/validation/types/captive/index.js").FindReverseCaptiveDependency<
        { SingletonPort: "ScopedPort" }, // Dependency graph: Singleton requires Scoped
        { SingletonPort: 1 }, // Lifetime map: only Singleton registered
        "ScopedPort", // New port being added
        2 // Scoped level
      >;

    // Should return "SingletonPort" (the port that would capture the new scoped port)
    expectTypeOf<FindReverseCaptiveDependency>().toEqualTypeOf<"SingletonPort">();
  });

  it("FindReverseCaptiveDependency returns never for valid scenarios", () => {
    // Scoped depending on singleton is valid
    type FindReverseCaptiveDependency =
      import("../src/validation/types/captive/index.js").FindReverseCaptiveDependency<
        { ScopedPort: "SingletonPort" }, // Scoped requires Singleton
        { ScopedPort: 2 }, // Scoped is registered
        "SingletonPort", // Adding singleton
        1 // Singleton level
      >;

    // Should return never (no reverse captive)
    expectTypeOf<FindReverseCaptiveDependency>().toBeNever();
  });
});
