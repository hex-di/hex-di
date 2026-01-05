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

import React, { useMemo, useCallback, type ReactElement } from "react";
import type { ExportedGraph } from "@hex-di/devtools-core";
import type { TracingAPI } from "@hex-di/plugin";
import type { PluginProps, PluginCommand, ContainerEntry } from "../runtime/plugin-types.js";
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
  const plugins = usePlugins();
  const activeTabId = useActiveTab();
  const selectedContainerIds = useDevToolsStore(state => state.ui.selectedIds);
  const tracingEnabled = useDevToolsStore(state => state.tracing.isEnabled);
  const tracingPaused = useDevToolsStore(state => state.tracing.fsmState === "paused");
  const activePlugin = useActivePlugin();

  // Get all store actions needed for command dispatch
  const selectTab = useDevToolsStore(state => state.selectTab);
  const selectContainer = useDevToolsStore(state => state.selectContainer);
  const enableTracing = useDevToolsStore(state => state.enableTracing);
  const disableTracing = useDevToolsStore(state => state.disableTracing);
  const pauseTracing = useDevToolsStore(state => state.pauseTracing);
  const resumeTracing = useDevToolsStore(state => state.resumeTracing);
  const clearTraces = useDevToolsStore(state => state.clearTraces);

  // Tracing threshold - currently fixed at 100ms (slow resolution threshold)
  // TODO: Add setThreshold action to store when threshold configurability is needed
  const tracingThreshold = 100;

  // Use provided props or fall back to defaults
  const graph = props.graph ?? EMPTY_GRAPH;
  const containers = props.containers ?? EMPTY_CONTAINERS;

  // Build the PluginProps object
  // Create a type-safe dispatch function that handles all PluginCommand types
  const dispatch = useCallback(
    (command: PluginCommand): void => {
      switch (command.type) {
        case "selectTab":
          selectTab(command.tabId);
          break;
        case "selectContainers":
          // Select first container from the set (store supports single selection)
          // Multi-select could be supported by adding a selectContainers action to store
          for (const id of command.ids) {
            selectContainer(id);
            break; // Select first only for now
          }
          break;
        case "toggleTracing":
          if (tracingEnabled) {
            disableTracing();
          } else {
            enableTracing();
          }
          break;
        case "pauseTracing":
          pauseTracing();
          break;
        case "resumeTracing":
          resumeTracing();
          break;
        case "setThreshold":
          // TODO: Add setThreshold action to store when threshold configurability is needed
          // For now, threshold is fixed at 100ms
          console.warn(
            `[DevTools] setThreshold command received (value: ${command.value}ms) but threshold configuration is not yet implemented`
          );
          break;
        case "clearTraces":
          clearTraces();
          break;
      }
    },
    [
      selectTab,
      selectContainer,
      tracingEnabled,
      enableTracing,
      disableTracing,
      pauseTracing,
      resumeTracing,
      clearTraces,
    ]
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
