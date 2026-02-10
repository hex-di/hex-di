/**
 * Action Types Module
 *
 * Defines ActionMap, ActionReducer, BoundActions, NoPayload sentinel,
 * and related types for state port actions.
 *
 * @packageDocumentation
 */

// =============================================================================
// NoPayload Sentinel
// =============================================================================

/**
 * Unique symbol for NoPayload branding.
 * Prevents structural matching with void or undefined.
 */
declare const __noPayload: unique symbol;

/**
 * Branded sentinel type for no-payload actions.
 *
 * Used as default for ActionReducer TPayload to avoid the
 * `undefined extends void` ambiguity in TypeScript.
 * End users never interact with this type directly.
 */
export type NoPayload = { readonly [__noPayload]: true };

// =============================================================================
// ActionReducer
// =============================================================================

/**
 * A reducer function that transforms state.
 *
 * When TPayload is NoPayload (default), the reducer takes only state.
 * When TPayload is provided, the reducer takes state and payload.
 *
 * Uses `[TPayload] extends [NoPayload]` distribution guard to prevent
 * union distribution AND the void/undefined ambiguity.
 */
export type ActionReducer<TState, TPayload = NoPayload> = [TPayload] extends [NoPayload]
  ? (state: TState) => TState
  : (state: TState, payload: TPayload) => TState;

// =============================================================================
// ActionMap
// =============================================================================

/**
 * A record mapping action names to reducer functions.
 *
 * Uses `never[]` rest params to allow actions with specific payload
 * types (e.g., `number`) to satisfy the constraint without
 * contravariance issues. Any function `(state) => state` or
 * `(state, payload: P) => state` satisfies `(state, ...never[]) => state`.
 */
export type ActionMap<TState> = Record<string, (state: TState, ...args: never[]) => TState>;

// =============================================================================
// BoundActions
// =============================================================================

/**
 * Converts action reducers to callable bound actions.
 *
 * The state parameter is removed -- only the payload remains.
 * No-payload reducers become `() => void`.
 * Payload reducers become `(payload: P) => void`.
 */
export type BoundActions<TState, TActions extends ActionMap<TState>> = {
  readonly [K in keyof TActions]: TActions[K] extends (state: TState) => TState
    ? () => void
    : TActions[K] extends (state: TState, payload: infer P) => TState
      ? (payload: P) => void
      : never;
};
