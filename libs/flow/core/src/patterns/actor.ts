/**
 * Actor Model Pattern - Machine Activity
 *
 * Wraps a child machine definition in a ConfiguredActivity so it can be
 * spawned by a parent machine via Effect.spawn().
 *
 * The child machine runs inside the ActivityManager, processes events,
 * and emits output events to the parent via EventSink. It is automatically
 * stopped when the parent exits the spawning state (via AbortSignal).
 *
 * @packageDocumentation
 */

import type { MachineAny } from "../machine/types.js";
import type { EventSink, Activity } from "../activities/types.js";
import { createMachineRunner } from "../runner/create-runner.js";
import { createActivityManager } from "../activities/manager.js";
import { createBasicExecutor } from "../runner/executor.js";
import { getDescriptorValue } from "../utils/type-bridge.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for creating a machine activity.
 */
export interface MachineActivityConfig {
  /**
   * Events to emit to the parent when the child reaches a final state.
   * If provided, the done event is emitted when the child's state matches
   * a state with `type: 'final'`.
   */
  readonly doneEventType?: string;

  /**
   * Events to emit to the parent when the child encounters an error.
   */
  readonly errorEventType?: string;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates an Activity that runs a child machine.
 *
 * The child machine is created fresh on each spawn, processes events from
 * its input, and emits events to the parent via EventSink. The child is
 * stopped when the AbortSignal is triggered (parent state exit).
 *
 * @param childMachine - The machine definition for the child
 * @param config - Optional configuration for done/error event types
 * @returns An Activity that wraps the child machine
 *
 * @example
 * ```typescript
 * const childMachine = defineMachine({ ... });
 * const childActivity = createMachineActivity(childMachine, {
 *   doneEventType: 'CHILD_DONE',
 *   errorEventType: 'CHILD_ERROR',
 * });
 *
 * // Spawn as an activity
 * const machine = defineMachine({
 *   states: {
 *     active: {
 *       entry: [Effect.spawn('child', { machine: childMachine })],
 *       on: {
 *         CHILD_DONE: { target: 'complete' },
 *         CHILD_ERROR: { target: 'error' },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export function createMachineActivity(
  childMachine: MachineAny,
  config?: MachineActivityConfig
): Activity<{ readonly events?: readonly { readonly type: string }[] }, void> {
  return {
    async execute(
      input: { readonly events?: readonly { readonly type: string }[] },
      sink: EventSink,
      signal: AbortSignal
    ): Promise<void> {
      const activityManager = createActivityManager();
      const executor = createBasicExecutor();

      const runner = createMachineRunner(childMachine, {
        executor,
        activityManager,
      });

      // Track whether the done event has been emitted to avoid duplicates
      let doneEmitted = false;

      /**
       * Checks whether the runner's current state is final and emits
       * the done event if so. Must be called after every state change.
       */
      const checkFinal = (): void => {
        if (doneEmitted || !config?.doneEventType) {
          return;
        }
        const statesRecord = childMachine.states;
        const stateNode = getDescriptorValue(statesRecord, runner.state());
        if (
          typeof stateNode === "object" &&
          stateNode !== null &&
          getDescriptorValue(stateNode, "type") === "final"
        ) {
          doneEmitted = true;
          sink.emit({ type: config.doneEventType });
        }
      };

      // Subscribe to child state changes BEFORE processing events
      // so the subscriber catches transitions to final states.
      const unsub = runner.subscribe(() => {
        checkFinal();
      });

      // Process any input events
      if (input.events) {
        for (const event of input.events) {
          if (signal.aborted) {
            break;
          }
          runner.send(event);
        }
      }

      // Check if the initial state (or state after events) is already final
      checkFinal();

      // Wait for abort signal
      if (!signal.aborted) {
        await new Promise<void>(resolve => {
          const onAbort = () => {
            signal.removeEventListener("abort", onAbort);
            resolve();
          };
          signal.addEventListener("abort", onAbort);
          // If already aborted during setup, resolve immediately
          if (signal.aborted) {
            signal.removeEventListener("abort", onAbort);
            resolve();
          }
        });
      }

      // Cleanup
      unsub();
      await runner.dispose();
      await activityManager.dispose();
    },
  };
}
