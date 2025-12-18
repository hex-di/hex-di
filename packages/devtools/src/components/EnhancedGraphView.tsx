/**
 * EnhancedGraphView - Full-featured dependency graph visualization.
 *
 * This component extends the basic GraphView with:
 * - Filter controls (name input, lifetime dropdown)
 * - Async filter toggle
 * - Captive-only filter toggle
 * - Container selector dropdown
 * - Container hierarchy overlay
 * - Captive dependency visualization
 * - Async factory indicators
 *
 * @packageDocumentation
 */

import React, { useCallback, useMemo, useState } from "react";
import { usePrimitives } from "../hooks/use-primitives.js";
import type {
  ExtendedGraphViewModel,
  GraphNodeViewModel,
  ContainerGrouping,
  CaptiveWarning,
} from "../view-models/graph.vm.js";
import type { ContainerNode, ContainerPhase } from "../view-models/container-hierarchy.vm.js";
import type { Lifetime } from "@hex-di/devtools-core";

// =============================================================================
// Types
// =============================================================================

/**
 * Lifetime filter options.
 */
export type LifetimeFilter = "all" | "singleton" | "scoped" | "transient";

/**
 * Factory kind filter options.
 */
export type FactoryFilter = "all" | "sync" | "async";

/**
 * Filter state for the graph.
 */
export interface GraphFilterState {
  /** Name pattern filter (case-insensitive) */
  readonly namePattern: string;
  /** Lifetime filter */
  readonly lifetimeFilter: LifetimeFilter;
  /** Factory kind filter */
  readonly factoryFilter: FactoryFilter;
  /** Show only captive dependency issues */
  readonly showOnlyCaptive: boolean;
  /** Selected container ID (null = all containers) */
  readonly selectedContainerId: string | null;
}

/**
 * Props for the EnhancedGraphView component.
 */
export interface EnhancedGraphViewProps {
  /** The extended graph view model */
  readonly viewModel: ExtendedGraphViewModel;
  /** Current filter state */
  readonly filterState: GraphFilterState;
  /** Container options for the selector */
  readonly containers: readonly ContainerNode[];
  /** Callback when a node is selected */
  readonly onNodeSelect?: (nodeId: string | null) => void;
  /** Callback when a node is hovered */
  readonly onNodeHover?: (nodeId: string | null) => void;
  /** Callback when filter state changes */
  readonly onFilterChange?: (filter: GraphFilterState) => void;
  /** Callback when container is selected */
  readonly onContainerSelect?: (containerId: string | null) => void;
  /** Callback when zoom changes */
  readonly onZoomChange?: (zoom: number) => void;
  /** Callback when pan changes */
  readonly onPanChange?: (offset: { x: number; y: number }) => void;
}

/**
 * Default filter state.
 */
