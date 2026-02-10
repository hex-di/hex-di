import { describe, it, expect, vi } from "vitest";
import {
  createSignal,
  createComputed,
  createEffect,
  untracked,
  createIsolatedReactiveSystem,
} from "../../src/index.js";

// =============================================================================
// createSignal
// =============================================================================

describe("createSignal", () => {
  it("returns initial value on get()", () => {
    const s = createSignal(42);
    expect(s.get()).toBe(42);
  });

  it("updates value via set()", () => {
    const s = createSignal("hello");
    s.set("world");
    expect(s.get()).toBe("world");
  });

  it("peek() reads without tracking dependencies", () => {
    const source = createSignal(10);
    let computedRunCount = 0;

    const derived = createComputed(() => {
      computedRunCount++;
      return source.get() * 2;
    });

    // Initial read triggers computation
    expect(derived.get()).toBe(20);
    expect(computedRunCount).toBe(1);

    // Create a computed that uses peek — should NOT track source
    let peekRunCount = 0;
    const peeking = createComputed(() => {
      peekRunCount++;
      return source.peek() + 1;
    });

    expect(peeking.get()).toBe(11);
    expect(peekRunCount).toBe(1);
  });

  it("works with isolated reactive system", () => {
    const system = createIsolatedReactiveSystem();
    const s = createSignal(100, system);
    expect(s.get()).toBe(100);
    s.set(200);
    expect(s.get()).toBe(200);
    expect(s.peek()).toBe(200);
  });
});

// =============================================================================
// createComputed
// =============================================================================

describe("createComputed", () => {
  it("derives value from signal", () => {
    const count = createSignal(3);
    const doubled = createComputed(() => count.get() * 2);
    expect(doubled.get()).toBe(6);
  });

  it("re-computes when dependency changes", () => {
    const name = createSignal("Alice");
    const greeting = createComputed(() => `Hello, ${name.get()}`);
    expect(greeting.get()).toBe("Hello, Alice");

    name.set("Bob");
    expect(greeting.get()).toBe("Hello, Bob");
  });

  it("caches value when dependencies are unchanged", () => {
    let runCount = 0;
    const source = createSignal(1);
    const derived = createComputed(() => {
      runCount++;
      return source.get() + 10;
    });

    expect(derived.get()).toBe(11);
    expect(runCount).toBe(1);

    // Reading again without changes should not recompute
    expect(derived.get()).toBe(11);
    expect(runCount).toBe(1);
  });

  it("handles diamond dependency graph", () => {
    const root = createSignal(1);
    const left = createComputed(() => root.get() + 10);
    const right = createComputed(() => root.get() * 2);
    const bottom = createComputed(() => left.get() + right.get());

    expect(bottom.get()).toBe(13); // (1+10) + (1*2) = 13

    root.set(5);
    expect(bottom.get()).toBe(25); // (5+10) + (5*2) = 25
  });

  it("peek() reads without tracking", () => {
    const source = createSignal(7);
    const derived = createComputed(() => source.get() * 3);
    expect(derived.peek()).toBe(21);
  });

  it("supports nested computed chains", () => {
    const a = createSignal(1);
    const b = createComputed(() => a.get() + 1);
    const c = createComputed(() => b.get() + 1);
    const d = createComputed(() => c.get() + 1);
    expect(d.get()).toBe(4);

    a.set(10);
    expect(d.get()).toBe(13);
  });

  it("works with isolated reactive system", () => {
    const system = createIsolatedReactiveSystem();
    const s = createSignal(5, system);
    const c = createComputed(() => s.get() * 3, system);
    expect(c.get()).toBe(15);

    s.set(10);
    expect(c.get()).toBe(30);
  });
});

// =============================================================================
// createEffect
// =============================================================================

describe("createEffect", () => {
  it("runs immediately on creation", () => {
    const fn = vi.fn();
    const effect = createEffect(fn);
    expect(fn).toHaveBeenCalledOnce();
    effect.dispose();
  });

  it("re-runs when tracked signal changes", () => {
    const count = createSignal(0);
    const values: number[] = [];

    const effect = createEffect(() => {
      values.push(count.get());
    });

    expect(values).toEqual([0]);

    count.set(1);
    expect(values).toEqual([0, 1]);

    count.set(2);
    expect(values).toEqual([0, 1, 2]);

    effect.dispose();
  });

  it("stops running after dispose()", () => {
    const count = createSignal(0);
    const values: number[] = [];

    const effect = createEffect(() => {
      values.push(count.get());
    });

    expect(values).toEqual([0]);
    effect.dispose();

    count.set(1);
    expect(values).toEqual([0]); // No additional runs
  });

  it("dispose() is idempotent", () => {
    const fn = vi.fn();
    const effect = createEffect(fn);
    effect.dispose();
    effect.dispose(); // Should not throw
    expect(fn).toHaveBeenCalledOnce();
  });

  it("run() re-executes the effect function", () => {
    let runCount = 0;
    const effect = createEffect(() => {
      runCount++;
    });

    expect(runCount).toBe(1);
    effect.run();
    expect(runCount).toBe(2);
    effect.dispose();
  });

  it("run() does nothing after dispose()", () => {
    let runCount = 0;
    const effect = createEffect(() => {
      runCount++;
    });

    expect(runCount).toBe(1);
    effect.dispose();
    effect.run();
    expect(runCount).toBe(1); // No additional runs
  });

  it("works with isolated reactive system", () => {
    const system = createIsolatedReactiveSystem();
    const s = createSignal(0, system);
    const values: number[] = [];

    const effect = createEffect(() => {
      values.push(s.get());
    }, system);

    expect(values).toEqual([0]);

    s.set(1);
    expect(values).toEqual([0, 1]);

    effect.dispose();
    s.set(2);
    expect(values).toEqual([0, 1]);
  });
});

// =============================================================================
// untracked
// =============================================================================

describe("untracked", () => {
  it("reads signal value without creating dependency", () => {
    const a = createSignal(1);
    const b = createSignal(10);
    let computeCount = 0;

    const derived = createComputed(() => {
      computeCount++;
      // a is tracked, b is untracked
      return a.get() + untracked(() => b.get());
    });

    expect(derived.get()).toBe(11);
    expect(computeCount).toBe(1);

    // Changing b should NOT trigger recomputation
    b.set(20);
    expect(derived.get()).toBe(11); // still cached since only a is tracked
    expect(computeCount).toBe(1);

    // Changing a SHOULD trigger recomputation (picking up new b value)
    a.set(2);
    expect(derived.get()).toBe(22); // 2 + 20
    expect(computeCount).toBe(2);
  });

  it("works with isolated reactive system", () => {
    const system = createIsolatedReactiveSystem();
    const a = createSignal(5, system);
    const b = createSignal(100, system);

    const derived = createComputed(() => {
      return a.get() + untracked(() => b.get(), system);
    }, system);

    expect(derived.get()).toBe(105);

    b.set(200);
    // b is untracked so derived should be cached
    expect(derived.get()).toBe(105);

    a.set(10);
    expect(derived.get()).toBe(210); // 10 + 200
  });
});
