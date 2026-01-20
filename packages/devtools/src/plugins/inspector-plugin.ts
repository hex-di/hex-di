/**
 * InspectorTabPlugin Factory
 *
 * Creates a DevTools plugin for container inspection.
 * The plugin displays the scope hierarchy, resolved services, and
 * supports container selection for multi-container scenarios.
 *
 * ## Naming Note
 * This plugin is named `InspectorTabPlugin` to distinguish it from
 * `@hex-di/runtime`'s `InspectorPlugin` which provides runtime instrumentation.
 * - `@hex-di/runtime.InspectorPlugin` - Runtime instrumentation (adds inspection capabilities to containers)
 * - `@hex-di/devtools.InspectorTabPlugin` - DevTools UI tab (displays container data)
 *
 * ## Features
 * - Scope hierarchy tree visualization
 * - Resolved services list with filtering
 * - Multi-container selection support
 * - Container/scope tree navigation
 * - Keyboard shortcut "i" to focus the inspector tab
 *
 * @packageDocumentation
 */

import { defineDevToolsPlugin } from "../react/define-plugin.js";
import type { DevToolsPlugin } from "../react/types/plugin-types.js";
import { InspectorPluginContent } from "./inspector/inspector-content.js";

// =============================================================================
// Constants
// =============================================================================

/** Plugin identifier */
const INSPECTOR_PLUGIN_ID = "inspector";

/** Plugin display label */
const INSPECTOR_PLUGIN_LABEL = "Inspector";

/** Keyboard shortcut to focus the inspector tab */
const INSPECTOR_PLUGIN_SHORTCUT_KEY = "i";

/** Shortcut description */
const INSPECTOR_PLUGIN_SHORTCUT_DESCRIPTION = "Focus inspector tab";

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates an InspectorTabPlugin instance for DevTools.
 *
 * The InspectorTabPlugin provides container inspection functionality showing:
 *
 * - Scope hierarchy tree with containers and scopes
 * - Resolved services list with search and filters
 * - Container selection for multi-container support
 * - Service resolution status (resolved/pending)
 * - Lifetime badges and dependency information
 *
 * @returns A frozen DevToolsPlugin instance
 *
 * @example
 * ```typescript
 * import { InspectorTabPlugin } from "@hex-di/devtools";
 * import { createDevToolsRuntime } from "@hex-di/devtools";
 *
 * const runtime = createDevToolsRuntime({
 *   plugins: [GraphPlugin(), ServicesPlugin(), InspectorTabPlugin()],
 * });
 * ```
 *
 * @example With custom plugins
 * ```typescript
 * import { InspectorTabPlugin, defaultPlugins } from "@hex-di/devtools";
 *
 * // Use as part of default plugins
 * const plugins = defaultPlugins();
 *
 * // Or compose with other plugins
 * const customPlugins = [ServicesPlugin(), InspectorTabPlugin()];
 * ```
 */
export function InspectorTabPlugin(): DevToolsPlugin {
  // Create shortcut action - this will be called when "i" is pressed
  // The actual tab selection is handled by the runtime when shortcuts are processed
  const shortcutAction = (): void => {
    // The shortcut action is primarily for documentation purposes.
    // The DevTools panel handles the actual tab switching via runtime.dispatch()
    // when keyboard shortcuts are processed.
  };

  return defineDevToolsPlugin({
    id: INSPECTOR_PLUGIN_ID,
    label: INSPECTOR_PLUGIN_LABEL,
    component: InspectorPluginContent,
    shortcuts: [
      {
        key: INSPECTOR_PLUGIN_SHORTCUT_KEY,
        action: shortcutAction,
        description: INSPECTOR_PLUGIN_SHORTCUT_DESCRIPTION,
      },
    ],
  });
}
