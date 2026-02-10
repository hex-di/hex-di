/**
 * DoD 7: Runner & Interpreter (Spec Section 08) - Extended Unit Tests
 *
 * These tests cover additional runner behaviors beyond the existing runner.test.ts:
 * - transition() pure function behavior
 * - runner initialization
 * - runner.send after disposal
 * - runner.subscribe and unsubscribe
 * - subscriber list is copied before notification
 * - runner.snapshot returns frozen snapshot
 * - runner.dispose marks runner as disposed
 * - runner.dispose is safe to call multiple times
 * - effect ordering: exit -> transition -> entry
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineMachine, Effect, transition } from "../src/index.js";
import { createMachineRunner } from "../src/runner/create-runner.js";
import { createActivityManager } from "../src/activities/manager.js";
import { createBasicExecutor } from "../src/runner/executor.js";
import { ResultAsync } from "@hex-di/result";
import { expectOk, expectErr } from "@hex-di/result-testing";
import type { ActivityManager } from "../src/activities/manager.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createCounterMachine() {
  return defineMachine({
    id: "counter",
    initial: "idle",
    context: { count: 0 },
    states: {
      idle: {
        on: {
          START: { target: "counting" },
        },
      },
      counting: {
        on: {
          INCREMENT: {
            target: "counting",
            actions: [(ctx: { count: number }) => ({ count: ctx.count + 1 })],
          },
          DONE: { target: "finished" },
        },
      },
      finished: { on: {} },
    },
  });
}

// =============================================================================
// DoD 7: Runner & Interpreter Tests
// =============================================================================

describe("DoD 7: Runner & Interpreter", () => {
  let activityManager: ActivityManager;

  beforeEach(() => {
    activityManager = createActivityManager();
  });

  afterEach(async () => {
    await activityManager.dispose();
  });

  // =========================================================================
  // transition() tests (pure function)
  // =========================================================================

  describe("transition() pure function", () => {
    it("returns transitioned: true on valid event", () => {
      const machine = createCounterMachine();
      const result = transition("idle", { count: 0 }, { type: "START" }, machine);
      expect(result.transitioned).toBe(true);
      expect(result.newState).toBe("counting");
    });

    it("returns transitioned: false on unrecognized event", () => {
      const machine = createCounterMachine();
      const result = transition("idle", { count: 0 }, { type: "UNKNOWN" }, machine);
      expect(result.transitioned).toBe(false);
      expect(result.newState).toBeUndefined();
    });

    it("returns transitioned: false when all guards fail", () => {
      const machine = defineMachine({
        id: "guard-fail",
        initial: "idle",
        context: { value: 0 },
        states: {
          idle: {
            on: {
              GO: {
                target: "active",
                guard: (ctx: { value: number }) => ctx.value > 100,
              },
            },
          },
          active: { on: {} },
        },
      });

      const result = transition("idle", { value: 0 }, { type: "GO" }, machine);
      expect(result.transitioned).toBe(false);
    });

    it("evaluates guards in definition order (first passing wins)", () => {
      const machine = defineMachine({
        id: "guard-order",
        initial: "idle",
        context: { value: 5 },
        states: {
          idle: {
            on: {
              GO: [
                {
                  target: "a",
                  guard: (ctx: { value: number }) => ctx.value > 10,
                },
                {
                  target: "b",
                  guard: (ctx: { value: number }) => ctx.value > 3,
                },
                { target: "c" },
              ],
            },
          },
          a: { on: {} },
          b: { on: {} },
          c: { on: {} },
        },
      });

      // value=5: first guard (>10) fails, second guard (>3) passes -> b
      const result = transition("idle", { value: 5 }, { type: "GO" }, machine);
      expect(result.newState).toBe("b");
    });

    it("applies actions sequentially, threading context", () => {
      const machine = defineMachine({
        id: "action-thread",
        initial: "idle",
        context: { value: 1 },
        states: {
          idle: {
            on: {
              COMPUTE: {
                target: "idle",
                actions: [
                  (ctx: { value: number }) => ({ value: ctx.value + 1 }),
                  (ctx: { value: number }) => ({ value: ctx.value * 3 }),
                ],
              },
            },
          },
        },
      });

      // (1+1)=2, (2*3)=6
      const result = transition("idle", { value: 1 }, { type: "COMPUTE" }, machine);
      expect(result.newContext).toEqual({ value: 6 });
    });

    it("collects effects: exit -> transition -> entry", () => {
      const exitE = Effect.delay(1);
      const transE = Effect.delay(2);
      const entryE = Effect.delay(3);

      const machine = defineMachine({
        id: "effect-order",
        initial: "a",
        context: undefined,
        states: {
          a: {
            exit: [exitE],
            on: {
              GO: { target: "b", effects: [transE] },
            },
          },
          b: {
            entry: [entryE],
            on: {},
          },
        },
      });

      const result = transition("a", undefined, { type: "GO" }, machine);
      expect(result.effects).toEqual([exitE, transE, entryE]);
    });

    it("handles self-transition (exit + entry effects fire)", () => {
      const exitE = Effect.delay(1);
      const entryE = Effect.delay(2);

      const machine = defineMachine({
        id: "self-trans",
        initial: "a",
        context: undefined,
        states: {
          a: {
            entry: [entryE],
            exit: [exitE],
            on: { REFRESH: { target: "a" } },
          },
        },
      });

      const result = transition("a", undefined, { type: "REFRESH" }, machine);
      expect(result.transitioned).toBe(true);
      expect(result.newState).toBe("a");
      expect(result.effects).toEqual([exitE, entryE]);
    });

    it("is a pure function (no side effects)", () => {
      const machine = createCounterMachine();
      const ctx = { count: 0 };

      const result1 = transition("idle", ctx, { type: "START" }, machine);
      const result2 = transition("idle", ctx, { type: "START" }, machine);

      // Same inputs produce same outputs
      expect(result1.transitioned).toBe(result2.transitioned);
      expect(result1.newState).toBe(result2.newState);
      expect(result1.effects.length).toBe(result2.effects.length);

      // Original context unchanged
      expect(ctx.count).toBe(0);
    });
  });

  // =========================================================================
  // createMachineRunner tests
  // =========================================================================

  describe("createMachineRunner", () => {
    it("initializes with machine.initial and machine.context", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      expect(runner.state()).toBe("idle");
      expect(runner.context()).toEqual({ count: 0 });
    });

    it("runner.send returns effects on valid transition", () => {
      const entryEffect = Effect.delay(100);
      const machine = defineMachine({
        id: "send-test",
        initial: "a",
        context: undefined,
        states: {
          a: { on: { GO: { target: "b" } } },
          b: { entry: [entryEffect], on: {} },
        },
      });

      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      const result = runner.send({ type: "GO" });
      const value = expectOk(result);
      expect(value).toHaveLength(1);
      expect(value[0]).toBe(entryEffect);
      expect(runner.state()).toBe("b");
    });

    it("runner.send returns empty array when no transition matches", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      // Send an event that's valid for the machine but not handled in current state
      // In idle state, only START is handled; INCREMENT/DONE are not handled
      const result = runner.send({ type: "INCREMENT" });
      const value = expectOk(result);
      expect(value).toHaveLength(0);
      expect(runner.state()).toBe("idle"); // Unchanged
    });

    it("runner.send returns error after disposal", async () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      await runner.dispose();

      const result = runner.send({ type: "START" });
      expectErr(result);
    });

    it("runner.sendAndExecute executes effects", async () => {
      const executeFn = vi.fn().mockReturnValue(ResultAsync.ok(undefined));
      const machine = defineMachine({
        id: "execute-test",
        initial: "a",
        context: undefined,
        states: {
          a: {
            on: {
              GO: { target: "b", effects: [Effect.delay(100)] },
            },
          },
          b: { on: {} },
        },
      });

      const runner = createMachineRunner(machine, {
        executor: { execute: executeFn },
        activityManager,
      });

      await runner.sendAndExecute({ type: "GO" });

      expect(executeFn).toHaveBeenCalledTimes(1);
      expect(runner.state()).toBe("b");
    });

    it("runner.subscribe notifies after each successful transition", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      const snapshots: Array<{ state: string }> = [];
      runner.subscribe(snapshot => {
        snapshots.push({ state: snapshot.state });
      });

      runner.send({ type: "START" });
      runner.send({ type: "INCREMENT" });
      runner.send({ type: "INCREMENT" });

      expect(snapshots).toHaveLength(3);
      expect(snapshots[0].state).toBe("counting");
      expect(snapshots[1].state).toBe("counting");
      expect(snapshots[2].state).toBe("counting");
    });

    it("runner.subscribe returns unsubscribe function", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      const snapshots: Array<{ state: string }> = [];
      const unsub = runner.subscribe(snapshot => {
        snapshots.push({ state: snapshot.state });
      });

      runner.send({ type: "START" });
      expect(snapshots).toHaveLength(1);

      unsub();

      runner.send({ type: "INCREMENT" });
      // Should not receive notification after unsubscribe
      expect(snapshots).toHaveLength(1);
    });

    it("subscriber list is copied before notification (safe unsubscribe during callback)", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      const calls: string[] = [];
      const unsub2Holder: { fn?: () => void } = {};

      runner.subscribe(() => {
        calls.push("sub1");
        // Unsubscribe sub2 during notification
        if (unsub2Holder.fn) {
          unsub2Holder.fn();
        }
      });

      unsub2Holder.fn = runner.subscribe(() => {
        calls.push("sub2");
      });

      runner.send({ type: "START" });

      // Both subscribers should be called because list was copied
      expect(calls).toContain("sub1");
      expect(calls).toContain("sub2");
    });

    it("runner.snapshot returns a frozen snapshot", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      const snapshot = runner.snapshot();
      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it("runner.dispose marks runner as disposed", async () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      expect(runner.isDisposed).toBe(false);
      await runner.dispose();
      expect(runner.isDisposed).toBe(true);
    });

    it("runner.dispose is safe to call multiple times", async () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      await runner.dispose();
      // Second call should not throw
      await runner.dispose();

      expect(runner.isDisposed).toBe(true);
    });

    it("snapshot contains state, context, and activities", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      const snapshot = runner.snapshot();
      expect(snapshot.state).toBe("idle");
      expect(snapshot.context).toEqual({ count: 0 });
      expect(Array.isArray(snapshot.activities)).toBe(true);
    });

    it("no transition on unrecognized event preserves state", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      // Send event that is valid for machine but not handled in idle state
      runner.send({ type: "INCREMENT" });
      expect(runner.state()).toBe("idle");
      expect(runner.context()).toEqual({ count: 0 });
    });
  });

  // =========================================================================
  // sendBatch tests
  // =========================================================================

  describe("sendBatch", () => {
    it("processes multiple events sequentially", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      runner.send({ type: "START" });

      const result = runner.sendBatch([
        { type: "INCREMENT" },
        { type: "INCREMENT" },
        { type: "INCREMENT" },
      ]);

      expectOk(result);
      expect(runner.state()).toBe("counting");
      expect(runner.context()).toEqual({ count: 3 });
    });

    it("notifies subscribers only once at the end", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      runner.send({ type: "START" });

      const notifications: number[] = [];
      runner.subscribe(snapshot => {
        notifications.push((snapshot.context as { count: number }).count);
      });

      runner.sendBatch([{ type: "INCREMENT" }, { type: "INCREMENT" }, { type: "INCREMENT" }]);

      // Should only receive one notification with the final count
      expect(notifications).toEqual([3]);
    });

    it("returns all accumulated effects", () => {
      const transEffect = Effect.delay(42);

      const machine = defineMachine({
        id: "batch-effects",
        initial: "a",
        context: undefined,
        states: {
          a: {
            on: {
              GO: { target: "b", effects: [transEffect] },
            },
          },
          b: {
            on: {
              GO: { target: "a", effects: [transEffect] },
            },
          },
        },
      });

      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      const result = runner.sendBatch([{ type: "GO" }, { type: "GO" }]);

      const value = expectOk(result);
      expect(value).toHaveLength(2);
    });

    it("short-circuits on error and notifies for completed transitions", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      // Dispose the runner to cause errors
      runner.dispose();

      const result = runner.sendBatch([{ type: "START" }, { type: "INCREMENT" }]);

      const error = expectErr(result);
      expect(error._tag).toBe("Disposed");
    });

    it("empty batch returns ok with empty effects", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      const result = runner.sendBatch([]);

      const value = expectOk(result);
      expect(value).toHaveLength(0);
    });

    it("skips events with no matching transition", () => {
      const machine = createCounterMachine();
      const executor = createBasicExecutor();
      const runner = createMachineRunner(machine, { executor, activityManager });

      // Machine starts in 'idle', INCREMENT is not handled in idle
      const result = runner.sendBatch([
        { type: "INCREMENT" }, // No transition in idle
        { type: "START" }, // Transitions to counting
        { type: "INCREMENT" }, // Now works in counting
      ]);

      expectOk(result);
      expect(runner.state()).toBe("counting");
      expect(runner.context()).toEqual({ count: 1 });
    });
  });
});
