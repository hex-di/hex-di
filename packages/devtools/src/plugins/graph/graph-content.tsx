/**
 * GraphPluginContent Component
 *
 * The content component for the Graph plugin. Accepts PluginProps
 * and renders a split layout with:
 * - LEFT: Container hierarchy tree (280px)
 * - RIGHT: Dependency graph visualization (flex)
 *
 * Uses runtime state for container selection and displays a unified
 * graph showing all selected containers' ports.
 *
 * @packageDocumentation
 */

import React, { useMemo, useState, type ReactElement } from "react";
import type { ExportedGraph } from "@hex-di/devtools-core";
import type { PluginProps } from "../../react/types/plugin-types.js";
import { DependencyGraph } from "../../react/graph-visualization/index.js";
import { emptyStyles } from "../../react/styles.js";
import { transformNodesToGraphNodes, isEmptyGraph } from "./utils.js";
import { ContainerScopeHierarchy } from "../shared/container-scope-hierarchy.js";

// =============================================================================
// Internal Components
// =============================================================================

/**
 * Graph view section showing visual dependency graph.
 */
interface GraphViewProps {
  readonly exportedGraph: ExportedGraph;
}

function GraphView({ exportedGraph }: GraphViewProps): ReactElement {
  // Transform nodes to the format expected by DependencyGraph
  const graphNodes = useMemo(() => transformNodesToGraphNodes(exportedGraph), [exportedGraph]);

  if (isEmptyGraph(exportedGraph)) {
    return <div style={emptyStyles.container}>No adapters registered in this graph.</div>;
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <DependencyGraph
        nodes={graphNodes}
        edges={exportedGraph.edges}
        direction="TB"
        showControls={true}
      />
    </div>
  );
}

// =============================================================================
// GraphPluginContent Component
// =============================================================================

// =============================================================================
// Styles
// =============================================================================

const splitLayoutStyles = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "row" as const,
    minHeight: 0,
  },
  leftPanel: {
    width: 280,
    flexShrink: 0,
    borderRight: "1px solid #e0e0e0",
    backgroundColor: "#fafafa",
    overflow: "auto",
  },
  rightPanel: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column" as const,
  },
  header: {
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 600,
    color: "#666",
    borderBottom: "1px solid #e0e0e0",
  },
  treeContent: {
    flex: 1,
    overflow: "auto",
    padding: "8px",
  },
};

/**
 * Content component for the Graph plugin.
 *
 * Displays a split layout with:
 * - LEFT (280px): Container hierarchy tree for navigation
 * - RIGHT (flex): Dependency graph visualization
 *
 * The container hierarchy shows all discovered containers and their scopes,
 * allowing users to navigate and select containers to view in the graph.
 *
 * @example
 * ```tsx
 * import { GraphPluginContent } from './graph-content';
 *
 * function MyGraphPlugin(props: PluginProps) {
 *   return <GraphPluginContent {...props} />;
 * }
 * ```
 */
export function GraphPluginContent(props: PluginProps): ReactElement {
  const { graph, containerScopeTree } = props;

  // Get tree from containerScopeTree prop (V7 fix - data via props not hooks)
  const tree = containerScopeTree?.tree ?? [];

  // Track selected node in hierarchy
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // The graph prop contains the appropriate data based on container selection.
  // This is computed by the DevTools panel based on runtime state.

  // Note: The tabpanel role is provided by PluginTabContent, not here.
  // This component only renders the content within the tabpanel.
  return (
    <div data-testid="tab-content-graph" style={splitLayoutStyles.container}>
      {/* Left panel: Container hierarchy */}
      <div style={splitLayoutStyles.leftPanel}>
        <div style={splitLayoutStyles.header}>Container Hierarchy</div>
        <div style={splitLayoutStyles.treeContent}>
          <ContainerScopeHierarchy
            tree={tree}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
          />
        </div>
      </div>

      {/* Right panel: Dependency graph visualization */}
      <div style={splitLayoutStyles.rightPanel}>
        <GraphView exportedGraph={graph} />
      </div>
    </div>
  );
}
