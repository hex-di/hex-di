/**
 * Factory for Creating DevTools Runtime
 *
 * Provides the public factory function for creating DevTools runtime instances.
 * Handles validation, configuration, and initial state construction.
 *
 * @packageDocumentation
 */

import type { DevToolsRuntime, DevToolsRuntimeConfig, DevToolsRuntimeState } from "./types.js";
import { createRuntimeInstance } from "./runtime.js";

/**
 * Error thrown when plugin configuration is invalid.
 */
export class PluginConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginConfigurationError";
  }
}

/**
 * Creates a new DevTools runtime instance.
 *
 * The runtime is the central hub for all DevTools state and operations.
 * It must be created with at least one plugin, and all plugins must have unique IDs.
 *
 * @param config - Configuration options including plugins
 * @returns A frozen DevToolsRuntime instance
 * @throws PluginConfigurationError if plugins are invalid
 *
 * @example
 * ```typescript
 * import { createDevToolsRuntime } from "@hex-di/devtools";
 * import { GraphPlugin, ServicesPlugin } from "@hex-di/devtools/plugins";
 *
 * const runtime = createDevToolsRuntime({
 *   plugins: [GraphPlugin(), ServicesPlugin()],
 *   tracingEnabled: true,
 *   tracingThreshold: 100,
 * });
 *
 * // Dispatch commands to change state
 * runtime.dispatch({ type: "selectTab", tabId: "services" });
 *
 * // Subscribe to state changes
 * const unsubscribe = runtime.subscribe(() => {
 *   console.log("State changed:", runtime.getState());
 * });
 * ```
 */
export function createDevToolsRuntime(config: DevToolsRuntimeConfig): DevToolsRuntime {
  // Validate plugins
  validatePlugins(config.plugins);

  // Build initial state
  const initialState = buildInitialState(config);

  // Create and return the runtime
  return createRuntimeInstance(initialState);
}

/**
 * Validates the plugin configuration.
 *
 * @throws PluginConfigurationError if validation fails
 */
function validatePlugins(plugins: DevToolsRuntimeConfig["plugins"]): void {
  // Check for empty plugins array
  if (plugins.length === 0) {
    throw new PluginConfigurationError(
      "DevTools runtime requires at least one plugin to be registered."
    );
  }

  // Check for duplicate plugin IDs
  const seenIds = new Set<string>();

  for (const plugin of plugins) {
    if (seenIds.has(plugin.id)) {
      throw new PluginConfigurationError(
        `Duplicate plugin id detected: "${plugin.id}". Each plugin must have a unique id.`
      );
    }
    seenIds.add(plugin.id);
  }
}

/**
 * Builds the initial state from configuration.
 *
 * @param config - Runtime configuration
 * @returns Initial state with frozen plugins array
 */
function buildInitialState(config: DevToolsRuntimeConfig): DevToolsRuntimeState {
  const { plugins, initialTabId, initialContainerIds, tracingEnabled, tracingThreshold } = config;

  // Freeze the plugins array to ensure immutability
  const frozenPlugins = Object.freeze([...plugins]);

  // Use first plugin's ID if no initial tab specified
  const activeTabId = initialTabId ?? frozenPlugins[0].id;

  return {
    activeTabId,
    selectedContainerIds: initialContainerIds ?? new Set<string>(),
    tracingEnabled: tracingEnabled ?? true,
    tracingPaused: false,
    tracingThreshold: tracingThreshold ?? 100,
    plugins: frozenPlugins,
  };
}
