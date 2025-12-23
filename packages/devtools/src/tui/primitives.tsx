/**
 * TUI Primitives - OpenTUI implementations of render primitives.
 *
 * This module provides terminal-based implementations of the RenderPrimitives
 * interface using OpenTUI components with ANSI color support.
 *
 * @packageDocumentation
 */

/// <reference path="./opentui.d.ts" />

import React from "react";
import type {
  RenderPrimitives,
  BoxProps,
  TextProps,
  ButtonProps,
  IconProps,
  ScrollViewProps,
  DividerProps,
  FlameGraphProps,
  TimelineScrubberProps,
  DiffViewProps,
  ContainerTreeProps,
  PerformanceBadgeProps,
  StyleSystem,
  SemanticColor,
  SpacingToken,
  IconName,
} from "../ports/render-primitives.port.js";
import type { FlameFrame } from "../view-models/flame-graph.vm.js";
import type { ContainerNode } from "../view-models/container-hierarchy.vm.js";
import type { ServiceDiff } from "../view-models/comparison.vm.js";
import { TUIGraphRenderer } from "./ascii-graph.js";
import {
  TUISpan as OTUISpan,
  TUIStrong as OTUIStrong,
  TUIText as OTUIText,
} from "./opentui-elements.js";

// =============================================================================
// ANSI Color Constants
// =============================================================================

/**
 * ANSI escape codes for terminal colors.
 * Reuses patterns from devtools-tui/src/components/ascii-graph.ts
 */
export const ANSI_COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  // Standard colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  // Bright colors
  brightBlack: "\x1b[90m",
  brightWhite: "\x1b[97m",
} as const;

// =============================================================================
// Box-Drawing Characters
// =============================================================================

const BOX_CHARS = {
  horizontal: "\u2500", // -
  vertical: "\u2502", // |
  cornerTopLeft: "\u250C", // +
  cornerTopRight: "\u2510", // +
  cornerBottomLeft: "\u2514", // L
  cornerBottomRight: "\u2518", // J
  teeRight: "\u251C", // |-
  teeLeft: "\u2524", // -|
  teeDown: "\u252C", // T
  teeUp: "\u2534", // _|_
  cross: "\u253C", // +
  arrow: "\u2192", // ->
} as const;

// =============================================================================
// TUI Style System
// =============================================================================

/**
 * TUI style system mapping semantic colors to ANSI codes.
 */
export const TUIStyleSystem: StyleSystem = {
  getColor(color: SemanticColor): string {
    return this.colors[color];
  },
  colors: {
    primary: ANSI_COLORS.cyan,
    secondary: ANSI_COLORS.blue,
    success: ANSI_COLORS.green,
    warning: ANSI_COLORS.yellow,
    error: ANSI_COLORS.red,
    muted: ANSI_COLORS.brightBlack,
    foreground: ANSI_COLORS.white,
    background: ANSI_COLORS.black,
    border: ANSI_COLORS.brightBlack,
    accent: ANSI_COLORS.magenta,
  },
};

// =============================================================================
// Spacing Utilities
// =============================================================================

/**
 * Maps spacing tokens to character units for TUI.
 */
const SPACING_MAP: Record<SpacingToken, number> = {
  none: 0,
  xs: 1,
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
};

// =============================================================================
// Icon ASCII Mappings
// =============================================================================

/**
 * Maps icon names to ASCII character representations.
 */
const ICON_MAP: Record<IconName, string> = {
  graph: "[G]",
  timeline: "[T]",
  stats: "[S]",
  services: "[#]",
  inspector: "[I]",
  "chevron-right": ">",
  "chevron-down": "v",
  close: "[x]",
  expand: "[+]",
  collapse: "[-]",
  refresh: "[R]",
  filter: "[F]",
  search: "[?]",
  settings: "[*]",
  singleton: "[1]",
  scoped: "[S]",
  transient: "[~]",
  async: "[A]",
  check: "[✓]",
  error: "[✗]",
  pending: "[⋯]",
  warning: "[!]",
  "arrow-right": "->",
  scope: "[○]",
  "scope-active": "[●]",
};

