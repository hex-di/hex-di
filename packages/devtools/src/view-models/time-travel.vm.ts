/**
 * TimeTravelViewModel - Immutable view data for time-travel debugging.
 *
 * Contains snapshot history and navigation state for stepping through
 * container state history.
 *
 * @packageDocumentation
 */

import type { SnapshotSummary } from "./comparison.vm.js";

// =============================================================================
// State Diff Types
// =============================================================================

/**
 * Difference between two states.
 */
export interface StateDiff {
  /** Services added since previous snapshot */
  readonly addedServices: readonly string[];
  /** Services removed since previous snapshot */
  readonly removedServices: readonly string[];
  /** Services that changed in some way */
  readonly changedServices: readonly string[];
  /** Resolution count changes */
  readonly resolutionChanges?: ReadonlyMap<string, number>;
  /** Description of the change */
  readonly description?: string;
}

// =============================================================================
// Time Travel View Model
// =============================================================================

/**
 * Complete view model for time-travel debugging.
 */
export interface TimeTravelViewModel {
  /** All snapshots in history */
  readonly snapshots: readonly SnapshotSummary[];
  /** Current position in history (0-based index, -1 if empty) */
  readonly currentIndex: number;
  /** Whether navigation back is possible */
  readonly canGoBack: boolean;
  /** Whether navigation forward is possible */
  readonly canGoForward: boolean;
  /** Diff from previous snapshot, if available */
  readonly stateDiff: StateDiff | null;
  /** Currently selected snapshot, if any */
  readonly currentSnapshot: SnapshotSummary | null;
  /** Whether time travel is active */
  readonly isActive: boolean;
  /** Total snapshot count */
  readonly snapshotCount: number;
  /** Whether the time travel is empty (no snapshots) */
  readonly isEmpty: boolean;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates an empty TimeTravelViewModel.
 */
export function createEmptyTimeTravelViewModel(): TimeTravelViewModel {
  return Object.freeze({
    snapshots: Object.freeze([]),
    currentIndex: -1,
    canGoBack: false,
    canGoForward: false,
    stateDiff: null,
    currentSnapshot: null,
    isActive: false,
    snapshotCount: 0,
    isEmpty: true,
  });
}

// =============================================================================
// Factory Input Types
// =============================================================================

/**
 * Input for creating a TimeTravelViewModel.
 */
export interface TimeTravelViewModelInput {
  /** All snapshots in history */
  readonly snapshots: readonly SnapshotSummary[];
  /** Current position in history (0-based index) */
  readonly currentIndex: number;
  /** Diff from previous snapshot, if available */
  readonly stateDiff: StateDiff | null;
}

/**
 * Creates a TimeTravelViewModel from input data.
 *
 * @param input - The input data for creating the view model
 * @returns An immutable TimeTravelViewModel
 */
export function createTimeTravelViewModel(
  input: TimeTravelViewModelInput
): TimeTravelViewModel {
  const { snapshots, currentIndex, stateDiff } = input;

  if (snapshots.length === 0) {
    return createEmptyTimeTravelViewModel();
  }

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < snapshots.length - 1;
  const currentSnapshot =
    currentIndex >= 0 && currentIndex < snapshots.length
      ? snapshots[currentIndex]
      : null;

  return Object.freeze({
    snapshots: Object.freeze(
      snapshots.map((s) => Object.freeze({ ...s }))
    ),
    currentIndex,
    canGoBack,
    canGoForward,
    stateDiff: stateDiff
      ? Object.freeze({
          ...stateDiff,
          addedServices: Object.freeze([...stateDiff.addedServices]),
          removedServices: Object.freeze([...stateDiff.removedServices]),
          changedServices: Object.freeze([...stateDiff.changedServices]),
        })
      : null,
    currentSnapshot: currentSnapshot
      ? Object.freeze({ ...currentSnapshot })
      : null,
    isActive: true,
    snapshotCount: snapshots.length,
    isEmpty: false,
  });
}
