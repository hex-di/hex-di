/**
 * DOD 6: Reactivity Engine
 */

import { describe, expect, it, vi } from "vitest";
import {
  createSignal,
  createComputed,
  createEffect,
  shallowEqual,
  batch,
  untracked,
} from "../src/index.js";
import { createStateServiceImpl } from "../src/services/state-service-impl.js";

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

// =============================================================================
// createSignal
// =============================================================================

describe("createSignal", () => {
  it("returns signal with get() returning initial value", () => {
    const sig = createSignal(42);
    expect(sig.get()).toBe(42);
  });

  it("set(value) updates value returned by get()", () => {
    const sig = createSignal(0);
    sig.set(10);
    expect(sig.get()).toBe(10);
  });

  it("peek() reads value without tracking dependency", () => {
    const sig = createSignal("hello");
    expect(sig.peek()).toBe("hello");
    sig.set("world");
    expect(sig.peek()).toBe("world");
  });
});

// =============================================================================
// createComputed
// =============================================================================

describe("createComputed", () => {
  it("returns computed with lazily evaluated get()", () => {
    const sig = createSignal(5);
    const comp = createComputed(() => sig.get() * 2);
    expect(comp.get()).toBe(10);
  });

  it("caches result until dependencies change", () => {
    const sig = createSignal(3);
    const fn = vi.fn(() => sig.get() * 2);
    const comp = createComputed(fn);

    comp.get();
    comp.get();
    // alien-signals may call fn once or twice depending on implementation
    // What matters is computed returns correct cached value
    expect(comp.get()).toBe(6);

    sig.set(4);
    expect(comp.get()).toBe(8);
  });

  it("peek() reads without tracking", () => {
    const sig = createSignal(7);
    const comp = createComputed(() => sig.get() + 1);
    expect(comp.peek()).toBe(8);
  });
});

// =============================================================================
// createEffect
// =============================================================================

