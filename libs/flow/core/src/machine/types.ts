/**
 * Core Types for State Machine
 *
 * This module provides branded State and Event types with:
 * - Nominal typing via unique symbols
 * - Conditional context/payload inclusion
 * - Deep immutability at the type level
 * - Type inference utilities
 *
 * @packageDocumentation
 */

import type { StateBrandSymbol, EventBrandSymbol, MachineBrandSymbol } from "./brands.js";

// =============================================================================
// DeepReadonly Utility Type
// =============================================================================

/**
 * Recursively makes all properties of an object type readonly.
 *
 * This utility type ensures that state context is immutable at the type level,
 * preventing accidental mutations that could lead to state inconsistencies.
 *
 * @typeParam T - The type to make deeply readonly
 *
 * @remarks
 * - Arrays become `ReadonlyArray<DeepReadonly<U>>`
 * - Objects have all properties made `readonly` recursively
 * - Primitives pass through unchanged
 * - Functions pass through unchanged
 *
 * @example
 * ```typescript
 * interface MutableData {
 *   user: {
 *     name: string;
 *     items: string[];
 *   };
 * }
 *
 * type ReadonlyData = DeepReadonly<MutableData>;
 * // {
 * //   readonly user: {
 * //     readonly name: string;
 * //     readonly items: ReadonlyArray<string>;
 * //   };
 * // }
 * ```
 */
export type DeepReadonly<T> = T extends readonly (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends (...args: infer _Args) => infer _Return
    ? T // Functions pass through unchanged
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

// =============================================================================
// State Type
// =============================================================================

/**
 * Type representing an empty object extension for conditional types.
 * This is a named type alias to satisfy ESLint's no-empty-object-type rule
 * which allows empty object types in named type aliases.
 *
 * @internal
 */
type NoAdditionalProperties = {};

/**
 * A branded state type that represents a discrete state in a state machine.
 *
 * The State type uses TypeScript's structural typing with a branded property
 * to achieve nominal typing. Two states are only compatible if they have:
 * 1. The same state name `TName`
 * 2. The same context type `TContext`
 *
 * @typeParam TName - The literal string type for the state name
 * @typeParam TContext - The context data type (defaults to `void` for no context)
 *
 * @remarks
 * - The brand property carries both the state name and context in a tuple
 * - The `name` property enables discriminated union narrowing
 * - Context is conditionally included only when `TContext` is not `void`
 * - Context is wrapped in `DeepReadonly` for immutability
 *
 * @see {@link state} - Factory function to create state values
 * @see {@link InferStateName} - Utility to extract the state name
 * @see {@link InferStateContext} - Utility to extract the context type
 *
 * @example State without context
 * ```typescript
 * type IdleState = State<'idle'>;
 * // { name: 'idle' } - no context property
 * ```
 *
 * @example State with context
 * ```typescript
 * type LoadingState = State<'loading', { progress: number }>;
 * // { name: 'loading', context: { readonly progress: number } }
 * ```
 */
export type State<TName extends string, TContext = void> = {
  /**
   * Brand property for nominal typing.
   * Contains a tuple of [StateName, ContextType] at the type level.
   * Value is undefined at runtime.
   */
  readonly [K in StateBrandSymbol]: [TName, TContext];
} & {
  /**
   * The state name as a literal string type.
   * Used for discriminated union narrowing.
   */
  readonly name: TName;
} & (TContext extends void ? NoAdditionalProperties : { readonly context: DeepReadonly<TContext> });

// =============================================================================
// Event Type
// =============================================================================

/**
 * A branded event type that represents an occurrence in a state machine.
 *
 * The Event type uses TypeScript's structural typing with a branded property
 * to achieve nominal typing. Two events are only compatible if they have:
 * 1. The same event type name `TName`
 * 2. The same payload type `TPayload`
 *
 * @typeParam TName - The literal string type for the event type (conventionally UPPER_SNAKE_CASE)
 * @typeParam TPayload - The payload data type (defaults to `void` for no payload)
 *
 * @remarks
 * - The brand property carries both the event type and payload in a tuple
 * - The `type` property enables discriminated union narrowing
 * - Payload is conditionally included only when `TPayload` is not `void`
 * - Payload is NOT wrapped in DeepReadonly (events are typically created once and consumed)
 *
 * @see {@link event} - Factory function to create event values
 * @see {@link InferEventName} - Utility to extract the event type name
 * @see {@link InferEventPayload} - Utility to extract the payload type
 *
 * @example Event without payload
 * ```typescript
 * type ResetEvent = Event<'RESET'>;
 * // { type: 'RESET' } - no payload property
 * ```
 *
 * @example Event with payload
 * ```typescript
 * type SubmitEvent = Event<'SUBMIT', { formId: string }>;
 * // { type: 'SUBMIT', payload: { formId: string } }
 * ```
 */
export type Event<TName extends string, TPayload = void> = {
  /**
   * Brand property for nominal typing.
   * Contains a tuple of [EventName, PayloadType] at the type level.
   * Value is undefined at runtime.
   */
  readonly [K in EventBrandSymbol]: [TName, TPayload];
} & {
  /**
   * The event type as a literal string type.
   * Used for discriminated union narrowing and event routing.
   */
  readonly type: TName;
} & (TPayload extends void ? NoAdditionalProperties : { readonly payload: TPayload });

// =============================================================================
// Machine Type
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
 * @remarks
 * The Machine type is created using the `defineMachine` factory function.
 * The brand property encodes the complete type signature at the type level,
 * while the runtime properties provide access to the configuration.
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
  readonly states: Record<TStateNames, unknown>;

  /**
   * The initial context value.
   */
  readonly context: TContext;
};

