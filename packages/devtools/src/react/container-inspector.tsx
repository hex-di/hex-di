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
import type { Port } from "@hex-di/ports";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import type { InspectorAPI } from "@hex-di/inspector";
import { createInspector } from "../index.js";
import type { ContainerInspector as RuntimeInspector } from "../index.js";
import type { ExportedGraph, TracingAPI, ScopeTree, ContainerKind } from "@hex-di/devtools-core";
import { containerInspectorStyles, getInheritanceModeBadgeStyle } from "./styles.js";
import { ScopeHierarchy } from "./scope-hierarchy.js";
import { ResolvedServices, type ServiceInfo } from "./resolved-services.js";

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
 * Inheritance mode for child containers.
 */
type InheritanceMode = "shared" | "forked" | "isolated";

/**
 * Minimal snapshot interface that captures the common fields between
 * RuntimeInspector.snapshot() and InspectorAPI.getSnapshot().
 *
 * This allows the component to work with both inspector types without
 * requiring exact type compatibility.
 */
interface MinimalSnapshot {
  readonly isDisposed: boolean;
  readonly singletons: readonly MinimalSingletonEntry[];
  readonly scopes: ScopeTree;
  /**
   * Container kind (root, child, lazy, scope).
   * Only present when using InspectorAPI (devtools-core types).
   * Not available when using RuntimeInspector directly.
   */
  readonly kind?: ContainerKind;
  /** Inheritance mode (only present for child containers) */
  readonly inheritanceMode?: InheritanceMode;
}

// =============================================================================
// Normalized Inspector Interface
// =============================================================================

/**
 * Unified inspector interface that works with both InspectorAPI and RuntimeInspector.
 *
 * This abstracts away the method name differences:
 * - InspectorAPI: `getSnapshot()`, `getScopeTree()`
 * - RuntimeInspector: `snapshot()`, `getScopeTree()`
 */
interface NormalizedInspector {
  getSnapshot(): MinimalSnapshot;
  getScopeTree(): ScopeTree;
  isResolved(portName: string): boolean | "scope-required";
}

/**
 * Type guard to check if an inspector is an InspectorAPI (has getSnapshot method).
 */
function isInspectorAPI(inspector: InspectorAPI | RuntimeInspector): inspector is InspectorAPI {
  return "getSnapshot" in inspector && typeof inspector.getSnapshot === "function";
}

/**
 * Normalizes either InspectorAPI or RuntimeInspector to a common interface.
 *
 * Both inspector types return compatible snapshot data, but with slightly
 * different type definitions. We cast to MinimalSnapshot which captures
 * only the fields we actually use.
 */
function normalizeInspector(inspector: InspectorAPI | RuntimeInspector): NormalizedInspector {
  if (isInspectorAPI(inspector)) {
    return {
      getSnapshot: (): MinimalSnapshot => {
        const snapshot = inspector.getSnapshot();
        // InspectorAPI returns devtools-core ContainerSnapshot (discriminated union)
        // We extract the fields we need, including kind and inheritanceMode for child containers
        const base = {
          isDisposed: snapshot.isDisposed,
          singletons: snapshot.singletons,
          scopes: snapshot.scopes,
          kind: snapshot.kind,
        };
        // Extract inheritanceMode for child containers
        if (snapshot.kind === "child") {
          return { ...base, inheritanceMode: snapshot.inheritanceMode };
        }
        return base;
      },
      getScopeTree: () => inspector.getScopeTree(),
      isResolved: (portName: string) => inspector.isResolved(portName),
    };
  }
  return {
    getSnapshot: (): MinimalSnapshot => {
      const snapshot = inspector.snapshot();
      // RuntimeInspector returns runtime ContainerSnapshot (simpler type without kind)
      // We extract only the fields available in runtime snapshot
      return {
        isDisposed: snapshot.isDisposed,
        singletons: snapshot.singletons,
        scopes: snapshot.scopes,
        // kind is not available in runtime snapshot - omitted
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
 * - Use `inspector` when using an InspectorAPI or RuntimeInspector
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
   * Accepts either InspectorAPI (deprecated) or RuntimeInspector.
   */
  readonly inspector?: InspectorAPI | RuntimeInspector;
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
  const requestTraces = traces.filter(t => t.lifetime === "transient");

  if (requestTraces.length === 0) {
    return undefined;
  }

  const totalDuration = requestTraces.reduce((sum, t) => sum + t.duration, 0);
  const lastResolvedAt = Math.max(...requestTraces.map(t => t.startTime));

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
    () => (rawInspector !== null ? normalizeInspector(rawInspector) : null),
    [rawInspector]
  );

  // State
  const [snapshot, setSnapshot] = useState<MinimalSnapshot | null>(null);
  const [scopeTree, setScopeTree] = useState<ScopeTree | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh function - handles null inspector gracefully
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
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to inspect container");
      }
    }
  }, [inspector]);

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

  // Build service list - returns empty array if inspector is null
  const services = useMemo(() => {
    if (snapshot === null || inspector === null) {
      return [];
    }
    return buildServiceList(snapshot, exportedGraph, selectedScopeId, inspector, tracingAPI);
  }, [snapshot, exportedGraph, selectedScopeId, inspector, tracingAPI]);

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
        {/* Inheritance mode badge for child containers */}
        {snapshot.kind === "child" && snapshot.inheritanceMode !== undefined && (
          <span
            style={getInheritanceModeBadgeStyle(snapshot.inheritanceMode)}
            data-testid="container-inheritance-mode"
            title={`Inheritance mode: ${snapshot.inheritanceMode}`}
          >
            {snapshot.inheritanceMode}
          </span>
        )}
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
        <ScopeHierarchy
          scopeTree={scopeTree}
          selectedScopeId={selectedScopeId}
          onScopeSelect={setSelectedScopeId}
        />
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
