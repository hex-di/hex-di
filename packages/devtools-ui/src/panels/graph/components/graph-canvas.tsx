/**
 * GraphCanvas — main SVG rendering area with pan/zoom.
 *
 * @packageDocumentation
 */

import { useCallback, useRef, useState } from "react";
import type { EnrichedGraphNode, EnrichedGraphEdge, GraphViewportState } from "../types.js";
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from "../constants.js";
import { GraphNode } from "./graph-node.js";
import { GraphEdge } from "./graph-edge.js";

interface GraphCanvasProps {
  readonly nodes: readonly EnrichedGraphNode[];
  readonly edges: readonly EnrichedGraphEdge[];
  readonly selectedNodes: ReadonlySet<string>;
  readonly hoveredNode: string | undefined;
  readonly viewport: GraphViewportState;
  readonly width: number;
  readonly height: number;
  readonly onNodeClick?: (portName: string) => void;
  readonly onNodeMultiSelect?: (portName: string) => void;
  readonly onNodeHover?: (portName: string | undefined) => void;
  readonly onEdgeClick?: (source: string, target: string) => void;
  readonly onBackgroundClick?: () => void;
  readonly onViewportChange?: (viewport: GraphViewportState) => void;
  readonly svgRef?: React.RefObject<SVGSVGElement | null>;
}

function GraphCanvas({
  nodes,
  edges,
  selectedNodes,
  hoveredNode,
  viewport,
  width,
  height,
  onNodeClick,
  onNodeMultiSelect,
  onNodeHover,
  onEdgeClick,
  onBackgroundClick,
  onViewportChange,
  svgRef: externalSvgRef,
}: GraphCanvasProps): React.ReactElement {
  const internalSvgRef = useRef<SVGSVGElement>(null);
  const svgRef = externalSvgRef ?? internalSvgRef;
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      const target = e.target;
      const isSvg = target === svgRef.current;
      const isBg = target instanceof Element && target.getAttribute("data-testid") === "graph-bg";
      if (isSvg || isBg) {
        setIsPanning(true);
        panStart.current = { x: e.clientX - viewport.panX, y: e.clientY - viewport.panY };
      }
    },
    [viewport.panX, viewport.panY, svgRef]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isPanning) return;
      onViewportChange?.({
        ...viewport,
        panX: e.clientX - panStart.current.x,
        panY: e.clientY - panStart.current.y,
      });
    },
    [isPanning, viewport, onViewportChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newZoom = Math.max(MIN_ZOOM, Math.min(viewport.zoom + delta, MAX_ZOOM));
      onViewportChange?.({ ...viewport, zoom: newZoom });
    },
    [viewport, onViewportChange]
  );

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const target = e.target;
      if (target === svgRef.current) {
        onBackgroundClick?.();
        return;
      }
      // Check for the background rect via data attribute
      if (target instanceof Element && target.getAttribute("data-testid") === "graph-bg") {
        onBackgroundClick?.();
      }
    },
    [onBackgroundClick, svgRef]
  );

  const handleNodeClick = useCallback(
    (portName: string, e?: React.MouseEvent) => {
      if (e?.shiftKey) {
        onNodeMultiSelect?.(portName);
      } else {
        onNodeClick?.(portName);
      }
    },
    [onNodeClick, onNodeMultiSelect]
  );

  return (
    <svg
      ref={svgRef}
      data-testid="graph-canvas"
      width={width}
      height={height}
      style={{
        backgroundColor: "var(--hex-bg-primary)",
        cursor: isPanning ? "grabbing" : "grab",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleBackgroundClick}
      role="img"
      aria-label="Dependency graph visualization"
    >
      <defs>
        <marker
          id="hex-graph-arrowhead"
          viewBox="0 0 10 7"
          refX="10"
          refY="3.5"
          markerWidth="10"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--hex-border)" />
        </marker>
      </defs>

      {/* Background click target */}
      <rect data-testid="graph-bg" x={0} y={0} width={width} height={height} fill="transparent" />

      <g transform={`translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`}>
        {/* Edges rendered first (below nodes) */}
        {edges.map(edge => (
          <GraphEdge key={`${edge.source}-${edge.target}`} edge={edge} onClick={onEdgeClick} />
        ))}

        {/* Nodes rendered on top */}
        {nodes.map(node => (
          <GraphNode
            key={node.adapter.portName}
            node={node}
            isSelected={selectedNodes.has(node.adapter.portName)}
            isMultiSelected={selectedNodes.size > 1 && selectedNodes.has(node.adapter.portName)}
            isHovered={hoveredNode === node.adapter.portName}
            onClick={portName => handleNodeClick(portName)}
            onMouseEnter={portName => onNodeHover?.(portName)}
            onMouseLeave={() => onNodeHover?.(undefined)}
          />
        ))}
      </g>
    </svg>
  );
}

export { GraphCanvas };
export type { GraphCanvasProps };
