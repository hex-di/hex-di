/**
 * ComparisonPresenter - Pure presentation logic for snapshot comparison.
 *
 * Compares two container snapshots and computes service additions,
 * removals, and resolution count deltas.
 *
 * @packageDocumentation
 */

import type { ContainerSnapshot } from "@hex-di/devtools-core";
import type {
  ComparisonViewModel,
  SnapshotSummary,
  ServiceDiff,
} from "../view-models/index.js";
import { createEmptyComparisonViewModel } from "../view-models/comparison.vm.js";

// =============================================================================
// ComparisonPresenter
// =============================================================================

/**
 * Presenter for snapshot comparison visualization.
 *
 * Accepts two ContainerSnapshot instances and computes the differences
 * between them for visualization.
 */
export class ComparisonPresenter {
  private leftSnapshot: ContainerSnapshot | null = null;
  private rightSnapshot: ContainerSnapshot | null = null;
  private leftLabel = "Left";
  private rightLabel = "Right";

  /**
   * Set the snapshots to compare.
   *
   * @param left - The left (older/baseline) snapshot
   * @param right - The right (newer/current) snapshot
   * @param leftLabel - Optional label for left snapshot
   * @param rightLabel - Optional label for right snapshot
   */
  setSnapshots(
    left: ContainerSnapshot | null,
    right: ContainerSnapshot | null,
    leftLabel = "Left",
    rightLabel = "Right"
  ): void {
    this.leftSnapshot = left;
    this.rightSnapshot = right;
    this.leftLabel = leftLabel;
    this.rightLabel = rightLabel;
  }

  /**
   * Clear the comparison.
   */
  clear(): void {
    this.leftSnapshot = null;
    this.rightSnapshot = null;
  }

  /**
   * Get the current comparison view model.
   */
  getViewModel(): ComparisonViewModel {
    if (!this.leftSnapshot || !this.rightSnapshot) {
      return createEmptyComparisonViewModel();
    }

    const leftSummary = this.createSnapshotSummary(
      this.leftSnapshot,
      "left",
      this.leftLabel
    );
    const rightSummary = this.createSnapshotSummary(
      this.rightSnapshot,
      "right",
      this.rightLabel
    );

    // Get all services from both snapshots
    const leftServices = this.getServicesFromSnapshot(this.leftSnapshot);
    const rightServices = this.getServicesFromSnapshot(this.rightSnapshot);

    // Calculate additions and removals
    const addedServices = rightServices.filter(s => !leftServices.includes(s));
    const removedServices = leftServices.filter(s => !rightServices.includes(s));

    // Calculate changed services (in both but with differences)
    const commonServices = leftServices.filter(s => rightServices.includes(s));
    const changedServices = this.calculateChangedServices(
      commonServices,
      this.leftSnapshot,
      this.rightSnapshot
    );

    // Calculate resolution deltas
    const resolutionDeltas = new Map<string, number>();
    changedServices.forEach(diff => {
      if (diff.countDelta !== undefined && diff.countDelta !== 0) {
        resolutionDeltas.set(diff.portName, diff.countDelta);
      }
    });

    const hasChanges =
      addedServices.length > 0 ||
      removedServices.length > 0 ||
      changedServices.length > 0;

    const isEmpty =
      leftSummary.serviceCount === 0 && rightSummary.serviceCount === 0;

    return Object.freeze({
      leftSnapshot: leftSummary,
      rightSnapshot: rightSummary,
      addedServices: Object.freeze(addedServices),
      removedServices: Object.freeze(removedServices),
      changedServices: Object.freeze(changedServices),
      resolutionDeltas,
      isActive: true,
      hasData: true,
      isEmpty,
      hasChanges,
    });
  }

  /**
   * Create a summary of a snapshot.
   */
  private createSnapshotSummary(
    snapshot: ContainerSnapshot,
    id: string,
    label: string
  ): SnapshotSummary {
    const services = this.getServicesFromSnapshot(snapshot);

    return Object.freeze({
      id,
      label,
      timestamp: Date.now(), // Could be enhanced to track actual capture time
      serviceCount: services.length,
      singletonCount: snapshot.singletons.length,
      scopedCount: snapshot.scopes.reduce(
        (sum, s) => sum + s.resolvedPorts.length,
        0
      ),
      transientCount: 0, // Transients aren't tracked in snapshot
    });
  }

  /**
   * Get all unique service names from a snapshot.
   */
  private getServicesFromSnapshot(snapshot: ContainerSnapshot): string[] {
    const services = new Set<string>();

    // Add singletons
    snapshot.singletons.forEach(s => services.add(s.portName));

    // Add scoped services
    snapshot.scopes.forEach(scope => {
      scope.resolvedPorts.forEach(port => services.add(port));
    });

    return Array.from(services);
  }

  /**
   * Calculate changes for services present in both snapshots.
   */
  private calculateChangedServices(
    commonServices: string[],
    left: ContainerSnapshot,
    right: ContainerSnapshot
  ): ServiceDiff[] {
    const diffs: ServiceDiff[] = [];

    commonServices.forEach(portName => {
      const leftSingleton = left.singletons.find(s => s.portName === portName);
      const rightSingleton = right.singletons.find(s => s.portName === portName);

      // Count occurrences in scopes
      const leftScopeCount = left.scopes.filter(s =>
        s.resolvedPorts.includes(portName)
      ).length;
      const rightScopeCount = right.scopes.filter(s =>
        s.resolvedPorts.includes(portName)
      ).length;

      const leftCount = (leftSingleton ? 1 : 0) + leftScopeCount;
      const rightCount = (rightSingleton ? 1 : 0) + rightScopeCount;
      const countDelta = rightCount - leftCount;

      if (countDelta !== 0) {
        const changeType = countDelta > 0 ? "regressed" : "improved";

        diffs.push(
          Object.freeze({
            portName,
            changeType,
            leftValue: leftCount,
            rightValue: rightCount,
            leftCount,
            rightCount,
            countDelta,
            leftTimingMs: leftSingleton?.resolvedAt ?? null,
            rightTimingMs: rightSingleton?.resolvedAt ?? null,
            timingDeltaMs:
              leftSingleton && rightSingleton
                ? rightSingleton.resolvedAt - leftSingleton.resolvedAt
                : null,
          })
        );
      }
    });

    return diffs;
  }
}
