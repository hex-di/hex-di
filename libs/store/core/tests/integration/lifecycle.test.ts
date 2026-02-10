/**
 * Integration Tests: Lifecycle
 *
 * Tests for service disposal, subscription cleanup, and
 * independent service lifecycle management.
 */

import { describe, it, expect, vi } from "vitest";
import { createSignal, createEffect } from "../../src/index.js";
import { createStateServiceImpl } from "../../src/services/state-service-impl.js";

function expectTaggedThrow(fn: () => unknown, tag: string): Record<string, unknown> {
  let thrown: unknown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  expect(thrown).toBeDefined();
  expect(thrown).toHaveProperty("_tag", tag);
  return thrown as Record<string, unknown>;
}
import { createDerivedServiceImpl } from "../../src/services/derived-service-impl.js";
import { createAtomServiceImpl } from "../../src/services/atom-service-impl.js";

// =============================================================================
// Service dispose cleans up all subscriptions
// =============================================================================

describe("Service dispose cleans up all subscriptions", () => {
  it("state service: all subscribers stop receiving after dispose", () => {
    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const listener3 = vi.fn();

    service.subscribe(listener1);
    service.subscribe(listener2);
    service.subscribe(listener3);

    expect(service.subscriberCount).toBe(3);

    service.actions.increment();
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener3).toHaveBeenCalledTimes(1);

    service.dispose();

    // After disposal, no further notifications should occur
    // and subscriberCount should be 0
    expect(service.subscriberCount).toBe(0);
  });

  it("derived service: all subscribers stop receiving after dispose", () => {
    const source = createSignal(1);
    const derived = createDerivedServiceImpl<number>({
      portName: "Double",
      containerName: "test",
      select: () => source.get() * 2,
    });

    const listener1 = vi.fn();
    const listener2 = vi.fn();

    derived.subscribe(listener1);
    derived.subscribe(listener2);

    expect(derived.subscriberCount).toBe(2);

    source.set(5);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    derived.dispose();
    expect(derived.subscriberCount).toBe(0);
  });

  it("atom service: all subscribers stop receiving after dispose", () => {
    const atom = createAtomServiceImpl({
      portName: "Theme",
      containerName: "test",
      initial: "light" as "light" | "dark",
    });

    const listener = vi.fn();
    atom.subscribe(listener);

    atom.set("dark");
    expect(listener).toHaveBeenCalledTimes(1);

    atom.dispose();
    expect(atom.subscriberCount).toBe(0);
  });
});

// =============================================================================
// After dispose, accessing state throws DisposedStateAccessError
// =============================================================================

describe("After dispose, accessing state throws DisposedStateAccessError", () => {
  it("state service: .state throws after dispose", () => {
    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    service.dispose();
    expectTaggedThrow(() => service.state, "DisposedStateAccess");
  });

  it("state service: .actions throws after dispose", () => {
    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    service.dispose();
    expectTaggedThrow(() => service.actions, "DisposedStateAccess");
  });

  it("state service: .subscribe throws after dispose", () => {
    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    service.dispose();
    expectTaggedThrow(() => service.subscribe(vi.fn()), "DisposedStateAccess");
  });

  it("derived service: .value throws after dispose", () => {
    const derived = createDerivedServiceImpl<number>({
      portName: "Double",
      containerName: "test",
      select: () => 42,
    });

    derived.dispose();
    expectTaggedThrow(() => derived.value, "DisposedStateAccess");
  });

  it("derived service: .subscribe throws after dispose", () => {
    const derived = createDerivedServiceImpl<number>({
      portName: "Double",
      containerName: "test",
      select: () => 42,
    });

    derived.dispose();
    expectTaggedThrow(() => derived.subscribe(vi.fn()), "DisposedStateAccess");
  });

  it("atom service: .value throws after dispose", () => {
    const atom = createAtomServiceImpl({
      portName: "Theme",
      containerName: "test",
      initial: "light",
    });

    atom.dispose();
    expectTaggedThrow(() => atom.value, "DisposedStateAccess");
  });

  it("atom service: .set throws after dispose", () => {
    const atom = createAtomServiceImpl({
      portName: "Theme",
      containerName: "test",
      initial: "light",
    });

    atom.dispose();
    expectTaggedThrow(() => atom.set("dark"), "DisposedStateAccess");
  });

  it("DisposedStateAccessError includes correct portName and containerName", () => {
    const service = createStateServiceImpl({
      portName: "MyPort",
      containerName: "myContainer",
      initial: { value: 0 },
      actions: {
        set: (_: { value: number }, v: number) => ({ value: v }),
      },
    });

    service.dispose();

    const err = expectTaggedThrow(() => service.state, "DisposedStateAccess");
    expect(err.portName).toBe("MyPort");
    expect(err.containerName).toBe("myContainer");
    expect(err.operation).toBe("state");
  });
});

