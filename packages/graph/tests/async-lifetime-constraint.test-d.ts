/**
 * Test: Async Adapter Lifetime Constraint
 *
 * This test documents the actual behavior of async adapter lifetime constraints.
 *
 * ## Current Behavior
 * The `Adapter` type does NOT normalize lifetime at the type level. Instead,
 * the constraint is enforced at `createAdapter()` call sites via `EnforceAsyncLifetime`.
 *
 * This means:
 * - `createAdapter({ factory: async () => {...}, lifetime: "scoped" })` produces
 *   a compile-time error via EnforceAsyncLifetime
 * - Manually constructed `Adapter<..., "scoped", "async">` types preserve the specified
 *   lifetime without normalization
 *
 * ## Why This Matters
 * Async adapters are initialized once at container startup and cached.
 * The enforcement at createAdapter prevents invalid configurations from being created
 * through normal APIs, while allowing advanced type-level usage to specify any lifetime.
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { port, type Adapter } from "@hex-di/core";

// =============================================================================
// Test Fixtures
// =============================================================================

interface ServiceA {
  doA(): void;
}

const PortA = port<ServiceA>()({ name: "PortA" });
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

  it("async adapter with scoped lifetime preserves the specified lifetime (no type-level normalization)", () => {
    // The Adapter type does NOT normalize lifetime at the type level
    // Constraint enforcement happens at createAdapter() via EnforceAsyncLifetime
    type ScopedAsyncAdapter = Adapter<PortAType, never, "scoped", "async", false>;

    // The specified lifetime is preserved (not normalized at type level)
    type SpecifiedLifetime = ScopedAsyncAdapter["lifetime"];

    // Verify the lifetime is preserved as specified
    expectTypeOf<SpecifiedLifetime>().toEqualTypeOf<"scoped">();
  });

  it("async adapter with transient lifetime preserves the specified lifetime (no type-level normalization)", () => {
    // The Adapter type does NOT normalize lifetime at the type level
    // Constraint enforcement happens at createAdapter() via EnforceAsyncLifetime
    type TransientAsyncAdapter = Adapter<PortAType, never, "transient", "async", false>;

    // The specified lifetime is preserved (not normalized at type level)
    type SpecifiedLifetime = TransientAsyncAdapter["lifetime"];

    // Verify the lifetime is preserved as specified
    expectTypeOf<SpecifiedLifetime>().toEqualTypeOf<"transient">();
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
