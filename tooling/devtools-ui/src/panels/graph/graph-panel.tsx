/**
 * GraphPanel — root component assembling the full graph panel.
 *
 * Integrates all sub-components: header, toolbar, canvas, minimap,
 * tooltip, filter panel, node detail, metadata inspector, analysis
 * sidebar, context menu, keyboard shortcuts, and edge states.
 *
 * @packageDocumentation
 */

import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import type { PanelProps } from "../types.js";
import type { EnrichedGraphNode, EnrichedGraphEdge, GraphExportFormat } from "./types.js";
import { ErrorBoundary } from "../../components/error-boundary.js";

// State
import { useGraphPanelState } from "./use-graph-panel-state.js";
import { useGraphData } from "./use-graph-data.js";
import { useGraphAnalysis } from "./use-graph-analysis.js";
import { useGraphKeyboard } from "./use-graph-keyboard.js";
import { useGraphAnnouncements } from "./use-graph-announcements.js";
import { useViewportCulling } from "./use-viewport-culling.js";

// Logic
import { computeGraphLayout } from "./layout-engine.js";
import {
  enrichNode,
  enrichEdge,
  buildDependentCounts,
  buildTransitiveDepthMap,
  buildDependentMap,
} from "./enrichment.js";
import { countActiveFilters } from "./filter-logic.js";
import { exportDot, exportMermaid, exportSvg, exportPng, encodeGraphUrlState } from "./export.js";
import {
  DEFAULT_FILTER_STATE,
  ZOOM_STEP,
  MIN_ZOOM,
  MAX_ZOOM,
  FIT_PADDING,
  VIEWPORT_CULLING_THRESHOLD,
} from "./constants.js";
import { computeInitialViewport } from "./viewport.js";

// Components
import { GraphHeader } from "./components/graph-header.js";
import { GraphToolbar } from "./components/graph-toolbar.js";
import { GraphCanvas } from "./components/graph-canvas.js";
import { GraphMinimap } from "./components/graph-minimap.js";
import { GraphTooltip } from "./components/graph-tooltip.js";
import { GraphFilterPanel } from "./components/graph-filter-panel.js";
import { FilterPresetManager } from "./components/filter-preset-manager.js";
import { NodeDetailPanel } from "./components/node-detail-panel.js";
import { MetadataInspectorPanel } from "./components/metadata-inspector-panel.js";
import { GraphAnalysisSidebar } from "./components/graph-analysis-sidebar.js";
import { GraphContextMenu } from "./components/graph-context-menu.js";
import type { ContextMenuPosition } from "./components/graph-context-menu.js";
import { GraphEdgeState } from "./components/graph-edge-states.js";

/**
 * Main graph panel component.
 */
