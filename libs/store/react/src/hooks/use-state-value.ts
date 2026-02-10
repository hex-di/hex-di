/**
 * useStateValue Hook
 *
 * Reads state from a state port with optional selector for fine-grained
 * subscriptions. Re-renders only when the selected value changes.
 *
 * @packageDocumentation
 */

import { useRef, useCallback, useSyncExternalStore } from "react";
import { usePort } from "@hex-di/react";
import type { StatePortDef, ActionMap, DeepReadonly } from "@hex-di/store";
import { EMPTY } from "./sentinel.js";

/**
 * Read full state from a state port.
 *
 * Uses useSyncExternalStore for concurrent mode safety.
 */
export function useStateValue<TState, TActions extends ActionMap<TState>>(
  port: StatePortDef<string, TState, TActions>
): DeepReadonly<TState>;

/**
 * Read a selected slice of state from a state port.
 *
 * Uses useSyncExternalStore for concurrent mode safety.
 */
export function useStateValue<TState, TActions extends ActionMap<TState>, TSelected>(
  port: StatePortDef<string, TState, TActions>,
  selector: (state: DeepReadonly<TState>) => TSelected,
  equalityFn?: (a: TSelected, b: TSelected) => boolean
): TSelected;

export function useStateValue<TState, TActions extends ActionMap<TState>, TSelected>(
  port: StatePortDef<string, TState, TActions>,
  selector?: (state: DeepReadonly<TState>) => TSelected,
  equalityFn?: (a: TSelected, b: TSelected) => boolean
): DeepReadonly<TState> | TSelected {
  const service = usePort(port);

  const snapshotRef = useRef<DeepReadonly<TState> | TSelected | typeof EMPTY>(EMPTY);
  const serviceRef = useRef(service);
  if (serviceRef.current !== service) {
    serviceRef.current = service;
    snapshotRef.current = EMPTY;
  }
  const selectorRef = useRef(selector);
  const equalityRef = useRef(equalityFn);
  selectorRef.current = selector;
  equalityRef.current = equalityFn;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (selectorRef.current) {
        return service.subscribe(
          selectorRef.current,
          () => {
            snapshotRef.current = EMPTY;
            onStoreChange();
          },
          equalityRef.current
        );
      }
      return service.subscribe(() => {
        snapshotRef.current = EMPTY;
        onStoreChange();
      });
    },
    [service]
  );

  const getSnapshot = useCallback((): DeepReadonly<TState> | TSelected => {
    if (snapshotRef.current !== EMPTY) {
      return snapshotRef.current;
    }
    const state = service.state;
    const value = selectorRef.current ? selectorRef.current(state) : state;
    snapshotRef.current = value;
    return value;
  }, [service]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
