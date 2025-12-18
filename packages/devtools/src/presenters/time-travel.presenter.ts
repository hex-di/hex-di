/**
 * TimeTravelPresenter - Pure presentation logic for time-travel debugging.
 *
 * Manages snapshot history and provides navigation through container state history.
 * Computes state diffs between snapshots with efficient delta compression.
 *
 * @packageDocumentation
 */

import type { ContainerSnapshot } from "@hex-di/devtools-core";
import type {
  TimeTravelViewModel,
  SnapshotSummary,
  StateDiff,
} from "../view-models/index.js";
import { createEmptyTimeTravelViewModel } from "../view-models/time-travel.vm.js";

// =============================================================================
// Internal Types
// =============================================================================

interface StoredSnapshot {
  readonly snapshot: ContainerSnapshot;
  readonly summary: SnapshotSummary;
  readonly services: readonly string[];
}

// =============================================================================
// TimeTravelPresenter
// =============================================================================

/**
 * Presenter for time-travel debugging.
 *
 * Manages a history of container snapshots and provides navigation
 * with efficient diff computation.
 */
export class TimeTravelPresenter {
  private snapshots: StoredSnapshot[] = [];
  private currentIndex = -1;
  private maxSnapshots = 100;

  /**
   * Capture a new snapshot.
   *
   * @param snapshot - The container snapshot to capture
   * @param label - Optional label for the snapshot
   */
  captureSnapshot(snapshot: ContainerSnapshot, label?: string): void {
    const services = this.extractServices(snapshot);
    const summary = this.createSummary(
      snapshot,
      `snapshot-${this.snapshots.length}`,
      label ?? `Snapshot ${this.snapshots.length + 1}`
    );

    const stored: StoredSnapshot = {
      snapshot,
      summary,
      services,
    };

    // If we're not at the end, truncate forward history
    if (this.currentIndex < this.snapshots.length - 1) {
      this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
    }

    // Add new snapshot
    this.snapshots.push(stored);
    this.currentIndex = this.snapshots.length - 1;

    // Enforce max snapshots (remove oldest)
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(1);
      this.currentIndex = Math.max(0, this.currentIndex - 1);
    }
  }

  /**
   * Navigate to previous snapshot.
   */
  goBack(): void {
    if (this.canGoBack()) {
      this.currentIndex--;
    }
  }

  /**
   * Navigate to next snapshot.
   */
  goForward(): void {
    if (this.canGoForward()) {
      this.currentIndex++;
    }
  }

  /**
   * Jump to a specific snapshot index.
   */
  jumpTo(index: number): void {
    if (index >= 0 && index < this.snapshots.length) {
      this.currentIndex = index;
    }
  }

  /**
   * Check if back navigation is possible.
   */
  canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if forward navigation is possible.
   */
  canGoForward(): boolean {
    return this.currentIndex < this.snapshots.length - 1;
  }

  /**
   * Clear all snapshots.
   */
  clear(): void {
    this.snapshots = [];
    this.currentIndex = -1;
  }

  /**
   * Set maximum number of snapshots to retain.
   */
  setMaxSnapshots(max: number): void {
    this.maxSnapshots = Math.max(1, max);
    // Trim if needed
    while (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
      this.currentIndex = Math.max(0, this.currentIndex - 1);
    }
  }

  /**
   * Get the current time-travel view model.
   */
  getViewModel(): TimeTravelViewModel {
    if (this.snapshots.length === 0) {
      return createEmptyTimeTravelViewModel();
    }

    const summaries = this.snapshots.map(s => s.summary);
    const currentSnapshot =
      this.currentIndex >= 0 ? this.snapshots[this.currentIndex]?.summary ?? null : null;

    // Compute diff from previous snapshot if available
    const stateDiff =
      this.currentIndex > 0
        ? this.computeDiff(
            this.snapshots[this.currentIndex - 1],
            this.snapshots[this.currentIndex]
          )
        : null;

    return Object.freeze({
      snapshots: Object.freeze(summaries),
      currentIndex: this.currentIndex,
      canGoBack: this.canGoBack(),
      canGoForward: this.canGoForward(),
      stateDiff,
      currentSnapshot,
      isActive: this.snapshots.length > 0,
      snapshotCount: this.snapshots.length,
      isEmpty: this.snapshots.length === 0,
    });
  }

  /**
   * Get the current snapshot data (full snapshot, not just summary).
   */
  getCurrentSnapshot(): ContainerSnapshot | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.snapshots.length) {
      return null;
    }
    return this.snapshots[this.currentIndex]?.snapshot ?? null;
  }

  /**
   * Extract services from a snapshot.
   */
  private extractServices(snapshot: ContainerSnapshot): readonly string[] {
    const services = new Set<string>();
    snapshot.singletons.forEach(s => services.add(s.portName));
    snapshot.scopes.forEach(scope => {
      scope.resolvedPorts.forEach(port => services.add(port));
    });
    return Object.freeze(Array.from(services));
  }

  /**
   * Create a snapshot summary.
   */
  private createSummary(
    snapshot: ContainerSnapshot,
    id: string,
    label: string
  ): SnapshotSummary {
    const services = this.extractServices(snapshot);

    return Object.freeze({
      id,
      label,
      timestamp: Date.now(),
      serviceCount: services.length,
      singletonCount: snapshot.singletons.length,
      scopedCount: snapshot.scopes.reduce(
        (sum, s) => sum + s.resolvedPorts.length,
        0
      ),
      transientCount: 0,
    });
  }

  /**
   * Compute diff between two stored snapshots.
   */
  private computeDiff(
    prev: StoredSnapshot | undefined,
    curr: StoredSnapshot | undefined
  ): StateDiff | null {
    if (!prev || !curr) return null;

    const prevServices = new Set(prev.services);
    const currServices = new Set(curr.services);

    const addedServices = curr.services.filter(s => !prevServices.has(s));
    const removedServices = prev.services.filter(s => !currServices.has(s));

    // Detect changed services (services that exist in both but might have different properties)
    const commonServices = prev.services.filter(s => currServices.has(s));
    const changedServices: string[] = [];

    // Check for changes in singleton resolution times
    commonServices.forEach(portName => {
      const prevSingleton = prev.snapshot.singletons.find(
        s => s.portName === portName
      );
      const currSingleton = curr.snapshot.singletons.find(
        s => s.portName === portName
      );

      if (prevSingleton && currSingleton) {
        if (prevSingleton.resolvedAt !== currSingleton.resolvedAt) {
          changedServices.push(portName);
        }
      }
    });

    // Generate description
    const parts: string[] = [];
    if (addedServices.length > 0) {
      parts.push(`+${addedServices.length} services`);
    }
    if (removedServices.length > 0) {
      parts.push(`-${removedServices.length} services`);
    }
    if (changedServices.length > 0) {
      parts.push(`~${changedServices.length} changed`);
    }
    if (prev.snapshot.phase !== curr.snapshot.phase) {
      parts.push(`phase: ${prev.snapshot.phase} -> ${curr.snapshot.phase}`);
    }

    const description = parts.length > 0 ? parts.join(", ") : "No changes";

    return Object.freeze({
      addedServices: Object.freeze(addedServices),
      removedServices: Object.freeze(removedServices),
      changedServices: Object.freeze(changedServices),
      description,
    });
  }
}
