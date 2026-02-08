/**
 * Flow Event Recorder
 *
 * Records state transitions and effects from a machine runner.
 *
 * @packageDocumentation
 */

import type { MachineSnapshot } from "@hex-di/flow";

// =============================================================================
// Types
// =============================================================================

/** A recorded transition event */
export interface RecordedTransition {
  readonly prevState: string;
  readonly nextState: string;
  readonly context: unknown;
  readonly timestamp: number;
}

/** Result from creating an event recorder */
export interface FlowEventRecorder {
  /** All recorded transitions */
  readonly transitions: ReadonlyArray<RecordedTransition>;
  /** Number of transitions recorded */
  readonly transitionCount: number;
  /** State history (sequence of state names) */
  readonly stateHistory: ReadonlyArray<string>;
  /** Reset all recordings */
  reset(): void;
  /** Unsubscribe from the runner */
  dispose(): void;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates an event recorder that tracks all state transitions.
 *
 * @example
 * ```typescript
 * const recorder = createFlowEventRecorder(runner);
 * await runner.sendAndExecute({ type: 'FETCH' });
 * expect(recorder.transitionCount).toBe(1);
 * expect(recorder.stateHistory).toEqual(['idle', 'loading']);
 * recorder.dispose();
 * ```
 */
export function createFlowEventRecorder<TState extends string, TContext>(runner: {
  state(): TState;
  subscribe(callback: (snapshot: MachineSnapshot<TState, TContext>) => void): () => void;
}): FlowEventRecorder {
  const transitions: RecordedTransition[] = [];
  let prevState = runner.state();

  // Record initial state in history
  const stateNames: string[] = [prevState];

  const unsub = runner.subscribe(snapshot => {
    transitions.push({
      prevState,
      nextState: snapshot.state,
      context: snapshot.context,
      timestamp: Date.now(),
    });
    stateNames.push(snapshot.state);
    prevState = snapshot.state;
  });

  return {
    get transitions(): ReadonlyArray<RecordedTransition> {
      return transitions;
    },
    get transitionCount(): number {
      return transitions.length;
    },
    get stateHistory(): ReadonlyArray<string> {
      return stateNames;
    },
    reset(): void {
      transitions.length = 0;
      stateNames.length = 0;
      prevState = runner.state();
      stateNames.push(prevState);
    },
    dispose(): void {
      unsub();
    },
  };
}
