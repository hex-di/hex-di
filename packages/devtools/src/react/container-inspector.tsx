/**
 * ContainerInspector React component for runtime container state inspection.
 *
 * Main component that combines ScopeHierarchy and ResolvedServices to provide
 * a comprehensive view of container state. Includes auto-refresh polling and
 * manual refresh controls.
 *
 * @packageDocumentation
 */

import React, { useState, useEffect, useMemo, useCallback, useRef, type ReactElement } from "react";
import type { Port } from "@hex-di/core";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import { createInspector } from "../index.js";
import type { ContainerInspector as RuntimeInspector } from "../index.js";
import type { ExportedGraph } from "@hex-di/devtools-core";
import type { TracingAPI, ScopeTree, ContainerKind, TraceEntry } from "@hex-di/core";
import { containerInspectorStyles } from "./styles.js";
import { ContainerScopeHierarchy } from "./container-scope-hierarchy.js";
import { ScopeHierarchy } from "./scope-hierarchy.js";
import { ResolvedServices, type ServiceInfo } from "./resolved-services.js";
import { useContainerScopeTreeOptional } from "./hooks/use-container-scope-tree.js";

// =============================================================================
// Node ID Parsing
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

/**
 * Parses a tree node ID into container and scope IDs.
 *
 * @param nodeId - The node ID from tree selection
 * @returns Parsed container ID and scope ID
 *
 * @example Container selection
 * ```typescript
 * parseNodeId("container:root")
 * // Returns: { containerId: "root", scopeId: null }
 * ```
 *
 * @example Scope selection
 * ```typescript
 * parseNodeId("scope:root:alice-session")
 * // Returns: { containerId: "root", scopeId: "alice-session" }
 * ```
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

  // Fallback: treat as old-style scope ID (for backwards compatibility)
  return { containerId: null, scopeId: nodeId };
}

/**
 * Minimal singleton entry interface for display purposes.
 * Compatible with both runtime and devtools-core snapshot types.
 */
interface MinimalSingletonEntry {
  readonly portName: string;
  readonly isResolved: boolean;
  readonly resolvedAt?: number;
  readonly resolutionOrder?: number;
}

/**
 * Minimal snapshot interface that captures the common fields between
 * RuntimeInspector.snapshot() and legacy APIs.
 *
 * This allows the component to work with RuntimeInspector.
 */
interface MinimalSnapshot {
  readonly isDisposed: boolean;
  readonly singletons: readonly MinimalSingletonEntry[];
  readonly scopes: ScopeTree;
  /**
   * Container kind (root, child, lazy, scope).
   * Only present in certain snapshot types.
   */
  readonly kind?: ContainerKind;
}

// =============================================================================
// Normalized Inspector Interface
// =============================================================================

/**
 * Unified inspector interface for RuntimeInspector.
 */
interface NormalizedInspector {
  getSnapshot(): MinimalSnapshot;
  getScopeTree(): ScopeTree;
  isResolved(portName: string): boolean | "scope-required";
}

/**
 * Normalizes RuntimeInspector (from @hex-di/runtime) to a common interface.
 */
function normalizeRuntimeInspector(inspector: RuntimeInspector): NormalizedInspector {
  return {
    getSnapshot: (): MinimalSnapshot => {
      const snapshot = inspector.snapshot();
      // RuntimeInspector returns runtime ContainerSnapshot
      return {
        isDisposed: snapshot.isDisposed,
        singletons: snapshot.singletons,
        scopes: snapshot.scopes,
      };
    },
    getScopeTree: () => inspector.getScopeTree(),
    isResolved: (portName: string) => inspector.isResolved(portName),
  };
}

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the ContainerInspector component.
 *
 * Either `container` or `inspector` must be provided:
 * - Use `container` when inspecting a Container directly
 * - Use `inspector` when using a RuntimeInspector
 */
export interface ContainerInspectorProps<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
> {
  /**
   * The runtime container to inspect.
   * An inspector will be created from this container.
   */
  readonly container?: Container<TProvides, TExtends, TAsyncPorts, TPhase>;
  /**
   * Pre-created inspector to use.
   * Takes precedence over `container` when provided.
   */
  readonly inspector?: RuntimeInspector;
  /** The exported dependency graph for metadata */
  readonly exportedGraph: ExportedGraph;
  /** Optional tracing API for request service stats */
  readonly tracingAPI?: TracingAPI | undefined;
}

