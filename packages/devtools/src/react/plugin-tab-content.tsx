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
import type { PluginProps, PluginCommand, ContainerEntry } from "./types/plugin-types.js";
import { useActivePlugin, usePlugins, useActiveTab, useDevToolsStore } from "../store/index.js";
import { PluginErrorBoundary } from "./plugin-error-boundary.js";
import { useContainerScopeTreeOptional } from "./hooks/use-container-scope-tree.js";

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
 * Must be used within a DevToolsStoreProvider context.
 *
 * @example
 * ```tsx
 * function DevToolsPanel() {
 *   return (
 *     <DevToolsStoreProvider inspector={inspector} plugins={plugins}>
 *       <TabNavigation />
 *       <PluginTabContent />
 *     </DevToolsStoreProvider>
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
  const selectContainers = useDevToolsStore(state => state.selectContainers);
  const enableTracing = useDevToolsStore(state => state.enableTracing);
  const disableTracing = useDevToolsStore(state => state.disableTracing);
  const pauseTracing = useDevToolsStore(state => state.pauseTracing);
  const resumeTracing = useDevToolsStore(state => state.resumeTracing);
  const clearTraces = useDevToolsStore(state => state.clearTraces);
  const setSlowThreshold = useDevToolsStore(state => state.setSlowThreshold);

  // Tracing threshold from store (default: 100ms for slow resolution detection)
  const tracingThreshold = useDevToolsStore(state => state.tracing.slowThreshold);

  // Get container scope tree for plugins (V7 fix)
  const containerScopeTree = useContainerScopeTreeOptional();

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
          selectContainers(command.ids);
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
          // Store-only action - threshold is UI configuration, not FSM state
          setSlowThreshold(command.value);
          break;
        case "clearTraces":
          clearTraces();
          break;
        case "pinTrace":
          // Pin trace via TracingAPI (V6 fix - commands for trace mutations)
          if (props.tracingAPI !== undefined) {
            props.tracingAPI.pin(command.traceId);
          }
          break;
        case "unpinTrace":
          // Unpin trace via TracingAPI (V6 fix - commands for trace mutations)
          if (props.tracingAPI !== undefined) {
            props.tracingAPI.unpin(command.traceId);
          }
          break;
      }
    },
    [
      selectTab,
      selectContainers,
      tracingEnabled,
      enableTracing,
      disableTracing,
      pauseTracing,
      resumeTracing,
      setSlowThreshold,
      clearTraces,
      props.tracingAPI,
    ]
  );

  const pluginProps: PluginProps = useMemo(
    () => ({
      runtime: {
        dispatch,
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
      containerScopeTree,
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
      containerScopeTree,
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
      <PluginErrorBoundary pluginId={activePlugin.id} pluginLabel={activePlugin.label}>
        <PluginComponent {...pluginProps} />
      </PluginErrorBoundary>
    </div>
  );
}
