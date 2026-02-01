/**
 * Type-level tests to verify the forward reference captive dependency gap.
 *
 * ## The Problem
 *
 * When adapters are registered in "forward reference" order:
 * 1. Singleton A requires ScopedPort (not yet registered) → forward ref, passes
 * 2. Scoped B provides ScopedPort → should be caught by reverse captive detection
 *
 * This test suite verifies that the type system catches this scenario at compile time.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const ScopedPort = createPort<{ getData(): string }>({ name: "ScopedService" });
const SingletonPort = createPort<{ process(): void }>({ name: "SingletonService" });
const TransientPort = createPort<{ handle(): void }>({ name: "TransientService" });

// Singleton that depends on scoped service (CAPTIVE!)
const CaptiveSingletonAdapter = createAdapter({
  provides: SingletonPort,
  requires: [ScopedPort] as const,
  lifetime: "singleton",
  factory: () => ({ process: () => {} }),
});

// Scoped adapter
const ScopedAdapter = createAdapter({
  provides: ScopedPort,
  requires: [] as const,
  lifetime: "scoped",
  factory: () => ({ getData: () => "data" }),
});

// =============================================================================
// Forward Reference Captive Tests
// =============================================================================

describe("V4.1: Forward Reference Captive Dependency Gap", () => {
  describe("Scenario 1: Singleton requires Scoped (forward ref order)", () => {
    it("should produce an error when singleton is registered first, then scoped", () => {
      // This is the problematic order:
      // 1. Singleton requires ScopedPort (forward ref, ScopedPort not yet in map)
      // 2. Scoped provides ScopedPort
      //
      // EXPECTED: The type system should catch this via reverse captive detection
      // when the Scoped adapter is added.

      const step1 = GraphBuilder.create().provide(CaptiveSingletonAdapter);
      // At this point, SingletonPort is provided, ScopedPort is required but not provided

      // This should produce a compile-time error about reverse captive dependency
      const step2 = step1.provide(ScopedAdapter);

      // If the gap exists, step2 would be a valid GraphBuilder
      // If fixed, step2 would be an error message type

      // Check if it's an error message (expected if fix is working)
      type Step2Type = typeof step2;
      type IsErrorMessage = Step2Type extends `ERROR${string}` ? true : false;

      // THIS ASSERTION DOCUMENTS THE EXPECTED BEHAVIOR:
      // If this passes, the gap is FIXED
      // If this fails, the gap STILL EXISTS
      expectTypeOf<IsErrorMessage>().toEqualTypeOf<true>();
    });

    it("should work correctly when registered in correct order (scoped first)", () => {
      // Correct order: Scoped first, then Singleton
      const step1 = GraphBuilder.create().provide(ScopedAdapter);
      const step2 = step1.provide(CaptiveSingletonAdapter);

      // This should produce a forward captive error (singleton depends on scoped)
      type Step2Type = typeof step2;
      type IsErrorMessage = Step2Type extends `ERROR${string}` ? true : false;
      expectTypeOf<IsErrorMessage>().toEqualTypeOf<true>();
    });
  });

  describe("Scenario 2: Valid forward reference (no captive)", () => {
    it("should allow forward reference when lifetimes are compatible", () => {
      // Scoped depends on Singleton (forward ref) - this is valid
      const ScopedRequiresSingletonAdapter = createAdapter({
        provides: ScopedPort,
        requires: [SingletonPort] as const,
        lifetime: "scoped",
        factory: () => ({ getData: () => "data" }),
      });

      const SingletonAdapter = createAdapter({
        provides: SingletonPort,
        requires: [] as const,
        lifetime: "singleton",
        factory: () => ({ process: () => {} }),
      });

      // Forward ref order: Scoped first (requires Singleton), then Singleton
      const step1 = GraphBuilder.create().provide(ScopedRequiresSingletonAdapter);
      const step2 = step1.provide(SingletonAdapter);

      // This should succeed - no captive dependency
      type Step2Type = typeof step2;
      type IsGraphBuilder =
        Step2Type extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer _I>
          ? true
          : false;
      expectTypeOf<IsGraphBuilder>().toEqualTypeOf<true>();
    });
  });

  describe("Scenario 3: Transient depends on Scoped (also captive)", () => {
    it("should detect when transient depends on scoped via forward reference", () => {
      // Transient requires Scoped - NOT captive (transient has shorter lifetime)
      // Wait, transient level is 3, scoped is 2
      // Captive is when LONGER-lived depends on SHORTER-lived
      // Transient (3) depending on Scoped (2) means shorter depending on longer - valid!

      // Actually let's create a SCOPED that depends on TRANSIENT (captive)
      const TransientAdapter = createAdapter({
        provides: TransientPort,
        requires: [] as const,
        lifetime: "transient",
        factory: () => ({ handle: () => {} }),
      });

      const ScopedRequiresTransientAdapter = createAdapter({
        provides: ScopedPort,
        requires: [TransientPort] as const,
        lifetime: "scoped", // Scoped (longer) requires Transient (shorter) = CAPTIVE
        factory: () => ({ getData: () => "data" }),
      });

      // Forward ref order
      const step1 = GraphBuilder.create().provide(ScopedRequiresTransientAdapter);
      const step2 = step1.provide(TransientAdapter);

      // Should detect reverse captive
      type Step2Type = typeof step2;
      type IsErrorMessage = Step2Type extends `ERROR${string}` ? true : false;
      expectTypeOf<IsErrorMessage>().toEqualTypeOf<true>();
    });
  });
});

// =============================================================================
// Reverse Captive Detection Verification
// =============================================================================

describe("FindReverseCaptiveDependency verification", () => {
  it("should detect when existing singleton requires newly-added scoped port", () => {
    // This directly tests the type that should catch the gap
    type DepGraph = {
      SingletonService: "ScopedService"; // Singleton requires ScopedService
    };
    type LifetimeMap = {
      SingletonService: 1; // Singleton level
      // Note: ScopedService NOT in map yet (forward ref scenario)
    };

    // Now we're adding ScopedService with level 2 (scoped)
    // FindReverseCaptiveDependency should detect that SingletonService
    // (level 1, longer) requires ScopedService (level 2, shorter)

    // Import the type we're testing
    type FindReverseCaptiveDependency<
      TDepGraph,
      TLifetimeMap,
      TNewPortName extends string,
      TNewPortLevel extends number,
    > = import("../src/validation/types/captive/index.js").FindReverseCaptiveDependency<
      TDepGraph,
      TLifetimeMap,
      TNewPortName,
      TNewPortLevel
    >;

    type Result = FindReverseCaptiveDependency<
      DepGraph,
      LifetimeMap,
      "ScopedService",
      2 // scoped level
    >;

    // Should return "SingletonService" (the port that would capture the new scoped port)
    expectTypeOf<Result>().toEqualTypeOf<"SingletonService">();
  });
});
