/**
 * @hex-di/devtools/tui - Terminal UI entry point for DevTools.
 *
 * This module provides the terminal-specific implementation of DevTools
 * using OpenTUI components and ASCII graph visualization.
 *
 * ## Features
 *
 * - **TuiDevTools**: Full-screen terminal UI for DevTools
 * - **TUIDevToolsProvider**: Provider component for TUI primitives
 * - **TUIPrimitives**: TUI implementations of render primitives (Box, Text, etc.)
 * - **ASCII Graph Renderer**: Text-based graph visualization with box-drawing characters
 * - **hexdi-tui CLI**: Command-line binary for connecting to remote DevTools servers
 *
 * ## Usage
 *
 * @example Programmatic usage with OpenTUI
 * ```typescript
 * import { TuiDevTools, TUIDevToolsProvider } from '@hex-di/devtools/tui';
 * import { render } from '@opentui/core';
 * import { createEmptyPanelViewModel } from '@hex-di/devtools';
 *
 * const viewModel = createEmptyPanelViewModel();
 *
 * render(
 *   <TuiDevTools
 *     viewModel={viewModel}
 *     appId="my-app"
 *     url="ws://localhost:9000"
 *     onExit={() => process.exit(0)}
 *   />
 * );
 * ```
 *
 * @example CLI usage
 * ```bash
 * npx hexdi-tui --url ws://localhost:9000 --app-id my-app
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
export const RENDERER_TYPE: RendererType = "tui";

// =============================================================================
// TUI Primitives
// =============================================================================

/**
 * TUI primitives implementation using OpenTUI components.
 *
 * Implements the RenderPrimitives<'tui'> interface with:
 * - TUIBox: OpenTUI box element with flexbox
 * - TUIText: text/span with ANSI colors
 * - TUIButton: bordered box with focus handling
 * - TUIIcon: ASCII characters like [G], ->, etc.
 * - TUIScrollView: OpenTUI scrollable container
 * - TUIDivider: Box-drawing characters
 * - TUIGraphRenderer: ASCII art with tree layout
 */
export { TUIPrimitives, TUIStyleSystem, ANSI_COLORS } from "./primitives.js";

// =============================================================================
// TUI DevTools Components
// =============================================================================

/**
 * Main TUI DevTools component with TUI-specific chrome.
 *
 * Provides:
 * - Full-screen terminal UI
 * - Keyboard navigation (Tab, Arrow keys)
 * - Q key to exit
 * - Remote connection via WebSocket
 *
 * @see {@link TuiDevTools} - Main TUI DevTools component
 * @see {@link TuiDevToolsProps} - Props for TuiDevTools
 */
export { TuiDevTools } from "./TuiDevTools.js";
export type { TuiDevToolsProps } from "./TuiDevTools.js";

/**
 * TUI DevTools provider component.
 *
 * Convenience wrapper around PrimitivesProvider that automatically
 * uses TUIPrimitives.
 *
 * @see {@link TUIDevToolsProvider} - TUI primitives provider
 * @see {@link TUIDevToolsProviderProps} - Props for TUIDevToolsProvider
 */
export { TUIDevToolsProvider } from "./TUIDevToolsProvider.js";
export type { TUIDevToolsProviderProps } from "./TUIDevToolsProvider.js";

// =============================================================================
// Shared Headless Components (Task Group 3.2)
// =============================================================================

/**
 * Re-export shared headless components for TUI usage.
 *
 * These components use usePrimitives() and work with TUIPrimitives.
 */
export {
  DevToolsPanel as HeadlessDevToolsPanel,
  GraphView,
  TimelineView,
  StatsView,
  InspectorView,
} from "../components/index.js";

export type {
  DevToolsPanelProps as HeadlessDevToolsPanelProps,
  GraphViewProps,
  TimelineViewProps,
  StatsViewProps,
  InspectorViewProps,
} from "../components/index.js";

// =============================================================================
// Re-exports from shared modules
// =============================================================================

/**
 * Re-export shared utilities from main entry point.
 * Consumers using /tui can access these without a separate import.
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
 * Re-export core types that are useful for TUI implementations.
 */
export type {
  ExportedGraph,
  ExportedNode,
  ExportedEdge,
} from "@hex-di/devtools-core";

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
  createEmptyInspectorViewModel,
  createEmptyPanelViewModel,
} from "../view-models/index.js";

export type {
  GraphViewModel,
  TimelineViewModel,
  StatsViewModel,
  InspectorViewModel,
  PanelViewModel,
  TabId,
} from "../view-models/index.js";
