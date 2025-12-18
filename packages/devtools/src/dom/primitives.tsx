/**
 * DOM Primitives - Browser-specific implementation of RenderPrimitives.
 *
 * This module provides React DOM components that implement the
 * RenderPrimitives interface for browser environments.
 *
 * @packageDocumentation
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
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
  TextVariant,
  IconName,
} from "../ports/render-primitives.port.js";
import type { FlameFrame } from "../view-models/flame-graph.vm.js";
import type { ContainerNode, ContainerPhase } from "../view-models/container-hierarchy.vm.js";
import { DOMGraphRenderer } from "./graph-renderer.js";

// =============================================================================
// Spacing Token to Pixel Mapping
// =============================================================================

/**
 * Enhanced spacing scale - more generous values for better breathing room.
 * Updated from the original tighter scale for improved visual comfort.
 */
const SPACING_PX: Record<SpacingToken, string> = {
  none: "0px",
  xs: "8px",     // More generous (was 6px)
  sm: "12px",    // More breathing room (was 10px)
  md: "20px",    // Enhanced standard padding (was 16px)
  lg: "28px",    // Larger section spacing (was 24px)
  xl: "40px",    // More dramatic large spacing (was 32px)
};

// =============================================================================
// Typography Variant Styles
// =============================================================================

/**
 * Enhanced typography variants with better visual hierarchy.
 * Updated for improved readability and distinction between text levels.
 */
const VARIANT_STYLES: Record<TextVariant, React.CSSProperties> = {
  body: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    fontFamily: "var(--hex-devtools-font-sans, Inter, -apple-system, system-ui, sans-serif)",
  },
  heading: {
    fontSize: 20,          // Larger for better hierarchy
    fontWeight: 600,
    lineHeight: 1.25,
    letterSpacing: "-0.01em",
    fontFamily: "var(--hex-devtools-font-sans, Inter, -apple-system, system-ui, sans-serif)",
  },
  subheading: {
    fontSize: 16,
    fontWeight: 600,       // Bolder for distinction
    lineHeight: 1.35,
    fontFamily: "var(--hex-devtools-font-sans, Inter, -apple-system, system-ui, sans-serif)",
  },
  caption: {
    fontSize: 12,
    fontWeight: 500,       // Slightly bolder for visibility
    lineHeight: 1.4,
    fontFamily: "var(--hex-devtools-font-sans, Inter, -apple-system, system-ui, sans-serif)",
  },
  code: {
    fontSize: 13,
    lineHeight: 1.5,
    fontFamily: "var(--hex-devtools-font-mono, ui-monospace, 'JetBrains Mono', 'Fira Code', monospace)",
  },
  label: {
    fontSize: 11,          // Slightly smaller for compactness
    fontWeight: 600,       // Bolder
    textTransform: "uppercase",
    letterSpacing: "0.05em",  // More letter spacing for readability
    fontFamily: "var(--hex-devtools-font-sans, Inter, -apple-system, system-ui, sans-serif)",
  },
};

// =============================================================================
// Icon Unicode Mappings
// =============================================================================

const ICON_UNICODE: Record<IconName, string> = {
  graph: "\u{1F4CA}",        // bar chart
  timeline: "\u{23F1}",       // stopwatch
  stats: "\u{1F4CA}",         // bar chart
  services: "\u{2630}",       // menu/hamburger
  inspector: "\u{1F50D}",     // magnifying glass
  "chevron-right": "\u{276F}", // >
  "chevron-down": "\u{2304}", // v
  close: "\u{2715}",          // x
  expand: "\u{2922}",         // expand
  collapse: "\u{2923}",       // collapse
  refresh: "\u{21BB}",        // refresh
  filter: "\u{1F50D}",        // filter
  search: "\u{1F50E}",        // search
  settings: "\u{2699}",       // gear
  singleton: "\u{25CF}",      // filled circle
  scoped: "\u{25CB}",         // empty circle
  transient: "\u{25E6}",      // bullet
  async: "\u{21BB}",          // async/cycle
  check: "\u{2713}",          // check mark
  error: "\u{2716}",          // heavy x
  pending: "\u{22EF}",        // ellipsis
  warning: "\u{26A0}",        // warning sign
  "arrow-right": "\u{2192}",  // right arrow
  scope: "\u{25CB}",          // empty circle
  "scope-active": "\u{25CF}", // filled circle
};

