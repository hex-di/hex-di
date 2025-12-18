/**
 * DOMGraphRenderer - SVG-based graph renderer for browser environments.
 *
 * Uses D3.js for SVG rendering and dagre for layout algorithm.
 * Provides zoom/pan interactions and node selection.
 *
 * @packageDocumentation
 */

import React, {
  type ReactElement,
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import * as d3Zoom from "d3-zoom";
import * as d3Selection from "d3-selection";
import type {
  GraphRendererProps,
  GraphNodeViewModelMinimal,
  GraphEdgeViewModelMinimal,
} from "../ports/render-primitives.port.js";

// =============================================================================
// Types
// =============================================================================

interface TransformState {
  scale: number;
  translateX: number;
  translateY: number;
}

// =============================================================================
// Constants
// =============================================================================

const MARKER_ID = "hex-arrow-marker";
const HIGHLIGHTED_MARKER_ID = "hex-arrow-marker-highlighted";

// =============================================================================
// Lifetime Color Mapping
// =============================================================================

/**
 * Get the CSS variable for a lifetime's stroke color.
 * Uses vibrant, high-contrast colors from the Tokyo Night palette.
 */
function getLifetimeStrokeColor(lifetime: string): string {
  switch (lifetime) {
    case "singleton":
      return "var(--hex-devtools-singleton, #73daca)";  // Teal
    case "scoped":
      return "var(--hex-devtools-scoped, #7aa2f7)";    // Blue
    case "transient":
      return "var(--hex-devtools-transient, #ff9e64)"; // Orange
    default:
      return "var(--hex-devtools-border, #3b4261)";
  }
}

/**
 * Get the CSS variable for a lifetime's background color (semi-transparent).
 */
function getLifetimeBgColor(lifetime: string): string {
  switch (lifetime) {
    case "singleton":
      return "var(--hex-devtools-singleton-bg, rgba(115, 218, 202, 0.15))";
    case "scoped":
      return "var(--hex-devtools-scoped-bg, rgba(122, 162, 247, 0.15))";
    case "transient":
      return "var(--hex-devtools-transient-bg, rgba(255, 158, 100, 0.15))";
    default:
      return "transparent";
  }
}

// =============================================================================
// Arrow Marker Definitions
// =============================================================================

/**
 * SVG defs element containing arrow markers for edges.
 */
function ArrowMarkerDefs(): ReactElement {
  return (
    <defs>
      <marker
        id={MARKER_ID}
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path
          d="M 0 0 L 10 5 L 0 10 z"
          fill="var(--hex-devtools-border, #3b4261)"
        />
      </marker>
      <marker
        id={HIGHLIGHTED_MARKER_ID}
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path
          d="M 0 0 L 10 5 L 0 10 z"
          fill="var(--hex-devtools-primary, #7aa2f7)"
        />
      </marker>
    </defs>
  );
}

// =============================================================================
// Graph Node Component
// =============================================================================

interface GraphNodeComponentProps {
  readonly node: GraphNodeViewModelMinimal;
  readonly onClick?: (nodeId: string) => void;
  readonly onMouseEnter?: (nodeId: string) => void;
  readonly onMouseLeave?: () => void;
}

function GraphNodeComponent({
  node,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: GraphNodeComponentProps): ReactElement {
  const handleClick = useCallback(() => {
    onClick?.(node.id);
  }, [onClick, node.id]);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter?.(node.id);
  }, [onMouseEnter, node.id]);

  // Compute position (top-left corner from center)
  const x = node.position.x - node.dimensions.width / 2;
  const y = node.position.y - node.dimensions.height / 2;

  // Get colors based on lifetime
  const strokeColor = getLifetimeStrokeColor(node.lifetime);
  const bgColor = getLifetimeBgColor(node.lifetime);

  // Compute opacity and styling based on state
  const opacity = node.isDimmed ? 0.25 : 1;
  const strokeWidth = node.isSelected ? 3 : node.isHighlighted ? 2.5 : 2;
  const filter = node.isSelected
    ? "drop-shadow(0 0 8px var(--hex-devtools-primary, #7aa2f7))"
    : node.isHighlighted
      ? "brightness(1.2)"
      : undefined;

  return (
    <g
      className="graph-node"
      data-node-id={node.id}
      style={{ cursor: "pointer", opacity }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Node background glow (subtle) */}
      {(node.isSelected || node.isHighlighted) && (
        <rect
          x={x - 2}
          y={y - 2}
          width={node.dimensions.width + 4}
          height={node.dimensions.height + 4}
          rx={10}
          ry={10}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1}
          opacity={0.3}
        />
      )}

      {/* Node rectangle - with lifetime-tinted background */}
      <rect
        x={x}
        y={y}
        width={node.dimensions.width}
        height={node.dimensions.height}
        rx={8}
        ry={8}
        fill={bgColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={{
          transition: "all 0.15s ease",
          filter,
        }}
      />

      {/* Inner background for better text contrast */}
      <rect
        x={x + 1}
        y={y + 1}
        width={node.dimensions.width - 2}
        height={node.dimensions.height - 2}
        rx={7}
        ry={7}
        fill="var(--hex-devtools-bg-secondary, #24283b)"
        style={{ pointerEvents: "none" }}
      />

      {/* Node label */}
      <text
        x={node.position.x}
        y={node.position.y - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--hex-devtools-text, #c0caf5)"
        fontSize="13px"
        fontWeight={500}
        fontFamily="var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {node.label}
      </text>

      {/* Lifetime badge */}
      <text
        x={node.position.x}
        y={node.position.y + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={strokeColor}
        fontSize="10px"
        fontWeight={600}
        fontFamily="var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)"
        style={{
          pointerEvents: "none",
          userSelect: "none",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {node.lifetime}
      </text>
    </g>
  );
}

// =============================================================================
// Graph Edge Component
// =============================================================================

interface GraphEdgeComponentProps {
  readonly edge: GraphEdgeViewModelMinimal;
  readonly nodes: readonly GraphNodeViewModelMinimal[];
}

function GraphEdgeComponent({
  edge,
  nodes,
}: GraphEdgeComponentProps): ReactElement | null {
  // Find source and target nodes
  const fromNode = nodes.find((n) => n.id === edge.from);
  const toNode = nodes.find((n) => n.id === edge.to);

  if (!fromNode || !toNode) {
    return null;
  }

  // Calculate edge path (simple straight line for now)
  // In a production implementation, this would use proper edge routing
  const startX = fromNode.position.x;
  const startY = fromNode.position.y + fromNode.dimensions.height / 2;
  const endX = toNode.position.x;
  const endY = toNode.position.y - toNode.dimensions.height / 2;

  const pathD = `M ${startX} ${startY} L ${endX} ${endY}`;

  // Determine styling based on state
  const stroke = edge.isHighlighted
    ? "var(--hex-devtools-primary, #7aa2f7)"
    : "var(--hex-devtools-border, #3b4261)";
  const strokeWidth = edge.isHighlighted ? 2.5 : 1.5;
  const opacity = edge.isDimmed ? 0.15 : 0.8;
  const marker = edge.isHighlighted
    ? `url(#${HIGHLIGHTED_MARKER_ID})`
    : `url(#${MARKER_ID})`;

  return (
    <path
      className="graph-edge"
      data-edge-from={edge.from}
      data-edge-to={edge.to}
      d={pathD}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      markerEnd={marker}
      style={{
        opacity,
        transition: "all 0.15s ease",
      }}
    />
  );
}

// =============================================================================
// Zoom Constants
// =============================================================================

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.2;

// =============================================================================
// Zoom Controls Component
// =============================================================================

interface ZoomControlsProps {
  readonly zoomLevel: number;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFitToView: () => void;
  readonly onResetZoom: () => void;
}

function ZoomControls({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onFitToView,
  onResetZoom,
}: ZoomControlsProps): ReactElement {
  const buttonStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--hex-devtools-bg-secondary, #24283b)",
    border: "1px solid var(--hex-devtools-border, #3b4261)",
    borderRadius: 6,
    color: "var(--hex-devtools-text, #c0caf5)",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
    transition: "all 0.15s ease",
  };

  const disabledStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: 0.4,
    cursor: "not-allowed",
  };

  const canZoomIn = zoomLevel < MAX_ZOOM;
  const canZoomOut = zoomLevel > MIN_ZOOM;

  return (
    <div
      data-testid="zoom-controls"
      style={{
        position: "absolute",
        bottom: 12,
        right: 12,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: 6,
        backgroundColor: "var(--hex-devtools-bg, #1a1b26)",
        border: "1px solid var(--hex-devtools-border, #3b4261)",
        borderRadius: 10,
        boxShadow: "var(--hex-devtools-shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.2))",
      }}
    >
      <button
        onClick={onZoomOut}
        disabled={!canZoomOut}
        style={canZoomOut ? buttonStyle : disabledStyle}
        title="Zoom Out"
        onMouseEnter={(e) => {
          if (canZoomOut) {
            e.currentTarget.style.backgroundColor = "var(--hex-devtools-bg-hover, #363b54)";
            e.currentTarget.style.borderColor = "var(--hex-devtools-border-hover, #565f89)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--hex-devtools-bg-secondary, #24283b)";
          e.currentTarget.style.borderColor = "var(--hex-devtools-border, #3b4261)";
        }}
      >
        −
      </button>
      <span
        style={{
          minWidth: 54,
          textAlign: "center",
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "var(--hex-devtools-font-mono, monospace)",
          color: "var(--hex-devtools-text-secondary, #a9b1d6)",
        }}
      >
        {Math.round(zoomLevel * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        disabled={!canZoomIn}
        style={canZoomIn ? buttonStyle : disabledStyle}
        title="Zoom In"
        onMouseEnter={(e) => {
          if (canZoomIn) {
            e.currentTarget.style.backgroundColor = "var(--hex-devtools-bg-hover, #363b54)";
            e.currentTarget.style.borderColor = "var(--hex-devtools-border-hover, #565f89)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--hex-devtools-bg-secondary, #24283b)";
          e.currentTarget.style.borderColor = "var(--hex-devtools-border, #3b4261)";
        }}
      >
        +
      </button>
      <div style={{ width: 1, height: 22, backgroundColor: "var(--hex-devtools-border, #3b4261)", margin: "0 4px" }} />
      <button
        onClick={onFitToView}
        style={buttonStyle}
        title="Fit to View"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--hex-devtools-bg-hover, #363b54)";
          e.currentTarget.style.borderColor = "var(--hex-devtools-border-hover, #565f89)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--hex-devtools-bg-secondary, #24283b)";
          e.currentTarget.style.borderColor = "var(--hex-devtools-border, #3b4261)";
        }}
      >
        ⊞
      </button>
      <button
        onClick={onResetZoom}
        style={buttonStyle}
        title="Reset to 100%"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--hex-devtools-bg-hover, #363b54)";
          e.currentTarget.style.borderColor = "var(--hex-devtools-border-hover, #565f89)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--hex-devtools-bg-secondary, #24283b)";
          e.currentTarget.style.borderColor = "var(--hex-devtools-border, #3b4261)";
        }}
      >
        1:1
      </button>
    </div>
  );
}

// =============================================================================
// Main DOMGraphRenderer Component
// =============================================================================

/**
 * DOM-based SVG graph renderer.
 *
 * Renders a dependency graph with:
 * - Node boxes with lifetime color-coding
 * - Edge arrows showing dependencies
 * - Click handling for node selection
 * - D3-powered zoom/pan interactions
 * - Zoom controls (+/-/fit/reset)
 * - Hover tooltip with node details
 * - Connected node/edge highlighting on hover
 */
export function DOMGraphRenderer({
  viewModel,
  onNodeSelect,
  onNodeHover,
  fitToView: _fitToView,
}: GraphRendererProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  const [transform, setTransform] = useState<TransformState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  // Track if we're currently dragging to change cursor
  const [isDragging, setIsDragging] = useState(false);

  // Hover state for tooltip and highlighting
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Compute connected nodes for highlighting
  const connectedNodes = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const connected = new Set<string>([hoveredNodeId]);
    viewModel.edges.forEach((edge) => {
      if (edge.from === hoveredNodeId) connected.add(edge.to);
      if (edge.to === hoveredNodeId) connected.add(edge.from);
    });
    return connected;
  }, [hoveredNodeId, viewModel.edges]);

  // Compute connected edges for highlighting
  const connectedEdges = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const connected = new Set<string>();
    viewModel.edges.forEach((edge) => {
      if (edge.from === hoveredNodeId || edge.to === hoveredNodeId) {
        connected.add(edge.id);
      }
    });
    return connected;
  }, [hoveredNodeId, viewModel.edges]);

  // Get hovered node details for tooltip
  const hoveredNode = useMemo(() => {
    if (!hoveredNodeId) return null;
    return viewModel.nodes.find((n) => n.id === hoveredNodeId) ?? null;
  }, [hoveredNodeId, viewModel.nodes]);

  // Count dependencies and dependents for tooltip
  const hoveredNodeStats = useMemo(() => {
    if (!hoveredNodeId) return { dependencies: 0, dependents: 0 };
    let dependencies = 0;
    let dependents = 0;
    viewModel.edges.forEach((edge) => {
      if (edge.from === hoveredNodeId) dependencies++;
      if (edge.to === hoveredNodeId) dependents++;
    });
    return { dependencies, dependents };
  }, [hoveredNodeId, viewModel.edges]);

  // D3 zoom instance (memoized to prevent recreation)
  const zoomBehavior = useMemo(() => {
    return d3Zoom.zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .on("start", () => setIsDragging(true))
      .on("end", () => setIsDragging(false))
      .on("zoom", (event: d3Zoom.D3ZoomEvent<SVGSVGElement, unknown>) => {
        setTransform({
          scale: event.transform.k,
          translateX: event.transform.x,
          translateY: event.transform.y,
        });
      });
  }, []);

  // Initialize D3 zoom on SVG
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3Selection.select(svgRef.current);
    svg.call(zoomBehavior);

    // Cleanup
    return () => {
      svg.on(".zoom", null);
    };
  }, [zoomBehavior]);

  // Calculate fit-to-view transform
  const calculateFitTransform = useCallback((): TransformState | null => {
    if (!containerRef.current || viewModel.isEmpty) {
      return null;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const padding = 40;

    const { viewport } = viewModel;
    const graphWidth = viewport.maxX - viewport.minX;
    const graphHeight = viewport.maxY - viewport.minY;

    if (graphWidth === 0 || graphHeight === 0) {
      return null;
    }

    // Calculate scale to fit
    const scaleX = (containerRect.width - padding * 2) / graphWidth;
    const scaleY = (containerRect.height - padding * 2) / graphHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    // Calculate translation to center
    const centerX = (viewport.minX + viewport.maxX) / 2;
    const centerY = (viewport.minY + viewport.maxY) / 2;
    const translateX = containerRect.width / 2 - centerX * scale;
    const translateY = containerRect.height / 2 - centerY * scale;

    return { scale, translateX, translateY };
  }, [viewModel]);

  // Fit to view on initial render
  useEffect(() => {
    const fitTransform = calculateFitTransform();
    if (!fitTransform || !svgRef.current) return;

    const svg = d3Selection.select(svgRef.current);
    const newTransform = d3Zoom.zoomIdentity
      .translate(fitTransform.translateX, fitTransform.translateY)
      .scale(fitTransform.scale);

    svg.call(zoomBehavior.transform, newTransform);
  }, [viewModel.viewport, viewModel.isEmpty, calculateFitTransform, zoomBehavior]);

  // Handle node click
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      onNodeSelect?.({ nodeId });
    },
    [onNodeSelect]
  );

  // Handle node hover with tooltip position
  const handleNodeMouseEnter = useCallback(
    (nodeId: string, event: React.MouseEvent) => {
      setHoveredNodeId(nodeId);
      setTooltipPos({ x: event.clientX, y: event.clientY });
      onNodeHover?.(nodeId);
    },
    [onNodeHover]
  );

  const handleNodeMouseMove = useCallback(
    (event: React.MouseEvent) => {
      setTooltipPos({ x: event.clientX, y: event.clientY });
    },
    []
  );

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
    setTooltipPos(null);
    onNodeHover?.(null);
  }, [onNodeHover]);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3Selection.select(svgRef.current);
    svg.transition().duration(150).call(zoomBehavior.scaleBy, 1 + ZOOM_STEP);
  }, [zoomBehavior]);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3Selection.select(svgRef.current);
    svg.transition().duration(150).call(zoomBehavior.scaleBy, 1 - ZOOM_STEP);
  }, [zoomBehavior]);

  const handleFitToView = useCallback(() => {
    const fitTransform = calculateFitTransform();
    if (!fitTransform || !svgRef.current) return;

    const svg = d3Selection.select(svgRef.current);
    const newTransform = d3Zoom.zoomIdentity
      .translate(fitTransform.translateX, fitTransform.translateY)
      .scale(fitTransform.scale);

    svg.transition().duration(300).call(zoomBehavior.transform, newTransform);
  }, [calculateFitTransform, zoomBehavior]);

  const handleResetZoom = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const { viewport } = viewModel;
    const centerX = (viewport.minX + viewport.maxX) / 2;
    const centerY = (viewport.minY + viewport.maxY) / 2;

    const svg = d3Selection.select(svgRef.current);
    const newTransform = d3Zoom.zoomIdentity
      .translate(containerRect.width / 2 - centerX, containerRect.height / 2 - centerY)
      .scale(1);

    svg.transition().duration(300).call(zoomBehavior.transform, newTransform);
  }, [zoomBehavior, viewModel.viewport]);

  // Container styles
  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    minHeight: "200px",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "var(--hex-devtools-bg, #1a1b26)",
    borderRadius: "8px",
    border: "1px solid var(--hex-devtools-border, #3b4261)",
  };

  const svgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    cursor: isDragging ? "grabbing" : "grab",
  };

  // Enhance nodes with hover highlighting state
  const enhancedNodes = useMemo(() => {
    return viewModel.nodes.map((node) => ({
      ...node,
      isHighlighted: hoveredNodeId !== null && connectedNodes.has(node.id),
      isDimmed: hoveredNodeId !== null && !connectedNodes.has(node.id),
    }));
  }, [viewModel.nodes, hoveredNodeId, connectedNodes]);

  // Enhance edges with hover highlighting state
  const enhancedEdges = useMemo(() => {
    return viewModel.edges.map((edge) => ({
      ...edge,
      isHighlighted: connectedEdges.has(edge.id),
      isDimmed: hoveredNodeId !== null && !connectedEdges.has(edge.id),
    }));
  }, [viewModel.edges, hoveredNodeId, connectedEdges]);

  return (
    <div ref={containerRef} style={containerStyle}>
      <svg ref={svgRef} style={svgStyle}>
        <ArrowMarkerDefs />

        <g
          ref={gRef}
          transform={`translate(${transform.translateX}, ${transform.translateY}) scale(${transform.scale})`}
        >
          {/* Render edges first (below nodes) */}
          {enhancedEdges.map((edge) => (
            <GraphEdgeComponent
              key={edge.id}
              edge={edge}
              nodes={enhancedNodes}
            />
          ))}

          {/* Render nodes */}
          {enhancedNodes.map((node) => (
            <GraphNodeComponent
              key={node.id}
              node={node}
              onClick={handleNodeClick}
              onMouseEnter={(nodeId) => {
                // Create a synthetic event for initial position
                const rect = containerRef.current?.getBoundingClientRect();
                const nodeData = viewModel.nodes.find((n) => n.id === nodeId);
                if (rect && nodeData) {
                  const screenX = rect.left + transform.translateX + nodeData.position.x * transform.scale;
                  const screenY = rect.top + transform.translateY + nodeData.position.y * transform.scale;
                  setHoveredNodeId(nodeId);
                  setTooltipPos({ x: screenX, y: screenY });
                  onNodeHover?.(nodeId);
                }
              }}
              onMouseLeave={handleNodeMouseLeave}
            />
          ))}
        </g>
      </svg>

      {/* Zoom Controls */}
      <ZoomControls
        zoomLevel={transform.scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToView={handleFitToView}
        onResetZoom={handleResetZoom}
      />

      {/* Hover Tooltip */}
      {hoveredNode && tooltipPos && (
        <div
          data-testid="graph-tooltip"
          style={{
            position: "fixed",
            left: tooltipPos.x + 15,
            top: tooltipPos.y + 15,
            backgroundColor: "var(--hex-devtools-bg-secondary, #24283b)",
            border: "1px solid var(--hex-devtools-border, #3b4261)",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 12,
            fontFamily: "var(--hex-devtools-font-mono, monospace)",
            color: "var(--hex-devtools-text, #c0caf5)",
            zIndex: 1000,
            pointerEvents: "none",
            boxShadow: "var(--hex-devtools-shadow-xl, 0 8px 32px rgba(0, 0, 0, 0.25))",
            minWidth: 160,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
            {hoveredNode.label}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              padding: "4px 8px",
              backgroundColor: getLifetimeBgColor(hoveredNode.lifetime),
              borderRadius: 6,
              border: `1px solid ${getLifetimeStrokeColor(hoveredNode.lifetime)}`,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: getLifetimeStrokeColor(hoveredNode.lifetime),
              }}
            />
            <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{hoveredNode.lifetime}</span>
          </div>
          <div style={{ color: "var(--hex-devtools-text-muted, #7982a9)", marginTop: 10 }}>
            <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
              <span>Dependencies:</span>
              <strong style={{ color: "var(--hex-devtools-text, #c0caf5)" }}>{hoveredNodeStats.dependencies}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Dependents:</span>
              <strong style={{ color: "var(--hex-devtools-text, #c0caf5)" }}>{hoveredNodeStats.dependents}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
