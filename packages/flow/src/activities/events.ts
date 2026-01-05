/**
 * Typed Event Definition System
 *
 * This module provides type-safe event definition and emission for activities.
 * Events are defined using factory functions that produce typed event objects,
 * with full type inference for both creation and emission.
 *
 * @packageDocumentation
 */

// =============================================================================
// Event Definition Type
// =============================================================================

/**
 * Represents a typed event with a discriminant `type` property and payload.
 *
 * The type property is readonly and set to the literal type `TType`.
 * The payload properties are spread into the event object and made readonly.
 *
 * @typeParam TType - The literal string type for the event type
 * @typeParam TPayload - The payload data to include in the event
 *
 * @example
 * ```typescript
 * type ProgressEvent = EventDefinition<'PROGRESS', { percent: number }>;
 * // { readonly type: 'PROGRESS'; readonly percent: number }
 * ```
 */
export type EventDefinition<TType extends string, TPayload extends Record<string, unknown>> = {
  readonly type: TType;
} & { readonly [K in keyof TPayload]: TPayload[K] };

// =============================================================================
// Event Factory Type
// =============================================================================

/**
 * A callable factory that creates typed events.
 *
 * The factory is a function that accepts arguments and returns an EventDefinition.
 * It also has a readonly `type` property containing the event type literal.
 *
 * @typeParam TType - The literal string type for the event type
 * @typeParam TArgs - Tuple of argument types the factory accepts
 * @typeParam TPayload - The payload type returned by the factory function
 *
 * @example
 * ```typescript
 * type ProgressFactory = EventFactory<'PROGRESS', [number], { percent: number }>;
 * // Callable: (percent: number) => { type: 'PROGRESS', percent: number }
 * // Has: .type = 'PROGRESS'
 * ```
 */
export type EventFactory<
  TType extends string,
  TArgs extends readonly unknown[],
  TPayload extends Record<string, unknown>,
> = {
  (...args: TArgs): EventDefinition<TType, TPayload>;
  readonly type: TType;
};

// =============================================================================
// Event Definition Input Type
// =============================================================================

/**
 * Constraint type for event definition input.
 * Each property is a factory function returning a record.
 */
type EventDefinitionInput = Record<string, (...args: never[]) => Record<string, unknown>>;

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Extracts the union of all event type strings from an events definition.
 *
 * @typeParam TEvents - The events object from defineEvents
 *
 * @example
 * ```typescript
 * const Events = defineEvents({
 *   PROGRESS: (n: number) => ({ percent: n }),
 *   DONE: () => ({}),
 * });
 *
 * type Types = EventTypes<typeof Events>;
 * // 'PROGRESS' | 'DONE'
 * ```
 */
export type EventTypes<TEvents> =
  TEvents extends Record<string, EventFactory<infer T, never[], never>>
    ? T
    : TEvents extends Record<infer _K extends string, { type: infer T extends string }>
      ? T
      : keyof TEvents extends string
        ? keyof TEvents
        : never;

/**
 * Helper type to extract the payload type from a factory.
 *
 * Handles two cases:
 * 1. EventFactory (from DefineEventsResult) - extract payload from EventDefinition return type
 * 2. Raw factory function (from input) - infer return type
 *
 * Empty objects are normalized to Record<string, never>.
 */
type InferPayload<TFactory> = TFactory extends { type: string }
  ? // It's an EventFactory - extract from the call signature's return type
    TFactory extends (...args: never[]) => EventDefinition<string, infer TPayload>
    ? NormalizePayload<TPayload>
    : Record<string, never>
  : // It's a raw factory function - infer return type directly
    TFactory extends (...args: never[]) => infer R
    ? R extends Record<string, unknown>
      ? NormalizePayload<R>
      : Record<string, never>
    : Record<string, never>;

/**
 * Normalize payload: convert empty objects to Record<string, never>.
 */
type NormalizePayload<T> = keyof T extends never ? Record<string, never> : T;

/**
 * Extracts the payload type for a specific event type from an events definition.
 *
 * @typeParam TEvents - The events object from defineEvents
 * @typeParam TType - The event type string to extract payload for
 *
 * @example
 * ```typescript
 * const Events = defineEvents({
 *   PROGRESS: (n: number) => ({ percent: n }),
 *   DONE: () => ({}),
 * });
 *
 * type ProgressPayload = PayloadOf<typeof Events, 'PROGRESS'>;
 * // { percent: number }
 *
 * type DonePayload = PayloadOf<typeof Events, 'DONE'>;
 * // Record<string, never>
 * ```
 */
export type PayloadOf<TEvents, TType extends string> = TType extends keyof TEvents
  ? InferPayload<TEvents[TType]>
  : never;

/**
 * Creates a union of all possible event objects from an events definition.
 *
 * @typeParam TEvents - The events object from defineEvents
 *
 * @example
 * ```typescript
 * const Events = defineEvents({
 *   PROGRESS: (n: number) => ({ percent: n }),
 *   DONE: () => ({}),
 * });
 *
 * type AllEvents = EventOf<typeof Events>;
 * // { type: 'PROGRESS', percent: number } | { type: 'DONE' }
 * ```
 */
export type EventOf<TEvents> = {
  [K in keyof TEvents]: K extends string ? EventDefinition<K, InferPayload<TEvents[K]>> : never;
}[keyof TEvents];

// =============================================================================
// TypedEventSink Interface
// =============================================================================

