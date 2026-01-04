/**
 * InspectorPluginContent Component
 *
 * The content component for the Inspector plugin. Accepts PluginProps
 * and renders the container inspector with scope hierarchy tree and
 * resolved services list.
 *
 * Uses the graph prop to build service information and displays
 * container/scope hierarchy using the unified tree hooks.
 *
 * @packageDocumentation
 */

import React, { useState, useMemo, useCallback, useRef, useEffect, type ReactElement } from "react";
import type { ExportedGraph } from "@hex-di/devtools-core";
import type { ScopeTree } from "@hex-di/plugin";
import type { PluginProps } from "../../runtime/plugin-types.js";
import { containerInspectorStyles, emptyStyles } from "../../react/styles.js";
import { ContainerScopeHierarchy } from "../../react/container-scope-hierarchy.js";
import { ScopeHierarchy } from "../../react/scope-hierarchy.js";
import { ResolvedServices, type ServiceInfo } from "../../react/resolved-services.js";
import { useContainerScopeTreeOptional } from "../../react/hooks/use-container-scope-tree.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Parsed selection from a tree node ID.
 *
 * Node IDs follow the format:
 * - Container: "container:{containerId}"
 * - Scope: "scope:{containerId}:{scopeId}"
 */
interface ParsedSelection {
  /** The container ID if a container or scope is selected */
  readonly containerId: string | null;
  /** The scope ID if a scope is selected (within the container) */
  readonly scopeId: string | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parses a tree node ID into container and scope IDs.
 */
function parseNodeId(nodeId: string | null): ParsedSelection {
  if (nodeId === null) {
    return { containerId: null, scopeId: null };
  }

  const parts = nodeId.split(":");
  const type = parts[0];

  if (type === "container" && parts.length >= 2) {
    return { containerId: parts[1], scopeId: null };
  }

  if (type === "scope" && parts.length >= 3) {
    // Format: "scope:{containerId}:{scopeId}"
    // Scope ID might contain colons, so join remaining parts
    return { containerId: parts[1], scopeId: parts.slice(2).join(":") };
  }

  // Fallback: treat as old-style scope ID
  return { containerId: null, scopeId: nodeId };
}

/**
 * Recursively searches for a scope in the tree and returns its resolvedPorts.
 */
function findScopeResolvedPorts(tree: ScopeTree, scopeId: string): Set<string> | null {
  if (tree.id === scopeId) {
    return new Set(tree.resolvedPorts);
  }
  for (const child of tree.children) {
    const result = findScopeResolvedPorts(child, scopeId);
    if (result !== null) {
      return result;
    }
  }
  return null;
}

/**
 * Build ServiceInfo list from exported graph.
 *
 * Creates service info with dependencies from the graph data.
 * Since we're using PluginProps, we build from graph data directly.
 */
function buildServicesFromGraph(
  exportedGraph: ExportedGraph,
  selectedScopeId: string | null,
  scopeTree: ScopeTree | null
): readonly ServiceInfo[] {
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

  // Find resolved ports for selected scope if any
  let scopeResolvedPorts: Set<string> | null = null;
  if (selectedScopeId !== null && selectedScopeId !== "container" && scopeTree !== null) {
    scopeResolvedPorts = findScopeResolvedPorts(scopeTree, selectedScopeId);
  }

  const services: ServiceInfo[] = exportedGraph.nodes.map(node => {
    // Determine resolution status for scoped services
    let isResolved = false;

    if (node.lifetime === "scoped") {
      if (scopeResolvedPorts !== null) {
        isResolved = scopeResolvedPorts.has(node.id);
      } else {
        isResolved = false;
      }
    }
    // For singleton/transient without actual container, mark as not resolved
    // In plugin context we don't have direct container access

    return {
      portName: node.id,
      lifetime: node.lifetime,
      factoryKind: node.factoryKind,
      isResolved,
      isScopeRequired: node.lifetime !== "singleton" && scopeResolvedPorts === null,
      resolvedAt: undefined,
      resolutionOrder: undefined,
      dependencies: dependencyMap.get(node.id) ?? [],
      inheritanceMode: node.inheritanceMode,
    };
  });

  // Sort alphabetically since we don't have resolution order
  return services.sort((a, b) => a.portName.localeCompare(b.portName));
}

/**
 * Check if the graph is empty (no services registered).
 */
function isEmptyGraph(graph: ExportedGraph): boolean {
  return graph.nodes.length === 0;
}

// =============================================================================
// InspectorPluginContent Component
// =============================================================================

/**
 * Content component for the Inspector plugin.
 *
 * Displays the container inspector with:
 * - Scope hierarchy tree visualization
 * - Resolved services list with search and filters
 * - Container selection for multi-container support
 * - Auto-refresh controls
 *
 * @example
 * ```tsx
 * import { InspectorPluginContent } from './inspector-content';
 *
 * function MyInspectorPlugin(props: PluginProps) {
 *   return <InspectorPluginContent {...props} />;
 * }
 * ```
 */
export function InspectorPluginContent(props: PluginProps): ReactElement {
  const { graph } = props;

  // Get container scope tree from DevToolsProvider if available
  // Falls back to empty tree when used outside DevToolsProvider
  const containerScopeTreeResult = useContainerScopeTreeOptional();
  const containerScopeTree = containerScopeTreeResult?.tree ?? [];
  const isRegistryAvailable = containerScopeTreeResult?.isRegistryAvailable ?? false;
  // Stable reference for refreshTree to avoid useCallback dependency issues
  const refreshTree = useMemo(
    () => containerScopeTreeResult?.refreshTree ?? (() => {}),
    [containerScopeTreeResult?.refreshTree]
  );

  // Selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse selected node ID to extract container ID and scope ID
  const parsedSelection = useMemo(() => parseNodeId(selectedNodeId), [selectedNodeId]);

  // Build a minimal scope tree from graph for fallback display
  const fallbackScopeTree: ScopeTree = useMemo(
    () => ({
      id: "container",
      status: "active" as const,
      children: [],
      resolvedPorts: [],
      resolvedCount: 0,
      totalCount: graph.nodes.length,
    }),
    [graph.nodes.length]
  );

  // Build services list from the graph data
  const services = useMemo(
    () => buildServicesFromGraph(graph, parsedSelection.scopeId, fallbackScopeTree),
    [graph, parsedSelection.scopeId, fallbackScopeTree]
  );

  // Refresh function for manual refresh button
  const refresh = useCallback(() => {
    refreshTree();
  }, [refreshTree]);

  // Auto-refresh polling
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 1000);
    } else if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refresh]);

  // Handle auto-refresh toggle
  const handleAutoRefreshToggle = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  // Handle empty state
  // Note: The tabpanel role is provided by PluginTabContent, not here.
  if (isEmptyGraph(graph)) {
    return (
      <div
        data-testid="tab-content-inspector"
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

  const autoRefreshButtonStyle = {
    ...containerInspectorStyles.autoRefreshToggle,
    ...(autoRefresh ? containerInspectorStyles.autoRefreshToggleActive : {}),
  };

  return (
    <div
      data-testid="tab-content-inspector"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "auto",
        padding: "16px",
      }}
    >
      <div style={containerInspectorStyles.container}>
        {/* Header with controls */}
        <div style={containerInspectorStyles.headerControls}>
          <button
            data-testid="manual-refresh-button"
            style={containerInspectorStyles.refreshButton}
            onClick={refresh}
            type="button"
          >
            Refresh
          </button>
          <button
            data-testid="auto-refresh-toggle"
            style={autoRefreshButtonStyle}
            onClick={handleAutoRefreshToggle}
            type="button"
            aria-pressed={autoRefresh}
          >
            Auto {autoRefresh ? "ON" : "OFF"}
          </button>
        </div>

        {/* Scope Hierarchy */}
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--hex-devtools-text-muted)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Scope Hierarchy
          </div>
          {isRegistryAvailable && containerScopeTree.length > 0 ? (
            <ContainerScopeHierarchy
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              tree={containerScopeTree}
            />
          ) : (
            <ScopeHierarchy
              scopeTree={fallbackScopeTree}
              selectedScopeId={parsedSelection.scopeId}
              onScopeSelect={scopeId => setSelectedNodeId(scopeId)}
            />
          )}
        </div>

        {/* Resolved Services */}
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--hex-devtools-text-muted)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Resolved Services
          </div>
          <ResolvedServices services={services} />
        </div>
      </div>
    </div>
  );
}
