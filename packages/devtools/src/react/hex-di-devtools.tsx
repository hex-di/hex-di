/**
 * HexDiDevTools Component
 *
 * Simplified API for HexDI DevTools that accepts only a container prop.
 * The component automatically:
 * - Extracts the inspector from the container using hasInspector type guard
 * - Creates the DevToolsFlowRuntime internally
 * - Provides state management via DevToolsStoreProvider
 *
 * Note: For full DevTools functionality (child discovery, graph data, subscriptions),
 * containers need the InspectorPlugin installed via `withInspector` wrapper.
 * The built-in `container.inspector` property provides basic InspectorAPI.
 *
 * @packageDocumentation
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactElement,
  type CSSProperties,
} from "react";
import type { InspectorAPI, VisualizableAdapter } from "@hex-di/runtime";
import type { TracingAPI } from "@hex-di/core";
import type { ExportedGraph } from "@hex-di/devtools-core";
import type { DevToolsPlugin } from "./types/plugin-types.js";
import { defaultPlugins } from "../plugins/presets.js";
// DevToolsRuntimeProvider removed - plugins now provided via DevToolsStoreProvider
import { floatingStyles, getPositionStyles, panelStyles } from "./styles.js";
import type { InspectableContainer } from "./types/inspectable-container.js";
import { buildExportedGraphFromVisualizableAdapters } from "./utils/build-graph-from-container.js";
import { TabNavigation } from "./tab-navigation.js";
import { PluginTabContent } from "./plugin-tab-content.js";
import { ContainerSelector } from "./container-selector.js";
import {
  DevToolsStoreProvider,
  useSelectedContainerId,
  useDevToolsFlowRuntime,
  useDevToolsStore,
} from "../store/index.js";

// Declare process.env for TypeScript
declare const process: { env: { NODE_ENV?: string } } | undefined;

// =============================================================================
// Constants
// =============================================================================

/** localStorage key for open/closed state persistence */
const STORAGE_KEY = "hex-di-devtools-open";
/** localStorage key for panel size persistence */
const SIZE_STORAGE_KEY = "hex-di-devtools-size";
/** localStorage key for fullscreen state persistence */
const FULLSCREEN_STORAGE_KEY = "hex-di-devtools-fullscreen";

/** Panel size configuration */
interface PanelSize {
  width: number;
  height: number;
}

/** Default panel dimensions */
const DEFAULT_SIZE: PanelSize = { width: 400, height: 500 };

/** Minimum panel dimensions */
const MIN_SIZE: PanelSize = { width: 300, height: 300 };

/** Empty graph for null runtime case */
const EMPTY_GRAPH: ExportedGraph = Object.freeze({ nodes: [], edges: [] });

/** Maximum panel dimensions */
const MAX_SIZE: PanelSize = { width: 1200, height: 900 };

/** Type guard to check if value is a non-null object */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Type guard for PanelSize from localStorage.
 *
 * Validates:
 * - Value is a non-null object
 * - width and height are finite numbers (not NaN, Infinity)
 * - Values are within reasonable bounds (MIN_SIZE to MAX_SIZE)
 */
function isPanelSize(value: unknown): value is PanelSize {
  if (!isRecord(value)) return false;

  const { width, height } = value;

  // Must be finite numbers (excludes NaN, Infinity, -Infinity)
  if (typeof width !== "number" || !Number.isFinite(width)) return false;
  if (typeof height !== "number" || !Number.isFinite(height)) return false;

  // Must be within valid range
  if (width < MIN_SIZE.width || width > MAX_SIZE.width) return false;
  if (height < MIN_SIZE.height || height > MAX_SIZE.height) return false;

  return true;
}

/** Resize edge types */
type ResizeEdge = "top" | "bottom" | "left" | "right" | "corner";

// =============================================================================
// Types
// =============================================================================

/**
 * Position options for the floating DevTools.
 */
export type DevToolsPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

/**
 * Props for the HexDiDevTools component.
 */
