/**
 * Parallel States Runtime Tests
 *
 * Tests for parallel state support in the Flow state machine runtime.
 * Parallel states run ALL direct children simultaneously as orthogonal regions.
 *
 * Key semantics tested:
 * - No `initial` for parallel states — all children active simultaneously
 * - Each region processes events independently
 * - stateValue produces nested object with all regions
 * - onDone fires when ALL regions reach final states
 * - Entry/exit effects fire for all regions
 * - Nested parallel + compound state combinations
 * - matches() works for parallel state paths
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { expectOk } from "@hex-di/result-testing";
import { defineMachine } from "../src/machine/define-machine.js";
import { event } from "../src/machine/factories.js";
import { Effect } from "../src/effects/constructors.js";
import type { EffectAny } from "../src/effects/types.js";
import {
  createMachineRunner,
  type MachineSnapshot,
  type EffectExecutor,
  type StateValue,
} from "../src/runner/index.js";
import { createActivityManager, type ActivityManager } from "../src/activities/index.js";
import type { EffectExecutionError } from "../src/errors/index.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createNoOpExecutor(): EffectExecutor {
  return {
    execute(): ResultAsync<void, EffectExecutionError> {
      return ResultAsync.ok(undefined);
    },
  };
}

// =============================================================================
// Test Machine Definitions
// =============================================================================

/**
 * Simple parallel machine with two regions.
 * The 'dashboard' state is parallel with 'panel1' and 'panel2' regions.
 */
function createDashboardMachine() {
  return defineMachine({
    id: "dashboard",
    initial: "dashboard",
    context: undefined,
    states: {
      dashboard: {
        type: "parallel" as const,
        states: {
          panel1: {
            type: "compound" as const,
            initial: "idle",
            states: {
              idle: {
                on: {
                  PANEL1_START: { target: "active" },
                },
              },
              active: {
                on: {
                  PANEL1_STOP: { target: "idle" },
                  PANEL1_DONE: { target: "complete" },
                },
              },
              complete: {
                type: "final" as const,
              },
            },
          },
          panel2: {
            type: "compound" as const,
            initial: "idle",
            states: {
              idle: {
                on: {
                  PANEL2_START: { target: "loading" },
                },
              },
              loading: {
                on: {
                  PANEL2_LOADED: { target: "ready" },
                },
              },
              ready: {
                on: {
                  PANEL2_DONE: { target: "complete" },
                },
              },
              complete: {
                type: "final" as const,
              },
            },
          },
        },
        onDone: { target: "finished" },
      },
      finished: {
        on: {},
      },
    },
  });
}

/**
 * Parallel machine with entry/exit effects.
 */
function createEffectParallelMachine() {
  return defineMachine({
    id: "effect-parallel",
    initial: "setup",
    context: undefined,
    states: {
      setup: {
        on: {
          ENTER_PARALLEL: { target: "parallel" },
        },
      },
      parallel: {
        type: "parallel" as const,
        entry: [Effect.delay(1)],
        exit: [Effect.delay(2)],
        states: {
          regionA: {
            type: "compound" as const,
            initial: "a1",
            states: {
              a1: {
                entry: [Effect.delay(10)],
                exit: [Effect.delay(11)],
                on: {
                  A_NEXT: { target: "a2" },
                },
              },
              a2: {
                entry: [Effect.delay(12)],
                exit: [Effect.delay(13)],
                type: "final" as const,
              },
            },
          },
          regionB: {
            type: "compound" as const,
            initial: "b1",
            states: {
              b1: {
                entry: [Effect.delay(20)],
                exit: [Effect.delay(21)],
                on: {
                  B_NEXT: { target: "b2" },
                },
              },
              b2: {
                entry: [Effect.delay(22)],
                type: "final" as const,
              },
            },
          },
        },
        onDone: { target: "done" },
      },
      done: {
        entry: [Effect.delay(99)],
        on: {},
      },
    },
  });
}

/**
 * Parallel machine with context actions.
 */
interface ParallelCounterContext {
  readonly panelACount: number;
  readonly panelBCount: number;
}

