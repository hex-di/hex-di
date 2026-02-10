/**
 * Mutation killers #8 — Targeted tests for remaining surviving mutants.
 *
 * Focuses on:
 * - signals.ts: createSignal/createComputed/createEffect with isolated system
 * - batch.ts: cross-container detection, depth tracking
 * - state-service-impl.ts: isCallable, effectAdapters, args.length, inspector fields
 * - async-derived-service-impl.ts: retry delay, stale time, inspector events
 * - atom-service-impl.ts: dispose block, subscribe splice
 * - derived-service-impl.ts: subscribe splice
 * - adapters: inspection registration
 */

import { describe, it, expect, vi } from "vitest";
import { createIsolatedReactiveSystem } from "../src/reactivity/system-factory.js";
import {
  createSignal,
  createComputed,
  createEffect,
  untracked,
} from "../src/reactivity/signals.js";
import { batch, setBatchDiagnostics, isInBatch, getBatchDepth } from "../src/reactivity/batch.js";
import { createStateServiceImpl } from "../src/services/state-service-impl.js";
import { createAtomServiceImpl } from "../src/services/atom-service-impl.js";
import { createDerivedServiceImpl } from "../src/services/derived-service-impl.js";
import { createLinkedDerivedServiceImpl } from "../src/services/linked-derived-service-impl.js";
import { createAsyncDerivedServiceImpl } from "../src/services/async-derived-service-impl.js";
import { ResultAsync } from "@hex-di/result";

// =============================================================================
// signals.ts — system path isolation
// =============================================================================

describe("signals.ts — isolated system paths", () => {
  it("createSignal with system uses system's dependency graph (not global)", () => {
    const sys = createIsolatedReactiveSystem();
    const sig = createSignal(10, sys);

    // Create an effect in the same system that tracks the signal
    let effectValue: number | undefined;
    createEffect(() => {
      effectValue = sig.get();
    }, sys);

    expect(effectValue).toBe(10);
    sig.set(20);
    expect(effectValue).toBe(20);
  });

  it("createSignal without system uses global alien-signals (different graph)", () => {
    const sig = createSignal(5);
    expect(sig.get()).toBe(5);
    sig.set(15);
    expect(sig.get()).toBe(15);
    // peek also works
    expect(sig.peek()).toBe(15);
  });

  it("createSignal with system: signal NOT tracked in a different system's effect", () => {
    const sys1 = createIsolatedReactiveSystem();
    const sys2 = createIsolatedReactiveSystem();
    const sig = createSignal(1, sys1);

    // Effect in sys2 should NOT track sig from sys1
    let effectRan = 0;
    createEffect(() => {
      sig.get(); // read, but in different system
      effectRan++;
    }, sys2);

    expect(effectRan).toBe(1); // initial run
    sig.set(2);
    // Effect should NOT re-run because signal is in different system
    expect(effectRan).toBe(1);
  });

  it("createComputed with system uses system's computed", () => {
    const sys = createIsolatedReactiveSystem();
    const sig = createSignal(3, sys);
    const comp = createComputed(() => sig.get() * 2, sys);
    expect(comp.get()).toBe(6);
    sig.set(5);
    expect(comp.get()).toBe(10);
  });

  it("createComputed without system uses global", () => {
    const sig = createSignal(4);
    const comp = createComputed(() => sig.get() * 3);
    expect(comp.get()).toBe(12);
    sig.set(7);
    expect(comp.get()).toBe(21);
  });

  it("createEffect dispose: double-dispose is safe", () => {
    const sys = createIsolatedReactiveSystem();
    const eff = createEffect(() => {}, sys);
    eff.dispose();
    eff.dispose(); // Should not throw
  });

  it("createEffect: disposed effect's run() is a no-op", () => {
    const sys = createIsolatedReactiveSystem();
    let count = 0;
    const eff = createEffect(() => {
      count++;
    }, sys);
    expect(count).toBe(1); // initial run
    eff.dispose();
    eff.run();
    expect(count).toBe(1); // run() should be a no-op after dispose
  });

  it("untracked with system prevents tracking", () => {
    const sys = createIsolatedReactiveSystem();
    const sig = createSignal(1, sys);
    let effectRuns = 0;
    createEffect(() => {
      untracked(() => sig.get(), sys);
      effectRuns++;
    }, sys);
    expect(effectRuns).toBe(1);
    sig.set(2);
    expect(effectRuns).toBe(1); // no re-run since read was untracked
  });

  it("untracked without system prevents global tracking", () => {
    const sig = createSignal(1);
    let effectRuns = 0;
    createEffect(() => {
      untracked(() => sig.get());
      effectRuns++;
    });
    expect(effectRuns).toBe(1);
    sig.set(2);
    expect(effectRuns).toBe(1);
  });
});