// TUISpan, TUIStrong, TUIText are imported from opentui-elements.js

// =============================================================================
// TUI Primitive Components
// =============================================================================

/**
 * TUI Box component - renders as OpenTUI box element.
 */
function TUIBox(props: BoxProps<"tui">): React.ReactElement {
  const {
    children,
    display,
    flexDirection,
    justifyContent,
    alignItems,
    gap,
    padding,
    paddingX,
    paddingY,
    flexGrow,
    flexShrink,
    width,
    height,
    title,
    titleAlignment,
  } = props;

  // Note: OpenTUI's Renderable.focusable is a getter-only property (no setter),
  // so we cannot pass focusable as a prop - it's controlled internally by the class.
  // The 'focusable' prop from BoxProps is intentionally not destructured or passed.
  return (
    <box
      flexDirection={flexDirection}
      justifyContent={justifyContent}
      alignItems={alignItems}
      gap={gap !== undefined ? SPACING_MAP[gap] : undefined}
      paddingLeft={
        paddingX !== undefined
          ? SPACING_MAP[paddingX]
          : padding !== undefined
            ? SPACING_MAP[padding]
            : undefined
      }
      paddingRight={
        paddingX !== undefined
          ? SPACING_MAP[paddingX]
          : padding !== undefined
            ? SPACING_MAP[padding]
            : undefined
      }
      paddingTop={
        paddingY !== undefined
          ? SPACING_MAP[paddingY]
          : padding !== undefined
            ? SPACING_MAP[padding]
            : undefined
      }
      paddingBottom={
        paddingY !== undefined
          ? SPACING_MAP[paddingY]
          : padding !== undefined
            ? SPACING_MAP[padding]
            : undefined
      }
      flexGrow={flexGrow}
      flexShrink={flexShrink}
      width={width}
      height={height}
      title={title}
      titleAlignment={titleAlignment}
      display={display === "none" ? "none" : undefined}
    >
      {children}
    </box>
  );
}

/**
 * TUI Text component - renders as text with span for colors.
 */
function TUIText(props: TextProps<"tui">): React.ReactElement {
  const { children, color, bold } = props;
  const fgColor = color !== undefined ? TUIStyleSystem.getColor(color) : undefined;

  return (
    <OTUIText>
      <OTUISpan fg={fgColor}>
        {bold === true ? <OTUIStrong>{children}</OTUIStrong> : children}
      </OTUISpan>
    </OTUIText>
  );
}

/**
 * TUI Button component - renders as bordered box with focus.
 * Note: OpenTUI's focusable is a getter-only property (no setter),
 * so we cannot pass it as a prop. Buttons are styled but not focusable.
 */
function TUIButton(props: ButtonProps<"tui">): React.ReactElement {
  const { label, disabled } = props;

  return (
    <box border borderStyle="single" paddingLeft={1} paddingRight={1}>
      <OTUIText>
        <OTUISpan fg={disabled === true ? TUIStyleSystem.getColor("muted") : undefined}>
          {label}
        </OTUISpan>
      </OTUIText>
    </box>
  );
}

/**
 * TUI Icon component - renders ASCII characters.
 */
function TUIIcon(props: IconProps): React.ReactElement {
  const { name, color } = props;
  const ascii = ICON_MAP[name] ?? "[ ]";
  const fgColor = color !== undefined ? TUIStyleSystem.getColor(color) : undefined;

  return (
    <OTUIText>
      <OTUISpan fg={fgColor}>{ascii}</OTUISpan>
    </OTUIText>
  );
}

/**
 * TUI ScrollView component - OpenTUI scrollable container.
 */
function TUIScrollView(props: ScrollViewProps): React.ReactElement {
  const { children, vertical = true, maxHeight } = props;

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      height={typeof maxHeight === "number" ? maxHeight : undefined}
      overflow={vertical ? "scroll" : undefined}
    >
      {children}
    </box>
  );
}

/**
 * TUI Divider component - box-drawing characters.
 */
