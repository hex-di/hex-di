/**
 * PluginTabContent Component
 *
 * Renders the active plugin's component within a tabpanel container.
 * This component is the integration point between the runtime's plugin
 * system and the React component tree.
 *
 * The component only renders the currently active plugin for performance,
 * avoiding hidden tabs that would still mount and run effects.
 *
 * @packageDocumentation
 */

import React, { useMemo, type ReactElement } from "react";
import type { ExportedGraph } from "@hex-di/devtools-core";
import type { TracingAPI } from "@hex-di/plugin";
import type { PluginProps, ContainerEntry } from "../runtime/plugin-types.js";
import { useActivePlugin, usePlugins, useActiveTab, useDevToolsStore } from "../store/index.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the PluginTabContent component.
 *
 * Most data is derived from the runtime context and container registry.
 * Optional props allow overriding default graph data.
 */
export interface PluginTabContentProps {
  /**
   * Optional graph data to use instead of deriving from containers.
   * Useful for testing or when a specific graph should be displayed.
   */
  readonly graph?: ExportedGraph;
  /**
   * Optional container entries to use instead of from registry.
   * Useful for testing or when specific containers should be available.
   */
  readonly containers?: readonly ContainerEntry[];
  /**
   * Optional tracing API for resolution tracing features.
   * Pass this to enable tracing functionality in plugins that support it.
   */
  readonly tracingAPI?: TracingAPI;
}

// =============================================================================
// Default Values
// =============================================================================

/**
 * Empty graph for when no graph data is available.
 */
const EMPTY_GRAPH: ExportedGraph = {
  nodes: [],
  edges: [],
};

/**
 * Empty containers array for when no containers are registered.
 */
const EMPTY_CONTAINERS: readonly ContainerEntry[] = [];

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the active plugin's content component.
 *
 * This component:
 * 1. Reads the active plugin from runtime state
 * 2. Prepares PluginProps with runtime access and state
 * 3. Renders the plugin's component within a proper tabpanel
 * 4. Only mounts the active plugin (no hidden tabs)
 *
 * Must be used within a DevToolsRuntimeProvider context.
 *
 * @example
 * ```tsx
 * function DevToolsPanel() {
 *   return (
 *     <DevToolsRuntimeProvider runtime={runtime}>
 *       <TabNavigation />
 *       <PluginTabContent />
 *     </DevToolsRuntimeProvider>
 *   );
 * }
 * ```
 */
export function PluginTabContent(props: PluginTabContentProps = {}): ReactElement | null {
  // Use store hooks instead of plugin-based hooks
  const selectTab = useDevToolsStore(state => state.selectTab);
  const plugins = usePlugins();
  const activeTabId = useActiveTab();
  const selectedContainerIds = useDevToolsStore(state => state.ui.selectedIds);
  const tracingEnabled = useDevToolsStore(state => state.tracing.isEnabled);
  const tracingPaused = useDevToolsStore(state => state.tracing.fsmState === "paused");
  const tracingThreshold = useDevToolsStore(_state => 100); // Default threshold
  const activePlugin = useActivePlugin();

  // Use provided props or fall back to defaults
  const graph = props.graph ?? EMPTY_GRAPH;
  const containers = props.containers ?? EMPTY_CONTAINERS;

  // Build the PluginProps object
  // Create a dispatch function compatible with plugin interface
  const dispatch = useMemo(
    () => (command: { type: string; [key: string]: unknown }) => {
      if (command.type === "selectTab" && typeof command.tabId === "string") {
        selectTab(command.tabId);
      }
      // Other commands can be mapped as needed
    },
    [selectTab]
  );

  const pluginProps: PluginProps = useMemo(
    () => ({
      runtime: {
        dispatch,
        getState: () => ({
          activeTabId,
          selectedContainerIds,
          tracingEnabled,
          tracingPaused,
          tracingThreshold,
          plugins,
        }),
      },
      state: {
        activeTabId,
        selectedContainerIds,
        tracingEnabled,
        tracingPaused,
        tracingThreshold,
        plugins,
      },
      graph,
      containers,
      tracingAPI: props.tracingAPI,
    }),
    [
      dispatch,
      activeTabId,
      selectedContainerIds,
      tracingEnabled,
      tracingPaused,
      tracingThreshold,
      plugins,
      graph,
      containers,
      props.tracingAPI,
    ]
  );

  // If no active plugin, render nothing
  if (activePlugin === undefined) {
    return null;
  }

  // Get the plugin's component
  const PluginComponent = activePlugin.component;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${activePlugin.id}`}
      aria-labelledby={`tab-${activePlugin.id}`}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "auto",
      }}
    >
      <PluginComponent {...pluginProps} />
    </div>
  );
}
