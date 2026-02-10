/**
 * Machine Factory and Type Utilities
 *
 * This module provides the defineMachine factory function for creating
 * branded Machine types with full type inference. Key features:
 *
 * - Creates immutable (frozen) machine configurations
 * - Infers state names, event names, and context from config
 * - Encodes full type information in Machine brand
 * - Validates initial state exists at compile time
 *
 * @packageDocumentation
 */

import type { MachineBrandSymbol } from "./brands.js";
import type { StateNode, StateNodeAny } from "./state-node.js";
import { Effect } from "../effects/constructors.js";

// Re-export types needed by tests
export type { StateNode, StateNodeAny } from "./state-node.js";
export type {
  TransitionConfig,
  TransitionConfigAny,
  TransitionConfigOrArray,
} from "./transition.js";
export type { MachineConfig, MachineConfigAny } from "./config.js";

// =============================================================================
// Machine Type (Complete Definition)
// =============================================================================

/**
 * A branded machine type that represents a complete state machine definition.
 *
 * The Machine type encodes full type information for:
 * - State names: Union of all valid state names
 * - Event names: Union of all event type names
 * - Context: The machine's context type
 *
 * This type is branded to enable nominal typing - two machines with
 * different configurations are type-incompatible even if structurally similar.
 *
 * @typeParam TStateNames - Union of all state names
 * @typeParam TEventNames - Union of all event type names
 * @typeParam TContext - The machine's context type
 *
 * @example
 * ```typescript
 * type FetcherMachine = Machine<
 *   'idle' | 'loading' | 'success' | 'error',
 *   'FETCH' | 'SUCCESS' | 'FAILURE' | 'RETRY',
 *   { data: string | null; error: string | null }
 * >;
 * ```
 */
export type Machine<TStateNames extends string, TEventNames extends string, TContext> = {
  /**
   * Brand property for nominal typing.
   * Contains a tuple of [StateNames, EventNames, Context] at the type level.
   */
  readonly [K in MachineBrandSymbol]: [TStateNames, TEventNames, TContext];
} & {
  /**
   * Unique identifier for this machine.
   */
  readonly id: string;

  /**
   * The initial state name.
   */
  readonly initial: TStateNames;

  /**
   * Record mapping state names to their configurations.
   */
  readonly states: {
    readonly [S in TStateNames]: StateNode<TStateNames, TEventNames, TContext>;
  };

  /**
   * The initial context value.
   */
  readonly context: TContext;
};

// =============================================================================
// Type Inference Utilities
// =============================================================================

/**
 * Extracts the state names union from a Machine type.
 *
 * @typeParam M - The Machine type
 * @returns Union of state name string literals
 *
 * @example
 * ```typescript
 * type States = InferMachineState<typeof myMachine>;
 * // 'idle' | 'loading' | 'success'
 * ```
 */
export type InferMachineState<M> =
  M extends Machine<infer TStateNames, infer _E, infer _C> ? TStateNames : never;

/**
 * Extracts the event names union from a Machine type.
 *
 * @typeParam M - The Machine type
 * @returns Union of event name string literals
 *
 * @example
 * ```typescript
 * type Events = InferMachineEvent<typeof myMachine>;
 * // 'FETCH' | 'SUCCESS' | 'FAILURE'
 * ```
 */
export type InferMachineEvent<M> =
  M extends Machine<infer _S, infer TEventNames, infer _C> ? TEventNames : never;

/**
 * Extracts the context type from a Machine type.
 *
 * @typeParam M - The Machine type
 * @returns The context type
 *
 * @example
 * ```typescript
 * type Context = InferMachineContext<typeof myMachine>;
 * // { data: string | null; retryCount: number }
 * ```
 */
export type InferMachineContext<M> =
  M extends Machine<infer _S, infer _E, infer TContext> ? TContext : never;

// =============================================================================
// Deep Freeze Utility
// =============================================================================

/**
 * Recursively freezes an object and all its nested properties.
 *
 * @internal
 */
function deepFreeze<T>(obj: T, seen: WeakSet<object> = new WeakSet()): T {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }

  // Avoid infinite recursion on circular references
  if (seen.has(obj)) {
    return obj;
  }
  seen.add(obj);

  // Get all property names (including non-enumerable ones)
  const propNames = Object.getOwnPropertyNames(obj);

  // Freeze each property value before freezing the object itself
  for (const name of propNames) {
    const desc = Object.getOwnPropertyDescriptor(obj, name);
    const value = desc !== undefined ? desc.value : undefined;
    if (value !== null && typeof value === "object") {
      deepFreeze(value, seen);
    }
  }

  return Object.freeze(obj);
}

// =============================================================================
// Helper Types for Inference
// =============================================================================

