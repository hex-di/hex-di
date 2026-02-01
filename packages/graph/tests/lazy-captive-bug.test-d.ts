/**
 * Test for lazy port captive dependency detection.
 *
 * This test verifies that captive dependency detection works correctly
 * when lazy ports are used.
 *
 * EXPECTED BEHAVIOR: A singleton depending on a lazy transient should
 * produce a captive dependency error.
 *
 * FIX: The `TransformLazyPortNamesToOriginal` type is applied to transform
 * "LazyTransientService" back to "TransientService" before the captive check,
 * allowing the lifetime map lookup to succeed.
 */
import { describe, it, expectTypeOf } from "vitest";
import { createAdapter, createPort, lazyPort } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

// Test services
interface TransientService {
  process(): void;
}

interface SingletonService {
  getValue(): number;
}

// Ports
const TransientPort = createPort<"TransientService", TransientService>("TransientService");
const SingletonPort = createPort<"SingletonService", SingletonService>("SingletonService");

describe("Lazy port captive dependency detection", () => {
  it("should detect captive dependency: singleton depending on lazy transient", () => {
    // Transient adapter
    const TransientAdapter = createAdapter({
      provides: TransientPort,
      requires: [] as const,
      lifetime: "transient",
      factory: () => ({ process: () => {} }),
    });

    // Singleton adapter depending on LAZY transient
    // This should be a captive dependency error!
    const SingletonAdapter = createAdapter({
      provides: SingletonPort,
      requires: [lazyPort(TransientPort)] as const,
      lifetime: "singleton",
      factory: ({ LazyTransientService }) => ({
        getValue: () => {
          // This captures the transient in the singleton - BAD!
          const _transient = LazyTransientService();
          return 42;
        },
      }),
    });

    // Build the graph - this SHOULD produce a captive error
    const result = GraphBuilder.create().provide(TransientAdapter).provide(SingletonAdapter);

    // The second provide() should return a captive error string, not a GraphBuilder.
    // The TransformLazyPortNamesToOriginal type transforms "LazyTransientService" -> "TransientService"
    // so the captive check can find the correct lifetime in the map.

    // Test whether captive dependency is detected
    type ResultType = typeof result;
    type IsCaptiveDetected = ResultType extends string ? true : false;

    // Captive dependency should be detected for lazy ports
    expectTypeOf<IsCaptiveDetected>().toEqualTypeOf<true>();
  });

  it("should detect captive dependency: singleton depending on non-lazy transient", () => {
    // For comparison - this case DOES work correctly (non-lazy)
    const TransientAdapter = createAdapter({
      provides: TransientPort,
      requires: [] as const,
      lifetime: "transient",
      factory: () => ({ process: () => {} }),
    });

    const SingletonAdapter = createAdapter({
      provides: SingletonPort,
      requires: [TransientPort] as const, // Non-lazy direct dependency
      lifetime: "singleton",
      factory: ({ TransientService }) => ({
        getValue: () => {
          TransientService.process();
          return 42;
        },
      }),
    });

    // This correctly produces a captive error
    const result = GraphBuilder.create().provide(TransientAdapter).provide(SingletonAdapter);

    // This should be a string error message
    expectTypeOf(result).toBeString();
  });
});
