/**
 * Transition Configuration Types
 *
 * This module provides the TransitionConfig type for defining state transitions
 * in a type-safe manner. Key features:
 *
 * - `target`: Must be a valid state name (compile-time checked)
 * - `guard`: Optional predicate that must return boolean
 * - `actions`: Optional array of context-transforming functions
 * - `effects`: Optional array of effects to execute after transition
 *
 * @packageDocumentation
 */

import type { EffectAny } from "../effects/types.js";
import type { EventAny } from "./types.js";

// =============================================================================
// TransitionConfig Type
// =============================================================================

/**
 * Configuration for a single state transition.
 *
 * A transition describes how the machine moves from one state to another
 * in response to an event. Transitions can be:
 * - Unconditional: Always taken when the event occurs
 * - Guarded: Only taken if the guard predicate returns true
 * - Action-bearing: Execute context transformations during the transition
 * - Effect-producing: Trigger side effects after the transition
 *
 * @typeParam TAllStates - Union of all valid state names in the machine
 * @typeParam TTarget - The specific target state name (must be in TAllStates)
 * @typeParam TEvent - The event type that triggers this transition
 * @typeParam TContext - The machine's context type
 *
 * @remarks
 * The `TTarget` type parameter is constrained to be a member of `TAllStates`,
 * which enables compile-time validation of transition targets. If you try to
 * specify a target that doesn't exist in the machine's state configuration,
 * TypeScript will produce a type error.
 *
 * Guards are evaluated synchronously and must return a boolean. If multiple
 * transitions exist for the same event, guards are evaluated in definition order
 * and the first transition whose guard returns true is taken.
 *
 * Actions are pure functions that transform the context. They receive the
 * current context and triggering event, and return a new context value.
 * Multiple actions are executed in array order.
 *
 * Effects are descriptors (data) that will be executed by the effect executor
 * after the transition completes. They do not affect the transition logic.
 *
 * @example Basic transition
 * ```typescript
 * const transition: TransitionConfig<
 *   'idle' | 'loading' | 'success',
 *   'loading',
 *   Event<'FETCH'>,
 *   { retryCount: number }
 * > = {
 *   target: 'loading',
 * };
 * ```
 *
 * @example Guarded transition
 * ```typescript
 * const transition: TransitionConfig<
 *   'idle' | 'loading',
 *   'loading',
 *   Event<'RETRY'>,
 *   { retryCount: number }
 * > = {
 *   target: 'loading',
 *   guard: (ctx) => ctx.retryCount < 3,
 * };
 * ```
 *
 * @example Transition with actions
 * ```typescript
 * const transition: TransitionConfig<
 *   'idle' | 'success',
 *   'success',
 *   Event<'SUCCESS', { data: string }>,
 *   { data: string | null }
 * > = {
 *   target: 'success',
 *   actions: [
 *     (ctx, evt) => ({ ...ctx, data: evt.payload.data }),
 *   ],
 * };
 * ```
 */
export interface TransitionConfig<
  TAllStates extends string,
  TTarget extends TAllStates,
  TEvent extends EventAny,
  TContext,
> {
  /**
   * The target state name.
   *
   * Must be a valid state name that exists in the machine's state configuration.
   * This is enforced at compile time by the TTarget type parameter being
   * constrained to TAllStates.
   */
  readonly target: TTarget;

  /**
   * Optional guard predicate.
   *
   * When present, the transition is only taken if this function returns true.
   * Guards must be synchronous and deterministic.
   *
   * @param context - The current machine context
   * @param event - The triggering event
   * @returns true to allow the transition, false to block it
   */
  readonly guard?: (context: TContext, event: TEvent) => boolean;

  /**
   * Optional array of action functions.
   *
   * Actions are pure functions that transform the context during a transition.
   * They are executed in array order, with each action receiving the output
   * of the previous action as its context input.
   *
   * @param context - The current (or accumulated) context
   * @param event - The triggering event
   * @returns The new context value
   */
  readonly actions?: readonly ((context: TContext, event: TEvent) => TContext)[];

  /**
   * Optional array of effects to execute after the transition.
   *
   * Effects are pure data descriptors that will be executed by the effect
   * executor after the transition completes and the new state is entered.
   * They do not affect the transition logic or context transformation.
   */
  readonly effects?: readonly EffectAny[];

  /**
   * Whether this is an internal transition.
   *
   * Internal transitions execute actions and transition effects but do NOT
   * fire exit effects from the current state or entry effects on the target state.
   * This is useful for self-transitions that update context without triggering
   * entry/exit side effects.
   *
   * @default false (external transition)
   */
  readonly internal?: boolean;
}

// =============================================================================
// TransitionConfigAny - Universal Constraint Type
// =============================================================================

/**
 * Structural interface matching ANY TransitionConfig without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL TransitionConfigs
 * are assignable to. It constrains only the shape of the transition config
 * without specifying concrete state, event, or context types.
 *
 * When used as a constraint `<T extends TransitionConfigAny>`, the generic parameter `T`
 * preserves the EXACT transition type for full inference.
 *
 * @remarks
 * This follows the AdapterAny pattern from `@hex-di/graph` to avoid using `any`.
 */
export interface TransitionConfigAny {
  /**
   * The target state name (string for universal constraint).
   */
  readonly target: string;

  /**
   * Optional guard predicate with universal signature.
   */
  readonly guard?: (context: never, event: never) => boolean;

  /**
   * Optional array of action functions with universal signature.
   */
  readonly actions?: readonly ((context: never, event: never) => unknown)[];

  /**
   * Optional array of effects.
   */
  readonly effects?: readonly EffectAny[];

  /**
   * Whether this is an internal transition.
   */
  readonly internal?: boolean;
}

// =============================================================================
// Transition Array Type (Multiple Transitions for Same Event)
// =============================================================================

/**
 * A transition can be either a single config or an array of configs.
 *
 * When an array is provided, transitions are evaluated in order until
 * one is found whose guard returns true (or has no guard).
 *
 * @typeParam TAllStates - Union of all valid state names
 * @typeParam TEvent - The event type
 * @typeParam TContext - The context type
 */
export type TransitionConfigOrArray<TAllStates extends string, TEvent extends EventAny, TContext> =
  | TransitionConfig<TAllStates, TAllStates, TEvent, TContext>
  | readonly TransitionConfig<TAllStates, TAllStates, TEvent, TContext>[];
