/**
 * usePanel - Hook for panel state and actions.
 *
 * Provides access to panel view model and panel-related actions.
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import { useDevToolsContext } from "../context/devtools-context.js";
import type { PanelViewModel, TabId, PanelPosition, PanelSize } from "@hex-di/devtools-ui";

/**
 * Panel hook return type.
 */
export interface UsePanelResult {
  /**
   * The panel view model, or null if not available.
   */
  readonly viewModel: PanelViewModel | null;

  /**
   * Active tab ID.
   */
  readonly activeTab: TabId;

  /**
   * Whether the panel is open.
   */
  readonly isOpen: boolean;

  /**
   * Whether fullscreen mode is enabled.
   */
  readonly isFullscreen: boolean;

  /**
   * Panel position.
   */
  readonly position: PanelPosition;

  /**
   * Panel size.
   */
  readonly size: PanelSize;

  /**
   * Whether dark mode is enabled.
   */
  readonly isDarkMode: boolean;

  /**
   * Set the active tab.
   */
  setActiveTab(tabId: TabId): void;

  /**
   * Toggle panel open/closed.
   */
  togglePanel(): void;

  /**
   * Set panel open state.
   */
  setPanelOpen(isOpen: boolean): void;

  /**
   * Toggle fullscreen mode.
   */
  toggleFullscreen(): void;

  /**
   * Set panel position.
   */
  setPosition(position: PanelPosition): void;

  /**
   * Set panel size.
   */
  setSize(size: PanelSize): void;
}

/**
 * Hook to access panel state and actions.
 *
 * @example
 * ```tsx
 * function PanelHeader() {
 *   const { activeTab, setActiveTab, isFullscreen, toggleFullscreen } = usePanel();
 *
 *   return (
 *     <div>
 *       <button onClick={() => setActiveTab('graph')}>Graph</button>
 *       <button onClick={() => setActiveTab('services')}>Services</button>
 *       <button onClick={toggleFullscreen}>
 *         {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePanel(): UsePanelResult {
  const context = useDevToolsContext();

  const result = useMemo((): UsePanelResult => ({
    viewModel: context.viewModels.panel,
    activeTab: context.state.panel.activeTabId,
    isOpen: context.state.panel.isOpen,
    isFullscreen: context.state.panel.isFullscreen,
    position: context.state.panel.position,
    size: context.state.panel.size,
    isDarkMode: context.state.panel.isDarkMode,
    setActiveTab: context.setActiveTab,
    togglePanel: context.togglePanel,
    setPanelOpen: context.setPanelOpen,
    toggleFullscreen: context.toggleFullscreen,
    setPosition: context.setPanelPosition,
    setSize: context.setPanelSize,
  }), [
    context.viewModels.panel,
    context.state.panel.activeTabId,
    context.state.panel.isOpen,
    context.state.panel.isFullscreen,
    context.state.panel.position,
    context.state.panel.size,
    context.state.panel.isDarkMode,
    context.setActiveTab,
    context.togglePanel,
    context.setPanelOpen,
    context.toggleFullscreen,
    context.setPanelPosition,
    context.setPanelSize,
  ]);

  return result;
}
