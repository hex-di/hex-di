import { describe, it, expect, vi } from "vitest";
import {
  createIsolatedReactiveSystem,
  createSignal,
  createComputed,
  createEffect,
} from "../../src/index.js";

describe("createIsolatedReactiveSystem", () => {
  it("creates an isolated system with signal/computed/effect", () => {
    const system = createIsolatedReactiveSystem();

    const s = system.signal(42);
    expect(s()).toBe(42);

    s(100);
    expect(s()).toBe(100);

    const c = system.computed(() => s() * 2);
    expect(c()).toBe(200);

    const values: number[] = [];
    const dispose = system.effect(() => {
      values.push(s());
    });

    expect(values).toEqual([100]);
    s(50);
    expect(values).toEqual([100, 50]);
    expect(c()).toBe(100);

    dispose();
  });

  it("two systems are fully independent", () => {
    const system1 = createIsolatedReactiveSystem();
    const system2 = createIsolatedReactiveSystem();

    const s1 = system1.signal(1);
    const s2 = system2.signal(100);

    const c1 = system1.computed(() => s1() + 10);
    const c2 = system2.computed(() => s2() + 10);

    expect(c1()).toBe(11);
    expect(c2()).toBe(110);

    // Changing s1 should not affect system2
    s1(2);
    expect(c1()).toBe(12);
    expect(c2()).toBe(110);

    // Changing s2 should not affect system1
    s2(200);
    expect(c1()).toBe(12);
    expect(c2()).toBe(210);
  });

  it("effects in one system do not fire for signals in another", () => {
    const system1 = createIsolatedReactiveSystem();
    const system2 = createIsolatedReactiveSystem();

    const s1 = system1.signal(0);
    const s2 = system2.signal(0);

    const effect1Values: number[] = [];
    const effect2Values: number[] = [];

    const dispose1 = system1.effect(() => {
      effect1Values.push(s1());
    });

    const dispose2 = system2.effect(() => {
      effect2Values.push(s2());
    });

    expect(effect1Values).toEqual([0]);
    expect(effect2Values).toEqual([0]);

    s1(1);
    expect(effect1Values).toEqual([0, 1]);
    expect(effect2Values).toEqual([0]); // Unchanged

    s2(1);
    expect(effect1Values).toEqual([0, 1]); // Unchanged
    expect(effect2Values).toEqual([0, 1]);

    dispose1();
    dispose2();
  });

  it("batching is scoped to the system", () => {
    const system = createIsolatedReactiveSystem();
    const s = system.signal(0);
    const values: number[] = [];

    const dispose = system.effect(() => {
      values.push(s());
    });

    expect(values).toEqual([0]);

    // Within a batch, effect should only fire once at the end
    system.startBatch();
    s(1);
    s(2);
    s(3);
    expect(values).toEqual([0]); // Deferred
    system.endBatch();
    expect(values).toEqual([0, 3]); // Only final value

    dispose();
  });

  it("HexDI signal wrappers work with isolated system", () => {
    const system = createIsolatedReactiveSystem();

    const s = createSignal("hello", system);
    const c = createComputed(() => s.get().toUpperCase(), system);
    const values: string[] = [];

    const effect = createEffect(() => {
      values.push(c.get());
    }, system);

    expect(values).toEqual(["HELLO"]);

    s.set("world");
    expect(values).toEqual(["HELLO", "WORLD"]);
    expect(c.peek()).toBe("WORLD");
    expect(s.peek()).toBe("world");

    effect.dispose();
  });

  it("getActiveSub/setActiveSub control tracking scope", () => {
    const system = createIsolatedReactiveSystem();

    // Initially no active subscriber
    expect(system.getActiveSub()).toBeUndefined();

    // setActiveSub returns previous value
    const prev = system.setActiveSub(undefined);
    expect(prev).toBeUndefined();
  });
});
