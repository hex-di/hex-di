/**
 * Type tests for async lifetime enforcement.
 *
 * Verifies that async factories with non-singleton lifetimes produce
 * compile-time errors with helpful messages.
 *
 * Requirements tested:
 * - ASYNC-01: Async factory with `lifetime: 'scoped'` produces compile error
 * - ASYNC-02: Async factory with `lifetime: 'transient'` produces compile error
 * - ASYNC-03: Async factory with `lifetime: 'singleton'` compiles successfully
 * - ASYNC-04: Async factory with lifetime omitted compiles (defaults to singleton)
 * - ASYNC-05: Error type includes helpful message and hint
 */

import { describe, it, expectTypeOf } from "vitest";
import { port, createAdapter, createPort, type AsyncLifetimeError } from "../src/index.js";
import { ResultAsync } from "@hex-di/result";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TestService {
  doWork(): void;
}

interface DepService {
  getValue(): number;
}

const TestPort = port<TestService>()({ name: "Test" });
const DepPort = port<DepService>()({ name: "Dep" });

// =============================================================================
// ASYNC-01: Async + scoped = Error
// =============================================================================

describe("ASYNC-01: ResultAsync factory with scoped lifetime", () => {
  it("produces error type in lifetime position", () => {
    const adapter = createAdapter({
      provides: TestPort,
      lifetime: "scoped",
      factory: () => ResultAsync.ok({ doWork: () => {} }),
    });

    // Lifetime should be the error type, not "scoped"
    expectTypeOf(adapter.lifetime).toEqualTypeOf<AsyncLifetimeError<"scoped">>();
  });

  it("error message includes 'scoped' in the message", () => {
    const adapter = createAdapter({
      provides: TestPort,
      lifetime: "scoped",
      factory: () => ResultAsync.ok({ doWork: () => {} }),
    });

    expectTypeOf(
      adapter.lifetime
    ).toEqualTypeOf<"Async factories must use 'singleton' lifetime. Got: 'scoped'. Hint: Remove the lifetime property to use the default, or make the factory synchronous.">();
  });

  it("works with requires array", () => {
    const adapter = createAdapter({
      provides: TestPort,
      requires: [DepPort],
      lifetime: "scoped",
      factory: deps => {
        void deps.Dep.getValue();
        return ResultAsync.ok({ doWork: () => {} });
      },
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<AsyncLifetimeError<"scoped">>();
  });
});

// =============================================================================
// ASYNC-02: Async + transient = Error
// =============================================================================

describe("ASYNC-02: ResultAsync factory with transient lifetime", () => {
  it("produces error type in lifetime position", () => {
    const adapter = createAdapter({
      provides: TestPort,
      lifetime: "transient",
      factory: () => ResultAsync.ok({ doWork: () => {} }),
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<AsyncLifetimeError<"transient">>();
  });

  it("error message includes 'transient' in the message", () => {
    const adapter = createAdapter({
      provides: TestPort,
      lifetime: "transient",
      factory: () => ResultAsync.ok({ doWork: () => {} }),
    });

    expectTypeOf(
      adapter.lifetime
    ).toEqualTypeOf<"Async factories must use 'singleton' lifetime. Got: 'transient'. Hint: Remove the lifetime property to use the default, or make the factory synchronous.">();
  });

  it("works with all explicit parameters", () => {
    const adapter = createAdapter({
      provides: TestPort,
      requires: [],
      lifetime: "transient",
      clonable: false,
      factory: () => ResultAsync.ok({ doWork: () => {} }),
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<AsyncLifetimeError<"transient">>();
  });
});

// =============================================================================
// ASYNC-03: Async + singleton = OK
// =============================================================================

describe("ASYNC-03: ResultAsync factory with singleton lifetime", () => {
  it("compiles successfully with singleton lifetime", () => {
    const adapter = createAdapter({
      provides: TestPort,
      lifetime: "singleton",
      factory: () => ResultAsync.ok({ doWork: () => {} }),
    });

    // Should be the actual "singleton" type, not error
    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"async">();
  });

  it("works with requires and all explicit parameters", () => {
    const adapter = createAdapter({
      provides: TestPort,
      requires: [DepPort],
      lifetime: "singleton",
      clonable: true,
      factory: deps => {
        void deps.Dep.getValue();
        return ResultAsync.ok({ doWork: () => {} });
      },
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"async">();
    expectTypeOf(adapter.clonable).toEqualTypeOf<true>();
  });
});

// =============================================================================
// ASYNC-04: Async + omitted lifetime = OK (defaults to singleton)
// =============================================================================

describe("ASYNC-04: ResultAsync factory with lifetime omitted", () => {
  it("compiles with default singleton lifetime", () => {
    const adapter = createAdapter({
      provides: TestPort,
      factory: () => ResultAsync.ok({ doWork: () => {} }),
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"async">();
  });

  it("works with requires but no lifetime", () => {
    const adapter = createAdapter({
      provides: TestPort,
      requires: [DepPort],
      factory: deps => {
        void deps.Dep.getValue();
        return ResultAsync.ok({ doWork: () => {} });
      },
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"async">();
  });
});

// =============================================================================
// ASYNC-05: Error message is actionable
// =============================================================================

describe("ASYNC-05: error message is actionable", () => {
  it("error type template includes the problematic lifetime", () => {
    // Type-level assertion that error includes the specified lifetime
    type ScopedError = AsyncLifetimeError<"scoped">;
    expectTypeOf<ScopedError>().toEqualTypeOf<"Async factories must use 'singleton' lifetime. Got: 'scoped'. Hint: Remove the lifetime property to use the default, or make the factory synchronous.">();

    type TransientError = AsyncLifetimeError<"transient">;
    expectTypeOf<TransientError>().toEqualTypeOf<"Async factories must use 'singleton' lifetime. Got: 'transient'. Hint: Remove the lifetime property to use the default, or make the factory synchronous.">();
  });

  it("error message provides actionable hint", () => {
    // The hint suggests two solutions:
    // 1. Remove the lifetime property (use default singleton)
    // 2. Make the factory synchronous
    type Error = AsyncLifetimeError<"scoped">;

    // Verify hint content via string matching
    const errorContainsHint: Error extends `${string}Hint:${string}` ? true : false = true;
    expectTypeOf(errorContainsHint).toEqualTypeOf<true>();

    const errorMentionsDefault: Error extends `${string}default${string}` ? true : false = true;
    expectTypeOf(errorMentionsDefault).toEqualTypeOf<true>();

    const errorMentionsSynchronous: Error extends `${string}synchronous${string}` ? true : false =
      true;
    expectTypeOf(errorMentionsSynchronous).toEqualTypeOf<true>();
  });
});

// =============================================================================
// Sync factories are not affected
// =============================================================================

describe("sync factories unaffected by async lifetime enforcement", () => {
  it("sync factory with scoped works", () => {
    const adapter = createAdapter({
      provides: TestPort,
      lifetime: "scoped",
      factory: () => ({ doWork: () => {} }),
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<"scoped">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"sync">();
  });

  it("sync factory with transient works", () => {
    const adapter = createAdapter({
      provides: TestPort,
      lifetime: "transient",
      factory: () => ({ doWork: () => {} }),
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<"transient">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"sync">();
  });

  it("sync factory with singleton works", () => {
    const adapter = createAdapter({
      provides: TestPort,
      lifetime: "singleton",
      factory: () => ({ doWork: () => {} }),
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"sync">();
  });

  it("sync factory with omitted lifetime defaults to singleton", () => {
    const adapter = createAdapter({
      provides: TestPort,
      factory: () => ({ doWork: () => {} }),
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"sync">();
  });
});

// =============================================================================
// Class-based adapters are always sync
// =============================================================================

describe("class-based adapters unaffected", () => {
  class TestServiceImpl implements TestService {
    doWork(): void {}
  }

  it("class with scoped lifetime works", () => {
    const adapter = createAdapter({
      provides: TestPort,
      lifetime: "scoped",
      class: TestServiceImpl,
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<"scoped">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"sync">();
  });

  it("class with transient lifetime works", () => {
    const adapter = createAdapter({
      provides: TestPort,
      lifetime: "transient",
      class: TestServiceImpl,
    });

    expectTypeOf(adapter.lifetime).toEqualTypeOf<"transient">();
    expectTypeOf(adapter.factoryKind).toEqualTypeOf<"sync">();
  });
});