const ICON_SIZES: Record<"sm" | "md" | "lg", number> = {
  sm: 14,
  md: 18,
  lg: 24,
};

// =============================================================================
// DOMStyleSystem - CSS Custom Property Mappings
// =============================================================================

/**
 * DOM style system mapping semantic colors to CSS custom properties.
 */
export const DOMStyleSystem: StyleSystem = {
  getColor(color: SemanticColor): string {
    // Use the colors mapping to get the correct CSS variable name
    // This fixes the mismatch where "foreground" maps to --hex-devtools-text
    return this.colors[color] ?? `var(--hex-devtools-${color})`;
  },
  colors: {
    primary: "var(--hex-devtools-primary)",
    secondary: "var(--hex-devtools-accent)",
    success: "var(--hex-devtools-success)",
    warning: "var(--hex-devtools-warning)",
    error: "var(--hex-devtools-error)",
    muted: "var(--hex-devtools-text-muted)",
    foreground: "var(--hex-devtools-text)",
    background: "var(--hex-devtools-bg)",
    border: "var(--hex-devtools-border)",
    accent: "var(--hex-devtools-primary-hover)",
  },
};

// =============================================================================
// DOMBox Component
// =============================================================================

/**
 * DOM Box component - renders as a div with flexbox styles.
 *
 * Supports interactive states (cursor pointer, hover effect) when onClick is provided.
 */
function DOMBox(props: BoxProps<"dom">): React.ReactElement {
  const {
    children,
    display = "flex",
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
    onClick,
    className,
    style: customStyle,
    id,
    "data-testid": dataTestId,
  } = props;

  // Track hover state for interactive boxes
  const [isHovered, setIsHovered] = useState(false);

  const isClickable = onClick !== undefined;

  // Build semantic layout styles; allow customStyle to override defaults, and
  // only apply interactive padding/hover styles when clickable.
  const style: React.CSSProperties = {
    display,
    flexDirection,
    justifyContent,
    alignItems,
    ...(gap ? { gap: SPACING_PX[gap] } : {}),
    ...(padding ? { padding: SPACING_PX[padding] } : {}),
    ...(paddingX ? { paddingLeft: SPACING_PX[paddingX], paddingRight: SPACING_PX[paddingX] } : {}),
    ...(paddingY ? { paddingTop: SPACING_PX[paddingY], paddingBottom: SPACING_PX[paddingY] } : {}),
    flexGrow,
    flexShrink,
    width,
    height,
    ...customStyle,
    ...(isClickable
      ? {
          cursor: "pointer",
          ...(isHovered ? { backgroundColor: "rgba(255, 255, 255, 0.05)" } : {}),
          transition: "background-color 0.15s ease",
          borderRadius: 4,
        }
      : {}),
  };

  return (
    <div
      style={style}
      className={className}
      id={id}
      data-testid={dataTestId}
      onClick={onClick}
      onMouseEnter={isClickable ? () => setIsHovered(true) : undefined}
      onMouseLeave={isClickable ? () => setIsHovered(false) : undefined}
    >
      {children}
    </div>
  );
}

// =============================================================================
// DOMText Component
// =============================================================================

/**
 * DOM Text component - renders as a span with semantic color CSS variables.
 */
function DOMText(props: TextProps<"dom">): React.ReactElement {
  const {
    children,
    variant = "body",
    color,
    bold,
    truncate,
    className,
    style: customStyle,
    id,
    "data-testid": dataTestId,
  } = props;

  const variantStyles = VARIANT_STYLES[variant];
  const style: React.CSSProperties = {
    ...variantStyles,
    color: color ? DOMStyleSystem.getColor(color) : undefined,
    fontWeight: bold ? 700 : variantStyles.fontWeight,
    overflow: truncate ? "hidden" : undefined,
    textOverflow: truncate ? "ellipsis" : undefined,
    whiteSpace: truncate ? "nowrap" : undefined,
    ...customStyle,
  };

  return (
    <span style={style} className={className} id={id} data-testid={dataTestId}>
      {children}
    </span>
  );
}

// =============================================================================
// DOMButton Component
// =============================================================================

/**
 * DOM Button component - renders as a button element.
 */