/**
 * Extracts event names from a single state node's on property.
 * @internal
 */
type ExtractOnKeys<T> = T extends { on: infer TOn }
  ? TOn extends Record<infer K, unknown>
    ? K extends string
      ? K
      : never
    : never
  : never;

/**
 * Extracts event names from all state nodes in a states record.
 * Uses a union across all states.
 * @internal
 */
type ExtractAllEventNames<TStates extends Record<string, StateNodeAny>> = {
  [K in keyof TStates]: ExtractOnKeys<TStates[K]>;
}[keyof TStates];

// =============================================================================
// defineMachine Factory Function
// =============================================================================

/**
 * Creates a branded Machine instance from a configuration object.
 *
 * This factory function:
 * - Infers state names from the config's states record keys
 * - Infers event names from transition definitions
 * - Validates initial state exists in states at compile time
 * - Returns an immutable (deeply frozen) machine definition
 * - Encodes full type information in the Machine brand
 *
 * @param config - The machine configuration
 * @returns A branded Machine instance with full type information
 *
 * @remarks
 * The configuration is deeply frozen to ensure immutability at runtime.
 * Any attempt to modify the returned machine will throw in strict mode.
 *
 * Type inference is maximized - you typically don't need to provide
 * explicit type parameters. The factory infers:
 * - State names from `Object.keys(config.states)`
 * - Event names from all `on` property keys across states
 * - Context type from `config.context`
 *
 * @example Basic machine creation
 * ```typescript
 * const toggleMachine = defineMachine({
 *   id: 'toggle',
 *   initial: 'off',
 *   context: undefined,
 *   states: {
 *     off: { on: { TOGGLE: { target: 'on' } } },
 *     on: { on: { TOGGLE: { target: 'off' } } },
 *   },
 * });
 * // Type: Machine<'off' | 'on', 'TOGGLE', undefined>
 * ```
 *
 * @example Machine with context
 * ```typescript
 * const counterMachine = defineMachine({
 *   id: 'counter',
 *   initial: 'active',
 *   context: { count: 0 },
 *   states: {
 *     active: {
 *       on: {
 *         INCREMENT: {
 *           target: 'active',
 *           actions: [(ctx) => ({ count: ctx.count + 1 })],
 *         },
 *         DECREMENT: {
 *           target: 'active',
 *           actions: [(ctx) => ({ count: ctx.count - 1 })],
 *         },
 *       },
 *     },
 *   },
 * });
 * // Type: Machine<'active', 'INCREMENT' | 'DECREMENT', { count: number }>
 * ```
 */
/**
 * Overload: defineMachine with explicit initial state.
 */
export function defineMachine<
  const TStates extends Record<string, StateNodeAny>,
  const TInitial extends keyof TStates & string,
  const TContext,
>(config: {
  readonly id: string;
  readonly initial: TInitial;
  readonly states: TStates;
  readonly context?: TContext;
}): Machine<
  Extract<keyof TStates, string>,
  ExtractAllEventNames<TStates>,
  TContext extends undefined ? void : TContext
>;

/**
 * Overload: defineMachine with initial inferred from first state key.
 */
export function defineMachine<
  const TStates extends Record<string, StateNodeAny>,
  const TContext,
>(config: {
  readonly id: string;
  readonly states: TStates;
  readonly context?: TContext;
}): Machine<
  Extract<keyof TStates, string>,
  ExtractAllEventNames<TStates>,
  TContext extends undefined ? void : TContext
>;

/**
 * Implementation.
 */
export function defineMachine(config: {
  readonly id: string;
  readonly initial?: string;
  readonly states: Record<string, StateNodeAny>;
  readonly context?: unknown;
}): Machine<string, string, unknown> {
  // Resolve initial state: use explicit value or first key of states record
  const stateNames = Object.keys(config.states);
  const initial = config.initial ?? stateNames[0];

  // Normalize states: expand string shorthand transitions and default missing `on`
  const normalizedStates: Record<string, unknown> = {};
  for (const stateName of stateNames) {
    const stateNode = Object.getOwnPropertyDescriptor(config.states, stateName)?.value;
    normalizedStates[stateName] = normalizeStateNode(stateNode);
  }

  // Deep freeze the config for runtime immutability
  const frozenConfig = deepFreeze({
    id: config.id,
    initial,
    states: normalizedStates,
    context: config.context,
  });

  // The brand property exists only at the type level.
  // At runtime, we return the frozen config object.
  // @ts-expect-error - Intentional phantom type gap: brand exists only at type level for nominal typing
  return frozenConfig;
}

// =============================================================================
// Normalization Helpers
// =============================================================================

