/**
 * Test Primitives - Mock implementations for testing.
 *
 * Provides simplified primitive components for testing shared headless
 * components without requiring the full DOM or TUI implementations.
 *
 * @packageDocumentation
 */

import React from "react";
import type {
  RenderPrimitives,
  BoxProps,
  TextProps,
  ButtonProps,
  IconProps,
  ScrollViewProps,
  DividerProps,
  GraphRendererProps,
  FlameGraphProps,
  TimelineScrubberProps,
  DiffViewProps,
  ContainerTreeProps,
  PerformanceBadgeProps,
  StyleSystem,
  SemanticColor,
} from "../../src/ports/render-primitives.port.js";

// =============================================================================
// Test Style System
// =============================================================================

/**
 * Test style system that returns simple string values for colors.
 */
export const TestStyleSystem: StyleSystem = {
  getColor(color: SemanticColor): string {
    return `test-${color}`;
  },
  colors: {
    primary: "test-primary",
    secondary: "test-secondary",
    success: "test-success",
    warning: "test-warning",
    error: "test-error",
    muted: "test-muted",
    foreground: "test-foreground",
    background: "test-background",
    border: "test-border",
    accent: "test-accent",
  },
};

// =============================================================================
// Test Primitive Components
// =============================================================================

function TestBox(props: BoxProps<"dom">): React.ReactElement {
  const { children, "data-testid": testId, ...rest } = props;
  return (
    <div data-testid={testId} data-component="Box">
      {children}
    </div>
  );
}

function TestText(props: TextProps<"dom">): React.ReactElement {
  const { children, variant, color, bold, "data-testid": testId } = props;
  return (
    <span
      data-testid={testId}
      data-component="Text"
      data-variant={variant}
      data-color={color}
      data-bold={bold}
    >
      {children}
    </span>
  );
}

function TestButton(props: ButtonProps<"dom">): React.ReactElement {
  const { label, onClick, disabled, variant, "data-testid": testId } = props;
  return (
    <button
      data-testid={testId}
      data-component="Button"
      data-variant={variant}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function TestIcon(props: IconProps): React.ReactElement {
  const { name, size, color } = props;
  return (
    <span data-component="Icon" data-icon={name} data-size={size} data-color={color}>
      [{name}]
    </span>
  );
}

function TestScrollView(props: ScrollViewProps): React.ReactElement {
  const { children, horizontal, vertical, maxHeight } = props;
  return (
    <div
      data-component="ScrollView"
      data-horizontal={horizontal}
      data-vertical={vertical}
      data-max-height={maxHeight}
    >
      {children}
    </div>
  );
}

function TestDivider(props: DividerProps): React.ReactElement {
  const { orientation, color } = props;
  return (
    <hr data-component="Divider" data-orientation={orientation} data-color={color} />
  );
}

function TestGraphRenderer(props: GraphRendererProps): React.ReactElement {
  const { viewModel, onNodeSelect, fitToView } = props;
  return (
    <div data-testid="graph-renderer" data-component="GraphRenderer" data-node-count={viewModel.nodeCount}>
      {viewModel.nodes.map((node) => (
        <div
          key={node.id}
          data-node-id={node.id}
          data-selected={node.isSelected}
          data-highlighted={node.isHighlighted}
          data-dimmed={node.isDimmed}
          data-lifetime={node.lifetime}
          data-factory-kind={node.factoryKind}
          onClick={() => onNodeSelect?.({ nodeId: node.id })}
        >
          {node.label}
        </div>
      ))}
    </div>
  );
}

function TestFlameGraph(props: FlameGraphProps): React.ReactElement {
  const { viewModel, onFrameSelect, thresholdMs } = props;
  return (
    <div
      data-testid="flame-graph"
      data-component="FlameGraph"
      data-frame-count={viewModel.frameCount}
      data-threshold={thresholdMs}
    >
      {viewModel.frames.map((frame) => (
        <div
          key={frame.id}
          data-frame-id={frame.id}
          onClick={() => onFrameSelect?.(frame.id)}
        >
          {frame.label}
        </div>
      ))}
    </div>
  );
}

function TestTimelineScrubber(props: TimelineScrubberProps): React.ReactElement {
  const { snapshots, currentIndex, onNavigate, onCapture } = props;
  return (
    <div
      data-testid="timeline-scrubber"
      data-component="TimelineScrubber"
      data-snapshot-count={snapshots.length}
      data-current-index={currentIndex}
    >
      {snapshots.map((snap, idx) => (
        <button key={snap.id} onClick={() => onNavigate(idx)}>
          {snap.label}
        </button>
      ))}
      {onCapture && <button onClick={onCapture}>Capture</button>}
    </div>
  );
}

function TestDiffView(props: DiffViewProps): React.ReactElement {
  const { viewModel, onServiceSelect, showAdditions, showRemovals, showChanges } = props;
  return (
    <div
      data-testid="diff-view"
      data-component="DiffView"
      data-show-additions={showAdditions}
      data-show-removals={showRemovals}
      data-show-changes={showChanges}
    >
      <div data-section="added">
        {viewModel.addedServices.map((s) => (
          <span key={s} onClick={() => onServiceSelect?.(s)}>
            +{s}
          </span>
        ))}
      </div>
      <div data-section="removed">
        {viewModel.removedServices.map((s) => (
          <span key={s} onClick={() => onServiceSelect?.(s)}>
            -{s}
          </span>
        ))}
      </div>
    </div>
  );
}

function TestContainerTree(props: ContainerTreeProps): React.ReactElement {
  const { viewModel, onContainerSelect, expandedIds, onToggleExpand } = props;
  return (
    <div
      data-testid="container-tree"
      data-component="ContainerTree"
      data-container-count={viewModel.containerCount}
    >
      {viewModel.containers.map((container) => (
        <div
          key={container.id}
          data-container-id={container.id}
          data-expanded={expandedIds.includes(container.id)}
          onClick={() => onContainerSelect(container.id)}
        >
          <button onClick={() => onToggleExpand(container.id)}>toggle</button>
          {container.name}
        </div>
      ))}
    </div>
  );
}

function TestPerformanceBadge(props: PerformanceBadgeProps): React.ReactElement {
  const { durationMs, thresholdMs, showLabel, size } = props;
  const color =
    durationMs < (thresholdMs ?? 100) / 2
      ? "success"
      : durationMs < (thresholdMs ?? 100)
        ? "warning"
        : "error";

  return (
    <span
      data-testid="performance-badge"
      data-component="PerformanceBadge"
      data-duration={durationMs}
      data-threshold={thresholdMs}
      data-color={color}
      data-size={size}
    >
      {showLabel !== false ? `${durationMs.toFixed(2)}ms` : ""}
    </span>
  );
}

// =============================================================================
// Test Primitives Export
// =============================================================================

/**
 * Test primitives for unit testing shared components.
 */
export const TestPrimitives: RenderPrimitives<"dom"> = {
  rendererType: "dom",
  Box: TestBox,
  Text: TestText,
  Button: TestButton,
  Icon: TestIcon,
  ScrollView: TestScrollView,
  Divider: TestDivider,
  GraphRenderer: TestGraphRenderer,
  FlameGraph: TestFlameGraph,
  TimelineScrubber: TestTimelineScrubber,
  DiffView: TestDiffView,
  ContainerTree: TestContainerTree,
  PerformanceBadge: TestPerformanceBadge,
  styleSystem: TestStyleSystem,
};

/**
 * Factory function for creating test primitives.
 */
export function createTestPrimitives(): RenderPrimitives<"dom"> {
  return TestPrimitives;
}