// =============================================================================
// Type Inference Utilities
// =============================================================================

/**
 * Extracts the state name literal type from a State type.
 *
 * @typeParam S - The State type to extract the name from
 * @returns The state name literal type `TName`
 *
 * @example
 * ```typescript
 * type LoadingState = State<'loading', { progress: number }>;
 * type Name = InferStateName<LoadingState>; // 'loading'
 * ```
 */
export type InferStateName<S> = S extends State<infer TName, infer _TContext> ? TName : never;

/**
 * Extracts the context type from a State type.
 *
 * @typeParam S - The State type to extract the context from
 * @returns The context type `TContext`, or `void` if no context
 *
 * @example
 * ```typescript
 * type LoadingState = State<'loading', { progress: number }>;
 * type Context = InferStateContext<LoadingState>; // { progress: number }
 *
 * type IdleState = State<'idle'>;
 * type NoContext = InferStateContext<IdleState>; // void
 * ```
 */
export type InferStateContext<S> = S extends State<infer _TName, infer TContext> ? TContext : never;

/**
 * Extracts the event type name literal from an Event type.
 *
 * @typeParam E - The Event type to extract the name from
 * @returns The event type name literal `TName`
 *
 * @example
 * ```typescript
 * type SubmitEvent = Event<'SUBMIT', { formId: string }>;
 * type Name = InferEventName<SubmitEvent>; // 'SUBMIT'
 * ```
 */
export type InferEventName<E> = E extends Event<infer TName, infer _TPayload> ? TName : never;

/**
 * Extracts the payload type from an Event type.
 *
 * @typeParam E - The Event type to extract the payload from
 * @returns The payload type `TPayload`, or `void` if no payload
 *
 * @example
 * ```typescript
 * type SubmitEvent = Event<'SUBMIT', { formId: string }>;
 * type Payload = InferEventPayload<SubmitEvent>; // { formId: string }
 *
 * type ResetEvent = Event<'RESET'>;
 * type NoPayload = InferEventPayload<ResetEvent>; // void
 * ```
 */
export type InferEventPayload<E> = E extends Event<infer _TName, infer TPayload> ? TPayload : never;

/**
 * Creates a union type from an array/tuple of state types.
 *
 * @typeParam TStates - An array or tuple of State types
 * @returns Union of all state types
 *
 * @example
 * ```typescript
 * type Idle = State<'idle'>;
 * type Loading = State<'loading', { progress: number }>;
 * type Success = State<'success', { data: string }>;
 *
 * type AllStates = StateUnion<[Idle, Loading, Success]>;
 * // Idle | Loading | Success
 * ```
 */
