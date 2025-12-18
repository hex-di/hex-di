/**
 * Tests for View Model Extensions.
 *
 * These tests verify:
 * 1. FlameGraphViewModel creation with trace hierarchy
 * 2. ComparisonViewModel with diff calculation
 * 3. TimeTravelViewModel snapshot navigation
 * 4. ContainerHierarchyViewModel tree structure
 * 5. Extended GraphViewModel with captive warnings
 * 6. ServiceInfoViewModel with async factory status
 * 7. View model immutability (Object.freeze)
 * 8. Edge cases (empty data, single node)
 *
 * @packageDocumentation
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import {
  // Flame Graph
  type FlameFrame,
  type ZoomRange,
  type FlameGraphViewModel,
  createEmptyFlameGraphViewModel,
  createFlameGraphViewModel,

  // Comparison
  type SnapshotSummary,
  type ServiceDiff,
  type ComparisonViewModel,
  createEmptyComparisonViewModel,
  createComparisonViewModel,

  // Time Travel
  type StateDiff,
  type TimeTravelViewModel,
  createEmptyTimeTravelViewModel,
  createTimeTravelViewModel,

  // Container Hierarchy
  type ContainerNode,
  type ContainerPhase,
  type ContainerHierarchyViewModel,
  createEmptyContainerHierarchyViewModel,
  createContainerHierarchyViewModel,

  // Extended Graph
  type ContainerGrouping,
  type CaptiveWarning,
  type ExtendedGraphViewModel,
  createEmptyExtendedGraphViewModel,

  // Extended Service Info
  type ExtendedServiceInfoViewModel,
  type AsyncFactoryStatus,
  createEmptyExtendedServiceInfoViewModel,
} from "../../src/view-models/index.js";

// =============================================================================
// Test 1: FlameGraphViewModel Creation with Trace Hierarchy
// =============================================================================

describe("FlameGraphViewModel", () => {
  it("creates with trace hierarchy correctly", () => {
    const frames: FlameFrame[] = [
      {
        id: "frame-1",
        label: "UserService",
        depth: 0,
        startPercent: 0,
        widthPercent: 1,
        cumulativeTime: 100,
        selfTime: 30,
        childIds: ["frame-2", "frame-3"],
        parentId: null,
        isSelected: false,
        isInView: true,
      },
      {
        id: "frame-2",
        label: "Logger",
        depth: 1,
        startPercent: 0.1,
        widthPercent: 0.4,
        cumulativeTime: 40,
        selfTime: 40,
        childIds: [],
        parentId: "frame-1",
        isSelected: false,
        isInView: true,
      },
      {
        id: "frame-3",
        label: "Database",
        depth: 1,
        startPercent: 0.5,
        widthPercent: 0.3,
        cumulativeTime: 30,
        selfTime: 30,
        childIds: [],
        parentId: "frame-1",
        isSelected: false,
        isInView: true,
      },
    ];

    const viewModel = createFlameGraphViewModel({
      frames,
      selectedFrameId: null,
      zoomRange: { start: 0, end: 1 },
    });

    expect(viewModel.frames).toHaveLength(3);
    expect(viewModel.maxDepth).toBe(2); // Max depth is 1, so total depth is 2
    expect(viewModel.totalDuration).toBe(100);
    expect(viewModel.selectedFrameId).toBeNull();
    expect(viewModel.zoomRange.start).toBe(0);
    expect(viewModel.zoomRange.end).toBe(1);
    expect(viewModel.isEmpty).toBe(false);

    // Verify parent-child relationships
    const rootFrame = viewModel.frames.find((f) => f.id === "frame-1");
    expect(rootFrame?.childIds).toContain("frame-2");
    expect(rootFrame?.childIds).toContain("frame-3");

    const childFrame = viewModel.frames.find((f) => f.id === "frame-2");
    expect(childFrame?.parentId).toBe("frame-1");
  });

  it("calculates cumulative and self time correctly", () => {
    const frames: FlameFrame[] = [
      {
        id: "root",
        label: "Root",
        depth: 0,
        startPercent: 0,
        widthPercent: 1,
        cumulativeTime: 100,
        selfTime: 20, // 100 - 50 (child1) - 30 (child2) = 20
        childIds: ["child1", "child2"],
        parentId: null,
        isSelected: false,
        isInView: true,
      },
      {
        id: "child1",
        label: "Child1",
        depth: 1,
        startPercent: 0.1,
        widthPercent: 0.5,
        cumulativeTime: 50,
        selfTime: 50,
        childIds: [],
        parentId: "root",
        isSelected: false,
        isInView: true,
      },
      {
        id: "child2",
        label: "Child2",
        depth: 1,
        startPercent: 0.6,
        widthPercent: 0.3,
        cumulativeTime: 30,
        selfTime: 30,
        childIds: [],
        parentId: "root",
        isSelected: false,
        isInView: true,
      },
    ];

    const viewModel = createFlameGraphViewModel({
      frames,
      selectedFrameId: null,
      zoomRange: { start: 0, end: 1 },
    });

    const root = viewModel.frames.find((f) => f.id === "root");
    expect(root?.cumulativeTime).toBe(100);
    expect(root?.selfTime).toBe(20);
  });

  it("creates empty view model correctly", () => {
    const empty = createEmptyFlameGraphViewModel();

    expect(empty.frames).toHaveLength(0);
    expect(empty.maxDepth).toBe(0);
    expect(empty.totalDuration).toBe(0);
    expect(empty.selectedFrameId).toBeNull();
    expect(empty.zoomRange.start).toBe(0);
    expect(empty.zoomRange.end).toBe(1);
    expect(empty.isEmpty).toBe(true);
  });

  it("has correct types for all properties", () => {
    expectTypeOf<FlameGraphViewModel["frames"]>().toEqualTypeOf<
      readonly FlameFrame[]
    >();
    expectTypeOf<FlameGraphViewModel["maxDepth"]>().toEqualTypeOf<number>();
    expectTypeOf<FlameGraphViewModel["totalDuration"]>().toEqualTypeOf<number>();
    expectTypeOf<FlameGraphViewModel["selectedFrameId"]>().toEqualTypeOf<
      string | null
    >();
    expectTypeOf<FlameGraphViewModel["zoomRange"]>().toEqualTypeOf<ZoomRange>();
  });
});

// =============================================================================
// Test 2: ComparisonViewModel with Diff Calculation
// =============================================================================

describe("ComparisonViewModel", () => {
  it("creates with diff calculation correctly", () => {
    const leftSnapshot: SnapshotSummary = {
      id: "snapshot-1",
      timestamp: 1000,
      label: "Before",
      serviceCount: 5,
      singletonCount: 2,
      scopedCount: 2,
      transientCount: 1,
    };

    const rightSnapshot: SnapshotSummary = {
      id: "snapshot-2",
      timestamp: 2000,
      label: "After",
      serviceCount: 7,
      singletonCount: 3,
      scopedCount: 3,
      transientCount: 1,
    };

    const viewModel = createComparisonViewModel({
      leftSnapshot,
      rightSnapshot,
      addedServices: ["CacheService", "AuthService"],
      removedServices: [],
      changedServices: [
        {
          portName: "UserService",
          changeType: "resolution_count",
          leftValue: 5,
          rightValue: 12,
        },
      ],
      resolutionDeltas: new Map([
        ["UserService", 7],
        ["Logger", -2],
      ]),
    });

    expect(viewModel.leftSnapshot.id).toBe("snapshot-1");
    expect(viewModel.rightSnapshot.id).toBe("snapshot-2");
    expect(viewModel.addedServices).toEqual(["CacheService", "AuthService"]);
    expect(viewModel.removedServices).toHaveLength(0);
    expect(viewModel.changedServices).toHaveLength(1);
    expect(viewModel.changedServices[0]?.portName).toBe("UserService");
    expect(viewModel.resolutionDeltas.get("UserService")).toBe(7);
    expect(viewModel.isEmpty).toBe(false);
    expect(viewModel.hasChanges).toBe(true);
  });

  it("creates empty comparison view model", () => {
    const empty = createEmptyComparisonViewModel();

    expect(empty.leftSnapshot.serviceCount).toBe(0);
    expect(empty.rightSnapshot.serviceCount).toBe(0);
    expect(empty.addedServices).toHaveLength(0);
    expect(empty.removedServices).toHaveLength(0);
    expect(empty.changedServices).toHaveLength(0);
    expect(empty.resolutionDeltas.size).toBe(0);
    expect(empty.isEmpty).toBe(true);
    expect(empty.hasChanges).toBe(false);
  });

  it("has correct types for all properties", () => {
    expectTypeOf<ComparisonViewModel["leftSnapshot"]>().toEqualTypeOf<SnapshotSummary>();
    expectTypeOf<ComparisonViewModel["rightSnapshot"]>().toEqualTypeOf<SnapshotSummary>();
    expectTypeOf<ComparisonViewModel["addedServices"]>().toEqualTypeOf<
      readonly string[]
    >();
    expectTypeOf<ComparisonViewModel["removedServices"]>().toEqualTypeOf<
      readonly string[]
    >();
    expectTypeOf<ComparisonViewModel["changedServices"]>().toEqualTypeOf<
      readonly ServiceDiff[]
    >();
    expectTypeOf<ComparisonViewModel["resolutionDeltas"]>().toEqualTypeOf<
      ReadonlyMap<string, number>
    >();
  });
});

// =============================================================================
// Test 3: TimeTravelViewModel Snapshot Navigation
// =============================================================================

describe("TimeTravelViewModel", () => {
  it("creates with snapshot navigation correctly", () => {
    const snapshots: SnapshotSummary[] = [
      {
        id: "s1",
        timestamp: 1000,
        label: "Initial",
        serviceCount: 3,
        singletonCount: 1,
        scopedCount: 1,
        transientCount: 1,
      },
      {
        id: "s2",
        timestamp: 2000,
        label: "After Login",
        serviceCount: 5,
        singletonCount: 2,
        scopedCount: 2,
        transientCount: 1,
      },
      {
        id: "s3",
        timestamp: 3000,
        label: "After Logout",
        serviceCount: 4,
        singletonCount: 2,
        scopedCount: 1,
        transientCount: 1,
      },
    ];

    const stateDiff: StateDiff = {
      addedServices: ["AuthService", "SessionService"],
      removedServices: [],
      changedServices: ["UserService"],
    };

    const viewModel = createTimeTravelViewModel({
      snapshots,
      currentIndex: 1,
      stateDiff,
    });

    expect(viewModel.snapshots).toHaveLength(3);
    expect(viewModel.currentIndex).toBe(1);
    expect(viewModel.canGoBack).toBe(true);
    expect(viewModel.canGoForward).toBe(true);
    expect(viewModel.stateDiff).not.toBeNull();
    expect(viewModel.stateDiff?.addedServices).toContain("AuthService");
    expect(viewModel.currentSnapshot?.id).toBe("s2");
    expect(viewModel.isEmpty).toBe(false);
  });

  it("handles navigation boundaries correctly", () => {
    const snapshots: SnapshotSummary[] = [
      {
        id: "s1",
        timestamp: 1000,
        label: "Only",
        serviceCount: 3,
        singletonCount: 1,
        scopedCount: 1,
        transientCount: 1,
      },
    ];

    // At first snapshot - can't go back
    const atFirst = createTimeTravelViewModel({
      snapshots,
      currentIndex: 0,
      stateDiff: null,
    });
    expect(atFirst.canGoBack).toBe(false);
    expect(atFirst.canGoForward).toBe(false);

    // With multiple snapshots at end
    const multipleSnapshots: SnapshotSummary[] = [
      {
        id: "s1",
        timestamp: 1000,
        label: "First",
        serviceCount: 3,
        singletonCount: 1,
        scopedCount: 1,
        transientCount: 1,
      },
      {
        id: "s2",
        timestamp: 2000,
        label: "Second",
        serviceCount: 3,
        singletonCount: 1,
        scopedCount: 1,
        transientCount: 1,
      },
    ];

    const atLast = createTimeTravelViewModel({
      snapshots: multipleSnapshots,
      currentIndex: 1,
      stateDiff: null,
    });
    expect(atLast.canGoBack).toBe(true);
    expect(atLast.canGoForward).toBe(false);
  });

  it("creates empty time travel view model", () => {
    const empty = createEmptyTimeTravelViewModel();

    expect(empty.snapshots).toHaveLength(0);
    expect(empty.currentIndex).toBe(-1);
    expect(empty.canGoBack).toBe(false);
    expect(empty.canGoForward).toBe(false);
    expect(empty.stateDiff).toBeNull();
    expect(empty.currentSnapshot).toBeNull();
    expect(empty.isEmpty).toBe(true);
  });

  it("has correct types for all properties", () => {
    expectTypeOf<TimeTravelViewModel["snapshots"]>().toEqualTypeOf<
      readonly SnapshotSummary[]
    >();
    expectTypeOf<TimeTravelViewModel["currentIndex"]>().toEqualTypeOf<number>();
    expectTypeOf<TimeTravelViewModel["canGoBack"]>().toEqualTypeOf<boolean>();
    expectTypeOf<TimeTravelViewModel["canGoForward"]>().toEqualTypeOf<boolean>();
    expectTypeOf<TimeTravelViewModel["stateDiff"]>().toEqualTypeOf<StateDiff | null>();
  });
});

// =============================================================================
// Test 4: ContainerHierarchyViewModel Tree Structure
// =============================================================================

describe("ContainerHierarchyViewModel", () => {
  it("creates with tree structure correctly", () => {
    const containers: ContainerNode[] = [
      {
        id: "root",
        name: "RootContainer",
        parentId: null,
        childIds: ["child-1", "child-2"],
        depth: 0,
        serviceCount: 10,
        isExpanded: true,
        isActive: true,
      },
      {
        id: "child-1",
        name: "FeatureA",
        parentId: "root",
        childIds: [],
        depth: 1,
        serviceCount: 3,
        isExpanded: false,
        isActive: false,
      },
      {
        id: "child-2",
        name: "FeatureB",
        parentId: "root",
        childIds: ["grandchild-1"],
        depth: 1,
        serviceCount: 5,
        isExpanded: true,
        isActive: false,
      },
      {
        id: "grandchild-1",
        name: "SubFeatureB1",
        parentId: "child-2",
        childIds: [],
        depth: 2,
        serviceCount: 2,
        isExpanded: false,
        isActive: false,
      },
    ];

    const containerPhases = new Map<string, ContainerPhase>([
      ["root", "ready"],
      ["child-1", "ready"],
      ["child-2", "ready"],
      ["grandchild-1", "initializing"],
    ]);

    const viewModel = createContainerHierarchyViewModel({
      containers,
      activeContainerId: "root",
      containerPhases,
    });

    expect(viewModel.containers).toHaveLength(4);
    expect(viewModel.activeContainerId).toBe("root");
    expect(viewModel.containerPhases.get("root")).toBe("ready");
    expect(viewModel.containerPhases.get("grandchild-1")).toBe("initializing");
    expect(viewModel.isEmpty).toBe(false);
    expect(viewModel.maxDepth).toBe(2);

    // Verify tree structure
    const root = viewModel.containers.find((c) => c.id === "root");
    expect(root?.childIds).toContain("child-1");
    expect(root?.childIds).toContain("child-2");

    const child2 = viewModel.containers.find((c) => c.id === "child-2");
    expect(child2?.childIds).toContain("grandchild-1");
  });

  it("creates empty container hierarchy view model", () => {
    const empty = createEmptyContainerHierarchyViewModel();

    expect(empty.containers).toHaveLength(0);
    expect(empty.activeContainerId).toBe("");
    expect(empty.containerPhases.size).toBe(0);
    expect(empty.isEmpty).toBe(true);
    expect(empty.maxDepth).toBe(0);
  });

  it("has correct types for all properties", () => {
    expectTypeOf<ContainerHierarchyViewModel["containers"]>().toEqualTypeOf<
      readonly ContainerNode[]
    >();
    expectTypeOf<ContainerHierarchyViewModel["activeContainerId"]>().toEqualTypeOf<string>();
    expectTypeOf<ContainerHierarchyViewModel["containerPhases"]>().toEqualTypeOf<
      ReadonlyMap<string, ContainerPhase>
    >();
  });
});

// =============================================================================
// Test 5: Extended GraphViewModel with Captive Warnings
// =============================================================================

describe("ExtendedGraphViewModel", () => {
  it("extends GraphViewModel with captive warnings correctly", () => {
    // Verify the extended properties exist on the type
    const viewModel = createEmptyExtendedGraphViewModel();

    // Verify the extended properties exist
    expect(viewModel.containerGroupings).toBeDefined();
    expect(viewModel.captiveWarnings).toBeDefined();
    expect(viewModel.containerBoundaryEdges).toBeDefined();

    // Type assertions
    expectTypeOf<ExtendedGraphViewModel["containerGroupings"]>().toEqualTypeOf<
      readonly ContainerGrouping[]
    >();
    expectTypeOf<ExtendedGraphViewModel["captiveWarnings"]>().toEqualTypeOf<
      readonly CaptiveWarning[]
    >();
  });

  it("creates empty extended graph view model correctly", () => {
    const empty = createEmptyExtendedGraphViewModel();

    expect(empty.containerGroupings).toHaveLength(0);
    expect(empty.captiveWarnings).toHaveLength(0);
    expect(empty.containerBoundaryEdges).toHaveLength(0);
    expect(empty.hasCaptiveIssues).toBe(false);
    expect(empty.hasMultipleContainers).toBe(false);
  });

  it("has correct captive warning severity levels", () => {
    type WarningSeverity = CaptiveWarning["severity"];
    expectTypeOf<WarningSeverity>().toEqualTypeOf<"warning" | "error">();
  });
});

// =============================================================================
// Test 6: ServiceInfoViewModel with Async Factory Status
// =============================================================================

describe("ExtendedServiceInfoViewModel", () => {
  it("includes async factory status correctly", () => {
    const viewModel: ExtendedServiceInfoViewModel = {
      portName: "AsyncDatabase",
      lifetime: "singleton",
      factoryKind: "async",
      isResolved: true,
      resolutionCount: 1,
      avgDurationMs: 150,
      avgDurationFormatted: "150ms",
      cacheHitCount: 0,
      cacheHitRate: 0,
      lastResolved: "2024-01-15T10:30:00Z",
      totalDurationMs: 150,
      // Extended properties
      asyncFactoryStatus: "resolved",
      asyncResolutionTime: 150,
      captiveChain: [],
    };

    expect(viewModel.asyncFactoryStatus).toBe("resolved");
    expect(viewModel.asyncResolutionTime).toBe(150);
    expect(viewModel.captiveChain).toHaveLength(0);
  });

  it("handles pending async factory status", () => {
    const viewModel: ExtendedServiceInfoViewModel = {
      portName: "PendingService",
      lifetime: "singleton",
      factoryKind: "async",
      isResolved: false,
      resolutionCount: 0,
      avgDurationMs: 0,
      avgDurationFormatted: "0ms",
      cacheHitCount: 0,
      cacheHitRate: 0,
      lastResolved: null,
      totalDurationMs: 0,
      asyncFactoryStatus: "pending",
      asyncResolutionTime: null,
      captiveChain: [],
    };

    expect(viewModel.asyncFactoryStatus).toBe("pending");
    expect(viewModel.asyncResolutionTime).toBeNull();
  });

  it("handles error async factory status", () => {
    const viewModel: ExtendedServiceInfoViewModel = {
      portName: "FailedService",
      lifetime: "singleton",
      factoryKind: "async",
      isResolved: false,
      resolutionCount: 0,
      avgDurationMs: 0,
      avgDurationFormatted: "0ms",
      cacheHitCount: 0,
      cacheHitRate: 0,
      lastResolved: null,
      totalDurationMs: 0,
      asyncFactoryStatus: "error",
      asyncResolutionTime: null,
      captiveChain: [],
    };

    expect(viewModel.asyncFactoryStatus).toBe("error");
  });

  it("includes captive dependency chain", () => {
    const viewModel: ExtendedServiceInfoViewModel = {
      portName: "ScopedService",
      lifetime: "scoped",
      factoryKind: "sync",
      isResolved: true,
      resolutionCount: 5,
      avgDurationMs: 10,
      avgDurationFormatted: "10ms",
      cacheHitCount: 4,
      cacheHitRate: 0.8,
      lastResolved: "2024-01-15T10:35:00Z",
      totalDurationMs: 50,
      asyncFactoryStatus: null,
      asyncResolutionTime: null,
      captiveChain: ["SingletonA", "ScopedService"],
    };

    expect(viewModel.captiveChain).toEqual(["SingletonA", "ScopedService"]);
    expect(viewModel.captiveChain).toHaveLength(2);
  });

  it("creates empty extended service info correctly", () => {
    const empty = createEmptyExtendedServiceInfoViewModel();

    expect(empty.asyncFactoryStatus).toBeNull();
    expect(empty.asyncResolutionTime).toBeNull();
    expect(empty.captiveChain).toHaveLength(0);
  });

  it("has correct types for extended properties", () => {
    expectTypeOf<ExtendedServiceInfoViewModel["asyncFactoryStatus"]>().toEqualTypeOf<
      AsyncFactoryStatus | null
    >();
    expectTypeOf<ExtendedServiceInfoViewModel["asyncResolutionTime"]>().toEqualTypeOf<
      number | null
    >();
    expectTypeOf<ExtendedServiceInfoViewModel["captiveChain"]>().toEqualTypeOf<
      readonly string[]
    >();
  });
});

// =============================================================================
// Test 7: View Model Immutability (Object.freeze)
// =============================================================================

describe("View Model Immutability", () => {
  it("FlameGraphViewModel is frozen", () => {
    const vm = createEmptyFlameGraphViewModel();
    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm.frames)).toBe(true);
    expect(Object.isFrozen(vm.zoomRange)).toBe(true);
  });

  it("ComparisonViewModel is frozen", () => {
    const vm = createEmptyComparisonViewModel();
    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm.leftSnapshot)).toBe(true);
    expect(Object.isFrozen(vm.rightSnapshot)).toBe(true);
    expect(Object.isFrozen(vm.addedServices)).toBe(true);
    expect(Object.isFrozen(vm.removedServices)).toBe(true);
    expect(Object.isFrozen(vm.changedServices)).toBe(true);
  });

  it("TimeTravelViewModel is frozen", () => {
    const vm = createEmptyTimeTravelViewModel();
    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm.snapshots)).toBe(true);
  });

  it("ContainerHierarchyViewModel is frozen", () => {
    const vm = createEmptyContainerHierarchyViewModel();
    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm.containers)).toBe(true);
  });

  it("ExtendedGraphViewModel is frozen", () => {
    const vm = createEmptyExtendedGraphViewModel();
    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm.containerGroupings)).toBe(true);
    expect(Object.isFrozen(vm.captiveWarnings)).toBe(true);
    expect(Object.isFrozen(vm.containerBoundaryEdges)).toBe(true);
  });

  it("ExtendedServiceInfoViewModel is frozen", () => {
    const vm = createEmptyExtendedServiceInfoViewModel();
    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm.captiveChain)).toBe(true);
  });

  it("throws when attempting to modify frozen view model", () => {
    const vm = createEmptyFlameGraphViewModel();

    expect(() => {
      (vm as { maxDepth: number }).maxDepth = 10;
    }).toThrow();

    expect(() => {
      (vm.frames as FlameFrame[]).push({
        id: "test",
        label: "Test",
        depth: 0,
        startPercent: 0,
        widthPercent: 0,
        cumulativeTime: 0,
        selfTime: 0,
        childIds: [],
        parentId: null,
        isSelected: false,
        isInView: true,
      });
    }).toThrow();
  });
});

// =============================================================================
// Test 8: Edge Cases (Empty Data, Single Node)
// =============================================================================

describe("View Model Edge Cases", () => {
  it("handles empty frames in FlameGraphViewModel", () => {
    const vm = createFlameGraphViewModel({
      frames: [],
      selectedFrameId: null,
      zoomRange: { start: 0, end: 1 },
    });

    expect(vm.isEmpty).toBe(true);
    expect(vm.maxDepth).toBe(0);
    expect(vm.totalDuration).toBe(0);
  });

  it("handles single frame in FlameGraphViewModel", () => {
    const singleFrame: FlameFrame = {
      id: "single",
      label: "OnlyService",
      depth: 0,
      startPercent: 0,
      widthPercent: 1,
      cumulativeTime: 50,
      selfTime: 50,
      childIds: [],
      parentId: null,
      isSelected: false,
      isInView: true,
    };

    const vm = createFlameGraphViewModel({
      frames: [singleFrame],
      selectedFrameId: "single",
      zoomRange: { start: 0, end: 1 },
    });

    expect(vm.frames).toHaveLength(1);
    expect(vm.maxDepth).toBe(1);
    expect(vm.totalDuration).toBe(50);
    expect(vm.selectedFrameId).toBe("single");
    expect(vm.isEmpty).toBe(false);
  });

  it("handles identical snapshots in ComparisonViewModel", () => {
    const snapshot: SnapshotSummary = {
      id: "same",
      timestamp: 1000,
      label: "Same",
      serviceCount: 5,
      singletonCount: 2,
      scopedCount: 2,
      transientCount: 1,
    };

    const vm = createComparisonViewModel({
      leftSnapshot: snapshot,
      rightSnapshot: snapshot,
      addedServices: [],
      removedServices: [],
      changedServices: [],
      resolutionDeltas: new Map(),
    });

    expect(vm.hasChanges).toBe(false);
    expect(vm.addedServices).toHaveLength(0);
    expect(vm.removedServices).toHaveLength(0);
    expect(vm.changedServices).toHaveLength(0);
  });

  it("handles single snapshot in TimeTravelViewModel", () => {
    const snapshot: SnapshotSummary = {
      id: "only",
      timestamp: 1000,
      label: "Only One",
      serviceCount: 3,
      singletonCount: 1,
      scopedCount: 1,
      transientCount: 1,
    };

    const vm = createTimeTravelViewModel({
      snapshots: [snapshot],
      currentIndex: 0,
      stateDiff: null,
    });

    expect(vm.snapshots).toHaveLength(1);
    expect(vm.canGoBack).toBe(false);
    expect(vm.canGoForward).toBe(false);
    expect(vm.currentSnapshot?.id).toBe("only");
    expect(vm.isEmpty).toBe(false);
  });

  it("handles single container in ContainerHierarchyViewModel", () => {
    const container: ContainerNode = {
      id: "only",
      name: "OnlyContainer",
      parentId: null,
      childIds: [],
      depth: 0,
      serviceCount: 5,
      isExpanded: true,
      isActive: true,
    };

    const vm = createContainerHierarchyViewModel({
      containers: [container],
      activeContainerId: "only",
      containerPhases: new Map([["only", "ready"]]),
    });

    expect(vm.containers).toHaveLength(1);
    expect(vm.maxDepth).toBe(0);
    expect(vm.isEmpty).toBe(false);
  });

  it("handles negative index in TimeTravelViewModel", () => {
    const vm = createEmptyTimeTravelViewModel();
    expect(vm.currentIndex).toBe(-1);
    expect(vm.currentSnapshot).toBeNull();
  });

  it("handles deeply nested container hierarchy", () => {
    const containers: ContainerNode[] = [];
    for (let i = 0; i < 10; i++) {
      containers.push({
        id: `container-${i}`,
        name: `Container${i}`,
        parentId: i === 0 ? null : `container-${i - 1}`,
        childIds: i < 9 ? [`container-${i + 1}`] : [],
        depth: i,
        serviceCount: 1,
        isExpanded: true,
        isActive: i === 9,
      });
    }

    const phases = new Map<string, ContainerPhase>();
    containers.forEach((c) => phases.set(c.id, "ready"));

    const vm = createContainerHierarchyViewModel({
      containers,
      activeContainerId: "container-9",
      containerPhases: phases,
    });

    expect(vm.maxDepth).toBe(9);
    expect(vm.containers).toHaveLength(10);
  });
});
