/**
 * RenderPrimitivesPort - Platform-agnostic UI primitive abstraction.
 *
 * This port enables shared headless components to render in both
 * browser (DOM) and terminal (TUI) environments through a common
 * primitive component interface.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import type { RendererType } from "../shared/renderer-type.js";

// =============================================================================
// Re-export RendererType for convenience
// =============================================================================

export type { RendererType } from "../shared/renderer-type.js";

// =============================================================================
// Graph View Model Types (minimal subset for GraphRenderer)
// =============================================================================

/**
 * Minimal node structure for graph rendering.
 *
 * @remarks
 * This is a simplified view of the full GraphNodeViewModel from devtools-ui.
 * The full type will be imported when view models are consolidated in Phase 3.
 */
export interface GraphNodeViewModelMinimal {
  readonly id: string;
  readonly label: string;
  readonly lifetime: "singleton" | "scoped" | "transient";
  readonly factoryKind: "sync" | "async";
  readonly position: { readonly x: number; readonly y: number };
  readonly dimensions: { readonly width: number; readonly height: number };
  readonly isSelected: boolean;
  readonly isHighlighted: boolean;
  readonly isDimmed: boolean;
}

/**
 * Minimal edge structure for graph rendering.
 */
export interface GraphEdgeViewModelMinimal {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly isHighlighted: boolean;
  readonly isDimmed: boolean;
}

/**
 * Minimal graph view model for GraphRenderer props.
 *
 * @remarks
 * This is a simplified interface for the GraphRenderer primitive.
 * The full GraphViewModel type provides additional properties for
 * advanced features like zooming, panning, and direction control.
 */
export interface GraphViewModelMinimal {
  readonly nodes: readonly GraphNodeViewModelMinimal[];
  readonly edges: readonly GraphEdgeViewModelMinimal[];
  readonly direction: "TB" | "BT" | "LR" | "RL";
  readonly viewport: {
    readonly width: number;
    readonly height: number;
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
  readonly selectedNodeId: string | null;
  readonly highlightedNodeIds: readonly string[];
  readonly zoom: number;
  readonly panOffset: { readonly x: number; readonly y: number };
  readonly isEmpty: boolean;
  readonly nodeCount: number;
  readonly edgeCount: number;
}

// =============================================================================
// Semantic Color System
// =============================================================================

/**
 * Semantic color tokens for cross-platform theming.
 *
 * These tokens map to platform-specific colors:
 * - DOM: CSS custom properties (--hex-devtools-*)
 * - TUI: ANSI escape codes
 *
 * @remarks
 * The 10 colors provide a complete palette for DevTools UI:
 * - `primary`: Main brand/action color
 * - `secondary`: Secondary information
 * - `success`: Positive states (resolved, connected)
 * - `warning`: Caution states (pending, slow)
 * - `error`: Error states (failed, disconnected)
 * - `muted`: De-emphasized text
 * - `foreground`: Primary text color
 * - `background`: Surface background
 * - `border`: Divider/outline color
 * - `accent`: Highlighted elements
 */
export type SemanticColor =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "muted"
  | "foreground"
  | "background"
  | "border"
  | "accent";

/**
 * Style system interface for semantic color resolution.
 *
 * Provides methods to resolve semantic colors to platform-specific values.
 */
export interface StyleSystem {
  /**
   * Get the platform-specific color value for a semantic color.
   *
   * @param color - The semantic color token
   * @returns Platform-specific color value (CSS value or ANSI code)
   */
  getColor(color: SemanticColor): string;

