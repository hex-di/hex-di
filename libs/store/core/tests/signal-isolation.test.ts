/**
 * Tests for Per-Container Signal Isolation via createIsolatedReactiveSystem
 */

import { describe, it, expect } from "vitest";
import { createIsolatedReactiveSystem } from "../src/reactivity/system-factory.js";
import { createSignal, createComputed, createEffect } from "../src/reactivity/signals.js";
import { batch } from "../src/reactivity/batch.js";

describe("createIsolatedReactiveSystem", () => {
  it("creates an independent reactive system", () => {
    const sys = createIsolatedReactiveSystem();
    expect(sys.signal).toBeDefined();
    expect(sys.computed).toBeDefined();
    expect(sys.effect).toBeDefined();
    expect(sys.startBatch).toBeDefined();
    expect(sys.endBatch).toBeDefined();
  });

  it("signal read/write works", () => {
    const sys = createIsolatedReactiveSystem();
    const s = sys.signal(10);
    expect(s()).toBe(10);
    s(20);
    expect(s()).toBe(20);
  });

  it("computed tracks signal dependencies", () => {
    const sys = createIsolatedReactiveSystem();
    const s = sys.signal(5);
    const c = sys.computed(() => s() * 2);
    expect(c()).toBe(10);
    s(7);
    expect(c()).toBe(14);
  });

  it("effect runs on dependency change", () => {
    const sys = createIsolatedReactiveSystem();
    const s = sys.signal(1);
    const values: number[] = [];
    sys.effect(() => {
      values.push(s());
    });
    // Effect runs immediately with initial value
    expect(values).toEqual([1]);
    s(2);
    expect(values).toEqual([1, 2]);
    s(3);
    expect(values).toEqual([1, 2, 3]);
  });

  it("effect dispose stops tracking", () => {
    const sys = createIsolatedReactiveSystem();
    const s = sys.signal(1);
    const values: number[] = [];
    const dispose = sys.effect(() => {
      values.push(s());
    });
    expect(values).toEqual([1]);
    dispose();
    s(2);
    expect(values).toEqual([1]); // no new notification after dispose
  });
});

describe("cross-system isolation", () => {
  it("batching in system A does not defer system B notifications", () => {
    const sysA = createIsolatedReactiveSystem();
    const sysB = createIsolatedReactiveSystem();

    const sigA = sysA.signal(0);
    const sigB = sysB.signal(0);

    const valuesA: number[] = [];
    const valuesB: number[] = [];

    sysA.effect(() => {
      valuesA.push(sigA());
    });
    sysB.effect(() => {
      valuesB.push(sigB());
    });

    expect(valuesA).toEqual([0]);
    expect(valuesB).toEqual([0]);

    // Batch in system A
    sysA.startBatch();
    sigA(1);
    sigA(2);

    // While A is still batching, B should still notify immediately
    sigB(10);
    expect(valuesB).toEqual([0, 10]); // B notified immediately

    // A has not flushed yet (still in batch)
    expect(valuesA).toEqual([0]);

    sysA.endBatch();
    // Now A flushes
    expect(valuesA).toEqual([0, 2]); // only final value after batch
  });

  it("signals from system A do not register as deps in system B computeds", () => {
    const sysA = createIsolatedReactiveSystem();
    const sysB = createIsolatedReactiveSystem();

    const sigA = sysA.signal(5);

    // Computed in system B tries to read system A's signal
    // Since they're in different systems, B's computed won't track sigA
    const compB = sysB.computed(() => sigA() * 2);

    // Initial read works (sigA is readable, just not tracked)
    expect(compB()).toBe(10);

    // Change sigA — compB won't know it changed because it's not tracked in B's graph
    sigA(10);
    // compB will still return the stale value because the dependency isn't in B's graph
    // (this is the desired isolation behavior)
    expect(compB()).toBe(10); // stale — didn't recompute
  });

  it("effects in system A queue do not run when system B flushes", () => {
    const sysA = createIsolatedReactiveSystem();
    const sysB = createIsolatedReactiveSystem();

    const sigA = sysA.signal(0);
    const sigB = sysB.signal(0);

    const logA: number[] = [];
    const logB: number[] = [];

    sysA.effect(() => {
      logA.push(sigA());
    });
    sysB.effect(() => {
      logB.push(sigB());
    });

    // Batch both
    sysA.startBatch();
    sysB.startBatch();

    sigA(1);
    sigB(1);

    // End B's batch first
    sysB.endBatch();

    // B flushed, A has not
    expect(logB).toEqual([0, 1]);
    expect(logA).toEqual([0]); // still deferred

    sysA.endBatch();
    expect(logA).toEqual([0, 1]); // now flushed
  });

  it("nested batching within one system works correctly", () => {
    const sys = createIsolatedReactiveSystem();
    const s = sys.signal(0);
    const log: number[] = [];

    sys.effect(() => {
      log.push(s());
    });
    expect(log).toEqual([0]);

    sys.startBatch();
    s(1);
    sys.startBatch();
    s(2);
    sys.endBatch(); // inner batch ends, but outermost not yet
    expect(log).toEqual([0]); // still deferred
    s(3);
    sys.endBatch(); // outermost ends, flush
    expect(log).toEqual([0, 3]); // only final value
  });

  it("diamond dependency solving works correctly per-system", () => {
    const sys = createIsolatedReactiveSystem();
    const a = sys.signal(1);
    const b = sys.computed(() => a() * 2);
    const c = sys.computed(() => a() * 3);
    const d = sys.computed(() => b() + c());

    expect(d()).toBe(5); // 2 + 3

    a(2);
    expect(d()).toBe(10); // 4 + 6

    a(3);
    expect(d()).toBe(15); // 6 + 9
  });

  it("disposal in one system does not affect the other", () => {
    const sysA = createIsolatedReactiveSystem();
    const sysB = createIsolatedReactiveSystem();

    const sigA = sysA.signal(0);
    const sigB = sysB.signal(0);

    const logA: number[] = [];
    const logB: number[] = [];

    const disposeA = sysA.effect(() => {
      logA.push(sigA());
    });
    sysB.effect(() => {
      logB.push(sigB());
    });

    disposeA();

    sigA(1);
    sigB(1);

    expect(logA).toEqual([0]); // disposed, no updates
    expect(logB).toEqual([0, 1]); // still works
  });
});

