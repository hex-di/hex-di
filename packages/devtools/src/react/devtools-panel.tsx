/**
 * DevToolsPanel React component for HexDI graph visualization.
 *
 * Provides an embeddable panel component for visualizing dependency graphs
 * and inspecting container state. Displays nodes (ports/adapters), edges
 * (dependencies), and allows drilling into adapter details.
 *
 * Uses a tabbed interface with plugin architecture:
 * - Each plugin contributes one tab
 * - Default plugins: Graph, Services, Tracing, Inspector
 * - Custom plugins can be provided via the `plugins` prop
 * - External runtime can be provided via the `runtime` prop
 *
 * @packageDocumentation
 */

import React, { useMemo, useEffect, useCallback, type ReactElement } from "react";
import type { Port } from "@hex-di/ports";
import type { Graph } from "@hex-di/graph";
import type {
  Container,
  ContainerPhase,
  TracingAPI,
  InspectorWithSubscription,
} from "@hex-di/runtime";
import { getTracingAPI } from "@hex-di/runtime";
import { toJSON } from "@hex-di/devtools-core";
import type { ExportedGraph } from "@hex-di/devtools-core";
import { panelStyles } from "./styles.js";
import { TabNavigation } from "./tab-navigation.js";
import { PluginTabContent } from "./plugin-tab-content.js";
import { DevToolsStoreProvider, usePlugins, useDevToolsStore } from "../store/index.js";
import type { DevToolsPlugin } from "./types/plugin-types.js";
import { defaultPlugins } from "../plugins/presets.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Tab ID type for the DevTools panel.
 * Default tabs are: graph, services, tracing, inspector.
 * Custom plugins can add additional tabs.
 */
export type TabId = string;

/**
 * Props for the DevToolsPanel component.
 *
 * @remarks
 * - `graph` is required and provides the dependency graph data
 * - `container` is optional and enables additional runtime inspection features
 * - `initialTab` sets the initial active tab
 * - `plugins` allows custom plugins (defaults to `defaultPlugins()`)
 * - `runtime` allows providing an external runtime (creates one internally if not provided)
 *
 * @example Basic usage with graph only
 * ```tsx
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function DevView() {
 *   return <DevToolsPanel graph={appGraph} />;
 * }
 * ```
 *
 * @example With container for runtime inspection
 * ```tsx
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 * import { container } from './container';
 *
 * function DevView() {
 *   return <DevToolsPanel graph={appGraph} container={container} />;
 * }
 * ```
 *
 * @example With custom plugins
 * ```tsx
 * import { DevToolsPanel, defaultPlugins } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 * import { MyCustomPlugin } from './plugins';
 *
 * function DevView() {
 *   return (
 *     <DevToolsPanel
 *       graph={appGraph}
 *       plugins={[...defaultPlugins(), MyCustomPlugin()]}
 *     />
 *   );
 * }
 * ```
 */
export interface DevToolsPanelProps<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
> {
  /**
   * The dependency graph to visualize.
   *
   * Accepts graphs with any async ports configuration.
   */
  readonly graph: Graph<TProvides, TAsyncPorts>;
  /**
   * Optional container for runtime inspection.
   *
   * Accepts containers in any phase (initialized or uninitialized) and with
   * any async ports configuration.
   */
  readonly container?: Container<TProvides, TExtends, TAsyncPorts, TPhase>;
  /**
   * Initial active tab.
   * @default "graph"
   */
  readonly initialTab?: TabId;
  /**
   * Plugins to use for the tabbed interface.
   * @default defaultPlugins()
   */
  readonly plugins?: readonly DevToolsPlugin[];
}

// =============================================================================
// DevToolsPanel Tabs Mode Component
// =============================================================================

/**
 * Props for the internal tabs mode panel.
 */
interface DevToolsPanelTabsModeProps {
  readonly exportedGraph: ExportedGraph;
  readonly tracingAPI: TracingAPI | undefined;
}

/**
 * Internal component for tabs mode rendering with plugin architecture.
 *
 * This component must be rendered within a DevToolsStoreProvider context.
 * Handles keyboard shortcuts for plugin tab switching.
 */
function DevToolsPanelTabsMode({
  exportedGraph,
  tracingAPI,
}: DevToolsPanelTabsModeProps): ReactElement {
  const plugins = usePlugins();
  const selectTab = useDevToolsStore(state => state.selectTab);

  /**
   * Handle keyboard shortcuts for plugin tabs.
   * Listens for single-key shortcuts defined in plugin.shortcuts.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      // Skip if modifier keys are pressed (allow browser shortcuts)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // Skip if target is an input element
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }

      const pressedKey = event.key.toLowerCase();

      // Find plugin with matching shortcut
      for (const plugin of plugins) {
        if (plugin.shortcuts === undefined) continue;

        for (const shortcut of plugin.shortcuts) {
          // Only handle single-key shortcuts (no modifiers)
          if (shortcut.key.toLowerCase() === pressedKey) {
            event.preventDefault();
            // Call the shortcut's action callback
            shortcut.action();
            // Also select the tab (the primary action)
            selectTab(plugin.id);
            return;
          }
        }
      }
    },
    [plugins, selectTab]
  );

  // Register global keyboard listener for shortcuts
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div data-testid="devtools-panel" style={panelStyles.container}>
      <div style={panelStyles.header}>HexDI DevTools</div>

      {/* Tab Navigation - reads from runtime via context */}
      <TabNavigation />

      {/* Tab Content - renders active plugin's component */}
      <div style={panelStyles.content}>
        <PluginTabContent graph={exportedGraph} tracingAPI={tracingAPI} />
      </div>
    </div>
  );
}

