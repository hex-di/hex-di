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
   * is either a single TransitionConfig or an array of TransitionConfigs
   * (for guarded transitions that need to be evaluated in order).
   *
   * The `on` object can have any subset of events from TAllEventNames.
   * Events not listed here will be ignored when the machine is in this state.
   *
   * @example Single transition
   * ```typescript
   * on: {
   *   FETCH: { target: 'loading' },
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
  readonly on: StateNodeTransitions<TAllStates, TAllEventNames, TContext>;
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
  readonly [K in TAllEventNames]?: TransitionConfigOrArray<
    TAllStates,
    { readonly type: K } & EventAny,
    TContext
  >;
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
   * Optional entry effects.
   */
  readonly entry?: readonly EffectAny[];

  /**
   * Optional exit effects.
   */
  readonly exit?: readonly EffectAny[];

  /**
   * Transitions map with string keys.
   */
  readonly on: Record<string, unknown>;
}
