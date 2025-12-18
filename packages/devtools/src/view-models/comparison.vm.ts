/**
 * ComparisonViewModel - Immutable view data for snapshot comparison.
 *
 * Contains diff calculation results between two container snapshots,
 * including service additions, removals, and changes.
 *
 * @packageDocumentation
 */

// =============================================================================
// Snapshot Summary Types
// =============================================================================

/**
 * Summary of a container snapshot for comparison.
 */
export interface SnapshotSummary {
  /** Snapshot identifier */
  readonly id: string;
  /** Label for display */
  readonly label: string;
  /** Timestamp when snapshot was captured */
  readonly timestamp: number;
  /** Total number of services */
  readonly serviceCount: number;
  /** Number of singleton services */
  readonly singletonCount: number;
  /** Number of scoped services */
  readonly scopedCount: number;
  /** Number of transient services */
  readonly transientCount: number;
}

// =============================================================================
// Service Diff Types
// =============================================================================

/**
 * Type of change for a service diff.
 */
export type ServiceChangeType =
  | "resolution_count"
  | "timing"
  | "lifetime"
  | "improved"
  | "regressed"
  | "unchanged";

/**
 * Difference for a single service between snapshots.
 */
export interface ServiceDiff {
  /** Port name of the service */
  readonly portName: string;
  /** Type of change detected */
  readonly changeType: ServiceChangeType;
  /** Value in left snapshot */
  readonly leftValue: number | string;
  /** Value in right snapshot */
  readonly rightValue: number | string;
  /** Resolution count in left snapshot */
  readonly leftCount?: number;
  /** Resolution count in right snapshot */
  readonly rightCount?: number;
  /** Change in resolution count */
  readonly countDelta?: number;
  /** Timing in left snapshot (avg ms) */
  readonly leftTimingMs?: number | null;
  /** Timing in right snapshot (avg ms) */
  readonly rightTimingMs?: number | null;
  /** Change in timing (ms) */
  readonly timingDeltaMs?: number | null;
}

// =============================================================================
// Comparison View Model
// =============================================================================

/**
 * Complete view model for snapshot comparison.
 */
export interface ComparisonViewModel {
  /** Left snapshot summary */
  readonly leftSnapshot: SnapshotSummary;
  /** Right snapshot summary */
  readonly rightSnapshot: SnapshotSummary;
  /** Services added in right snapshot */
  readonly addedServices: readonly string[];
  /** Services removed in right snapshot */
  readonly removedServices: readonly string[];
  /** Services with changes */
  readonly changedServices: readonly ServiceDiff[];
  /** Resolution count deltas by service */
  readonly resolutionDeltas: ReadonlyMap<string, number>;
  /** Whether comparison is active */
  readonly isActive: boolean;
  /** Whether the comparison has data (non-empty snapshots) */
  readonly hasData: boolean;
  /** Whether the comparison is empty (no snapshots selected) */
  readonly isEmpty: boolean;
  /** Whether there are any changes between snapshots */
  readonly hasChanges: boolean;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates an empty snapshot summary.
 */
function createEmptySnapshotSummary(): SnapshotSummary {
  return Object.freeze({
    id: "",
    label: "",
    timestamp: 0,
    serviceCount: 0,
    singletonCount: 0,
    scopedCount: 0,
    transientCount: 0,
  });
}

/**
 * Creates an empty ComparisonViewModel.
 */
export function createEmptyComparisonViewModel(): ComparisonViewModel {
  return Object.freeze({
    leftSnapshot: createEmptySnapshotSummary(),
    rightSnapshot: createEmptySnapshotSummary(),
    addedServices: Object.freeze([]),
    removedServices: Object.freeze([]),
    changedServices: Object.freeze([]),
    resolutionDeltas: new Map(),
    isActive: false,
    hasData: false,
    isEmpty: true,
    hasChanges: false,
  });
}

// =============================================================================
// Factory Input Types
// =============================================================================

/**
 * Input for creating a ComparisonViewModel.
 */
export interface ComparisonViewModelInput {
  /** Left snapshot summary */
  readonly leftSnapshot: SnapshotSummary;
  /** Right snapshot summary */
  readonly rightSnapshot: SnapshotSummary;
  /** Services added in right snapshot */
  readonly addedServices: readonly string[];
  /** Services removed in right snapshot */
  readonly removedServices: readonly string[];
  /** Services with changes */
  readonly changedServices: readonly ServiceDiff[];
  /** Resolution count deltas by service */
  readonly resolutionDeltas: ReadonlyMap<string, number>;
}

/**
 * Creates a ComparisonViewModel from input data.
 *
 * @param input - The input data for creating the view model
 * @returns An immutable ComparisonViewModel
 */
export function createComparisonViewModel(
  input: ComparisonViewModelInput
): ComparisonViewModel {
  const {
    leftSnapshot,
    rightSnapshot,
    addedServices,
    removedServices,
    changedServices,
    resolutionDeltas,
  } = input;

  const hasChanges =
    addedServices.length > 0 ||
    removedServices.length > 0 ||
    changedServices.length > 0;

  const isEmpty =
    leftSnapshot.serviceCount === 0 && rightSnapshot.serviceCount === 0;

  return Object.freeze({
    leftSnapshot: Object.freeze({ ...leftSnapshot }),
    rightSnapshot: Object.freeze({ ...rightSnapshot }),
    addedServices: Object.freeze([...addedServices]),
    removedServices: Object.freeze([...removedServices]),
    changedServices: Object.freeze(
      changedServices.map((diff) => Object.freeze({ ...diff }))
    ),
    resolutionDeltas,
    isActive: true,
    hasData: !isEmpty,
    isEmpty,
    hasChanges,
  });
}
