/**
 * TracingPlugin Factory
 *
 * Creates a DevTools plugin for resolution tracing.
 * The plugin displays trace data with timeline, tree, and summary views,
 * and provides controls for pause/resume and threshold configuration.
 *
 * ## Features
 * - Timeline view showing resolution traces chronologically
 * - Tree view showing dependency hierarchies
 * - Summary view with statistics and slow resolution highlights
 * - Pause/resume tracing via runtime commands
 * - Configurable slow threshold via runtime commands
 * - Keyboard shortcut "t" to focus the tracing tab
 *
 * @packageDocumentation
 */

import { defineDevToolsPlugin } from "../runtime/define-plugin.js";
import type { DevToolsPlugin } from "../runtime/plugin-types.js";
import { TracingPluginContent } from "./tracing/tracing-content.js";

// =============================================================================
// Constants
// =============================================================================

/** Plugin identifier */
const TRACING_PLUGIN_ID = "tracing";

/** Plugin display label */
const TRACING_PLUGIN_LABEL = "Tracing";

/** Keyboard shortcut to focus the tracing tab */
const TRACING_PLUGIN_SHORTCUT_KEY = "t";

/** Shortcut description */
const TRACING_PLUGIN_SHORTCUT_DESCRIPTION = "Focus tracing tab";

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a TracingPlugin instance for DevTools.
 *
 * The TracingPlugin provides resolution tracing functionality showing:
 *
 * - Timeline view with chronological trace entries
 * - Tree view with dependency-based hierarchical display
 * - Summary view with statistics, slow resolutions, and exports
 * - Controls for pause/resume, clear, and threshold configuration
 * - Recording indicator showing current tracing state
 *
 * All tracing controls dispatch commands to the runtime:
 * - `pauseTracing` / `resumeTracing` for pause/resume toggle
 * - `setThreshold` for slow resolution threshold
 * - `clearTraces` for clearing all recorded traces
 *
 * @returns A frozen DevToolsPlugin instance
 *
 * @example
 * ```typescript
 * import { TracingPlugin } from "@hex-di/devtools";
 * import { createDevToolsRuntime } from "@hex-di/devtools";
 *
 * const runtime = createDevToolsRuntime({
 *   plugins: [GraphPlugin(), ServicesPlugin(), TracingPlugin()],
 * });
 * ```
 *
 * @example With custom plugins
 * ```typescript
 * import { TracingPlugin, defaultPlugins } from "@hex-di/devtools";
 *
 * // Use as part of default plugins
 * const plugins = defaultPlugins();
 *
 * // Or compose with other plugins
 * const customPlugins = [TracingPlugin(), MyCustomPlugin()];
 * ```
 */
export function TracingPlugin(): DevToolsPlugin {
  // Create shortcut action - this will be called when "t" is pressed
  // The actual tab selection is handled by the runtime when shortcuts are processed
  const shortcutAction = (): void => {
    // The shortcut action is primarily for documentation purposes.
    // The DevTools panel handles the actual tab switching via runtime.dispatch()
    // when keyboard shortcuts are processed.
  };

  return defineDevToolsPlugin({
    id: TRACING_PLUGIN_ID,
    label: TRACING_PLUGIN_LABEL,
    component: TracingPluginContent,
    shortcuts: [
      {
        key: TRACING_PLUGIN_SHORTCUT_KEY,
        action: shortcutAction,
        description: TRACING_PLUGIN_SHORTCUT_DESCRIPTION,
      },
    ],
  });
}
