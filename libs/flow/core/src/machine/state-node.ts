/**
 * StateNode Configuration Types
 *
 * This module provides the StateNode type for defining individual states
 * in a state machine configuration. Key features:
 *
 * - `entry`: Optional effects run when entering the state
 * - `exit`: Optional effects run when exiting the state
 * - `on`: Mapping of event names to transition configurations
 *
 * @packageDocumentation
 */

import type { EffectAny } from "../effects/types.js";
import type { TransitionConfigOrArray } from "./transition.js";
import type { EventAny } from "./types.js";

// =============================================================================
// StateNode Type
// =============================================================================

/**
 * Configuration for a single state in the state machine.
 *
 * A state node defines:
 * - Entry effects: Side effects executed when the machine enters this state
 * - Exit effects: Side effects executed when the machine leaves this state
 * - Transitions: How the machine responds to events while in this state
 *
 * @typeParam TAllStates - Union of all valid state names in the machine
 * @typeParam TAllEventNames - Union of all event type names in the machine
 * @typeParam TContext - The machine's context type
 *
 * @remarks
 * Entry and exit effects are pure data descriptors that will be executed
 * by the effect executor. They do not affect state transition logic.
 *
 * The `on` property maps event type names (strings) to transition configurations.
 * Each transition configuration must have a valid target state from TAllStates.
 *
 * States with an empty `on` object are terminal/final states - the machine
 * will not transition away from them unless events are explicitly handled.
 *
 * @example Basic state
 * ```typescript
 * const idleState: StateNode<
 *   'idle' | 'loading' | 'success',
 *   'FETCH' | 'RESET',
 *   { count: number }
 * > = {
 *   on: {
 *     FETCH: { target: 'loading' },
 *   },
 * };
 * ```
 *
 * @example State with entry/exit effects
 * ```typescript
 * const loadingState: StateNode<
 *   'idle' | 'loading' | 'success',
 *   'SUCCESS' | 'FAILURE',
 *   { data: string | null }
 * > = {
 *   entry: [Effect.invoke(LoggerPort, 'log', ['Starting load...'])],
 *   exit: [Effect.invoke(LoggerPort, 'log', ['Load complete'])],
 *   on: {
 *     SUCCESS: { target: 'success' },
 *     FAILURE: { target: 'idle' },
 *   },
 * };
 * ```
 *
 * @example Terminal state (no transitions)
 * ```typescript
 * const successState: StateNode<
 *   'idle' | 'loading' | 'success',
 *   'RESET',
 *   { data: string }
 * > = {
 *   on: {}, // No events handled - terminal state
 * };
 * ```
 */
export interface StateNode<TAllStates extends string, TAllEventNames extends string, TContext> {
  /**
   * The type of this state node.
   *
   * - `'atomic'` (default): A simple leaf state with no sub-states
   * - `'compound'`: A state containing nested child states
   * - `'parallel'`: A state where all child states are active simultaneously
   * - `'final'`: A terminal state. No outgoing transitions are allowed.
   *   When reached, the machine will not process further events.
   * - `'history'`: A pseudo-state that remembers and restores the last
   *   active child state of its parent compound state.
   *
   * @default 'atomic'
   */
  readonly type?: "atomic" | "compound" | "parallel" | "final" | "history";

  /**
   * The initial child state for compound states.
   * Required when `type` is `'compound'`.
   */
  readonly initial?: string;

  /**
   * Nested child state definitions for compound states.
   * Required when `type` is `'compound'`.
   */
  readonly states?: Record<string, StateNode<string, string, TContext>>;

  /**
   * Transition fired when a child state reaches a `final` state.
   * Only meaningful for compound states.
   */
  readonly onDone?:
    | TAllStates
    | TransitionConfigOrArray<TAllStates, { readonly type: string } & EventAny, TContext>;

  /**
   * Optional state ID for `#id` absolute targeting.
   * Used to reference this state from anywhere in the hierarchy.
   */
  readonly id?: string;

  /**
   * Optional effects to execute when entering this state.
   *
   * Entry effects are executed after the transition is complete and the
   * machine has officially entered the new state. They are pure data
   * descriptors that will be executed by the effect executor.
   *
   * @example
   * ```typescript
   * entry: [
   *   Effect.invoke(AnalyticsPort, 'track', ['state_entered', { state: 'loading' }]),
   *   Effect.spawn('loadData', { id: '123' }),
   * ]
   * ```
   */
  readonly entry?: readonly EffectAny[];

  /**
   * Optional effects to execute when exiting this state.
   *
   * Exit effects are executed before the transition begins and before
   * any transition actions are applied. They are pure data descriptors
   * that will be executed by the effect executor.
   *
   * @example
   * ```typescript
   * exit: [
   *   Effect.stop('loadData'),
   *   Effect.invoke(LoggerPort, 'log', ['Exiting state']),
   * ]
   * ```
   */
  readonly exit?: readonly EffectAny[];

