/**
 * PanelPresenter - Pure presentation logic for main DevTools panel.
 *
 * Manages tab navigation, panel layout, and overall UI state.
 *
 * @packageDocumentation
 */

import type { PresenterDataSourceContract } from "@hex-di/devtools-core";
import type {
  PanelViewModel,
  TabId,
  TabViewModel,
  PanelSize,
  PanelPosition,
} from "../view-models/index.js";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_SIZE: PanelSize = { width: 400, height: 500 };
const MIN_SIZE: PanelSize = { width: 300, height: 300 };
const MAX_SIZE: PanelSize = { width: 1200, height: 900 };

// =============================================================================
// PanelPresenter
// =============================================================================

/**
 * Presenter for main DevTools panel.
 */
export class PanelPresenter {
  private activeTabId: TabId = "graph";
  private isOpen = false;
  private isFullscreen = false;
  private position: PanelPosition = "bottom-right";
  private size: PanelSize = { ...DEFAULT_SIZE };
  private isDarkMode = false;
  private appName = "Unknown";
  private appVersion = "0.0.0";
  private hexDIVersion = "0.0.0";

  constructor(private readonly dataSource: PresenterDataSourceContract) {}

  /**
   * Get the current panel view model.
   */
  getViewModel(): PanelViewModel {
    const tabs = this.buildTabs();

    return Object.freeze({
      tabs: Object.freeze(tabs),
      activeTabId: this.activeTabId,
      layout: Object.freeze({
        position: this.position,
        size: Object.freeze({ ...this.size }),
        isFullscreen: this.isFullscreen,
        isMinimized: !this.isOpen,
        isResizing: false,
      }),
      isOpen: this.isOpen,
      isEnabled: true,
      connection: Object.freeze({
        status: "disconnected" as const,
        serverUrl: null,
        errorMessage: null,
        latencyMs: null,
        lastPing: null,
      }),
      isDarkMode: this.isDarkMode,
      appName: this.appName,
      appVersion: this.appVersion,
      hexDIVersion: this.hexDIVersion,
    });
  }

  /**
   * Set active tab.
   */
  setActiveTab(tabId: TabId): void {
    this.activeTabId = tabId;
  }

  /**
   * Toggle panel open/closed.
   */
  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  /**
   * Open the panel.
   */
  open(): void {
    this.isOpen = true;
  }

  /**
   * Close the panel.
   */
  close(): void {
    this.isOpen = false;
  }

  /**
   * Toggle fullscreen mode.
   */
  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
  }

  /**
   * Set fullscreen mode.
   */
  setFullscreen(fullscreen: boolean): void {
    this.isFullscreen = fullscreen;
  }

  /**
   * Set panel position.
   */
  setPosition(position: PanelPosition): void {
    this.position = position;
  }

  /**
   * Set panel size.
   */
  setSize(size: PanelSize): void {
    this.size = {
      width: Math.max(MIN_SIZE.width, Math.min(MAX_SIZE.width, size.width)),
      height: Math.max(MIN_SIZE.height, Math.min(MAX_SIZE.height, size.height)),
    };
  }

  /**
   * Set dark mode.
   */
  setDarkMode(enabled: boolean): void {
    this.isDarkMode = enabled;
  }

  /**
   * Set app info.
   */
  setAppInfo(name: string, version: string): void {
    this.appName = name;
    this.appVersion = version;
  }

  /**
   * Set HexDI version.
   */
  setHexDIVersion(version: string): void {
    this.hexDIVersion = version;
  }

  /**
   * Build tab view models.
   */
  private buildTabs(): TabViewModel[] {
    const hasTracing = this.dataSource.hasTracing();
    const hasContainer = this.dataSource.hasContainer();
    const traces = hasTracing ? this.dataSource.getTraces() : [];
    const traceCount = traces.length;

    return [
      {
        id: "graph" as const,
        label: "Graph",
        icon: "graph",
        isActive: this.activeTabId === "graph",
        isEnabled: true,
        badgeCount: null,
        showBadge: false,
      },
      {
        id: "services" as const,
        label: "Services",
        icon: "services",
        isActive: this.activeTabId === "services",
        isEnabled: true,
        badgeCount: null,
        showBadge: false,
      },
      {
        id: "tracing" as const,
        label: "Tracing",
        icon: "timeline",
        isActive: this.activeTabId === "tracing",
        isEnabled: hasTracing,
        badgeCount: traceCount > 0 ? traceCount : null,
        showBadge: traceCount > 0,
      },
      {
        id: "inspector" as const,
        label: "Inspector",
        icon: "inspector",
        isActive: this.activeTabId === "inspector",
        isEnabled: hasContainer,
        badgeCount: null,
        showBadge: false,
      },
    ];
  }
}
