/**
 * Factory Functions for State and Event Creation
 *
 * This module provides curried factory functions for creating State and Event
 * values with full type inference and runtime immutability.
 *
 * @packageDocumentation
 */

import type { State, Event, DeepReadonly } from "./types.js";

// =============================================================================
// Internal Creation Helpers
// =============================================================================

/**
 * Creates a State value with phantom type parameters.
 *
 * ## SAFETY DOCUMENTATION
 *
 * The State type has a branded property that exists ONLY at the type level
 * for nominal typing. At runtime, only `name` and optionally `context` exist.
 *
 * This is safe because:
 * 1. **Brand is never accessed**: The brand symbol is used exclusively for
 *    compile-time type discrimination. No runtime code reads this property.
 *
 * 2. **Immutability guaranteed**: `Object.freeze()` prevents any mutation,
 *    ensuring the runtime object cannot be modified to invalidate type assumptions.
 *
 * 3. **Single creation point**: This is the ONLY location where State values are
 *    created, ensuring all states have consistent structure.
 *
 * 4. **Phantom type pattern**: This follows the well-established phantom type
 *    pattern where type parameters carry compile-time information without
 *    runtime representation.
 *
 * @internal - Not part of public API. Use state() factory instead.
 */
function unsafeCreateState<TName extends string, TContext>(
  name: TName,
  context: TContext
): State<TName, TContext> {
  // Build the state object based on whether context is provided
  const stateObj = context === undefined ? { name } : { name, context: deepFreeze(context) };

  // @ts-expect-error - Intentional phantom type gap: brand exists only at type level for nominal typing
  return Object.freeze(stateObj);
}

/**
 * Creates a State value without context.
 *
 * @internal - Not part of public API. Use state() factory instead.
 */
function unsafeCreateStateWithoutContext<TName extends string>(name: TName): State<TName, void> {
  // @ts-expect-error - Intentional phantom type gap: brand exists only at type level for nominal typing
  return Object.freeze({ name });
}

/**
 * Creates an Event value with phantom type parameters.
 *
 * ## SAFETY DOCUMENTATION
 *
 * The Event type has a branded property that exists ONLY at the type level
 * for nominal typing. At runtime, only `type` and optionally `payload` exist.
 *
 * This is safe because:
 * 1. **Brand is never accessed**: The brand symbol is used exclusively for
 *    compile-time type discrimination. No runtime code reads this property.
 *
 * 2. **Immutability guaranteed**: `Object.freeze()` prevents any mutation,
 *    ensuring the runtime object cannot be modified to invalidate type assumptions.
 *
 * 3. **Single creation point**: This is the ONLY location where Event values are
 *    created, ensuring all events have consistent structure.
 *
 * 4. **Phantom type pattern**: This follows the well-established phantom type
 *    pattern where type parameters carry compile-time information without
 *    runtime representation.
 *
 * @internal - Not part of public API. Use event() factory instead.
 */
function unsafeCreateEvent<TName extends string, TPayload>(
  type: TName,
  payload: TPayload
): Event<TName, TPayload> {
  // Build the event object based on whether payload is provided
  const eventObj = payload === undefined ? { type } : { type, payload: deepFreeze(payload) };

  // @ts-expect-error - Intentional phantom type gap: brand exists only at type level for nominal typing
  return Object.freeze(eventObj);
}

/**
 * Creates an Event value without payload.
 *
 * @internal - Not part of public API. Use event() factory instead.
 */
function unsafeCreateEventWithoutPayload<TName extends string>(type: TName): Event<TName, void> {
  // @ts-expect-error - Intentional phantom type gap: brand exists only at type level for nominal typing
  return Object.freeze({ type });
}

// =============================================================================
// Deep Freeze Utility
// =============================================================================

/**
 * Internal helper that deeply freezes an object value in-place and returns it.
 * Operates on the runtime representation without type-level concerns.
 *
 * @internal
 */
function deepFreezeValue(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }

  // Get all property names (including non-enumerable ones)
  const propNames = Object.getOwnPropertyNames(obj);

  // Freeze each property value before freezing the object itself
  for (const name of propNames) {
    const desc = Object.getOwnPropertyDescriptor(obj, name);
    if (desc !== undefined) {
      const value = desc.value;
      if (value !== null && typeof value === "object") {
        deepFreezeValue(value);
      }
    }
  }

  return Object.freeze(obj);
}

/**
 * Recursively freezes an object and all its nested properties.
 *
 * This ensures runtime immutability matches the type-level DeepReadonly guarantee.
 *
 * @param obj - The object to deeply freeze
 * @returns The same object, now frozen
 *
 * @remarks
 * TypeScript cannot prove that deeply freezing a value of type T produces DeepReadonly<T>,
 * because Object.freeze only returns Readonly<T> (shallow). The @ts-expect-error below
 * bridges this gap: at runtime, deepFreezeValue recursively freezes all nested properties,
 * so the result truly is DeepReadonly<T>, even though TypeScript cannot verify this statically.
 *
 * @internal
 */