function DOMButton(props: ButtonProps<"dom">): React.ReactElement {
  const {
    label,
    onClick,
    disabled,
    variant = "primary",
    size = "md",
    className,
    style: customStyle,
    id,
    "data-testid": dataTestId,
  } = props;

  const sizeStyles: Record<"sm" | "md" | "lg", React.CSSProperties> = {
    sm: { padding: "4px 8px", fontSize: 12 },
    md: { padding: "8px 16px", fontSize: 14 },
    lg: { padding: "12px 24px", fontSize: 16 },
  };

  const style: React.CSSProperties = {
    ...sizeStyles[size],
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    border: "1px solid",
    borderColor: DOMStyleSystem.getColor("border"),
    borderRadius: 4,
    background: variant === "ghost" ? "transparent" : DOMStyleSystem.getColor("background"),
    color: DOMStyleSystem.getColor("foreground"),
    ...customStyle,
  };

  return (
    <button
      style={style}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
      id={id}
      data-testid={dataTestId}
    >
      {label}
    </button>
  );
}

// =============================================================================
// DOMIcon Component
// =============================================================================

/**
 * DOM Icon component - renders unicode characters.
 */
function DOMIcon(props: IconProps): React.ReactElement {
  const { name, size = "md", color } = props;

  const style: React.CSSProperties = {
    fontSize: ICON_SIZES[size],
    color: color ? DOMStyleSystem.getColor(color) : undefined,
    display: "inline-block",
    lineHeight: 1,
  };

  return (
    <span style={style} data-icon={name} aria-hidden="true">
      {ICON_UNICODE[name]}
    </span>
  );
}

// =============================================================================
// DOMScrollView Component
// =============================================================================

/**
 * DOM ScrollView component - div with overflow styles.
 */
function DOMScrollView(props: ScrollViewProps): React.ReactElement {
  const { children, horizontal, vertical = true, maxHeight } = props;

  const style: React.CSSProperties = {
    overflowX: horizontal ? "auto" : "hidden",
    overflowY: vertical ? "auto" : "hidden",
    maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
  };

  return <div style={style}>{children}</div>;
}

// =============================================================================
// DOMDivider Component
// =============================================================================

/**
 * DOM Divider component - hr or styled div.
 */
function DOMDivider(props: DividerProps): React.ReactElement {
  const { orientation = "horizontal", color = "border" } = props;

  const style: React.CSSProperties = {
    backgroundColor: DOMStyleSystem.getColor(color),
    border: "none",
    margin: 0,
    ...(orientation === "horizontal"
      ? { height: 1, width: "100%" }
      : { width: 1, height: "100%", alignSelf: "stretch" }),
  };

  return <hr style={style} />;
}

// =============================================================================
// FlameGraph Constants
// =============================================================================

const FLAME_FRAME_HEIGHT = 24;
const FLAME_FRAME_PADDING = 2;
const FLAME_MIN_WIDTH = 4;
const DEFAULT_FLAME_GRAPH_WIDTH = 800;

/**
 * Get color for a frame based on its duration relative to threshold.
 */
function getFrameDurationColor(
  durationMs: number,
  thresholdMs: number
): SemanticColor {
  if (durationMs < thresholdMs / 2) return "success";
  if (durationMs < thresholdMs) return "warning";
  return "error";
}

// =============================================================================
// DOMFlameGraph Component
// =============================================================================

/**
 * DOM FlameGraph component - renders hierarchical performance data as SVG.
 *
 * Uses SVG for rendering flame frames with:
 * - Color coding by duration (green/yellow/red)
 * - Tooltip on hover with frame details
 * - Click interaction for frame selection
 * - Support for zoom/pan interactions
 */