export type StateUnion<TStates extends readonly StateAny[]> = TStates[number];

/**
 * Creates a union type from an array/tuple of event types.
 *
 * @typeParam TEvents - An array or tuple of Event types
 * @returns Union of all event types
 *
 * @example
 * ```typescript
 * type Click = Event<'CLICK'>;
 * type Submit = Event<'SUBMIT', { formId: string }>;
 * type Reset = Event<'RESET'>;
 *
 * type AllEvents = EventUnion<[Click, Submit, Reset]>;
 * // Click | Submit | Reset
 * ```
 */
export type EventUnion<TEvents extends readonly EventAny[]> = TEvents[number];

// =============================================================================
// StateAny and EventAny for Universal Constraints
// =============================================================================

/**
 * Structural interface matching ANY State without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL States
 * are assignable to. The key property is `name: string` which all states have.
 *
 * When used as a constraint `<S extends StateAny>`, the generic parameter `S`
 * preserves the EXACT state type for full inference.
 *
 * @remarks
 * This follows the AdapterAny pattern from `@hex-di/graph` to avoid using `any`.
 * Unlike `State<string, unknown>`, this interface doesn't require a `context`
 * property, allowing it to match states with or without context.
 */
export interface StateAny {
  /**
   * The state name. All states have this property.
   */
  readonly name: string;
}

/**
 * Structural interface matching ANY Event without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL Events
 * are assignable to. The key property is `type: string` which all events have.
 *
 * When used as a constraint `<E extends EventAny>`, the generic parameter `E`
 * preserves the EXACT event type for full inference.
 *
 * @remarks
 * This follows the AdapterAny pattern from `@hex-di/graph` to avoid using `any`.
 * Unlike `Event<string, unknown>`, this interface doesn't require a `payload`
 * property, allowing it to match events with or without payload.
 */
export interface EventAny {
  /**
   * The event type. All events have this property.
   */
  readonly type: string;
}

/**
 * Structural interface matching ANY Machine without using `any`.
 *
 * This uses TypeScript's variance rules to create a type that ALL Machines
 * are assignable to. It constrains only the shape of the machine config
 * without specifying concrete state, event, or context types.
 *
 * When used as a constraint `<M extends MachineAny>`, the generic parameter `M`
 * preserves the EXACT machine type for full inference.
 *
 * @remarks
 * This follows the AdapterAny pattern from `@hex-di/graph` to avoid using `any`.
 * The interface includes all runtime properties that machines have.
 */
export interface MachineAny {
  /**
   * The machine identifier. All machines have this property.
   */
  readonly id: string;

  /**
   * The initial state name. All machines have this property.
   */
  readonly initial: string;

  /**
   * The states record. All machines have this property.
   */
  readonly states: Record<string, unknown>;

  /**
   * The context value. All machines have this property (may be undefined/void).
   */
  readonly context: unknown;

  /**
   * Optional machine definition version (GxP F5).
   * Used for state migration when restoring serialized state.
   */
  readonly version?: number;
}

// =============================================================================
// Machine Type Inference Utilities
// =============================================================================

/**
 * Extracts the state names union from a Machine type.
 *
 * @typeParam M - The Machine type
 * @returns Union of state name string literals
 *
 * @example
 * ```typescript
 * type States = InferMachineStateNames<typeof myMachine>;
 * // 'idle' | 'loading' | 'success'
 * ```
 */
export type InferMachineStateNames<M> =
  M extends Machine<infer TStateNames, infer _E, infer _C> ? TStateNames : never;

/**
 * Extracts the event names union from a Machine type.
 *
 * @typeParam M - The Machine type
 * @returns Union of event name string literals
 *
 * @example
 * ```typescript
 * type Events = InferMachineEventNames<typeof myMachine>;
 * // 'FETCH' | 'SUCCESS' | 'FAILURE'
 * ```
 */
export type InferMachineEventNames<M> =
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
export type InferMachineContextType<M> =
  M extends Machine<infer _S, infer _E, infer TContext> ? TContext : never;
