/**
 * State Machine Interpreter
 *
 * This module provides the pure transition logic for the state machine.
 * The interpreter computes state transitions without performing side effects.
 *
 * Key responsibilities:
 * - Find matching transitions for an event
 * - Evaluate guards in definition order
 * - Apply actions to produce new context
 * - Collect effects (exit, transition, entry)
 *
 * @packageDocumentation
 */

import type { MachineAny } from "../machine/types.js";
import type { StateNodeAny } from "../machine/state-node.js";
import type { TransitionConfigAny } from "../machine/transition.js";
import type { EffectAny } from "../effects/types.js";

// =============================================================================
// TransitionResult Type
// =============================================================================

/**
 * The result of a state transition.
 *
 * Contains the new state, new context, and all effects to execute.
 *
 * @typeParam TState - The state name type
 * @typeParam TContext - The context type
 */
export interface TransitionResult<TState extends string, TContext> {
  /**
   * The new state name.
   * If undefined, no transition occurred (stay in current state).
   */
  readonly newState: TState | undefined;

  /**
   * The new context value.
   * If undefined, context remains unchanged.
   */
  readonly newContext: TContext | undefined;

  /**
   * All effects to execute, in order:
   * 1. Exit effects from current state
   * 2. Transition effects
   * 3. Entry effects for new state
   */
  readonly effects: readonly EffectAny[];

  /**
   * Whether a transition occurred.
   */
  readonly transitioned: boolean;
}

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Type guard to check if a value is a TransitionConfigAny object.
 * @internal
 */
function isTransitionConfig(value: unknown): value is TransitionConfigAny {
  return (
    typeof value === "object" &&
    value !== null &&
    "target" in value &&
    typeof (value as TransitionConfigAny).target === "string"
  );
}

/**
 * Normalizes transition config(s) to a flat array of TransitionConfigAny.
 * Handles both single configs and arrays.
 * @internal
 */
function normalizeTransitions(
  config: TransitionConfigAny | readonly TransitionConfigAny[] | unknown
): readonly TransitionConfigAny[] {
  // Check if it's a single transition config
  if (isTransitionConfig(config)) {
    return [config];
  }

  // Check if it's an array
  if (Array.isArray(config)) {
    // Filter to only valid transition configs
    const result: TransitionConfigAny[] = [];
    for (const item of config) {
      if (isTransitionConfig(item)) {
        result.push(item);
      }
    }
    return result;
  }

  return [];
}

// =============================================================================
// Interpreter Functions
// =============================================================================

/**
 * Computes a state transition without side effects.
 *
 * This is the core pure function of the state machine interpreter.
 * It takes the current state, context, event, and machine configuration,
 * and returns the transition result (new state, new context, effects).
 *
 * @param currentState - The current state name
 * @param currentContext - The current context value
 * @param event - The triggering event
 * @param machine - The machine configuration
 *
 * @returns The transition result
 *
 * @remarks
 * The interpreter:
 * 1. Looks up the current state's configuration
 * 2. Finds transitions for the event type
 * 3. Evaluates guards in definition order
 * 4. Takes the first transition whose guard passes (or has no guard)
 * 5. Applies actions in order to compute new context
 * 6. Collects effects: exit(current) + transition + entry(target)
 *
 * If no valid transition is found, returns:
 * - `transitioned: false`
 * - `newState: undefined`
 * - `newContext: undefined`
 * - `effects: []`
 *
 * @example
 * ```typescript
 * const result = transition('idle', { count: 0 }, { type: 'FETCH' }, machine);
 *
 * if (result.transitioned) {
 *   console.log('New state:', result.newState);
 *   console.log('New context:', result.newContext);
 *   console.log('Effects to execute:', result.effects);
 * }
 * ```
 */