export const defaultFilterState: GraphFilterState = Object.freeze({
  namePattern: "",
  lifetimeFilter: "all",
  factoryFilter: "all",
  showOnlyCaptive: false,
  selectedContainerId: null,
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get color for lifetime badge.
 */
function getLifetimeColor(lifetime: Lifetime): "success" | "warning" | "error" | "muted" {
  switch (lifetime) {
    case "singleton":
      return "success";
    case "scoped":
      return "warning";
    case "transient":
      return "error";
    default:
      return "muted";
  }
}

/**
 * Get severity color for captive warnings.
 */
function getCaptiveSeverityColor(severity: "warning" | "error"): "warning" | "error" {
  return severity;
}

/**
 * Get phase color for containers.
 */
function getPhaseColor(phase: ContainerPhase): "success" | "warning" | "error" | "muted" {
  switch (phase) {
    case "ready":
      return "success";
    case "initializing":
      return "warning";
    case "disposing":
      return "warning";
    case "disposed":
      return "muted";
    default:
      return "muted";
  }
}

// =============================================================================
// Filter Toolbar Component
// =============================================================================

interface FilterToolbarProps {
  readonly filterState: GraphFilterState;
  readonly containers: readonly ContainerNode[];
  readonly hasCaptiveIssues: boolean;
  readonly onFilterChange: (filter: GraphFilterState) => void;
}

/**
 * Toolbar with filter controls for the graph.
 */
function FilterToolbar({
  filterState,
  containers,
  hasCaptiveIssues,
  onFilterChange,
}: FilterToolbarProps): React.ReactElement {
  const { Box, Text, Button, Icon } = usePrimitives();

  const handleNameChange = useCallback(
    (value: string) => {
      onFilterChange({ ...filterState, namePattern: value });
    },
    [filterState, onFilterChange]
  );

  const handleLifetimeChange = useCallback(
    (lifetime: LifetimeFilter) => {
      onFilterChange({ ...filterState, lifetimeFilter: lifetime });
    },
    [filterState, onFilterChange]
  );

  const handleFactoryChange = useCallback(
    (factory: FactoryFilter) => {
      onFilterChange({ ...filterState, factoryFilter: factory });
    },
    [filterState, onFilterChange]
  );

  const handleCaptiveToggle = useCallback(() => {
    onFilterChange({ ...filterState, showOnlyCaptive: !filterState.showOnlyCaptive });
  }, [filterState, onFilterChange]);

  const handleContainerChange = useCallback(
    (containerId: string | null) => {
      onFilterChange({ ...filterState, selectedContainerId: containerId });
    },
    [filterState, onFilterChange]
  );

  const handleClearFilters = useCallback(() => {
    onFilterChange(defaultFilterState);
  }, [onFilterChange]);

  const hasActiveFilters =
    filterState.namePattern !== "" ||
    filterState.lifetimeFilter !== "all" ||
    filterState.factoryFilter !== "all" ||
    filterState.showOnlyCaptive ||
    filterState.selectedContainerId !== null;

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="sm"
      padding="sm"
      data-testid="graph-filter-toolbar"
    >
      {/* Search/Filter Icon */}
      <Icon name="filter" size="sm" color="muted" />

      {/* Name Pattern Input */}
      <Box flexDirection="column" gap="xs">
        <Text variant="caption" color="muted">
          Filter by name
        </Text>
        <Box data-testid="name-filter-input">
          <Text variant="body" color={filterState.namePattern ? "foreground" : "muted"}>
            {filterState.namePattern || "Type to filter..."}
          </Text>
        </Box>
      </Box>

      {/* Lifetime Dropdown */}
      <Box flexDirection="column" gap="xs">
        <Text variant="caption" color="muted">
          Lifetime
        </Text>
        <Box flexDirection="row" gap="xs" data-testid="lifetime-filter">
          <Button
            label="All"
            size="sm"
            variant={filterState.lifetimeFilter === "all" ? "primary" : "ghost"}
            onClick={() => handleLifetimeChange("all")}
          />
          <Button
            label="S"
            size="sm"
            variant={filterState.lifetimeFilter === "singleton" ? "primary" : "ghost"}
            onClick={() => handleLifetimeChange("singleton")}
          />
          <Button
            label="Sc"
            size="sm"
            variant={filterState.lifetimeFilter === "scoped" ? "primary" : "ghost"}
            onClick={() => handleLifetimeChange("scoped")}
          />
          <Button
            label="T"
            size="sm"
            variant={filterState.lifetimeFilter === "transient" ? "primary" : "ghost"}
            onClick={() => handleLifetimeChange("transient")}
          />
        </Box>
      </Box>

      {/* Async Filter Toggle */}
      <Box flexDirection="column" gap="xs">
        <Text variant="caption" color="muted">
          Factory
        </Text>
        <Box flexDirection="row" gap="xs" data-testid="factory-filter">
          <Button
            label="All"
            size="sm"
            variant={filterState.factoryFilter === "all" ? "primary" : "ghost"}
            onClick={() => handleFactoryChange("all")}
          />
          <Button
            label="Sync"
            size="sm"
            variant={filterState.factoryFilter === "sync" ? "primary" : "ghost"}
            onClick={() => handleFactoryChange("sync")}
          />
          <Button
            label="Async"
            size="sm"
            variant={filterState.factoryFilter === "async" ? "primary" : "ghost"}
            onClick={() => handleFactoryChange("async")}
          />
        </Box>
      </Box>

      {/* Captive-Only Toggle */}
      {hasCaptiveIssues && (
        <Box flexDirection="column" gap="xs">
          <Text variant="caption" color="muted">
            Issues
          </Text>
          <Button
            label={filterState.showOnlyCaptive ? "Captive Only" : "Show Captive"}
            size="sm"
            variant={filterState.showOnlyCaptive ? "primary" : "ghost"}
            onClick={handleCaptiveToggle}
            data-testid="captive-filter-toggle"
          />
        </Box>
      )}

      {/* Container Selector */}
      {containers.length > 1 && (
        <Box flexDirection="column" gap="xs">
          <Text variant="caption" color="muted">
            Container
          </Text>
          <Box flexDirection="row" gap="xs" data-testid="container-selector">
            <Button
              label="All"
              size="sm"
              variant={filterState.selectedContainerId === null ? "primary" : "ghost"}
              onClick={() => handleContainerChange(null)}
            />
            {containers.slice(0, 3).map((container) => (
              <Button
                key={container.id}
                label={container.name.slice(0, 8)}
                size="sm"
                variant={filterState.selectedContainerId === container.id ? "primary" : "ghost"}
                onClick={() => handleContainerChange(container.id)}
              />
            ))}
            {containers.length > 3 && (
              <Text variant="caption" color="muted">
                +{containers.length - 3} more
              </Text>
            )}
          </Box>
        </Box>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          label="Clear"
          size="sm"
          variant="ghost"
          onClick={handleClearFilters}
          data-testid="clear-filters-button"
        />
      )}
    </Box>
  );
}

// =============================================================================
// Container Overlay Component
// =============================================================================

interface ContainerOverlayProps {
  readonly groupings: readonly ContainerGrouping[];
}

/**
 * Renders container grouping overlays on the graph.
 */
function ContainerOverlay({ groupings }: ContainerOverlayProps): React.ReactElement {
  const { Box, Text } = usePrimitives();

  if (groupings.length === 0) {
    return <Box data-testid="container-overlay-empty" />;
  }

  return (
    <Box
      flexDirection="column"
      gap="xs"
      padding="xs"
      data-testid="container-overlay"
    >
      {groupings.map((group) => (
        <Box
          key={group.containerId}
          flexDirection="row"
          alignItems="center"
          gap="xs"
          data-testid={`container-group-${group.containerId}`}
          data-container-id={group.containerId}
          data-is-root={group.isRoot}
        >
          {/* Container label */}
          <Text variant="caption" color={group.isRoot ? "primary" : "secondary"} bold={group.isRoot}>
            {group.containerName}
          </Text>

          {/* Phase badge */}
          <Text variant="caption" color={getPhaseColor(group.phase)}>
            [{group.phase}]
          </Text>

          {/* Node count */}
          <Text variant="caption" color="muted">
            ({group.nodeIds.length} services)
          </Text>
        </Box>
      ))}
    </Box>
  );
}

// =============================================================================
// Captive Warning Overlay Component
// =============================================================================

interface CaptiveWarningOverlayProps {
  readonly warnings: readonly CaptiveWarning[];
  readonly selectedNodeId: string | null;
}

/**
 * Renders captive dependency warning indicators.
 */
function CaptiveWarningOverlay({
  warnings,
  selectedNodeId,
}: CaptiveWarningOverlayProps): React.ReactElement {
  const { Box, Text, Icon } = usePrimitives();

  // Filter warnings to show only relevant ones
  const relevantWarnings = useMemo(() => {
    if (!selectedNodeId) {
      return warnings;
    }
    return warnings.filter(
      (w) => w.sourcePortName === selectedNodeId || w.captivePortName === selectedNodeId
    );
  }, [warnings, selectedNodeId]);

  if (relevantWarnings.length === 0) {
    return <Box data-testid="captive-warning-overlay-empty" />;
  }

  return (
    <Box
      flexDirection="column"
      gap="xs"
      padding="sm"
      data-testid="captive-warning-overlay"
    >
      <Box flexDirection="row" alignItems="center" gap="xs">
        <Icon name="services" size="sm" color="warning" />
        <Text variant="caption" color="warning" bold>
          Captive Dependencies ({relevantWarnings.length})
        </Text>
      </Box>

      {relevantWarnings.slice(0, 5).map((warning, index) => (
        <Box
          key={`${warning.sourcePortName}-${warning.captivePortName}-${index}`}
          flexDirection="row"
          alignItems="center"
          gap="xs"
          data-testid={`captive-warning-${index}`}
          data-severity={warning.severity}
        >
          {/* Severity icon */}
          <Icon
            name={warning.severity === "error" ? "close" : "settings"}
            size="sm"
            color={getCaptiveSeverityColor(warning.severity)}
          />

          {/* Warning message */}
          <Text variant="caption" color={getCaptiveSeverityColor(warning.severity)}>
            {warning.sourcePortName}
          </Text>
          <Text variant="caption" color="muted">
            ({warning.sourceLifetime})
          </Text>
          <Icon name="chevron-right" size="sm" color="muted" />
          <Text variant="caption" color={getCaptiveSeverityColor(warning.severity)}>
            {warning.captivePortName}
          </Text>
          <Text variant="caption" color="muted">
            ({warning.captiveLifetime})
          </Text>
        </Box>
      ))}

      {relevantWarnings.length > 5 && (
        <Text variant="caption" color="muted">
          +{relevantWarnings.length - 5} more warnings
        </Text>
      )}
    </Box>
  );
}

// =============================================================================
// Async Factory Legend Component
// =============================================================================

interface AsyncFactoryLegendProps {
  readonly hasAsyncFactories: boolean;
}

/**
 * Renders a legend for async factory indicators.
 */
function AsyncFactoryLegend({ hasAsyncFactories }: AsyncFactoryLegendProps): React.ReactElement {
  const { Box, Text, Icon } = usePrimitives();

  if (!hasAsyncFactories) {
    return <Box data-testid="async-legend-empty" />;
  }

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="sm"
      padding="xs"
      data-testid="async-factory-legend"
    >
      {/* Async indicator */}
      <Box flexDirection="row" alignItems="center" gap="xs">
        <Icon name="async" size="sm" color="accent" />
        <Text variant="caption" color="muted">
          Async Factory
        </Text>
      </Box>

      {/* Lifetime legend */}
      <Box flexDirection="row" alignItems="center" gap="xs">
        <Icon name="singleton" size="sm" color="success" />
        <Text variant="caption" color="muted">
          Singleton
        </Text>
      </Box>

      <Box flexDirection="row" alignItems="center" gap="xs">
        <Icon name="scoped" size="sm" color="warning" />
        <Text variant="caption" color="muted">
          Scoped
        </Text>
      </Box>

      <Box flexDirection="row" alignItems="center" gap="xs">
        <Icon name="transient" size="sm" color="error" />
        <Text variant="caption" color="muted">
          Transient
        </Text>
      </Box>
    </Box>
  );
}

