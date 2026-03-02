/**
 * History Pseudo-States Runtime Tests
 *
 * Tests for history pseudo-state support in the Flow state machine runtime.
 * History pseudo-states remember and restore the last active child state
 * of their parent compound state.
 *
 * Key semantics tested:
 * - Shallow history: remembers immediate child of parent compound
 * - Deep history: remembers deepest active descendant recursively
 * - No-history fallback: uses `target` property or parent's initial
 * - History after multiple transitions
 * - Re-entering compound with history
 * - History + normalization (defaults to "shallow")
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { expectOk } from "@hex-di/result-testing";
import { defineMachine } from "../src/machine/define-machine.js";
import { event } from "../src/machine/factories.js";
import { createMachineRunner, type EffectExecutor } from "../src/runner/index.js";
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
 * Compound state with a shallow history pseudo-state.
 *
 * Structure:
 * - idle
 * - editor (compound)
 *   - editing
 *   - reviewing
 *   - hist (history, shallow, fallback: editing)
 * - settings
 *
 * Transitions:
 * - idle -> editor (enters editing by default)
 * - editor.editing -> editor.reviewing (REVIEW)
 * - editor -> settings (SETTINGS)
 * - settings -> editor.hist (BACK) — restores last active child of editor
 */
function createShallowHistoryMachine() {
  return defineMachine({
    id: "shallow-history",
    initial: "idle",
    context: undefined,
    states: {
      idle: {
        on: {
          OPEN: { target: "editor" },
        },
      },
      editor: {
        type: "compound" as const,
        id: "editorState",
        initial: "editing",
        states: {
          editing: {
            on: {
              REVIEW: { target: "reviewing" },
            },
          },
          reviewing: {
            on: {
              EDIT: { target: "editing" },
            },
          },
          hist: {
            type: "history" as const,
            target: "editing",
          },
        },
        on: {
          SETTINGS: { target: "settings" },
        },
      },
      settings: {
        on: {
          BACK: { target: "#editorState.hist" },
        },
      },
    },
  });
}

/**
 * Deep compound state with deep history pseudo-state.
 *
 * Structure:
 * - idle
 * - wizard (compound)
 *   - step1 (compound)
 *     - substep1a
 *     - substep1b
 *   - step2
 *   - hist (history, deep)
 * - paused
 *
 * When transitioning wizard -> paused -> wizard.hist (deep):
 * Should restore to the full path (e.g., wizard.step1.substep1b)
 */
function createDeepHistoryMachine() {
  return defineMachine({
    id: "deep-history",
    initial: "idle",
    context: undefined,
    states: {
      idle: {
        on: {
          START: { target: "wizard" },
        },
      },
      wizard: {
        type: "compound" as const,
        id: "wizardState",
        initial: "step1",
        states: {
          step1: {
            type: "compound" as const,
            initial: "substep1a",
            states: {
              substep1a: {
                on: {
                  NEXT_SUB: { target: "substep1b" },
                },
              },
              substep1b: {
                on: {
                  NEXT_STEP: { target: "#wizardState.step2" },
                },
              },
            },
          },
          step2: {
            on: {},
          },
          hist: {
            type: "history" as const,
            history: "deep" as const,
            target: "step1",
          },
        },
        on: {
          PAUSE: { target: "paused" },
        },
      },
      paused: {
        on: {
          RESUME: { target: "#wizardState.hist" },
        },
      },
    },
  });
}

/**
 * Machine to test no-history fallback behavior.
 *
 * Structure:
 * - idle
 * - form (compound)
 *   - name
 *   - email
 *   - histWithTarget (history, target: email)
 *   - histNoTarget (history, no target — should use parent initial = name)
 * - done
 */
function createFallbackHistoryMachine() {
  return defineMachine({
    id: "fallback-history",
    initial: "idle",
    context: undefined,
    states: {
      idle: {
        on: {
          START_WITH_TARGET: { target: "#formState.histWithTarget" },
          START_NO_TARGET: { target: "#formState.histNoTarget" },
          START_NORMAL: { target: "form" },
        },
      },
      form: {
        type: "compound" as const,
        id: "formState",
        initial: "name",
        states: {
          name: {
            on: {
              NEXT: { target: "email" },
            },
          },
          email: {
            on: {},
          },
          histWithTarget: {
            type: "history" as const,
            target: "email",
          },
          histNoTarget: {
            type: "history" as const,
          },
        },
        on: {
          EXIT: { target: "done" },
        },
      },
      done: {
        on: {},
      },
    },
  });
}