  /**
   * Mapping of event type names to transition configurations.
   *
   * Each key is an event type name (e.g., 'FETCH', 'SUCCESS'), and the value
   * is either a single TransitionConfig, an array of TransitionConfigs
   * (for guarded transitions that need to be evaluated in order),
   * or a string shorthand for the target state name.
   *
   * The `on` object can have any subset of events from TAllEventNames.
   * Events not listed here will be ignored when the machine is in this state.
   *
   * If omitted, the state has no transitions (equivalent to `on: {}`).
   * This is common for final/terminal states.
   *
   * @example Single transition
   * ```typescript
   * on: {
   *   FETCH: { target: 'loading' },
   * }
   * ```
   *
   * @example String shorthand
   * ```typescript
   * on: {
   *   TOGGLE: 'on', // equivalent to { target: 'on' }
   * }
   * ```
   *
   * @example Multiple guarded transitions
   * ```typescript
   * on: {
   *   RETRY: [
   *     { target: 'loading', guard: (ctx) => ctx.retryCount < 3 },
   *     { target: 'error' }, // Fallback if guard fails
   *   ],
   * }
   * ```
   */
  readonly on?: StateNodeTransitions<TAllStates, TAllEventNames, TContext>;

  /**
   * Eventless (automatic) transitions evaluated immediately after entering this state.
   *
   * These transitions are checked before any queued events are processed.
   * If a guard on an `always` transition returns true (or there is no guard),
   * the transition is taken immediately. This enables transient states that
   * redirect to other states based on context.
   *
   * @example
   * ```typescript
   * checking: {
   *   always: [
   *     { target: 'authorized', guard: (ctx) => ctx.role === 'admin' },
   *     { target: 'unauthorized' },
   *   ],
   * }
   * ```
   */
  readonly always?: TransitionConfigOrArray<
    TAllStates,
    { readonly type: string } & EventAny,
    TContext
  >;

  /**
   * Delayed (timed) transitions that fire after a specified duration.
   *
   * Each key is a delay in milliseconds, and the value is a transition config.
   * Delayed transitions are normalized at `defineMachine` time into:
   * - An entry effect: `Effect.sequence([Effect.delay(ms), Effect.emit($$AFTER_<ms>)])`
   * - An event handler in `on`: `{ "$$AFTER_<ms>": transitionConfig }`
   *
   * If the machine exits the state before the delay fires, the internal
   * `$$AFTER_*` event is silently ignored (no-op).
   *
   * @example
   * ```typescript
   * waiting: {
   *   after: {
   *     3000: { target: 'timeout' },
   *     5000: { target: 'expired', guard: (ctx) => ctx.retries === 0 },
   *   },
   * }
   * ```
   */
  readonly after?: {
    readonly [ms: number]:
      | TAllStates
      | TransitionConfigOrArray<TAllStates, { readonly type: string } & EventAny, TContext>;
  };

  /**
   * The history mode for history pseudo-states.
   *
   * Only meaningful when `type` is `'history'`.
   *
   * - `'shallow'` (default): Remembers the immediate child of the parent compound state
   * - `'deep'`: Remembers the deepest active descendant recursively
   *
   * @default 'shallow'
   */
  readonly history?: "shallow" | "deep";

  /**
   * Fallback target state when no history has been recorded yet.
   *
   * Only meaningful when `type` is `'history'`. If the parent compound state
   * has never been entered and exited, transitioning to this history pseudo-state
   * will redirect to this target instead. If not specified, the parent's initial
   * child state is used as fallback.
   */
  readonly target?: string;
}

// =============================================================================
// StateNodeTransitions Type
// =============================================================================

/**
 * The transitions map type for a state node.
 *
 * This is a partial record mapping event names to transition configurations.
 * Not all events need to be handled in every state.
 *
 * @typeParam TAllStates - Union of all valid state names
 * @typeParam TAllEventNames - Union of all event type names
 * @typeParam TContext - The context type
 */
export type StateNodeTransitions<
  TAllStates extends string,
  TAllEventNames extends string,
  TContext,
> = {
  readonly [K in TAllEventNames]?:
    | TAllStates
    | TransitionConfigOrArray<TAllStates, { readonly type: K } & EventAny, TContext>;
};

// =============================================================================
// StateNodeAny - Universal Constraint Type
// =============================================================================

/**
 * Structural interface matching ANY StateNode without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL StateNodes
 * are assignable to. It constrains only the shape of the state node
 * without specifying concrete state, event, or context types.
 *
 * When used as a constraint `<S extends StateNodeAny>`, the generic parameter `S`
 * preserves the EXACT state node type for full inference.
 *
 * @remarks
 * This follows the AdapterAny pattern from `@hex-di/graph` to avoid using `any`.
 */
export interface StateNodeAny {
  /**
   * The type of this state node.
   */
  readonly type?: "atomic" | "compound" | "parallel" | "final" | "history";

  /**
   * Initial child state for compound states.
   */
  readonly initial?: string;

  /**
   * Nested child states for compound states.
   */
  readonly states?: Record<string, StateNodeAny>;

  /**
   * Transition when a child reaches final state (compound states).
   */
  readonly onDone?: unknown;

  /**
   * State ID for `#id` absolute targeting.
   */
  readonly id?: string;

  /**
   * Optional entry effects.
   */
  readonly entry?: readonly EffectAny[];

  /**
   * Optional exit effects.
   */
  readonly exit?: readonly EffectAny[];

  /**
   * Transitions map with string keys. Optional for terminal states.
   */
  readonly on?: Record<string, unknown>;

  /**
   * Eventless transitions evaluated on state entry.
   */
  readonly always?: unknown;

  /**
   * Delayed transitions keyed by milliseconds.
   */
  readonly after?: Record<number, unknown>;

  /**
   * History mode for history pseudo-states.
   */
  readonly history?: "shallow" | "deep";

  /**
   * Fallback target for history pseudo-states when no history recorded.
   */
  readonly target?: string;
}