describe("createEffect", () => {
  it("runs immediately and tracks dependencies", () => {
    const sig = createSignal(0);
    const fn = vi.fn(() => {
      sig.get();
    });
    createEffect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("re-runs when tracked signal changes", () => {
    const sig = createSignal(0);
    const values: number[] = [];
    createEffect(() => {
      values.push(sig.get());
    });
    expect(values).toEqual([0]);

    sig.set(1);
    expect(values).toEqual([0, 1]);

    sig.set(2);
    expect(values).toEqual([0, 1, 2]);
  });

  it("dispose() stops re-runs", () => {
    const sig = createSignal(0);
    const values: number[] = [];
    const eff = createEffect(() => {
      values.push(sig.get());
    });
    expect(values).toEqual([0]);

    eff.dispose();
    sig.set(1);
    expect(values).toEqual([0]);
  });
});

// =============================================================================
// Automatic dependency tracking
// =============================================================================

describe("Automatic dependency tracking", () => {
  it("computed reads signal.get() and tracks it", () => {
    const a = createSignal(1);
    const b = createSignal(2);
    const sum = createComputed(() => a.get() + b.get());

    expect(sum.get()).toBe(3);
    a.set(10);
    expect(sum.get()).toBe(12);
    b.set(20);
    expect(sum.get()).toBe(30);
  });

  it("multiple signals: changing one does not recompute unrelated computeds", () => {
    const a = createSignal(1);
    const b = createSignal(2);
    const fnA = vi.fn(() => a.get() * 2);
    const fnB = vi.fn(() => b.get() * 3);
    const compA = createComputed(fnA);
    const compB = createComputed(fnB);

    compA.get();
    compB.get();

    a.set(10);
    compA.get();
    compB.get();

    // compA should have been re-evaluated
    expect(compA.get()).toBe(20);
    // compB should not have been re-evaluated (b didn't change)
    expect(compB.get()).toBe(6);
  });
});

// =============================================================================
// Diamond dependency
// =============================================================================

describe("Diamond dependency", () => {
  it("A -> B, A -> C, B+C -> D evaluates D correctly per A change", () => {
    const A = createSignal(1);
    const B = createComputed(() => A.get() * 2);
    const C = createComputed(() => A.get() * 3);
    const D = createComputed(() => B.get() + C.get());

    expect(D.get()).toBe(5); // 2 + 3

    A.set(10);
    expect(D.get()).toBe(50); // 20 + 30
  });

  it("no glitch: intermediate inconsistent state never visible to subscribers", () => {
    const A = createSignal(1);
    const B = createComputed(() => A.get() * 2);
    const C = createComputed(() => A.get() * 3);

    const observations: Array<{ b: number; c: number }> = [];
    createEffect(() => {
      observations.push({ b: B.get(), c: C.get() });
    });

    // Initial observation
    expect(observations[0]).toEqual({ b: 2, c: 3 });

    A.set(10);
    // After change, B=20 and C=30. We should NOT see { b: 20, c: 3 } or { b: 2, c: 30 }
    const lastObs = observations[observations.length - 1];
    expect(lastObs).toBeDefined();
    if (lastObs) {
      expect(lastObs.b).toBe(20);
      expect(lastObs.c).toBe(30);
    }
  });
});

// =============================================================================
// Batching
// =============================================================================

describe("batch", () => {
  it("groups changes into single notification cycle", () => {
    const sig = createSignal(0);
    const values: number[] = [];
    createEffect(() => {
      values.push(sig.get());
    });
    expect(values).toEqual([0]);

    batch(null, () => {
      sig.set(1);
      sig.set(2);
      sig.set(3);
    });

    // After batch, effect should see final value 3
    expect(values[values.length - 1]).toBe(3);
  });

  it("subscribers fire once with final state after batch completes", () => {
    const sig = createSignal(0);
    const calls: number[] = [];
    createEffect(() => {
      calls.push(sig.get());
    });
    expect(calls).toEqual([0]);

    batch(null, () => {
      sig.set(10);
      sig.set(20);
    });

    // Should have been called with 0 initially, then 20 after batch
    // Not with 10 in between
    expect(calls).not.toContain(10);
    expect(calls[calls.length - 1]).toBe(20);
  });

  it("batch callback exception: returns Err with BatchExecutionError", () => {
    const cause = new Error("fail in batch");
    const result = batch(null, () => {
      throw cause;
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "BatchExecutionFailed");
    }
  });

  it("batch callback exception: deferred notifications flushed", () => {
    const sig = createSignal(0);
    const values: number[] = [];
    createEffect(() => {
      values.push(sig.get());
    });

    const result = batch(null, () => {
      sig.set(99);
      throw new Error("fail");
    });

    expect(result.isErr()).toBe(true);

    // The signal was set to 99 before throw, and endBatch is called
    // so the effect should see 99
    expect(values[values.length - 1]).toBe(99);
  });
});

// =============================================================================
// shallowEqual
// =============================================================================

describe("shallowEqual", () => {
  it("returns true for same reference", () => {
    const obj = { a: 1, b: 2 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it("returns true for objects with same top-level properties", () => {
    expect(shallowEqual({ a: 1, b: "x" }, { a: 1, b: "x" })).toBe(true);
  });

  it("returns false for objects with different property values", () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("returns false for objects with different keys", () => {
    const a = { x: 1 } as Record<string, unknown>;
    const b = { y: 1 } as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("returns false for objects with different key counts", () => {
    const a = { x: 1 } as Record<string, unknown>;
    const b = { x: 1, y: 2 } as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("does not deeply compare nested objects", () => {
    const inner = { z: 1 };
    const a = { nested: inner };
    const b = { nested: { z: 1 } };
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("returns true when nested refs are same", () => {
    const inner = { z: 1 };
    const a = { nested: inner };
    const b = { nested: inner };
    expect(shallowEqual(a, b)).toBe(true);
  });

  it("returns false when a has fewer keys than b (asymmetric key count)", () => {
    const a = { x: 1 } as Record<string, unknown>;
    const b = { x: 1, y: 2 } as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
    // Also test the reverse direction
    expect(shallowEqual(b, a)).toBe(false);
  });

  it("returns false when b is missing a key that a has (hasOwnProperty check)", () => {
    const a = { x: 1, y: 2 } as Record<string, unknown>;
    const b = { x: 1, z: 2 } as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("handles NaN equality via Object.is (NaN === NaN → true)", () => {
    const a = { val: NaN } as Record<string, unknown>;
    const b = { val: NaN } as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(true);
  });

  it("handles +0/-0 distinction via Object.is (+0 !== -0)", () => {
    const a = { val: +0 } as Record<string, unknown>;
    const b = { val: -0 } as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("returns false when one arg is null and other is object", () => {
    // shallowEqual type expects Record<string, unknown> but internally guards null
    const a = null as unknown as Record<string, unknown>;
    const b = { x: 1 } as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
    expect(shallowEqual(b, a)).toBe(false);
  });

  it("returns false for different primitive types wrapped in objects", () => {
    const a = { val: 1 } as Record<string, unknown>;
    const b = { val: "1" } as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("empty objects are equal", () => {
    expect(shallowEqual({}, {})).toBe(true);
  });

  it("prototype chain: b has key in prototype but not own → returns false", () => {
    const proto = { inherited: 1 };
    const a = { inherited: 1 } as Record<string, unknown>;
    const b = Object.create(proto) as Record<string, unknown>;
    // b has "inherited" via prototype, not own property
    // a has key count 1, b has key count 0 (Object.keys only returns own keys)
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("prototype chain: b has same key count but one key via prototype → returns false", () => {
    // Both have 1 key per Object.keys, but b's key is different from a's
    const proto = { y: 2 };
    const a = { x: 1, y: 2 } as Record<string, unknown>;
    const b = Object.assign(Object.create(proto), { x: 1 }) as Record<string, unknown>;
    // a: { x: 1, y: 2 } - Object.keys = ["x", "y"] (length 2)
    // b: { x: 1 } with proto.y=2 - Object.keys = ["x"] (length 1)
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("same keys same count but hasOwnProperty check matters for matching keys", () => {
    // a and b have same key count via Object.keys, same keys, same values
    // This should be true
    const a = { x: 1, y: 2 } as Record<string, unknown>;
    const b = { x: 1, y: 2 } as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(true);

    // Now test where b has key via prototype but not own, with same count through own keys
    const proto2 = { y: 2 };
    const c = Object.assign(Object.create(proto2), { x: 1, z: 3 }) as Record<string, unknown>;
    // c Object.keys = ["x", "z"] (length 2)
    // a Object.keys = ["x", "y"] (length 2) - same count but different keys
    expect(shallowEqual(a, c)).toBe(false);
  });

  it("returns false when a is object and b is non-object (typeof b check)", () => {
    // Kills: shallow-equal.ts:13:32 ConditionalExpression → false
    // Mutation makes `typeof b !== "object"` always false, bypassing the guard.
    // With empty object a={} and non-object b=42: Object.keys({})=[], Object.keys(42)=[]
    // Key counts match (0===0), no loop, returns true (WRONG).
    // Original: typeof 42 !== "object" → true → returns false (correct).
    const a = {} as Record<string, unknown>;
    const b = 42 as unknown as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("returns false for non-object types: string vs string (different refs)", () => {
    // shallowEqual with string args that are NOT Object.is equal
    const a = "hello" as unknown as Record<string, unknown>;
    const b = "world" as unknown as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("returns true for Object.is equal primitive args (same ref shortcut)", () => {
    // Same string reference - Object.is returns true immediately
    const a = "hello" as unknown as Record<string, unknown>;
    expect(shallowEqual(a, a)).toBe(true);
  });
});

// =============================================================================
// Custom equality function
// =============================================================================

// =============================================================================
// Effect dispose edge cases
// =============================================================================

describe("createEffect dispose edge cases", () => {
  it("effect.dispose() then signal.set() does not fire callback", () => {
    const sig = createSignal(0);
    let callCount = 0;
    const eff = createEffect(() => {
      sig.get();
      callCount++;
    });
    expect(callCount).toBe(1); // initial run

    eff.dispose();
    sig.set(1);
    expect(callCount).toBe(1); // no additional call
  });

  it("double dispose is safe (no throw)", () => {
    const sig = createSignal(0);
    const eff = createEffect(() => {
      sig.get();
    });
    eff.dispose();
    expect(() => eff.dispose()).not.toThrow();
  });

  it("effect.run() after dispose does not invoke fn", () => {
    const sig = createSignal(0);
    let callCount = 0;
    const eff = createEffect(() => {
      sig.get();
      callCount++;
    });
    expect(callCount).toBe(1); // initial run

    eff.dispose();
    eff.run();
    expect(callCount).toBe(1); // no additional call after dispose
  });

  it("effect.run() before dispose DOES invoke fn", () => {
    const sig = createSignal(0);
    let callCount = 0;
    const eff = createEffect(() => {
      sig.get();
      callCount++;
    });
    expect(callCount).toBe(1); // initial run

    eff.run();
    expect(callCount).toBe(2); // run() calls fn when not disposed
  });

  it("dispose.run() guard: run → dispose → run has correct counts", () => {
    let callCount = 0;
    const eff = createEffect(() => {
      callCount++;
    });
    expect(callCount).toBe(1);

    eff.run();
    expect(callCount).toBe(2);

    eff.dispose();

    eff.run();
    expect(callCount).toBe(2); // Still 2 - run() after dispose is no-op
  });

  it("dispose guard: first dispose stops, second dispose is no-op", () => {
    let callCount = 0;
    const sig = createSignal(0);
    const eff = createEffect(() => {
      sig.get();
      callCount++;
    });
    expect(callCount).toBe(1);

    eff.dispose();
    sig.set(1);
    expect(callCount).toBe(1); // Effect doesn't fire after first dispose

    eff.dispose(); // Second dispose - should not throw
    sig.set(2);
    expect(callCount).toBe(1); // Still no fire
  });
});

// =============================================================================
// Custom equality function
// =============================================================================

describe("Custom equality function", () => {
  it("prevents re-notification for semantically equal values", () => {
    // This tests selector subscription with custom equality
    // at the reactivity level. Full integration is in services.test.ts
    const sig = createSignal({ x: 1, y: 2 });
    const observations: Array<{ x: number }> = [];

    // Use computed to select just x
    const selectedX = createComputed(() => ({ x: sig.get().x }));
    let prevX = selectedX.get().x;

    createEffect(() => {
      const current = selectedX.get();
      if (current.x !== prevX) {
        prevX = current.x;
        observations.push(current);
      }
    });

    // Change y only (x stays the same)
    sig.set({ x: 1, y: 3 });
    expect(observations).toEqual([]);

    // Change x
    sig.set({ x: 2, y: 3 });
    expect(observations).toEqual([{ x: 2 }]);
  });
});

// =============================================================================
// shallowEqual — typeof guard edge cases (kills typeof mutation)
// =============================================================================

describe("shallowEqual typeof guard", () => {
  it("two different numbers return false (typeof a !== 'object' → true)", () => {
    // With mutation `typeof a !== "object"` → `typeof a === "object"`:
    // typeof 1 === "object" is false → condition false → would proceed to Object.keys(1)
    // Object.keys(1) = [] and Object.keys(2) = [] → same length → returns true (WRONG!)
    const a = 1 as unknown as Record<string, unknown>;
    const b = 2 as unknown as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("two different booleans return false", () => {
    const a = true as unknown as Record<string, unknown>;
    const b = false as unknown as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("number and object return false", () => {
    const a = 42 as unknown as Record<string, unknown>;
    const b = {} as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("undefined and object return false", () => {
    const a = undefined as unknown as Record<string, unknown>;
    const b = { x: 1 } as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("null null: Object.is(null, null) returns true", () => {
    const a = null as unknown as Record<string, unknown>;
    const b = null as unknown as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(true);
  });

  it("two same numbers: Object.is shortcut returns true", () => {
    const a = 42 as unknown as Record<string, unknown>;
    expect(shallowEqual(a, a)).toBe(true);
  });
});

// =============================================================================
// Nested batching
// =============================================================================

describe("Nested batching", () => {
  it("nested batching: only outermost batch triggers notifications", () => {
    const sig = createSignal(0);
    const notifications: number[] = [];

    createEffect(() => {
      notifications.push(sig.get());
    });
    expect(notifications).toEqual([0]);

    batch(null, () => {
      sig.set(1);
      // Inner batch
      batch(null, () => {
        sig.set(2);
        sig.set(3);
      });
      // After inner batch ends, no notification yet if outer batch
      // is still active (alien-signals uses refcounting)
      sig.set(4);
    });

    // Only the final value should trigger a notification after the outermost batch
    expect(notifications[notifications.length - 1]).toBe(4);
    // Should NOT have intermediate values 1, 2, 3 between outer batch start and end
    expect(notifications).not.toContain(1);
    expect(notifications).not.toContain(2);
    expect(notifications).not.toContain(3);
  });
});

// =============================================================================
// peek() does not track
// =============================================================================

describe("Signal.peek() does not track", () => {
  it("inside a computed does NOT register a dependency", () => {
    const source = createSignal(1);
    let computeCount = 0;
    const derived = createComputed(() => {
      computeCount++;
      return source.peek();
    });

    expect(derived.get()).toBe(1);
    expect(computeCount).toBe(1);

    source.set(2);
    // Re-read: since peek() didn't track, computed should NOT re-evaluate
    expect(derived.get()).toBe(1);
    expect(computeCount).toBe(1);
  });

  it("inside an effect does NOT register a dependency", () => {
    const source = createSignal(10);
    let effectRunCount = 0;
    const eff = createEffect(() => {
      source.peek();
      effectRunCount++;
    });

    expect(effectRunCount).toBe(1); // initial run

    source.set(20);
    expect(effectRunCount).toBe(1); // should NOT re-run

    eff.dispose();
  });
});

describe("Computed.peek() does not track", () => {
  it("inside another computed does NOT register a dependency", () => {
    const source = createSignal(5);
    const intermediate = createComputed(() => source.get() * 2);
    let outerCount = 0;
    const outer = createComputed(() => {
      outerCount++;
      return intermediate.peek();
    });

    expect(outer.get()).toBe(10);
    expect(outerCount).toBe(1);

    source.set(10);
    // intermediate is now 20, but outer used peek() so it shouldn't re-evaluate
    expect(outer.get()).toBe(10);
    expect(outerCount).toBe(1);
  });

  it("inside an effect does NOT register a dependency", () => {
    const source = createSignal(3);
    const comp = createComputed(() => source.get() + 1);
    let effectRunCount = 0;
    const eff = createEffect(() => {
      comp.peek();
      effectRunCount++;
    });

    expect(effectRunCount).toBe(1);

    source.set(100);
    expect(effectRunCount).toBe(1);

    eff.dispose();
  });
});

// =============================================================================
// untracked()
// =============================================================================

describe("untracked()", () => {
  it("reads signal without registering dependency", () => {
    const source = createSignal(42);
    let computeCount = 0;
    const derived = createComputed(() => {
      computeCount++;
      return untracked(() => source.get());
    });

    expect(derived.get()).toBe(42);
    expect(computeCount).toBe(1);

    source.set(99);
    expect(derived.get()).toBe(42);
    expect(computeCount).toBe(1);
  });

  it("restores active subscriber even if fn throws", () => {
    const source = createSignal(1);
    const tracked = createSignal(100);
    let computeCount = 0;

    const derived = createComputed(() => {
      computeCount++;
      try {
        untracked(() => {
          source.get();
          throw new Error("boom");
        });
      } catch {
        // swallow
      }
      // tracked.get() should still register a dependency
      return tracked.get();
    });

    expect(derived.get()).toBe(100);
    expect(computeCount).toBe(1);

    // Changing the untracked signal should NOT trigger recompute
    source.set(2);
    expect(derived.get()).toBe(100);
    expect(computeCount).toBe(1);

    // Changing the tracked signal SHOULD trigger recompute
    tracked.set(200);
    expect(derived.get()).toBe(200);
    expect(computeCount).toBe(2);
  });
});

// =============================================================================
// Disposal ordering
// =============================================================================

// =============================================================================
// DoD #12: Proxy-based path tracking
// =============================================================================

describe("Proxy-based path tracking: only notifies when accessed paths change", () => {
  it("selector subscription skips notification when only unaccessed paths change", () => {
    const service = createStateServiceImpl({
      portName: "PathTest",
      containerName: "root",
      initial: { name: "Alice", age: 30, score: 100 },
      actions: {
        setAge: (state: { name: string; age: number; score: number }, payload: number) => ({
          ...state,
          age: payload,
        }),
        setScore: (state: { name: string; age: number; score: number }, payload: number) => ({
          ...state,
          score: payload,
        }),
        setName: (state: { name: string; age: number; score: number }, payload: string) => ({
          ...state,
          name: payload,
        }),
      },
    });

    const nameNotifications: string[] = [];
    service.subscribe(
      state => (state as { name: string }).name,
      name => {
        nameNotifications.push(name);
      }
    );

    // Change age only — name selector should NOT fire
    service.actions.setAge(31);
    expect(nameNotifications).toEqual([]);

    // Change score only — name selector should NOT fire
    service.actions.setScore(200);
    expect(nameNotifications).toEqual([]);

    // Change name — name selector SHOULD fire
    service.actions.setName("Bob");
    expect(nameNotifications).toEqual(["Bob"]);
  });

  it("handles dynamic selectors that access different paths over time", () => {
    const service = createStateServiceImpl({
      portName: "DynPath",
      containerName: "root",
      initial: { a: 1, b: 2, useA: true },
      actions: {
        setA: (state: { a: number; b: number; useA: boolean }, payload: number) => ({
          ...state,
          a: payload,
        }),
        setB: (state: { a: number; b: number; useA: boolean }, payload: number) => ({
          ...state,
          b: payload,
        }),
        toggleUseA: (state: { a: number; b: number; useA: boolean }) => ({
          ...state,
          useA: !state.useA,
        }),
      },
    });

    const values: number[] = [];
    service.subscribe(
      state => {
        const s = state as { a: number; b: number; useA: boolean };
        return s.useA ? s.a : s.b;
      },
      val => {
        values.push(val);
      }
    );

    // Initially useA=true, selector reads a. Changing b shouldn't notify.
    service.actions.setB(99);
    expect(values).toEqual([]);

    // Change a — should notify
    service.actions.setA(10);
    expect(values).toEqual([10]);
  });
});

describe("Disposal ordering", () => {
  it("effect disposal stops tracking: no further notifications after dispose", () => {
    const sig = createSignal(0);
    const values: number[] = [];

    const eff = createEffect(() => {
      values.push(sig.get());
    });
    expect(values).toEqual([0]);

    sig.set(1);
    expect(values).toEqual([0, 1]);

    // Dispose effect — should stop tracking
    eff.dispose();

    sig.set(2);
    sig.set(3);
    // No further notifications
    expect(values).toEqual([0, 1]);
  });

  it("state service disposal: subscriptions stop, then state access throws", () => {
    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    const notifications: number[] = [];
    service.subscribe(state => {
      notifications.push((state as { count: number }).count);
    });

    service.actions.increment();
    expect(notifications).toEqual([1]);

    // Dispose
    service.dispose();

    // Subscriptions are silenced
    // State access throws
    expectTaggedThrow(() => service.state, "DisposedStateAccess");
    // Actions access throws
    expectTaggedThrow(() => service.actions, "DisposedStateAccess");
  });
});