function createParallelCounterMachine() {
  return defineMachine({
    id: "parallel-counter",
    initial: "active",
    context: { panelACount: 0, panelBCount: 0 } satisfies ParallelCounterContext,
    states: {
      active: {
        type: "parallel" as const,
        states: {
          panelA: {
            type: "compound" as const,
            initial: "counting",
            states: {
              counting: {
                on: {
                  INC_A: {
                    target: "counting",
                    actions: [
                      (ctx: ParallelCounterContext) => ({
                        ...ctx,
                        panelACount: ctx.panelACount + 1,
                      }),
                    ],
                  },
                  DONE_A: { target: "done" },
                },
              },
              done: {
                type: "final" as const,
              },
            },
          },
          panelB: {
            type: "compound" as const,
            initial: "counting",
            states: {
              counting: {
                on: {
                  INC_B: {
                    target: "counting",
                    actions: [
                      (ctx: ParallelCounterContext) => ({
                        ...ctx,
                        panelBCount: ctx.panelBCount + 1,
                      }),
                    ],
                  },
                  DONE_B: { target: "done" },
                },
              },
              done: {
                type: "final" as const,
              },
            },
          },
        },
        onDone: { target: "complete" },
      },
      complete: {
        on: {},
      },
    },
  });
}

// =============================================================================
// Event factories
// =============================================================================

const panel1StartEvent = event<"PANEL1_START">("PANEL1_START");
const panel1StopEvent = event<"PANEL1_STOP">("PANEL1_STOP");
const panel1DoneEvent = event<"PANEL1_DONE">("PANEL1_DONE");
const panel2StartEvent = event<"PANEL2_START">("PANEL2_START");
const panel2LoadedEvent = event<"PANEL2_LOADED">("PANEL2_LOADED");
const panel2DoneEvent = event<"PANEL2_DONE">("PANEL2_DONE");

const enterParallelEvent = event<"ENTER_PARALLEL">("ENTER_PARALLEL");
const aNextEvent = event<"A_NEXT">("A_NEXT");
const bNextEvent = event<"B_NEXT">("B_NEXT");

const incAEvent = event<"INC_A">("INC_A");
const incBEvent = event<"INC_B">("INC_B");
const doneAEvent = event<"DONE_A">("DONE_A");
const doneBEvent = event<"DONE_B">("DONE_B");

// =============================================================================
// Tests
// =============================================================================

