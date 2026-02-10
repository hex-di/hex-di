/**
 * Integration Tests: Reactivity
 *
 * Cross-cutting reactivity tests: multi-port chains, batching across
 * multiple state signals, diamond dependencies.
 */

import { describe, it, expect } from "vitest";
import { createSignal, createComputed, createEffect, batch } from "../../src/index.js";
import { createStateServiceImpl } from "../../src/services/state-service-impl.js";
import { createDerivedServiceImpl } from "../../src/services/derived-service-impl.js";

// =============================================================================
// Multi-port reactivity chain (state -> derived -> derived)
// =============================================================================

describe("Multi-port reactivity chain", () => {
  it("state -> derived -> derived: changes propagate through the chain", () => {
    const counter = createStateServiceImpl({
      portName: "Counter",
      containerName: "test",
      initial: { count: 1 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
        set: (state: { count: number }, value: number) => ({ ...state, count: value }),
      },
    });

    const doubled = createDerivedServiceImpl<number>({
      portName: "Doubled",
      containerName: "test",
      select: () => (counter.state as { count: number }).count * 2,
    });

    const quadrupled = createDerivedServiceImpl<number>({
      portName: "Quadrupled",
      containerName: "test",
      select: () => (doubled.value as number) * 2,
    });

    expect(counter.state).toEqual({ count: 1 });
    expect(doubled.value).toBe(2);
    expect(quadrupled.value).toBe(4);

    counter.actions.increment();
    expect(counter.state).toEqual({ count: 2 });
    expect(doubled.value).toBe(4);
    expect(quadrupled.value).toBe(8);

    counter.actions.set(10);
    expect(doubled.value).toBe(20);
    expect(quadrupled.value).toBe(40);
  });

  it("subscribers on the final derived receive updates on source changes", () => {
    const counter = createStateServiceImpl({
      portName: "Counter",
      containerName: "test",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    const doubled = createDerivedServiceImpl<number>({
      portName: "Doubled",
      containerName: "test",
      select: () => (counter.state as { count: number }).count * 2,
    });

    const quadrupled = createDerivedServiceImpl<number>({
      portName: "Quadrupled",
      containerName: "test",
      select: () => (doubled.value as number) * 2,
    });

    const observed: number[] = [];
    quadrupled.subscribe(value => observed.push(value as number));

    counter.actions.increment(); // count=1, doubled=2, quadrupled=4
    counter.actions.increment(); // count=2, doubled=4, quadrupled=8

    expect(observed).toEqual([4, 8]);
  });
});

// =============================================================================
// Batch across multiple state signals
// =============================================================================

describe("Batch across multiple state signals", () => {
  it("batches updates across two independent signals", () => {
    const sigA = createSignal(0);
    const sigB = createSignal(0);
    const observations: Array<{ a: number; b: number }> = [];

    createEffect(() => {
      observations.push({ a: sigA.get(), b: sigB.get() });
    });

    // Initial observation
    expect(observations).toEqual([{ a: 0, b: 0 }]);

    batch(null, () => {
      sigA.set(10);
      sigB.set(20);
    });

    // After batch, should see the final combined state
    const last = observations[observations.length - 1];
    expect(last).toEqual({ a: 10, b: 20 });
    // Intermediate states {a:10, b:0} should not appear
    const hasIntermediate = observations.some(o => o.a === 10 && o.b === 0);
    expect(hasIntermediate).toBe(false);
  });

  it("batches state service actions across multiple services", () => {
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

    const sum = createDerivedServiceImpl<number>({
      portName: "Sum",
      containerName: "test",
      select: () =>
        (counterA.state as { count: number }).count + (counterB.state as { count: number }).count,
    });

    const observations: number[] = [];
    sum.subscribe(value => observations.push(value as number));

    batch(null, () => {
      counterA.actions.increment();
      counterB.actions.increment();
    });

    // Sum should be 2 after both increments
    expect(sum.value).toBe(2);
    // The subscriber should see the final value, not intermediate
    const lastObserved = observations[observations.length - 1];
    expect(lastObserved).toBe(2);
  });
});

// =============================================================================
// Subscribe to derived depending on multiple state signals
// =============================================================================

describe("Derived depending on multiple state signals", () => {
  it("derived recomputes when any upstream signal changes", () => {
    const firstName = createSignal("John");
    const lastName = createSignal("Doe");

    const fullName = createDerivedServiceImpl<string>({
      portName: "FullName",
      containerName: "test",
      select: () => `${firstName.get()} ${lastName.get()}`,
    });

    expect(fullName.value).toBe("John Doe");

    firstName.set("Jane");
    expect(fullName.value).toBe("Jane Doe");

    lastName.set("Smith");
    expect(fullName.value).toBe("Jane Smith");
  });

  it("subscriber fires only when the derived value actually changes", () => {
    const sigA = createSignal(1);
    const sigB = createSignal(2);

    const sum = createDerivedServiceImpl<number>({
      portName: "Sum",
      containerName: "test",
      select: () => sigA.get() + sigB.get(),
    });

    const observations: number[] = [];
    sum.subscribe(value => observations.push(value as number));

    // Change sigA: 1+2=3 -> 2+2=4
    sigA.set(2);
    expect(observations).toEqual([4]);

    // Change sigB: 2+2=4 -> 2+3=5
    sigB.set(3);
    expect(observations).toEqual([4, 5]);
  });
});

// =============================================================================
// Diamond dependency (A -> B, A -> C, B+C -> D)
// =============================================================================

describe("Diamond dependency", () => {
  it("A -> B, A -> C, B+C -> D: D recomputes correctly", () => {
    const A = createSignal(1);
    const B = createComputed(() => A.get() * 2);
    const C = createComputed(() => A.get() * 3);

    const D = createDerivedServiceImpl<number>({
      portName: "D",
      containerName: "test",
      select: () => B.get() + C.get(),
    });

    expect(D.value).toBe(5); // 2 + 3

    A.set(10);
    expect(D.value).toBe(50); // 20 + 30

    A.set(0);
    expect(D.value).toBe(0); // 0 + 0
  });

  it("diamond: D subscriber fires with consistent B+C values (no glitch)", () => {
    const A = createSignal(1);
    const B = createComputed(() => A.get() * 2);
    const C = createComputed(() => A.get() * 3);

    const observations: Array<{ b: number; c: number; d: number }> = [];
    createEffect(() => {
      const b = B.get();
      const c = C.get();
      observations.push({ b, c, d: b + c });
    });

    // Initial: A=1, B=2, C=3, D=5
    expect(observations[0]).toEqual({ b: 2, c: 3, d: 5 });

    A.set(10);
    // After change: B=20, C=30, D=50
    const last = observations[observations.length - 1];
    expect(last).toEqual({ b: 20, c: 30, d: 50 });

    // No glitch: we should never see an inconsistent combination
    // like B=20, C=3 or B=2, C=30
    for (const obs of observations) {
      expect(obs.d).toBe(obs.b + obs.c);
      // B and C should always be derived from the same A value
      // B = A*2, C = A*3, so C/3 === B/2 (when A != 0)
      if (obs.b !== 0) {
        expect(obs.b / 2).toBe(obs.c / 3);
      }
    }
  });

  it("diamond with state services: state -> 2 derived -> final derived", () => {
    const source = createStateServiceImpl({
      portName: "Source",
      containerName: "test",
      initial: { value: 5 },
      actions: {
        set: (_: { value: number }, v: number) => ({ value: v }),
      },
    });

    const doubled = createDerivedServiceImpl<number>({
      portName: "Doubled",
      containerName: "test",
      select: () => (source.state as { value: number }).value * 2,
    });

    const tripled = createDerivedServiceImpl<number>({
      portName: "Tripled",
      containerName: "test",
      select: () => (source.state as { value: number }).value * 3,
    });

    const combined = createDerivedServiceImpl<number>({
      portName: "Combined",
      containerName: "test",
      select: () => (doubled.value as number) + (tripled.value as number),
    });

    expect(combined.value).toBe(25); // 10 + 15

    source.actions.set(10);
    expect(doubled.value).toBe(20);
    expect(tripled.value).toBe(30);
    expect(combined.value).toBe(50);

    // Subscribe and verify
    const observed: number[] = [];
    combined.subscribe(v => observed.push(v as number));

    source.actions.set(3);
    expect(combined.value).toBe(15); // 6 + 9
    expect(observed[observed.length - 1]).toBe(15);
  });
});
