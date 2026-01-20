/**
 * GraphPlugin Factory
 *
 * Creates a DevTools plugin for visualizing the dependency graph.
 * The plugin displays container dependencies as an interactive graph
 * with support for multi-container selection.
 *
 * ## Features
 * - Visual dependency graph with hierarchical layout
 * - Multi-container selection support
 * - Unified graph view showing ports across selected containers
 * - Keyboard shortcut "g" to focus the graph tab
 *
 * @packageDocumentation
 */

import { defineDevToolsPlugin } from "../react/define-plugin.js";
import type { DevToolsPlugin } from "../react/types/plugin-types.js";
import { GraphPluginContent } from "./graph/graph-content.js";

// =============================================================================
// Constants
// =============================================================================

/** Plugin identifier */
const GRAPH_PLUGIN_ID = "graph";

/** Plugin display label */
const GRAPH_PLUGIN_LABEL = "Graph";

/** Keyboard shortcut to focus the graph tab */
const GRAPH_PLUGIN_SHORTCUT_KEY = "g";

/** Shortcut description */
const GRAPH_PLUGIN_SHORTCUT_DESCRIPTION = "Focus graph tab";

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a GraphPlugin instance for DevTools.
 *
 * The GraphPlugin provides a visual dependency graph showing all
 * registered adapters and their dependencies. It supports:
 *
 * - Hierarchical layout using Dagre algorithm
 * - Interactive zoom and pan
 * - Hover highlighting of related nodes
 * - Tooltips showing service details
 * - Multi-container selection for unified views
 *
 * @returns A frozen DevToolsPlugin instance
 *
 * @example
 * ```typescript
 * import { GraphPlugin } from "@hex-di/devtools";
 * import { createDevToolsRuntime } from "@hex-di/devtools";
 *
 * const runtime = createDevToolsRuntime({
 *   plugins: [GraphPlugin(), ServicesPlugin()],
 * });
 * ```
 *
 * @example With custom plugins
 * ```typescript
 * import { GraphPlugin, defaultPlugins } from "@hex-di/devtools";
 *
 * // Use as part of default plugins
 * const plugins = defaultPlugins();
 *
 * // Or compose with other plugins
 * const customPlugins = [GraphPlugin(), MyCustomPlugin()];
 * ```
 */
export function GraphPlugin(): DevToolsPlugin {
  // Create shortcut action - this will be called when "g" is pressed
  // The actual tab selection is handled by the runtime when shortcuts are processed
  const shortcutAction = (): void => {
    // The shortcut action is primarily for documentation purposes.
    // The DevTools panel handles the actual tab switching via runtime.dispatch()
    // when keyboard shortcuts are processed.
  };

  return defineDevToolsPlugin({
    id: GRAPH_PLUGIN_ID,
    label: GRAPH_PLUGIN_LABEL,
    component: GraphPluginContent,
    shortcuts: [
      {
        key: GRAPH_PLUGIN_SHORTCUT_KEY,
        action: shortcutAction,
        description: GRAPH_PLUGIN_SHORTCUT_DESCRIPTION,
      },
    ],
  });
}
