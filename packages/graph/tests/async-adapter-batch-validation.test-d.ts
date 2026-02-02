/**
 * Type-level tests for async adapter singleton validation in batch operations.
 *
 * Verifies that `provideMany()` correctly treats async adapters as singletons
 * for captive dependency detection, consistent with `provide()` behavior.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const ScopedPort = port<{ scoped: true }>()({ name: "Scoped" });
const AsyncPort = port<{ async: true }>()({ name: "AsyncService" });
const SingletonPort = port<{ singleton: true }>()({ name: "SingletonService" });

// Scoped adapter
const ScopedAdapter = createAdapter({
  provides: ScopedPort,
  requires: [] as const,
  lifetime: "scoped",
  factory: () => ({ scoped: true as const }),
});

// Async adapter that depends on scoped port - should trigger captive error
// Note: Async adapters are ALWAYS singletons at runtime
const AsyncAdapterWithScopedDep = createAdapter({
  provides: AsyncPort,
  requires: [ScopedPort] as const,
  factory: async () => ({ async: true as const }),
});

// Singleton adapter that depends on scoped port - also captive
const SingletonWithScopedDep = createAdapter({
  provides: SingletonPort,
  requires: [ScopedPort] as const,
  lifetime: "singleton",
  factory: () => ({ singleton: true as const }),
});

// =============================================================================
// provideMany() Async Adapter Validation Tests
// =============================================================================

describe("provideMany() async adapter captive detection", () => {
  it("should detect captive dependency when async adapter requires scoped", () => {
    // With provide(), this DOES detect the captive dependency
    // provideMany() should behave consistently
    const builder = GraphBuilder.create().provide(ScopedAdapter);

    // Using provideMany with async adapter that requires scoped
    const result = builder.provideMany([AsyncAdapterWithScopedDep] as const);

    // Result should be an error type, not a valid builder
    type ResultType = typeof result;

    // Check that result has error indication
    // If this passes with valid GraphBuilder type, the bug exists
    type HasProvide = ResultType extends { provide: unknown } ? true : false;

    // After fix: Should NOT have provide method (should be error type)
    // This test documents the expected behavior
    expectTypeOf<HasProvide>().toEqualTypeOf<false>();
  });

  it("should match provide() behavior for consistency", () => {
    // Reference: provide() correctly detects captive
    const withProvide = GraphBuilder.create()
      .provide(ScopedAdapter)
      .provide(AsyncAdapterWithScopedDep);

    type ProvideResult = typeof withProvide;
    type ProvideHasProvide = ProvideResult extends { provide: unknown } ? true : false;

    // provide() should detect captive (no provide method on error)
    expectTypeOf<ProvideHasProvide>().toEqualTypeOf<false>();

    // provideMany() should behave the same
    const withProvideMany = GraphBuilder.create()
      .provide(ScopedAdapter)
      .provideMany([AsyncAdapterWithScopedDep] as const);

    type ProvideManyResult = typeof withProvideMany;
    type ProvideManyHasProvide = ProvideManyResult extends { provide: unknown } ? true : false;

    // provideMany() should also detect captive
    expectTypeOf<ProvideManyHasProvide>().toEqualTypeOf<false>();
  });

  it("should detect captive when sync singleton requires scoped via provideMany", () => {
    // Baseline: sync singleton with scoped dep should be detected
    const builder = GraphBuilder.create().provide(ScopedAdapter);
    const result = builder.provideMany([SingletonWithScopedDep] as const);

    type ResultType = typeof result;
    type HasProvide = ResultType extends { provide: unknown } ? true : false;

    // Sync singleton captive should be detected
    expectTypeOf<HasProvide>().toEqualTypeOf<false>();
  });
});

describe("batch with mixed sync and async adapters", () => {
  const TransientPort = port<{ transient: true }>()({ name: "Transient" });

  const TransientAdapter = createAdapter({
    provides: TransientPort,
    requires: [] as const,
    lifetime: "transient",
    factory: () => ({ transient: true as const }),
  });

  // Async adapter requiring transient - also captive!
  const AsyncWithTransient = createAdapter({
    provides: AsyncPort,
    requires: [TransientPort] as const,
    factory: async () => ({ async: true as const }),
  });

  it("should detect captive when async adapter requires transient", () => {
    const result = GraphBuilder.create()
      .provide(TransientAdapter)
      .provideMany([AsyncWithTransient] as const);

    type ResultType = typeof result;
    type HasProvide = ResultType extends { provide: unknown } ? true : false;

    // Async (singleton) requiring transient is captive
    expectTypeOf<HasProvide>().toEqualTypeOf<false>();
  });
});
