/**
 * GraphViewPort - Port definition for dependency graph visualization.
 *
 * Defines the contract that graph view implementations must fulfill.
 * Both React (D3/SVG) and TUI (ASCII art) adapters implement this port.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import type { GraphViewModel } from "../view-models/index.js";

// =============================================================================
// Event Types
// =============================================================================

/**
 * Event data for node interactions.
 */
export interface NodeClickEvent {
  readonly nodeId: string;
  readonly position: { x: number; y: number };
}

/**
 * Event data for edge interactions.
 */
export interface EdgeClickEvent {
  readonly edgeId: string;
  readonly from: string;
  readonly to: string;
}

// =============================================================================
// Graph View Contract
// =============================================================================

/**
 * Contract for graph view implementations.
 *
 * Implementations render dependency graphs and handle user interactions.
 * The same view model works across React (D3/SVG) and TUI (ASCII) renderers.
 */
export interface GraphViewContract {
  /**
   * Render the graph with the given view model.
   */
  render(viewModel: GraphViewModel): void;

  /**
   * Set handler for node click events.
   */
  onNodeClick(handler: (event: NodeClickEvent) => void): void;

  /**
   * Set handler for edge click events.
   */
  onEdgeClick(handler: (event: EdgeClickEvent) => void): void;

  /**
   * Set handler for node hover events.
   */
  onNodeHover(handler: (nodeId: string | null) => void): void;

  /**
   * Highlight specific nodes (e.g., dependency path).
   */
  highlightNodes(nodeIds: readonly string[]): void;

  /**
   * Select a node programmatically.
   */
  selectNode(nodeId: string | null): void;

  /**
   * Set zoom level (1.0 = 100%).
   */
  setZoom(level: number): void;

  /**
   * Pan to center on a specific node.
   */
  centerOnNode(nodeId: string): void;

  /**
   * Fit all nodes in the viewport.
   */
  fitToView(): void;

  /**
   * Clear the current render.
   */
  clear(): void;

  /**
   * Dispose resources (cleanup).
   */
  dispose(): void;
}

// =============================================================================
// Port Definition
// =============================================================================

/**
 * Port for graph view implementations.
 *
 * React adapters implement with D3/SVG, TUI adapters with ASCII art.
 */
export const GraphViewPort = createPort<"GraphView", GraphViewContract>("GraphView");

export type GraphView = GraphViewContract;
