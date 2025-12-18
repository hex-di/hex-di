/**
 * FloatingDevTools - DOM-specific floating DevTools panel.
 *
 * Self-contained component that accepts graph + container props and handles
 * all presenter setup, tab content rendering, and Vite relay connection internally.
 *
 * Features:
 * - Fixed positioning in viewport corners
 * - Resize handles for adjustable dimensions
 * - Fullscreen toggle
 * - LocalStorage persistence for state
 * - Automatic relay connection for TUI inspection
 * - Tab content routing (Graph, Services, Tracing, Inspector)
 *
 * @packageDocumentation
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactElement,
  type CSSProperties,
} from "react";
import type { Port } from "@hex-di/ports";
import type { Graph } from "@hex-di/graph";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import { TRACING_ACCESS } from "@hex-di/runtime";

import { DevToolsPanel } from "../components/DevToolsPanel.js";
import { GraphView } from "../components/GraphView.js";
import { ServicesView } from "../components/ServicesView.js";
import { TimelineView } from "../components/TimelineView.js";
import { InspectorView } from "../components/InspectorView.js";
import { PrimitivesProvider } from "../hooks/primitives-context.js";
import { DOMPrimitives } from "./primitives.js";
import { LocalDataSource } from "../data-source/local-data-source.js";
import { injectCSSVariables, removeCSSVariables } from "../design-tokens.js";
import {
  PanelPresenter,
  GraphPresenter,
  ServicesPresenter,
  TimelinePresenter,
  InspectorPresenter,
} from "../presenters/index.js";
import { toJSON } from "../to-json.js";
import type { PanelPosition, TabId, ConnectionStatus } from "../view-models/panel.vm.js";
import type { ServicesSortColumn } from "../view-models/services.vm.js";
import type { TraceEntry, TraceStats } from "@hex-di/devtools-core";

// Import DevToolsHostClient for relay connection
import { DevToolsHostClient } from "@hex-di/devtools-network/browser";

// Declare process.env for TypeScript
declare const process: { env: { NODE_ENV?: string } } | undefined;

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the FloatingDevTools component.
 */
export interface FloatingDevToolsProps {
  /** The dependency graph to visualize */
  readonly graph: Graph<Port<unknown, string>>;
  /** Optional container for runtime inspection and tracing */
  readonly container?: Container<Port<unknown, string>, Port<unknown, string>, ContainerPhase>;
  /** App name (shown in header and sent to TUI) */
  readonly appName?: string;
  /** App version (shown in header and sent to TUI) */
  readonly appVersion?: string;
  /** Position in viewport corner */
  readonly position?: PanelPosition;
  /** Custom relay URL (auto-detected from window.location if not provided) */
  readonly relayUrl?: string;
  /** Callback when open state changes */
  readonly onOpenChange?: (isOpen: boolean) => void;
  /** Callback when fullscreen is toggled */
  readonly onToggleFullscreen?: () => void;
  /** Callback when panel is closed */
  readonly onClose?: () => void;
  /** Callback when size changes (during resize) */
  readonly onSizeChange?: (width: number, height: number) => void;
  /** Key prefix for localStorage persistence */
  readonly persistKey?: string;
}

// =============================================================================
// Constants
// =============================================================================

const OFFSET = "16px";
const MIN_WIDTH = 300;
const MIN_HEIGHT = 300;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 900;
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 500;

// =============================================================================
// Position Styles
// =============================================================================

function getPositionStyles(position: PanelPosition): CSSProperties {
  switch (position) {
    case "bottom-right":
      return { bottom: OFFSET, right: OFFSET };
    case "bottom-left":
      return { bottom: OFFSET, left: OFFSET };
    case "top-right":
      return { top: OFFSET, right: OFFSET };
    case "top-left":
      return { top: OFFSET, left: OFFSET };
    default:
      return { bottom: OFFSET, right: OFFSET };
  }
}

function getResizeCursor(position: PanelPosition): CSSProperties["cursor"] {
  switch (position) {
    case "bottom-right":
    case "top-left":
      return "nwse-resize";
    case "bottom-left":
    case "top-right":
      return "nesw-resize";
    default:
      return "nwse-resize";
  }
}

