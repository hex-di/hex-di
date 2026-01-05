/**
 * ServicesPlugin Factory
 *
 * Creates a DevTools plugin for viewing and exploring registered services.
 * The plugin displays all adapters with their lifetimes, dependencies, and
 * resolution status.
 *
 * ## Features
 * - Searchable service list with debounced filtering
 * - Lifetime filters (All/Singleton/Scoped/Transient)
 * - Status filters (Resolved/Pending)
 * - View mode toggle (List/Tree)
 * - Keyboard shortcut "s" to focus the services tab
 *
 * @packageDocumentation
 */

import { defineDevToolsPlugin } from "../runtime/define-plugin.js";
import type { DevToolsPlugin } from "../runtime/plugin-types.js";
import { ServicesPluginContent } from "./services/services-content.js";

// =============================================================================
// Constants
// =============================================================================

/** Plugin identifier */
const SERVICES_PLUGIN_ID = "services";

/** Plugin display label */
const SERVICES_PLUGIN_LABEL = "Services";

/** Keyboard shortcut to focus the services tab */
const SERVICES_PLUGIN_SHORTCUT_KEY = "s";

/** Shortcut description */
const SERVICES_PLUGIN_SHORTCUT_DESCRIPTION = "Focus services tab";

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a ServicesPlugin instance for DevTools.
 *
 * The ServicesPlugin provides a comprehensive view of all registered
 * adapters/services. It supports:
 *
 * - Search with 300ms debounce for filtering by port name
 * - Lifetime filters for singleton, scoped, and transient services
 * - Resolution status filters (resolved vs pending)
 * - List view for flat service browsing
 * - Tree view for dependency-based hierarchical browsing
 * - Performance data when tracing is enabled
 *
 * @returns A frozen DevToolsPlugin instance
 *
 * @example
 * ```typescript
 * import { ServicesPlugin } from "@hex-di/devtools";
 * import { createDevToolsRuntime } from "@hex-di/devtools";
 *
 * const runtime = createDevToolsRuntime({
 *   plugins: [GraphPlugin(), ServicesPlugin()],
 * });
 * ```
 *
 * @example With custom plugins
 * ```typescript
 * import { ServicesPlugin, defaultPlugins } from "@hex-di/devtools";
 *
 * // Use as part of default plugins
 * const plugins = defaultPlugins();
 *
 * // Or compose with other plugins
 * const customPlugins = [ServicesPlugin(), MyCustomPlugin()];
 * ```
 */
export function ServicesPlugin(): DevToolsPlugin {
  // Create shortcut action - this will be called when "s" is pressed
  // The actual tab selection is handled by the runtime when shortcuts are processed
  const shortcutAction = (): void => {
    // The shortcut action is primarily for documentation purposes.
    // The DevTools panel handles the actual tab switching via runtime.dispatch()
    // when keyboard shortcuts are processed.
  };

  return defineDevToolsPlugin({
    id: SERVICES_PLUGIN_ID,
    label: SERVICES_PLUGIN_LABEL,
    component: ServicesPluginContent,
    shortcuts: [
      {
        key: SERVICES_PLUGIN_SHORTCUT_KEY,
        action: shortcutAction,
        description: SERVICES_PLUGIN_SHORTCUT_DESCRIPTION,
      },
    ],
  });
}
