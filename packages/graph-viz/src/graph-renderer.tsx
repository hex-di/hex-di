/**
 * GraphRenderer component - SVG container with zoom/pan support.
 *
 * This is the main component that renders a complete graph visualization.
 * It uses native SVG transforms for zoom/pan (no D3 dependency).
 *
 * @packageDocumentation
 */

import React, {
  type ReactElement,
  useRef,
  useEffect,
  useCallback,
  useState,
  type MouseEvent,
} from "react";
import type {
  GraphRendererProps,
  TransformState,
  RenderNodeProps,
  RenderEdgeProps,
} from "./types.js";
import { createEdgeKey } from "./types.js";
import { DEFAULT_CONTAINER_STYLES, DEFAULT_SVG_STYLES } from "./styles.js";
import { GraphNode } from "./graph-node.js";
import { GraphEdge, ArrowMarkerDefs } from "./graph-edge.js";
import { GraphControls } from "./graph-controls.js";
import { generateEdgePath } from "./graph-layout.js";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MIN_ZOOM = 0.25;
const DEFAULT_MAX_ZOOM = 2;
const ZOOM_STEP = 0.2;
const WHEEL_ZOOM_FACTOR = 0.001;
const MARKER_ID = "graph-viz-arrow-marker";
const HIGHLIGHTED_MARKER_ID = "graph-viz-arrow-marker-highlighted";

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a graph visualization with zoom/pan support.
 *
 * Uses native SVG transforms and mouse events for smooth zoom and pan
 * interactions while rendering nodes and edges with React components.
 *
 * @typeParam TMetadata - Custom metadata type for domain-specific node data
 *
 * @example
 * ```tsx
 * import { GraphRenderer, computeLayout } from '@hex-di/graph-viz';
 *
 * const layout = computeLayout(nodes, edges);
 *
 * <GraphRenderer
 *   layout={layout}
 *   hoveredNodeId={null}
 *   selectedNodeId={null}
 *   highlightedNodeIds={new Set()}
 *   highlightedEdgeKeys={new Set()}
 *   renderNode={({ node, isHovered, isSelected, isDimmed, x, y }) => (
 *     <g>
 *       <rect x={x} y={y} width={node.width} height={node.height} />
 *       <text x={node.x} y={node.y}>{node.label}</text>
 *     </g>
 *   )}
 * />
 * ```
 */
