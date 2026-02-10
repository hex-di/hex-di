/**
 * useStatePort Hook
 *
 * Convenience hook returning both state and actions from a state port.
 *
 * @packageDocumentation
 */

import { useRef, useCallback, useSyncExternalStore } from "react";
import { usePort } from "@hex-di/react";
import type { StatePortDef, ActionMap, BoundActions, DeepReadonly } from "@hex-di/store";
import { EMPTY } from "./sentinel.js";

export interface UseStatePortResult<TState, TActions extends ActionMap<TState>> {
  readonly state: DeepReadonly<TState>;
  readonly actions: BoundActions<TState, TActions>;
}

/**
 * Returns both state and actions from a state port.
 *
 * This subscribes to the full state. For fine-grained control,
 * use useStateValue + useActions separately.
 */
export function useStatePort<TState, TActions extends ActionMap<TState>>(
  port: StatePortDef<string, TState, TActions>
): UseStatePortResult<TState, TActions> {
  const service = usePort(port);

  const snapshotRef = useRef<DeepReadonly<TState> | typeof EMPTY>(EMPTY);
  const serviceRef = useRef(service);
  if (serviceRef.current !== service) {
    serviceRef.current = service;
    snapshotRef.current = EMPTY;
  }

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return service.subscribe(() => {
        snapshotRef.current = EMPTY;
        onStoreChange();
      });
    },
    [service]
  );

  const getSnapshot = useCallback((): DeepReadonly<TState> => {
    if (snapshotRef.current !== EMPTY) {
      return snapshotRef.current;
    }
    const state = service.state;
    snapshotRef.current = state;
    return state;
  }, [service]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { state, actions: service.actions };
}
