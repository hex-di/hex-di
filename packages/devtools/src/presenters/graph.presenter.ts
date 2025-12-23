/**
 * GraphPresenter - Pure presentation logic for dependency graph.
 *
 * Transforms raw graph data into GraphViewModel ready for rendering.
 * Contains no framework dependencies - pure TypeScript logic.
 *
 * @packageDocumentation
 */

import type {
  ExportedGraph,
  ExportedNode,
  ExportedEdge,
  PresenterDataSourceContract,
} from "@hex-di/devtools-core";
import type {
  GraphViewModel,
  GraphNodeViewModel,
  GraphEdgeViewModel,
  LayoutDirection,
  GraphViewport,
  NodePosition,
  ContainerGrouping,
  CaptiveWarning,
} from "../view-models/index.js";
import { createEmptyGraphViewModel } from "../view-models/index.js";

// =============================================================================
// Lifetime Priority Map
// =============================================================================

/**
 * Lifetime priority for captive dependency detection.
 * Higher number = longer-lived (more restrictive).
 */
const LIFETIME_PRIORITY: Record<string, number> = {
  singleton: 3,
  scoped: 2,
  transient: 1,
};

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

  // Container context for grouping
  private activeContainerId: string | null = null;
  private containerIds: readonly string[] = [];

  // Captive dependency filter
  private showOnlyCaptive = false;

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

    // Build dependency levels
    const levels = this.calculateDependencyLevels(graph);
    const levelGroups = new Map<number, string[]>();

    levels.forEach((level, nodeId) => {
      const group = levelGroups.get(level) ?? [];
      group.push(nodeId);
      levelGroups.set(level, group);
    });

    // Position nodes by level
    levelGroups.forEach((nodeIds, level) => {
      const y = level * (DEFAULT_NODE_HEIGHT + NODE_SPACING_Y);
      const totalWidth =
        nodeIds.length * DEFAULT_NODE_WIDTH + (nodeIds.length - 1) * NODE_SPACING_X;
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
      .filter(id => {
        const deps = dependents.get(id);
        return deps === undefined || deps.size === 0;
      });

    // BFS to assign levels
    const queue = roots.map(id => ({ id, level: 0 }));

    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) break;
      const { id, level } = item;

      const existingLevel = levels.get(id);
      if (existingLevel !== undefined && existingLevel >= level) {
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
        this.highlightedNodeIds.has(edge.from) && this.highlightedNodeIds.has(edge.to);

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

  // ===========================================================================
  // Container Grouping Methods (Task 3.2)
  // ===========================================================================

  /**
   * Set the container context for grouping.
   *
   * @param activeContainerId - The currently active container ID
   * @param containerIds - All container IDs in the hierarchy
   */
  setContainerContext(activeContainerId: string, containerIds: readonly string[]): void {
    this.activeContainerId = activeContainerId;
    this.containerIds = containerIds;
  }

  /**
   * Group nodes by container.
   *
   * Uses the container snapshot to determine which nodes belong to which container.
   * Returns container groupings with bounding boxes for visualization.
   */
  groupNodesByContainer(): ContainerGrouping[] {
    const snapshot = this.dataSource.getContainerSnapshot();
    if (!snapshot || this.containerIds.length === 0) {
      return [];
    }

    const graph = this.dataSource.getGraph();
    const nodePositions = this.calculateLayout(graph);
    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));

    // Build container -> node mapping from snapshot
    const containerNodes = new Map<string, string[]>();

    // Root container gets singletons
    const rootContainerId = this.containerIds[0];
    if (rootContainerId) {
      const singletonPorts = snapshot.singletons.map(s => s.portName);
      containerNodes.set(
        rootContainerId,
        singletonPorts.filter(p => nodeMap.has(p))
      );
    }

    // Child scopes get their resolved ports
    snapshot.scopes.forEach(scope => {
      const scopePorts = scope.resolvedPorts.filter(p => nodeMap.has(p));
      const existing = containerNodes.get(scope.id) ?? [];
      containerNodes.set(scope.id, [...existing, ...scopePorts]);
    });

    // Generate groupings with bounds
    return Array.from(containerNodes.entries())
      .filter(([_, nodeIds]) => nodeIds.length > 0)
      .map(([containerId, nodeIds]) => {
        const bounds = this.calculateContainerBoundaries(nodeIds, nodePositions);
        const scope = snapshot.scopes.find(s => s.id === containerId);

        return Object.freeze({
          containerId,
          containerName: containerId,
          nodeIds: Object.freeze(nodeIds),
          bounds,
          phase: scope ? (scope.isActive ? "ready" : "disposed") : snapshot.phase,
          isRoot: containerId === rootContainerId,
        });
      });
  }

  /**
   * Calculate bounding box for a set of nodes.
   */
  calculateContainerBoundaries(
    nodeIds: readonly string[],
    positions: Map<string, NodePosition>
  ): GraphViewport {
    if (nodeIds.length === 0) {
      return Object.freeze({ width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 });
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodeIds.forEach(nodeId => {
      const pos = positions.get(nodeId);
      if (pos) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + DEFAULT_NODE_WIDTH);
        maxY = Math.max(maxY, pos.y + DEFAULT_NODE_HEIGHT);
      }
    });

    const padding = 20;
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
   * Highlight captive dependencies when a node with captive issues is selected.
   */
  highlightCaptiveDependencies(portName: string): void {
    const warnings = this.detectCaptiveDependencies();
    const relatedWarnings = warnings.filter(
      w => w.sourcePortName === portName || w.captivePortName === portName
    );

    const nodesToHighlight = new Set<string>();
    relatedWarnings.forEach(w => {
      nodesToHighlight.add(w.sourcePortName);
      nodesToHighlight.add(w.captivePortName);
    });

    this.highlightedNodeIds = nodesToHighlight;
  }

  // ===========================================================================
  // Captive Dependency Detection (Task 3.3)
  // ===========================================================================

  /**
   * Detect captive dependencies in the graph.
   *
   * A captive dependency occurs when a longer-lived service depends on
   * a shorter-lived service. For example:
   * - Singleton depending on Scoped (warning)
   * - Singleton depending on Transient (error)
   * - Scoped depending on Transient (warning)
   */
  detectCaptiveDependencies(): CaptiveWarning[] {
    const graph = this.dataSource.getGraph();
    const warnings: CaptiveWarning[] = [];
    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));

    graph.edges.forEach(edge => {
      const sourceNode = nodeMap.get(edge.from);
      const targetNode = nodeMap.get(edge.to);

      if (!sourceNode || !targetNode) return;

      const sourcePriority = LIFETIME_PRIORITY[sourceNode.lifetime] ?? 1;
      const targetPriority = LIFETIME_PRIORITY[targetNode.lifetime] ?? 1;

      // Captive: source lives longer than target
      if (sourcePriority > targetPriority) {
        const severity = sourcePriority - targetPriority >= 2 ? "error" : "warning";

        warnings.push(
          Object.freeze({
            sourcePortName: sourceNode.id,
            captivePortName: targetNode.id,
            sourceLifetime: sourceNode.lifetime,
            captiveLifetime: targetNode.lifetime,
            severity,
            message: `${sourceNode.lifetime} '${sourceNode.id}' depends on ${targetNode.lifetime} '${targetNode.id}' - potential captive dependency`,
          })
        );
      }
    });

    return warnings;
  }

  /**
   * Set filter to show only nodes involved in captive dependency issues.
   */
  setShowOnlyCaptive(show: boolean): void {
    this.showOnlyCaptive = show;
  }

  /**
   * Get whether captive-only filter is active.
   */
  getShowOnlyCaptive(): boolean {
    return this.showOnlyCaptive;
  }
}
