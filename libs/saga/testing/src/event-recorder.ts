/**
 * Saga Event Recorder
 *
 * Records saga lifecycle events for test assertions.
 *
 * @packageDocumentation
 */

import type { SagaEvent } from "@hex-di/saga";

// =============================================================================
// Types
// =============================================================================

/** A saga event recorder that tracks lifecycle events */
export interface SagaEventRecorder {
  /** All recorded events */
  readonly events: ReadonlyArray<SagaEvent>;
  /** Events of a specific type */
  getByType<T extends SagaEvent["type"]>(type: T): ReadonlyArray<Extract<SagaEvent, { type: T }>>;
  /** Number of events recorded */
  readonly eventCount: number;
  /** Whether an event of the given type was recorded */
  hasEvent(type: SagaEvent["type"]): boolean;
  /** Create a listener function that records events */
  readonly listener: (event: SagaEvent) => void;
  /** Reset all recorded events */
  reset(): void;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a saga event recorder.
 *
 * @example
 * ```typescript
 * const recorder = createSagaEventRecorder();
 * runner.subscribe(executionId, recorder.listener);
 *
 * // After execution...
 * expect(recorder.hasEvent('saga:completed')).toBe(true);
 * expect(recorder.getByType('step:completed')).toHaveLength(3);
 * ```
 */
export function createSagaEventRecorder(): SagaEventRecorder {
  const recorded: SagaEvent[] = [];

  const listener = (event: SagaEvent): void => {
    recorded.push(event);
  };

  return {
    get events(): ReadonlyArray<SagaEvent> {
      return recorded;
    },
    getByType<T extends SagaEvent["type"]>(
      type: T
    ): ReadonlyArray<Extract<SagaEvent, { type: T }>> {
      return recorded.filter((e): e is Extract<SagaEvent, { type: T }> => e.type === type);
    },
    get eventCount(): number {
      return recorded.length;
    },
    hasEvent(type: SagaEvent["type"]): boolean {
      return recorded.some(e => e.type === type);
    },
    listener,
    reset(): void {
      recorded.length = 0;
    },
  };
}
