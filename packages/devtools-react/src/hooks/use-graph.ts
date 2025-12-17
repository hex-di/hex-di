/**
 * useGraph - Hook for graph visualization data.
 *
 * Provides access to graph view model and graph-related actions.
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import { useDevToolsContext } from "../context/devtools-context.js";
import type { GraphViewModel, LayoutDirection } from "@hex-di/devtools-ui";

/**
 * Graph hook return type.
 */
export interface UseGraphResult {
  /**
   * The graph view model, or null if not available.
   */
  readonly viewModel: GraphViewModel | null;

  /**
   * Whether the graph is loading.
   */
  readonly isLoading: boolean;

  /**
   * Selected node ID, or null if none selected.
   */
  readonly selectedNodeId: string | null;

  /**
   * Highlighted node IDs.
   */
  readonly highlightedNodeIds: readonly string[];

  /**
   * Current zoom level.
   */
  readonly zoom: number;

  /**
   * Graph layout direction.
   */
  readonly direction: LayoutDirection;

  /**
   * Select a node.
   */
  selectNode(nodeId: string | null): void;

  /**
   * Highlight nodes.
   */
  highlightNodes(nodeIds: readonly string[]): void;

  /**
   * Set zoom level.
   */
  setZoom(zoom: number): void;

  /**
   * Set layout direction.
   */
  setDirection(direction: LayoutDirection): void;

  /**
   * Clear selection and highlights.
   */
  clearSelection(): void;
}

/**
 * Hook to access graph visualization data and actions.
 *
 * @example
 * ```tsx
 * function GraphView() {
 *   const { viewModel, selectNode, selectedNodeId } = useGraph();
 *
 *   if (!viewModel) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return (
 *     <div>
 *       {viewModel.nodes.map(node => (
 *         <div
 *           key={node.id}
 *           onClick={() => selectNode(node.id)}
 *           className={node.id === selectedNodeId ? 'selected' : ''}
 *         >
 *           {node.label}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGraph(): UseGraphResult {
  const context = useDevToolsContext();

  const result = useMemo((): UseGraphResult => ({
    viewModel: context.viewModels.graph,
    isLoading: context.viewModels.graph === null,
    selectedNodeId: context.state.graph.selectedNodeId,
    highlightedNodeIds: context.state.graph.highlightedNodeIds,
    zoom: context.state.graph.zoom,
    direction: context.state.graph.direction,
    selectNode: context.selectNode,
    highlightNodes: context.highlightNodes,
    setZoom: context.setZoom,
    setDirection: context.setGraphDirection,
    clearSelection: () => {
      context.selectNode(null);
      context.highlightNodes([]);
    },
  }), [
    context.viewModels.graph,
    context.state.graph.selectedNodeId,
    context.state.graph.highlightedNodeIds,
    context.state.graph.zoom,
    context.state.graph.direction,
    context.selectNode,
    context.highlightNodes,
    context.setZoom,
    context.setGraphDirection,
  ]);

  return result;
}