// =============================================================================
// Multiple services can be disposed independently
// =============================================================================

describe("Multiple services can be disposed independently", () => {
  it("disposing one service does not affect another", () => {
    const counterA = createStateServiceImpl({
      portName: "CounterA",
      containerName: "test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    const counterB = createStateServiceImpl({
      portName: "CounterB",
      containerName: "test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    // Both work initially
    counterA.actions.increment();
    counterB.actions.increment();
    expect(counterA.state).toEqual({ count: 1 });
    expect(counterB.state).toEqual({ count: 1 });

    // Dispose A
    counterA.dispose();

    // A is disposed
    expectTaggedThrow(() => counterA.state, "DisposedStateAccess");

    // B still works fine
    counterB.actions.increment();
    expect(counterB.state).toEqual({ count: 2 });
  });

  it("disposing state service does not affect derived service using different sources", () => {
    const source = createSignal(10);

    const stateService = createStateServiceImpl({
      portName: "Counter",
      containerName: "test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    const derivedFromSignal = createDerivedServiceImpl<number>({
      portName: "DoubleSignal",
      containerName: "test",
      select: () => source.get() * 2,
    });

    expect(derivedFromSignal.value).toBe(20);

    // Dispose the state service
    stateService.dispose();

    // Derived from signal is unaffected
    source.set(15);
    expect(derivedFromSignal.value).toBe(30);
  });

  it("disposing atom and state independently", () => {
    const atom = createAtomServiceImpl({
      portName: "Theme",
      containerName: "test",
      initial: "light" as "light" | "dark",
    });

    const counter = createStateServiceImpl({
      portName: "Counter",
      containerName: "test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    atom.set("dark");
    counter.actions.increment();

    // Dispose atom
    atom.dispose();
    expectTaggedThrow(() => atom.value, "DisposedStateAccess");

    // Counter still works
    counter.actions.increment();
    expect(counter.state).toEqual({ count: 2 });

    // Dispose counter
    counter.dispose();
    expectTaggedThrow(() => counter.state, "DisposedStateAccess");
  });
});

// =============================================================================
// Effect cleanup on dispose
// =============================================================================

describe("Effect cleanup on dispose", () => {
  it("reactive effect stops tracking after dispose", () => {
    const sig = createSignal(0);
    const values: number[] = [];

    const eff = createEffect(() => {
      values.push(sig.get());
    });

    // Initial run
    expect(values).toEqual([0]);

    sig.set(1);
    expect(values).toEqual([0, 1]);

    eff.dispose();

    // After dispose, no more tracking
    sig.set(2);
    sig.set(3);
    expect(values).toEqual([0, 1]);
  });

  it("state service effects stop firing after service disposal", () => {
    const effectCalls: number[] = [];

    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: (ctx: { state: unknown }) => {
          effectCalls.push((ctx.state as { count: number }).count);
        },
      },
    });

    service.actions.increment();
    expect(effectCalls).toEqual([1]);

    service.dispose();
    // After disposal, calling actions would throw, so effects cannot fire
    expectTaggedThrow(() => service.actions, "DisposedStateAccess");
  });

  it("subscription unsubscribe functions still work after service dispose (no-op)", () => {
    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    const unsub = service.subscribe(vi.fn());

    service.dispose();

    // Calling unsub after dispose should not throw
    expect(() => unsub()).not.toThrow();
  });

  it("derived service with subscriptions: dispose cleans up all effects", () => {
    const source = createSignal(5);
    const derived = createDerivedServiceImpl<number>({
      portName: "Triple",
      containerName: "test",
      select: () => source.get() * 3,
    });

    const listener = vi.fn();
    derived.subscribe(listener);

    source.set(10);
    expect(listener).toHaveBeenCalledTimes(1);

    derived.dispose();

    // After disposal, source changes should not trigger the listener
    source.set(20);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