export function GraphRenderer<TMetadata = unknown>({
  layout,
  hoveredNodeId,
  selectedNodeId,
  highlightedNodeIds,
  highlightedEdgeKeys,
  onNodeClick,
  onNodeHover,
  showControls = true,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  renderNode,
  renderEdge,
  renderTooltip,
  containerStyle,
  svgStyle,
}: GraphRendererProps<TMetadata>): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [transform, setTransform] = useState<TransformState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Fit the graph to the container
  const fitToView = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const padding = 40;

    if (layout.width === 0 || layout.height === 0) {
      return;
    }

    // Calculate scale to fit
    const scaleX = (containerRect.width - padding * 2) / layout.width;
    const scaleY = (containerRect.height - padding * 2) / layout.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in past 100%

    // Calculate translation to center
    const translateX = (containerRect.width - layout.width * scale) / 2;
    const translateY = (containerRect.height - layout.height * scale) / 2;

    setTransform({ scale, translateX, translateY });
  }, [layout.width, layout.height]);

  // Fit graph to view on initial render and when layout changes
  useEffect(() => {
    fitToView();
  }, [fitToView]);

  // Watch container size changes and re-fit graph
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(() => {
      fitToView();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [fitToView]);

  // Attach wheel listener with passive: false to allow preventDefault
  // React registers wheel events as passive by default, which prevents preventDefault()
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheelEvent = (event: globalThis.WheelEvent): void => {
      event.preventDefault();

      const delta = -event.deltaY * WHEEL_ZOOM_FACTOR;

      setTransform(prev => {
        const newScale = Math.max(minZoom, Math.min(maxZoom, prev.scale * (1 + delta)));

        const rect = svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Calculate new translation to zoom towards mouse
        const scaleFactor = newScale / prev.scale;

        return {
          scale: newScale,
          translateX: mouseX - (mouseX - prev.translateX) * scaleFactor,
          translateY: mouseY - (mouseY - prev.translateY) * scaleFactor,
        };
      });
    };

    svg.addEventListener("wheel", handleWheelEvent, { passive: false });

    return () => {
      svg.removeEventListener("wheel", handleWheelEvent);
    };
  }, [minZoom, maxZoom]);

  // Handle mouse down for panning
  const handleMouseDown = useCallback((event: MouseEvent<SVGSVGElement>) => {
    // Only pan on left click and not on nodes
    if (event.button !== 0) return;
    const target = event.target as Element;
    if (target.closest(".graph-node")) return;

    setIsPanning(true);
    setPanStart({ x: event.clientX, y: event.clientY });
  }, []);

  // Handle mouse move for panning
  const handleMouseMove = useCallback(
    (event: MouseEvent<SVGSVGElement>) => {
      if (!isPanning) return;

      const deltaX = event.clientX - panStart.x;
      const deltaY = event.clientY - panStart.y;

      setTransform(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY,
      }));

      setPanStart({ x: event.clientX, y: event.clientY });
    },
    [isPanning, panStart]
  );

  // Handle mouse up to stop panning
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle mouse leave to stop panning
  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom in handler
  const handleZoomIn = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newScale = Math.min(transform.scale + ZOOM_STEP, maxZoom);
    const scaleFactor = newScale / transform.scale;

    setTransform({
      scale: newScale,
      translateX: centerX - (centerX - transform.translateX) * scaleFactor,
      translateY: centerY - (centerY - transform.translateY) * scaleFactor,
    });
  }, [transform, maxZoom]);

  // Zoom out handler
  const handleZoomOut = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newScale = Math.max(transform.scale - ZOOM_STEP, minZoom);
    const scaleFactor = newScale / transform.scale;

    setTransform({
      scale: newScale,
      translateX: centerX - (centerX - transform.translateX) * scaleFactor,
      translateY: centerY - (centerY - transform.translateY) * scaleFactor,
    });
  }, [transform, minZoom]);

  // Reset zoom to 100%
  const handleResetZoom = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();

    // Center at 100% zoom
    const translateX = (containerRect.width - layout.width) / 2;
    const translateY = (containerRect.height - layout.height) / 2;

    setTransform({
      scale: 1,
      translateX,
      translateY,
    });
  }, [layout.width, layout.height]);

  // Determine if nodes/edges should be dimmed
  const hasHighlight = highlightedNodeIds.size > 0;

  // Handle background click to deselect
  const handleBackgroundClick = useCallback(
    (event: MouseEvent<SVGSVGElement>) => {
      // Only deselect if clicking directly on SVG (not on a node)
      if (event.target === event.currentTarget) {
        onNodeClick?.("");
      }
    },
    [onNodeClick]
  );

  // Find hovered node for tooltip
  const hoveredNode = hoveredNodeId ? layout.nodes.find(n => n.id === hoveredNodeId) : null;

  return (
    <div ref={containerRef} style={{ ...DEFAULT_CONTAINER_STYLES, ...containerStyle }}>
      <svg
        ref={svgRef}
        style={{
          ...DEFAULT_SVG_STYLES,
          ...svgStyle,
          cursor: isPanning ? "grabbing" : "grab",
        }}
        onClick={handleBackgroundClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <ArrowMarkerDefs id={MARKER_ID} highlightedId={HIGHLIGHTED_MARKER_ID} />

        <g
          transform={`translate(${transform.translateX}, ${transform.translateY}) scale(${transform.scale})`}
        >
          {/* Render edges first (below nodes) */}
          {layout.edges.map(edge => {
            const edgeKey = createEdgeKey(edge.from, edge.to);
            const isHighlighted = highlightedEdgeKeys.has(edgeKey);
            const isDimmed = hasHighlight && !isHighlighted;

            if (renderEdge) {
              const pathD = generateEdgePath(edge.points);
              const renderProps: RenderEdgeProps = {
                edge,
                isHighlighted,
                isDimmed,
                pathD,
              };
              return <React.Fragment key={edgeKey}>{renderEdge(renderProps)}</React.Fragment>;
            }

            return (
              <GraphEdge
                key={edgeKey}
                edge={edge}
                isHighlighted={isHighlighted}
                isDimmed={isDimmed}
                markerId={MARKER_ID}
                highlightedMarkerId={HIGHLIGHTED_MARKER_ID}
              />
            );
          })}

          {/* Render nodes */}
          {layout.nodes.map(node => {
            const isHovered = hoveredNodeId === node.id;
            const isSelected = selectedNodeId === node.id;
            const isDimmed = hasHighlight && !highlightedNodeIds.has(node.id);

            // Compute position (top-left corner from center)
            const x = node.x - node.width / 2;
            const y = node.y - node.height / 2;

            // Build optional props conditionally for exactOptionalPropertyTypes
            const optionalProps: {
              onClick?: (nodeId: string) => void;
              onMouseEnter?: (nodeId: string) => void;
              onMouseLeave?: () => void;
            } = {};
            if (onNodeClick !== undefined) {
              optionalProps.onClick = onNodeClick;
            }
            if (onNodeHover !== undefined) {
              optionalProps.onMouseEnter = onNodeHover;
              optionalProps.onMouseLeave = () => onNodeHover(null);
            }

            if (renderNode) {
              const renderProps: RenderNodeProps<TMetadata> = {
                node,
                isHovered,
                isSelected,
                isDimmed,
                x,
                y,
              };
              return (
                <g
                  key={node.id}
                  className="graph-node"
                  data-node-id={node.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => onNodeClick?.(node.id)}
                  onMouseEnter={() => onNodeHover?.(node.id)}
                  onMouseLeave={() => onNodeHover?.(null)}
                >
                  {renderNode(renderProps)}
                </g>
              );
            }

            return (
              <GraphNode
                key={node.id}
                node={node}
                isHovered={isHovered}
                isSelected={isSelected}
                isDimmed={isDimmed}
                {...optionalProps}
              />
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      {showControls && (
        <GraphControls
          zoom={transform.scale}
          minZoom={minZoom}
          maxZoom={maxZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={fitToView}
          onResetZoom={handleResetZoom}
        />
      )}

      {/* Tooltip */}
      {renderTooltip &&
        hoveredNode &&
        renderTooltip({
          node: hoveredNode,
          x: hoveredNode.x * transform.scale + transform.translateX,
          y: (hoveredNode.y - hoveredNode.height / 2) * transform.scale + transform.translateY - 10,
        })}
    </div>
  );
}
