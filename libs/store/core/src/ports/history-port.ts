/**
 * History Port Factory
 *
 * Wraps any StatePortDef to add undo/redo/push/clear capabilities.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/core";
import type { StatePortDef } from "./port-types.js";
import type { ActionMap } from "../types/actions.js";
import type { HistoryState, HistoryActions } from "../types/history.js";

// =============================================================================
// createHistoryActions
// =============================================================================

/**
 * Creates frozen reducer functions for undo/redo/push/clear operations.
 *
 * Reducer semantics:
 * - `undo`: pop from past → present, push old present → future. No-op if past empty.
 * - `redo`: pop from future → present, push old present → past. No-op if future empty.
 * - `push`: push present → past, payload → present, clear future.
 * - `clear`: empty past/future, keep present.
 */
export function createHistoryActions<TState>(): HistoryActions<TState> {
  return Object.freeze({
    undo(state: HistoryState<TState>): HistoryState<TState> {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    },

    redo(state: HistoryState<TState>): HistoryState<TState> {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    },

    push(state: HistoryState<TState>, payload: TState): HistoryState<TState> {
      return {
        past: [...state.past, state.present],
        present: payload,
        future: [],
      };
    },

    clear(state: HistoryState<TState>): HistoryState<TState> {
      return {
        past: [],
        present: state.present,
        future: [],
      };
    },
  });
}

// =============================================================================
// createHistoryPort
// =============================================================================

/**
 * Creates a history port wrapping any StatePortDef.
 *
 * The resulting port name is `${innerName}History`.
 * State is `HistoryState<TState>` and actions are `HistoryActions<TState>`.
 */
export function createHistoryPort<TName extends string, TState, TActions extends ActionMap<TState>>(
  innerPort: StatePortDef<TName, TState, TActions>
): StatePortDef<`${TName}History`, HistoryState<TState>, HistoryActions<TState>>;
export function createHistoryPort(innerPort: { readonly __portName: string }): unknown {
  const innerName = innerPort.__portName;
  return createPort({ name: `${innerName}History` });
}