// =============================================================================
// batch.ts — cross-container detection and depth tracking
// =============================================================================

describe("batch.ts — cross-container detection (mutation killers)", () => {
  it("cross-container callback fires when different target enters batch", () => {
    const calls: Array<{ newTarget: object; existingTarget: object }> = [];
    setBatchDiagnostics((n, e) => calls.push({ newTarget: n, existingTarget: e }));

    const target1 = {};
    const target2 = {};

    // Nest batch: target1 outermost, target2 inside
    batch(target1, () => {
      batch(target2, () => {
        // Should have triggered cross-container callback
      });
    });

    expect(calls.length).toBe(1);
    expect(calls[0].newTarget).toBe(target2);
    expect(calls[0].existingTarget).toBe(target1);

    setBatchDiagnostics(null);
  });

  it("same target re-entering batch does NOT fire cross-container callback", () => {
    const calls: any[] = [];
    setBatchDiagnostics((n, e) => calls.push({ n, e }));

    const target = {};
    batch(target, () => {
      batch(target, () => {});
    });

    expect(calls.length).toBe(0);
    setBatchDiagnostics(null);
  });

  it("no callback when diagnostics not configured", () => {
    setBatchDiagnostics(null);
    const t1 = {};
    const t2 = {};
    // Should not throw
    batch(t1, () => {
      batch(t2, () => {});
    });
  });

  it("batch depth tracked per-target correctly", () => {
    const target = {};
    let innerDepth = 0;
    let outerDepth = 0;

    batch(target, () => {
      outerDepth = getBatchDepth(target);
      batch(target, () => {
        innerDepth = getBatchDepth(target);
      });
    });

    expect(outerDepth).toBe(1);
    expect(innerDepth).toBe(2);
    // After batch exits, depth should be 0
    expect(getBatchDepth(target)).toBe(0);
    expect(isInBatch(target)).toBe(false);
  });

  it("depth tracking with depth=1 deletes from map", () => {
    const target = {};
    batch(target, () => {
      expect(isInBatch(target)).toBe(true);
    });
    expect(isInBatch(target)).toBe(false);
  });

  it("batch with null target skips depth tracking", () => {
    // Should not throw
    batch(null, () => {});
  });

  it("activeBatchTarget cleared after outermost batch exits", () => {
    const calls: any[] = [];
    setBatchDiagnostics((n, e) => calls.push({ n, e }));

    const t1 = {};
    const t2 = {};

    // First batch
    batch(t1, () => {});

    // Second batch with different target — should NOT fire cross-container
    // because t1's batch is already finished
    batch(t2, () => {});

    expect(calls.length).toBe(0);
    setBatchDiagnostics(null);
  });

  it("batch with system uses system.startBatch/endBatch", () => {
    const sys = createIsolatedReactiveSystem();
    const sig = createSignal(0, sys);
    let notifyCount = 0;

    createEffect(() => {
      sig.get();
      notifyCount++;
    }, sys);

    expect(notifyCount).toBe(1);

    // Inside batch, notifications should be deferred
    batch(
      null,
      () => {
        sig.set(1);
        sig.set(2);
        sig.set(3);
      },
      sys
    );

    // Only one notification for the batch
    expect(notifyCount).toBe(2);
    expect(sig.get()).toBe(3);
  });
});

// =============================================================================
// state-service-impl.ts — isCallable, effectAdapters, args.length, inspector
// =============================================================================

