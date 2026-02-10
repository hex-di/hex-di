/**
 * Test Event Sink
 *
 * Provides a test double for TypedEventSink that captures emitted events
 * for assertion in tests.
 *
 * @packageDocumentation
 */

import type { TypedEventSink, EventOf } from "../events.js";

// =============================================================================
// Test Event Sink Type
// =============================================================================

/**
 * A test double for TypedEventSink that captures all emitted events.
 *
 * Extends TypedEventSink with additional properties for test assertions:
 * - `events`: A readonly array of all captured events
 * - `clear()`: Resets the captured events array
 *
 * @typeParam TEvents - The events definition from defineEvents
 *
 * @example
 * ```typescript
 * const sink = createTestEventSink<typeof TaskEvents>();
 *
 * // Emit events via factory
 * sink.emit(TaskEvents.PROGRESS(50));
 *
 * // Emit events via type + payload
 * sink.emit('COMPLETED', { result: taskResult });
 *
 * // Assert on captured events
 * expect(sink.events).toHaveLength(2);
 * expect(sink.events[0]).toEqual({ type: 'PROGRESS', percent: 50 });
 *
 * // Clear for next test
 * sink.clear();
 * expect(sink.events).toHaveLength(0);
 * ```
 */
export interface TestEventSink<TEvents> extends TypedEventSink<TEvents> {
  /**
   * All events that have been emitted to this sink.
   *
   * The array is readonly to prevent accidental modification.
   * Use `clear()` to reset the captured events.
   */
  readonly events: readonly EventOf<TEvents>[];

  /**
   * Clears all captured events.
   *
   * Call this between test cases or when you need to reset
   * the captured events for a new assertion.
   */
  clear(): void;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Helper to check if a value is an event object (has a type property).
 * Uses a type predicate but with a broader return type for flexibility.
 */
function isEventObject(
  value: unknown
): value is { readonly type: string } & Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof Object.getOwnPropertyDescriptor(value, "type")?.value === "string"
  );
}

/**
 * Creates a test event sink that captures emitted events.
 *
 * The returned sink supports both emit patterns:
 * 1. `sink.emit(factory(...))` - Pass event object from factory
 * 2. `sink.emit('TYPE', payload)` - Pass type string and payload
 *
 * @typeParam TEvents - The events definition from defineEvents
 *
 * @returns A TestEventSink with captured events and clear method
 *
 * @remarks
 * - Events are captured in the order they were emitted
 * - The `events` array is readonly to prevent accidental modification
 * - Use `clear()` to reset between test cases
 * - The sink validates that emitted events have the required `type` property
 *
 * @example Basic usage
 * ```typescript
 * const TaskEvents = defineEvents({
 *   PROGRESS: (percent: number) => ({ percent }),
 *   COMPLETED: (result: TaskResult) => ({ result }),
 * });
 *
 * const sink = createTestEventSink<typeof TaskEvents>();
 *
 * // Execute activity with test sink
 * await activity.execute(input, { deps, sink, signal });
 *
 * // Assert on emitted events
 * expect(sink.events).toContainEqual({
 *   type: 'PROGRESS',
 *   percent: expect.any(Number),
 * });
 * ```
 *
 * @example Testing event order
 * ```typescript
 * const sink = createTestEventSink<typeof TaskEvents>();
 *
 * await activity.execute(input, context);
 *
 * expect(sink.events[0].type).toBe('PROGRESS');
 * expect(sink.events[1].type).toBe('COMPLETED');
 * ```
 *
 * @example Clearing between test cases
 * ```typescript
 * const sink = createTestEventSink<typeof TaskEvents>();
 *
 * // First test
 * await activity.execute(input1, context);
 * expect(sink.events).toHaveLength(2);
 *
 * sink.clear();
 *
 * // Second test
 * await activity.execute(input2, context);
 * expect(sink.events).toHaveLength(1);
 * ```
 */
export function createTestEventSink<TEvents>(): TestEventSink<TEvents> {
  // Mutable internal array for capturing events - using a more permissive internal type
  const capturedEvents: Array<{ readonly type: string } & Record<string, unknown>> = [];

  /**
   * Implementation of the emit function that supports both patterns.
   *
   * Pattern 1: emit(eventObject) - First arg is an object with a `type` property
   * Pattern 2: emit('TYPE', payload) - First arg is a string type, second is payload
   *
   * We use a simple variadic signature that accepts any arguments matching the
   * TypedEventSink patterns. The actual type safety is provided by the
   * TypedEventSink interface.
   */
  function emit(...args: readonly unknown[]): void {
    const firstArg = args[0];

    // Pattern 1: Event object passed directly
    if (isEventObject(firstArg)) {
      capturedEvents.push(firstArg);
      return;
    }

    // Pattern 2: Type string + optional payload
    if (typeof firstArg === "string") {
      const type = firstArg;
      // Build the event object from type + optional payload
      const eventObject: { readonly type: string } & Record<string, unknown> = { type };

      // Copy payload properties using Object.getOwnPropertyDescriptor
      const secondArg = args[1];
      if (typeof secondArg === "object" && secondArg !== null) {
        for (const key of Object.keys(secondArg)) {
          const desc = Object.getOwnPropertyDescriptor(secondArg, key);
          if (desc !== undefined) {
            eventObject[key] = desc.value;
          }
        }
      }

      capturedEvents.push(eventObject);
      return;
    }

    // Invalid usage - should be caught by TypeScript at compile time
    throw new Error(
      `Invalid emit arguments: expected event object or (type, payload), got ${typeof firstArg}`
    );
  }

  // The sink object with proper typing.
  // TypedEventSink's emit has overloaded signatures that constrain what callers can pass.
  // The internal emit function with variadic (...args: unknown[]) signature is assignable
  // because TypedEventSink["emit"] resolves to a generic function that accepts unknown args.
  const sink: TestEventSink<TEvents> = {
    emit,

    get events(): readonly EventOf<TEvents>[] {
      // @ts-expect-error - Variance bridge: capturedEvents is Array<{ type: string } & Record<string, unknown>>
      // but EventOf<TEvents> is a union of specific event types. At runtime the stored events match
      // because they were emitted through the type-safe TypedEventSink interface. TypeScript cannot
      // verify this because TEvents is an unconstrained generic parameter.
      return capturedEvents;
    },

    clear(): void {
      capturedEvents.length = 0;
    },
  };

  return sink;
}
