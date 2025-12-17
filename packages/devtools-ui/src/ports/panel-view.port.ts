/**
 * PanelViewPort - Port definition for the main DevTools panel.
 *
 * Defines the contract that panel implementations must fulfill.
 * Coordinates tabs, layout, and overall DevTools UI.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import type { PanelViewModel, TabId, PanelSize } from "../view-models/index.js";

// =============================================================================
// Panel View Contract
// =============================================================================

/**
 * Contract for panel view implementations.
 */
export interface PanelViewContract {
  /**
   * Render the panel with the given view model.
   */
  render(viewModel: PanelViewModel): void;

  /**
   * Set handler for tab change.
   */
  onTabChange(handler: (tabId: TabId) => void): void;

  /**
   * Set handler for panel open/close toggle.
   */
  onToggle(handler: (isOpen: boolean) => void): void;

  /**
   * Set handler for fullscreen toggle.
   */
  onFullscreenToggle(handler: (isFullscreen: boolean) => void): void;

  /**
   * Set handler for panel resize.
   */
  onResize(handler: (size: PanelSize) => void): void;

  /**
   * Set handler for close button click.
   */
  onClose(handler: () => void): void;

  /**
   * Open the panel programmatically.
   */
  open(): void;

  /**
   * Close the panel programmatically.
   */
  close(): void;

  /**
   * Toggle fullscreen mode.
   */
  toggleFullscreen(): void;

  /**
   * Dispose resources.
   */
  dispose(): void;
}

// =============================================================================
// Port Definition
// =============================================================================

/**
 * Port for panel view implementations.
 */
export const PanelViewPort = createPort<"PanelView", PanelViewContract>("PanelView");

export type PanelView = PanelViewContract;
