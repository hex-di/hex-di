/**
 * DependencyGraph component - Main entry point for the visual graph.
 *
 * Composes layout computation, rendering, and interaction handling
 * into a single component using @hex-di/graph-viz for the core
 * graph visualization.
 *
 * @packageDocumentation
 */

import React, { type ReactElement, useMemo, useState, useCallback, useRef } from "react";
import {
  GraphRenderer,
  computeLayout as computeGenericLayout,
  findConnectedNodes,
  findConnectedEdges,
  type GraphNodeType,
  type GraphEdgeType,
  type LayoutResult as GenericLayoutResult,
  type PositionedNode as GenericPositionedNode,
} from "@hex-di/graph-viz";
import type { DependencyGraphProps, PositionedNode, LayoutResult } from "./types.js";
import { type DINodeMetadata, renderDINode, renderDITooltip, renderDIEdge } from "./di-metadata.js";
import { graphContainerStyles } from "./graph-styles.js";

// =============================================================================
// Layout Adapter
// =============================================================================

/**
 * Adapts DevTools nodes to graph-viz generic nodes.
 */
function adaptNodeToGeneric(
  node: DependencyGraphProps["nodes"][number]
): GraphNodeType<DINodeMetadata> {
  return {
    id: node.id,
    label: node.label,
    metadata: {
      lifetime: node.lifetime,
      factoryKind: node.factoryKind,
      origin: node.origin,
      ownership: node.ownership,
      inheritanceMode: node.inheritanceMode,
      containers: node.containers,
      containerOwnership: node.containerOwnership,
    },
  };
}

/**
 * Adapts DevTools edges to graph-viz generic edges.
 */
function adaptEdgeToGeneric(edge: DependencyGraphProps["edges"][number]): GraphEdgeType {
  return {
    from: edge.from,
    to: edge.to,
  };
}

/**
 * Converts generic layout result to DevTools-specific layout result.
 * This preserves the full DI metadata in the positioned nodes.
 * @internal Reserved for future use when customizing layout results.
 */
function _adaptLayoutResult(
  genericLayout: GenericLayoutResult<DINodeMetadata>,
  originalNodes: DependencyGraphProps["nodes"]
): LayoutResult {
  const nodesById = new Map(originalNodes.map(n => [n.id, n]));

  const positionedNodes: PositionedNode[] = genericLayout.nodes.map(node => {
    const original = nodesById.get(node.id);
    return {
      id: node.id,
      label: node.label,
      lifetime: node.metadata?.lifetime ?? original?.lifetime ?? "singleton",
      factoryKind: node.metadata?.factoryKind ?? original?.factoryKind,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      origin: node.metadata?.origin ?? original?.origin,
      ownership: node.metadata?.ownership ?? original?.ownership,
      inheritanceMode: node.metadata?.inheritanceMode ?? original?.inheritanceMode,
      containers: node.metadata?.containers ?? original?.containers,
      containerOwnership: node.metadata?.containerOwnership ?? original?.containerOwnership,
    };
  });

  return {
    nodes: positionedNodes,
    edges: genericLayout.edges,
    width: genericLayout.width,
    height: genericLayout.height,
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Visual dependency graph component.
 *
 * Renders a dependency graph with:
 * - Hierarchical layout using Dagre (via @hex-di/graph-viz)
 * - Zoom and pan with native SVG transforms
 * - Interactive hover/click highlighting
 * - DI-specific node styling (lifetime colors, ownership badges)
 * - Tooltip on hover with DI details
 *
 * @example
 * ```tsx
 * <DependencyGraph
 *   nodes={[
 *     { id: 'Logger', label: 'Logger', lifetime: 'singleton' },
 *     { id: 'UserService', label: 'UserService', lifetime: 'scoped' },
 *   ]}
 *   edges={[
 *     { from: 'UserService', to: 'Logger' },
 *   ]}
 *   onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
 * />
 * ```
 */
export function DependencyGraph({
  nodes,
  edges,
  direction = "TB",
  onNodeClick,
  onNodeHover,
  showControls = true,
  minZoom = 0.25,
  maxZoom = 2,
}: DependencyGraphProps): ReactElement {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Adapt nodes and edges to generic format
  const genericNodes = useMemo(() => nodes.map(adaptNodeToGeneric), [nodes]);

  const genericEdges = useMemo(() => edges.map(adaptEdgeToGeneric), [edges]);

  // Compute layout using graph-viz with explicit type parameter
  const genericLayout = useMemo(
    () => computeGenericLayout<DINodeMetadata>(genericNodes, genericEdges, { direction }),
    [genericNodes, genericEdges, direction]
  );

  // Compute highlighted nodes and edges based on interaction
  const { highlightedNodeIds, highlightedEdgeKeys } = useMemo(() => {
    const activeNodeId = hoveredNodeId ?? selectedNodeId;

    if (activeNodeId === null) {
      return {
        highlightedNodeIds: new Set<string>(),
        highlightedEdgeKeys: new Set<string>(),
      };
    }

    const connectedNodes = findConnectedNodes(activeNodeId, genericEdges);
    const connectedEdges = findConnectedEdges(connectedNodes, genericEdges);

    return {
      highlightedNodeIds: connectedNodes,
      highlightedEdgeKeys: connectedEdges,
    };
  }, [hoveredNodeId, selectedNodeId, genericEdges]);

  // Handle node hover
  const handleNodeHover = useCallback(
    (nodeId: string | null) => {
      setHoveredNodeId(nodeId);
      onNodeHover?.(nodeId);
    },
    [onNodeHover]
  );

  // Handle node click (empty nodeId = background click to deselect)
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (nodeId === "") {
        setSelectedNodeId(null);
        return;
      }
      setSelectedNodeId(prev => (prev === nodeId ? null : nodeId));
      onNodeClick?.(nodeId);
    },
    [onNodeClick]
  );

  // Track mouse position for tooltip (container-relative coordinates)
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, []);

  // Custom tooltip render that uses mouse position
  const renderTooltipWithPosition = useCallback(
    (props: { node: GenericPositionedNode<DINodeMetadata>; x: number; y: number }) => {
      if (!mousePosition) return null;
      return renderDITooltip({
        node: props.node,
        x: mousePosition.x,
        y: mousePosition.y,
      });
    },
    [mousePosition]
  );

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", height: "100%" }}
      onMouseMove={handleMouseMove}
    >
      <GraphRenderer<DINodeMetadata>
        layout={genericLayout}
        hoveredNodeId={hoveredNodeId}
        selectedNodeId={selectedNodeId}
        highlightedNodeIds={highlightedNodeIds}
        highlightedEdgeKeys={highlightedEdgeKeys}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        showControls={showControls}
        minZoom={minZoom}
        maxZoom={maxZoom}
        renderNode={renderDINode}
        renderEdge={renderDIEdge}
        renderTooltip={renderTooltipWithPosition}
        containerStyle={graphContainerStyles.wrapper}
      />
    </div>
  );
}