function GraphPanel({ dataSource, theme, width, height }: PanelProps): React.ReactElement {
  const { state, dispatch } = useGraphPanelState();
  const multiContainerState = useGraphData(dataSource, state.selectedContainerName);
  const analysis = useGraphAnalysis(multiContainerState.activeGraph);
  const { announce, regionRef } = useGraphAnnouncements();
  const svgRef = useRef<SVGSVGElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<
    | {
        position: ContextMenuPosition;
        portName: string;
      }
    | undefined
  >(undefined);

  const activeGraph = multiContainerState.activeGraph;

  // Compute layout
  const layout = useMemo(() => {
    if (activeGraph === undefined || activeGraph.adapters.length === 0) return undefined;
    return computeGraphLayout(activeGraph, state.layoutDirection);
  }, [activeGraph, state.layoutDirection]);

  // Get result stats from data source
  const resultStats = dataSource.getAllResultStatistics();

  // Build enriched nodes
  const enrichedNodes = useMemo<readonly EnrichedGraphNode[]>(() => {
    if (layout === undefined || activeGraph === undefined) return [];

    const dependentCounts = buildDependentCounts(activeGraph.adapters);

    return layout.nodes.map(layoutNode => {
      const portName = layoutNode.adapter.portName;
      const stats = resultStats?.get(portName);
      const dependentCount = dependentCounts.get(portName) ?? 0;

      // Check resolution from snapshot singletons
      const snapshot = dataSource.getSnapshot();
      const isResolved =
        snapshot?.singletons?.some(s => s.portName === portName && s.isResolved) ?? false;

      return enrichNode(
        layoutNode,
        stats,
        undefined, // PortInfo from graph/advanced not available at this level
        dependentCount,
        isResolved,
        state.filter
      );
    });
  }, [layout, activeGraph, resultStats, state.filter, dataSource]);

  // Build enriched edges
  const enrichedEdges = useMemo<readonly EnrichedGraphEdge[]>(() => {
    if (layout === undefined || activeGraph === undefined) return [];

    const adapterMap = new Map(activeGraph.adapters.map(a => [a.portName, a]));
    const depMap = new Map(activeGraph.adapters.map(a => [a.portName, a.dependencyNames]));
    const dependentMap = buildDependentMap(activeGraph.adapters);
    const transitiveDepthMap = buildTransitiveDepthMap(state.selectedNodes, depMap, dependentMap);

    return layout.edges.map(layoutEdge =>
      enrichEdge(layoutEdge, state.selectedNodes, transitiveDepthMap, adapterMap)
    );
  }, [layout, activeGraph, state.selectedNodes]);

  // Viewport culling
  const toolbarHeight = 76; // header + toolbar approximate height
  const canvasHeight = height - toolbarHeight;

  // Auto-center graph when layout first computes
  const hasAutocentered = useRef(false);
  useEffect(() => {
    if (layout !== undefined && !hasAutocentered.current) {
      hasAutocentered.current = true;
      const initialViewport = computeInitialViewport(
        layout.width,
        layout.height,
        width,
        canvasHeight
      );
      dispatch.setViewport(initialViewport);
    }
  }, [layout, width, canvasHeight, dispatch]);

  const visibleNodes = useViewportCulling(enrichedNodes, state.viewport, width, canvasHeight);

  // Filter counts
  const activeFilterCount = countActiveFilters(state.filter);
  const matchingNodes = enrichedNodes.filter(n => n.matchesFilter).length;

  // Available categories and tags for filter panel
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const node of enrichedNodes) {
      if (node.category !== undefined) cats.add(node.category);
    }
    return [...cats].sort();
  }, [enrichedNodes]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const node of enrichedNodes) {
      for (const tag of node.tags) tags.add(tag);
    }
    return [...tags].sort();
  }, [enrichedNodes]);

  // Selected node for detail panel
  const selectedNode = useMemo<EnrichedGraphNode | undefined>(() => {
    if (state.selectedNodes.size !== 1) return undefined;
    const portName = [...state.selectedNodes][0];
    return enrichedNodes.find(n => n.adapter.portName === portName);
  }, [state.selectedNodes, enrichedNodes]);

  // Hovered node for tooltip
  const hoveredNode = useMemo<EnrichedGraphNode | undefined>(() => {
    if (state.hoveredNode === undefined) return undefined;
    return enrichedNodes.find(n => n.adapter.portName === state.hoveredNode);
  }, [state.hoveredNode, enrichedNodes]);

  // Transitive deps/dependents for selected node
  const transitiveDeps = useMemo(() => {
    if (selectedNode === undefined) return [];
    return selectedNode.adapter.dependencyNames.slice();
  }, [selectedNode]);

  const transitiveDependents = useMemo(() => {
    if (selectedNode === undefined || activeGraph === undefined) return [];
    return activeGraph.adapters
      .filter(a => a.dependencyNames.includes(selectedNode.adapter.portName))
      .map(a => a.portName);
  }, [selectedNode, activeGraph]);

  // Keyboard
  const handleExport = useCallback(
    (format: GraphExportFormat) => {
      if (activeGraph === undefined) return;

      switch (format) {
        case "dot": {
          const dot = exportDot(activeGraph, enrichedNodes);
          navigator.clipboard.writeText(dot).catch(() => {});
          announce("DOT exported to clipboard");
          break;
        }
        case "mermaid": {
          const mermaid = exportMermaid(enrichedNodes);
          navigator.clipboard.writeText(mermaid).catch(() => {});
          announce("Mermaid exported to clipboard");
          break;
        }
        case "svg": {
          const svg = svgRef.current;
          if (svg !== null) {
            const svgStr = exportSvg(svg);
            navigator.clipboard.writeText(svgStr).catch(() => {});
            announce("SVG exported to clipboard");
          }
          break;
        }
        case "png": {
          const svg = svgRef.current;
          if (svg !== null) {
            exportPng(svg)
              .then(dataUrl => {
                const link = document.createElement("a");
                link.download = "graph.png";
                link.href = dataUrl;
                link.click();
                announce("PNG downloaded");
              })
              .catch(() => {});
          }
          break;
        }
        default:
          break;
      }
    },
    [activeGraph, enrichedNodes, announce]
  );

  const handleFitView = useCallback(() => {
    if (layout === undefined) return;
    const scaleX = (width - FIT_PADDING * 2) / layout.width;
    const scaleY = (canvasHeight - FIT_PADDING * 2) / layout.height;
    const newZoom = Math.max(MIN_ZOOM, Math.min(scaleX, scaleY, MAX_ZOOM));
    dispatch.setViewport({
      panX: (width - layout.width * newZoom) / 2,
      panY: (canvasHeight - layout.height * newZoom) / 2,
      zoom: newZoom,
    });
  }, [layout, width, canvasHeight, dispatch]);

  const handleCopyLink = useCallback(() => {
    const url = encodeGraphUrlState({
      containerName: state.selectedContainerName,
      selectedNodes: state.selectedNodes,
      direction: state.layoutDirection,
      filter: state.filter,
    });
    navigator.clipboard.writeText(url).catch(() => {});
    announce("Link copied to clipboard");
  }, [state, announce]);

  useGraphKeyboard({
    dispatch,
    viewport: state.viewport,
    onExport: handleExport,
    onFitView: handleFitView,
  });

  // Mouse tracking for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  // Context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (state.hoveredNode !== undefined) {
        setContextMenu({
          position: { x: e.clientX, y: e.clientY },
          portName: state.hoveredNode,
        });
      }
    },
    [state.hoveredNode]
  );

  // Edge states
  if (activeGraph === undefined) {
    return <GraphEdgeState kind="empty" />;
  }

  if (activeGraph.adapters.length === 0) {
    return <GraphEdgeState kind="empty" />;
  }

  if (
    enrichedNodes.length > VIEWPORT_CULLING_THRESHOLD &&
    !state.filterPanelOpen &&
    activeFilterCount === 0
  ) {
    // Don't block rendering, but could show warning
  }

  return (
    <ErrorBoundary>
      <div
        data-testid="graph-panel"
        role="region"
        aria-label="Graph Panel"
        style={{
          display: "flex",
          flexDirection: "column",
          width,
          height,
          backgroundColor: "var(--hex-bg-primary)",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
      >
        {/* Header */}
        <GraphHeader
          multiContainerState={multiContainerState}
          selectedContainerName={state.selectedContainerName}
          layoutDirection={state.layoutDirection}
          onContainerChange={dispatch.setContainer}
        />

        {/* Toolbar */}
        <GraphToolbar
          layoutDirection={state.layoutDirection}
          activeFilterCount={activeFilterCount}
          analysisSidebarOpen={state.analysisSidebarOpen}
          minimapVisible={state.minimapVisible}
          onToggleLayout={() =>
            dispatch.setLayoutDirection(state.layoutDirection === "TB" ? "LR" : "TB")
          }
          onToggleFilter={dispatch.toggleFilterPanel}
          onToggleAnalysis={dispatch.toggleAnalysis}
          onToggleMinimap={dispatch.toggleMinimap}
          onZoomIn={() =>
            dispatch.setViewport({
              ...state.viewport,
              zoom: Math.min(state.viewport.zoom + ZOOM_STEP, MAX_ZOOM),
            })
          }
          onZoomOut={() =>
            dispatch.setViewport({
              ...state.viewport,
              zoom: Math.max(state.viewport.zoom - ZOOM_STEP, MIN_ZOOM),
            })
          }
          onFitView={handleFitView}
          onExport={handleExport}
          onCopyLink={handleCopyLink}
        />

        {/* Main content area */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Filter panel (left) */}
          {state.filterPanelOpen && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <GraphFilterPanel
                filter={state.filter}
                isOpen={state.filterPanelOpen}
                totalNodes={enrichedNodes.length}
                matchingNodes={matchingNodes}
                availableCategories={availableCategories}
                availableTags={availableTags}
                onFilterChange={dispatch.setFilter}
                onReset={dispatch.resetFilter}
                onClose={dispatch.toggleFilterPanel}
              />
              <FilterPresetManager
                currentFilter={state.filter}
                activePreset={state.activePreset}
                onApplyPreset={filter => dispatch.setFilter(filter)}
                onSetActivePreset={dispatch.setActivePreset}
              />
            </div>
          )}

          {/* Canvas */}
          <div style={{ flex: 1, position: "relative" }}>
            <GraphCanvas
              nodes={visibleNodes}
              edges={enrichedEdges}
              selectedNodes={state.selectedNodes}
              hoveredNode={state.hoveredNode}
              viewport={state.viewport}
              width={
                width -
                (state.filterPanelOpen ? 280 : 0) -
                (state.analysisSidebarOpen || state.metadataInspectorOpen ? 320 : 0)
              }
              height={canvasHeight}
              onNodeClick={dispatch.selectNode}
              onNodeMultiSelect={dispatch.toggleMultiSelect}
              onNodeHover={dispatch.setHovered}
              onEdgeClick={(source, target) => {
                dispatch.selectNode(source);
              }}
              onBackgroundClick={dispatch.clearSelection}
              onViewportChange={dispatch.setViewport}
              svgRef={svgRef}
            />

            {/* Minimap */}
            {layout !== undefined && (
              <GraphMinimap
                nodes={enrichedNodes}
                layout={layout}
                viewport={state.viewport}
                canvasWidth={width}
                canvasHeight={canvasHeight}
                visible={state.minimapVisible}
                onViewportChange={dispatch.setViewport}
              />
            )}

            {/* Tooltip */}
            <GraphTooltip
              node={hoveredNode}
              x={mousePos.x}
              y={mousePos.y}
              canvasWidth={width}
              canvasHeight={canvasHeight}
            />
          </div>

          {/* Analysis sidebar (right) */}
          {state.analysisSidebarOpen && (
            <GraphAnalysisSidebar
              analysis={analysis}
              isOpen={state.analysisSidebarOpen}
              onClose={dispatch.toggleAnalysis}
              onPortClick={dispatch.selectNode}
            />
          )}

          {/* Metadata inspector (right) */}
          {state.metadataInspectorOpen && (
            <MetadataInspectorPanel
              node={selectedNode}
              isOpen={state.metadataInspectorOpen}
              onClose={dispatch.toggleMetadata}
            />
          )}
        </div>

        {/* Node detail panel (bottom) */}
        <NodeDetailPanel
          node={selectedNode}
          transitiveDeps={transitiveDeps}
          transitiveDependents={transitiveDependents}
          onViewMetadata={portName => {
            dispatch.selectNode(portName);
            dispatch.toggleMetadata();
          }}
          onHighlightChain={portName => dispatch.setBlastRadius(portName)}
          onNodeClick={dispatch.selectNode}
        />

        {/* Context menu */}
        <GraphContextMenu
          position={contextMenu?.position}
          portName={contextMenu?.portName}
          onClose={() => setContextMenu(undefined)}
          onSelectNode={dispatch.selectNode}
          onShowDependencies={portName => {
            dispatch.selectNode(portName);
            announce(`Showing dependencies for ${portName}`);
          }}
          onShowDependents={portName => {
            dispatch.selectNode(portName);
            announce(`Showing dependents for ${portName}`);
          }}
          onFindPath={() => {}}
          onFindCommon={() => {}}
          onHighlightChain={portName => dispatch.setBlastRadius(portName)}
          onViewMetadata={portName => {
            dispatch.selectNode(portName);
            dispatch.toggleMetadata();
          }}
          onCopyPortName={portName => {
            navigator.clipboard.writeText(portName).catch(() => {});
            announce(`Copied ${portName} to clipboard`);
          }}
          onNavigateToContainer={() => {}}
          selectedNodes={state.selectedNodes}
        />

        {/* Screen reader live region */}
        <div
          ref={regionRef}
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            clipPath: "inset(50%)",
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export { GraphPanel };
