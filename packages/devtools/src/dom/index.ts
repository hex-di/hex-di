/**
 * @hex-di/devtools/dom - Browser DOM entry point for DevTools.
 *
 * This module provides the browser-specific implementation of DevTools
 * using React DOM components and D3/SVG graph visualization.
 *
 * ## Features
 *
 * - **FloatingDevTools**: Draggable, resizable floating panel for development
 * - **DOMDevToolsProvider**: Provider component for DOM primitives context
 * - **DOMPrimitives**: DOM implementations of render primitives (Box, Text, etc.)
 * - **D3 Graph Renderer**: Interactive SVG graph visualization with dagre layout
 *
 * ## Usage
 *
 * @example Basic usage with FloatingDevTools
 * ```typescript
 * import { FloatingDevTools, DOMDevToolsProvider } from '@hex-di/devtools/dom';
 * import { createEmptyPanelViewModel } from '@hex-di/devtools/dom';
 *
 * function App() {
 *   const viewModel = createEmptyPanelViewModel();
 *
 *   return (
 *     <DOMDevToolsProvider>
 *       <MainApp />
 *       <FloatingDevTools viewModel={viewModel} position="bottom-right" />
 *     </DOMDevToolsProvider>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

import type { RendererType } from "../shared/renderer-type.js";

// =============================================================================
// Renderer Type Marker
// =============================================================================

/**
 * Renderer type marker for compile-time and runtime identification.
 * Used by shared components to determine platform-specific behavior.
 */
export const RENDERER_TYPE: RendererType = "dom";

// =============================================================================
// DOM Entry Components (Task Group 4.1)
// =============================================================================

/**
 * DOM-specific FloatingDevTools with resize, fullscreen, and localStorage persistence.
 *
 * @see {@link FloatingDevTools} - Floating DevTools panel
 * @see {@link FloatingDevToolsProps} - Props for FloatingDevTools
 */
export { FloatingDevTools } from "./FloatingDevTools.js";
export type { FloatingDevToolsProps } from "./FloatingDevTools.js";

/**
 * Provider component that wraps PrimitivesProvider with DOM primitives.
 *
 * @see {@link DOMDevToolsProvider} - DOM-specific provider
 * @see {@link DOMDevToolsProviderProps} - Props for DOMDevToolsProvider
 */
export { DOMDevToolsProvider } from "./DOMDevToolsProvider.js";
export type {
  DOMDevToolsProviderProps,
  DevToolsDataSource,
} from "./DOMDevToolsProvider.js";

// =============================================================================
// DOM Primitives Implementation
// =============================================================================

/**
 * DOM primitives - React DOM components implementing RenderPrimitives.
 *
 * This includes:
 * - DOMBox: div with flexbox styles
 * - DOMText: span with semantic colors via CSS custom properties
 * - DOMButton: button element with styling
 * - DOMIcon: Unicode characters or inline SVG
 * - DOMScrollView: div with overflow styles
 * - DOMDivider: hr or styled div
 * - DOMGraphRenderer: D3/SVG with dagre layout
 */
export { DOMPrimitives, DOMStyleSystem } from "./primitives.js";

// =============================================================================
// Re-exports from existing React implementation (legacy)
// =============================================================================

/**
 * Re-export existing React DevTools components.
 *
 * These are the current implementations that will eventually be
 * deprecated in favor of the new FloatingDevTools component.
 *
 * @deprecated Use `FloatingDevTools` with `DOMDevToolsProvider` instead
 */
export { DevToolsFloating, DevToolsPanel } from "../react/index.js";

export type {
  DevToolsPanelProps,
  DevToolsFloatingProps,
  DevToolsPosition,
} from "../react/index.js";

// =============================================================================
// Shared Headless Components (Task Group 3.2)
// =============================================================================

/**
 * Re-export shared headless components for DOM usage.
 *
 * These components use usePrimitives() and work with DOMPrimitives.
 */
export {
  DevToolsPanel as HeadlessDevToolsPanel,
  GraphView,
  EnhancedGraphView,
  defaultFilterState,
  TimelineView,
  StatsView,
  ServicesView,
  InspectorView,
} from "../components/index.js";

export type {
  DevToolsPanelProps as HeadlessDevToolsPanelProps,
  GraphViewProps,
  EnhancedGraphViewProps,
  GraphFilterState,
  LifetimeFilter,
  FactoryFilter,
  TimelineViewProps,
  StatsViewProps,
  ServicesViewProps,
  InspectorViewProps,
} from "../components/index.js";

// =============================================================================
// Re-exports from shared modules
// =============================================================================

/**
 * Re-export shared utilities from main entry point.
 * Consumers using /dom can access these without a separate import.
 */
export {
  toJSON,
  toDOT,
  toMermaid,
  filterGraph,
  byLifetime,
  byPortName,
  relabelPorts,
} from "../index.js";

/**
 * Re-export tracing utilities.
 */
export { createTracingContainer } from "../tracing/index.js";

export type {
  TracingContainer,
  TracingContainerOptions,
} from "../tracing/index.js";

/**
 * Re-export primitives infrastructure.
 */
export { usePrimitives } from "../hooks/use-primitives.js";
export { PrimitivesProvider } from "../hooks/primitives-context.js";
export type { PrimitivesProviderProps } from "../hooks/primitives-context.js";

/**
 * Re-export view models and factory functions.
 */
export {
  createEmptyGraphViewModel,
  createEmptyTimelineViewModel,
  createEmptyStatsViewModel,
  createEmptyServicesViewModel,
  createEmptyInspectorViewModel,
  createEmptyPanelViewModel,
} from "../view-models/index.js";

export type {
  GraphViewModel,
  TimelineViewModel,
  StatsViewModel,
  ServicesViewModel,
  InspectorViewModel,
  PanelViewModel,
  PanelPosition,
  TabId,
} from "../view-models/index.js";