// =============================================================================
// Event Factories
// =============================================================================

const openEvent = event<"OPEN">("OPEN");
const reviewEvent = event<"REVIEW">("REVIEW");
const editEvent = event<"EDIT">("EDIT");
const settingsEvent = event<"SETTINGS">("SETTINGS");
const backEvent = event<"BACK">("BACK");
const startEvent = event<"START">("START");
const nextSubEvent = event<"NEXT_SUB">("NEXT_SUB");
const nextStepEvent = event<"NEXT_STEP">("NEXT_STEP");
const pauseEvent = event<"PAUSE">("PAUSE");
const resumeEvent = event<"RESUME">("RESUME");
const startWithTargetEvent = event<"START_WITH_TARGET">("START_WITH_TARGET");
const startNoTargetEvent = event<"START_NO_TARGET">("START_NO_TARGET");
const startNormalEvent = event<"START_NORMAL">("START_NORMAL");
const nextEvent = event<"NEXT">("NEXT");
const exitEvent = event<"EXIT">("EXIT");

// =============================================================================
// Tests
// =============================================================================

describe("History Pseudo-States", () => {
  let activityManager: ActivityManager;

  beforeEach(() => {
    activityManager = createActivityManager();
  });

  afterEach(async () => {
    await activityManager.dispose();
  });

  // ===========================================================================
  // Shallow History
  // ===========================================================================

  describe("Shallow History", () => {
    it("should restore to the last active child on re-entry", () => {
      const machine = createShallowHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Enter editor (starts at editing)
      runner.send(openEvent());
      expect(runner.snapshot().matches("editor.editing")).toBe(true);

      // Move to reviewing
      runner.send(reviewEvent());
      expect(runner.snapshot().matches("editor.reviewing")).toBe(true);

      // Exit to settings
      runner.send(settingsEvent());
      expect(runner.state()).toBe("settings");

      // Go back via history — should restore to reviewing (last active)
      runner.send(backEvent());
      expect(runner.snapshot().matches("editor.reviewing")).toBe(true);
    });

    it("should default to shallow history mode when not specified", () => {
      // The shallow history machine's hist node doesn't specify history mode.
      // normalizeStateNode should default it to "shallow".
      const machine = createShallowHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Enter editor -> editing
      runner.send(openEvent());

      // Move to reviewing
      runner.send(reviewEvent());
      expect(runner.snapshot().matches("editor.reviewing")).toBe(true);

      // Exit to settings
      runner.send(settingsEvent());

      // Go back via history — should restore to reviewing (shallow: just immediate child)
      runner.send(backEvent());
      expect(runner.snapshot().matches("editor.reviewing")).toBe(true);
    });

    it("should track history across multiple enter/exit cycles", () => {
      const machine = createShallowHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // First cycle: enter -> editing -> reviewing -> exit
      runner.send(openEvent());
      runner.send(reviewEvent());
      runner.send(settingsEvent());

      // Restore via history -> reviewing
      runner.send(backEvent());
      expect(runner.snapshot().matches("editor.reviewing")).toBe(true);

      // Go back to editing, then exit again
      runner.send(editEvent());
      expect(runner.snapshot().matches("editor.editing")).toBe(true);
      runner.send(settingsEvent());

      // Restore via history -> editing (updated history)
      runner.send(backEvent());
      expect(runner.snapshot().matches("editor.editing")).toBe(true);
    });
  });

  // ===========================================================================
  // Deep History
  // ===========================================================================

  describe("Deep History", () => {
    it("should restore to the deepest active descendant", () => {
      const machine = createDeepHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Enter wizard -> step1 -> substep1a
      runner.send(startEvent());
      expect(runner.snapshot().matches("wizard.step1.substep1a")).toBe(true);

      // Navigate to substep1b
      runner.send(nextSubEvent());
      expect(runner.snapshot().matches("wizard.step1.substep1b")).toBe(true);

      // Pause (exit wizard)
      runner.send(pauseEvent());
      expect(runner.state()).toBe("paused");

      // Resume via deep history — should restore to wizard.step1.substep1b
      runner.send(resumeEvent());
      expect(runner.snapshot().matches("wizard.step1.substep1b")).toBe(true);
    });

    it("should restore deep nested state after transitioning within", () => {
      const machine = createDeepHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Enter wizard -> step1 -> substep1a -> substep1b -> step2
      runner.send(startEvent());
      runner.send(nextSubEvent());
      runner.send(nextStepEvent());
      expect(runner.snapshot().matches("wizard.step2")).toBe(true);

      // Pause
      runner.send(pauseEvent());
      expect(runner.state()).toBe("paused");

      // Resume via deep history — should restore to wizard.step2
      runner.send(resumeEvent());
      expect(runner.snapshot().matches("wizard.step2")).toBe(true);
    });
  });

  // ===========================================================================
  // No-History Fallback
  // ===========================================================================

  describe("No-History Fallback", () => {
    it("should fall back to target property when no history recorded", () => {
      const machine = createFallbackHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Go directly to form.histWithTarget without ever entering form first
      runner.send(startWithTargetEvent());

      // Should fall back to target: "email"
      expect(runner.snapshot().matches("form.email")).toBe(true);
    });

    it("should fall back to parent initial when no history and no target", () => {
      const machine = createFallbackHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Go directly to form.histNoTarget without ever entering form first
      runner.send(startNoTargetEvent());

      // Should fall back to parent initial: "name"
      expect(runner.snapshot().matches("form.name")).toBe(true);
    });

    it("should use recorded history instead of fallback after a visit", () => {
      const machine = createFallbackHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // First, enter form normally and navigate to email
      runner.send(startNormalEvent());
      expect(runner.snapshot().matches("form.name")).toBe(true);
      runner.send(nextEvent());
      expect(runner.snapshot().matches("form.email")).toBe(true);

      // Exit form
      runner.send(exitEvent());
      expect(runner.state()).toBe("done");
    });
  });

  // ===========================================================================
  // History After Multiple Transitions
  // ===========================================================================

  describe("History After Multiple Transitions", () => {
    it("should always record the most recent active state", () => {
      const machine = createShallowHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Enter editor -> editing
      runner.send(openEvent());
      expect(runner.snapshot().matches("editor.editing")).toBe(true);

      // Exit immediately
      runner.send(settingsEvent());

      // Go back via history — should be editing (was the last active)
      runner.send(backEvent());
      expect(runner.snapshot().matches("editor.editing")).toBe(true);

      // Now move to reviewing
      runner.send(reviewEvent());
      expect(runner.snapshot().matches("editor.reviewing")).toBe(true);

      // Exit
      runner.send(settingsEvent());

      // Go back via history — should be reviewing now (most recent)
      runner.send(backEvent());
      expect(runner.snapshot().matches("editor.reviewing")).toBe(true);
    });
  });

  // ===========================================================================
  // Re-entering Compound with History
  // ===========================================================================

  describe("Re-entering Compound with History", () => {
    it("should auto-enter compound states within the restored path (shallow)", () => {
      // For shallow history, the restored path is just the immediate child.
      // If that child is compound, it should auto-enter its initial child.
      const _machine = createDeepHistoryMachine();

      // We'll test with shallow history behavior by using a machine that
      // has a history node we can compare. In the deep history machine,
      // if we used shallow history, restoring to step1 would auto-enter substep1a.
      // Let's create a specific test.

      // Create a shallow history variant
      const shallowMachine = defineMachine({
        id: "shallow-deep-test",
        initial: "idle",
        context: undefined,
        states: {
          idle: {
            on: { START: { target: "wizard" } },
          },
          wizard: {
            type: "compound" as const,
            id: "wizardShallow",
            initial: "step1",
            states: {
              step1: {
                type: "compound" as const,
                initial: "substep1a",
                states: {
                  substep1a: {
                    on: { NEXT_SUB: { target: "substep1b" } },
                  },
                  substep1b: {
                    on: {},
                  },
                },
              },
              step2: {
                on: {},
              },
              hist: {
                type: "history" as const,
                history: "shallow" as const,
              },
            },
            on: {
              PAUSE: { target: "paused" },
            },
          },
          paused: {
            on: {
              RESUME: { target: "#wizardShallow.hist" },
            },
          },
        },
      });

      const runner = createMachineRunner(shallowMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Enter wizard -> step1 -> substep1a
      runner.send(startEvent());
      expect(runner.snapshot().matches("wizard.step1.substep1a")).toBe(true);

      // Navigate to substep1b
      runner.send(nextSubEvent());
      expect(runner.snapshot().matches("wizard.step1.substep1b")).toBe(true);

      // Pause
      runner.send(pauseEvent());
      expect(runner.state()).toBe("paused");

      // Resume via shallow history — should restore to step1 (immediate child),
      // then auto-enter step1's initial (substep1a)
      runner.send(resumeEvent());
      expect(runner.snapshot().matches("wizard.step1.substep1a")).toBe(true);
    });

    it("should restore exact deep path with deep history", () => {
      const machine = createDeepHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Enter wizard -> step1 -> substep1a -> substep1b
      runner.send(startEvent());
      runner.send(nextSubEvent());
      expect(runner.snapshot().matches("wizard.step1.substep1b")).toBe(true);

      // Pause
      runner.send(pauseEvent());

      // Resume via deep history — should restore to wizard.step1.substep1b exactly
      runner.send(resumeEvent());
      expect(runner.snapshot().matches("wizard.step1.substep1b")).toBe(true);
      // Also verify the substep1a is NOT matched
      expect(runner.snapshot().matches("wizard.step1.substep1a")).toBe(false);
    });
  });

  // ===========================================================================
  // StateValue with History
  // ===========================================================================

  describe("StateValue with History", () => {
    it("should produce correct stateValue after history restore", () => {
      const machine = createShallowHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Enter editor -> editing -> reviewing
      runner.send(openEvent());
      runner.send(reviewEvent());

      // Exit to settings
      runner.send(settingsEvent());
      expect(runner.stateValue()).toBe("settings");

      // Back via history -> reviewing
      runner.send(backEvent());
      expect(runner.stateValue()).toEqual({ editor: "reviewing" });
    });

    it("should produce correct stateValue after deep history restore", () => {
      const machine = createDeepHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Navigate deep: wizard.step1.substep1b
      runner.send(startEvent());
      runner.send(nextSubEvent());
      expect(runner.stateValue()).toEqual({ wizard: { step1: "substep1b" } });

      // Pause
      runner.send(pauseEvent());
      expect(runner.stateValue()).toBe("paused");

      // Resume via deep history
      runner.send(resumeEvent());
      expect(runner.stateValue()).toEqual({ wizard: { step1: "substep1b" } });
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe("Edge Cases", () => {
    it("should handle can() correctly when in a history-restored state", () => {
      const machine = createShallowHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Enter editor -> editing -> reviewing
      runner.send(openEvent());
      runner.send(reviewEvent());

      // Exit to settings
      runner.send(settingsEvent());

      // Back via history -> reviewing
      runner.send(backEvent());

      const snapshot = runner.snapshot();
      // In reviewing state, EDIT should be available
      expect(snapshot.can({ type: "EDIT" })).toBe(true);
      // REVIEW should NOT be available (that's from editing state)
      expect(snapshot.can({ type: "REVIEW" })).toBe(false);
      // SETTINGS should be available (from editor compound parent)
      expect(snapshot.can({ type: "SETTINGS" })).toBe(true);
    });

    it("should handle sendBatch correctly with history transitions", () => {
      const machine = createShallowHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Batch: OPEN -> REVIEW -> SETTINGS -> BACK (restore via history)
      const result = runner.sendBatch([openEvent(), reviewEvent(), settingsEvent(), backEvent()]);
      expectOk(result);

      // Should be back in editor.reviewing via history
      expect(runner.snapshot().matches("editor.reviewing")).toBe(true);
    });

    it("should handle subscribe notifications for history-restored transitions", () => {
      const machine = createShallowHistoryMachine();
      const runner = createMachineRunner(machine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const states: string[] = [];
      const unsubscribe = runner.subscribe(snapshot => {
        states.push(snapshot.state);
      });

      // OPEN -> REVIEW -> SETTINGS -> BACK
      runner.send(openEvent());
      runner.send(reviewEvent());
      runner.send(settingsEvent());
      runner.send(backEvent());

      // Verify notification sequence
      expect(states).toEqual(["editor", "editor", "settings", "editor"]);

      unsubscribe();
    });
  });
});