function TUIDivider(props: DividerProps): React.ReactElement {
  const { orientation = "horizontal", color } = props;
  const fgColor =
    color !== undefined ? TUIStyleSystem.getColor(color) : TUIStyleSystem.getColor("border");
  const char = orientation === "horizontal" ? BOX_CHARS.horizontal : BOX_CHARS.vertical;

  return (
    <OTUIText>
      <OTUISpan fg={fgColor}>{orientation === "horizontal" ? char.repeat(40) : char}</OTUISpan>
    </OTUIText>
  );
}

// =============================================================================
// FlameGraph Helper Functions
// =============================================================================

/**
 * Get duration color based on threshold.
 */
function getDurationColor(durationMs: number, thresholdMs: number): SemanticColor {
  if (durationMs < thresholdMs / 2) return "success";
  if (durationMs < thresholdMs) return "warning";
  return "error";
}

/**
 * Render ASCII bar for flame frame.
 */
function renderFlameBar(widthPercent: number, maxWidth: number): string {
  const barWidth = Math.max(1, Math.floor(widthPercent * maxWidth));
  return "\u2588".repeat(barWidth);
}

// =============================================================================
// TUIFlameGraph Component - Full Implementation (Task 6.2)
// =============================================================================

/**
 * TUI FlameGraph component - ASCII horizontal bar representation.
 *
 * Renders a flame graph as ASCII horizontal bars with:
 * - Proportional widths based on duration
 * - Color coding with ANSI colors (green/yellow/red)
 * - Keyboard navigation support (up/down arrows)
 * - Selected frame highlighting
 *
 * @remarks
 * In TUI environments, selection is tracked via the view model's
 * selectedFrameId. The onFrameSelect callback can be used to
 * handle keyboard navigation events.
 */
function TUIFlameGraph(props: FlameGraphProps): React.ReactElement {
  const { viewModel, thresholdMs = 100 } = props;

  // Default max bar width (characters)
  const maxBarWidth = 50;

  // Handle empty flame graph
  if (viewModel.isEmpty || viewModel.frames.length === 0) {
    return (
      <box flexDirection="column" paddingTop={1} paddingBottom={1}>
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}>(no flame graph data)</OTUISpan>
        </OTUIText>
      </box>
    );
  }

  // Group frames by depth for rendering
  const framesByDepth: Map<number, FlameFrame[]> = new Map();
  for (const frame of viewModel.frames) {
    if (!frame.isInView) continue;
    const depthFrames = framesByDepth.get(frame.depth) ?? [];
    depthFrames.push(frame);
    framesByDepth.set(frame.depth, depthFrames);
  }

  // Sort depths for rendering (0 at top)
  const sortedDepths = Array.from(framesByDepth.keys()).sort((a, b) => a - b);

  return (
    <box flexDirection="column">
      {/* Header */}
      <OTUIText>
        <OTUISpan fg={TUIStyleSystem.getColor("primary")}>
          {OTUIStrong({ children: "Flame Graph" })}
        </OTUISpan>
        <OTUISpan fg={TUIStyleSystem.getColor("muted")}>
          {" "}
          ({viewModel.frameCount} frames, {viewModel.totalDuration.toFixed(2)}ms total)
        </OTUISpan>
      </OTUIText>

      {/* Divider */}
      <OTUIText>
        <OTUISpan fg={TUIStyleSystem.getColor("border")}>
          {BOX_CHARS.horizontal.repeat(maxBarWidth + 20)}
        </OTUISpan>
      </OTUIText>

      {/* Render each depth level */}
      {sortedDepths.map(depth => {
        const frames = framesByDepth.get(depth) ?? [];
        return (
          <box key={`depth-${depth}`} flexDirection="column">
            {frames.map(frame => {
              const isSelected = frame.id === viewModel.selectedFrameId;
              const durationColor = getDurationColor(frame.cumulativeTime, thresholdMs);
              const bar = renderFlameBar(frame.widthPercent, maxBarWidth);

              // Indentation based on start position
              const indent = " ".repeat(Math.floor(frame.startPercent * maxBarWidth));

              // Label color based on selection
              const labelColor = isSelected
                ? TUIStyleSystem.getColor("accent")
                : TUIStyleSystem.getColor("foreground");

              return (
                <OTUIText key={frame.id}>
                  <OTUISpan fg={TUIStyleSystem.getColor("border")}>{indent}</OTUISpan>
                  <OTUISpan fg={TUIStyleSystem.getColor(durationColor)}>{bar}</OTUISpan>
                  <OTUISpan fg={labelColor}>
                    {isSelected ? " > " : "   "}
                    {frame.label}
                  </OTUISpan>
                  <OTUISpan fg={TUIStyleSystem.getColor("muted")}>
                    {" "}
                    ({frame.cumulativeTime.toFixed(1)}ms, self: {frame.selfTime.toFixed(1)}ms)
                  </OTUISpan>
                </OTUIText>
              );
            })}
          </box>
        );
      })}

      {/* Navigation hint */}
      <box paddingTop={1}>
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}>
            {BOX_CHARS.arrow} Use arrow keys to navigate | Enter to select
          </OTUISpan>
        </OTUIText>
      </box>
    </box>
  );
}