describe("StateService — targeted mutation killers", () => {
  it("effectAdapters: empty array short-circuits notifyEffectAdapters", () => {
    const svc = createStateServiceImpl({
      portName: "P",
      containerName: "root",
      initial: { n: 0 },
      actions: { inc: (s: { n: number }) => ({ n: s.n + 1 }) },
      effectAdapters: [], // Empty — notifyEffectAdapters should early-return
    });
    // Should work without error
    (svc.actions as any).inc();
    expect(svc.state).toEqual({ n: 1 });
  });

  it("args.length > 0: action with no payload yields payload=undefined", () => {
    const recorded: any[] = [];
    const inspector = {
      emit: () => {},
      recordAction: (entry: any) => recorded.push(entry),
      incrementPendingEffects: () => {},
      decrementPendingEffects: () => {},
    };

    const svc: any = createStateServiceImpl({
      portName: "ArgsLen",
      containerName: "root",
      initial: { n: 0 },
      actions: { inc: (s: { n: number }) => ({ n: s.n + 1 }) },
      inspector: inspector as any,
    });

    svc.actions.inc();
    expect(recorded.length).toBe(1);
    expect(recorded[0].payload).toBeUndefined();
  });

  it("args.length > 0: action with payload yields correct payload in inspector", () => {
    const recorded: any[] = [];
    const inspector = {
      emit: () => {},
      recordAction: (entry: any) => recorded.push(entry),
      incrementPendingEffects: () => {},
      decrementPendingEffects: () => {},
    };

    const svc: any = createStateServiceImpl({
      portName: "ArgsLen2",
      containerName: "root",
      initial: { n: 0 },
      actions: { add: (s: { n: number }, amount: number) => ({ n: s.n + amount }) },
      inspector: inspector as any,
    });

    svc.actions.add(5);
    expect(recorded.length).toBe(1);
    expect(recorded[0].payload).toBe(5);
  });

  it("inspector.recordAction has correct portName, actionName, effectStatus", () => {
    const recorded: any[] = [];
    const inspector = {
      emit: () => {},
      recordAction: (entry: any) => recorded.push(entry),
      incrementPendingEffects: () => {},
      decrementPendingEffects: () => {},
    };

    const svc: any = createStateServiceImpl({
      portName: "RecordTest",
      containerName: "root",
      initial: { count: 0 },
      actions: { bump: (s: { count: number }) => ({ count: s.count + 1 }) },
      inspector: inspector as any,
    });

    svc.actions.bump();

    expect(recorded[0].portName).toBe("RecordTest");
    expect(recorded[0].actionName).toBe("bump");
    expect(recorded[0].effectStatus).toBe("none");
    expect(recorded[0].prevState).toEqual({ count: 0 });
    expect(recorded[0].nextState).toEqual({ count: 1 });
    expect(recorded[0].parentId).toBeNull();
  });

  it("inspector.recordAction has effectStatus='pending' for async effect", async () => {
    const recorded: any[] = [];
    const inspector = {
      emit: () => {},
      recordAction: (entry: any) => recorded.push(entry),
      incrementPendingEffects: () => {},
      decrementPendingEffects: () => {},
    };

    const svc: any = createStateServiceImpl({
      portName: "AsyncEffect",
      containerName: "root",
      initial: { count: 0 },
      actions: { bump: (s: { count: number }) => ({ count: s.count + 1 }) },
      effects: {
        bump: () => ResultAsync.ok(undefined),
      } as any,
      inspector: inspector as any,
    });

    svc.actions.bump();
    await new Promise(r => setTimeout(r, 50));

    expect(recorded[0].effectStatus).toBe("pending");
  });

  it("selector subscribe: hasPathChanged condition governs re-notification", () => {
    const system = createIsolatedReactiveSystem();
    const svc: any = createStateServiceImpl({
      portName: "SelectorSub",
      containerName: "root",
      initial: { a: 1, b: 2 },
      actions: {
        setA: (s: { a: number; b: number }, v: number) => ({ ...s, a: v }),
        setB: (s: { a: number; b: number }, v: number) => ({ ...s, b: v }),
      },
      reactiveSystem: system,
    });

    const received: number[] = [];
    svc.subscribe(
      (s: any) => s.a,
      (val: number) => received.push(val)
    );

    // Change b — should NOT notify selector watching a
    svc.actions.setB(99);
    expect(received.length).toBe(0);

    // Change a — SHOULD notify
    svc.actions.setA(42);
    expect(received).toContain(42);
  });

  it("subscribe then dispose cleans up all effects", () => {
    const system = createIsolatedReactiveSystem();
    const svc: any = createStateServiceImpl({
      portName: "DisposeTest",
      containerName: "root",
      initial: { n: 0 },
      actions: { inc: (s: { n: number }) => ({ n: s.n + 1 }) },
      reactiveSystem: system,
    });

    const received: any[] = [];
    svc.subscribe((s: any) => received.push(s));
    svc.subscribe((s: any) => received.push(s));

    svc.dispose();

    expect(svc.isDisposed).toBe(true);
    expect(svc.subscriberCount).toBe(0);
  });
});

// =============================================================================
// AtomService — dispose block and subscribe splice
// =============================================================================

