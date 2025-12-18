/**
 * Type-level tests for new render primitive contracts (Task Group 4).
 *
 * These tests verify:
 * 1. FlameGraph prop types are correct
 * 2. TimelineScrubber prop types are correct
 * 3. DiffView prop types are correct
 * 4. ContainerTree prop types are correct
 * 5. PerformanceBadge prop types are correct
 * 6. Primitive callbacks (onSelect, onZoom, etc.) have correct signatures
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  RenderPrimitives,
  FlameGraphProps,
  TimelineScrubberProps,
  DiffViewProps,
  ContainerTreeProps,
  PerformanceBadgeProps,
  ZoomRange,
  SnapshotSummary,
  FlameGraphViewModel,
  ComparisonViewModel,
  ContainerHierarchyViewModel,
  FlameFrame,
  ContainerNode,
} from "../src/ports/index.js";

// =============================================================================
// Test 1: FlameGraph prop types are correct
// =============================================================================

describe("FlameGraph prop types are correct", () => {
  it("FlameGraphProps has required viewModel property", () => {
    expectTypeOf<FlameGraphProps["viewModel"]>().toMatchTypeOf<FlameGraphViewModel>();
    // viewModel is not undefined (required)
    expectTypeOf<FlameGraphProps>().toHaveProperty("viewModel");
  });

  it("FlameGraphProps has optional onFrameSelect callback", () => {
    expectTypeOf<FlameGraphProps["onFrameSelect"]>().toEqualTypeOf<
      ((frameId: string) => void) | undefined
    >();
  });

  it("FlameGraphProps has optional onZoomChange callback", () => {
    type OnZoomChangeType = FlameGraphProps["onZoomChange"];
    // Should be undefined or a function
    expectTypeOf<OnZoomChangeType>().toMatchTypeOf<((range: ZoomRange) => void) | undefined>();
  });

  it("FlameGraphProps has optional thresholdMs property", () => {
    expectTypeOf<FlameGraphProps["thresholdMs"]>().toEqualTypeOf<number | undefined>();
  });

  it("ZoomRange has start and end number properties", () => {
    expectTypeOf<ZoomRange["start"]>().toBeNumber();
    expectTypeOf<ZoomRange["end"]>().toBeNumber();
  });

  it("RenderPrimitives includes FlameGraph component", () => {
    type DOMPrimitives = RenderPrimitives<"dom">;
    expectTypeOf<DOMPrimitives>().toHaveProperty("FlameGraph");
    expectTypeOf<DOMPrimitives["FlameGraph"]>().toBeFunction();
    expectTypeOf<DOMPrimitives["FlameGraph"]>().parameter(0).toMatchTypeOf<FlameGraphProps>();
  });
});

// =============================================================================
// Test 2: TimelineScrubber prop types are correct
// =============================================================================

describe("TimelineScrubber prop types are correct", () => {
  it("TimelineScrubberProps has required snapshots array", () => {
    // snapshots should be a readonly array of SnapshotSummary
    expectTypeOf<TimelineScrubberProps>().toHaveProperty("snapshots");
    type SnapshotsType = TimelineScrubberProps["snapshots"];
    expectTypeOf<SnapshotsType>().toMatchTypeOf<readonly SnapshotSummary[]>();
  });

  it("TimelineScrubberProps has required currentIndex number", () => {
    expectTypeOf<TimelineScrubberProps["currentIndex"]>().toBeNumber();
    expectTypeOf<TimelineScrubberProps>().toHaveProperty("currentIndex");
  });

  it("TimelineScrubberProps has required onNavigate callback", () => {
    expectTypeOf<TimelineScrubberProps["onNavigate"]>().toEqualTypeOf<(index: number) => void>();
    expectTypeOf<TimelineScrubberProps>().toHaveProperty("onNavigate");
  });

  it("TimelineScrubberProps has optional onCapture callback", () => {
    expectTypeOf<TimelineScrubberProps["onCapture"]>().toEqualTypeOf<(() => void) | undefined>();
  });

  it("SnapshotSummary has required id and label properties", () => {
    expectTypeOf<SnapshotSummary["id"]>().toBeString();
    expectTypeOf<SnapshotSummary["label"]>().toBeString();
    expectTypeOf<SnapshotSummary["timestamp"]>().toBeNumber();
  });

  it("RenderPrimitives includes TimelineScrubber component", () => {
    type DOMPrimitives = RenderPrimitives<"dom">;
    expectTypeOf<DOMPrimitives>().toHaveProperty("TimelineScrubber");
    expectTypeOf<DOMPrimitives["TimelineScrubber"]>().toBeFunction();
    expectTypeOf<DOMPrimitives["TimelineScrubber"]>().parameter(0).toMatchTypeOf<TimelineScrubberProps>();
  });
});

// =============================================================================
// Test 3: DiffView prop types are correct
// =============================================================================

describe("DiffView prop types are correct", () => {
  it("DiffViewProps has required viewModel property", () => {
    expectTypeOf<DiffViewProps["viewModel"]>().toMatchTypeOf<ComparisonViewModel>();
    // viewModel is required
    expectTypeOf<DiffViewProps>().toHaveProperty("viewModel");
  });

  it("DiffViewProps has optional onServiceSelect callback", () => {
    expectTypeOf<DiffViewProps["onServiceSelect"]>().toEqualTypeOf<
      ((portName: string) => void) | undefined
    >();
  });

  it("DiffViewProps has optional filter boolean flags", () => {
    expectTypeOf<DiffViewProps["showAdditions"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<DiffViewProps["showRemovals"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<DiffViewProps["showChanges"]>().toEqualTypeOf<boolean | undefined>();
  });

  it("RenderPrimitives includes DiffView component", () => {
    type DOMPrimitives = RenderPrimitives<"dom">;
    expectTypeOf<DOMPrimitives>().toHaveProperty("DiffView");
    expectTypeOf<DOMPrimitives["DiffView"]>().toBeFunction();
    expectTypeOf<DOMPrimitives["DiffView"]>().parameter(0).toMatchTypeOf<DiffViewProps>();
  });
});

// =============================================================================
// Test 4: ContainerTree prop types are correct
// =============================================================================

describe("ContainerTree prop types are correct", () => {
  it("ContainerTreeProps has required viewModel property", () => {
    expectTypeOf<ContainerTreeProps["viewModel"]>().toMatchTypeOf<ContainerHierarchyViewModel>();
    // viewModel is required
    expectTypeOf<ContainerTreeProps>().toHaveProperty("viewModel");
  });

  it("ContainerTreeProps has required onContainerSelect callback", () => {
    expectTypeOf<ContainerTreeProps["onContainerSelect"]>().toEqualTypeOf<
      (containerId: string) => void
    >();
    expectTypeOf<ContainerTreeProps>().toHaveProperty("onContainerSelect");
  });

  it("ContainerTreeProps has required expandedIds array", () => {
    expectTypeOf<ContainerTreeProps["expandedIds"]>().toEqualTypeOf<readonly string[]>();
    expectTypeOf<ContainerTreeProps>().toHaveProperty("expandedIds");
  });

  it("ContainerTreeProps has required onToggleExpand callback", () => {
    expectTypeOf<ContainerTreeProps["onToggleExpand"]>().toEqualTypeOf<
      (containerId: string) => void
    >();
    expectTypeOf<ContainerTreeProps>().toHaveProperty("onToggleExpand");
  });

  it("RenderPrimitives includes ContainerTree component", () => {
    type DOMPrimitives = RenderPrimitives<"dom">;
    expectTypeOf<DOMPrimitives>().toHaveProperty("ContainerTree");
    expectTypeOf<DOMPrimitives["ContainerTree"]>().toBeFunction();
    expectTypeOf<DOMPrimitives["ContainerTree"]>().parameter(0).toMatchTypeOf<ContainerTreeProps>();
  });
});

// =============================================================================
// Test 5: PerformanceBadge prop types are correct
// =============================================================================

describe("PerformanceBadge prop types are correct", () => {
  it("PerformanceBadgeProps has required durationMs property", () => {
    expectTypeOf<PerformanceBadgeProps["durationMs"]>().toBeNumber();
    expectTypeOf<PerformanceBadgeProps>().toHaveProperty("durationMs");
  });

  it("PerformanceBadgeProps has optional thresholdMs property", () => {
    expectTypeOf<PerformanceBadgeProps["thresholdMs"]>().toEqualTypeOf<number | undefined>();
  });

  it("PerformanceBadgeProps has optional showLabel property", () => {
    expectTypeOf<PerformanceBadgeProps["showLabel"]>().toEqualTypeOf<boolean | undefined>();
  });

  it("PerformanceBadgeProps has optional size property", () => {
    expectTypeOf<PerformanceBadgeProps["size"]>().toEqualTypeOf<"sm" | "md" | "lg" | undefined>();
  });

  it("RenderPrimitives includes PerformanceBadge component", () => {
    type DOMPrimitives = RenderPrimitives<"dom">;
    expectTypeOf<DOMPrimitives>().toHaveProperty("PerformanceBadge");
    expectTypeOf<DOMPrimitives["PerformanceBadge"]>().toBeFunction();
    expectTypeOf<DOMPrimitives["PerformanceBadge"]>().parameter(0).toMatchTypeOf<PerformanceBadgeProps>();
  });
});

// =============================================================================
// Test 6: Primitive callbacks have correct signatures
// =============================================================================

describe("Primitive callbacks have correct signatures", () => {
  it("FlameGraph onFrameSelect receives string frameId", () => {
    type OnFrameSelect = NonNullable<FlameGraphProps["onFrameSelect"]>;
    expectTypeOf<OnFrameSelect>().toBeFunction();
    expectTypeOf<OnFrameSelect>().parameter(0).toBeString();
    expectTypeOf<OnFrameSelect>().returns.toBeVoid();
  });

  it("FlameGraph onZoomChange receives ZoomRange", () => {
    type OnZoomChange = NonNullable<FlameGraphProps["onZoomChange"]>;
    expectTypeOf<OnZoomChange>().toBeFunction();
    expectTypeOf<OnZoomChange>().parameter(0).toMatchTypeOf<ZoomRange>();
    expectTypeOf<OnZoomChange>().returns.toBeVoid();
  });

  it("TimelineScrubber onNavigate receives number index", () => {
    type OnNavigate = TimelineScrubberProps["onNavigate"];
    expectTypeOf<OnNavigate>().toBeFunction();
    expectTypeOf<OnNavigate>().parameter(0).toBeNumber();
    expectTypeOf<OnNavigate>().returns.toBeVoid();
  });

  it("DiffView onServiceSelect receives string portName", () => {
    type OnServiceSelect = NonNullable<DiffViewProps["onServiceSelect"]>;
    expectTypeOf<OnServiceSelect>().toBeFunction();
    expectTypeOf<OnServiceSelect>().parameter(0).toBeString();
    expectTypeOf<OnServiceSelect>().returns.toBeVoid();
  });

  it("ContainerTree onContainerSelect receives string containerId", () => {
    type OnContainerSelect = ContainerTreeProps["onContainerSelect"];
    expectTypeOf<OnContainerSelect>().toBeFunction();
    expectTypeOf<OnContainerSelect>().parameter(0).toBeString();
    expectTypeOf<OnContainerSelect>().returns.toBeVoid();
  });

  it("ContainerTree onToggleExpand receives string containerId", () => {
    type OnToggleExpand = ContainerTreeProps["onToggleExpand"];
    expectTypeOf<OnToggleExpand>().toBeFunction();
    expectTypeOf<OnToggleExpand>().parameter(0).toBeString();
    expectTypeOf<OnToggleExpand>().returns.toBeVoid();
  });
});

// =============================================================================
// Additional type safety tests for view models
// =============================================================================

describe("View model types for new primitives", () => {
  it("FlameGraphViewModel has required properties", () => {
    expectTypeOf<FlameGraphViewModel>().toHaveProperty("frames");
    expectTypeOf<FlameGraphViewModel>().toHaveProperty("totalDuration");
    expectTypeOf<FlameGraphViewModel>().toHaveProperty("maxDepth");
    expectTypeOf<FlameGraphViewModel>().toHaveProperty("frameCount");
    expectTypeOf<FlameGraphViewModel>().toHaveProperty("isEmpty");
  });

  it("FlameFrame has required properties", () => {
    expectTypeOf<FlameFrame>().toHaveProperty("id");
    expectTypeOf<FlameFrame>().toHaveProperty("label");
    expectTypeOf<FlameFrame>().toHaveProperty("depth");
    expectTypeOf<FlameFrame>().toHaveProperty("cumulativeTime");
    expectTypeOf<FlameFrame>().toHaveProperty("selfTime");
  });

  it("ComparisonViewModel has required properties", () => {
    expectTypeOf<ComparisonViewModel>().toHaveProperty("leftSnapshot");
    expectTypeOf<ComparisonViewModel>().toHaveProperty("rightSnapshot");
    expectTypeOf<ComparisonViewModel>().toHaveProperty("addedServices");
    expectTypeOf<ComparisonViewModel>().toHaveProperty("removedServices");
    expectTypeOf<ComparisonViewModel>().toHaveProperty("changedServices");
    expectTypeOf<ComparisonViewModel>().toHaveProperty("isEmpty");
    expectTypeOf<ComparisonViewModel>().toHaveProperty("hasChanges");
  });

  it("ContainerHierarchyViewModel has required properties", () => {
    expectTypeOf<ContainerHierarchyViewModel>().toHaveProperty("containers");
    expectTypeOf<ContainerHierarchyViewModel>().toHaveProperty("activeContainerId");
    expectTypeOf<ContainerHierarchyViewModel>().toHaveProperty("containerPhases");
    expectTypeOf<ContainerHierarchyViewModel>().toHaveProperty("containerCount");
  });

  it("ContainerNode has required properties", () => {
    expectTypeOf<ContainerNode>().toHaveProperty("id");
    expectTypeOf<ContainerNode>().toHaveProperty("name");
    expectTypeOf<ContainerNode>().toHaveProperty("depth");
    expectTypeOf<ContainerNode>().toHaveProperty("isActive");
    expectTypeOf<ContainerNode>().toHaveProperty("isExpanded");
  });
});

// =============================================================================
// Test RenderPrimitives includes all new components for both DOM and TUI
// =============================================================================

describe("RenderPrimitives includes all new components", () => {
  it("RenderPrimitives<'dom'> has all new primitive components", () => {
    type DOMPrimitives = RenderPrimitives<"dom">;
    expectTypeOf<DOMPrimitives>().toHaveProperty("FlameGraph");
    expectTypeOf<DOMPrimitives>().toHaveProperty("TimelineScrubber");
    expectTypeOf<DOMPrimitives>().toHaveProperty("DiffView");
    expectTypeOf<DOMPrimitives>().toHaveProperty("ContainerTree");
    expectTypeOf<DOMPrimitives>().toHaveProperty("PerformanceBadge");
  });

  it("RenderPrimitives<'tui'> has all new primitive components", () => {
    type TUIPrimitives = RenderPrimitives<"tui">;
    expectTypeOf<TUIPrimitives>().toHaveProperty("FlameGraph");
    expectTypeOf<TUIPrimitives>().toHaveProperty("TimelineScrubber");
    expectTypeOf<TUIPrimitives>().toHaveProperty("DiffView");
    expectTypeOf<TUIPrimitives>().toHaveProperty("ContainerTree");
    expectTypeOf<TUIPrimitives>().toHaveProperty("PerformanceBadge");
  });
});
