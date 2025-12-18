/**
 * Advanced Features Tests - Time-Travel and Comparison
 *
 * Tests for advanced devtools features:
 * - Snapshot capture on resolution
 * - Timeline scrubber navigation
 * - State diff calculation
 * - Snapshot comparison selection
 * - Side-by-side diff display
 * - Delta compression efficiency
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { ContainerSnapshot } from "@hex-di/devtools-core";
import { TimeTravelPresenter } from "../src/presenters/time-travel.presenter.js";
import { ComparisonPresenter } from "../src/presenters/comparison.presenter.js";
import { devToolsReducer } from "../src/state/reducer.js";
import { initialState } from "../src/state/devtools.state.js";
import { actions } from "../src/state/actions.js";
import type { SnapshotSummary } from "../src/state/devtools.state.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestSnapshot(
  singletonCount: number,
  scopeCount: number,
  phase: "initializing" | "ready" | "disposing" | "disposed" = "ready"
): ContainerSnapshot {
  const singletons = Array.from({ length: singletonCount }, (_, i) => ({
    portName: `Service${i + 1}`,
    resolvedAt: 10 + i * 5,
  }));

  const scopes = Array.from({ length: scopeCount }, (_, i) => ({
    id: `scope-${i + 1}`,
    parentId: null,
    childIds: [],
    resolvedPorts: [`ScopedService${i + 1}`],
    createdAt: Date.now() - (scopeCount - i) * 1000,
    isActive: true,
  }));

  return {
    singletons,
    scopes,
    phase,
  };
}

function createTestSnapshotSummary(
  id: string,
  label: string,
  serviceCount: number
): SnapshotSummary {
  return {
    id,
    label,
    timestamp: Date.now(),
    state: createTestSnapshot(serviceCount, 0),
  };
}

// =============================================================================
// Test 1: Snapshot Capture on Resolution
// =============================================================================

describe("Advanced Features - Snapshot Capture", () => {
  it("should capture snapshot on resolution with full state", () => {
    const presenter = new TimeTravelPresenter();
    const snapshot = createTestSnapshot(3, 2);

    // Capture a snapshot
    presenter.captureSnapshot(snapshot, "Initial State");

    const viewModel = presenter.getViewModel();

    // Verify snapshot was captured
    expect(viewModel.snapshots).toHaveLength(1);
    expect(viewModel.currentIndex).toBe(0);
    expect(viewModel.isActive).toBe(true);
    expect(viewModel.isEmpty).toBe(false);

    // Verify snapshot summary
    const capturedSnapshot = viewModel.snapshots[0];
    expect(capturedSnapshot).toBeDefined();
    expect(capturedSnapshot?.label).toBe("Initial State");
    expect(capturedSnapshot?.singletonCount).toBe(3);
    expect(capturedSnapshot?.scopedCount).toBe(2);
  });

  it("should auto-capture with incremental labels", () => {
    const presenter = new TimeTravelPresenter();

    // Capture multiple snapshots without labels
    presenter.captureSnapshot(createTestSnapshot(1, 0));
    presenter.captureSnapshot(createTestSnapshot(2, 0));
    presenter.captureSnapshot(createTestSnapshot(3, 0));

    const viewModel = presenter.getViewModel();

    expect(viewModel.snapshots).toHaveLength(3);
    expect(viewModel.snapshots[0]?.label).toBe("Snapshot 1");
    expect(viewModel.snapshots[1]?.label).toBe("Snapshot 2");
    expect(viewModel.snapshots[2]?.label).toBe("Snapshot 3");
  });
});

// =============================================================================
// Test 2: Timeline Scrubber Navigation
// =============================================================================

describe("Advanced Features - Timeline Scrubber Navigation", () => {
  let presenter: TimeTravelPresenter;

  beforeEach(() => {
    presenter = new TimeTravelPresenter();
    // Capture 5 snapshots
    for (let i = 0; i < 5; i++) {
      presenter.captureSnapshot(createTestSnapshot(i + 1, 0), `State ${i + 1}`);
    }
  });

  it("should navigate backward through timeline", () => {
    const vm1 = presenter.getViewModel();
    expect(vm1.currentIndex).toBe(4); // At latest
    expect(vm1.canGoBack).toBe(true);
    expect(vm1.canGoForward).toBe(false);

    // Navigate back
    presenter.goBack();
    const vm2 = presenter.getViewModel();
    expect(vm2.currentIndex).toBe(3);
    expect(vm2.canGoBack).toBe(true);
    expect(vm2.canGoForward).toBe(true);

    // Navigate back again
    presenter.goBack();
    const vm3 = presenter.getViewModel();
    expect(vm3.currentIndex).toBe(2);
  });

  it("should navigate forward through timeline", () => {
    // Go back to beginning
    presenter.jumpTo(0);

    const vm1 = presenter.getViewModel();
    expect(vm1.currentIndex).toBe(0);
    expect(vm1.canGoBack).toBe(false);
    expect(vm1.canGoForward).toBe(true);

    // Navigate forward
    presenter.goForward();
    const vm2 = presenter.getViewModel();
    expect(vm2.currentIndex).toBe(1);
    expect(vm2.canGoBack).toBe(true);
    expect(vm2.canGoForward).toBe(true);
  });

  it("should jump to specific index in timeline", () => {
    presenter.jumpTo(2);

    const vm = presenter.getViewModel();
    expect(vm.currentIndex).toBe(2);
    expect(vm.currentSnapshot?.label).toBe("State 3");
  });

  it("should handle navigation with state management", () => {
    let state = initialState;

    // Capture 3 snapshots via actions
    const snapshot1 = createTestSnapshotSummary("s1", "Snapshot 1", 1);
    const snapshot2 = createTestSnapshotSummary("s2", "Snapshot 2", 2);
    const snapshot3 = createTestSnapshotSummary("s3", "Snapshot 3", 3);

    state = devToolsReducer(state, actions.captureSnapshot(snapshot1));
    state = devToolsReducer(state, actions.captureSnapshot(snapshot2));
    state = devToolsReducer(state, actions.captureSnapshot(snapshot3));

    expect(state.timeTravel.currentIndex).toBe(2);

    // Navigate back
    state = devToolsReducer(state, actions.navigateSnapshot("prev"));
    expect(state.timeTravel.currentIndex).toBe(1);

    // Navigate forward
    state = devToolsReducer(state, actions.navigateSnapshot("next"));
    expect(state.timeTravel.currentIndex).toBe(2);

    // Set specific index
    state = devToolsReducer(state, actions.setSnapshotIndex(0));
    expect(state.timeTravel.currentIndex).toBe(0);
  });
});

// =============================================================================
// Test 3: State Diff Calculation
// =============================================================================

describe("Advanced Features - State Diff Calculation", () => {
  it("should calculate diff for added services", () => {
    const presenter = new TimeTravelPresenter();

    // Capture two snapshots with different service counts
    presenter.captureSnapshot(createTestSnapshot(2, 0), "Before");
    presenter.captureSnapshot(createTestSnapshot(4, 0), "After");

    const viewModel = presenter.getViewModel();

    // Check diff
    expect(viewModel.stateDiff).not.toBeNull();
    expect(viewModel.stateDiff?.addedServices).toHaveLength(2);
    expect(viewModel.stateDiff?.addedServices).toContain("Service3");
    expect(viewModel.stateDiff?.addedServices).toContain("Service4");
    expect(viewModel.stateDiff?.description).toContain("+2 services");
  });

  it("should calculate diff for removed services", () => {
    const presenter = new TimeTravelPresenter();

    presenter.captureSnapshot(createTestSnapshot(4, 0), "Before");
    presenter.captureSnapshot(createTestSnapshot(2, 0), "After");

    const viewModel = presenter.getViewModel();

    expect(viewModel.stateDiff).not.toBeNull();
    expect(viewModel.stateDiff?.removedServices).toHaveLength(2);
    expect(viewModel.stateDiff?.removedServices).toContain("Service3");
    expect(viewModel.stateDiff?.removedServices).toContain("Service4");
    expect(viewModel.stateDiff?.description).toContain("-2 services");
  });

  it("should detect changed services", () => {
    const presenter = new TimeTravelPresenter();

    // Create first snapshot
    const snapshot1 = createTestSnapshot(2, 0);
    presenter.captureSnapshot(snapshot1, "Before");

    // Create second snapshot with modified service (different resolvedAt)
    const snapshot2: ContainerSnapshot = {
      singletons: [
        { portName: "Service1", resolvedAt: 10 }, // Same
        { portName: "Service2", resolvedAt: 999 }, // Changed timing
      ],
      scopes: [],
      phase: "ready",
    };
    presenter.captureSnapshot(snapshot2, "After");

    const viewModel = presenter.getViewModel();

    expect(viewModel.stateDiff).not.toBeNull();
    expect(viewModel.stateDiff?.changedServices).toContain("Service2");
  });

  it("should track phase changes in diff", () => {
    const presenter = new TimeTravelPresenter();

    presenter.captureSnapshot(createTestSnapshot(2, 0, "initializing"), "Init");
    presenter.captureSnapshot(createTestSnapshot(2, 0, "ready"), "Ready");

    const viewModel = presenter.getViewModel();

    expect(viewModel.stateDiff?.description).toContain("phase:");
    expect(viewModel.stateDiff?.description).toContain("initializing -> ready");
  });
});

// =============================================================================
// Test 4: Snapshot Comparison Selection
// =============================================================================

describe("Advanced Features - Snapshot Comparison Selection", () => {
  it("should allow selecting left and right snapshots for comparison", () => {
    let state = initialState;

    // Enable comparison mode
    state = devToolsReducer(state, actions.toggleComparison());
    expect(state.comparison.isEnabled).toBe(true);

    // Set left snapshot
    state = devToolsReducer(state, actions.setComparisonLeft("snapshot-1"));
    expect(state.comparison.leftSnapshotId).toBe("snapshot-1");

    // Set right snapshot
    state = devToolsReducer(state, actions.setComparisonRight("snapshot-2"));
    expect(state.comparison.rightSnapshotId).toBe("snapshot-2");

    // Clear left
    state = devToolsReducer(state, actions.setComparisonLeft(null));
    expect(state.comparison.leftSnapshotId).toBeNull();
  });

  it("should toggle comparison mode", () => {
    let state = initialState;

    expect(state.comparison.isEnabled).toBe(false);

    state = devToolsReducer(state, actions.toggleComparison());
    expect(state.comparison.isEnabled).toBe(true);

    state = devToolsReducer(state, actions.toggleComparison());
    expect(state.comparison.isEnabled).toBe(false);
  });
});

// =============================================================================
// Test 5: Side-by-Side Diff Display
// =============================================================================

describe("Advanced Features - Side-by-Side Diff Display", () => {
  it("should compute comparison view model with additions and removals", () => {
    const presenter = new ComparisonPresenter();

    const leftSnapshot = createTestSnapshot(2, 1);
    const rightSnapshot = createTestSnapshot(4, 2);

    presenter.setSnapshots(leftSnapshot, rightSnapshot, "Baseline", "Current");

    const viewModel = presenter.getViewModel();

    expect(viewModel.isActive).toBe(true);
    expect(viewModel.hasData).toBe(true);
    expect(viewModel.isEmpty).toBe(false);

    // Check summaries
    expect(viewModel.leftSnapshot.label).toBe("Baseline");
    expect(viewModel.rightSnapshot.label).toBe("Current");
    expect(viewModel.leftSnapshot.singletonCount).toBe(2);
    expect(viewModel.rightSnapshot.singletonCount).toBe(4);

    // Check additions
    expect(viewModel.addedServices).toHaveLength(3); // 2 singletons + 1 scoped
    expect(viewModel.addedServices).toContain("Service3");
    expect(viewModel.addedServices).toContain("Service4");
    expect(viewModel.addedServices).toContain("ScopedService2");
  });

  it("should highlight changed services with resolution deltas", () => {
    const presenter = new ComparisonPresenter();

    // Create snapshots where services appear in different scopes
    const leftSnapshot: ContainerSnapshot = {
      singletons: [{ portName: "Logger", resolvedAt: 10 }],
      scopes: [],
      phase: "ready",
    };

    const rightSnapshot: ContainerSnapshot = {
      singletons: [{ portName: "Logger", resolvedAt: 10 }],
      scopes: [
        {
          id: "scope-1",
          parentId: null,
          childIds: [],
          resolvedPorts: ["Logger"], // Logger now also in scope
          createdAt: Date.now(),
          isActive: true,
        },
      ],
      phase: "ready",
    };

    presenter.setSnapshots(leftSnapshot, rightSnapshot);

    const viewModel = presenter.getViewModel();

    expect(viewModel.hasChanges).toBe(true);
    expect(viewModel.changedServices.length).toBeGreaterThan(0);

    const loggerDiff = viewModel.changedServices.find((d) => d.portName === "Logger");
    expect(loggerDiff).toBeDefined();
    expect(loggerDiff?.countDelta).toBe(1); // +1 resolution in scope
  });

  it("should return empty view model when no snapshots set", () => {
    const presenter = new ComparisonPresenter();

    const viewModel = presenter.getViewModel();

    expect(viewModel.isActive).toBe(false);
    expect(viewModel.hasData).toBe(false);
    expect(viewModel.isEmpty).toBe(true);
    expect(viewModel.hasChanges).toBe(false);
  });
});

// =============================================================================
// Test 6: Delta Compression Efficiency
// =============================================================================

describe("Advanced Features - Delta Compression Efficiency", () => {
  it("should enforce max snapshot limit with FIFO eviction", () => {
    const presenter = new TimeTravelPresenter();
    presenter.setMaxSnapshots(5);

    // Capture 10 snapshots
    for (let i = 0; i < 10; i++) {
      presenter.captureSnapshot(createTestSnapshot(i + 1, 0), `State ${i + 1}`);
    }

    const viewModel = presenter.getViewModel();

    // Should only keep last 5
    expect(viewModel.snapshots).toHaveLength(5);
    expect(viewModel.snapshots[0]?.label).toBe("State 6");
    expect(viewModel.snapshots[4]?.label).toBe("State 10");
  });

  it("should maintain current index after eviction", () => {
    const presenter = new TimeTravelPresenter();
    presenter.setMaxSnapshots(3);

    // Capture 5 snapshots
    for (let i = 0; i < 5; i++) {
      presenter.captureSnapshot(createTestSnapshot(i + 1, 0), `State ${i + 1}`);
    }

    const viewModel = presenter.getViewModel();

    // Should be at end of retained snapshots
    expect(viewModel.snapshots).toHaveLength(3);
    expect(viewModel.currentIndex).toBe(2);
    expect(viewModel.currentSnapshot?.label).toBe("State 5");
  });

  it("should truncate forward history when new snapshot captured", () => {
    const presenter = new TimeTravelPresenter();

    // Capture 5 snapshots
    for (let i = 0; i < 5; i++) {
      presenter.captureSnapshot(createTestSnapshot(i + 1, 0), `State ${i + 1}`);
    }

    // Navigate back to index 2
    presenter.jumpTo(2);

    let vm = presenter.getViewModel();
    expect(vm.currentIndex).toBe(2);
    expect(vm.snapshots).toHaveLength(5);

    // Capture new snapshot - should truncate snapshots after index 2
    presenter.captureSnapshot(createTestSnapshot(10, 0), "Branch State");

    vm = presenter.getViewModel();
    expect(vm.snapshots).toHaveLength(4); // States 1, 2, 3, Branch State
    expect(vm.currentIndex).toBe(3);
    expect(vm.currentSnapshot?.label).toBe("Branch State");
  });

  it("should clear all snapshots", () => {
    const presenter = new TimeTravelPresenter();

    // Capture some snapshots
    presenter.captureSnapshot(createTestSnapshot(2, 0));
    presenter.captureSnapshot(createTestSnapshot(3, 0));

    expect(presenter.getViewModel().snapshots).toHaveLength(2);

    // Clear
    presenter.clear();

    const vm = presenter.getViewModel();
    expect(vm.snapshots).toHaveLength(0);
    expect(vm.currentIndex).toBe(-1);
    expect(vm.isEmpty).toBe(true);
    expect(vm.isActive).toBe(false);
  });

  it("should retrieve full snapshot data via getCurrentSnapshot", () => {
    const presenter = new TimeTravelPresenter();

    const originalSnapshot = createTestSnapshot(3, 2);
    presenter.captureSnapshot(originalSnapshot, "Test");

    const retrieved = presenter.getCurrentSnapshot();

    expect(retrieved).not.toBeNull();
    expect(retrieved?.singletons).toHaveLength(3);
    expect(retrieved?.scopes).toHaveLength(2);
    expect(retrieved?.phase).toBe("ready");
  });
});