/**
 * Stats computed from trace data for request-scoped services.
 */
interface RequestServiceStats {
  /** Total number of times the service was resolved */
  readonly callCount: number;
  /** Timestamp of the most recent resolution */
  readonly lastResolvedAt: number;
  /** Average resolution duration in milliseconds */
  readonly averageDuration: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Computes resolution stats for a request-scoped service from trace data.
 *
 * @param portName - The port name to compute stats for
 * @param tracingAPI - The tracing API to query (optional)
 * @returns Stats object or undefined if no tracing data available
 */
function getRequestServiceStats(
  portName: string,
  tracingAPI: TracingAPI | undefined
): RequestServiceStats | undefined {
  if (tracingAPI === undefined) {
    return undefined;
  }

  const traces = tracingAPI.getTraces({ portName });
  const requestTraces = traces.filter((t: TraceEntry) => t.lifetime === "transient");

  if (requestTraces.length === 0) {
    return undefined;
  }

  const totalDuration = requestTraces.reduce((sum: number, t: TraceEntry) => sum + t.duration, 0);
  const lastResolvedAt = Math.max(...requestTraces.map((t: TraceEntry) => t.startTime));

  return {
    callCount: requestTraces.length,
    lastResolvedAt,
    averageDuration: totalDuration / requestTraces.length,
  };
}

/**
 * Recursively searches for a scope in the tree and returns its resolvedPorts.
 *
 * @param tree - The scope tree to search
 * @param scopeId - The scope ID to find
 * @returns Set of resolved port names, or null if scope not found
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
 * Builds the service info list from snapshot and graph data.
 *
 * Combines information from:
 * - Container snapshot (resolution status, timestamps)
 * - Exported graph (lifetime, dependencies)
 * - Tracing API (for request service stats)
 *
 * @param snapshot - The container snapshot
 * @param exportedGraph - The exported dependency graph
 * @param selectedScopeId - The currently selected scope ID (null = root)
 * @param inspector - The container inspector instance
 * @param tracingAPI - Optional tracing API for request service stats
 * @returns Array of ServiceInfo for display
 */
function buildServiceList(
  snapshot: MinimalSnapshot,
  exportedGraph: ExportedGraph,
  selectedScopeId: string | null,
  inspector: NormalizedInspector,
  tracingAPI: TracingAPI | undefined
): readonly ServiceInfo[] {
  const services: ServiceInfo[] = [];

  // Build a map of port name to dependencies
  const dependencyMap = new Map<string, readonly string[]>();
  for (const edge of exportedGraph.edges) {
    const deps = dependencyMap.get(edge.from);
    if (deps !== undefined) {
      dependencyMap.set(edge.from, [...deps, edge.to]);
    } else {
      dependencyMap.set(edge.from, [edge.to]);
    }
  }

  // Build a map of singleton entries for lookup
  const singletonMap = new Map<string, (typeof snapshot.singletons)[number]>();
  for (const entry of snapshot.singletons) {
    singletonMap.set(entry.portName, entry);
  }

  // Find the selected scope's resolved ports if a scope is selected
  let scopeResolvedPorts: Set<string> | null = null;
  if (selectedScopeId !== null && selectedScopeId !== "container") {
    scopeResolvedPorts = findScopeResolvedPorts(snapshot.scopes, selectedScopeId);
  }

  // Process all nodes from the graph
  for (const node of exportedGraph.nodes) {
    const dependencies = dependencyMap.get(node.id) ?? [];

    // Determine resolution status
    let isResolved = false;
    let isScopeRequired = false;
    let resolvedAt: number | undefined;
    let resolutionOrder: number | undefined;

    // Handle scoped services when a scope is selected
    if (node.lifetime === "scoped") {
      if (scopeResolvedPorts !== null) {
        // We have scope data, check if this service is resolved in the selected scope
        isResolved = scopeResolvedPorts.has(node.id);
        isScopeRequired = false;
      } else {
        // No scope selected, mark as scope-required
        isScopeRequired = true;
        isResolved = false;
      }
    } else {
      // For singleton/transient, use existing logic
      try {
        const status = inspector.isResolved(node.id);
        if (status === "scope-required") {
          isScopeRequired = selectedScopeId === null;
          isResolved = false;
        } else {
          isResolved = status;
        }
      } catch {
        // Port might not be in container if graph was modified
        isResolved = false;
      }

      // Get metadata from singleton entries
      const singletonEntry = singletonMap.get(node.id);
      if (singletonEntry !== undefined) {
        isResolved = singletonEntry.isResolved;
        resolvedAt = singletonEntry.resolvedAt;
        resolutionOrder = singletonEntry.resolutionOrder;
      }
    }

    // Get stats for request-scoped services from tracing data
    let callCount: number | undefined;
    let lastResolvedAt: number | undefined;
    let averageDuration: number | undefined;

    if (node.lifetime === "transient") {
      const stats = getRequestServiceStats(node.id, tracingAPI);
      if (stats !== undefined) {
        callCount = stats.callCount;
        lastResolvedAt = stats.lastResolvedAt;
        averageDuration = stats.averageDuration;
      }
    }

    services.push({
      portName: node.id,
      lifetime: node.lifetime,
      isResolved,
      isScopeRequired,
      resolvedAt,
      resolutionOrder,
      dependencies,
      callCount,
      lastResolvedAt,
      averageDuration,
      inheritanceMode: node.inheritanceMode,
      factoryKind: node.factoryKind,
    });
  }

  // Sort by resolution order (resolved first, then by name)
  return services.sort((a, b) => {
    // Resolved services come first
    if (a.isResolved !== b.isResolved) {
      return a.isResolved ? -1 : 1;
    }
    // Then by resolution order (if both resolved)
    if (
      a.isResolved &&
      b.isResolved &&
      a.resolutionOrder !== undefined &&
      b.resolutionOrder !== undefined
    ) {
      return a.resolutionOrder - b.resolutionOrder;
    }
    // Otherwise alphabetically
    return a.portName.localeCompare(b.portName);
  });
}

// =============================================================================
// ContainerInspector Component
// =============================================================================

/**
 * ContainerInspector component for runtime container state inspection.
 *
 * Features:
 * - Scope hierarchy tree visualization
 * - Resolved services list with filters and search
 * - Auto-refresh polling (1 second interval, off by default)
 * - Manual refresh button
 * - Selected scope context for viewing scoped services
 *
 * @param props - The component props
 * @returns A React element containing the container inspector
 *
 * @example
 * ```tsx
 * import { ContainerInspector } from '@hex-di/devtools/react';
 *
 * function InspectorView() {
 *   const exportedGraph = useMemo(() => toJSON(graph), [graph]);
 *   return (
 *     <ContainerInspector
 *       container={container}
 *       exportedGraph={exportedGraph}
 *     />
 *   );
 * }
 * ```
 */
export function ContainerInspector<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
>({
  container,
  inspector: inspectorProp,
  exportedGraph,
  tracingAPI,
}: ContainerInspectorProps<TProvides, TExtends, TAsyncPorts, TPhase>): ReactElement {
  // Create inspector from container if not provided directly
  const createdInspector = useMemo(
    () => (container !== undefined ? createInspector(container) : null),
    [container]
  );

  // Use provided inspector or created one, then normalize
  const rawInspector = inspectorProp ?? createdInspector;

  // Normalize the inspector to a common interface
  const inspector = useMemo(
    () => (rawInspector !== null ? normalizeRuntimeInspector(rawInspector) : null),
    [rawInspector]
  );

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

  // State
  const [snapshot, setSnapshot] = useState<MinimalSnapshot | null>(null);
  const [scopeTree, setScopeTree] = useState<ScopeTree | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse selected node ID to extract container ID and scope ID
  const parsedSelection = useMemo(() => parseNodeId(selectedNodeId), [selectedNodeId]);

  // Get inspector for the selected container (or fall back to default)
  // This enables viewing services from different containers when clicking in the tree
  // Note: ContainerTreeEntry from discovery doesn't include inspector access,
  // so we fall back to the default inspector. Full inspector access requires
  // the InspectorPlugin integration which provides inspector via different path.
  const selectedInspector = useMemo((): NormalizedInspector | null => {
    // ContainerTreeEntry doesn't have inspector access - use default
    // Future: integrate with InspectorPlugin's getChildContainers() for inspector access
    return inspector;
  }, [inspector]);

  // Get snapshot and scope tree from the selected inspector
  // This ensures we show services from the correct container
  const selectedSnapshot = useMemo((): MinimalSnapshot | null => {
    if (selectedInspector === null) {
      return null;
    }
    try {
      return selectedInspector.getSnapshot();
    } catch {
      return null;
    }
  }, [selectedInspector]);

  const selectedScopeTree = useMemo((): ScopeTree | null => {
    if (selectedInspector === null) {
      return null;
    }
    try {
      return selectedInspector.getScopeTree();
    } catch {
      return null;
    }
  }, [selectedInspector]);

  // Build ExportedGraph from selected container with merged parent services.
  // Note: ContainerTreeEntry doesn't include inspector access for graph building,
  // so we use the exportedGraph prop. Full multi-container graph support requires
  // InspectorPlugin integration.
  const selectedExportedGraph = useMemo((): ExportedGraph => {
    // Use the provided exportedGraph - multi-container graph building
    // requires inspector access not available in ContainerTreeEntry
    return exportedGraph;
  }, [exportedGraph]);

  // Refresh function - handles null inspector gracefully
  // Also refreshes the unified container/scope tree
  const refresh = useCallback(() => {
    if (inspector === null) {
      return;
    }
    try {
      const newSnapshot = inspector.getSnapshot();
      const newTree = inspector.getScopeTree();
      setSnapshot(newSnapshot);
      setScopeTree(newTree);
      setError(null);
      // Refresh the unified container/scope tree so scopes are visible
      refreshTree();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to inspect container");
      }
    }
  }, [inspector, refreshTree]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

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

  // Determine which snapshot and scope tree to use for services
  // Prefer selected container's data, fall back to base inspector's data
  const effectiveSnapshot = selectedSnapshot ?? snapshot;
  const effectiveScopeTree = selectedScopeTree ?? scopeTree;
  const effectiveInspector = selectedInspector ?? inspector;

  // Build service list - returns empty array if inspector is null
  // Uses selectedExportedGraph which includes per-service inheritance modes
  const services = useMemo(() => {
    if (effectiveSnapshot === null || effectiveInspector === null) {
      return [];
    }
    return buildServiceList(
      effectiveSnapshot,
      selectedExportedGraph,
      parsedSelection.scopeId,
      effectiveInspector,
      tracingAPI
    );
  }, [
    effectiveSnapshot,
    selectedExportedGraph,
    parsedSelection.scopeId,
    effectiveInspector,
    tracingAPI,
  ]);

  // Handle auto-refresh toggle
  const handleAutoRefreshToggle = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  // Validate that we have an inspector - all hooks called before this point
  if (inspector === null) {
    return (
      <div style={containerInspectorStyles.container}>
        <div style={containerInspectorStyles.error}>No container or inspector provided</div>
      </div>
    );
  }

  // Error state
  if (error !== null) {
    return (
      <div style={containerInspectorStyles.container}>
        <div style={{ color: "#f38ba8", padding: "16px" }}>Error: {error}</div>
      </div>
    );
  }

  // Loading state
  if (snapshot === null || scopeTree === null) {
    return (
      <div style={containerInspectorStyles.container}>
        <div style={{ color: "var(--hex-devtools-text-muted)", padding: "16px" }}>Loading...</div>
      </div>
    );
  }

  const autoRefreshButtonStyle = {
    ...containerInspectorStyles.autoRefreshToggle,
    ...(autoRefresh ? containerInspectorStyles.autoRefreshToggleActive : {}),
  };

  return (
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
            scopeTree={
              effectiveScopeTree ??
              scopeTree ?? {
                id: "container",
                status: "active",
                children: [],
                resolvedPorts: [],
                resolvedCount: 0,
                totalCount: 0,
              }
            }
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
  );
}
