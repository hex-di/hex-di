/**
 * Builder DSL for State Machine Definition
 *
 * This module provides a fluent builder API as an alternative to the
 * `defineMachine()` config object approach. The builder uses a two-phase
 * pattern for full type safety:
 *
 * 1. **State phase**: `.addState()` accumulates states, growing the TStates union
 * 2. **Transition phase**: `.transitions()` switches to `.on()/.build()` with
 *    full state name constraints on transition targets
 *
 * The builder calls `defineMachine()` internally, producing the same `Machine` type.
 *
 * @packageDocumentation
 */

import type { EffectAny } from "../effects/types.js";
import type { EventAny } from "./types.js";
import { defineMachine, type Machine } from "./define-machine.js";
import type { StateNodeAny } from "./state-node.js";

// =============================================================================
// Transition Option Types
// =============================================================================

/**
 * Configuration options for a transition added via the builder.
 *
 * @typeParam TContext - The machine's context type
 */
export interface TransitionOptions<TContext> {
  readonly guard?: (context: TContext, event: EventAny) => boolean;
  readonly actions?: readonly ((context: TContext, event: EventAny) => TContext)[];
  readonly effects?: readonly EffectAny[];
  readonly internal?: boolean;
}

// =============================================================================
// State Phase Builder
// =============================================================================

/**
 * Builder phase for adding states to a machine definition.
 *
 * In this phase, `.addState()` accumulates state configurations and grows
 * the `TStates` type parameter. When all states are defined, call
 * `.transitions()` to switch to the transition phase.
 *
 * @typeParam TStates - Union of all state names added so far
 * @typeParam TContext - The machine's context type
 */
export interface StatePhaseBuilder<TStates extends string, TContext> {
  /**
   * Adds a state to the machine definition.
   *
   * The state name is captured as a literal type and added to the TStates union.
   * An optional config can provide entry/exit effects, compound/parallel state
   * type, and nested child states.
   *
   * @param name - The state name (captured as a literal type via `const`)
   * @param config - Optional state node configuration (without `on` transitions)
   * @returns A new builder with the state name added to the TStates union
   */
  addState<const TName extends string>(
    name: TName,
    config?: Omit<StateNodeAny, "on">
  ): StatePhaseBuilder<TStates | TName, TContext>;

  /**
   * Switches to the transition phase.
   *
   * After all states have been defined, call `.transitions()` to begin
   * defining transitions between states. In the transition phase, all
   * state names are fully known and constrained.
   *
   * @returns A transition phase builder with full state name constraints
   */
  transitions(): TransitionPhaseBuilder<TStates, never, TContext>;
}

// =============================================================================
// Transition Phase Builder
// =============================================================================

/**
 * Builder phase for adding transitions between states.
 *
 * In this phase, `.on()` adds transitions with full type constraints on
 * source and target state names. Call `.build()` when all transitions are
 * defined to produce the final `Machine` type.
 *
 * @typeParam TStates - Union of all state names (fully determined)
 * @typeParam TEvents - Union of all event names added so far
 * @typeParam TContext - The machine's context type
 */
export interface TransitionPhaseBuilder<TStates extends string, TEvents extends string, TContext> {
  /**
   * Adds a transition between two states triggered by an event.
   *
   * @param from - The source state name (must be in TStates)
   * @param event - The event name that triggers this transition
   * @param to - The target state name (must be in TStates)
   * @param config - Optional transition configuration (guard, actions, effects)
   * @returns A new builder with the event name added to the TEvents union
   */
  on<const TFrom extends TStates, const TEvent extends string, const TTo extends TStates>(
    from: TFrom,
    event: TEvent,
    to: TTo,
    config?: TransitionOptions<TContext>
  ): TransitionPhaseBuilder<TStates, TEvents | TEvent, TContext>;

  /**
   * Builds the final machine definition.
   *
   * Calls `defineMachine()` internally with the accumulated states and
   * transitions, producing the same `Machine` type as the config approach.
   *
   * @returns A branded Machine instance with full type information
   */
  build(): Machine<TStates, TEvents, TContext>;
}

// =============================================================================
// Internal State Accumulator
// =============================================================================

/**
 * Internal record of accumulated state configs during the state phase.
 * @internal
 */
interface StateEntry {
  readonly config: Omit<StateNodeAny, "on">;
}

/**
 * Internal record of a transition added during the transition phase.
 * Stores function references as `unknown` to avoid contravariance issues
 * between the generic TContext and the internal erased representation.
 * @internal
 */
interface TransitionEntry {
  readonly from: string;
  readonly event: string;
  readonly to: string;
  readonly guard?: unknown;
  readonly actions?: unknown;
  readonly effects?: readonly EffectAny[];
  readonly internal?: boolean;
}

// =============================================================================
// Builder Implementation
// =============================================================================

/**
 * Creates the state phase builder implementation.
 * @internal
 */
function createStatePhase<TStates extends string, TContext>(
  id: string,
  context: unknown,
  initial: string | undefined,
  stateEntries: ReadonlyMap<string, StateEntry>
): StatePhaseBuilder<TStates, TContext> {
  return {
    addState<const TName extends string>(
      name: TName,
      config?: Omit<StateNodeAny, "on">
    ): StatePhaseBuilder<TStates | TName, TContext> {
      const newEntries = new Map(stateEntries);
      newEntries.set(name, { config: config ?? {} });
      const newInitial = initial ?? name;
      return createStatePhase<TStates | TName, TContext>(id, context, newInitial, newEntries);
    },

    transitions(): TransitionPhaseBuilder<TStates, never, TContext> {
      return createTransitionPhase<TStates, never, TContext>(
        id,
        context,
        initial,
        stateEntries,
        []
      );
    },
  };
}