// =============================================================================
// TUITimelineScrubber Component - Full Implementation (Task 6.3)
// =============================================================================

/**
 * TUI TimelineScrubber component - text-based timeline with markers.
 *
 * Renders a timeline for snapshot navigation with:
 * - Text-based timeline with position markers
 * - Bracket indicators for current position
 * - Number key navigation hints (1-9 for quick jump)
 * - Arrow key navigation hints (left/right)
 *
 * @remarks
 * In TUI environments, navigation is handled via keyboard events.
 * The component shows hints for available keyboard shortcuts.
 */
function TUITimelineScrubber(props: TimelineScrubberProps): React.ReactElement {
  const { snapshots, currentIndex, onCapture } = props;

  // Handle empty timeline
  if (snapshots.length === 0) {
    return (
      <box flexDirection="row" gap={1}>
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}>(no snapshots)</OTUISpan>
        </OTUIText>
        {onCapture !== undefined && (
          <OTUIText>
            <OTUISpan fg={TUIStyleSystem.getColor("primary")}>[c] capture</OTUISpan>
          </OTUIText>
        )}
      </box>
    );
  }

  // Build timeline visualization
  const maxMarkers = Math.min(snapshots.length, 9);
  const timelineWidth = 40;
  const markerSpacing = Math.max(1, Math.floor(timelineWidth / Math.max(1, snapshots.length - 1)));

  // Build timeline string with markers
  let timeline = "";
  for (let i = 0; i < snapshots.length && i < maxMarkers; i++) {
    const isCurrent = i === currentIndex;
    if (isCurrent) {
      timeline += `[${i + 1}]`;
    } else {
      timeline += ` ${i + 1} `;
    }
    if (i < snapshots.length - 1 && i < maxMarkers - 1) {
      timeline += BOX_CHARS.horizontal.repeat(Math.max(1, markerSpacing - 3));
    }
  }

  // If more snapshots than markers, show ellipsis
  if (snapshots.length > maxMarkers) {
    timeline += ` ... (${snapshots.length} total)`;
  }

  return (
    <box flexDirection="column" gap={0}>
      {/* Timeline bar */}
      <box flexDirection="row">
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("primary")}>Timeline: </OTUISpan>
          <OTUISpan fg={TUIStyleSystem.getColor("foreground")}>{timeline}</OTUISpan>
        </OTUIText>
      </box>

      {/* Current snapshot info */}
      <box flexDirection="row" gap={1}>
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("accent")}>
            [{currentIndex + 1}/{snapshots.length}]
          </OTUISpan>
        </OTUIText>
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("foreground")}>
            {snapshots[currentIndex]?.label ?? `Snapshot ${currentIndex + 1}`}
          </OTUISpan>
        </OTUIText>
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}>
            ({snapshots[currentIndex]?.serviceCount ?? 0} services)
          </OTUISpan>
        </OTUIText>
      </box>

      {/* Navigation hints */}
      <box flexDirection="row" gap={1}>
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}>
            {BOX_CHARS.arrow} &lt;/&gt; navigate | 1-9 jump
          </OTUISpan>
        </OTUIText>
        {onCapture !== undefined && (
          <OTUIText>
            <OTUISpan fg={TUIStyleSystem.getColor("muted")}>| [c] capture</OTUISpan>
          </OTUIText>
        )}
      </box>
    </box>
  );
}