/**
 * Normalizes a state node by:
 * - Defaulting missing `on` to `{}`
 * - Expanding string shorthand transitions to `{ target: string }`
 * - Recursively normalizing nested compound `states`
 * - Normalizing `onDone` and `always` string shorthands
 * - Inferring `type: 'compound'` when `states` is present
 *
 * @internal
 */
function normalizeStateNode(stateNode: unknown): unknown {
  if (typeof stateNode !== "object" || stateNode === null) {
    return stateNode;
  }

  // Normalize `on` map
  const onDesc = Object.getOwnPropertyDescriptor(stateNode, "on");
  const on = onDesc?.value;
  const onRecord = typeof on === "object" && on !== null ? on : {};
  const normalizedOn: Record<string, unknown> = {};

  for (const eventName of Object.keys(onRecord)) {
    const desc = Object.getOwnPropertyDescriptor(onRecord, eventName);
    normalizedOn[eventName] = normalizeTransitionValue(desc?.value);
  }

  // Copy all properties from stateNode to a new object, then override normalized ones
  const normalized: Record<string, unknown> = {};
  for (const key of Object.getOwnPropertyNames(stateNode)) {
    const desc = Object.getOwnPropertyDescriptor(stateNode, key);
    if (desc !== undefined) {
      normalized[key] = desc.value;
    }
  }
  normalized["on"] = normalizedOn;

  // Normalize `onDone` string shorthand
  const onDoneDesc = Object.getOwnPropertyDescriptor(stateNode, "onDone");
  if (onDoneDesc !== undefined) {
    normalized["onDone"] = normalizeTransitionValue(onDoneDesc.value);
  }

  // Normalize `always` string shorthand
  const alwaysDesc = Object.getOwnPropertyDescriptor(stateNode, "always");
  if (alwaysDesc !== undefined) {
    normalized["always"] = normalizeTransitionValue(alwaysDesc.value);
  }

  // Normalize `after` delayed transitions into entry effects + event handlers
  const afterDesc = Object.getOwnPropertyDescriptor(stateNode, "after");
  if (afterDesc !== undefined && typeof afterDesc.value === "object" && afterDesc.value !== null) {
    const afterConfig = afterDesc.value;
    const existingEntry = Array.isArray(normalized["entry"]) ? [...normalized["entry"]] : [];

    // Object.keys returns numeric keys in ascending order
    for (const msKey of Object.keys(afterConfig)) {
      const ms = Number(msKey);
      if (!Number.isFinite(ms) || ms < 0) continue;

      const afterEventName = `$$AFTER_${ms}`;
      const transDesc = Object.getOwnPropertyDescriptor(afterConfig, msKey);
      normalizedOn[afterEventName] = normalizeTransitionValue(transDesc?.value);

      // Add sequence entry effect: delay(ms) then emit($$AFTER_<ms>)
      existingEntry.push(
        Effect.sequence([Effect.delay(ms), Effect.emit({ type: afterEventName })])
      );
    }

    normalized["entry"] = existingEntry;
    delete normalized["after"];
  }

  // Default `history` to `"shallow"` when `type === "history"` and no history mode specified
  if (normalized["type"] === "history" && normalized["history"] === undefined) {
    normalized["history"] = "shallow";
  }

  // Recursively normalize nested `states` for compound/parallel state nodes
  const statesDesc = Object.getOwnPropertyDescriptor(stateNode, "states");
  if (
    statesDesc !== undefined &&
    typeof statesDesc.value === "object" &&
    statesDesc.value !== null
  ) {
    const nestedStates = statesDesc.value;
    const normalizedNested: Record<string, unknown> = {};
    for (const childName of Object.keys(nestedStates)) {
      const childDesc = Object.getOwnPropertyDescriptor(nestedStates, childName);
      normalizedNested[childName] = normalizeStateNode(childDesc?.value);
    }
    normalized["states"] = normalizedNested;

    // Infer `type: 'compound'` when `states` is present and no type is set.
    // Parallel states keep their explicit type and don't need `initial`.
    if (normalized["type"] === undefined) {
      normalized["type"] = "compound";
    }

    // Infer `initial` from first key if not provided — only for compound states.
    // Parallel states run ALL children simultaneously and have no `initial`.
    if (normalized["type"] !== "parallel" && normalized["initial"] === undefined) {
      const childKeys = Object.keys(normalizedNested);
      if (childKeys.length > 0) {
        normalized["initial"] = childKeys[0];
      }
    }
  }

  return normalized;
}

/**
 * Normalizes a transition value:
 * - String → `{ target: string }`
 * - Array with strings → array with normalized objects
 * - Object → pass through
 *
 * @internal
 */
function normalizeTransitionValue(value: unknown): unknown {
  if (typeof value === "string") {
    return { target: value };
  }
  if (Array.isArray(value)) {
    return value.map(normalizeTransitionValue);
  }
  return value;
}
