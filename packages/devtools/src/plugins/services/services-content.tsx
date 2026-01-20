/**
 * ServicesPluginContent Component
 *
 * The content component for the Services plugin. Accepts PluginProps
 * and renders the enhanced services view with search, filters, and
 * view mode toggle.
 *
 * Uses the graph prop to build service information and displays
 * it through the existing EnhancedServicesView component.
 *
 * @packageDocumentation
 */

import React, { useMemo, type ReactElement } from "react";
import type { ExportedGraph } from "@hex-di/devtools-core";
import type { PluginProps } from "../../react/types/plugin-types.js";
import { EnhancedServicesView } from "../../react/enhanced-services-view.js";
import type { ServiceInfo } from "../../react/resolved-services.js";
import { emptyStyles } from "../../react/styles.js";

// =============================================================================
// Utilities
// =============================================================================

/**
 * Build ServiceInfo list from exported graph.
 *
 * Creates service info with dependencies from the graph data.
 * Since we don't have direct container access in the plugin context,
 * services are shown with their static graph information.
 */
function buildServicesFromGraph(exportedGraph: ExportedGraph): readonly ServiceInfo[] {
  // Build a map of port name to dependencies
  const dependencyMap = new Map<string, readonly string[]>();
  for (const edge of exportedGraph.edges) {
    const existingDeps = dependencyMap.get(edge.from);
    if (existingDeps !== undefined) {
      dependencyMap.set(edge.from, [...existingDeps, edge.to]);
    } else {
      dependencyMap.set(edge.from, [edge.to]);
    }
  }

  return exportedGraph.nodes.map(node => ({
    portName: node.id,
    lifetime: node.lifetime,
    factoryKind: node.factoryKind,
    isResolved: false,
    isScopeRequired: node.lifetime !== "singleton",
    resolvedAt: undefined,
    resolutionOrder: undefined,
    dependencies: dependencyMap.get(node.id) ?? [],
    inheritanceMode: node.inheritanceMode,
  }));
}

/**
 * Check if the graph is empty (no services registered).
 */
function isEmptyGraph(graph: ExportedGraph): boolean {
  return graph.nodes.length === 0;
}

// =============================================================================
// ServicesPluginContent Component
// =============================================================================

/**
 * Content component for the Services plugin.
 *
 * Displays the enhanced services view with:
 * - Search input with 300ms debounce
 * - Lifetime filters (All/Singleton/Scoped/Transient)
 * - Status filters (Resolved/Pending)
 * - View mode toggle (List/Tree)
 * - Service items with expandable details
 *
 * @example
 * ```tsx
 * import { ServicesPluginContent } from './services-content';
 *
 * function MyServicesPlugin(props: PluginProps) {
 *   return <ServicesPluginContent {...props} />;
 * }
 * ```
 */
export function ServicesPluginContent(props: PluginProps): ReactElement {
  const { graph, tracingAPI } = props;

  // Build services list from the graph data
  const services = useMemo(() => buildServicesFromGraph(graph), [graph]);

  // Handle empty state
  // Note: The tabpanel role is provided by PluginTabContent, not here.
  if (isEmptyGraph(graph)) {
    return (
      <div
        data-testid="tab-content-services"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <div style={emptyStyles.container}>No services registered.</div>
      </div>
    );
  }

  return (
    <div
      data-testid="tab-content-services"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "auto",
      }}
    >
      <EnhancedServicesView services={services} exportedGraph={graph} tracingAPI={tracingAPI} />
    </div>
  );
}
