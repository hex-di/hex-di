/**
 * Plugin Preset Factory Functions
 *
 * Provides convenience functions that return pre-configured sets of plugins
 * for common DevTools usage scenarios.
 *
 * ## Available Presets
 *
 * - `defaultPlugins()` - Full-featured DevTools with Graph, Services, Tracing, and Inspector
 * - `minimalPlugins()` - Lightweight DevTools with only Services and Inspector
 *
 * ## Composition
 *
 * Presets return readonly arrays that can be spread and combined with custom plugins:
 *
 * ```typescript
 * // Use default plugins
 * const runtime = createDevToolsRuntime({ plugins: defaultPlugins() });
 *
 * // Add custom plugin to defaults
 * const runtime = createDevToolsRuntime({
 *   plugins: [...defaultPlugins(), MyCustomPlugin()],
 * });
 *
 * // Use minimal with custom plugin
 * const runtime = createDevToolsRuntime({
 *   plugins: [...minimalPlugins(), MyAnalyticsPlugin()],
 * });
 * ```
 *
 * @packageDocumentation
 */

import type { DevToolsPlugin } from "../runtime/plugin-types.js";
import { GraphPlugin } from "./graph-plugin.js";
import { ServicesPlugin } from "./services-plugin.js";
import { TracingPlugin } from "./tracing-plugin.js";
import { InspectorTabPlugin } from "./inspector-plugin.js";

// =============================================================================
// Default Plugins Preset
// =============================================================================

/**
 * Returns the default set of DevTools plugins.
 *
 * Includes all built-in plugins in the standard order:
 * 1. Graph - Dependency graph visualization
 * 2. Services - Service list with search, filters, and view modes
 * 3. Tracing - Resolution tracing with timeline, tree, and summary views
 * 4. Inspector - Container inspection with scope hierarchy
 *
 * Each call returns fresh plugin instances, ensuring no shared state between
 * different DevTools runtime instances.
 *
 * @returns A frozen readonly array of the four default plugins
 *
 * @example Basic usage
 * ```typescript
 * import { createDevToolsRuntime, defaultPlugins } from "@hex-di/devtools";
 *
 * const runtime = createDevToolsRuntime({
 *   plugins: defaultPlugins(),
 * });
 * ```
 *
 * @example Extend with custom plugins
 * ```typescript
 * import { createDevToolsRuntime, defaultPlugins } from "@hex-di/devtools";
 * import { MyCustomPlugin } from "./my-custom-plugin";
 *
 * const runtime = createDevToolsRuntime({
 *   plugins: [...defaultPlugins(), MyCustomPlugin()],
 * });
 * ```
 *
 * @example Access individual plugins from preset
 * ```typescript
 * const plugins = defaultPlugins();
 * const graphPlugin = plugins[0]; // GraphPlugin
 * const servicesPlugin = plugins[1]; // ServicesPlugin
 * const tracingPlugin = plugins[2]; // TracingPlugin
 * const inspectorPlugin = plugins[3]; // InspectorTabPlugin
 * ```
 */
export function defaultPlugins(): readonly [
  DevToolsPlugin,
  DevToolsPlugin,
  DevToolsPlugin,
  DevToolsPlugin,
] {
  // Create fresh plugin instances on each call
  const plugins: [DevToolsPlugin, DevToolsPlugin, DevToolsPlugin, DevToolsPlugin] = [
    GraphPlugin(),
    ServicesPlugin(),
    TracingPlugin(),
    InspectorTabPlugin(),
  ];

  // Freeze the array to enforce immutability
  return Object.freeze(plugins);
}

// =============================================================================
// Minimal Plugins Preset
// =============================================================================

/**
 * Returns a minimal set of DevTools plugins for lightweight usage.
 *
 * Includes only essential plugins:
 * 1. Services - Service list with search, filters, and view modes
 * 2. Inspector - Container inspection with scope hierarchy
 *
 * This preset is ideal for:
 * - Production debugging where tracing overhead is unwanted
 * - Simple applications without complex dependency graphs
 * - Environments where bundle size is a concern
 *
 * Each call returns fresh plugin instances, ensuring no shared state between
 * different DevTools runtime instances.
 *
 * @returns A frozen readonly array of the two minimal plugins
 *
 * @example Basic usage
 * ```typescript
 * import { createDevToolsRuntime, minimalPlugins } from "@hex-di/devtools";
 *
 * const runtime = createDevToolsRuntime({
 *   plugins: minimalPlugins(),
 * });
 * ```
 *
 * @example Add graph visualization to minimal
 * ```typescript
 * import { createDevToolsRuntime, minimalPlugins, GraphPlugin } from "@hex-di/devtools";
 *
 * const runtime = createDevToolsRuntime({
 *   plugins: [GraphPlugin(), ...minimalPlugins()],
 * });
 * ```
 *
 * @example Extend with custom analytics
 * ```typescript
 * import { createDevToolsRuntime, minimalPlugins } from "@hex-di/devtools";
 * import { AnalyticsPlugin } from "./analytics-plugin";
 *
 * const runtime = createDevToolsRuntime({
 *   plugins: [...minimalPlugins(), AnalyticsPlugin()],
 * });
 * ```
 */
export function minimalPlugins(): readonly [DevToolsPlugin, DevToolsPlugin] {
  // Create fresh plugin instances on each call
  const plugins: [DevToolsPlugin, DevToolsPlugin] = [ServicesPlugin(), InspectorTabPlugin()];

  // Freeze the array to enforce immutability
  return Object.freeze(plugins);
}
