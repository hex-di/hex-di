/**
 * Type-level tests for async adapter singleton validation in batch operations.
 *
 * Verifies that `provideMany()` correctly treats async adapters as singletons
 * for captive dependency detection, consistent with `provideAsync()` behavior.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { createAsyncAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const ScopedPort = createPort<"Scoped", { scoped: true }>("Scoped");
const AsyncPort = createPort<"AsyncService", { async: true }>("AsyncService");
const SingletonPort = createPort<"SingletonService", { singleton: true }>("SingletonService");

// Scoped adapter
const ScopedAdapter = createAdapter({
  provides: ScopedPort,
  requires: [] as const,
  lifetime: "scoped",
  factory: () => ({ scoped: true as const }),
});

// Async adapter that depends on scoped port - should trigger captive error
// Note: Async adapters are ALWAYS singletons at runtime
const AsyncAdapterWithScopedDep = createAsyncAdapter({
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
    // With provideAsync(), this DOES detect the captive dependency
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

  it("should match provideAsync() behavior for consistency", () => {
    // Reference: provideAsync() correctly detects captive
    const withProvideAsync = GraphBuilder.create()
      .provide(ScopedAdapter)
      .provideAsync(AsyncAdapterWithScopedDep);

    type ProvideAsyncResult = typeof withProvideAsync;
    type ProvideAsyncHasProvide = ProvideAsyncResult extends { provide: unknown } ? true : false;

    // provideAsync() should detect captive (no provide method on error)
    expectTypeOf<ProvideAsyncHasProvide>().toEqualTypeOf<false>();

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
  const TransientPort = createPort<"Transient", { transient: true }>("Transient");

  const TransientAdapter = createAdapter({
    provides: TransientPort,
    requires: [] as const,
    lifetime: "transient",
    factory: () => ({ transient: true as const }),
  });

  // Async adapter requiring transient - also captive!
  const AsyncWithTransient = createAsyncAdapter({
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
