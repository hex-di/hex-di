/**
 * State Extensions Tests - Task Group 1.1
 *
 * Tests for new state slices: time-travel, comparison, container hierarchy, and sync.
 * Uses TDD approach - tests written before implementation.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";

import {
  devToolsReducer,
  initialState,
  actions,
  selectCurrentSnapshot,
  selectSnapshotHistory,
  selectComparisonDiff,
  selectActiveContainer,
  selectContainerHierarchy,
  selectSyncStatus,
} from "../../src/state/index.js";

import type { DevToolsState } from "../../src/state/index.js";

// =============================================================================
// Test 1: Time-travel snapshot capture action
// =============================================================================

describe("time-travel snapshot capture action", () => {
  it("captures snapshot and adds to history", () => {
    const snapshot = {
      id: "snapshot-1",
      timestamp: Date.now(),
      label: "Initial state",
      state: {
        singletons: [{ portName: "Logger", resolvedAt: 1000 }],
        scopes: [],
        phase: "ready" as const,
      },
    };

    const state = devToolsReducer(initialState, actions.captureSnapshot(snapshot));

    expect(state.timeTravel.snapshots).toHaveLength(1);
    expect(state.timeTravel.snapshots[0]).toEqual(snapshot);
    expect(state.timeTravel.currentIndex).toBe(0);
  });

  it("appends new snapshots and updates current index", () => {
    const snapshot1 = {
      id: "snapshot-1",
      timestamp: Date.now(),
      label: "First",
      state: { singletons: [], scopes: [], phase: "ready" as const },
    };
    const snapshot2 = {
      id: "snapshot-2",
      timestamp: Date.now() + 100,
      label: "Second",
      state: { singletons: [], scopes: [], phase: "ready" as const },
    };

    let state = devToolsReducer(initialState, actions.captureSnapshot(snapshot1));
    state = devToolsReducer(state, actions.captureSnapshot(snapshot2));

    expect(state.timeTravel.snapshots).toHaveLength(2);
    expect(state.timeTravel.currentIndex).toBe(1);
  });
});

// =============================================================================
// Test 2: Snapshot navigation (prev/next)
// =============================================================================

describe("snapshot navigation (prev/next)", () => {
  const createStateWithSnapshots = (): DevToolsState => {
    const snapshots = [
      { id: "s1", timestamp: 1000, label: "First", state: { singletons: [], scopes: [], phase: "ready" as const } },
      { id: "s2", timestamp: 2000, label: "Second", state: { singletons: [], scopes: [], phase: "ready" as const } },
      { id: "s3", timestamp: 3000, label: "Third", state: { singletons: [], scopes: [], phase: "ready" as const } },
    ];

    let state = initialState;
    for (const snapshot of snapshots) {
      state = devToolsReducer(state, actions.captureSnapshot(snapshot));
    }
    return state;
  };

  it("navigates to previous snapshot", () => {
    const state = createStateWithSnapshots();
    expect(state.timeTravel.currentIndex).toBe(2);

    const newState = devToolsReducer(state, actions.navigateSnapshot("prev"));
    expect(newState.timeTravel.currentIndex).toBe(1);
  });

  it("navigates to next snapshot", () => {
    let state = createStateWithSnapshots();
    state = devToolsReducer(state, actions.navigateSnapshot("prev"));
    state = devToolsReducer(state, actions.navigateSnapshot("prev"));
    expect(state.timeTravel.currentIndex).toBe(0);

    const newState = devToolsReducer(state, actions.navigateSnapshot("next"));
    expect(newState.timeTravel.currentIndex).toBe(1);
  });

  it("does not navigate below 0", () => {
    let state = createStateWithSnapshots();
    // Navigate to first
    state = devToolsReducer(state, actions.setSnapshotIndex(0));
    expect(state.timeTravel.currentIndex).toBe(0);

    // Try to go prev
    const newState = devToolsReducer(state, actions.navigateSnapshot("prev"));
    expect(newState.timeTravel.currentIndex).toBe(0);
  });

  it("does not navigate beyond last snapshot", () => {
    const state = createStateWithSnapshots();
    expect(state.timeTravel.currentIndex).toBe(2);

    const newState = devToolsReducer(state, actions.navigateSnapshot("next"));
    expect(newState.timeTravel.currentIndex).toBe(2);
  });

  it("sets snapshot index directly", () => {
    const state = createStateWithSnapshots();

    const newState = devToolsReducer(state, actions.setSnapshotIndex(1));
    expect(newState.timeTravel.currentIndex).toBe(1);
  });
});

// =============================================================================
// Test 3: Comparison state updates
// =============================================================================

describe("comparison state updates", () => {
  it("sets comparison left snapshot", () => {
    const state = devToolsReducer(initialState, actions.setComparisonLeft("snapshot-1"));

    expect(state.comparison.leftSnapshotId).toBe("snapshot-1");
  });

  it("sets comparison right snapshot", () => {
    const state = devToolsReducer(initialState, actions.setComparisonRight("snapshot-2"));

    expect(state.comparison.rightSnapshotId).toBe("snapshot-2");
  });

  it("toggles comparison mode", () => {
    expect(initialState.comparison.isEnabled).toBe(false);

    let state = devToolsReducer(initialState, actions.toggleComparison());
    expect(state.comparison.isEnabled).toBe(true);

    state = devToolsReducer(state, actions.toggleComparison());
    expect(state.comparison.isEnabled).toBe(false);
  });

  it("enables comparison with both snapshots set", () => {
    let state = devToolsReducer(initialState, actions.setComparisonLeft("snapshot-1"));
    state = devToolsReducer(state, actions.setComparisonRight("snapshot-2"));
    state = devToolsReducer(state, actions.toggleComparison());

    expect(state.comparison.isEnabled).toBe(true);
    expect(state.comparison.leftSnapshotId).toBe("snapshot-1");
    expect(state.comparison.rightSnapshotId).toBe("snapshot-2");
  });
});

// =============================================================================
// Test 4: Container hierarchy state
// =============================================================================

describe("container hierarchy state", () => {
  it("sets active container", () => {
    const state = devToolsReducer(initialState, actions.setActiveContainer("child-container-1"));

    expect(state.containers.activeContainerId).toBe("child-container-1");
  });

  it("updates container hierarchy", () => {
    const hierarchy = {
      rootId: "root",
      containers: {
        root: {
          id: "root",
          name: "Root Container",
          parentId: null,
          childIds: ["child-1", "child-2"],
          phase: "ready" as const,
        },
        "child-1": {
          id: "child-1",
          name: "Child Container 1",
          parentId: "root",
          childIds: [],
          phase: "ready" as const,
        },
        "child-2": {
          id: "child-2",
          name: "Child Container 2",
          parentId: "root",
          childIds: [],
          phase: "initializing" as const,
        },
      },
    };

    const state = devToolsReducer(initialState, actions.updateContainerHierarchy(hierarchy));

    expect(state.containers.hierarchy).toEqual(hierarchy);
    expect(state.containers.hierarchy?.rootId).toBe("root");
    expect(Object.keys(state.containers.hierarchy?.containers ?? {})).toHaveLength(3);
  });

  it("preserves active container when updating hierarchy", () => {
    let state = devToolsReducer(initialState, actions.setActiveContainer("child-1"));

    const hierarchy = {
      rootId: "root",
      containers: {
        root: { id: "root", name: "Root", parentId: null, childIds: ["child-1"], phase: "ready" as const },
        "child-1": { id: "child-1", name: "Child 1", parentId: "root", childIds: [], phase: "ready" as const },
      },
    };

    state = devToolsReducer(state, actions.updateContainerHierarchy(hierarchy));

    expect(state.containers.activeContainerId).toBe("child-1");
    expect(state.containers.hierarchy).toEqual(hierarchy);
  });
});

// =============================================================================
// Test 5: Filter persistence actions
// =============================================================================

describe("filter persistence actions", () => {
  it("persists graph filter text in state", () => {
    // Using existing SET_INSPECTOR_FILTER for graph filter persistence
    const state = devToolsReducer(initialState, actions.setTimelineFilter("Logger"));

    expect(state.timeline.filterText).toBe("Logger");
  });

  it("persists inspector filter text in state", () => {
    const state = devToolsReducer(initialState, {
      type: "SET_INSPECTOR_FILTER",
      payload: "UserService",
    });

    expect(state.inspector.filterText).toBe("UserService");
  });

  it("maintains filter state across tab switches", () => {
    let state = devToolsReducer(initialState, actions.setTimelineFilter("Logger"));
    state = devToolsReducer(state, actions.setActiveTab("inspector"));
    state = devToolsReducer(state, {
      type: "SET_INSPECTOR_FILTER",
      payload: "UserService",
    });
    state = devToolsReducer(state, actions.setActiveTab("tracing"));

    // Both filters should be preserved
    expect(state.timeline.filterText).toBe("Logger");
    expect(state.inspector.filterText).toBe("UserService");
  });
});

// =============================================================================
// Test 6: Sync state (connection, remote actions)
// =============================================================================

describe("sync state (connection, remote actions)", () => {
  it("updates sync connection status", () => {
    const state = devToolsReducer(
      initialState,
      actions.syncState({
        isConnected: true,
        clientCount: 2,
        lastSyncTimestamp: Date.now(),
      })
    );

    expect(state.sync.isConnected).toBe(true);
    expect(state.sync.clientCount).toBe(2);
    expect(state.sync.lastSyncTimestamp).toBeGreaterThan(0);
  });

  it("handles remote action received", () => {
    const remoteAction = {
      source: "tui-client-1",
      action: { type: "SELECT_NODE" as const, payload: "ServiceA" },
      timestamp: Date.now(),
    };

    const state = devToolsReducer(initialState, actions.remoteActionReceived(remoteAction));

    expect(state.sync.lastRemoteAction).toEqual(remoteAction);
    // The remote action should also be applied to state
    expect(state.graph.selectedNodeId).toBe("ServiceA");
  });

  it("tracks pending sync actions", () => {
    let state = devToolsReducer(
      initialState,
      actions.syncState({
        isConnected: true,
        clientCount: 1,
        lastSyncTimestamp: Date.now(),
        pendingActions: 3,
      })
    );

    expect(state.sync.pendingActions).toBe(3);

    // After sync completes
    state = devToolsReducer(
      state,
      actions.syncState({
        isConnected: true,
        clientCount: 1,
        lastSyncTimestamp: Date.now(),
        pendingActions: 0,
      })
    );

    expect(state.sync.pendingActions).toBe(0);
  });
});

// =============================================================================
// Selector Tests
// =============================================================================

describe("time-travel selectors", () => {
  it("selectCurrentSnapshot returns the snapshot at current index", () => {
    const snapshot1 = { id: "s1", timestamp: 1000, label: "First", state: { singletons: [], scopes: [], phase: "ready" as const } };
    const snapshot2 = { id: "s2", timestamp: 2000, label: "Second", state: { singletons: [], scopes: [], phase: "ready" as const } };

    let state = devToolsReducer(initialState, actions.captureSnapshot(snapshot1));
    state = devToolsReducer(state, actions.captureSnapshot(snapshot2));
    state = devToolsReducer(state, actions.setSnapshotIndex(0));

    const current = selectCurrentSnapshot(state);
    expect(current).toEqual(snapshot1);
  });

  it("selectSnapshotHistory returns all snapshots", () => {
    const snapshot1 = { id: "s1", timestamp: 1000, label: "First", state: { singletons: [], scopes: [], phase: "ready" as const } };
    const snapshot2 = { id: "s2", timestamp: 2000, label: "Second", state: { singletons: [], scopes: [], phase: "ready" as const } };

    let state = devToolsReducer(initialState, actions.captureSnapshot(snapshot1));
    state = devToolsReducer(state, actions.captureSnapshot(snapshot2));

    const history = selectSnapshotHistory(state);
    expect(history).toHaveLength(2);
    expect(history[0]!.id).toBe("s1");
    expect(history[1]!.id).toBe("s2");
  });
});

describe("comparison selectors", () => {
  it("selectComparisonDiff returns null when comparison is disabled", () => {
    const diff = selectComparisonDiff(initialState);
    expect(diff).toBeNull();
  });

  it("selectComparisonDiff returns diff info when comparison is enabled", () => {
    let state = devToolsReducer(initialState, actions.setComparisonLeft("s1"));
    state = devToolsReducer(state, actions.setComparisonRight("s2"));
    state = devToolsReducer(state, actions.toggleComparison());

    const diff = selectComparisonDiff(state);
    expect(diff).toEqual({
      leftSnapshotId: "s1",
      rightSnapshotId: "s2",
      isEnabled: true,
    });
  });
});

describe("container hierarchy selectors", () => {
  it("selectActiveContainer returns active container id", () => {
    const state = devToolsReducer(initialState, actions.setActiveContainer("child-1"));

    const activeId = selectActiveContainer(state);
    expect(activeId).toBe("child-1");
  });

  it("selectContainerHierarchy returns hierarchy structure", () => {
    const hierarchy = {
      rootId: "root",
      containers: {
        root: { id: "root", name: "Root", parentId: null, childIds: [], phase: "ready" as const },
      },
    };

    const state = devToolsReducer(initialState, actions.updateContainerHierarchy(hierarchy));

    const result = selectContainerHierarchy(state);
    expect(result).toEqual(hierarchy);
  });
});

describe("sync selectors", () => {
  it("selectSyncStatus returns sync state", () => {
    const state = devToolsReducer(
      initialState,
      actions.syncState({
        isConnected: true,
        clientCount: 3,
        lastSyncTimestamp: 12345,
      })
    );

    const status = selectSyncStatus(state);
    expect(status.isConnected).toBe(true);
    expect(status.clientCount).toBe(3);
    expect(status.lastSyncTimestamp).toBe(12345);
  });
});

// =============================================================================
// Immutability Tests
// =============================================================================

describe("state immutability", () => {
  it("preserves immutability on time-travel state updates", () => {
    const snapshot = {
      id: "s1",
      timestamp: 1000,
      label: "Test",
      state: { singletons: [], scopes: [], phase: "ready" as const },
    };

    const state = devToolsReducer(initialState, actions.captureSnapshot(snapshot));

    // Original state should be unchanged
    expect(initialState.timeTravel.snapshots).toHaveLength(0);
    expect(state.timeTravel.snapshots).toHaveLength(1);
  });

  it("preserves immutability on sync state updates", () => {
    const state = devToolsReducer(
      initialState,
      actions.syncState({
        isConnected: true,
        clientCount: 2,
        lastSyncTimestamp: Date.now(),
      })
    );

    expect(initialState.sync.isConnected).toBe(false);
    expect(state.sync.isConnected).toBe(true);
  });
});