  /**
   * All available semantic colors.
   */
  readonly colors: {
    readonly [K in SemanticColor]: string;
  };
}

// =============================================================================
// Spacing System
// =============================================================================

/**
 * Spacing tokens for cross-platform consistent spacing.
 *
 * Maps to specific pixel/unit values per platform:
 * - DOM: pixel values (xs=4, sm=8, md=16, lg=24, xl=32)
 * - TUI: character/line units
 */
export type SpacingToken = "none" | "xs" | "sm" | "md" | "lg" | "xl";

// =============================================================================
// Layout Props (Yoga-based Flexbox)
// =============================================================================

/**
 * Yoga-based flexbox layout properties.
 *
 * These props map to CSS flexbox in DOM and OpenTUI flex in TUI.
 * Limited to the most commonly used properties for simplicity.
 */
export interface LayoutProps {
  /** Display mode (flex is default) */
  readonly display?: "flex" | "none";
  /** Main axis direction */
  readonly flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  /** Main axis alignment */
  readonly justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around";
  /** Cross axis alignment */
  readonly alignItems?: "flex-start" | "flex-end" | "center" | "stretch";
  /** Gap between children */
  readonly gap?: SpacingToken;
  /** Padding (all sides) */
  readonly padding?: SpacingToken;
  /** Horizontal padding */
  readonly paddingX?: SpacingToken;
  /** Vertical padding */
  readonly paddingY?: SpacingToken;
  /** Flex grow factor */
  readonly flexGrow?: number;
  /** Flex shrink factor */
  readonly flexShrink?: number;
  /** Width (for fixed-size elements) */
  readonly width?: number | "auto" | "100%";
  /** Height (for fixed-size elements) */
  readonly height?: number | "auto" | "100%";
}

// =============================================================================
// Conditional Props Types (DOM-only vs TUI-only)
// =============================================================================

/**
 * DOM-only props for browser-specific attributes.
 *
 * These props are only available when the renderer type is 'dom'.
 */
export interface DOMOnlyProps {
  /** CSS class name for additional styling */
  readonly className?: string;
  /** Inline CSS styles */
  readonly style?: React.CSSProperties;
  /** HTML id attribute for DOM targeting */
  readonly id?: string;
  /** Test id for testing library queries */
  readonly "data-testid"?: string;
}

/**
 * TUI-only props for terminal-specific attributes.
 *
 * These props are only available when the renderer type is 'tui'.
 */
export interface TUIOnlyProps {
  /** Whether the element can receive focus */
  readonly focusable?: boolean;
  /** Border title for boxed elements */
  readonly title?: string;
  /** Title alignment within the border */
  readonly titleAlignment?: "left" | "center" | "right";
}

/**
 * Conditional type that resolves to renderer-specific props.
 *
 * @typeParam R - The renderer type ('dom' | 'tui')
 * @returns DOMOnlyProps for 'dom', TUIOnlyProps for 'tui'
 *
 * @example
 * ```typescript
 * // DOM context
 * type DOMProps = RendererSpecificProps<'dom'>;
 * // DOMProps = DOMOnlyProps
 *
 * // TUI context
 * type TUIProps = RendererSpecificProps<'tui'>;
 * // TUIProps = TUIOnlyProps
 * ```
 */
export type RendererSpecificProps<R extends RendererType> = R extends "dom"
  ? DOMOnlyProps
  : R extends "tui"
    ? TUIOnlyProps
    : never;

// =============================================================================
// Base Props (shared across all component types)
// =============================================================================

/**
 * Base box props without renderer-specific properties.
 */
interface BoxPropsBase extends LayoutProps {
  /** Child elements */
  readonly children?: React.ReactNode;
  /** Click handler */
  readonly onClick?: () => void;
}

/**
 * Base text props without renderer-specific properties.
 */
interface TextPropsBase {
  /** Text content */
  readonly children?: React.ReactNode;
  /** Typography variant */
  readonly variant?: TextVariant;
  /** Text color using semantic tokens */
  readonly color?: SemanticColor;
  /** Whether text should be bold */
  readonly bold?: boolean;
  /** Whether text should truncate with ellipsis */
  readonly truncate?: boolean;
}

/**
 * Base button props without renderer-specific properties.
 */
interface ButtonPropsBase {
  /** Button text */
  readonly label: string;
  /** Click handler */
  readonly onClick?: () => void;
  /** Whether button is disabled */
  readonly disabled?: boolean;
  /** Button visual variant */
  readonly variant?: "primary" | "secondary" | "ghost";
  /** Button size */
  readonly size?: "sm" | "md" | "lg";
}

// =============================================================================
// Primitive Component Prop Interfaces
// =============================================================================

/**
 * Props for the Box primitive component.
 *
 * Box is the fundamental layout container. In DOM it renders as a
 * flexbox div, in TUI as an OpenTUI box element.
 *
 * @typeParam R - The renderer type ('dom' | 'tui')
 */
export type BoxProps<R extends RendererType> = BoxPropsBase &
  RendererSpecificProps<R>;

/**
 * Text variant for typography.
 */
export type TextVariant =
  | "body"
  | "heading"
  | "subheading"
  | "caption"
  | "code"
  | "label";

/**
 * Props for the Text primitive component.
 *
 * Text displays styled text content. In DOM it renders as a span
 * with CSS, in TUI as ANSI-colored text.
 *
 * @typeParam R - The renderer type ('dom' | 'tui')
 */
export type TextProps<R extends RendererType> = TextPropsBase &
  RendererSpecificProps<R>;

/**
 * Props for the Button primitive component.
 *
 * Button provides an interactive element. In DOM it renders as a
 * button element, in TUI as a bordered box with focus handling.
 *
 * @typeParam R - The renderer type ('dom' | 'tui')
 */
export type ButtonProps<R extends RendererType> = ButtonPropsBase &
  RendererSpecificProps<R>;

/**
 * Available icon names for the Icon primitive.
 */
export type IconName =
  | "graph"
  | "timeline"
  | "stats"
  | "services"
  | "inspector"
  | "chevron-right"
  | "chevron-down"
  | "close"
  | "expand"
  | "collapse"
  | "refresh"
  | "filter"
  | "search"
  | "settings"
  | "singleton"
  | "scoped"
  | "transient"
  | "async"
  | "check"
  | "error"
  | "pending"
  | "warning"
  | "arrow-right"
  | "scope"
  | "scope-active";

/**
 * Props for the Icon primitive component.
 *
 * Icon displays semantic icons. In DOM it renders as Unicode or SVG,
 * in TUI as ASCII characters like [G], ->, etc.
 *
 * @remarks
 * Icon props are renderer-agnostic as the visual representation
 * is entirely determined by the adapter implementation.
 */
export interface IconProps {
  /** Icon identifier */
  readonly name: IconName;
  /** Icon size (maps to pixels in DOM, ignored in TUI) */
  readonly size?: "sm" | "md" | "lg";
  /** Icon color using semantic tokens */
  readonly color?: SemanticColor;
}

/**
 * Props for the ScrollView primitive component.
 *
 * ScrollView provides scrollable content areas. In DOM it renders
 * as a div with overflow, in TUI as an OpenTUI scrollable container.
 */
export interface ScrollViewProps {
  /** Child elements */
  readonly children?: React.ReactNode;
  /** Enable horizontal scrolling */
  readonly horizontal?: boolean;
  /** Enable vertical scrolling (default: true) */
  readonly vertical?: boolean;
  /** Maximum height before scrolling */
  readonly maxHeight?: number | string;
}

/**
 * Props for the Divider primitive component.
 *
 * Divider provides visual separation. In DOM it renders as an hr
 * or styled div, in TUI as box-drawing characters.
 */
export interface DividerProps {
  /** Divider orientation */
  readonly orientation?: "horizontal" | "vertical";
  /** Divider color using semantic tokens */
  readonly color?: SemanticColor;
}

/**
 * Event emitted when a node is selected in the graph.
 */
export interface NodeSelectEvent {
  /** The ID of the selected node */
  readonly nodeId: string;
  /** Position of the click/selection */
  readonly position?: { readonly x: number; readonly y: number };
}

/**
 * Props for the GraphRenderer primitive component.
 *
 * GraphRenderer displays the dependency graph. In DOM it uses D3/SVG
 * with dagre layout, in TUI it uses ASCII art with tree layout.
 */
export interface GraphRendererProps {
  /** The graph view model to render */
  readonly viewModel: GraphViewModelMinimal;
  /** Callback when a node is selected */
  readonly onNodeSelect?: ((event: NodeSelectEvent) => void) | undefined;
  /** Callback when a node is hovered */
  readonly onNodeHover?: ((nodeId: string | null) => void) | undefined;
  /** Whether to fit graph to view on render */
  readonly fitToView?: boolean | undefined;
}

// =============================================================================
// View Model Type Imports
// =============================================================================

/**
 * Import view model types from the view-models module for use in primitive props.
 *
 * These types are the canonical definitions for DevTools view models.
 * We import them here for use in prop interfaces and re-export for consumers.
 */
import type {
  FlameFrame as FlameFrameType,
  ZoomRange as ZoomRangeType,
  FlameGraphViewModel as FlameGraphViewModelType,
} from "../view-models/flame-graph.vm.js";

import type {
  SnapshotSummary as SnapshotSummaryType,
  ServiceDiff as ServiceDiffType,
  ComparisonViewModel as ComparisonViewModelType,
} from "../view-models/comparison.vm.js";

import type {
  ContainerPhase as ContainerPhaseType,
  ContainerNode as ContainerNodeType,
  ContainerHierarchyViewModel as ContainerHierarchyViewModelType,
} from "../view-models/container-hierarchy.vm.js";

/**
 * Re-export view model types for external consumers.
 */
export type {
  FlameFrameType as FlameFrame,
  ZoomRangeType as ZoomRange,
  FlameGraphViewModelType as FlameGraphViewModel,
  SnapshotSummaryType as SnapshotSummary,
  ServiceDiffType as ServiceDiff,
  ComparisonViewModelType as ComparisonViewModel,
  ContainerPhaseType as ContainerPhase,
  ContainerNodeType as ContainerNode,
  ContainerHierarchyViewModelType as ContainerHierarchyViewModel,
};

// =============================================================================
// FlameGraph Props
// =============================================================================

/**
 * Props for the FlameGraph primitive component.
 *
 * FlameGraph displays hierarchical performance data as a flame chart.
 * In DOM it renders as SVG with interactive zoom, in TUI as ASCII
 * horizontal bar representation with keyboard navigation.
 *
 * @remarks
 * The flame graph visualizes service resolution hierarchies with
 * timing information. Frame widths are proportional to duration.
 */
export interface FlameGraphProps {
  /** The flame graph view model to render */
  readonly viewModel: FlameGraphViewModelType;
  /** Callback when a frame is selected (clicked) */
  readonly onFrameSelect?: ((frameId: string) => void) | undefined;
  /** Callback when zoom range changes (pan/zoom interaction) */
  readonly onZoomChange?: ((range: ZoomRangeType) => void) | undefined;
  /** Minimum duration threshold in ms - frames below this are filtered */
  readonly thresholdMs?: number | undefined;
}

// =============================================================================
// TimelineScrubber Props
// =============================================================================

/**
 * Props for the TimelineScrubber primitive component.
 *
 * TimelineScrubber provides navigation through snapshot history.
 * In DOM it renders as a horizontal timeline with draggable scrubber,
 * in TUI as a text-based timeline with keyboard navigation.
 *
 * @remarks
 * Used for time-travel debugging - allows navigating to any
 * captured snapshot in the history.
 */
export interface TimelineScrubberProps {
  /** Array of snapshots to display on the timeline */
  readonly snapshots: readonly SnapshotSummaryType[];
  /** Index of the currently selected snapshot */
  readonly currentIndex: number;
  /** Callback when user navigates to a different snapshot */
  readonly onNavigate: (index: number) => void;
  /** Callback when user triggers manual snapshot capture */
  readonly onCapture?: () => void;
}

// =============================================================================
// DiffView Props
// =============================================================================

/**
 * Props for the DiffView primitive component.
 *
 * DiffView displays differences between two container snapshots.
 * In DOM it renders as a side-by-side diff with color coding,
 * in TUI as text diff format with +/- prefixes.
 *
 * @remarks
 * Color coding: additions (green), removals (red), changes (yellow).
 * Supports filtering to show only specific types of changes.
 */
export interface DiffViewProps {
  /** The comparison view model containing diff data */
  readonly viewModel: ComparisonViewModelType;
  /** Callback when a service in the diff is selected */
  readonly onServiceSelect?: ((portName: string) => void) | undefined;
  /** Whether to show added services (default: true) */
  readonly showAdditions?: boolean;
  /** Whether to show removed services (default: true) */
  readonly showRemovals?: boolean;
  /** Whether to show changed services (default: true) */
  readonly showChanges?: boolean;
}

// =============================================================================
// ContainerTree Props
// =============================================================================

/**
 * Props for the ContainerTree primitive component.
 *
 * ContainerTree displays the container hierarchy as an expandable tree.
 * In DOM it renders with visual indentation and expand/collapse buttons,
 * in TUI it uses box-drawing characters for tree lines.
 *
 * @remarks
 * Each container node shows its phase status and service count.
 * Supports keyboard navigation in TUI mode.
 */
export interface ContainerTreeProps {
  /** The container hierarchy view model */
  readonly viewModel: ContainerHierarchyViewModelType;
  /** Callback when a container is selected */
  readonly onContainerSelect: (containerId: string) => void;
  /** IDs of currently expanded containers */
  readonly expandedIds: readonly string[];
  /** Callback when expand/collapse is toggled for a container */
  readonly onToggleExpand: (containerId: string) => void;
}

// =============================================================================
// PerformanceBadge Props
// =============================================================================

/**
 * Props for the PerformanceBadge primitive component.
 *
 * PerformanceBadge displays a duration with color-coded performance indicator.
 * In DOM it renders as a colored badge, in TUI as colored text.
 *
 * @remarks
 * Color coding based on threshold:
 * - Green: duration < threshold / 2
 * - Yellow: duration < threshold
 * - Red: duration >= threshold
 */
export interface PerformanceBadgeProps {
  /** Duration to display in milliseconds */
  readonly durationMs: number;
  /** Threshold for slow classification in ms (default: 100) */
  readonly thresholdMs?: number;
  /** Whether to show the formatted label (e.g., "1.23ms") */
  readonly showLabel?: boolean;
  /** Badge size */
  readonly size?: "sm" | "md" | "lg";
}

// =============================================================================
// Render Primitives Contract
// =============================================================================

/**
 * Component type for React-like components.
 *
 * @typeParam P - The props type
 */
export type PrimitiveComponent<P> = (props: P) => React.ReactElement | null;

/**
 * The complete render primitives interface.
 *
 * This interface defines all primitive components that adapters must
 * implement for a given renderer type.
 *
 * @typeParam R - The renderer type ('dom' | 'tui')
 *
 * @example DOM primitives
 * ```typescript
 * const DOMPrimitives: RenderPrimitives<'dom'> = {
 *   rendererType: 'dom',
 *   Box: (props) => <div style={{display:'flex',...}}>{props.children}</div>,
 *   Text: (props) => <span style={{color: ...}}>{props.children}</span>,
 *   // ... other components
 *   styleSystem: DOMStyleSystem,
 * };
 * ```
 */
export interface RenderPrimitives<R extends RendererType> {
  /** The renderer type identifier */
  readonly rendererType: R;

