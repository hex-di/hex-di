/**
 * Port definitions for the unified DevTools architecture.
 *
 * @packageDocumentation
 */

export {
  // Port definition
  RenderPrimitivesPort,
  // Type alias
  type RenderPrimitivesPortType,
  // Contract interfaces
  type RenderPrimitives,
  type StyleSystem,
  // Renderer type
  type RendererType,
  // Color and spacing tokens
  type SemanticColor,
  type SpacingToken,
  // Layout props
  type LayoutProps,
  // Conditional props
  type DOMOnlyProps,
  type TUIOnlyProps,
  type RendererSpecificProps,
  // Component prop interfaces
  type BoxProps,
  type TextProps,
  type TextVariant,
  type ButtonProps,
  type IconProps,
  type IconName,
  type ScrollViewProps,
  type DividerProps,
  type GraphRendererProps,
  type NodeSelectEvent,
  // Graph view model types (minimal)
  type GraphViewModelMinimal,
  type GraphNodeViewModelMinimal,
  type GraphEdgeViewModelMinimal,
  // Utility types
  type PrimitiveComponent,
  // New primitive prop interfaces (Task Group 4)
  type FlameGraphProps,
  type TimelineScrubberProps,
  type DiffViewProps,
  type ContainerTreeProps,
  type PerformanceBadgeProps,
  // New view model types for primitives
  type ZoomRange,
  type SnapshotSummary,
  type FlameFrame,
  type FlameGraphViewModel,
  type ServiceDiff,
  type ComparisonViewModel,
  type ContainerPhase,
  type ContainerNode,
  type ContainerHierarchyViewModel,
} from "./render-primitives.port.js";
