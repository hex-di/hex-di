/**
 * @hex-di/devtools-flow - Flow State Machine Plugin for HexDI DevTools
 *
 * This package provides a DevTools plugin for visualizing Flow state machines
 * registered with the HexDI container. It includes configurable visibility
 * filtering to control which machines are displayed.
 *
 * ## Installation
 *
 * ```bash
 * pnpm add @hex-di/devtools-flow
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * import { HexDiDevTools, defaultPlugins } from "@hex-di/devtools/react";
 * import { FlowPlugin } from "@hex-di/devtools-flow";
 *
 * // Add FlowPlugin to DevTools
 * <HexDiDevTools
 *   container={container}
 *   plugins={[...defaultPlugins(), FlowPlugin()]}
 * />
 * ```
 *
 * ## Visibility Modes
 *
 * By default, the plugin hides internal DevTools machines. You can customize
 * this behavior:
 *
 * ```typescript
 * // Show all machines (including internals)
 * FlowPlugin({ visibility: "all" })
 *
 * // Custom filter
 * FlowPlugin({
 *   visibility: "custom",
 *   filter: (id) => id.startsWith("App."),
 * })
 *
 * // Custom internal prefixes
 * FlowPlugin({
 *   visibility: "user",
 *   internalPrefixes: ["_private.", "internal."],
 * })
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Package Version
// =============================================================================

/**
 * Package version string.
 */
export const VERSION = "0.0.1";

// =============================================================================
// Type Exports
// =============================================================================

export type { FlowPluginOptions, FlowVisibilityMode, VisibilityFilter } from "./types.js";

// =============================================================================
// Plugin Exports
// =============================================================================

export { FlowPlugin, createVisibilityFilter, DEFAULT_INTERNAL_PREFIXES } from "./flow-plugin.js";
