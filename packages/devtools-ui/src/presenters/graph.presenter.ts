/**
 * GraphPresenter - Pure presentation logic for dependency graph.
 *
 * Transforms raw graph data into GraphViewModel ready for rendering.
 * Contains no framework dependencies - pure TypeScript logic.
 *
 * @packageDocumentation
 */

import type { ExportedGraph, ExportedNode, ExportedEdge, PresenterDataSourceContract } from "@hex-di/devtools-core";
import type {
  GraphViewModel,
  GraphNodeViewModel,
  GraphEdgeViewModel,
  LayoutDirection,
  GraphViewport,
  NodePosition,
} from "../view-models/index.js";
import { createEmptyGraphViewModel } from "../view-models/index.js";

// =============================================================================
// Constants
// =============================================================================

/** Default node width for layout calculations */
const DEFAULT_NODE_WIDTH = 150;

/** Default node height for layout calculations */
const DEFAULT_NODE_HEIGHT = 40;

/** Horizontal spacing between nodes */
const NODE_SPACING_X = 50;

/** Vertical spacing between nodes */
const NODE_SPACING_Y = 80;

// =============================================================================
// GraphPresenter
// =============================================================================

/**
 * Presenter for dependency graph visualization.
 *
 * Transforms graph data from the data source into immutable view models
 * that can be rendered by any graph view implementation.
 */
export class GraphPresenter {
  private selectedNodeId: string | null = null;
  private highlightedNodeIds: Set<string> = new Set();
  private direction: LayoutDirection = "TB";
  private zoom = 1;
  private panOffset: NodePosition = { x: 0, y: 0 };

  constructor(private readonly dataSource: PresenterDataSourceContract) {}

  /**
   * Get the current graph view model.
   */
  getViewModel(): GraphViewModel {
    const graph = this.dataSource.getGraph();

    if (graph.nodes.length === 0) {
      return createEmptyGraphViewModel();
    }

    const nodePositions = this.calculateLayout(graph);
    const nodes = this.transformNodes(graph.nodes, nodePositions);
    const edges = this.transformEdges(graph.edges);
    const viewport = this.calculateViewport(nodes);

    return Object.freeze({
      nodes: Object.freeze(nodes),
      edges: Object.freeze(edges),
      direction: this.direction,
      viewport,
      selectedNodeId: this.selectedNodeId,
      highlightedNodeIds: Object.freeze([...this.highlightedNodeIds]),
      zoom: this.zoom,
      panOffset: Object.freeze({ ...this.panOffset }),
      isEmpty: false,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });
  }

  /**
   * Select a node.
   */
  selectNode(nodeId: string | null): void {
    this.selectedNodeId = nodeId;

    if (nodeId) {
      // Highlight the dependency path
      this.highlightDependencyPath(nodeId);
    } else {
      this.highlightedNodeIds.clear();
    }
  }

  /**
   * Highlight specific nodes.
   */
  highlightNodes(nodeIds: readonly string[]): void {
    this.highlightedNodeIds = new Set(nodeIds);
  }

  /**
   * Set the layout direction.
   */
  setDirection(direction: LayoutDirection): void {
    this.direction = direction;
  }

  /**
   * Set zoom level.
   */
  setZoom(level: number): void {
    this.zoom = Math.max(0.1, Math.min(3, level));
  }

  /**
   * Set pan offset.
   */
  setPanOffset(offset: NodePosition): void {
    this.panOffset = offset;
  }

  /**
   * Calculate simple grid layout positions for nodes.
   *
   * This is a basic layout - in production, use Dagre for proper DAG layout.
   */
  private calculateLayout(graph: ExportedGraph): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>();
    const nodes = graph.nodes;

    // Build dependency levels
    const levels = this.calculateDependencyLevels(graph);
    const levelGroups = new Map<number, string[]>();

    levels.forEach((level, nodeId) => {
      const group = levelGroups.get(level) ?? [];
      group.push(nodeId);
      levelGroups.set(level, group);
    });

    // Position nodes by level
    const maxLevel = Math.max(...levels.values(), 0);

