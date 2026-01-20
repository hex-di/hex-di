/**
 * DevTools Plugins Module
 *
 * Provides built-in plugins for the DevTools panel.
 * Each plugin contributes one tab to the DevTools interface.
 *
 * ## Available Plugins
 * - `GraphPlugin` - Dependency graph visualization
 * - `ServicesPlugin` - Service list with search, filters, and view modes
 * - `TracingPlugin` - Resolution tracing with timeline, tree, and summary views
 * - `InspectorTabPlugin` - Container inspection with scope hierarchy and resolved services
 *
 * ## Naming Note
 * `InspectorTabPlugin` is named to distinguish it from `@hex-di/runtime.InspectorPlugin`:
 * - `@hex-di/runtime.InspectorPlugin` - Runtime instrumentation (adds inspection to containers)
 * - `@hex-di/devtools.InspectorTabPlugin` - DevTools UI tab (displays container data)
 *
 * ## Preset Functions
 * - `defaultPlugins()` - Returns Graph, Services, Tracing, and Inspector plugins
 * - `minimalPlugins()` - Returns Services and Inspector plugins only
 *
 * ## Usage
 *
 * ```typescript
 * import { GraphPlugin, ServicesPlugin, TracingPlugin, InspectorTabPlugin } from "@hex-di/devtools";
 * import { createDevToolsRuntime } from "@hex-di/devtools";
 *
 * const runtime = createDevToolsRuntime({
 *   plugins: [GraphPlugin(), ServicesPlugin(), TracingPlugin(), InspectorTabPlugin()],
 * });
 * ```
 *
 * ## Using Presets
 *
 * ```typescript
 * import { createDevToolsRuntime, defaultPlugins, minimalPlugins } from "@hex-di/devtools";
 *
 * // Full-featured DevTools
 * const runtime = createDevToolsRuntime({ plugins: defaultPlugins() });
 *
 * // Lightweight DevTools
 * const minimalRuntime = createDevToolsRuntime({ plugins: minimalPlugins() });
 *
 * // Extend with custom plugins
 * const customRuntime = createDevToolsRuntime({
 *   plugins: [...defaultPlugins(), MyCustomPlugin()],
 * });
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Built-in Plugins
// =============================================================================

export { GraphPlugin } from "./graph-plugin.js";
export { ServicesPlugin } from "./services-plugin.js";
export { TracingPlugin } from "./tracing-plugin.js";
// Renamed to avoid confusion with @hex-di/runtime.InspectorPlugin
// See inspector-plugin.ts for naming rationale
export { InspectorTabPlugin } from "./inspector-plugin.js";

// =============================================================================
// Plugin Presets
// =============================================================================

export { defaultPlugins, minimalPlugins } from "./presets.js";
