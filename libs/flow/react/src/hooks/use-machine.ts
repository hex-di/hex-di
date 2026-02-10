/**
 * useMachine Hook
 *
 * React hook for consuming a FlowService from the container.
 * Uses useSyncExternalStore for React 18 concurrent mode compatibility.
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { Port } from "@hex-di/react";
import type {
  FlowService,
  MachineSnapshot,
  ActivityInstance,
  TransitionError,
  EffectExecutionError,
} from "@hex-di/flow";
import { ResultAsync } from "@hex-di/flow";
import { useFlowPort } from "./use-flow-port.js";
import { EMPTY } from "./sentinel.js";

// =============================================================================
// useMachine Hook Result
// =============================================================================

/**
 * Result type for the useMachine hook.
 */
export interface UseMachineResult<TState extends string, TEvent extends string, TContext> {
  readonly state: TState;
  readonly context: TContext;
  readonly send: (event: {
    readonly type: TEvent;
  }) => ResultAsync<void, TransitionError | EffectExecutionError>;
  readonly activities: readonly ActivityInstance[];
}

// =============================================================================
// useMachine Hook
// =============================================================================

/**
 * React hook for consuming a FlowService state machine from the container.
 */
export function useMachine<TState extends string, TEvent extends string, TContext>(
  port: Port<FlowService<TState, TEvent, TContext>, string>
): UseMachineResult<TState, TEvent, TContext> {
  const flowService = useFlowPort<TState, TEvent, TContext>(port);

  const snapshotRef = useRef<MachineSnapshot<TState, TContext> | typeof EMPTY>(EMPTY);
  const serviceRef = useRef(flowService);
  if (serviceRef.current !== flowService) {
    serviceRef.current = flowService;
    snapshotRef.current = EMPTY;
  }

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return flowService.subscribe(() => {
        snapshotRef.current = EMPTY;
        onStoreChange();
      });
    },
    [flowService]
  );

  const getSnapshot = useCallback((): MachineSnapshot<TState, TContext> => {
    if (snapshotRef.current !== EMPTY) {
      return snapshotRef.current;
    }
    const snap = flowService.snapshot();
    snapshotRef.current = snap;
    return snap;
  }, [flowService]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const send = useCallback(
    (event: { readonly type: TEvent }): ResultAsync<void, TransitionError | EffectExecutionError> =>
      flowService.sendAndExecute(event),
    [flowService]
  );

  return useMemo(
    () => ({
      state: snapshot.state,
      context: snapshot.context,
      send,
      activities: snapshot.activities,
    }),
    [snapshot.state, snapshot.context, send, snapshot.activities]
  );
}