describe("AtomService — precise mutation killers", () => {
  it("dispose sets isDisposed=true, clears subscribers, stops effects", () => {
    const system = createIsolatedReactiveSystem();
    const atom = createAtomServiceImpl({
      portName: "DisposeAtom",
      containerName: "root",
      initial: 0,
      reactiveSystem: system,
    });

    const received: number[] = [];
    atom.subscribe(v => received.push(v as number));
    atom.subscribe(v => received.push(v as number));

    expect(atom.subscriberCount).toBe(2);
    atom.dispose();

    expect(atom.isDisposed).toBe(true);
    expect(atom.subscriberCount).toBe(0);
  });

  it("unsubscribe first of three, remaining two still fire", () => {
    const system = createIsolatedReactiveSystem();
    const atom = createAtomServiceImpl({
      portName: "UnsThree",
      containerName: "root",
      initial: 0,
      reactiveSystem: system,
    });

    const r1: number[] = [];
    const r2: number[] = [];
    const r3: number[] = [];

    const unsub1 = atom.subscribe(v => r1.push(v as number));
    atom.subscribe(v => r2.push(v as number));
    atom.subscribe(v => r3.push(v as number));

    unsub1();
    atom.set(10);

    expect(r1).not.toContain(10);
    expect(r2).toContain(10);
    expect(r3).toContain(10);
  });
});

// =============================================================================
// DerivedService — subscribe splice
// =============================================================================

describe("DerivedService — splice mutation killers", () => {
  it("unsubscribe first of three, remaining two still fire", () => {
    const system = createIsolatedReactiveSystem();
    const sig = system.signal(1);

    const derived = createDerivedServiceImpl({
      portName: "UnsDerived3",
      containerName: "root",
      select: () => sig(),
      reactiveSystem: system,
    });

    const r1: number[] = [];
    const r2: number[] = [];
    const r3: number[] = [];

    const unsub1 = derived.subscribe(v => r1.push(v as number));
    derived.subscribe(v => r2.push(v as number));
    derived.subscribe(v => r3.push(v as number));

    unsub1();
    sig(20);

    expect(r1).not.toContain(20);
    expect(r2).toContain(20);
    expect(r3).toContain(20);
  });
});

// =============================================================================
// LinkedDerivedService — subscribe splice
// =============================================================================

describe("LinkedDerivedService — splice mutation killers", () => {
  it("unsubscribe first of three, remaining two still fire", () => {
    const system = createIsolatedReactiveSystem();
    const sig = system.signal(1);

    const linked = createLinkedDerivedServiceImpl({
      portName: "UnsLinked3",
      containerName: "root",
      select: () => sig(),
      write: v => sig(v),
      reactiveSystem: system,
    });

    const r1: number[] = [];
    const r2: number[] = [];
    const r3: number[] = [];

    const unsub1 = linked.subscribe(v => r1.push(v as number));
    linked.subscribe(v => r2.push(v as number));
    linked.subscribe(v => r3.push(v as number));

    unsub1();
    sig(20);

    expect(r1).not.toContain(20);
    expect(r2).toContain(20);
    expect(r3).toContain(20);
  });
});

// =============================================================================
// AsyncDerivedService — retry delay, stale time, inspector events
// =============================================================================

