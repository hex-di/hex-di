/**
 * useSnapshotCapture - Hook for automatic snapshot capture on resolution.
 *
 * This hook automatically captures snapshots when new trace entries are recorded,
 * enabling time-travel debugging. It integrates with the TimeTravelPresenter
 * to manage snapshot history.
 *
 * @packageDocumentation
 */

import { useEffect, useRef, useCallback } from "react";
import type { PresenterDataSourceContract } from "@hex-di/devtools-core";
import { TimeTravelPresenter } from "../presenters/time-travel.presenter.js";

/**
 * Options for snapshot capture behavior.
 */
export interface SnapshotCaptureOptions {
  /**
   * Whether auto-capture is enabled.
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * Interval in milliseconds between auto-captures.
   * Set to 0 to capture on every resolution.
   * @default 1000
   */
  readonly captureIntervalMs?: number;

  /**
   * Maximum number of snapshots to retain.
   * @default 100
   */
  readonly maxSnapshots?: number;

  /**
   * Custom snapshot label generator.
   */
  readonly labelGenerator?: (index: number, timestamp: number) => string;
}

/**
 * Return type of useSnapshotCapture hook.
 */
export interface SnapshotCaptureResult {
  /** The time-travel presenter instance */
  readonly presenter: TimeTravelPresenter;
  /** Manually trigger a snapshot capture with optional label */
  readonly captureSnapshot: (label?: string) => void;
  /** Clear all captured snapshots */
  readonly clearSnapshots: () => void;
  /** Whether auto-capture is currently enabled */
  readonly isEnabled: boolean;
}

/**
 * Hook for automatic snapshot capture on resolution.
 *
 * Automatically captures container snapshots at regular intervals or on
 * every resolution, enabling time-travel debugging through the DevTools.
 *
 * @param dataSource - Data source for accessing container state
 * @param options - Configuration options for snapshot capture
 * @returns Snapshot capture controls and presenter
 *
 * @example
 * ```tsx
 * function DevToolsWithTimeTravel() {
 *   const dataSource = useDataSource();
 *   const { presenter, captureSnapshot } = useSnapshotCapture(dataSource, {
 *     captureIntervalMs: 2000, // Capture every 2 seconds
 *     maxSnapshots: 50,
 *   });
 *
 *   const viewModel = presenter.getViewModel();
 *
 *   return (
 *     <div>
 *       <button onClick={() => captureSnapshot('Manual Snapshot')}>
 *         Capture Now
 *       </button>
 *       <TimelineScrubber
 *         snapshots={viewModel.snapshots}
 *         currentIndex={viewModel.currentIndex}
 *         onNavigate={(index) => presenter.jumpTo(index)}
 *         onCapture={() => captureSnapshot()}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useSnapshotCapture(
  dataSource: PresenterDataSourceContract,
  options: SnapshotCaptureOptions = {}
): SnapshotCaptureResult {
  const { enabled = true, captureIntervalMs = 1000, maxSnapshots = 100, labelGenerator } = options;

  // Create presenter instance (stable across renders)
  const presenterRef = useRef<TimeTravelPresenter | null>(null);
  if (presenterRef.current === null) {
    presenterRef.current = new TimeTravelPresenter();
    presenterRef.current.setMaxSnapshots(maxSnapshots);
  }

  const presenter = presenterRef.current;

  // Track last capture time for interval-based capture
  const lastCaptureTimeRef = useRef<number>(0);

  // Track snapshot count for label generation
  const snapshotCountRef = useRef<number>(0);

  /**
   * Generate a default label for a snapshot.
   */
  const generateLabel = useCallback(
    (timestamp: number): string => {
      const index = ++snapshotCountRef.current;
      if (labelGenerator) {
        return labelGenerator(index, timestamp);
      }
      const date = new Date(timestamp);
      const time = date.toLocaleTimeString();
      return `Snapshot ${index} (${time})`;
    },
    [labelGenerator]
  );

  /**
   * Capture a snapshot from the data source.
   */
  const captureSnapshot = useCallback(
    (label?: string): void => {
      // Get the current container snapshot
      const snapshot = dataSource.getContainerSnapshot();

      if (snapshot !== null) {
        const timestamp = Date.now();
        const finalLabel = label ?? generateLabel(timestamp);
        presenter.captureSnapshot(snapshot, finalLabel);
        lastCaptureTimeRef.current = timestamp;
      }
    },
    [dataSource, presenter, generateLabel]
  );

  /**
   * Clear all snapshots.
   */
  const clearSnapshots = useCallback((): void => {
    presenter.clear();
    snapshotCountRef.current = 0;
    lastCaptureTimeRef.current = 0;
  }, [presenter]);

  /**
   * Check if enough time has passed for interval-based capture.
   */
  const shouldCaptureByInterval = useCallback((): boolean => {
    if (captureIntervalMs === 0) {
      return true; // Always capture if interval is 0
    }
    const now = Date.now();
    return now - lastCaptureTimeRef.current >= captureIntervalMs;
  }, [captureIntervalMs]);

  // Subscribe to data source changes for auto-capture
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Subscribe to changes
    const unsubscribe = dataSource.subscribe(() => {
      // Check if we should capture based on interval
      if (shouldCaptureByInterval()) {
        captureSnapshot();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, dataSource, captureSnapshot, shouldCaptureByInterval]);

  // Update max snapshots when option changes
  useEffect(() => {
    presenter.setMaxSnapshots(maxSnapshots);
  }, [presenter, maxSnapshots]);

  return {
    presenter,
    captureSnapshot,
    clearSnapshots,
    isEnabled: enabled,
  };
}