function DOMFlameGraph(props: FlameGraphProps): React.ReactElement {
  const { viewModel, onFrameSelect, onZoomChange, thresholdMs = 100 } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredFrameId, setHoveredFrameId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(DEFAULT_FLAME_GRAPH_WIDTH);

  // Track container width for responsive rendering
  // Uses ResizeObserver when available, falls back to default width for test environments
  useEffect(() => {
    if (!containerRef.current) return;

    // Check if ResizeObserver is available (not in JSDOM/test environments)
    if (typeof ResizeObserver === "undefined") {
      // In test environments, just use the container's clientWidth or default
      const width = containerRef.current.clientWidth || DEFAULT_FLAME_GRAPH_WIDTH;
      setContainerWidth(width);
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width || DEFAULT_FLAME_GRAPH_WIDTH);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleFrameClick = useCallback(
    (frameId: string) => {
      onFrameSelect?.(frameId);
    },
    [onFrameSelect]
  );

  const handleFrameMouseEnter = useCallback(
    (frameId: string, event: React.MouseEvent) => {
      setHoveredFrameId(frameId);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    },
    []
  );

  const handleFrameMouseLeave = useCallback(() => {
    setHoveredFrameId(null);
    setTooltipPosition(null);
  }, []);

  const handleDoubleClick = useCallback(() => {
    // Reset zoom on double click
    onZoomChange?.({ start: 0, end: 1 });
  }, [onZoomChange]);

  // Calculate SVG dimensions
  const svgHeight = (viewModel.maxDepth + 1) * (FLAME_FRAME_HEIGHT + FLAME_FRAME_PADDING) + 20;
  const { zoomRange } = viewModel;
  const zoomScale = 1 / (zoomRange.end - zoomRange.start);

  // Get the hovered frame for tooltip
  const hoveredFrame = hoveredFrameId
    ? viewModel.frames.find((f) => f.id === hoveredFrameId)
    : null;

  // Render a single flame frame
  const renderFrame = (frame: FlameFrame): React.ReactElement | null => {
    // Calculate position and size
    const adjustedStart = (frame.startPercent - zoomRange.start) * zoomScale;
    const adjustedWidth = frame.widthPercent * zoomScale;

    // Skip if not in view
    if (adjustedStart + adjustedWidth < 0 || adjustedStart > 1) {
      return null;
    }

    const x = Math.max(0, adjustedStart * containerWidth);
    const width = Math.max(FLAME_MIN_WIDTH, adjustedWidth * containerWidth);
    const y = frame.depth * (FLAME_FRAME_HEIGHT + FLAME_FRAME_PADDING) + 10;

    const color = getFrameDurationColor(frame.cumulativeTime, thresholdMs);
    const isSelected = frame.id === viewModel.selectedFrameId;
    const isHovered = frame.id === hoveredFrameId;

    return (
      <g
        key={frame.id}
        data-frame-id={frame.id}
        onClick={() => handleFrameClick(frame.id)}
        onMouseEnter={(e) => handleFrameMouseEnter(frame.id, e)}
        onMouseLeave={handleFrameMouseLeave}
        style={{ cursor: "pointer" }}
      >
        <rect
          data-frame-id={frame.id}
          x={x}
          y={y}
          width={width - 1}
          height={FLAME_FRAME_HEIGHT}
          rx={2}
          ry={2}
          fill={DOMStyleSystem.getColor(color)}
          stroke={isSelected || isHovered ? DOMStyleSystem.getColor("accent") : "none"}
          strokeWidth={isSelected ? 2 : isHovered ? 1 : 0}
          opacity={frame.isInView ? 1 : 0.4}
          style={{ transition: "opacity 0.15s ease" }}
        />
        {width > 50 && (
          <text
            x={x + 4}
            y={y + FLAME_FRAME_HEIGHT / 2 + 4}
            fill={DOMStyleSystem.getColor("background")}
            fontSize={11}
            fontFamily="var(--hex-devtools-font-mono, monospace)"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {frame.label.length > (width - 8) / 7
              ? frame.label.slice(0, Math.floor((width - 16) / 7)) + "..."
              : frame.label}
          </text>
        )}
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      data-testid="flame-graph"
      style={{
        position: "relative",
        width: "100%",
        minHeight: 100,
        backgroundColor: DOMStyleSystem.getColor("background"),
        border: `1px solid ${DOMStyleSystem.getColor("border")}`,
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      {viewModel.isEmpty ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 100,
            color: DOMStyleSystem.getColor("muted"),
          }}
        >
          No trace data available
        </div>
      ) : (
        <svg
          width="100%"
          height={svgHeight}
          onDoubleClick={handleDoubleClick}
          style={{ display: "block" }}
        >
          {viewModel.frames.map(renderFrame)}
        </svg>
      )}

      {/* Tooltip */}
      {hoveredFrame && tooltipPosition && (
        <div
          data-testid="flame-tooltip"
          style={{
            position: "fixed",
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y + 10,
            backgroundColor: DOMStyleSystem.getColor("background"),
            border: `1px solid ${DOMStyleSystem.getColor("border")}`,
            borderRadius: 4,
            padding: "8px 12px",
            fontSize: 12,
            fontFamily: "var(--hex-devtools-font-mono, monospace)",
            color: DOMStyleSystem.getColor("foreground"),
            zIndex: 1000,
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{hoveredFrame.label}</div>
          <div>
            <span style={{ color: DOMStyleSystem.getColor("muted") }}>Cumulative: </span>
            {hoveredFrame.cumulativeTime.toFixed(2)}ms
          </div>
          <div>
            <span style={{ color: DOMStyleSystem.getColor("muted") }}>Self: </span>
            {hoveredFrame.selfTime.toFixed(2)}ms
          </div>
          <div>
            <span style={{ color: DOMStyleSystem.getColor("muted") }}>Depth: </span>
            {hoveredFrame.depth}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DOMTimelineScrubber Component
// =============================================================================

/**
 * DOM TimelineScrubber component - renders timeline for snapshot navigation.
 *
 * Features:
 * - Render snapshot markers on timeline
 * - Draggable scrubber handle
 * - Click-to-navigate functionality
 * - Current position indicator
 */
function DOMTimelineScrubber(props: TimelineScrubberProps): React.ReactElement {
  const { snapshots, currentIndex, onNavigate, onCapture } = props;
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMarkerClick = useCallback(
    (index: number) => {
      onNavigate(index);
    },
    [onNavigate]
  );

  const handleTimelineClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current || snapshots.length === 0) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newIndex = Math.round(percentage * (snapshots.length - 1));
      onNavigate(Math.max(0, Math.min(snapshots.length - 1, newIndex)));
    },
    [onNavigate, snapshots.length]
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!timelineRef.current || snapshots.length === 0) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      const newIndex = Math.round(percentage * (snapshots.length - 1));
      onNavigate(Math.max(0, Math.min(snapshots.length - 1, newIndex)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onNavigate, snapshots.length]);

  const currentPosition =
    snapshots.length > 1 ? currentIndex / (snapshots.length - 1) : 0.5;

  return (
    <div
      data-testid="timeline-scrubber"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        backgroundColor: DOMStyleSystem.getColor("background"),
        border: `1px solid ${DOMStyleSystem.getColor("border")}`,
        borderRadius: 4,
      }}
    >
      {/* Timeline track */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        style={{
          position: "relative",
          height: 32,
          backgroundColor: DOMStyleSystem.getColor("muted"),
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        {/* Snapshot markers */}
        {snapshots.map((snapshot, index) => {
          const position = snapshots.length > 1 ? index / (snapshots.length - 1) : 0.5;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={snapshot.id}
              data-snapshot-marker
              data-current={isCurrent}
              onClick={(e) => {
                e.stopPropagation();
                handleMarkerClick(index);
              }}
              style={{
                position: "absolute",
                left: `${position * 100}%`,
                top: 4,
                transform: "translateX(-50%)",
                width: 8,
                height: 24,
                backgroundColor: isCurrent
                  ? DOMStyleSystem.getColor("accent")
                  : DOMStyleSystem.getColor("border"),
                borderRadius: 2,
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              title={`${snapshot.label} (${new Date(snapshot.timestamp).toLocaleTimeString()})`}
            />
          );
        })}

        {/* Current position indicator (draggable scrubber) */}
        {snapshots.length > 0 && (
          <div
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            data-current="true"
            style={{
              position: "absolute",
              left: `${currentPosition * 100}%`,
              top: -4,
              transform: "translateX(-50%)",
              width: 16,
              height: 40,
              backgroundColor: DOMStyleSystem.getColor("primary"),
              borderRadius: 4,
              cursor: isDragging ? "grabbing" : "grab",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              zIndex: 10,
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0 || snapshots.length === 0}
            style={{
              padding: "4px 12px",
              backgroundColor: DOMStyleSystem.getColor("background"),
              border: `1px solid ${DOMStyleSystem.getColor("border")}`,
              borderRadius: 4,
              color: DOMStyleSystem.getColor("foreground"),
              cursor: currentIndex === 0 ? "not-allowed" : "pointer",
              opacity: currentIndex === 0 ? 0.5 : 1,
            }}
          >
            Prev
          </button>
          <button
            onClick={() => onNavigate(Math.min(snapshots.length - 1, currentIndex + 1))}
            disabled={currentIndex >= snapshots.length - 1 || snapshots.length === 0}
            style={{
              padding: "4px 12px",
              backgroundColor: DOMStyleSystem.getColor("background"),
              border: `1px solid ${DOMStyleSystem.getColor("border")}`,
              borderRadius: 4,
              color: DOMStyleSystem.getColor("foreground"),
              cursor: currentIndex >= snapshots.length - 1 ? "not-allowed" : "pointer",
              opacity: currentIndex >= snapshots.length - 1 ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>

        <span
          style={{
            color: DOMStyleSystem.getColor("foreground"),
            fontSize: 13,
            fontFamily: "var(--hex-devtools-font-mono, monospace)",
          }}
        >
          {snapshots.length > 0
            ? `${currentIndex + 1} / ${snapshots.length}`
            : "No snapshots"}
        </span>

        {onCapture && (
          <button
            onClick={onCapture}
            style={{
              padding: "4px 12px",
              backgroundColor: DOMStyleSystem.getColor("primary"),
              border: "none",
              borderRadius: 4,
              color: DOMStyleSystem.getColor("background"),
              cursor: "pointer",
            }}
          >
            Capture
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// DOMDiffView Component
// =============================================================================

/**
 * DOM DiffView component - renders snapshot comparison diff.
 *
 * Features:
 * - Side-by-side diff layout
 * - Color-coded additions (green), removals (red), changes (yellow)
 * - Collapsible sections for each diff type
 * - Service name click navigation
 */
function DOMDiffView(props: DiffViewProps): React.ReactElement {
  const {
    viewModel,
    onServiceSelect,
    showAdditions = true,
    showRemovals = true,
    showChanges = true,
  } = props;
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["added", "removed", "changed"])
  );

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const handleServiceClick = useCallback(
    (serviceName: string) => {
      onServiceSelect?.(serviceName);
    },
    [onServiceSelect]
  );

  const renderServiceLink = (serviceName: string, color: SemanticColor) => (
    <div
      key={serviceName}
      data-service-name={serviceName}
      onClick={() => handleServiceClick(serviceName)}
      style={{
        padding: "4px 8px",
        cursor: onServiceSelect ? "pointer" : "default",
        color: DOMStyleSystem.getColor(color),
        fontFamily: "var(--hex-devtools-font-mono, monospace)",
        fontSize: 13,
        borderRadius: 2,
        transition: "background-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${DOMStyleSystem.getColor("border")}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {serviceName}
    </div>
  );

  const renderSection = (
    type: "added" | "removed" | "changed",
    title: string,
    color: SemanticColor,
    items: readonly string[],
    showCondition: boolean
  ) => {
    if (!showCondition || items.length === 0) return null;

    const isExpanded = expandedSections.has(type);

    return (
      <div
        key={type}
        data-diff-type={type}
        style={{
          marginBottom: 12,
          border: `1px solid ${DOMStyleSystem.getColor("border")}`,
          borderRadius: 4,
          overflow: "hidden",
          backgroundColor: DOMStyleSystem.getColor(color),
        }}
      >
        <div
          onClick={() => toggleSection(type)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            backgroundColor: DOMStyleSystem.getColor(color),
            cursor: "pointer",
          }}
        >
          <span
            style={{
              color: DOMStyleSystem.getColor("background"),
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {title} ({items.length})
          </span>
          <span style={{ color: DOMStyleSystem.getColor("background") }}>
            {isExpanded ? "\u25BC" : "\u25B6"}
          </span>
        </div>
        {isExpanded && (
          <div
            style={{
              padding: 8,
              backgroundColor: DOMStyleSystem.getColor("background"),
            }}
          >
            {items.map((item) => renderServiceLink(item, color))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-testid="diff-view"
      style={{
        padding: 12,
        backgroundColor: DOMStyleSystem.getColor("background"),
        border: `1px solid ${DOMStyleSystem.getColor("border")}`,
        borderRadius: 4,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: `1px solid ${DOMStyleSystem.getColor("border")}`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span
            style={{
              color: DOMStyleSystem.getColor("muted"),
              fontSize: 11,
              textTransform: "uppercase",
            }}
          >
            Left
          </span>
          <span
            style={{
              color: DOMStyleSystem.getColor("foreground"),
              fontWeight: 600,
            }}
          >
            {viewModel.leftSnapshot.label || viewModel.leftSnapshot.id}
          </span>
        </div>
        <span
          style={{
            color: DOMStyleSystem.getColor("muted"),
            fontSize: 18,
          }}
        >
          vs
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            textAlign: "right",
          }}
        >
          <span
            style={{
              color: DOMStyleSystem.getColor("muted"),
              fontSize: 11,
              textTransform: "uppercase",
            }}
          >
            Right
          </span>
          <span
            style={{
              color: DOMStyleSystem.getColor("foreground"),
              fontWeight: 600,
            }}
          >
            {viewModel.rightSnapshot.label || viewModel.rightSnapshot.id}
          </span>
        </div>
      </div>

      {/* Diff sections */}
      {viewModel.isEmpty ? (
        <div
          style={{
            textAlign: "center",
            padding: 24,
            color: DOMStyleSystem.getColor("muted"),
          }}
        >
          No snapshots to compare
        </div>
      ) : !viewModel.hasChanges ? (
        <div
          style={{
            textAlign: "center",
            padding: 24,
            color: DOMStyleSystem.getColor("success"),
          }}
        >
          No differences found
        </div>
      ) : (
        <>
          {renderSection(
            "added",
            "Added Services",
            "success",
            viewModel.addedServices,
            showAdditions
          )}
          {renderSection(
            "removed",
            "Removed Services",
            "error",
            viewModel.removedServices,
            showRemovals
          )}
          {renderSection(
            "changed",
            "Changed Services",
            "warning",
            viewModel.changedServices.map((s) => s.portName),
            showChanges
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// DOMContainerTree Component
// =============================================================================

/**
 * Get phase badge color.
 */
function getPhaseColor(phase: ContainerPhase | undefined): SemanticColor {
  switch (phase) {
    case "ready":
      return "success";
    case "initializing":
      return "warning";
    case "disposing":
      return "warning";
    case "disposed":
      return "muted";
    default:
      return "muted";
  }
}

/**
 * DOM ContainerTree component - renders container hierarchy.
 *
 * Features:
 * - Expandable/collapsible tree nodes
 * - Container phase badges (initializing/ready/disposing/disposed)
 * - Click to select container
 * - Visual hierarchy with indentation
 */
function DOMContainerTree(props: ContainerTreeProps): React.ReactElement {
  const { viewModel, onContainerSelect, expandedIds, onToggleExpand } = props;

  const renderContainerNode = (container: ContainerNode): React.ReactElement => {
    const isExpanded = expandedIds.includes(container.id);
    const hasChildren = container.childIds.length > 0;
    const phaseColor = getPhaseColor(container.phase);

    return (
      <div
        key={container.id}
        data-container-id={container.id}
        data-depth={container.depth}
        style={{
          paddingLeft: container.depth * 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 4,
            backgroundColor: container.isActive
              ? `${DOMStyleSystem.getColor("accent")}20`
              : "transparent",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!container.isActive) {
              e.currentTarget.style.backgroundColor = `${DOMStyleSystem.getColor("border")}`;
            }
          }}
          onMouseLeave={(e) => {
            if (!container.isActive) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          {/* Expand/collapse toggle */}
          {hasChildren ? (
            <span
              data-toggle-expand
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(container.id);
              }}
              style={{
                width: 16,
                height: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: DOMStyleSystem.getColor("muted"),
                fontSize: 10,
                userSelect: "none",
              }}
            >
              {isExpanded ? "\u25BC" : "\u25B6"}
            </span>
          ) : (
            <span style={{ width: 16 }} />
          )}

          {/* Container name */}
          <span
            data-container-name
            onClick={() => onContainerSelect(container.id)}
            style={{
              flex: 1,
              cursor: "pointer",
              color: container.isActive
                ? DOMStyleSystem.getColor("accent")
                : DOMStyleSystem.getColor("foreground"),
              fontWeight: container.isActive ? 600 : 400,
              fontFamily: "var(--hex-devtools-font-mono, monospace)",
              fontSize: 13,
            }}
          >
            {container.name}
          </span>

          {/* Service count */}
          <span
            style={{
              color: DOMStyleSystem.getColor("muted"),
              fontSize: 11,
            }}
          >
            {container.serviceCount} services
          </span>

          {/* Phase badge */}
          {container.phase && (
            <span
              data-phase={container.phase}
              style={{
                padding: "2px 6px",
                borderRadius: 4,
                backgroundColor: DOMStyleSystem.getColor(phaseColor),
                color: DOMStyleSystem.getColor("background"),
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              {container.phase}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Build a flat list of containers in tree order
  const renderContainers = (): React.ReactElement[] => {
    const result: React.ReactElement[] = [];
    const rendered = new Set<string>();

    const renderSubtree = (containerId: string) => {
      if (rendered.has(containerId)) return;
      rendered.add(containerId);

      const container = viewModel.containers.find((c) => c.id === containerId);
      if (!container) return;

      result.push(renderContainerNode(container));

      // Render children if expanded
      if (expandedIds.includes(containerId)) {
        for (const childId of container.childIds) {
          renderSubtree(childId);
        }
      }
    };

    // Start with root containers (those without parents)
    const rootContainers = viewModel.containers.filter((c) => c.parentId === null);
    for (const root of rootContainers) {
      renderSubtree(root.id);
    }

    // Render any remaining containers not in the tree
    for (const container of viewModel.containers) {
      if (!rendered.has(container.id)) {
        result.push(renderContainerNode(container));
      }
    }

    return result;
  };

  return (
    <div
      data-testid="container-tree"
      style={{
        padding: 8,
        backgroundColor: DOMStyleSystem.getColor("background"),
        border: `1px solid ${DOMStyleSystem.getColor("border")}`,
        borderRadius: 4,
      }}
    >
      {viewModel.isEmpty ? (
        <div
          style={{
            textAlign: "center",
            padding: 24,
            color: DOMStyleSystem.getColor("muted"),
          }}
        >
          No containers found
        </div>
      ) : (
        renderContainers()
      )}
    </div>
  );
}

// =============================================================================
// DOMPerformanceBadge Component
// =============================================================================

/**
 * DOM PerformanceBadge component - renders duration with color coding.
 *
 * Color coding based on threshold:
 * - Green: duration < threshold / 2
 * - Yellow: duration < threshold
 * - Red: duration >= threshold
 */
function DOMPerformanceBadge(props: PerformanceBadgeProps): React.ReactElement {
  const { durationMs, thresholdMs = 100, showLabel = true, size = "md" } = props;

  const getColor = (): SemanticColor => {
    if (durationMs < thresholdMs / 2) return "success";
    if (durationMs < thresholdMs) return "warning";
    return "error";
  };

  const sizeStyles: Record<"sm" | "md" | "lg", React.CSSProperties> = {
    sm: { fontSize: 10, padding: "1px 4px" },
    md: { fontSize: 12, padding: "2px 6px" },
    lg: { fontSize: 14, padding: "4px 8px" },
  };

  return (
    <span
      data-testid="performance-badge"
      style={{
        ...sizeStyles[size],
        display: "inline-block",
        backgroundColor: DOMStyleSystem.getColor(getColor()),
        color: DOMStyleSystem.getColor("background"),
        borderRadius: 4,
        fontFamily: "var(--hex-devtools-font-mono, monospace)",
        fontWeight: 500,
      }}
    >
      {showLabel ? `${durationMs.toFixed(2)}ms` : "\u25CF"}
    </span>
  );
}

// =============================================================================
// DOMPrimitives Export
// =============================================================================

/**
 * Complete DOM primitives implementation.
 *
 * This object implements the RenderPrimitives interface for browser
 * environments using React DOM components with CSS styling.
 */
export const DOMPrimitives: RenderPrimitives<"dom"> = {
  rendererType: "dom",
  Box: DOMBox,
  Text: DOMText,
  Button: DOMButton,
  Icon: DOMIcon,
  ScrollView: DOMScrollView,
  Divider: DOMDivider,
  GraphRenderer: DOMGraphRenderer,
  // New primitives (Task Group 5)
  FlameGraph: DOMFlameGraph,
  TimelineScrubber: DOMTimelineScrubber,
  DiffView: DOMDiffView,
  ContainerTree: DOMContainerTree,
  PerformanceBadge: DOMPerformanceBadge,
  styleSystem: DOMStyleSystem,
};
