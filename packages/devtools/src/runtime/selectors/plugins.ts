/**
 * Plugin Selectors
 *
 * Selectors for deriving plugin-related state from the runtime.
 * These selectors are used by the tab navigation and plugin rendering.
 *
 * @packageDocumentation
 */

import type { ReactElement } from "react";
import type { DevToolsRuntimeState, DevToolsPlugin } from "../types.js";
import type { TabConfigCore } from "../plugin-types-core.js";
import { createSelector } from "./utils.js";

// Re-export TabConfigCore for framework-agnostic use cases
export type { TabConfigCore } from "../plugin-types-core.js";

/**
 * Tab configuration for rendering in the tab navigation.
 *
 * Extends the framework-agnostic `TabConfigCore` with React-specific
 * icon property.
 *
 * This is a minimal projection of plugin properties needed for tab rendering.
 */
export interface TabConfig extends TabConfigCore {
  /** Optional icon element (React-specific) */
  readonly icon?: ReactElement;
}

/**
 * Selects all registered plugins.
 *
 * This returns the plugins array directly from state, which is frozen
 * at runtime creation. The selector is memoized on state reference.
 *
 * @example
 * ```typescript
 * const plugins = selectPlugins(state);
 * plugins.forEach(plugin => console.log(plugin.id));
 * ```
 *
 * @param state - Current runtime state
 * @returns Readonly array of registered plugins
 */
export const selectPlugins = createSelector(
  (state: DevToolsRuntimeState): readonly DevToolsPlugin[] => state.plugins
);

/**
 * Selects the currently active plugin.
 *
 * Returns the plugin whose id matches the activeTabId in state.
 * Returns undefined if no matching plugin is found (should not happen
 * with proper validation at runtime creation).
 *
 * @example
 * ```typescript
 * const activePlugin = selectActivePlugin(state);
 * if (activePlugin) {
 *   console.log(`Active tab: ${activePlugin.label}`);
 * }
 * ```
 *
 * @param state - Current runtime state
 * @returns The active plugin or undefined
 */
export const selectActivePlugin = createSelector(
  (state: DevToolsRuntimeState): DevToolsPlugin | undefined => {
    return state.plugins.find(plugin => plugin.id === state.activeTabId);
  }
);

/**
 * Selects a plugin by its id.
 *
 * This is a parameterized selector that searches for a plugin with
 * the given id. Returns undefined if no matching plugin is found.
 *
 * Note: This selector is not memoized per id. For performance-critical
 * scenarios with many id lookups, consider creating a lookup map.
 *
 * @example
 * ```typescript
 * const graphPlugin = selectPluginById(state, "graph");
 * if (graphPlugin) {
 *   console.log(`Found plugin: ${graphPlugin.label}`);
 * }
 * ```
 *
 * @param state - Current runtime state
 * @param id - Plugin id to search for
 * @returns The matching plugin or undefined
 */
export function selectPluginById(
  state: DevToolsRuntimeState,
  id: string
): DevToolsPlugin | undefined {
  return state.plugins.find(plugin => plugin.id === id);
}

/**
 * Selects tab configurations for rendering.
 *
 * Returns an ordered array of tab configs derived from plugins.
 * The order matches plugin registration order.
 *
 * This is memoized to prevent unnecessary re-renders of the tab navigation.
 *
 * @example
 * ```typescript
 * const tabs = selectTabList(state);
 * tabs.map(tab => <Tab key={tab.id} label={tab.label} />);
 * ```
 *
 * @param state - Current runtime state
 * @returns Readonly array of tab configurations
 */
export const selectTabList = createSelector((state: DevToolsRuntimeState): readonly TabConfig[] => {
  return state.plugins.map(plugin => ({
    id: plugin.id,
    label: plugin.label,
    icon: plugin.icon,
  }));
});
