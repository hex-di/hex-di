/**
 * useFlow Hook
 *
 * Primary React hook for consuming a FlowService from the container.
 * Returns snapshot, send, matches, can, and status for full machine access.
 * Uses useSyncExternalStore for React 18 concurrent mode compatibility.
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { Port } from "@hex-di/react";
import type {
  FlowService,
  MachineSnapshot,
  TransitionError,
  EffectExecutionError,
} from "@hex-di/flow";
import { ResultAsync } from "@hex-di/flow";
import { useFlowPort } from "./use-flow-port.js";
import { EMPTY } from "./sentinel.js";

// =============================================================================
// FlowStatus Type
// =============================================================================

export type FlowStatus = "active" | "done" | "error";

// =============================================================================
// UseFlowResult Type
// =============================================================================

export interface UseFlowResult<TState extends string, TEvent extends string, TContext> {
  readonly snapshot: MachineSnapshot<TState, TContext>;
  readonly send: (event: {
    readonly type: TEvent;
  }) => ResultAsync<void, TransitionError | EffectExecutionError>;
  readonly matches: (path: TState | `${TState}.${string}`) => boolean;
  readonly can: (event: { readonly type: string }) => boolean;
  readonly status: FlowStatus;
}

// =============================================================================
// useFlow Hook
// =============================================================================

export function useFlow<TState extends string, TEvent extends string, TContext>(
  port: Port<string, FlowService<TState, TEvent, TContext>>
): UseFlowResult<TState, TEvent, TContext> {
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

  const matches = useCallback(
    (path: TState | `${TState}.${string}`): boolean => snapshot.matches(path),
    [snapshot]
  );

  const can = useCallback(
    (event: { readonly type: string }): boolean => snapshot.can(event),
    [snapshot]
  );

  const status: FlowStatus = useMemo(() => {
    if (flowService.isDisposed) return "done";
    return "active";
  }, [flowService.isDisposed]);

  return useMemo(
    () => ({ snapshot, send, matches, can, status }),
    [snapshot, send, matches, can, status]
  );
}