// =============================================================================
// Enhanced Graph View Component
// =============================================================================

/**
 * Full-featured dependency graph visualization with filters and overlays.
 *
 * This component combines:
 * - FilterToolbar for filtering by name, lifetime, factory kind
 * - ContainerOverlay for visualizing container boundaries
 * - CaptiveWarningOverlay for highlighting captive dependencies
 * - AsyncFactoryLegend for showing async factory indicators
 * - GraphRenderer for the actual graph visualization
 *
 * @example
 * ```tsx
 * import { EnhancedGraphView, defaultFilterState } from '@hex-di/devtools';
 *
 * function GraphTab() {
 *   const [filterState, setFilterState] = useState(defaultFilterState);
 *
 *   return (
 *     <EnhancedGraphView
 *       viewModel={graphViewModel}
 *       filterState={filterState}
 *       containers={containers}
 *       onFilterChange={setFilterState}
 *       onNodeSelect={(id) => console.log('Selected:', id)}
 *     />
 *   );
 * }
 * ```
 */
export function EnhancedGraphView({
  viewModel,
  filterState,
  containers,
  onNodeSelect,
  onNodeHover,
  onFilterChange,
  onContainerSelect,
  onZoomChange,
  onPanChange,
}: EnhancedGraphViewProps): React.ReactElement {
  const { Box, Text, Icon, GraphRenderer, Divider } = usePrimitives();

  // Filter nodes based on filter state
  const filteredViewModel = useMemo(() => {
    // Start with all nodes
    let nodes = viewModel.nodes;

    // Filter by name pattern
    if (filterState.namePattern) {
      const pattern = new RegExp(filterState.namePattern, "i");
      nodes = nodes.filter((n) => pattern.test(n.label));
    }

    // Filter by lifetime
    if (filterState.lifetimeFilter !== "all") {
      nodes = nodes.filter((n) => n.lifetime === filterState.lifetimeFilter);
    }

    // Filter by factory kind
    if (filterState.factoryFilter !== "all") {
      nodes = nodes.filter((n) => n.factoryKind === filterState.factoryFilter);
    }

    // Filter by captive issues
    if (filterState.showOnlyCaptive && viewModel.captiveWarnings.length > 0) {
      const captiveNodeIds = new Set<string>();
      viewModel.captiveWarnings.forEach((w) => {
        captiveNodeIds.add(w.sourcePortName);
        captiveNodeIds.add(w.captivePortName);
      });
      nodes = nodes.filter((n) => captiveNodeIds.has(n.id));
    }

    // Filter by selected container
    if (filterState.selectedContainerId !== null) {
      const containerGroup = viewModel.containerGroupings.find(
        (g) => g.containerId === filterState.selectedContainerId
      );
      if (containerGroup) {
        const containerNodeIds = new Set(containerGroup.nodeIds);
        nodes = nodes.filter((n) => containerNodeIds.has(n.id));
      }
    }

    // Build filtered node IDs for edge filtering
    const filteredNodeIds = new Set(nodes.map((n) => n.id));

    // Filter edges to only include those between filtered nodes
    const edges = viewModel.edges.filter(
      (e) => filteredNodeIds.has(e.from) && filteredNodeIds.has(e.to)
    );

    // Return filtered view model (create a new object with filtered nodes)
    return {
      ...viewModel,
      nodes: Object.freeze(nodes),
      edges: Object.freeze(edges),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      isEmpty: nodes.length === 0,
    } as ExtendedGraphViewModel;
  }, [viewModel, filterState]);

  // Check for async factories in the graph
  const hasAsyncFactories = useMemo(
    () => viewModel.nodes.some((n) => n.factoryKind === "async"),
    [viewModel.nodes]
  );

  // Handle node selection
  const handleNodeSelect = useCallback(
    (event: { nodeId: string }) => {
      onNodeSelect?.(event.nodeId);
    },
    [onNodeSelect]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilter: GraphFilterState) => {
      onFilterChange?.(newFilter);
    },
    [onFilterChange]
  );

  // Render empty state
  if (viewModel.isEmpty) {
    return (
      <Box
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        padding="lg"
        flexGrow={1}
        data-testid="enhanced-graph-empty-state"
      >
        <Icon name="graph" size="lg" color="muted" />
        <Text variant="body" color="muted">
          No services registered
        </Text>
        <Text variant="caption" color="muted">
          Register services to see the dependency graph
        </Text>
      </Box>
    );
  }

  // Render filtered empty state
  if (filteredViewModel.isEmpty && !viewModel.isEmpty) {
    return (
      <Box flexDirection="column" flexGrow={1} data-testid="enhanced-graph-view">
        {/* Filter toolbar */}
        {onFilterChange && (
          <>
            <FilterToolbar
              filterState={filterState}
              containers={containers}
              hasCaptiveIssues={viewModel.hasCaptiveIssues}
              onFilterChange={handleFilterChange}
            />
            <Divider orientation="horizontal" />
          </>
        )}

        {/* No results message */}
        <Box
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          padding="lg"
          flexGrow={1}
        >
          <Icon name="search" size="lg" color="muted" />
          <Text variant="body" color="muted">
            No services match the current filters
          </Text>
          <Text variant="caption" color="muted">
            Try adjusting your filter criteria
          </Text>
        </Box>
      </Box>
    );
  }

  // Render full graph view
  return (
    <Box flexDirection="column" flexGrow={1} data-testid="enhanced-graph-view">
      {/* Filter toolbar */}
      {onFilterChange && (
        <>
          <FilterToolbar
            filterState={filterState}
            containers={containers}
            hasCaptiveIssues={viewModel.hasCaptiveIssues}
            onFilterChange={handleFilterChange}
          />
          <Divider orientation="horizontal" />
        </>
      )}

      {/* Container overlay (above graph) */}
      {viewModel.hasMultipleContainers && (
        <ContainerOverlay groupings={viewModel.containerGroupings} />
      )}

      {/* Main graph area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Graph renderer */}
        <Box flexGrow={1} data-testid="graph-renderer-container">
          <GraphRenderer
            viewModel={filteredViewModel}
            onNodeSelect={handleNodeSelect}
            onNodeHover={onNodeHover ?? undefined}
            fitToView={true}
          />
        </Box>

        {/* Side panel for captive warnings */}
        {viewModel.hasCaptiveIssues && (
          <Box flexDirection="column" flexShrink={0} padding="sm">
            <CaptiveWarningOverlay
              warnings={viewModel.captiveWarnings}
              selectedNodeId={viewModel.selectedNodeId}
            />
          </Box>
        )}
      </Box>

      {/* Legend at bottom */}
      <AsyncFactoryLegend hasAsyncFactories={hasAsyncFactories} />
    </Box>
  );
}