export interface HexDiDevToolsProps {
  /** The container with InspectorPlugin installed (required) */
  readonly container: InspectableContainer;
  /** Plugins to use (defaults to defaultPlugins()) */
  readonly plugins?: readonly DevToolsPlugin[];
  /** Position of the toggle button. Default: 'bottom-right' */
  readonly position?: DevToolsPosition;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Safely read from localStorage with error handling.
 */
function getStoredState(key: string, defaultValue: string): string {
  try {
    return localStorage.getItem(key) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely write to localStorage with error handling.
 */
function setStoredState(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get resize cursor based on position.
 */
function getResizeCursor(position: DevToolsPosition): CSSProperties["cursor"] {
  switch (position) {
    case "bottom-right":
      return "nwse-resize";
    case "bottom-left":
      return "nesw-resize";
    case "top-right":
      return "nesw-resize";
    case "top-left":
      return "nwse-resize";
    default:
      return "nwse-resize";
  }
}

/**
 * Get resize handle position styles based on panel position.
 */
function getResizeHandlePosition(position: DevToolsPosition): CSSProperties {
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

/**
 * Extracts the InspectorAPI from a container.
 *
 * All containers have a built-in `inspector` property that provides the full
 * InspectorAPI with all functionality needed by DevTools.
 */
function extractInspector(container: InspectableContainer): InspectorAPI {
  return container.inspector;
}

// =============================================================================
// Inner Panel Component
// =============================================================================

/**
 * Props for the inner panel content component.
 */
interface DevToolsPanelContentProps {
  readonly position: DevToolsPosition;
  readonly onClose: () => void;
  readonly tracingAPI: TracingAPI | undefined;
}

/**
 * Inner panel content using the plugin architecture.
 * Uses Zustand store for state management.
 */
function DevToolsPanelContent({
  position,
  onClose,
  tracingAPI,
}: DevToolsPanelContentProps): ReactElement {
  // Get selected container ID from Zustand store
  const selectedContainerId = useSelectedContainerId();

  // Get runtime for inspector lookups via Zustand store (V12 fix - derive from runtime)
  const flowRuntime = useDevToolsFlowRuntime();

  // Build graph from selected container with merged parent services
  // Uses getAncestorChain to include inherited services from all ancestor containers
  const exportedGraph = useMemo(() => {
    // Return empty graph if no runtime available
    if (flowRuntime === null) {
      return EMPTY_GRAPH;
    }

    // Get root inspector from runtime
    const rootInspector = flowRuntime.getRootInspector();

    // Get the ancestor chain [root, ..., parent, selected]
    const chain = flowRuntime.getAncestorChain(selectedContainerId ?? "");

    if (chain.length === 0) {
      // Fallback to root inspector
      const graphData = rootInspector.getGraphData();
      return buildExportedGraphFromVisualizableAdapters(graphData.adapters);
    }

    // Merge adapters from all ancestors (child adapters override parent)
    const mergedAdapters: VisualizableAdapter[] = [];
    const seenPorts = new Set<string>();

    // Process in reverse order (child first) so child overrides take precedence
    for (let i = chain.length - 1; i >= 0; i--) {
      const inspector = chain[i];
      const graphData = inspector.getGraphData();

      for (const adapter of graphData.adapters) {
        if (!seenPorts.has(adapter.portName)) {
          seenPorts.add(adapter.portName);
          mergedAdapters.push(adapter);
        }
      }
    }

    return buildExportedGraphFromVisualizableAdapters(mergedAdapters);
  }, [selectedContainerId, flowRuntime]);

  // Local state for panel size and fullscreen
  const [panelSize, setPanelSize] = useState<PanelSize>(() => {
    const stored = getStoredState(SIZE_STORAGE_KEY, "");
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (isPanelSize(parsed)) {
          return { width: parsed.width, height: parsed.height };
        }
        return DEFAULT_SIZE;
      } catch {
        return DEFAULT_SIZE;
      }
    }
    return DEFAULT_SIZE;
  });

  const [isFullscreen, setIsFullscreen] = useState(() => {
    return getStoredState(FULLSCREEN_STORAGE_KEY, "false") === "true";
  });

  // Persist size changes
  useEffect(() => {
    setStoredState(SIZE_STORAGE_KEY, JSON.stringify(panelSize));
  }, [panelSize]);

  // Persist fullscreen changes
  useEffect(() => {
    setStoredState(FULLSCREEN_STORAGE_KEY, String(isFullscreen));
  }, [isFullscreen]);

  // Track if currently resizing
  const isResizing = useRef(false);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const activeEdge = useRef<ResizeEdge>("corner");

  // Refs for resize handlers
  const handleResizeMoveRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {});
  const handleResizeEndRef = useRef<() => void>(() => {});

  // Reset handler
  const handleReset = () => {
    setPanelSize(DEFAULT_SIZE);
    setIsFullscreen(false);
  };

  // Fullscreen toggle handler
  const handleFullscreenToggle = () => {
    setIsFullscreen(prev => !prev);
  };

  // Resize handlers
  const handleResizeMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isResizing.current) return;

      const clientX = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
      const clientY = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;

      const deltaX = clientX - resizeStartPos.current.x;
      const deltaY = clientY - resizeStartPos.current.y;

      let newWidth = resizeStartSize.current.width;
      let newHeight = resizeStartSize.current.height;

      const edge = activeEdge.current;

      // Horizontal resizing
      if (edge === "left" || edge === "right" || edge === "corner") {
        if (edge === "left") {
          newWidth =
            position === "bottom-right" || position === "top-right"
              ? resizeStartSize.current.width - deltaX
              : resizeStartSize.current.width + deltaX;
        } else if (edge === "right") {
          newWidth =
            position === "bottom-left" || position === "top-left"
              ? resizeStartSize.current.width + deltaX
              : resizeStartSize.current.width - deltaX;
        } else {
          switch (position) {
            case "bottom-right":
            case "top-right":
              newWidth = resizeStartSize.current.width - deltaX;
              break;
            case "bottom-left":
            case "top-left":
              newWidth = resizeStartSize.current.width + deltaX;
              break;
          }
        }
      }

      // Vertical resizing
      if (edge === "top" || edge === "bottom" || edge === "corner") {
        if (edge === "top") {
          newHeight =
            position === "bottom-right" || position === "bottom-left"
              ? resizeStartSize.current.height - deltaY
              : resizeStartSize.current.height + deltaY;
        } else if (edge === "bottom") {
          newHeight =
            position === "top-right" || position === "top-left"
              ? resizeStartSize.current.height + deltaY
              : resizeStartSize.current.height - deltaY;
        } else {
          switch (position) {
            case "bottom-right":
            case "bottom-left":
              newHeight = resizeStartSize.current.height - deltaY;
              break;
            case "top-right":
            case "top-left":
              newHeight = resizeStartSize.current.height + deltaY;
              break;
          }
        }
      }

      // Clamp to min/max bounds
      newWidth = Math.min(MAX_SIZE.width, Math.max(MIN_SIZE.width, newWidth));
      newHeight = Math.min(MAX_SIZE.height, Math.max(MIN_SIZE.height, newHeight));

      setPanelSize({ width: newWidth, height: newHeight });
    },
    [position]
  );

  handleResizeMoveRef.current = handleResizeMove;

  const handleResizeEnd = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleResizeMoveRef.current);
    document.removeEventListener("mouseup", handleResizeEndRef.current);
    document.removeEventListener("touchmove", handleResizeMoveRef.current);
    document.removeEventListener("touchend", handleResizeEndRef.current);
  }, []);

  handleResizeEndRef.current = handleResizeEnd;

  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, edge: ResizeEdge = "corner") => {
      e.preventDefault();
      isResizing.current = true;
      activeEdge.current = edge;

      const clientX = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
      const clientY = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;

      resizeStartPos.current = { x: clientX, y: clientY };
      resizeStartSize.current = { width: panelSize.width, height: panelSize.height };

      document.addEventListener("mousemove", handleResizeMoveRef.current);
      document.addEventListener("mouseup", handleResizeEndRef.current);
      document.addEventListener("touchmove", handleResizeMoveRef.current);
      document.addEventListener("touchend", handleResizeEndRef.current);
    },
    [panelSize.width, panelSize.height]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResizeMoveRef.current);
      document.removeEventListener("mouseup", handleResizeEndRef.current);
      document.removeEventListener("touchmove", handleResizeMoveRef.current);
      document.removeEventListener("touchend", handleResizeEndRef.current);
    };
  }, []);

  // Compute panel wrapper styles based on state
  const panelWrapperStyle: CSSProperties = isFullscreen
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
        border: "none",
        borderRadius: 0,
        boxShadow: "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        zIndex: 100000,
      }
    : {
        ...floatingStyles.panelWrapper,
        width: panelSize.width,
        height: panelSize.height,
      };

  const resizeHandleStyle: CSSProperties = {
    ...floatingStyles.resizeHandle,
    ...getResizeHandlePosition(position),
    cursor: getResizeCursor(position),
  };

  return (
    <div style={panelWrapperStyle} data-testid="devtools-panel-wrapper">
      <div style={floatingStyles.panelHeader}>
        <div style={floatingStyles.headerControls}>
          <button
            data-testid="devtools-floating-reset"
            style={floatingStyles.controlButton}
            onClick={handleReset}
            aria-label="Reset panel size"
            title="Reset size"
          >
            Reset
          </button>
          <button
            data-testid="devtools-floating-fullscreen"
            style={floatingStyles.controlButton}
            onClick={handleFullscreenToggle}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? "Exit" : "Full"}
          </button>
        </div>
        <button
          data-testid="devtools-floating-close"
          style={floatingStyles.closeButton}
          onClick={onClose}
          aria-label="Close DevTools"
        >
          X
        </button>
      </div>
      <div style={floatingStyles.panelContent}>
        {/* DevTools panel using plugin architecture */}
        <div data-testid="devtools-panel" style={panelStyles.container}>
          <div
            style={{
              ...panelStyles.header,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>HexDI DevTools</span>
            <ContainerSelector compact showKind />
          </div>
          <TabNavigation />
          <div style={panelStyles.content}>
            <PluginTabContent graph={exportedGraph} tracingAPI={tracingAPI} />
          </div>
        </div>
      </div>
      {/* Resize handles - only show when not fullscreen */}
      {!isFullscreen && (
        <>
          <div
            data-testid="devtools-resize-edge-top"
            style={floatingStyles.resizeEdgeTop}
            onMouseDown={e => handleResizeStart(e, "top")}
            onTouchStart={e => handleResizeStart(e, "top")}
            aria-label="Resize panel vertically"
          />
          <div
            data-testid="devtools-resize-edge-bottom"
            style={floatingStyles.resizeEdgeBottom}
            onMouseDown={e => handleResizeStart(e, "bottom")}
            onTouchStart={e => handleResizeStart(e, "bottom")}
            aria-label="Resize panel vertically"
          />
          <div
            data-testid="devtools-resize-edge-left"
            style={floatingStyles.resizeEdgeLeft}
            onMouseDown={e => handleResizeStart(e, "left")}
            onTouchStart={e => handleResizeStart(e, "left")}
            aria-label="Resize panel horizontally"
          />
          <div
            data-testid="devtools-resize-edge-right"
            style={floatingStyles.resizeEdgeRight}
            onMouseDown={e => handleResizeStart(e, "right")}
            onTouchStart={e => handleResizeStart(e, "right")}
            aria-label="Resize panel horizontally"
          />
          <div
            data-testid="devtools-resize-handle"
            style={resizeHandleStyle}
            onMouseDown={e => handleResizeStart(e, "corner")}
            onTouchStart={e => handleResizeStart(e, "corner")}
            aria-label="Resize panel"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
              style={{ opacity: 0.5 }}
            >
              <path d="M 0 10 L 10 0 L 10 10 Z" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * HexDiDevTools component - simplified API for DevTools.
 *
 * Renders a floating toggle button that expands to show the DevTools panel.
 * Automatically extracts the inspector from the container and creates the runtime.
 *
 * In production mode (when `process.env.NODE_ENV === 'production'`),
 * this component returns `null`.
 */
export function HexDiDevTools(props: HexDiDevToolsProps): ReactElement | null {
  // Production mode check - must be before any hooks
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return null;
  }

  return <HexDiDevToolsInner {...props} />;
}

/**
 * Inner component containing all hooks and logic.
 * Separated to avoid conditional hook calls in production check.
 */
function HexDiDevToolsInner({
  container,
  plugins,
  position = "bottom-right",
}: HexDiDevToolsProps): ReactElement {
  // Extract inspector from container via INSPECTOR symbol
  const inspector = useMemo(() => extractInspector(container), [container]);

  // Tracing API via property-based access
  // The container.tracer property provides TracingAPI
  const tracingAPI: TracingAPI | undefined = container.tracer;

  // Memoize plugins - DevToolsStoreProvider will use defaultPlugins() if not provided
  const pluginsToUse = useMemo(() => plugins ?? defaultPlugins(), [plugins]);

  // Get position-specific styles
  const positionStyles = getPositionStyles(position);

  // DevToolsStoreProvider handles both store and plugins context
  // No need for separate DevToolsRuntimeProvider
  return (
    <DevToolsStoreProvider inspector={inspector} plugins={pluginsToUse}>
      <DevToolsFloatingUI
        position={position}
        positionStyles={positionStyles}
        tracingAPI={tracingAPI}
      />
    </DevToolsStoreProvider>
  );
}

/**
 * Props for DevToolsFloatingUI component.
 */
interface DevToolsFloatingUIProps {
  readonly position: DevToolsPosition;
  readonly positionStyles: CSSProperties;
  readonly tracingAPI: TracingAPI | undefined;
}

/**
 * Floating UI component that uses Zustand store hooks.
 * Must be rendered inside DevToolsStoreProvider.
 */
function DevToolsFloatingUI({
  position,
  positionStyles,
  tracingAPI,
}: DevToolsFloatingUIProps): ReactElement {
  // Get store actions - select individually to maintain stable references
  const open = useDevToolsStore(state => state.open);
  const close = useDevToolsStore(state => state.close);
  const discover = useDevToolsStore(state => state.discover);

  // Get container tree state for discovery check
  const containerTreeFsmState = useDevToolsStore(state => state.containerTree.fsmState);

  // Track if discovery has been triggered to prevent duplicate calls
  const hasTriggeredDiscovery = useRef(false);

  // Local state for open/closed (with localStorage persistence)
  const [isOpen, setIsOpen] = useState(() => {
    return getStoredState(STORAGE_KEY, "false") === "true";
  });

  // Persist open state to localStorage
  useEffect(() => {
    setStoredState(STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  // Sync FSM state on mount if panel was opened from localStorage
  // Only run once on mount
  const hasOpenedRef = useRef(false);
  useEffect(() => {
    if (isOpen && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      open();
    }
  }, [isOpen, open]);

  // Trigger container discovery on mount (only once)
  useEffect(() => {
    if (containerTreeFsmState === "idle" && !hasTriggeredDiscovery.current) {
      hasTriggeredDiscovery.current = true;
      discover();
    }
  }, [containerTreeFsmState, discover]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    close();
  }, [close]);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => {
      const newValue = !prev;
      if (newValue) {
        open();
      } else {
        close();
      }
      return newValue;
    });
  }, [open, close]);

  return (
    <div
      data-testid="devtools-floating-container"
      style={{
        ...floatingStyles.container,
        ...positionStyles,
      }}
    >
      {isOpen ? (
        <DevToolsPanelContent position={position} onClose={handleClose} tracingAPI={tracingAPI} />
      ) : (
        <button
          data-testid="devtools-floating-toggle"
          style={floatingStyles.toggleButton}
          onClick={handleToggle}
          aria-label="Open HexDI DevTools"
        >
          <span style={floatingStyles.toggleIcon}>{"{ }"}</span>
        </button>
      )}
    </div>
  );
}
