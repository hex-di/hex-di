/**
 * Inspector Subscription Activity
 *
 * Long-running activity that subscribes to an inspector and emits events.
 * Uses AbortSignal for proper cleanup and the @hex-di/flow activity() factory
 * pattern for typed events and dependency injection.
 *
 * This activity is designed to be spawned per-container when added to the
 * ContainerTreeMachine, providing real-time updates on container state changes.
 *
 * @packageDocumentation
 */

import { defineEvents, activity, activityPort } from "@hex-di/flow";
import type { InspectorWithSubscription, InspectorEvent } from "@hex-di/runtime";

// =============================================================================
// Activity Events
// =============================================================================

/**
 * Event type for inspector subscription events.
 */
export type InspectorSubscriptionEventType =
  | "SUBSCRIPTION_READY"
  | "SUBSCRIPTION_ERROR"
  | "SUBSCRIPTION_STOPPED"
  | "RESOLUTION"
  | "SNAPSHOT_CHANGED"
  | "SCOPE_CREATED"
  | "SCOPE_DISPOSED"
  | "CHILD_CREATED"
  | "CHILD_DISPOSED"
  | "PHASE_CHANGED";

/**
 * Events emitted by the inspector subscription activity.
 */
export const InspectorSubscriptionEvents = defineEvents({
  /** Subscription successfully established */
  SUBSCRIPTION_READY: () => ({}),

  /** Subscription failed */
  SUBSCRIPTION_ERROR: (error: Error) => ({ error }),

  /** Subscription stopped cleanly */
  SUBSCRIPTION_STOPPED: () => ({}),

  /** Service resolved */
  RESOLUTION: (portName: string, duration: number, isCacheHit: boolean) => ({
    portName,
    duration,
    isCacheHit,
  }),

  /** Generic snapshot change */
  SNAPSHOT_CHANGED: () => ({}),

  /** Scope created */
  SCOPE_CREATED: (scopeId: string, parentId: string | null, createdAt: number) => ({
    scope: { id: scopeId, name: scopeId, parentId, createdAt },
  }),

  /** Scope disposed */
  SCOPE_DISPOSED: (scopeId: string) => ({ scopeId }),

  /** Child container created */
  CHILD_CREATED: (childId: string, childKind: "child" | "lazy") => ({ childId, childKind }),

  /** Child container disposed */
  CHILD_DISPOSED: (childId: string) => ({ childId }),

  /** Container phase changed */
  PHASE_CHANGED: (phase: string) => ({ phase }),
});

// =============================================================================
// Activity Types
// =============================================================================

/**
 * Input for the inspector subscription activity.
 */
export interface InspectorSubscriptionInput {
  /** The inspector to subscribe to */
  readonly inspector: InspectorWithSubscription;
}

/**
 * Output from the inspector subscription activity.
 */
export interface InspectorSubscriptionOutput {
  /** Number of events received during subscription */
  readonly eventsReceived: number;
}

/**
 * Event sink for emitting events from the activity.
 * @deprecated Use the activity() factory pattern instead.
 */
export interface InspectorEventSink {
  /**
   * Emit an event to the machine.
   *
   * @param event - The event to emit (use InspectorSubscriptionEvents factories)
   */
  emit(event: {
    readonly type: InspectorSubscriptionEventType;
    readonly [key: string]: unknown;
  }): void;
}

// =============================================================================
// Activity Port
// =============================================================================

/**
 * Port for the inspector subscription activity.
 */
export const InspectorSubscriptionPort = activityPort<
  InspectorSubscriptionInput,
  InspectorSubscriptionOutput
>()("InspectorSubscription");

// =============================================================================
// Activity Implementation
// =============================================================================

/**
 * Inspector Subscription Activity.
 *
 * Subscribes to an inspector and emits events for container state changes.
 * This is a long-running activity that continues until the AbortSignal
 * is triggered or an error occurs.
 *
 * Events emitted:
 * - SUBSCRIPTION_READY: When subscription is established
 * - SUBSCRIPTION_ERROR: On subscription failure
 * - SUBSCRIPTION_STOPPED: On clean shutdown
 * - RESOLUTION: Service resolution occurred
 * - SNAPSHOT_CHANGED: Container snapshot changed
 * - SCOPE_CREATED: Scope created in container
 * - SCOPE_DISPOSED: Scope disposed in container
 * - CHILD_CREATED: Child container created
 * - CHILD_DISPOSED: Child container disposed
 * - PHASE_CHANGED: Container phase changed
 *
 * @example
 * ```typescript
 * const { events } = await testActivity(InspectorSubscriptionActivity, {
 *   input: { inspector },
 *   deps: {},
 *   abortAfter: 1000, // Run for 1 second
 * });
 *
 * expect(events).toContainEqual({ type: 'SUBSCRIPTION_READY' });
 * ```
 */
