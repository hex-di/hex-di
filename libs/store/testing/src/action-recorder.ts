/**
 * Action Recorder
 *
 * Records dispatched actions from a state service for test assertions.
 *
 * @packageDocumentation
 */

import type { StateService, ActionMap, DeepReadonly } from "@hex-di/store";

// =============================================================================
// Types
// =============================================================================

/** A recorded action dispatch */
export interface RecordedAction<TState> {
  readonly portName: string;
  readonly prevState: DeepReadonly<TState>;
  readonly nextState: DeepReadonly<TState>;
  readonly timestamp: number;
}

/** An action recorder that tracks state changes */
export interface ActionRecorder<TState> {
  /** All recorded actions */
  readonly actions: ReadonlyArray<RecordedAction<TState>>;
  /** Number of recorded actions */
  readonly actionCount: number;
  /** State change history (sequence of states) */
  readonly stateHistory: ReadonlyArray<DeepReadonly<TState>>;
  /** Get recorded actions filtered by port name */
  getEventsForPort(portName: string): ReadonlyArray<RecordedAction<TState>>;
  /** Reset all recordings */
  reset(): void;
  /** Unsubscribe from the service */
  dispose(): void;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates an action recorder that tracks all state changes on a service.
 *
 * @example
 * ```typescript
 * const recorder = createActionRecorder(stateService);
 * stateService.actions.increment();
 * stateService.actions.increment();
 * expect(recorder.actionCount).toBe(2);
 * recorder.dispose();
 * ```
 */
export function createActionRecorder<TState, TActions extends ActionMap<TState>>(
  service: StateService<TState, TActions>,
  portName?: string
): ActionRecorder<TState> {
  const recorded: RecordedAction<TState>[] = [];
  const states: DeepReadonly<TState>[] = [service.state];

  const unsub = service.subscribe((state: DeepReadonly<TState>, prev: DeepReadonly<TState>) => {
    recorded.push({
      portName: portName ?? "unknown",
      prevState: prev,
      nextState: state,
      timestamp: Date.now(),
    });
    states.push(state);
  });

  return {
    get actions(): ReadonlyArray<RecordedAction<TState>> {
      return recorded;
    },
    get actionCount(): number {
      return recorded.length;
    },
    get stateHistory(): ReadonlyArray<DeepReadonly<TState>> {
      return states;
    },
    getEventsForPort(name: string): ReadonlyArray<RecordedAction<TState>> {
      return recorded.filter(r => r.portName === name);
    },
    reset(): void {
      recorded.length = 0;
      states.length = 0;
      states.push(service.state);
    },
    dispose(): void {
      unsub();
    },
  };
}
