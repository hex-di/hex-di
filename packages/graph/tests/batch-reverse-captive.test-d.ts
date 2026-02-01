/**
 * Test: Reverse Captive Detection in provideMany
 *
 * This test verifies that provideMany correctly detects reverse captive dependencies
 * where EXISTING adapters in the graph would capture ports provided by the batch.
 *
 * ## Scenario
 * 1. Register SingletonAdapter requiring ScopedPort (forward reference)
 * 2. provideMany([ScopedAdapter]) should detect that SingletonAdapter would capture ScopedPort
 *
 * ## Issue
 * WouldAnyBeCaptive only validates adapters IN the batch, not existing graph adapters.
 * FindReverseCaptiveDependency exists but isn't used in ProvideManyResult.
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

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

const PortA = createPort<"PortA", ServiceA>("PortA");
const PortB = createPort<"PortB", ServiceB>("PortB");
const PortC = createPort<"PortC", ServiceC>("PortC");

// =============================================================================
// Scenario 1: Existing singleton requires port, batch provides scoped
// =============================================================================

describe("provideMany reverse captive detection", () => {
  it("detects reverse captive when existing singleton requires port provided as scoped in batch", () => {
    // SingletonAdapter requires PortB (forward reference - PortB not yet provided)
    const SingletonAdapter = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: _deps => ({ doA: () => {} }),
    });

    // ScopedAdapter provides PortB
    const ScopedAdapter = createAdapter({
      provides: PortB,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ doB: () => {} }),
    });

    // Register SingletonAdapter first (creates forward reference to PortB)
    const builder = GraphBuilder.create().provide(SingletonAdapter);

    // provideMany with ScopedAdapter should detect reverse captive:
    // SingletonAdapter (level 1) would capture ScopedPort (level 2)
    const result = builder.provideMany([ScopedAdapter]);

    // Should be an error string, not a GraphBuilder
    type ResultType = typeof result;

    // This test SHOULD pass but currently FAILS because reverse captive
    // detection is missing from provideMany
    expectTypeOf<ResultType>().toBeString();

    // Should be a REVERSE captive error (HEX004)
    // The existing singleton would capture the newly added scoped adapter
    type IsReverseCaptiveError =
      ResultType extends `ERROR[HEX004]: Reverse captive dependency: ${string}` ? true : false;
    expectTypeOf<IsReverseCaptiveError>().toEqualTypeOf<true>();
  });

  it("detects reverse captive with multiple adapters in batch", () => {
    // Singleton requires both PortB and PortC
    const SingletonAdapter = createAdapter({
      provides: PortA,
      requires: [PortB, PortC],
      lifetime: "singleton",
      factory: _deps => ({ doA: () => {} }),
    });

    // Batch provides PortB as scoped and PortC as transient
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

    const builder = GraphBuilder.create().provide(SingletonAdapter);

    // provideMany should detect that SingletonAdapter captures ScopedB or TransientC
    const result = builder.provideMany([ScopedB, TransientC]);

    type ResultType = typeof result;
    expectTypeOf<ResultType>().toBeString();
  });

  // =============================================================================
  // Scenario 2: Valid case - should NOT report error
  // =============================================================================

  it("allows batch when no reverse captive exists", () => {
    // ScopedAdapter requires PortB (forward reference)
    const ScopedAdapter = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "scoped",
      factory: _deps => ({ doA: () => {} }),
    });

    // SingletonB provides PortB (valid: scoped can depend on singleton)
    const SingletonB = createAdapter({
      provides: PortB,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    const builder = GraphBuilder.create().provide(ScopedAdapter);

    // provideMany should succeed - scoped depending on singleton is valid
    const result = builder.provideMany([SingletonB]);

    type ResultType = typeof result;
    // Should be a GraphBuilder, not a string
    expectTypeOf<ResultType>().not.toBeString();
  });

  // =============================================================================
  // Scenario 3: Intra-batch captive (should already work)
  // =============================================================================

  it("still detects intra-batch captive (existing behavior)", () => {
    // SingletonA requires ScopedB, both in same batch
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

    // This should already be caught by WouldAnyBeCaptive's two-pass algorithm
    const result = GraphBuilder.create().provideMany([SingletonA, ScopedB]);

    type ResultType = typeof result;
    expectTypeOf<ResultType>().toBeString();
  });
});