// =============================================================================
// TUIDiffView Component - Full Implementation (Task 6.4)
// =============================================================================

/**
 * TUI DiffView component - text diff format with +/- prefixes.
 *
 * Renders snapshot comparison diff with:
 * - Text diff format with +/- prefixes
 * - ANSI color coding for additions (green), removals (red), changes (yellow)
 * - Summary counts at top
 * - Scrollable sections for long diffs
 *
 * @remarks
 * Supports filtering by addition/removal/change type via props.
 */
function TUIDiffView(props: DiffViewProps): React.ReactElement {
  const { viewModel, showAdditions = true, showRemovals = true, showChanges = true } = props;

  // Handle empty comparison
  if (viewModel.isEmpty || !viewModel.hasData) {
    return (
      <box flexDirection="column" paddingTop={1}>
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}>
            (no comparison data - select two snapshots to compare)
          </OTUISpan>
        </OTUIText>
      </box>
    );
  }

  // Calculate counts
  const addedCount = viewModel.addedServices.length;
  const removedCount = viewModel.removedServices.length;
  const changedCount = viewModel.changedServices.length;

  return (
    <box flexDirection="column">
      {/* Header */}
      <OTUIText>
        <OTUISpan fg={TUIStyleSystem.getColor("primary")}>
          {OTUIStrong({ children: "Diff View" })}
        </OTUISpan>
      </OTUIText>

      {/* Snapshot comparison header */}
      <box flexDirection="row" gap={1}>
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}>Comparing: </OTUISpan>
          <OTUISpan fg={TUIStyleSystem.getColor("foreground")}>
            {viewModel.leftSnapshot.label || viewModel.leftSnapshot.id}
          </OTUISpan>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}> vs </OTUISpan>
          <OTUISpan fg={TUIStyleSystem.getColor("foreground")}>
            {viewModel.rightSnapshot.label || viewModel.rightSnapshot.id}
          </OTUISpan>
        </OTUIText>
      </box>

      {/* Summary line */}
      <box flexDirection="row" gap={1}>
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("success")}>+{addedCount}</OTUISpan>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}> / </OTUISpan>
          <OTUISpan fg={TUIStyleSystem.getColor("error")}>-{removedCount}</OTUISpan>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}> / </OTUISpan>
          <OTUISpan fg={TUIStyleSystem.getColor("warning")}>~{changedCount}</OTUISpan>
        </OTUIText>
      </box>

      {/* Divider */}
      <OTUIText>
        <OTUISpan fg={TUIStyleSystem.getColor("border")}>
          {BOX_CHARS.horizontal.repeat(50)}
        </OTUISpan>
      </OTUIText>

      {/* Added services */}
      {showAdditions && addedCount > 0 && (
        <box flexDirection="column">
          <OTUIText>
            <OTUISpan fg={TUIStyleSystem.getColor("success")}>
              {OTUIStrong({ children: `+ Added (${addedCount})` })}
            </OTUISpan>
          </OTUIText>
          {viewModel.addedServices.map((serviceName: string) => (
            <OTUIText key={`add-${serviceName}`}>
              <OTUISpan fg={TUIStyleSystem.getColor("success")}>
                {"  + "}
                {serviceName}
              </OTUISpan>
            </OTUIText>
          ))}
        </box>
      )}

      {/* Removed services */}
      {showRemovals && removedCount > 0 && (
        <box flexDirection="column">
          <OTUIText>
            <OTUISpan fg={TUIStyleSystem.getColor("error")}>
              {OTUIStrong({ children: `- Removed (${removedCount})` })}
            </OTUISpan>
          </OTUIText>
          {viewModel.removedServices.map((serviceName: string) => (
            <OTUIText key={`rem-${serviceName}`}>
              <OTUISpan fg={TUIStyleSystem.getColor("error")}>
                {"  - "}
                {serviceName}
              </OTUISpan>
            </OTUIText>
          ))}
        </box>
      )}

      {/* Changed services */}
      {showChanges && changedCount > 0 && (
        <box flexDirection="column">
          <OTUIText>
            <OTUISpan fg={TUIStyleSystem.getColor("warning")}>
              {OTUIStrong({ children: `~ Changed (${changedCount})` })}
            </OTUISpan>
          </OTUIText>
          {viewModel.changedServices.map((diff: ServiceDiff) => (
            <OTUIText key={`chg-${diff.portName}`}>
              <OTUISpan fg={TUIStyleSystem.getColor("warning")}>
                {"  ~ "}
                {diff.portName}
              </OTUISpan>
              <OTUISpan fg={TUIStyleSystem.getColor("muted")}>
                {" "}
                ({diff.changeType}: {String(diff.leftValue)} {BOX_CHARS.arrow}{" "}
                {String(diff.rightValue)})
              </OTUISpan>
            </OTUIText>
          ))}
        </box>
      )}

      {/* No changes message */}
      {!viewModel.hasChanges && (
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}>(no differences found)</OTUISpan>
        </OTUIText>
      )}
    </box>
  );
}

