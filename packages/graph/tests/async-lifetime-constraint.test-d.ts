/**
 * Test: Async Adapter Lifetime Constraint
 *
 * This test verifies that async adapters are constrained to singleton lifetime
 * at the type level, not just at the factory level.
 *
 * ## Issue
 * The `Adapter` type allows invalid combinations like:
 * `Adapter<Port, never, "transient", "async">` which is semantically invalid.
 *
 * ## Why It Matters
 * Async adapters are initialized once at container startup and cached.
 * They must be singletons. While `createAsyncAdapter` enforces this at runtime,
 * manually constructed adapter types could bypass this constraint.
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { createPort, type Adapter } from "@hex-di/core";

// =============================================================================
// Test Fixtures
// =============================================================================

interface ServiceA {
  doA(): void;
}

const PortA = createPort<ServiceA>({ name: "PortA" });
type PortAType = typeof PortA;

// =============================================================================
// Constraint Tests
// =============================================================================

describe("async adapter lifetime constraint", () => {
  it("async adapter with singleton lifetime is valid", () => {
    // This should be valid
    type ValidAsyncAdapter = Adapter<PortAType, never, "singleton", "async", false>;

    // Should have the correct shape
    expectTypeOf<ValidAsyncAdapter["factoryKind"]>().toEqualTypeOf<"async">();
    expectTypeOf<ValidAsyncAdapter["lifetime"]>().toEqualTypeOf<"singleton">();
  });

  it("async adapter with scoped lifetime should be constrained to singleton", () => {
    // Scoped async is semantically invalid - async adapters are always singletons
    // The Adapter type normalizes lifetime to "singleton" when factoryKind is "async"
    type ScopedAsyncAdapter = Adapter<PortAType, never, "scoped", "async", false>;

    // Even though "scoped" was specified, the lifetime is normalized to "singleton"
    type NormalizedLifetime = ScopedAsyncAdapter["lifetime"];

    // Verify the normalization: lifetime should be "singleton", not "scoped"
    expectTypeOf<NormalizedLifetime>().toEqualTypeOf<"singleton">();
  });

  it("async adapter with transient lifetime should be constrained to singleton", () => {
    // Transient async is semantically invalid - async adapters are always singletons
    // The Adapter type normalizes lifetime to "singleton" when factoryKind is "async"
    type TransientAsyncAdapter = Adapter<PortAType, never, "transient", "async", false>;

    // Even though "transient" was specified, the lifetime is normalized to "singleton"
    type NormalizedLifetime = TransientAsyncAdapter["lifetime"];

    // Verify the normalization: lifetime should be "singleton", not "transient"
    expectTypeOf<NormalizedLifetime>().toEqualTypeOf<"singleton">();
  });

  it("sync adapter lifetime is NOT constrained", () => {
    // Sync adapters can have any lifetime
    type ScopedSync = Adapter<PortAType, never, "scoped", "sync", false>;
    type TransientSync = Adapter<PortAType, never, "transient", "sync", false>;
    type SingletonSync = Adapter<PortAType, never, "singleton", "sync", false>;

    expectTypeOf<ScopedSync["lifetime"]>().toEqualTypeOf<"scoped">();
    expectTypeOf<TransientSync["lifetime"]>().toEqualTypeOf<"transient">();
    expectTypeOf<SingletonSync["lifetime"]>().toEqualTypeOf<"singleton">();
  });
});