function getCornerPosition(position: PanelPosition): CSSProperties {
  switch (position) {
    case "bottom-right":
      return { bottom: 0, right: 0 };
    case "bottom-left":
      return { bottom: 0, left: 0 };
    case "top-right":
      return { top: 0, right: 0 };
    case "top-left":
      return { top: 0, left: 0 };
    default:
      return { bottom: 0, right: 0 };
  }
}

// =============================================================================
// Storage Helpers
// =============================================================================

function getStoredBoolean(key: string, defaultValue: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? defaultValue : stored === "true";
  } catch {
    return defaultValue;
  }
}

function setStoredBoolean(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage errors
  }
}

function getStoredSize(key: string): { width: number; height: number } {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed.width === "number" && typeof parsed.height === "number") {
        return {
          width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed.width)),
          height: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, parsed.height)),
        };
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
}

function setStoredSize(key: string, width: number, height: number): void {
  try {
    localStorage.setItem(key, JSON.stringify({ width, height }));
  } catch {
    // Ignore storage errors
  }
}

// =============================================================================
// Relay URL Helper
// =============================================================================

/**
 * Get the DevTools relay URL.
 * Auto-detects from window.location for Vite dev server.
 */
function getDevToolsUrl(): string {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/devtools`;
  }
  return "ws://localhost:3000/devtools";
}

// =============================================================================
// FloatingDevTools Component
// =============================================================================

/**
 * DOM-specific floating DevTools panel.
 *
 * Self-contained component that handles all presenter setup, tab content
 * rendering, and relay connection internally. Just pass graph and container.
 *
 * @example
 * ```tsx
 * import { FloatingDevTools } from '@hex-di/devtools/dom';
 * import { createTracingContainer } from '@hex-di/devtools';
 *
 * const container = createTracingContainer(appGraph);
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <FloatingDevTools
 *         graph={appGraph}
 *         container={container}
 *         appName="My App"
 *         appVersion="1.0.0"
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function FloatingDevTools({
  graph,
  container,
  appName = "Unknown",
  appVersion = "0.0.0",
  position = "bottom-right",
  relayUrl,
  onOpenChange,
  onToggleFullscreen,
  onClose,
  onSizeChange,
  persistKey = "hex-devtools",
}: FloatingDevToolsProps): ReactElement | null {
  // Production mode check
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return null;
  }

  // ============================================
  // 1. Data Source & Presenters
  // ============================================
  const dataSource = useMemo(
    () => new LocalDataSource(graph as never, container as never),
    [graph, container]
  );

  const panelPresenter = useMemo(() => {
    const p = new PanelPresenter(dataSource);
    p.setAppInfo(appName, appVersion);
    return p;
  }, [dataSource, appName, appVersion]);

  const graphPresenter = useMemo(
    () => new GraphPresenter(dataSource),
    [dataSource]
  );

  const servicesPresenter = useMemo(
    () => new ServicesPresenter(dataSource),
    [dataSource]
  );

  const timelinePresenter = useMemo(
    () => new TimelinePresenter(dataSource),
    [dataSource]
  );

  const inspectorPresenter = useMemo(
    () => new InspectorPresenter(dataSource),
    [dataSource]
  );

  // ============================================
  // 2. View Model State
  // ============================================
  const [panelVM, setPanelVM] = useState(() => panelPresenter.getViewModel());
  const [graphVM, setGraphVM] = useState(() => graphPresenter.getViewModel());
  const [servicesVM, setServicesVM] = useState(() => servicesPresenter.getViewModel());
  const [timelineVM, setTimelineVM] = useState(() => timelinePresenter.getViewModel());
  const [inspectorVM, setInspectorVM] = useState(() => inspectorPresenter.getViewModel());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [activeTabId, setActiveTabId] = useState<TabId>("graph");

  // Subscribe to data source updates
  useEffect(() => {
    const unsubscribe = dataSource.subscribe(() => {
      setPanelVM(panelPresenter.getViewModel());
      setGraphVM(graphPresenter.getViewModel());
      setServicesVM(servicesPresenter.getViewModel());
      setTimelineVM(timelinePresenter.getViewModel());
      setInspectorVM(inspectorPresenter.getViewModel());
    });
    return unsubscribe;
  }, [dataSource, panelPresenter, graphPresenter, servicesPresenter, timelinePresenter, inspectorPresenter]);

  // ============================================
  // 3. Relay Connection (DevToolsHostClient)
  // ============================================
  const tracingApi = container !== undefined ? (container as { [TRACING_ACCESS]?: {
    getTraces: () => readonly TraceEntry[];
    getStats: () => TraceStats;
    pause: () => void;
    resume: () => void;
    clear: () => void;
    pin: (id: string) => void;
    unpin: (id: string) => void;
  } })[TRACING_ACCESS] : undefined;

  const defaultStats: TraceStats = {
    totalResolutions: 0,
    averageDuration: 0,
    cacheHitRate: 0,
    slowCount: 0,
    sessionStart: Date.now(),
    totalDuration: 0,
  };

  useEffect(() => {
    const url = relayUrl ?? getDevToolsUrl();

    const hostClient = new DevToolsHostClient({
      url,
      appId: appName.toLowerCase().replace(/\s+/g, "-"),
      appName,
      appVersion,
    });

    // Register handlers to provide data to TUI clients
    hostClient.registerHandlers({
      getGraph: () => toJSON(graph as never),
      getTraces: () => tracingApi?.getTraces() ?? [],
      getStats: () => tracingApi?.getStats() ?? defaultStats,
      pauseTracing: () => { tracingApi?.pause(); },
      resumeTracing: () => { tracingApi?.resume(); },
      clearTraces: () => { tracingApi?.clear(); },
      pinTrace: (traceId: string, pin: boolean) => {
        if (pin) {
          tracingApi?.pin(traceId);
        } else {
          tracingApi?.unpin(traceId);
        }
      },
    });

    // Track connection status using single event listener
    hostClient.on((event) => {
      if (event.type === "connected") {
        setConnectionStatus("connected");
      } else if (event.type === "disconnected") {
        setConnectionStatus("disconnected");
      } else if (event.type === "error") {
        setConnectionStatus("error");
      }
    });

    // Connect to relay (fire and forget, will auto-reconnect)
    hostClient.connect().catch((err) => {
      console.warn("[FloatingDevTools] Failed to connect to relay:", err.message);
    });

    return () => {
      hostClient.disconnect();
    };
  }, [graph, appName, appVersion, relayUrl, tracingApi]);

  // ============================================
  // 4. Panel State (localStorage persistence)
  // ============================================
  const [isOpen, setIsOpen] = useState(() =>
    getStoredBoolean(`${persistKey}-open`, false)
  );
  const [size, setSize] = useState(() =>
    getStoredSize(`${persistKey}-size`)
  );
  const [isFullscreen, setIsFullscreen] = useState(() =>
    getStoredBoolean(`${persistKey}-fullscreen`, false)
  );

  // ============================================
  // 4.1 Inject CSS Variables (Design Tokens)
  // ============================================
  useEffect(() => {
    // Inject design tokens as CSS custom properties
    injectCSSVariables("dark");
    return () => {
      // Cleanup on unmount
      removeCSSVariables();
    };
  }, []);

  // Resize tracking
  const isResizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Persist state changes
  useEffect(() => {
    setStoredBoolean(`${persistKey}-open`, isOpen);
    onOpenChange?.(isOpen);
  }, [isOpen, persistKey, onOpenChange]);

  useEffect(() => {
    setStoredSize(`${persistKey}-size`, size.width, size.height);
  }, [size, persistKey]);

  useEffect(() => {
    setStoredBoolean(`${persistKey}-fullscreen`, isFullscreen);
  }, [isFullscreen, persistKey]);

  // ============================================
  // 5. Event Handlers
  // ============================================
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    onToggleFullscreen?.();
  }, [onToggleFullscreen]);

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTabId(tabId);
    panelPresenter.setActiveTab(tabId);
    setPanelVM(panelPresenter.getViewModel());
  }, [panelPresenter]);

  // Services tab callbacks
  const handleServiceSelect = useCallback((portName: string) => {
    inspectorPresenter.selectService(portName);
    setInspectorVM(inspectorPresenter.getViewModel());
    handleTabChange("inspector");
  }, [inspectorPresenter, handleTabChange]);

  const handleServicesSort = useCallback((column: ServicesSortColumn) => {
    servicesPresenter.setSort(column);
    setServicesVM(servicesPresenter.getViewModel());
  }, [servicesPresenter]);

  const handleServicesFilter = useCallback((text: string) => {
    servicesPresenter.setFilterText(text);
    setServicesVM(servicesPresenter.getViewModel());
  }, [servicesPresenter]);

  // Timeline tab callbacks
  const handlePauseToggle = useCallback(() => {
    if (tracingApi !== undefined) {
      const stats = tracingApi.getStats() as { isPaused?: boolean };
      if (stats.isPaused) {
        tracingApi.resume();
      } else {
        tracingApi.pause();
      }
      setTimelineVM(timelinePresenter.getViewModel());
    }
  }, [tracingApi, timelinePresenter]);

  const handleClearTraces = useCallback(() => {
    tracingApi?.clear();
    setTimelineVM(timelinePresenter.getViewModel());
  }, [tracingApi, timelinePresenter]);

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      isResizing.current = true;
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      resizeStart.current = { x: clientX, y: clientY, width: size.width, height: size.height };

      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      document.addEventListener("touchmove", handleResizeMove);
      document.addEventListener("touchend", handleResizeEnd);
    },
    [size]
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isResizing.current) return;

      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      const deltaX = clientX - resizeStart.current.x;
      const deltaY = clientY - resizeStart.current.y;

      // Calculate new size based on position
      let newWidth = resizeStart.current.width;
      let newHeight = resizeStart.current.height;

      if (position === "bottom-right" || position === "top-right") {
        newWidth = resizeStart.current.width - deltaX;
      } else {
        newWidth = resizeStart.current.width + deltaX;
      }

      if (position === "bottom-right" || position === "bottom-left") {
        newHeight = resizeStart.current.height - deltaY;
      } else {
        newHeight = resizeStart.current.height + deltaY;
      }

      // Clamp to bounds
      newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth));
      newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, newHeight));

      setSize({ width: newWidth, height: newHeight });
      onSizeChange?.(newWidth, newHeight);
    },
    [position, onSizeChange]
  );

  const handleResizeEnd = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
    document.removeEventListener("touchmove", handleResizeMove);
    document.removeEventListener("touchend", handleResizeEnd);
  }, [handleResizeMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.removeEventListener("touchmove", handleResizeMove);
      document.removeEventListener("touchend", handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  // ============================================
  // 6. Tab Content Routing
  // ============================================
  const renderTabContent = (): ReactElement | null => {
    switch (activeTabId) {
      case "graph":
        return (
          <GraphView
            viewModel={graphVM}
            onNodeSelect={(nodeId) => {
              if (nodeId !== null) {
                graphPresenter.selectNode(nodeId);
                setGraphVM(graphPresenter.getViewModel());
              }
            }}
          />
        );
      case "services":
        return (
          <ServicesView
            viewModel={servicesVM}
            onServiceSelect={handleServiceSelect}
            onSort={handleServicesSort}
            onFilterChange={handleServicesFilter}
          />
        );
      case "tracing":
        return (
          <TimelineView
            viewModel={timelineVM}
            onPauseToggle={handlePauseToggle}
            onClearTraces={handleClearTraces}
          />
        );
      case "inspector":
        return (
          <InspectorView
            viewModel={inspectorVM}
            onDependencySelect={(portName) => {
              handleServiceSelect(portName);
            }}
          />
        );
      default:
        return null;
    }
  };

  // ============================================
  // 7. Build View Model with Connection Status
  // ============================================
  const viewModelWithConnection = useMemo(() => ({
    ...panelVM,
    activeTabId,
    connection: {
      ...panelVM.connection,
      status: connectionStatus,
    },
  }), [panelVM, activeTabId, connectionStatus]);

  // ============================================
  // 8. Styles
  // ============================================
  const positionStyles = getPositionStyles(position);

  const containerStyle: CSSProperties = {
    position: "fixed",
    zIndex: 99999,
    fontFamily: "var(--hex-devtools-font-mono, monospace)",
    ...positionStyles,
  };

  const panelStyle: CSSProperties = isFullscreen
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "var(--hex-devtools-bg, #1a1b26)",
        border: "none",
        borderRadius: 0,
        zIndex: 100000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }
    : {
        position: "relative",
        width: size.width,
        height: size.height,
        backgroundColor: "var(--hex-devtools-bg, #1a1b26)",
        border: "1px solid var(--hex-devtools-border, #3b4261)",
        borderRadius: "12px",
        boxShadow: "var(--hex-devtools-shadow-xl, 0 8px 32px rgba(0, 0, 0, 0.25))",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      };

  const toggleStyle: CSSProperties = {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    border: "1px solid var(--hex-devtools-border, #3b4261)",
    backgroundColor: "var(--hex-devtools-bg, #1a1b26)",
    color: "var(--hex-devtools-primary, #7aa2f7)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "var(--hex-devtools-shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.2))",
    fontSize: "15px",
    fontWeight: 700,
    transition: "var(--hex-devtools-transition-all, all 0.15s ease)",
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "10px 16px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #24283b)",
    borderBottom: "1px solid var(--hex-devtools-border, #3b4261)",
    gap: "8px",
  };

  const buttonStyle: CSSProperties = {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--hex-devtools-text, #c0caf5)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: 400,
    transition: "var(--hex-devtools-transition-color, color 0.15s ease, background-color 0.15s ease)",
  };

  const resizeHandleStyle: CSSProperties = {
    position: "absolute",
    width: "16px",
    height: "16px",
    cursor: getResizeCursor(position),
    zIndex: 10,
    ...getCornerPosition(position),
  };

  const edgeStyle = (edge: "top" | "bottom" | "left" | "right"): CSSProperties => {
    const baseStyle: CSSProperties = { position: "absolute", zIndex: 9 };
    switch (edge) {
      case "top":
        return { ...baseStyle, top: 0, left: 16, right: 16, height: 6, cursor: "ns-resize" };
      case "bottom":
        return { ...baseStyle, bottom: 0, left: 16, right: 16, height: 6, cursor: "ns-resize" };
      case "left":
        return { ...baseStyle, left: 0, top: 16, bottom: 16, width: 6, cursor: "ew-resize" };
      case "right":
        return { ...baseStyle, right: 0, top: 16, bottom: 16, width: 6, cursor: "ew-resize" };
    }
  };

  // ============================================
  // 9. Render
  // ============================================
  return (
    <div
      data-testid="floating-devtools-container"
      style={isFullscreen ? { position: "fixed", top: 0, left: 0 } : containerStyle}
    >
      {isOpen ? (
        <div style={panelStyle} data-testid="floating-devtools-panel">
          {/* Header with controls */}
          <div style={headerStyle}>
            <button
              data-testid="floating-devtools-fullscreen"
              style={buttonStyle}
              onClick={handleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? "⊡" : "□"}
            </button>
            <button
              data-testid="floating-devtools-close"
              style={buttonStyle}
              onClick={handleClose}
              aria-label="Close DevTools"
            >
              ×
            </button>
          </div>

          {/* DevTools Panel Content - wrapped in PrimitivesProvider */}
          <div style={{ flex: 1, overflow: "auto" }}>
            <PrimitivesProvider primitives={DOMPrimitives}>
              <DevToolsPanel
                viewModel={viewModelWithConnection}
                onTabChange={handleTabChange}
                onClose={handleClose}
                onToggleFullscreen={handleFullscreen}
              >
                {renderTabContent()}
              </DevToolsPanel>
            </PrimitivesProvider>
          </div>

          {/* Resize handles (only when not fullscreen) */}
          {!isFullscreen && (
            <>
              <div
                data-testid="floating-devtools-resize-corner"
                style={resizeHandleStyle}
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
              />
              <div
                data-testid="floating-devtools-resize-top"
                style={edgeStyle("top")}
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
              />
              <div
                data-testid="floating-devtools-resize-bottom"
                style={edgeStyle("bottom")}
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
              />
              <div
                data-testid="floating-devtools-resize-left"
                style={edgeStyle("left")}
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
              />
              <div
                data-testid="floating-devtools-resize-right"
                style={edgeStyle("right")}
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
              />
            </>
          )}
        </div>
      ) : (
        <button
          data-testid="floating-devtools-toggle"
          style={toggleStyle}
          onClick={handleToggle}
          aria-label="Open HexDI DevTools"
        >
          {"{ }"}
        </button>
      )}
    </div>
  );
}