// =============================================================================
// TUIContainerTree Component - Full Implementation (Task 6.5)
// =============================================================================

/**
 * Get phase color for container lifecycle phase.
 */
function getPhaseColor(phase: string | undefined): SemanticColor {
  switch (phase) {
    case "ready":
      return "success";
    case "initializing":
      return "primary";
    case "disposing":
      return "warning";
    case "disposed":
      return "error";
    default:
      return "muted";
  }
}

/**
 * TUI ContainerTree component - box-drawing tree structure.
 *
 * Renders container hierarchy as a tree with:
 * - Box-drawing characters for tree lines
 * - Bracket indicators for expanded/collapsed state
 * - Container phase shown inline with color coding
 * - Keyboard navigation support (j/k or arrows)
 *
 * @remarks
 * In TUI environments, navigation is handled via keyboard events.
 * The component provides visual hierarchy using Unicode box-drawing chars.
 */
function TUIContainerTree(props: ContainerTreeProps): React.ReactElement {
  const { viewModel, expandedIds } = props;

  // Handle empty tree
  if (viewModel.isEmpty || viewModel.containers.length === 0) {
    return (
      <box flexDirection="column" paddingTop={1}>
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}>(no containers)</OTUISpan>
        </OTUIText>
      </box>
    );
  }

  // Build tree prefix for each container
  function buildTreePrefix(container: ContainerNode, isLast: boolean): string {
    if (container.depth === 0) {
      return "";
    }

    // Build prefix based on depth
    let prefix = "";
    for (let i = 0; i < container.depth - 1; i++) {
      prefix += BOX_CHARS.vertical + "   ";
    }

    // Add final connector
    prefix += isLast ? BOX_CHARS.cornerBottomLeft : BOX_CHARS.teeRight;
    prefix += BOX_CHARS.horizontal + BOX_CHARS.horizontal + " ";

    return prefix;
  }

  // Determine if a container is last among its siblings
  function isLastSibling(container: ContainerNode): boolean {
    const siblings = viewModel.containers.filter(c => c.parentId === container.parentId);
    const siblingIndex = siblings.findIndex(c => c.id === container.id);
    return siblingIndex === siblings.length - 1;
  }

  return (
    <box flexDirection="column">
      {/* Header */}
      <OTUIText>
        <OTUISpan fg={TUIStyleSystem.getColor("primary")}>
          {OTUIStrong({ children: "Container Hierarchy" })}
        </OTUISpan>
        <OTUISpan fg={TUIStyleSystem.getColor("muted")}>
          {" "}
          ({viewModel.containerCount} containers)
        </OTUISpan>
      </OTUIText>

      {/* Divider */}
      <OTUIText>
        <OTUISpan fg={TUIStyleSystem.getColor("border")}>
          {BOX_CHARS.horizontal.repeat(50)}
        </OTUISpan>
      </OTUIText>

      {/* Tree nodes */}
      {viewModel.containers.map((container: ContainerNode) => {
        const isExpanded = expandedIds.includes(container.id);
        const hasChildren = container.childIds.length > 0;
        const phaseColor = getPhaseColor(container.phase);
        const isActive = container.id === viewModel.activeContainerId;
        const isLast = isLastSibling(container);
        const prefix = buildTreePrefix(container, isLast);

        // Expand/collapse indicator
        const expandIndicator = hasChildren ? (isExpanded ? "[-]" : "[+]") : "   ";

        return (
          <OTUIText key={container.id}>
            {/* Tree structure prefix */}
            <OTUISpan fg={TUIStyleSystem.getColor("border")}>{prefix}</OTUISpan>

            {/* Expand/collapse indicator */}
            <OTUISpan
              fg={
                hasChildren ? TUIStyleSystem.getColor("primary") : TUIStyleSystem.getColor("muted")
              }
            >
              {expandIndicator}
            </OTUISpan>

            {/* Container name */}
            <OTUISpan
              fg={
                isActive ? TUIStyleSystem.getColor("accent") : TUIStyleSystem.getColor("foreground")
              }
            >
              {isActive ? " > " : "   "}
              {container.name}
            </OTUISpan>

            {/* Phase badge */}
            <OTUISpan fg={TUIStyleSystem.getColor(phaseColor)}>
              {" [" + (container.phase ?? "unknown") + "]"}
            </OTUISpan>

            {/* Service count */}
            <OTUISpan fg={TUIStyleSystem.getColor("muted")}>
              {" (" + container.serviceCount + " services)"}
            </OTUISpan>
          </OTUIText>
        );
      })}

      {/* Navigation hint */}
      <box paddingTop={1}>
        <OTUIText>
          <OTUISpan fg={TUIStyleSystem.getColor("muted")}>
            {BOX_CHARS.arrow} j/k or arrows to navigate | Enter to select | Space to expand/collapse
          </OTUISpan>
        </OTUIText>
      </box>
    </box>
  );
}