function deepFreeze<T>(obj: T): DeepReadonly<T> {
  // @ts-expect-error - TypeScript cannot prove deep freeze produces DeepReadonly<T>; see remarks above
  return deepFreezeValue(obj);
}

// =============================================================================
// State Factory Function
// =============================================================================

/**
 * Creates a curried factory function for producing State values.
 *
 * This function uses the curried pattern to enable partial type inference:
 * - `TName` is explicitly provided at the first call
 * - `TContext` is explicitly provided at the first call (defaults to void)
 * - The returned function creates immutable State instances
 *
 * @typeParam TName - The literal string type for the state name
 * @typeParam TContext - The context data type (defaults to `void` for no context)
 *
 * @param name - The state name (must match the TName type parameter)
 *
 * @returns A function that creates State instances:
 *   - If TContext is void: `() => State<TName, void>`
 *   - If TContext is provided: `(context: TContext) => State<TName, TContext>`
 *
 * @remarks
 * - All created states are deeply frozen for runtime immutability
 * - The brand property exists only at the type level
 * - Use `Object.freeze()` for top-level immutability
 * - Use `deepFreeze()` for nested context objects
 *
 * @example State without context
 * ```typescript
 * const createIdle = state<'idle'>('idle');
 * const idleState = createIdle();
 * // idleState: State<'idle'>
 * // idleState.name === 'idle'
 * ```
 *
 * @example State with context
 * ```typescript
 * interface LoadingContext {
 *   progress: number;
 *   message: string;
 * }
 *
 * const createLoading = state<'loading', LoadingContext>('loading');
 * const loadingState = createLoading({ progress: 50, message: 'Loading...' });
 * // loadingState: State<'loading', LoadingContext>
 * // loadingState.name === 'loading'
 * // loadingState.context === { progress: 50, message: 'Loading...' } (frozen)
 * ```
 */
export function state<TName extends string>(name: TName): () => State<TName, void>;
export function state<TName extends string, TContext>(
  name: TName
): (context: TContext) => State<TName, TContext>;
export function state<TName extends string, TContext = void>(
  name: TName
): (context?: TContext) => State<TName, void> | State<TName, TContext> {
  return (context?: TContext): State<TName, void> | State<TName, TContext> => {
    if (context === undefined) {
      return unsafeCreateStateWithoutContext(name);
    }
    return unsafeCreateState(name, context);
  };
}

// =============================================================================
// Event Factory Function
// =============================================================================

/**
 * Creates a curried factory function for producing Event values.
 *
 * This function uses the curried pattern to enable partial type inference:
 * - `TName` is explicitly provided at the first call
 * - `TPayload` is explicitly provided at the first call (defaults to void)
 * - The returned function creates immutable Event instances
 *
 * @typeParam TName - The literal string type for the event type (conventionally UPPER_SNAKE_CASE)
 * @typeParam TPayload - The payload data type (defaults to `void` for no payload)
 *
 * @param type - The event type name (must match the TName type parameter)
 *
 * @returns A function that creates Event instances:
 *   - If TPayload is void: `() => Event<TName, void>`
 *   - If TPayload is provided: `(payload: TPayload) => Event<TName, TPayload>`
 *
 * @remarks
 * - All created events are deeply frozen for runtime immutability
 * - The brand property exists only at the type level
 * - Event type names conventionally use UPPER_SNAKE_CASE
 *
 * @example Event without payload
 * ```typescript
 * const createReset = event<'RESET'>('RESET');
 * const resetEvent = createReset();
 * // resetEvent: Event<'RESET'>
 * // resetEvent.type === 'RESET'
 * ```
 *
 * @example Event with payload
 * ```typescript
 * interface SubmitPayload {
 *   formId: string;
 *   data: Record<string, string>;
 * }
 *
 * const createSubmit = event<'SUBMIT', SubmitPayload>('SUBMIT');
 * const submitEvent = createSubmit({ formId: 'login', data: { user: 'test' } });
 * // submitEvent: Event<'SUBMIT', SubmitPayload>
 * // submitEvent.type === 'SUBMIT'
 * // submitEvent.payload === { formId: 'login', data: { user: 'test' } } (frozen)
 * ```
 */
export function event<TName extends string>(type: TName): () => Event<TName, void>;
export function event<TName extends string, TPayload>(
  type: TName
): (payload: TPayload) => Event<TName, TPayload>;
export function event<TName extends string, TPayload = void>(
  type: TName
): (payload?: TPayload) => Event<TName, void> | Event<TName, TPayload> {
  return (payload?: TPayload): Event<TName, void> | Event<TName, TPayload> => {
    if (payload === undefined) {
      return unsafeCreateEventWithoutPayload(type);
    }
    return unsafeCreateEvent(type, payload);
  };
}