export function transition<TState extends string, TContext>(
  currentState: TState,
  currentContext: TContext,
  event: { readonly type: string },
  machine: MachineAny
): TransitionResult<TState, TContext> {
  // Get the current state's configuration
  const statesRecord = machine.states as Record<string, StateNodeAny>;
  const stateNode = statesRecord[currentState];

  if (!stateNode) {
    // Invalid state - should not happen with proper typing
    return {
      newState: undefined,
      newContext: undefined,
      effects: [],
      transitioned: false,
    };
  }

  // Get transitions for this event type
  const transitionsMap = stateNode.on as Record<string, unknown>;
  const transitionConfig = transitionsMap[event.type];

  if (transitionConfig === undefined) {
    // No transition defined for this event in current state
    return {
      newState: undefined,
      newContext: undefined,
      effects: [],
      transitioned: false,
    };
  }

  // Normalize to array for uniform handling
  const transitions = normalizeTransitions(transitionConfig);

  if (transitions.length === 0) {
    // No valid transitions found
    return {
      newState: undefined,
      newContext: undefined,
      effects: [],
      transitioned: false,
    };
  }

  // Find the first transition whose guard passes (or has no guard)
  const matchedTransition = findMatchingTransition(transitions, currentContext, event);

  if (matchedTransition === undefined) {
    // All guards failed
    return {
      newState: undefined,
      newContext: undefined,
      effects: [],
      transitioned: false,
    };
  }

  // Apply actions to compute new context
  const newContext = applyActions(matchedTransition, currentContext, event);

  // Get target state
  const targetState = matchedTransition.target as TState;

  // Collect effects
  const effects = collectEffects(stateNode, matchedTransition, targetState, statesRecord);

  return {
    newState: targetState,
    newContext,
    effects,
    transitioned: true,
  };
}

/**
 * Finds the first transition whose guard passes (or has no guard).
 *
 * @param transitions - Array of transition configurations
 * @param context - Current context
 * @param event - Triggering event
 *
 * @returns The matching transition, or undefined if none match
 *
 * @internal
 */
function findMatchingTransition(
  transitions: readonly TransitionConfigAny[],
  context: unknown,
  event: { readonly type: string }
): TransitionConfigAny | undefined {
  for (const transitionConfig of transitions) {
    if (transitionConfig.guard === undefined) {
      // No guard - always matches
      return transitionConfig;
    }

    // Evaluate guard
    // Note: Guard function signature is (context: never, event: never) => boolean
    // which makes it contravariant. We need to call it with actual values.
    const guardFn = transitionConfig.guard as (ctx: unknown, evt: unknown) => boolean;
    const guardResult = guardFn(context, event);

    if (guardResult) {
      return transitionConfig;
    }
  }

  return undefined;
}

/**
 * Applies actions in order to compute new context.
 *
 * @param transitionConfig - The transition configuration
 * @param context - Current context
 * @param event - Triggering event
 *
 * @returns The new context after applying all actions, or undefined if no actions
 *
 * @internal
 */
function applyActions<TContext>(
  transitionConfig: TransitionConfigAny,
  context: TContext,
  event: { readonly type: string }
): TContext | undefined {
  const actions = transitionConfig.actions;

  if (actions === undefined || actions.length === 0) {
    // No actions - context unchanged
    return undefined;
  }

  // Apply actions in order, threading the context through
  let currentContext: TContext = context;

  for (const action of actions) {
    // Action signature is (context: never, event: never) => unknown
    const actionFn = action as (ctx: TContext, evt: unknown) => TContext;
    currentContext = actionFn(currentContext, event);
  }

  return currentContext;
}

/**
 * Collects all effects for a transition.
 *
 * Effects are collected in this order:
 * 1. Exit effects from current state (if changing state)
 * 2. Transition effects
 * 3. Entry effects for target state (if changing state)
 *
 * @param currentStateNode - Current state configuration
 * @param transitionConfig - The transition configuration
 * @param targetState - The target state name
 * @param statesRecord - All state configurations
 *
 * @returns Array of effects in execution order
 *
 * @internal
 */
function collectEffects(
  currentStateNode: StateNodeAny,
  transitionConfig: TransitionConfigAny,
  targetState: string,
  statesRecord: Record<string, StateNodeAny>
): readonly EffectAny[] {
  const effects: EffectAny[] = [];

  // 1. Exit effects from current state
  if (currentStateNode.exit !== undefined) {
    effects.push(...currentStateNode.exit);
  }

  // 2. Transition effects
  if (transitionConfig.effects !== undefined) {
    effects.push(...transitionConfig.effects);
  }

  // 3. Entry effects for target state
  const targetStateNode = statesRecord[targetState];
  if (targetStateNode?.entry !== undefined) {
    effects.push(...targetStateNode.entry);
  }

  return effects;
}
