/**
 * GraphView - Dependency graph visualization component.
 *
 * This is a shared headless component that renders the dependency graph.
 * It delegates actual graph rendering to the GraphRenderer primitive,
 * which is platform-specific (D3/SVG for DOM, ASCII for TUI).
 *
 * @packageDocumentation
 */

import React from "react";
import { usePrimitives } from "../hooks/use-primitives.js";
import type { GraphViewModel } from "../view-models/graph.vm.js";

// =============================================================================
// Props Interface
// =============================================================================

/**
 * Filter state for the graph.
 */
export interface GraphViewFilterState {
  /** Name pattern filter (case-insensitive) */
  readonly namePattern?: string;
  /** Lifetime filter */
  readonly lifetimeFilter?: "all" | "singleton" | "scoped" | "transient";
  /** Factory kind filter */
  readonly factoryFilter?: "all" | "sync" | "async";
  /** Show only captive dependency issues */
  readonly showOnlyCaptive?: boolean;
}

/**
 * Props for the GraphView component.
 */
export interface GraphViewProps {
  /** The graph view model containing all display state */
  readonly viewModel: GraphViewModel;
  /** Callback when a node is selected */
  readonly onNodeSelect?: (nodeId: string | null) => void;
  /** Callback when a node is hovered */
  readonly onNodeHover?: (nodeId: string | null) => void;
  /** Whether to show filter controls (optional) */
  readonly showFilters?: boolean;
  /** Callback when filter state changes (optional) */
  readonly onFilterChange?: (filter: GraphViewFilterState) => void;
}

// =============================================================================
// GraphView Component
// =============================================================================

/**
 * Dependency graph visualization component.
 *
 * Renders an empty state message when no services are registered,
 * otherwise delegates to the platform-specific GraphRenderer primitive.
 *
 * @example
 * ```tsx
 * import { GraphView } from '@hex-di/devtools';
 * import { PrimitivesProvider } from '@hex-di/devtools';
 * import { DOMPrimitives } from '@hex-di/devtools/dom';
 *
 * function App() {
 *   const [viewModel, setViewModel] = useState(createEmptyGraphViewModel());
 *
 *   return (
 *     <PrimitivesProvider primitives={DOMPrimitives}>
 *       <GraphView
 *         viewModel={viewModel}
 *         onNodeSelect={(nodeId) => console.log('Selected:', nodeId)}
 *       />
 *     </PrimitivesProvider>
 *   );
 * }
 * ```
 */
export function GraphView({
  viewModel,
  onNodeSelect,
  onNodeHover,
  showFilters: _showFilters,
  onFilterChange: _onFilterChange,
}: GraphViewProps): React.ReactElement {
  const { Box, Text, Icon, GraphRenderer } = usePrimitives();

  // Handle node selection from GraphRenderer
  const handleNodeSelect = (event: { nodeId: string }): void => {
    if (onNodeSelect) {
      onNodeSelect(event.nodeId);
    }
  };

  // Render empty state
  if (viewModel.isEmpty) {
    return (
      <Box
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        padding="lg"
        flexGrow={1}
        data-testid="graph-empty-state"
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

  // Render graph
  return (
    <Box flexDirection="column" flexGrow={1} data-testid="graph-view">
      <GraphRenderer
        viewModel={viewModel}
        onNodeSelect={handleNodeSelect}
        {...(onNodeHover !== undefined ? { onNodeHover } : {})}
        fitToView={true}
      />
    </Box>
  );
}