    levelGroups.forEach((nodeIds, level) => {
      const y = level * (DEFAULT_NODE_HEIGHT + NODE_SPACING_Y);
      const totalWidth = nodeIds.length * DEFAULT_NODE_WIDTH + (nodeIds.length - 1) * NODE_SPACING_X;
      const startX = -totalWidth / 2;

      nodeIds.forEach((nodeId, index) => {
        const x = startX + index * (DEFAULT_NODE_WIDTH + NODE_SPACING_X);
        positions.set(nodeId, { x, y });
      });
    });

    return positions;
  }

  /**
   * Calculate dependency levels for layered layout.
   */
  private calculateDependencyLevels(graph: ExportedGraph): Map<string, number> {
    const levels = new Map<string, number>();
    const dependents = new Map<string, Set<string>>();

    // Build dependents map (reverse edges)
    graph.edges.forEach(edge => {
      const deps = dependents.get(edge.to) ?? new Set();
      deps.add(edge.from);
      dependents.set(edge.to, deps);
    });

    // Find roots (nodes with no dependents)
    const roots = graph.nodes
      .map(n => n.id)
      .filter(id => !dependents.has(id) || dependents.get(id)!.size === 0);

    // BFS to assign levels
    const queue = roots.map(id => ({ id, level: 0 }));

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;

      if (levels.has(id) && levels.get(id)! >= level) {
        continue;
      }

      levels.set(id, level);

      // Find dependencies and add to queue
      graph.edges
        .filter(e => e.from === id)
        .forEach(e => {
          queue.push({ id: e.to, level: level + 1 });
        });
    }

    // Handle any unvisited nodes
    graph.nodes.forEach(node => {
      if (!levels.has(node.id)) {
        levels.set(node.id, 0);
      }
    });

    return levels;
  }

  /**
   * Transform exported nodes to view model nodes.
   */
  private transformNodes(
    nodes: readonly ExportedNode[],
    positions: Map<string, NodePosition>
  ): GraphNodeViewModel[] {
    return nodes.map(node => {
      const position = positions.get(node.id) ?? { x: 0, y: 0 };
      const isSelected = this.selectedNodeId === node.id;
      const isHighlighted = this.highlightedNodeIds.has(node.id);

      return Object.freeze({
        id: node.id,
        label: node.label,
        lifetime: node.lifetime,
        factoryKind: node.factoryKind,
        position: Object.freeze(position),
        dimensions: Object.freeze({ width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT }),
        isSelected,
        isHighlighted,
        isDimmed: this.highlightedNodeIds.size > 0 && !isHighlighted && !isSelected,
      });
    });
  }

  /**
   * Transform exported edges to view model edges.
   */
  private transformEdges(edges: readonly ExportedEdge[]): GraphEdgeViewModel[] {
    return edges.map(edge => {
      const isHighlighted =
        this.highlightedNodeIds.has(edge.from) &&
        this.highlightedNodeIds.has(edge.to);

      return Object.freeze({
        id: `${edge.from}->${edge.to}`,
        from: edge.from,
        to: edge.to,
        isHighlighted,
        isDimmed: this.highlightedNodeIds.size > 0 && !isHighlighted,
      });
    });
  }

  /**
   * Calculate viewport bounds from node positions.
   */
  private calculateViewport(nodes: readonly GraphNodeViewModel[]): GraphViewport {
    if (nodes.length === 0) {
      return Object.freeze({ width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 });
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
      const { x, y } = node.position;
      const { width, height } = node.dimensions;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    const padding = 50;
    return Object.freeze({
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    });
  }

  /**
   * Highlight the dependency path for a node.
   */
  private highlightDependencyPath(nodeId: string): void {
    const graph = this.dataSource.getGraph();
    const path = new Set<string>([nodeId]);

    // Add all dependencies (transitive)
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      graph.edges
        .filter(e => e.from === current)
        .forEach(e => {
          if (!path.has(e.to)) {
            path.add(e.to);
            queue.push(e.to);
          }
        });
    }

    // Add all dependents (transitive)
    const reverseQueue = [nodeId];
    while (reverseQueue.length > 0) {
      const current = reverseQueue.shift()!;
      graph.edges
        .filter(e => e.to === current)
        .forEach(e => {
          if (!path.has(e.from)) {
            path.add(e.from);
            reverseQueue.push(e.from);
          }
        });
    }

    this.highlightedNodeIds = path;
  }
}
