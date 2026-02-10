/**
 * History Types
 *
 * Defines HistoryState and HistoryActions for undo/redo history ports.
 *
 * @packageDocumentation
 */

import type { ActionMap } from "./actions.js";

// =============================================================================
// HistoryState
// =============================================================================

/**
 * Immutable state container with undo/redo stacks.
 *
 * - `past`: States before the current present (most recent last).
 * - `present`: The current state.
 * - `future`: States undone from present (most recent first).
 */
export interface HistoryState<TState> {
  readonly past: readonly TState[];
  readonly present: TState;
  readonly future: readonly TState[];
}

// =============================================================================
// HistoryActions
// =============================================================================

/**
 * Standard undo/redo/push/clear action reducers for HistoryState.
 *
 * Satisfies `ActionMap<HistoryState<TState>>` constraint.
 */
export interface HistoryActions<TState> extends ActionMap<HistoryState<TState>> {
  readonly undo: (state: HistoryState<TState>) => HistoryState<TState>;
  readonly redo: (state: HistoryState<TState>) => HistoryState<TState>;
  readonly push: (state: HistoryState<TState>, payload: TState) => HistoryState<TState>;
  readonly clear: (state: HistoryState<TState>) => HistoryState<TState>;
}