describe("createSignal/createComputed/createEffect with system parameter", () => {
  it("createSignal with system uses isolated system", () => {
    const sys = createIsolatedReactiveSystem();
    const sig = createSignal(42, sys);
    expect(sig.get()).toBe(42);
    sig.set(100);
    expect(sig.get()).toBe(100);
  });

  it("createComputed with system uses isolated system", () => {
    const sys = createIsolatedReactiveSystem();
    const sig = createSignal(5, sys);
    const comp = createComputed(() => sig.get() * 2, sys);
    expect(comp.get()).toBe(10);
    sig.set(10);
    expect(comp.get()).toBe(20);
  });

  it("createEffect with system uses isolated system", () => {
    const sys = createIsolatedReactiveSystem();
    const sig = createSignal(0, sys);
    const log: number[] = [];

    const eff = createEffect(() => {
      log.push(sig.get());
    }, sys);
    expect(log).toEqual([0]);

    sig.set(1);
    expect(log).toEqual([0, 1]);

    eff.dispose();
    sig.set(2);
    expect(log).toEqual([0, 1]); // disposed
  });

  it("createSignal without system parameter uses default (backward compat)", () => {
    const sig = createSignal(42);
    expect(sig.get()).toBe(42);
    sig.set(100);
    expect(sig.get()).toBe(100);
  });

  it("peek works with isolated system", () => {
    const sys = createIsolatedReactiveSystem();
    const sig = createSignal(42, sys);
    expect(sig.peek()).toBe(42);
    sig.set(100);
    expect(sig.peek()).toBe(100);
  });

  it("computed peek works with isolated system", () => {
    const sys = createIsolatedReactiveSystem();
    const sig = createSignal(5, sys);
    const comp = createComputed(() => sig.get() * 3, sys);
    expect(comp.peek()).toBe(15);
  });
});

describe("batch() with explicit system parameter", () => {
  it("uses the provided system's batching", () => {
    const sys = createIsolatedReactiveSystem();
    const sig = createSignal(0, sys);
    const log: number[] = [];

    createEffect(() => {
      log.push(sig.get());
    }, sys);
    expect(log).toEqual([0]);

    const result = batch(
      null,
      () => {
        sig.set(1);
        sig.set(2);
        sig.set(3);
      },
      sys
    );

    expect(result.isOk()).toBe(true);
    expect(log).toEqual([0, 3]); // batched, only final value
  });

  it("batch with system handles errors correctly", () => {
    const sys = createIsolatedReactiveSystem();
    const result = batch(
      null,
      () => {
        throw new Error("batch error");
      },
      sys
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "BatchExecutionFailed");
    }
  });

  it("batch with system and target tracks depth", () => {
    const sys = createIsolatedReactiveSystem();
    const target = {};

    batch(
      target,
      () => {
        // noop
      },
      sys
    );

    // After batch completes, depth should be back to 0
    // (isInBatch uses the same WeakMap regardless of system)
  });
});
