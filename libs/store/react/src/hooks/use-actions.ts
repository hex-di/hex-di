/**
 * useActions Hook
 *
 * Returns bound actions from a state port without subscribing
 * to state changes. Components that only dispatch never re-render
 * due to state changes.
 *
 * @packageDocumentation
 */

import { usePort } from "@hex-di/react";
import type { StatePortDef, ActionMap, BoundActions } from "@hex-di/store";

/**
 * Returns bound actions from a state port.
 *
 * The returned actions object is referentially stable.
 */
export function useActions<TState, TActions extends ActionMap<TState>>(
  port: StatePortDef<string, TState, TActions>
): BoundActions<TState, TActions> {
  const service = usePort(port);
  return service.actions;
}
