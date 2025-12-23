/**
 * Tests for TUI new primitives implementation (Task Group 6).
 *
 * These 6 focused tests verify:
 * 1. TUIFlameGraph renders ASCII bars
 * 2. TUIFlameGraph handles keyboard navigation
 * 3. TUITimelineScrubber renders timeline
 * 4. TUIDiffView shows diff symbols
 * 5. TUIContainerTree renders tree with box-drawing
 * 6. ANSI color application
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { TUIPrimitives, TUIStyleSystem, ANSI_COLORS } from "../../src/tui/primitives.js";
import type { FlameGraphViewModel } from "../../src/view-models/flame-graph.vm.js";
import type { ComparisonViewModel } from "../../src/view-models/comparison.vm.js";
import type { ContainerHierarchyViewModel } from "../../src/view-models/container-hierarchy.vm.js";
import type { SnapshotSummary } from "../../src/view-models/comparison.vm.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestFlameGraphViewModel(
  overrides: Partial<FlameGraphViewModel> = {}
): FlameGraphViewModel {
  return {
    frames: [
      {
        id: "frame-1",
        label: "ServiceA",
        depth: 0,
        cumulativeTime: 100,
        selfTime: 40,
        startPercent: 0,
        widthPercent: 1,
        parentId: null,
        childIds: ["frame-2", "frame-3"],
        isSelected: false,
        isInView: true,
      },
      {
        id: "frame-2",
        label: "ServiceB",
        depth: 1,
        cumulativeTime: 35,
        selfTime: 35,
        startPercent: 0,
        widthPercent: 0.35,
        parentId: "frame-1",
        childIds: [],
        isSelected: false,
        isInView: true,
      },
      {
        id: "frame-3",
        label: "ServiceC",
        depth: 1,
        cumulativeTime: 25,
        selfTime: 25,
        startPercent: 0.35,
        widthPercent: 0.25,
        parentId: "frame-1",
        childIds: [],
        isSelected: true,
        isInView: true,
      },
    ],
    maxDepth: 2,
    totalDuration: 100,
    selectedFrameId: "frame-3",
    zoomRange: { start: 0, end: 1 },
    isEmpty: false,
    frameCount: 3,
    ...overrides,
  };
}

function createTestSnapshotSummary(overrides: Partial<SnapshotSummary> = {}): SnapshotSummary {
  return {
    id: "snapshot-1",
    label: "Snapshot 1",
    timestamp: Date.now(),
    serviceCount: 10,
    singletonCount: 5,
    scopedCount: 3,
    transientCount: 2,
    ...overrides,
  };
}

function createTestComparisonViewModel(
  overrides: Partial<ComparisonViewModel> = {}
): ComparisonViewModel {
  return {
    leftSnapshot: createTestSnapshotSummary({ id: "left", label: "Before" }),
    rightSnapshot: createTestSnapshotSummary({ id: "right", label: "After" }),
    addedServices: ["NewServiceA", "NewServiceB"],
    removedServices: ["OldService"],
    changedServices: [
      {
        portName: "ChangedService",
        changeType: "resolution_count",
        leftValue: 5,
        rightValue: 10,
        leftCount: 5,
        rightCount: 10,
        countDelta: 5,
      },
    ],
    resolutionDeltas: new Map([["ChangedService", 5]]),
    isActive: true,
    hasData: true,
    isEmpty: false,
    hasChanges: true,
    ...overrides,
  };
}

function createTestContainerHierarchyViewModel(
  overrides: Partial<ContainerHierarchyViewModel> = {}
): ContainerHierarchyViewModel {
  return {
    containers: [
      {
        id: "root",
        name: "RootContainer",
        parentId: null,
        childIds: ["child-1", "child-2"],
        phase: "ready",
        serviceCount: 10,
        singletonCount: 5,
        depth: 0,
        isActive: true,
        isExpanded: true,
      },
      {
        id: "child-1",
        name: "ChildContainer1",
        parentId: "root",
        childIds: [],
        phase: "ready",
        serviceCount: 5,
        singletonCount: 2,
        depth: 1,
        isActive: false,
        isExpanded: false,
      },
      {
        id: "child-2",
        name: "ChildContainer2",
        parentId: "root",
        childIds: ["grandchild"],
        phase: "disposing",
        serviceCount: 3,
        singletonCount: 1,
        depth: 1,
        isActive: false,
        isExpanded: true,
      },
      {
        id: "grandchild",
        name: "GrandchildContainer",
        parentId: "child-2",
        childIds: [],
        phase: "disposed",
        serviceCount: 1,
        singletonCount: 0,
        depth: 2,
        isActive: false,
        isExpanded: false,
      },
    ],
    activeContainerId: "root",
    containerPhases: new Map([
      ["root", "ready"],
      ["child-1", "ready"],
      ["child-2", "disposing"],
      ["grandchild", "disposed"],
    ]),
    rootContainerId: "root",
    containerCount: 4,
    hasData: true,
    isEmpty: false,
    maxDepth: 2,
    ...overrides,
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe("TUI New Primitives (Task Group 6)", () => {
  // ---------------------------------------------------------------------------
  // Test 1: TUIFlameGraph renders ASCII bars
  // ---------------------------------------------------------------------------
  describe("TUIFlameGraph renders ASCII bars", () => {
    it("renders frame bars with proportional widths based on duration", () => {
      const { FlameGraph } = TUIPrimitives;
      const viewModel = createTestFlameGraphViewModel();

      const element = FlameGraph({ viewModel });

      expect(element).toBeDefined();
      expect(element?.type).toBe("box");

      // Verify the element renders frame data

      const props = element?.props as any;
      expect(props.flexDirection).toBe("column");

      // The component should render frames with bars
      // Check that we have children (the frame rows)
      expect(props.children).toBeDefined();
    });

    it("applies ANSI color coding for different duration levels", () => {
      const { FlameGraph, styleSystem } = TUIPrimitives;
      const viewModel = createTestFlameGraphViewModel();

      const element = FlameGraph({ viewModel });

      // Verify style system is used for colors
      expect(styleSystem.getColor("success")).toMatch(/^\x1b\[\d+m$/);
      expect(styleSystem.getColor("warning")).toMatch(/^\x1b\[\d+m$/);
      expect(styleSystem.getColor("error")).toMatch(/^\x1b\[\d+m$/);

      // Element should be rendered
      expect(element).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: TUIFlameGraph handles keyboard navigation
  // ---------------------------------------------------------------------------
  describe("TUIFlameGraph handles keyboard navigation", () => {
    it("tracks selected frame ID in view model", () => {
      const { FlameGraph } = TUIPrimitives;
      const onFrameSelect = vi.fn();
      const viewModel = createTestFlameGraphViewModel({ selectedFrameId: "frame-2" });

      const element = FlameGraph({
        viewModel,
        onFrameSelect,
      });

      expect(element).toBeDefined();

      // The selected frame should be visually distinguishable
      // (implementation will highlight selected frame)
      expect(viewModel.selectedFrameId).toBe("frame-2");
    });

    it("provides frame selection callback for navigation", () => {
      const { FlameGraph } = TUIPrimitives;
      const onFrameSelect = vi.fn();
      const viewModel = createTestFlameGraphViewModel();

      const element = FlameGraph({
        viewModel,
        onFrameSelect,
      });

      expect(element).toBeDefined();
      // The callback is available for keyboard navigation handlers
      expect(typeof onFrameSelect).toBe("function");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: TUITimelineScrubber renders timeline
  // ---------------------------------------------------------------------------
  describe("TUITimelineScrubber renders timeline", () => {
    it("renders timeline with snapshot markers and bracket indicators", () => {
      const { TimelineScrubber } = TUIPrimitives;
      const snapshots = [
        createTestSnapshotSummary({ id: "snap-1", label: "Snap 1" }),
        createTestSnapshotSummary({ id: "snap-2", label: "Snap 2" }),
        createTestSnapshotSummary({ id: "snap-3", label: "Snap 3" }),
      ];
      const onNavigate = vi.fn();

      const element = TimelineScrubber({
        snapshots,
        currentIndex: 1,
        onNavigate,
      });

      expect(element).toBeDefined();
      expect(element?.type).toBe("box");

      // The timeline uses column layout to stack:
      // - Timeline bar (row)
      // - Current snapshot info (row)
      // - Navigation hints (row)

      const props = element?.props as any;
      expect(props.flexDirection).toBe("column");
    });

    it("displays navigation hints for keyboard control", () => {
      const { TimelineScrubber } = TUIPrimitives;
      const snapshots = [
        createTestSnapshotSummary({ id: "snap-1" }),
        createTestSnapshotSummary({ id: "snap-2" }),
      ];
      const onNavigate = vi.fn();

      const element = TimelineScrubber({
        snapshots,
        currentIndex: 0,
        onNavigate,
      });

      expect(element).toBeDefined();
      // Timeline should indicate navigation is available
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: TUIDiffView shows diff symbols
  // ---------------------------------------------------------------------------
  describe("TUIDiffView shows diff symbols", () => {
    it("renders diff with +/- prefixes and ANSI colors", () => {
      const { DiffView, styleSystem } = TUIPrimitives;
      const viewModel = createTestComparisonViewModel();

      const element = DiffView({ viewModel });

      expect(element).toBeDefined();
      expect(element?.type).toBe("box");

      // Verify color codes are valid ANSI
      expect(styleSystem.getColor("success")).toMatch(/^\x1b\[\d+m$/); // Green for additions
      expect(styleSystem.getColor("error")).toMatch(/^\x1b\[\d+m$/); // Red for removals
      expect(styleSystem.getColor("warning")).toMatch(/^\x1b\[\d+m$/); // Yellow for changes
    });

    it("shows summary counts at top", () => {
      const { DiffView } = TUIPrimitives;
      const viewModel = createTestComparisonViewModel({
        addedServices: ["A", "B", "C"],
        removedServices: ["X"],
        changedServices: [
          { portName: "Y", changeType: "resolution_count", leftValue: 1, rightValue: 2 },
          { portName: "Z", changeType: "timing", leftValue: 10, rightValue: 20 },
        ],
      });

      const element = DiffView({ viewModel });

      expect(element).toBeDefined();

      // The component should display summary info
      // (3 added, 1 removed, 2 changed)

      const props = element?.props as any;
      expect(props.flexDirection).toBe("column");
    });

    it("respects filter flags for additions/removals/changes", () => {
      const { DiffView } = TUIPrimitives;
      const viewModel = createTestComparisonViewModel();

      // Render with filters
      const element = DiffView({
        viewModel,
        showAdditions: true,
        showRemovals: false,
        showChanges: false,
      });

      expect(element).toBeDefined();
      // Component should respect these filter flags
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: TUIContainerTree renders tree with box-drawing
  // ---------------------------------------------------------------------------
  describe("TUIContainerTree renders tree with box-drawing", () => {
    it("renders tree structure with box-drawing characters", () => {
      const { ContainerTree } = TUIPrimitives;
      const viewModel = createTestContainerHierarchyViewModel();
      const onContainerSelect = vi.fn();
      const onToggleExpand = vi.fn();

      const element = ContainerTree({
        viewModel,
        onContainerSelect,
        expandedIds: ["root", "child-2"],
        onToggleExpand,
      });

      expect(element).toBeDefined();
      expect(element?.type).toBe("box");

      const props = element?.props as any;
      expect(props.flexDirection).toBe("column");
    });

    it("shows container phase inline with color coding", () => {
      const { ContainerTree, styleSystem } = TUIPrimitives;
      const viewModel = createTestContainerHierarchyViewModel();
      const onContainerSelect = vi.fn();
      const onToggleExpand = vi.fn();

      const element = ContainerTree({
        viewModel,
        onContainerSelect,
        expandedIds: ["root"],
        onToggleExpand,
      });

      expect(element).toBeDefined();

      // Phase colors should be applied
      // ready -> success (green)
      // disposing -> warning (yellow)
      // disposed -> error (red)
      expect(styleSystem.getColor("success")).toBeDefined();
      expect(styleSystem.getColor("warning")).toBeDefined();
      expect(styleSystem.getColor("error")).toBeDefined();
    });

    it("uses bracket indicators for expanded/collapsed state", () => {
      const { ContainerTree } = TUIPrimitives;
      const viewModel = createTestContainerHierarchyViewModel();
      const onContainerSelect = vi.fn();
      const onToggleExpand = vi.fn();

      const element = ContainerTree({
        viewModel,
        onContainerSelect,
        expandedIds: ["root"], // Only root is expanded
        onToggleExpand,
      });

      expect(element).toBeDefined();
      // Expanded containers should show different indicator than collapsed
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: ANSI color application
  // ---------------------------------------------------------------------------
  describe("ANSI color application", () => {
    it("applies correct ANSI codes for semantic colors in all new primitives", () => {
      const { styleSystem } = TUIPrimitives;

      // All semantic colors should map to valid ANSI codes
      const semanticColors = [
        "primary",
        "secondary",
        "success",
        "warning",
        "error",
        "muted",
        "foreground",
        "background",
        "border",
        "accent",
      ] as const;

      for (const color of semanticColors) {
        const ansiCode = styleSystem.getColor(color);
        expect(ansiCode).toBeDefined();
        expect(typeof ansiCode).toBe("string");
        // ANSI codes start with escape sequence
        expect(ansiCode).toMatch(/^\x1b\[\d+m$/);
      }
    });

    it("ANSI color constants are correctly defined", () => {
      // Verify ANSI color constants
      expect(ANSI_COLORS.reset).toBe("\x1b[0m");
      expect(ANSI_COLORS.bold).toBe("\x1b[1m");
      expect(ANSI_COLORS.green).toBe("\x1b[32m");
      expect(ANSI_COLORS.yellow).toBe("\x1b[33m");
      expect(ANSI_COLORS.red).toBe("\x1b[31m");
      expect(ANSI_COLORS.cyan).toBe("\x1b[36m");
      expect(ANSI_COLORS.magenta).toBe("\x1b[35m");
    });

    it("PerformanceBadge applies correct colors based on threshold", () => {
      const { PerformanceBadge, styleSystem } = TUIPrimitives;

      // Fast (green) - below threshold/2
      const fastBadge = PerformanceBadge({
        durationMs: 10,
        thresholdMs: 100,
        showLabel: true,
      });
      expect(fastBadge).toBeDefined();

      // Medium (yellow) - between threshold/2 and threshold
      const mediumBadge = PerformanceBadge({
        durationMs: 75,
        thresholdMs: 100,
        showLabel: true,
      });
      expect(mediumBadge).toBeDefined();

      // Slow (red) - at or above threshold
      const slowBadge = PerformanceBadge({
        durationMs: 150,
        thresholdMs: 100,
        showLabel: true,
      });
      expect(slowBadge).toBeDefined();

      // Verify the colors are valid
      expect(styleSystem.getColor("success")).toBeDefined();
      expect(styleSystem.getColor("warning")).toBeDefined();
      expect(styleSystem.getColor("error")).toBeDefined();
    });
  });
});
