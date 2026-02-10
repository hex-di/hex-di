import { describe, it, expectTypeOf } from "vitest";
import type {
  Signal,
  Computed,
  ReactiveEffect,
  ReactiveSystemInstance,
  ReactiveCacheEntry,
} from "../../src/index.js";
import {
  createSignal,
  createComputed,
  createEffect,
  createIsolatedReactiveSystem,
  createReactiveCacheEntry,
} from "../../src/index.js";

// =============================================================================
// Signal type tests
// =============================================================================

describe("Signal types", () => {
  it("Signal<T> has get/set/peek methods with correct types", () => {
    const s = createSignal(42);
    expectTypeOf(s).toEqualTypeOf<Signal<number>>();
    expectTypeOf(s.get).toEqualTypeOf<() => number>();
    expectTypeOf(s.set).toEqualTypeOf<(value: number) => void>();
    expectTypeOf(s.peek).toEqualTypeOf<() => number>();
  });

  it("Signal preserves generic type parameter", () => {
    const s = createSignal<string | null>(null);
    expectTypeOf(s).toEqualTypeOf<Signal<string | null>>();
    expectTypeOf(s.get()).toEqualTypeOf<string | null>();
  });
});

// =============================================================================
// Computed type tests
// =============================================================================

describe("Computed types", () => {
  it("Computed<T> has get/peek methods with correct types", () => {
    const c = createComputed(() => "hello");
    expectTypeOf(c).toEqualTypeOf<Computed<string>>();
    expectTypeOf(c.get).toEqualTypeOf<() => string>();
    expectTypeOf(c.peek).toEqualTypeOf<() => string>();
  });

  it("Computed infers return type from computation", () => {
    const s = createSignal(10);
    const c = createComputed(() => s.get() > 5);
    expectTypeOf(c).toEqualTypeOf<Computed<boolean>>();
  });
});

// =============================================================================
// ReactiveEffect type tests
// =============================================================================

describe("ReactiveEffect types", () => {
  it("ReactiveEffect has run/dispose methods", () => {
    const e = createEffect(() => {});
    expectTypeOf(e).toEqualTypeOf<ReactiveEffect>();
    expectTypeOf(e.run).toEqualTypeOf<() => void>();
    expectTypeOf(e.dispose).toEqualTypeOf<() => void>();
    e.dispose();
  });
});

// =============================================================================
// ReactiveSystemInstance type tests
// =============================================================================

describe("ReactiveSystemInstance types", () => {
  it("has correct method signatures", () => {
    const system = createIsolatedReactiveSystem();
    expectTypeOf(system).toMatchTypeOf<ReactiveSystemInstance>();
    expectTypeOf(system.startBatch).toEqualTypeOf<() => void>();
    expectTypeOf(system.endBatch).toEqualTypeOf<() => void>();
  });

  it("signal factory returns read/write function", () => {
    const system = createIsolatedReactiveSystem();
    const s = system.signal(42);
    expectTypeOf(s).toEqualTypeOf<{ (): number; (value: number): void }>();
  });

  it("computed factory returns read function", () => {
    const system = createIsolatedReactiveSystem();
    const c = system.computed(() => "hello");
    expectTypeOf(c).toEqualTypeOf<() => string>();
  });

  it("effect factory returns dispose function", () => {
    const system = createIsolatedReactiveSystem();
    const dispose = system.effect(() => {});
    expectTypeOf(dispose).toEqualTypeOf<() => void>();
    dispose();
  });
});

// =============================================================================
// ReactiveCacheEntry type tests
// =============================================================================

describe("ReactiveCacheEntry types", () => {
  it("preserves generic type parameters", () => {
    const entry = createReactiveCacheEntry<string, Error>("key");
    expectTypeOf(entry).toMatchTypeOf<ReactiveCacheEntry<string, Error>>();
    expectTypeOf(entry.data).toEqualTypeOf<Computed<string | undefined>>();
    expectTypeOf(entry.error).toEqualTypeOf<Computed<Error | null>>();
  });

  it("default error type is Error", () => {
    type DefaultEntry = ReactiveCacheEntry<string>;
    expectTypeOf<DefaultEntry["error"]>().toEqualTypeOf<Computed<Error | null>>();
  });
});