/**
 * Helper type to determine if a payload is empty.
 * Handles both {} and Record<string, never>.
 */
type IsEmptyPayload<TPayload> =
  TPayload extends Record<string, never> ? true : keyof TPayload extends never ? true : false;

/**
 * Helper type to normalize empty object to Record<string, never>.
 */
type NormalizeEmptyPayload<T> = keyof T extends never ? Record<string, never> : T;

/**
 * A type-safe event sink for emitting events defined by defineEvents.
 *
 * Supports two emission patterns:
 * 1. `sink.emit(factory(...))` - Pass the event object directly
 * 2. `sink.emit('TYPE', payload)` - Pass type string and payload separately
 *
 * For events with empty payloads, the payload argument is optional.
 *
 * @typeParam TEvents - The events object from defineEvents
 *
 * @example
 * ```typescript
 * const Events = defineEvents({
 *   PROGRESS: (n: number) => ({ percent: n }),
 *   DONE: () => ({}),
 * });
 *
 * function useEventSink(sink: TypedEventSink<typeof Events>) {
 *   // Pattern 1: Pass event object
 *   sink.emit(Events.PROGRESS(50));
 *
 *   // Pattern 2: Pass type and payload
 *   sink.emit('PROGRESS', { percent: 50 });
 *
 *   // Pattern 3: Empty payload events
 *   sink.emit('DONE');
 *   sink.emit('DONE', {});
 * }
 * ```
 */
export interface TypedEventSink<TEvents> {
  /**
   * Emits an event.
   *
   * Overloaded to support both patterns:
   * - `emit(eventObject)` - Pass the event object directly from a factory
   * - `emit('TYPE', payload)` - Pass type string and payload separately
   *
   * For events with empty payloads, the second argument is optional.
   */
  emit: TypedEmit<TEvents>;
}

/**
 * The emit function type that supports both emission patterns.
 *
 * Uses a union of all possible argument combinations for emit.
 */
type TypedEmit<TEvents> = <T extends EventTypes<TEvents>>(...args: EmitArgs<TEvents, T>) => void;

/**
 * Creates the argument types for emit, supporting both patterns:
 * - [eventObject] for factory results
 * - [type, payload?] for type string + payload
 */
type EmitArgs<TEvents, T extends string> = T extends keyof TEvents
  ?
      | [event: EventDefinition<T, InferPayload<TEvents[T]>>]
      | (IsEmptyPayload<InferPayload<TEvents[T]>> extends true
          ? [type: T] | [type: T, payload: NormalizeEmptyPayload<InferPayload<TEvents[T]>>]
          : [type: T, payload: InferPayload<TEvents[T]>])
  : never;

// =============================================================================
// defineEvents Implementation
// =============================================================================

/**
 * Infers the result type of defineEvents from the input definition.
 * Uses NormalizePayload to convert empty objects to Record<string, never>.
 */
type DefineEventsResult<TDef extends EventDefinitionInput> = {
  [K in keyof TDef & string]: EventFactory<
    K,
    Parameters<TDef[K]>,
    ReturnType<TDef[K]> extends Record<string, unknown>
      ? NormalizePayload<ReturnType<TDef[K]>>
      : Record<string, never>
  >;
};

/**
 * Defines a set of typed events using factory functions.
 *
 * Each property in the definition object becomes an event factory that:
 * 1. Is callable with the defined arguments
 * 2. Returns a frozen event object with `{ type: 'EVENT_NAME', ...payload }`
 * 3. Has a `.type` property containing the event name
 *
 * @typeParam TDef - The event definition object type (inferred with const modifier)
 * @param def - Object mapping event names to factory functions
 * @returns Object mapping event names to EventFactory objects
 *
 * @example
 * ```typescript
 * const TaskEvents = defineEvents({
 *   PROGRESS: (percent: number) => ({ percent }),
 *   COMPLETED: (result: TaskResult) => ({ result }),
 *   FAILED: (error: Error, retryable: boolean) => ({ error, retryable }),
 *   DONE: () => ({}),
 * });
 *
 * // Usage
 * TaskEvents.PROGRESS.type === 'PROGRESS'  // Static .type property
 * TaskEvents.PROGRESS(50)                   // { type: 'PROGRESS', percent: 50 }
 * TaskEvents.DONE()                         // { type: 'DONE' }
 * ```
 */
export function defineEvents<const TDef extends EventDefinitionInput>(
  def: TDef
): DefineEventsResult<TDef> {
  const result: Record<string, unknown> = {};

  for (const eventType of Object.keys(def)) {
    const payloadFactory = def[eventType];

    // Create the factory function
    const factory = (...args: readonly unknown[]): unknown => {
      // Call the user's payload factory
      const payload = (payloadFactory as (...args: readonly unknown[]) => Record<string, unknown>)(
        ...args
      );

      // Create the event object with type and spread payload
      const eventObject: Record<string, unknown> = {
        type: eventType,
      };

      // Copy payload properties
      for (const key of Object.keys(payload)) {
        eventObject[key] = payload[key];
      }

      // Freeze the event object for immutability
      return Object.freeze(eventObject);
    };

    // Add the .type property to the factory
    Object.defineProperty(factory, "type", {
      value: eventType,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    result[eventType] = factory;
  }

  // Freeze the result object to prevent modification
  return Object.freeze(result) as DefineEventsResult<TDef>;
}