  /** Layout container component */
  readonly Box: PrimitiveComponent<BoxProps<R>>;

  /** Text display component */
  readonly Text: PrimitiveComponent<TextProps<R>>;

  /** Interactive button component */
  readonly Button: PrimitiveComponent<ButtonProps<R>>;

  /** Icon display component */
  readonly Icon: PrimitiveComponent<IconProps>;

  /** Scrollable container component */
  readonly ScrollView: PrimitiveComponent<ScrollViewProps>;

  /** Visual separator component */
  readonly Divider: PrimitiveComponent<DividerProps>;

  /** Dependency graph renderer component */
  readonly GraphRenderer: PrimitiveComponent<GraphRendererProps>;

  // =========================================================================
  // New Primitives for Advanced Visualizations
  // =========================================================================

  /** Flame graph visualization component for performance profiling */
  readonly FlameGraph: PrimitiveComponent<FlameGraphProps>;

  /** Timeline scrubber component for time-travel navigation */
  readonly TimelineScrubber: PrimitiveComponent<TimelineScrubberProps>;

  /** Diff view component for snapshot comparison */
  readonly DiffView: PrimitiveComponent<DiffViewProps>;

  /** Container tree component for hierarchy visualization */
  readonly ContainerTree: PrimitiveComponent<ContainerTreeProps>;

  /** Performance badge component for duration display */
  readonly PerformanceBadge: PrimitiveComponent<PerformanceBadgeProps>;

  /** Style system for semantic color resolution */
  readonly styleSystem: StyleSystem;
}

// =============================================================================
// RenderPrimitivesPort Definition
// =============================================================================

/**
 * Port for render primitives adapters.
 *
 * This port enables injection of platform-specific primitive implementations:
 * - DOM adapter: React DOM components with CSS styling
 * - TUI adapter: OpenTUI components with ANSI colors
 *
 * @example Using the port
 * ```typescript
 * import { RenderPrimitivesPort } from '@hex-di/devtools';
 * import { DOMPrimitives } from '@hex-di/devtools/dom';
 *
 * // In your container setup
 * container.register(RenderPrimitivesPort, DOMPrimitives);
 *
 * // In your component
 * const primitives = usePort(RenderPrimitivesPort);
 * const { Box, Text, Button } = primitives;
 * ```
 */
export const RenderPrimitivesPort = createPort<
  "RenderPrimitives",
  RenderPrimitives<RendererType>
>("RenderPrimitives");

/**
 * Type alias for the RenderPrimitives port type.
 */
export type RenderPrimitivesPortType = typeof RenderPrimitivesPort;
