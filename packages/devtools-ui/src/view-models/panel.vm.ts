/**
 * PanelViewModel - Immutable view data for the main DevTools panel.
 *
 * Contains tab navigation state, panel visibility, and layout configuration.
 * Coordinates the overall DevTools UI state.
 *
 * @packageDocumentation
 */

// =============================================================================
// Tab Types
// =============================================================================

/**
 * Available tabs in the DevTools panel.
 */
export type TabId = "graph" | "services" | "tracing" | "inspector";

/**
 * Tab configuration for display.
 */
export interface TabViewModel {
  /** Tab identifier */
  readonly id: TabId;
  /** Display label */
  readonly label: string;
  /** Icon identifier (for icon rendering) */
  readonly icon: string;
  /** Whether this tab is currently active */
  readonly isActive: boolean;
  /** Whether this tab is enabled */
  readonly isEnabled: boolean;
  /** Badge count (e.g., number of traces) */
  readonly badgeCount: number | null;
  /** Whether to show the badge */
  readonly showBadge: boolean;
}

// =============================================================================
// Panel Layout
// =============================================================================

/**
 * Panel position options.
 */
export type PanelPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

/**
 * Panel size configuration.
 */
export interface PanelSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Panel layout state.
 */
export interface PanelLayoutViewModel {
  /** Panel position */
  readonly position: PanelPosition;
  /** Panel size */
  readonly size: PanelSize;
  /** Whether panel is fullscreen */
  readonly isFullscreen: boolean;
  /** Whether panel is minimized (just toggle button) */
  readonly isMinimized: boolean;
  /** Whether resize handles are being dragged */
  readonly isResizing: boolean;
}

// =============================================================================
// Connection Status
// =============================================================================

/**
 * Connection status for remote DevTools.
 */
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Connection information.
 */
export interface ConnectionViewModel {
  /** Current connection status */
  readonly status: ConnectionStatus;
  /** Connected server URL (if connected) */
  readonly serverUrl: string | null;
  /** Error message (if error) */
  readonly errorMessage: string | null;
  /** Latency in milliseconds (if connected) */
  readonly latencyMs: number | null;
  /** Last ping time (formatted) */
  readonly lastPing: string | null;
}

// =============================================================================
// Panel View Model
// =============================================================================

/**
 * Complete view model for the DevTools panel.
 */
export interface PanelViewModel {
  /** Available tabs */
  readonly tabs: readonly TabViewModel[];
  /** Currently active tab ID */
  readonly activeTabId: TabId;
  /** Panel layout state */
  readonly layout: PanelLayoutViewModel;
  /** Whether the panel is open */
  readonly isOpen: boolean;
  /** Whether DevTools are enabled (not in production) */
  readonly isEnabled: boolean;
  /** Connection info (for remote mode) */
  readonly connection: ConnectionViewModel;
  /** Whether dark mode is enabled */
  readonly isDarkMode: boolean;
  /** App name being inspected */
  readonly appName: string;
  /** App version being inspected */
  readonly appVersion: string;
  /** HexDI version */
  readonly hexDIVersion: string;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates default tab view models.
 */
function createDefaultTabs(activeTabId: TabId): readonly TabViewModel[] {
  const tabs: TabViewModel[] = [
    {
      id: "graph",
      label: "Graph",
      icon: "graph",
      isActive: activeTabId === "graph",
      isEnabled: true,
      badgeCount: null,
      showBadge: false,
    },
    {
      id: "services",
      label: "Services",
      icon: "services",
      isActive: activeTabId === "services",
      isEnabled: true,
      badgeCount: null,
      showBadge: false,
    },
    {
      id: "tracing",
      label: "Tracing",
      icon: "timeline",
      isActive: activeTabId === "tracing",
      isEnabled: true,
      badgeCount: null,
      showBadge: false,
    },
    {
      id: "inspector",
      label: "Inspector",
      icon: "inspector",
      isActive: activeTabId === "inspector",
      isEnabled: true,
      badgeCount: null,
      showBadge: false,
    },
  ];
  return Object.freeze(tabs);
}

/**
 * Creates an empty PanelViewModel.
 */
export function createEmptyPanelViewModel(): PanelViewModel {
  return Object.freeze({
    tabs: createDefaultTabs("graph"),
    activeTabId: "graph" as const,
    layout: Object.freeze({
      position: "bottom-right" as const,
      size: Object.freeze({ width: 400, height: 500 }),
      isFullscreen: false,
      isMinimized: true,
      isResizing: false,
    }),
    isOpen: false,
    isEnabled: true,
    connection: Object.freeze({
      status: "disconnected" as const,
      serverUrl: null,
      errorMessage: null,
      latencyMs: null,
      lastPing: null,
    }),
    isDarkMode: false,
    appName: "Unknown",
    appVersion: "0.0.0",
    hexDIVersion: "0.0.0",
  });
}
