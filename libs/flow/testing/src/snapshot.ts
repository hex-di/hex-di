/**
 * Snapshot Testing Utilities
 *
 * Provides deterministic serialization and multi-step snapshot capture.
 *
 * @packageDocumentation
 */

import type { MachineSnapshot } from "@hex-di/flow";

// =============================================================================
// Types
// =============================================================================

/** A serialized snapshot with stable values for non-deterministic fields */
export interface SerializedSnapshot {
  readonly state: string;
  readonly context: unknown;
  readonly activities: ReadonlyArray<{
    readonly id: string;
    readonly status: string;
  }>;
}

// =============================================================================
// serializeSnapshot
// =============================================================================

/**
 * Serializes a machine snapshot with stable placeholders for non-deterministic fields.
 *
 * Activity IDs are replaced with sequential "activity-0", "activity-1" etc.
 * Timestamps are removed.
 *
 * @example
 * ```typescript
 * const serialized = serializeSnapshot(runner.snapshot());
 * expect(serialized).toMatchSnapshot();
 * ```
 */
export function serializeSnapshot<TState extends string, TContext>(
  snapshot: MachineSnapshot<TState, TContext>
): SerializedSnapshot {
  return {
    state: snapshot.state,
    context: snapshot.context,
    activities: snapshot.activities.map((a, i) => ({
      id: `activity-${i}`,
      status: a.status,
    })),
  };
}

// =============================================================================
// snapshotMachine
// =============================================================================

/**
 * Runs a sequence of events through a machine and captures snapshots after each.
 *
 * Returns an array of serialized snapshots: [initial, after-event-0, after-event-1, ...]
 *
 * @example
 * ```typescript
 * const snapshots = await snapshotMachine(harness, [
 *   { type: 'FETCH' },
 *   { type: 'SUCCESS', payload: { data: 'hello' } },
 * ]);
 * expect(snapshots).toMatchSnapshot();
 * ```
 */
export async function snapshotMachine<
  TState extends string,
  TEvent extends { readonly type: string },
  TContext,
>(
  harness: {
    snapshot(): MachineSnapshot<TState, TContext>;
    send(event: TEvent): Promise<void>;
  },
  events: ReadonlyArray<TEvent>
): Promise<ReadonlyArray<SerializedSnapshot>> {
  const snapshots: SerializedSnapshot[] = [];

  // Capture initial state
  snapshots.push(serializeSnapshot(harness.snapshot()));

  // Send each event and capture snapshot
  for (const event of events) {
    await harness.send(event);
    snapshots.push(serializeSnapshot(harness.snapshot()));
  }

  return snapshots;
}