// =============================================================================
// TUIPerformanceBadge Component - Full Implementation
// =============================================================================

/**
 * TUI PerformanceBadge component - colored duration text.
 *
 * Renders duration with color-coded performance indicator:
 * - Green: duration < threshold / 2 (fast)
 * - Yellow: duration < threshold (medium)
 * - Red: duration >= threshold (slow)
 */
function TUIPerformanceBadge(props: PerformanceBadgeProps): React.ReactElement {
  const { durationMs, thresholdMs = 100, showLabel = true } = props;

  const color = getDurationColor(durationMs, thresholdMs);

  return (
    <OTUIText>
      <OTUISpan fg={TUIStyleSystem.getColor(color)}>
        {showLabel ? `${durationMs.toFixed(2)}ms` : "\u25CF"}
      </OTUISpan>
    </OTUIText>
  );
}

// =============================================================================
// TUI Primitives Export
// =============================================================================

/**
 * Complete TUI primitives adapter implementing RenderPrimitives<'tui'>.
 *
 * All new primitives (FlameGraph, TimelineScrubber, DiffView, ContainerTree,
 * PerformanceBadge) are fully implemented with:
 * - ASCII/Unicode rendering for terminal environments
 * - ANSI color coding for semantic colors
 * - Keyboard navigation hints
 * - Box-drawing characters for visual hierarchy
 */
export const TUIPrimitives: RenderPrimitives<"tui"> = {
  rendererType: "tui",
  Box: TUIBox,
  Text: TUIText,
  Button: TUIButton,
  Icon: TUIIcon,
  ScrollView: TUIScrollView,
  Divider: TUIDivider,
  GraphRenderer: TUIGraphRenderer,
  // New primitives - Full implementations (Task Group 6)
  FlameGraph: TUIFlameGraph,
  TimelineScrubber: TUITimelineScrubber,
  DiffView: TUIDiffView,
  ContainerTree: TUIContainerTree,
  PerformanceBadge: TUIPerformanceBadge,
  styleSystem: TUIStyleSystem,
};