describe("Parallel States", () => {
  let activityManager: ActivityManager;

  beforeEach(() => {
    activityManager = createActivityManager();
  });

  afterEach(async () => {
    await activityManager.dispose();
  });

  // ===========================================================================
  // Basic Parallel State Behavior
  // ===========================================================================

  describe("Basic Parallel State Behavior", () => {
    it("should enter all regions simultaneously on parallel state entry", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // The machine starts in 'dashboard' which is parallel
      // Both regions should be active in their initial states
      expect(runner.state()).toBe("dashboard");

      const snapshot = runner.snapshot();
      expect(snapshot.matches("dashboard")).toBe(true);
      expect(snapshot.matches("dashboard.panel1")).toBe(true);
      expect(snapshot.matches("dashboard.panel1.idle")).toBe(true);
      expect(snapshot.matches("dashboard.panel2")).toBe(true);
      expect(snapshot.matches("dashboard.panel2.idle")).toBe(true);
    });

    it("should produce correct stateValue for parallel state", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const sv = runner.stateValue();
      // stateValue should be: { dashboard: { panel1: 'idle', panel2: 'idle' } }
      expect(sv).toEqual({
        dashboard: {
          panel1: "idle",
          panel2: "idle",
        },
      });
    });

    it("should route events to the correct region independently", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Send event handled by panel1
      runner.send(panel1StartEvent());

      // panel1 should transition, panel2 stays
      const sv1 = runner.stateValue();
      expect(sv1).toEqual({
        dashboard: {
          panel1: "active",
          panel2: "idle",
        },
      });

      // Send event handled by panel2
      runner.send(panel2StartEvent());

      const sv2 = runner.stateValue();
      expect(sv2).toEqual({
        dashboard: {
          panel1: "active",
          panel2: "loading",
        },
      });
    });

    it("should handle events that only one region processes", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // PANEL2_LOADED only affects panel2 (and only when in loading)
      // Panel2 is in 'idle', so this should be ignored
      runner.send(panel2LoadedEvent());

      expect(runner.stateValue()).toEqual({
        dashboard: {
          panel1: "idle",
          panel2: "idle",
        },
      });

      // Now put panel2 into loading, then send PANEL2_LOADED
      runner.send(panel2StartEvent());
      runner.send(panel2LoadedEvent());

      expect(runner.stateValue()).toEqual({
        dashboard: {
          panel1: "idle",
          panel2: "ready",
        },
      });
    });
  });

  // ===========================================================================
  // onDone - All Regions Reaching Final
  // ===========================================================================

  describe("onDone - All Regions Final", () => {
    it("should NOT fire onDone when only some regions are final", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Complete panel1
      runner.send(panel1StartEvent());
      runner.send(panel1DoneEvent());

      // panel1 is complete (final), but panel2 is still idle
      expect(runner.state()).toBe("dashboard");

      const snapshot = runner.snapshot();
      expect(snapshot.matches("dashboard.panel1.complete")).toBe(true);
      expect(snapshot.matches("dashboard.panel2.idle")).toBe(true);
    });

    it("should fire onDone when ALL regions reach final states", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Complete panel1
      runner.send(panel1StartEvent());
      runner.send(panel1DoneEvent());

      // Complete panel2
      runner.send(panel2StartEvent());
      runner.send(panel2LoadedEvent());
      runner.send(panel2DoneEvent());

      // Both panels are complete — onDone should have fired
      expect(runner.state()).toBe("finished");
      expect(runner.stateValue()).toBe("finished");
    });

    it("should fire onDone regardless of which region finishes last", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Complete panel2 first this time
      runner.send(panel2StartEvent());
      runner.send(panel2LoadedEvent());
      runner.send(panel2DoneEvent());

      // panel2 is complete but machine should still be in dashboard
      expect(runner.state()).toBe("dashboard");

      // Now complete panel1
      runner.send(panel1StartEvent());
      runner.send(panel1DoneEvent());

      // Both panels complete — onDone fires
      expect(runner.state()).toBe("finished");
    });
  });

  // ===========================================================================
  // Entry/Exit Effects
  // ===========================================================================

  describe("Entry/Exit Effects", () => {
    it("should collect entry effects for parallel state and all regions", () => {
      const machine = createEffectParallelMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Transition into the parallel state
      const result = runner.send(enterParallelEvent());
      const effects = expectOk(result);

      // Should include:
      // - parallel state entry: delay(1)
      // - regionA.a1 entry: delay(10)
      // - regionB.b1 entry: delay(20)
      const delayMs = effects
        .filter(
          (e): e is EffectAny & { readonly milliseconds: number } =>
            e._tag === "Delay" && "milliseconds" in e
        )
        .map(e => e.milliseconds);

      expect(delayMs).toContain(1); // parallel state entry
      expect(delayMs).toContain(10); // regionA.a1 entry
      expect(delayMs).toContain(20); // regionB.b1 entry
    });

    it("should collect exit/entry effects within a region on transition", () => {
      const machine = createEffectParallelMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Enter the parallel state
      runner.send(enterParallelEvent());

      // Transition regionA: a1 -> a2
      const result = runner.send(aNextEvent());
      const effects = expectOk(result);

      const delayMs = effects
        .filter(
          (e): e is EffectAny & { readonly milliseconds: number } =>
            e._tag === "Delay" && "milliseconds" in e
        )
        .map(e => e.milliseconds);

      // Should include a1 exit (11) and a2 entry (12)
      expect(delayMs).toContain(11); // a1 exit
      expect(delayMs).toContain(12); // a2 entry
    });

    it("should collect exit effects for all regions when parallel completes via onDone", () => {
      const machine = createEffectParallelMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Enter parallel
      runner.send(enterParallelEvent());

      // Complete regionA (a1 -> a2 final)
      runner.send(aNextEvent());

      // Complete regionB (b1 -> b2 final)
      const result = runner.send(bNextEvent());
      const effects = expectOk(result);

      // When B completes, onDone fires.
      // Effects should include:
      // - b1 exit (21), b2 entry (22) for the B transition
      // - Then onDone exit effects: a2 exit(13), b2 has no exit, regionA no exit,
      //   regionB no exit, parallel exit(2)
      // - done entry(99)
      const delayMs = effects
        .filter(
          (e): e is EffectAny & { readonly milliseconds: number } =>
            e._tag === "Delay" && "milliseconds" in e
        )
        .map(e => e.milliseconds);

      // The B region transition effects
      expect(delayMs).toContain(21); // b1 exit
      expect(delayMs).toContain(22); // b2 entry

      // Machine should have moved to 'done' state
      expect(runner.state()).toBe("done");
    });
  });

  // ===========================================================================
  // Context with Parallel States
  // ===========================================================================

  describe("Context with Parallel States", () => {
    it("should update context from region-specific events", () => {
      const machine = createParallelCounterMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Increment panel A
      runner.send(incAEvent());
      runner.send(incAEvent());
      runner.send(incAEvent());

      expect(runner.context().panelACount).toBe(3);
      expect(runner.context().panelBCount).toBe(0);

      // Increment panel B
      runner.send(incBEvent());
      runner.send(incBEvent());

      expect(runner.context().panelACount).toBe(3);
      expect(runner.context().panelBCount).toBe(2);
    });

    it("should preserve context through onDone transition", () => {
      const machine = createParallelCounterMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Increment both counters
      runner.send(incAEvent());
      runner.send(incAEvent());
      runner.send(incBEvent());

      // Complete both regions
      runner.send(doneAEvent());
      runner.send(doneBEvent());

      // Should be in 'complete' state with accumulated context
      expect(runner.state()).toBe("complete");
      expect(runner.context().panelACount).toBe(2);
      expect(runner.context().panelBCount).toBe(1);
    });
  });

  // ===========================================================================
  // matches() with Parallel States
  // ===========================================================================

  describe("matches() with Parallel States", () => {
    it("should match the parallel state itself", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const snapshot = runner.snapshot();
      expect(snapshot.matches("dashboard")).toBe(true);
    });

    it("should match specific regions", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const snapshot = runner.snapshot();
      expect(snapshot.matches("dashboard.panel1")).toBe(true);
      expect(snapshot.matches("dashboard.panel2")).toBe(true);
    });

    it("should match specific child states within regions", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Move panel1 to active
      runner.send(panel1StartEvent());

      const snapshot = runner.snapshot();
      expect(snapshot.matches("dashboard.panel1.active")).toBe(true);
      expect(snapshot.matches("dashboard.panel1.idle")).toBe(false);
      expect(snapshot.matches("dashboard.panel2.idle")).toBe(true);
    });

    it("should NOT match non-existent regions", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const snapshot = runner.snapshot();
      expect(snapshot.matches("dashboard.nonexistent")).toBe(false);
    });

    it("should NOT match after transitioning out of parallel state", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Complete both regions to trigger onDone -> finished
      runner.send(panel1StartEvent());
      runner.send(panel1DoneEvent());
      runner.send(panel2StartEvent());
      runner.send(panel2LoadedEvent());
      runner.send(panel2DoneEvent());

      const snapshot = runner.snapshot();
      expect(snapshot.matches("finished")).toBe(true);
      expect(snapshot.matches("dashboard")).toBe(false);
      expect(snapshot.matches("dashboard.panel1")).toBe(false);
    });
  });

  // ===========================================================================
  // can() with Parallel States
  // ===========================================================================

  describe("can() with Parallel States", () => {
    it("should report events that any region can handle", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const snapshot = runner.snapshot();
      // Both regions are in idle — panel1 can handle PANEL1_START
      expect(snapshot.can({ type: "PANEL1_START" })).toBe(true);
      // Panel2 can handle PANEL2_START
      expect(snapshot.can({ type: "PANEL2_START" })).toBe(true);
      // Neither region handles PANEL2_LOADED in idle state
      expect(snapshot.can({ type: "PANEL2_LOADED" })).toBe(false);
    });

    it("should reflect state changes after region transitions", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Move panel2 to loading
      runner.send(panel2StartEvent());

      const snapshot = runner.snapshot();
      // Now panel2 can handle PANEL2_LOADED
      expect(snapshot.can({ type: "PANEL2_LOADED" })).toBe(true);
      // panel2 can no longer handle PANEL2_START
      expect(snapshot.can({ type: "PANEL2_START" })).toBe(false);
    });
  });

  // ===========================================================================
  // Subscriptions with Parallel States
  // ===========================================================================

  describe("Subscriptions with Parallel States", () => {
    it("should notify subscribers on region transitions", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const snapshots: MachineSnapshot<string, unknown>[] = [];
      const unsubscribe = runner.subscribe(snapshot => {
        snapshots.push(snapshot);
      });

      runner.send(panel1StartEvent());
      runner.send(panel2StartEvent());

      expect(snapshots).toHaveLength(2);

      // First snapshot: panel1 moved to active
      expect(snapshots[0]?.matches("dashboard.panel1.active")).toBe(true);
      expect(snapshots[0]?.matches("dashboard.panel2.idle")).toBe(true);

      // Second snapshot: panel2 moved to loading
      expect(snapshots[1]?.matches("dashboard.panel1.active")).toBe(true);
      expect(snapshots[1]?.matches("dashboard.panel2.loading")).toBe(true);

      unsubscribe();
    });

    it("should notify on onDone transition out of parallel state", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const states: string[] = [];
      const unsubscribe = runner.subscribe(snapshot => {
        states.push(snapshot.state);
      });

      // Complete both regions
      runner.send(panel1StartEvent());
      runner.send(panel1DoneEvent());
      runner.send(panel2StartEvent());
      runner.send(panel2LoadedEvent());
      runner.send(panel2DoneEvent());

      // The last notification should show finished state
      expect(states[states.length - 1]).toBe("finished");

      unsubscribe();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe("Edge Cases", () => {
    it("should handle events that no region processes (no-op)", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Send an event that no region handles
      const result = runner.send(panel1StopEvent());
      // panel1 is in idle, PANEL1_STOP is only handled in active
      const effects = expectOk(result);
      expect(effects).toEqual([]);

      // State should be unchanged
      expect(runner.stateValue()).toEqual({
        dashboard: {
          panel1: "idle",
          panel2: "idle",
        },
      });
    });

    it("should handle transition into parallel from non-initial state", () => {
      const machine = createEffectParallelMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      expect(runner.state()).toBe("setup");

      // Transition into the parallel state
      runner.send(enterParallelEvent());

      expect(runner.state()).toBe("parallel");
      const snapshot = runner.snapshot();
      expect(snapshot.matches("parallel.regionA")).toBe(true);
      expect(snapshot.matches("parallel.regionB")).toBe(true);
      expect(snapshot.matches("parallel.regionA.a1")).toBe(true);
      expect(snapshot.matches("parallel.regionB.b1")).toBe(true);
    });

    it("should handle sendBatch with parallel states", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Send multiple events in batch
      const result = runner.sendBatch([panel1StartEvent(), panel2StartEvent()]);
      expectOk(result);

      expect(runner.stateValue()).toEqual({
        dashboard: {
          panel1: "active",
          panel2: "loading",
        },
      });
    });

    it("should handle dispose correctly during parallel state", async () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      runner.send(panel1StartEvent());

      await runner.dispose();
      expect(runner.isDisposed).toBe(true);
    });

    it("should track stateValue correctly through full parallel lifecycle", () => {
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const stateValueHistory: StateValue[] = [];
      stateValueHistory.push(runner.stateValue());

      runner.send(panel1StartEvent());
      stateValueHistory.push(runner.stateValue());

      runner.send(panel2StartEvent());
      stateValueHistory.push(runner.stateValue());

      runner.send(panel2LoadedEvent());
      stateValueHistory.push(runner.stateValue());

      runner.send(panel1DoneEvent());
      stateValueHistory.push(runner.stateValue());

      runner.send(panel2DoneEvent());
      stateValueHistory.push(runner.stateValue());

      expect(stateValueHistory).toEqual([
        { dashboard: { panel1: "idle", panel2: "idle" } },
        { dashboard: { panel1: "active", panel2: "idle" } },
        { dashboard: { panel1: "active", panel2: "loading" } },
        { dashboard: { panel1: "active", panel2: "ready" } },
        { dashboard: { panel1: "complete", panel2: "ready" } },
        "finished",
      ]);
    });
  });

  // ===========================================================================
  // Nested Compound within Parallel
  // ===========================================================================

  describe("Nested Compound within Parallel", () => {
    it("should handle compound states within parallel regions", () => {
      // The dashboard machine already has compound states within parallel regions
      const machine = createDashboardMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Both regions start in their compound initial states
      expect(runner.stateValue()).toEqual({
        dashboard: {
          panel1: "idle",
          panel2: "idle",
        },
      });

      // Navigate through panel2's compound states
      runner.send(panel2StartEvent()); // idle -> loading
      runner.send(panel2LoadedEvent()); // loading -> ready

      expect(runner.stateValue()).toEqual({
        dashboard: {
          panel1: "idle",
          panel2: "ready",
        },
      });
    });
  });
});