export const InspectorSubscriptionActivity = activity(InspectorSubscriptionPort, {
  requires: [] as const,
  emits: InspectorSubscriptionEvents,
  timeout: undefined, // Long-running, no timeout

  async execute(
    input: InspectorSubscriptionInput,
    { sink, signal }
  ): Promise<InspectorSubscriptionOutput> {
    const { inspector } = input;
    let eventsReceived = 0;

    // Check if already aborted
    if (signal.aborted) {
      sink.emit(InspectorSubscriptionEvents.SUBSCRIPTION_STOPPED());
      return { eventsReceived: 0 };
    }

    // Create a promise that resolves when aborted
    const abortPromise = new Promise<void>(resolve => {
      signal.addEventListener("abort", () => resolve(), { once: true });
    });

    try {
      // Subscribe to inspector events
      const unsubscribe = inspector.subscribe((event: InspectorEvent) => {
        // Don't emit if aborted
        if (signal.aborted) {
          return;
        }

        eventsReceived++;

        // Map inspector events to machine events
        switch (event.type) {
          case "resolution":
            sink.emit(
              InspectorSubscriptionEvents.RESOLUTION(
                event.portName,
                event.duration,
                event.isCacheHit
              )
            );
            break;

          case "snapshot-changed":
            sink.emit(InspectorSubscriptionEvents.SNAPSHOT_CHANGED());
            break;

          case "scope-created":
            sink.emit(
              InspectorSubscriptionEvents.SCOPE_CREATED(
                event.scope.id,
                event.scope.parentId ?? null,
                event.scope.createdAt
              )
            );
            break;

          case "scope-disposed":
            sink.emit(InspectorSubscriptionEvents.SCOPE_DISPOSED(event.scopeId));
            break;

          case "child-created":
            sink.emit(InspectorSubscriptionEvents.CHILD_CREATED(event.childId, event.childKind));
            break;

          case "child-disposed":
            sink.emit(InspectorSubscriptionEvents.CHILD_DISPOSED(event.childId));
            break;

          case "phase-changed":
            sink.emit(InspectorSubscriptionEvents.PHASE_CHANGED(event.phase));
            break;

          // init-progress is not mapped to machine events (internal to initialization)
        }
      });

      // Emit subscription ready
      sink.emit(InspectorSubscriptionEvents.SUBSCRIPTION_READY());

      // Wait for abort signal
      await abortPromise;

      // Cleanup subscription
      unsubscribe();

      // Emit stopped event
      sink.emit(InspectorSubscriptionEvents.SUBSCRIPTION_STOPPED());

      return { eventsReceived };
    } catch (error) {
      // Emit subscription error
      const err = error instanceof Error ? error : new Error(String(error));
      sink.emit(InspectorSubscriptionEvents.SUBSCRIPTION_ERROR(err));
      return { eventsReceived };
    }
  },

  // Cleanup function for graceful shutdown
  cleanup(reason, { deps: _deps }) {
    // No-op: subscription is already cleaned up in execute()
    // This is called after execute() completes, so nothing to do here
  },
});

// =============================================================================
// Legacy Function (for backward compatibility)
// =============================================================================

/**
 * Starts the inspector subscription activity.
 *
 * @deprecated Use InspectorSubscriptionActivity with the activity() factory pattern.
 *
 * This function subscribes to the inspector and emits events to the provided
 * sink. It runs until the AbortSignal is aborted.
 *
 * @param input - The activity input containing the inspector
 * @param sink - The event sink to emit events to
 * @param signal - AbortSignal for cleanup
 */
export function runInspectorSubscription(
  input: InspectorSubscriptionInput,
  sink: InspectorEventSink,
  signal: AbortSignal
): void {
  const { inspector } = input;

  // Check if already aborted
  if (signal.aborted) {
    return;
  }

  try {
    // Subscribe to inspector events
    const unsubscribe = inspector.subscribe((event: InspectorEvent) => {
      // Don't emit if aborted
      if (signal.aborted) {
        return;
      }

      // Map inspector events to machine events
      switch (event.type) {
        case "resolution":
          sink.emit(
            InspectorSubscriptionEvents.RESOLUTION(event.portName, event.duration, event.isCacheHit)
          );
          break;

        case "snapshot-changed":
          sink.emit(InspectorSubscriptionEvents.SNAPSHOT_CHANGED());
          break;

        case "scope-created":
          sink.emit(
            InspectorSubscriptionEvents.SCOPE_CREATED(
              event.scope.id,
              event.scope.parentId ?? null,
              event.scope.createdAt
            )
          );
          break;

        case "scope-disposed":
          sink.emit(InspectorSubscriptionEvents.SCOPE_DISPOSED(event.scopeId));
          break;

        case "child-created":
          sink.emit(InspectorSubscriptionEvents.CHILD_CREATED(event.childId, event.childKind));
          break;

        case "child-disposed":
          sink.emit(InspectorSubscriptionEvents.CHILD_DISPOSED(event.childId));
          break;

        case "phase-changed":
          sink.emit(InspectorSubscriptionEvents.PHASE_CHANGED(event.phase));
          break;

        // init-progress is not mapped to machine events (internal to initialization)
      }
    });

    // Setup cleanup on abort
    signal.addEventListener(
      "abort",
      () => {
        unsubscribe();
      },
      { once: true }
    );

    // Emit subscription ready
    sink.emit(InspectorSubscriptionEvents.SUBSCRIPTION_READY());
  } catch (error) {
    // Emit subscription error
    const err = error instanceof Error ? error : new Error(String(error));
    sink.emit(InspectorSubscriptionEvents.SUBSCRIPTION_ERROR(err));
  }
}