// =============================================================================
// DevToolsPanel Component
// =============================================================================

/**
 * Creates a minimal mock inspector for graph-only mode.
 * Used when DevToolsPanel is rendered without a container.
 */
function createMockInspector(): InspectorWithSubscription {
  return {
    getSnapshot: () => ({
      kind: "root" as const,
      phase: "initialized" as const,
      isInitialized: true,
      asyncAdaptersTotal: 0,
      asyncAdaptersInitialized: 0,
      singletons: [],
      scopes: {
        id: "container",
        status: "active" as const,
        children: [],
        resolvedPorts: [],
        resolvedCount: 0,
        totalCount: 0,
      },
      isDisposed: false,
      containerName: "GraphOnlyContainer",
      containerId: "graph-only-container",
    }),
    getScopeTree: () => ({
      id: "container",
      status: "active" as const,
      children: [],
      resolvedPorts: [],
      resolvedCount: 0,
      totalCount: 0,
    }),
    getAdapterInfo: () => [],
    getGraphData: () => ({
      containerName: "GraphOnlyContainer",
      kind: "root" as const,
      parentName: null,
      adapters: [],
    }),
    getChildContainers: () => [],
    subscribe: () => () => {},
    listPorts: () => [],
    getContainerKind: () => "root" as const,
    getPhase: () => "initialized" as const,
    isResolved: () => false,
    isDisposed: false,
  };
}

/**
 * DevToolsPanel component for visualizing HexDI dependency graphs.
 *
 * Displays an interactive panel with a tabbed interface using plugin architecture:
 * - Each plugin contributes one tab
 * - Default plugins: Graph, Services, Tracing, Inspector
 * - Custom plugins can be provided via the `plugins` prop
 *
 * Nodes are visually differentiated by lifetime:
 * - **Singleton**: Green badge
 * - **Scoped**: Blue badge
 * - **Transient**: Orange badge
 *
 * @param props - The component props
 * @returns A React element containing the DevTools panel
 *
 * @example Basic usage
 * ```tsx
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function DeveloperView() {
 *   return (
 *     <div className="dev-layout">
 *       <MainContent />
 *       <aside className="dev-sidebar">
 *         <DevToolsPanel graph={appGraph} />
 *       </aside>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With container inspection
 * ```tsx
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 * import { container } from './container';
 *
 * function App() {
 *   return (
 *     <DevToolsPanel
 *       graph={appGraph}
 *       container={container}
 *     />
 *   );
 * }
 * ```
 *
 * @example With custom plugins
 * ```tsx
 * import { DevToolsPanel, defaultPlugins } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 * import { MyCustomPlugin } from './plugins';
 *
 * function App() {
 *   return (
 *     <DevToolsPanel
 *       graph={appGraph}
 *       plugins={[...defaultPlugins(), MyCustomPlugin()]}
 *     />
 *   );
 * }
 * ```
 */
export function DevToolsPanel<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
>({
  graph,
  container,
  initialTab = "graph",
  plugins,
}: DevToolsPanelProps<TProvides, TExtends, TAsyncPorts, TPhase>): ReactElement {
  // Convert graph to exported format for visualization
  const exportedGraph = useMemo(() => toJSON(graph), [graph]);

  // Extract tracingAPI from container if TracingPlugin is registered
  // This enables the ResolutionTracingSection to display trace data
  const tracingAPI = useMemo(
    (): TracingAPI | undefined => (container !== undefined ? getTracingAPI(container) : undefined),
    [container]
  );

  // ==========================================================================
  // Create inspector and plugins
  // ==========================================================================

  // Create mock inspector for graph-only mode
  const inspector = useMemo((): InspectorWithSubscription => {
    return createMockInspector();
  }, []);

  // Use provided plugins or default plugins
  const pluginsToUse = useMemo(() => plugins ?? defaultPlugins(), [plugins]);

  // ==========================================================================
  // Render
  // ==========================================================================

  // DevToolsStoreProvider provides the store context needed by TabNavigation and PluginTabContent
  return (
    <DevToolsStoreProvider inspector={inspector} plugins={pluginsToUse} initialTab={initialTab}>
      <DevToolsPanelTabsMode exportedGraph={exportedGraph} tracingAPI={tracingAPI} />
    </DevToolsStoreProvider>
  );
}