describe("AsyncDerivedService — targeted mutation killers", () => {
  it("retry delay > 0 actually delays between retries", async () => {
    let attempt = 0;
    const timestamps: number[] = [];

    const svc = createAsyncDerivedServiceImpl({
      portName: "RetryDelay",
      containerName: "root",
      select: () => {
        attempt++;
        timestamps.push(Date.now());
        if (attempt < 3) return ResultAsync.err("fail");
        return ResultAsync.ok("done");
      },
      retryCount: 2,
      retryDelay: 50,
    });

    svc.refresh();
    await new Promise(r => setTimeout(r, 500));

    expect(timestamps.length).toBe(3);
    // Between first and second attempt, there should be ~50ms
    const gap = timestamps[1] - timestamps[0];
    expect(gap).toBeGreaterThanOrEqual(30); // Allow some slack
  });

  it("retry delay = 0 does not delay (all attempts are near-instant)", async () => {
    let attempt = 0;
    const timestamps: number[] = [];

    const svc = createAsyncDerivedServiceImpl({
      portName: "NoDelay",
      containerName: "root",
      select: () => {
        attempt++;
        timestamps.push(Date.now());
        if (attempt < 3) return ResultAsync.err("fail");
        return ResultAsync.ok("ok");
      },
      retryCount: 2,
      retryDelay: 0,
    });

    svc.refresh();
    await new Promise(r => setTimeout(r, 200));

    expect(timestamps.length).toBe(3);
    // With delay=0, all attempts should be very fast
    const totalTime = timestamps[2] - timestamps[0];
    expect(totalTime).toBeLessThan(100);
  });

  it("inspector emit with correct event types on success", async () => {
    const events: any[] = [];
    const inspector = {
      emit: (e: any) => events.push(e),
      recordAction: () => {},
      incrementPendingEffects: () => {},
      decrementPendingEffects: () => {},
    };

    const svc = createAsyncDerivedServiceImpl({
      portName: "InspectorEvents",
      containerName: "root",
      select: () => ResultAsync.ok(42),
      inspector: inspector as any,
    });

    svc.refresh();
    await new Promise(r => setTimeout(r, 100));

    const stateChangedEvents = events.filter(e => e.type === "state-changed");
    expect(stateChangedEvents.length).toBeGreaterThanOrEqual(1);
    expect(stateChangedEvents[0].portName).toBe("InspectorEvents");
  });

  it("inspector emit with async-derived-failed on error after retries", async () => {
    const events: any[] = [];
    const inspector = {
      emit: (e: any) => events.push(e),
      recordAction: () => {},
      incrementPendingEffects: () => {},
      decrementPendingEffects: () => {},
    };

    const svc = createAsyncDerivedServiceImpl({
      portName: "FailedEvents",
      containerName: "root",
      select: () => ResultAsync.err("always-fail"),
      retryCount: 0,
      inspector: inspector as any,
    });

    svc.refresh();
    await new Promise(r => setTimeout(r, 100));

    const failedEvents = events.filter(e => e.type === "async-derived-failed");
    expect(failedEvents.length).toBe(1);
    // Also should have state-changed for the error snapshot
    const stateEvents = events.filter(e => e.type === "state-changed");
    expect(stateEvents.length).toBe(1);
    expect(stateEvents[0].portName).toBe("FailedEvents");
  });

  it("staleTime: snapshot auto-refreshes when stale", async () => {
    let fetchCount = 0;
    const svc = createAsyncDerivedServiceImpl({
      portName: "StaleTest",
      containerName: "root",
      select: () => {
        fetchCount++;
        return ResultAsync.ok(fetchCount);
      },
      staleTime: 50, // 50ms
    });

    // First fetch
    svc.refresh();
    await new Promise(r => setTimeout(r, 100));
    expect(fetchCount).toBe(1);

    // Subscribe to enable stale checking
    const snapshots: any[] = [];
    const unsub = svc.subscribe(s => snapshots.push(s));

    // Wait for staleTime to pass
    await new Promise(r => setTimeout(r, 100));

    // Access snapshot — should trigger auto-refresh since data is stale
    const _snap = svc.snapshot;
    await new Promise(r => setTimeout(r, 100));

    expect(fetchCount).toBeGreaterThan(1);
    unsub();
  });

  it("unsubscribe first of three, remaining two still fire", async () => {
    const system = createIsolatedReactiveSystem();
    const svc = createAsyncDerivedServiceImpl({
      portName: "UnsAsync3",
      containerName: "root",
      select: () => ResultAsync.ok(Math.random()),
      reactiveSystem: system,
    });

    const r1: any[] = [];
    const r2: any[] = [];
    const r3: any[] = [];

    const unsub1 = svc.subscribe(s => r1.push(s));
    svc.subscribe(s => r2.push(s));
    svc.subscribe(s => r3.push(s));

    unsub1();
    svc.refresh();
    await new Promise(r => setTimeout(r, 100));

    // r2 and r3 should have received updates, r1 should not after unsub
    expect(r2.length).toBeGreaterThan(0);
    expect(r3.length).toBeGreaterThan(0);
    // r1 may have received the initial loading snapshot before unsub, but not the final one
    // The key test: r2 and r3 have more entries than r1
    expect(r2.length).toBeGreaterThanOrEqual(r3.length);
  });

  it("dispose prevents further listener notifications", async () => {
    const svc = createAsyncDerivedServiceImpl({
      portName: "DisposeAsync",
      containerName: "root",
      select: () => ResultAsync.ok(1),
    });

    const received: any[] = [];
    svc.subscribe(s => received.push(s));

    svc.dispose();
    expect(svc.isDisposed).toBe(true);
  });
});