/**
 * Creates the transition phase builder implementation.
 * @internal
 */
function createTransitionPhase<TStates extends string, TEvents extends string, TContext>(
  id: string,
  context: unknown,
  initial: string | undefined,
  stateEntries: ReadonlyMap<string, StateEntry>,
  transitionEntries: readonly TransitionEntry[]
): TransitionPhaseBuilder<TStates, TEvents, TContext> {
  return {
    on<const TFrom extends TStates, const TEvent extends string, const TTo extends TStates>(
      from: TFrom,
      event: TEvent,
      to: TTo,
      config?: TransitionOptions<TContext>
    ): TransitionPhaseBuilder<TStates, TEvents | TEvent, TContext> {
      const newEntry: TransitionEntry = {
        from,
        event,
        to,
        guard: config?.guard,
        actions: config?.actions,
        effects: config?.effects,
        internal: config?.internal,
      };
      const newTransitions = [...transitionEntries, newEntry];
      return createTransitionPhase<TStates, TEvents | TEvent, TContext>(
        id,
        context,
        initial,
        stateEntries,
        newTransitions
      );
    },

    build(): Machine<TStates, TEvents, TContext> {
      // Build the states record for defineMachine
      const states: Record<string, Record<string, unknown>> = {};

      for (const [stateName, stateEntry] of stateEntries) {
        // Copy state config properties (entry, exit, type, states, initial, etc.)
        const stateNode: Record<string, unknown> = { ...stateEntry.config };
        // Initialize the `on` transitions map
        stateNode["on"] = {};
        states[stateName] = stateNode;
      }

      // Build a per-state on-map for collecting transitions
      const onMaps = new Map<string, Record<string, unknown>>();
      for (const stateName of stateEntries.keys()) {
        const onRecord: Record<string, unknown> = {};
        onMaps.set(stateName, onRecord);
        const stateNode = states[stateName];
        if (stateNode !== undefined) {
          stateNode["on"] = onRecord;
        }
      }

      // Add transitions to the appropriate state's `on` map
      for (const t of transitionEntries) {
        const onRecord = onMaps.get(t.from);
        if (onRecord === undefined) {
          continue;
        }

        // Build the transition config object, only including defined properties
        const transitionConfig: Record<string, unknown> = { target: t.to };
        if (typeof t.guard === "function") {
          transitionConfig["guard"] = t.guard;
        }
        if (Array.isArray(t.actions)) {
          transitionConfig["actions"] = t.actions;
        }
        if (t.effects !== undefined) {
          transitionConfig["effects"] = t.effects;
        }
        if (t.internal !== undefined) {
          transitionConfig["internal"] = t.internal;
        }

        // If there is already a transition for this event, convert to array
        const existing = Object.getOwnPropertyDescriptor(onRecord, t.event)?.value;
        if (existing !== undefined) {
          if (Array.isArray(existing)) {
            onRecord[t.event] = [...existing, transitionConfig];
          } else {
            onRecord[t.event] = [existing, transitionConfig];
          }
        } else {
          onRecord[t.event] = transitionConfig;
        }
      }

      const resolvedInitial = initial ?? "";

      // @ts-expect-error - defineMachine uses const generics for full inference from object literals.
      // The builder accumulates state/transition data dynamically, so the intermediate record types
      // don't carry the precise literal key information that defineMachine's overload expects.
      // The TStates/TEvents/TContext types are tracked correctly by the builder's generic parameters.
      return defineMachine({
        id,
        initial: resolvedInitial,
        states,
        context,
      });
    },
  };
}

// =============================================================================
// Public Entry Point
// =============================================================================

/**
 * Creates a fluent machine builder as an alternative to `defineMachine()` config objects.
 *
 * The builder uses a two-phase pattern:
 * 1. **State phase**: Use `.addState(name, config?)` to define states
 * 2. **Transition phase**: Call `.transitions()` then use `.on(from, event, to, config?)` to define transitions
 * 3. **Build**: Call `.build()` to produce the final `Machine` type
 *
 * The builder calls `defineMachine()` internally and produces the same `Machine` type.
 *
 * @param config - Initial machine configuration with id and context
 * @returns A state phase builder to begin defining states
 *
 * @example Simple toggle machine
 * ```typescript
 * const toggleMachine = createMachineBuilder({ id: 'toggle', context: undefined })
 *   .addState('off')
 *   .addState('on')
 *   .transitions()
 *   .on('off', 'TOGGLE', 'on')
 *   .on('on', 'TOGGLE', 'off')
 *   .build();
 * ```
 *
 * @example Machine with guards and actions
 * ```typescript
 * const counterMachine = createMachineBuilder({ id: 'counter', context: { count: 0 } })
 *   .addState('active')
 *   .addState('maxed')
 *   .transitions()
 *   .on('active', 'INCREMENT', 'active', {
 *     guard: (ctx) => ctx.count < 10,
 *     actions: [(ctx) => ({ count: ctx.count + 1 })],
 *   })
 *   .on('active', 'INCREMENT', 'maxed', {
 *     guard: (ctx) => ctx.count >= 10,
 *   })
 *   .build();
 * ```
 */
export function createMachineBuilder<TContext>(config: {
  readonly id: string;
  readonly context: TContext;
}): StatePhaseBuilder<never, TContext extends undefined ? void : TContext> {
  return createStatePhase<never, TContext extends undefined ? void : TContext>(
    config.id,
    config.context,
    undefined,
    new Map()
  );
}
