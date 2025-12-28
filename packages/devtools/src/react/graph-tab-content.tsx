/**
 * Graph tab content component with container switching support.
 *
 * Provides a container selector to switch between registered containers
 * and displays the dependency graph for the selected container.
 *
 * @packageDocumentation
 */

import React, { useMemo, type ReactElement } from "react";
import type { ExportedGraph } from "@hex-di/devtools-core";
import { ContainerSelector } from "./container-selector.js";
import { DependencyGraph } from "./graph-visualization/index.js";
import { useContainerList } from "./hooks/use-container-list.js";
import { isSome } from "./types/adt.js";
import { buildExportedGraphFromContainer } from "./utils/build-graph-from-container.js";
import { emptyStyles } from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the GraphTabContent component.
 */
export interface GraphTabContentProps {
  /**
   * Default graph to display when no container is selected
   * or when container registry is not available.
   */
  readonly defaultGraph: ExportedGraph;
}

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
  if (exportedGraph.nodes.length === 0) {
    return <div style={emptyStyles.container}>No adapters registered in this graph.</div>;
  }

  // Transform nodes to include lifetime and factoryKind for DependencyGraph
  const graphNodes = exportedGraph.nodes.map(node => ({
    id: node.id,
    label: node.label,
    lifetime: node.lifetime as "singleton" | "scoped" | "transient",
    factoryKind: node.factoryKind as "sync" | "async",
  }));

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
// GraphTabContent Component
// =============================================================================

/**
 * Graph tab content with container switching support.
 *
 * When inside a ContainerRegistryProvider, shows a dropdown to select
 * from all registered containers. The dependency graph updates to show
 * the selected container's adapters and dependencies.
 *
 * When no registry is available, displays the default graph passed via props.
 *
 * @example
 * ```tsx
 * import { GraphTabContent } from './graph-tab-content';
 * import { toJSON } from '@hex-di/devtools-core';
 *
 * function MyDevTools({ graph }) {
 *   const exportedGraph = useMemo(() => toJSON(graph), [graph]);
 *   return <GraphTabContent defaultGraph={exportedGraph} />;
 * }
 * ```
 */
export function GraphTabContent({ defaultGraph }: GraphTabContentProps): ReactElement {
  const { isAvailable, containers, selectedId } = useContainerList();

  // Find the selected container entry
  const selectedEntry = useMemo(
    () => (isSome(selectedId) ? (containers.find(c => c.id === selectedId.value) ?? null) : null),
    [containers, selectedId]
  );

  // Build graph from selected container, or use default
  const exportedGraph = useMemo(() => {
    if (selectedEntry !== null) {
      return buildExportedGraphFromContainer(selectedEntry.container);
    }
    return defaultGraph;
  }, [selectedEntry, defaultGraph]);

  return (
    <div
      data-testid="tab-content-graph"
      id="tabpanel-graph"
      role="tabpanel"
      aria-labelledby="tab-graph"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* Container selector when registry is available */}
      {isAvailable && (
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
            backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
          }}
        >
          <ContainerSelector compact />
        </div>
      )}

      {/* Dependency graph visualization */}
      <GraphView exportedGraph={exportedGraph} />
    </div>
  );
}
