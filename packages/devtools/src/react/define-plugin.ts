/**
 * Plugin Factory Function
 *
 * This module provides a factory function for creating DevTools plugins
 * with runtime validation. The factory ensures plugins are properly
 * configured and frozen for immutability.
 *
 * ## Usage
 *
 * ```typescript
 * import { defineDevToolsPlugin } from "@hex-di/devtools";
 * import type { PluginProps } from "@hex-di/devtools";
 *
 * function MyPluginContent(props: PluginProps) {
 *   return <div>My Plugin Content</div>;
 * }
 *
 * export const MyPlugin = defineDevToolsPlugin({
 *   id: "my-plugin",
 *   label: "My Plugin",
 *   component: MyPluginContent,
 *   shortcuts: [
 *     { key: "m", action: () => {}, description: "Focus my plugin" }
 *   ],
 * });
 * ```
 *
 * @packageDocumentation
 */

import type { DevToolsPlugin, PluginConfig } from "./types/plugin-types.js";
import { validatePluginConfig } from "../runtime/validation.js";

/**
 * Creates a validated, frozen DevTools plugin instance.
 *
 * This factory function:
 * 1. Validates all required fields are present and valid
 * 2. Validates the plugin ID format (lowercase, no spaces, starts with letter)
 * 3. Returns a frozen plugin object that cannot be mutated
 *
 * The frozen nature ensures plugins remain consistent throughout their
 * lifecycle and cannot be accidentally modified.
 *
 * @param config - Plugin configuration object
 * @returns A frozen DevToolsPlugin instance
 * @throws {PluginValidationError} If validation fails
 *
 * @example Basic plugin
 * ```typescript
 * const SimplePlugin = defineDevToolsPlugin({
 *   id: "simple",
 *   label: "Simple Plugin",
 *   component: SimpleContent,
 * });
 * ```
 *
 * @example Plugin with all options
 * ```typescript
 * const FullPlugin = defineDevToolsPlugin({
 *   id: "full-featured",
 *   label: "Full Featured",
 *   icon: <PluginIcon />,
 *   component: FullContent,
 *   shortcuts: [
 *     { key: "f", action: focusPlugin, description: "Focus plugin" },
 *     { key: "ctrl+f", action: search, description: "Search in plugin" },
 *   ],
 * });
 * ```
 */
export function defineDevToolsPlugin(config: PluginConfig): DevToolsPlugin {
  // Validate the configuration
  validatePluginConfig(config);

  // Create the plugin object with all fields
  const plugin: DevToolsPlugin = {
    id: config.id,
    label: config.label,
    component: config.component,
    // Only include optional fields if they are defined
    ...(config.icon !== undefined && { icon: config.icon }),
    ...(config.shortcuts !== undefined && { shortcuts: config.shortcuts }),
  };

  // Freeze the plugin object to ensure immutability
  return Object.freeze(plugin);
}
