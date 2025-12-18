/**
 * TuiDevTools - Terminal UI DevTools component.
 *
 * This component wraps the shared DevToolsPanel with TUI-specific chrome
 * including keyboard shortcuts (q=quit, tab=switch, arrows=navigate) and
 * a header displaying the app ID.
 *
 * @packageDocumentation
 */

/// <reference path="./opentui.d.ts" />

import React from "react";
import type { PanelViewModel, TabId, ConnectionStatus } from "../view-models/panel.vm.js";
import { DevToolsPanel } from "../components/DevToolsPanel.js";
import { TUIPrimitives } from "./primitives.js";
import { PrimitivesProvider } from "../hooks/primitives-context.js";
import { TUISpan, TUIText } from "./opentui-elements.js";

// =============================================================================
// Props Interface
// =============================================================================

/**
 * Props for the TuiDevTools component.
 */
export interface TuiDevToolsProps {
  /** The panel view model containing all display state */
  readonly viewModel: PanelViewModel;
  /** Application ID being inspected */
  readonly appId: string;
  /** WebSocket URL for remote connection (optional) */
  readonly url?: string;
  /** Callback when a tab is selected */
  readonly onTabChange?: (tabId: TabId) => void;
  /** Callback when user presses Q to exit */
  readonly onExit?: () => void;
  /** Callback for navigation events */
  readonly onNavigate?: (direction: "up" | "down" | "left" | "right") => void;
  /** Content to render in the active tab (optional) */
  readonly children?: React.ReactNode;
}

// TUISpan and TUIText are imported from opentui-elements.js

/**
 * Get the appropriate color for connection status.
 */
function getConnectionStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return TUIPrimitives.styleSystem.getColor("success");
    case "connecting":
      return TUIPrimitives.styleSystem.getColor("warning");
    case "disconnected":
      return TUIPrimitives.styleSystem.getColor("muted");
    case "error":
      return TUIPrimitives.styleSystem.getColor("error");
  }
}

/**
 * Get display text for connection status.
 */
function getConnectionStatusText(status: ConnectionStatus, url: string | undefined): string {
  const displayUrl = url ?? "local";
  switch (status) {
    case "connected":
      return `● Connected: ${displayUrl}`;
    case "connecting":
      return `○ Connecting to ${displayUrl}...`;
    case "disconnected":
      return `○ Disconnected: ${displayUrl}`;
    case "error":
      return `✕ Connection failed: ${displayUrl}`;
  }
}

// =============================================================================
// TuiDevTools Component
// =============================================================================

/**
 * Terminal UI DevTools component with TUI-specific chrome.
 *
 * Provides keyboard navigation:
 * - `q`: Quit application
 * - `Tab`: Switch between tabs
 * - Arrow keys: Navigate within views
 *
 * @example
 * ```tsx
 * import { TuiDevTools } from '@hex-di/devtools/tui';
 * import { render } from '@opentui/core';
 *
 * render(
 *   <TuiDevTools
 *     viewModel={panelViewModel}
 *     appId="my-app"
 *     onExit={() => process.exit(0)}
 *   />
 * );
 * ```
 */
export function TuiDevTools({
  viewModel,
  appId,
  url,
  onTabChange,
  onExit,
  onNavigate,
  children,
}: TuiDevToolsProps): React.ReactElement {
  // Handle undefined callbacks for DevToolsPanel
  const handleTabChange = onTabChange ?? (() => {});
  const handleClose = onExit ?? (() => {});

  return (
    <PrimitivesProvider primitives={TUIPrimitives}>
      <box
        flexDirection="column"
        width="100%"
        height="100%"
        border
        borderStyle="rounded"
        title={` HexDI DevTools - ${appId} `}
        titleAlignment="center"
      >
        {/* Connection status indicator */}
        <box flexDirection="row" paddingLeft={1} paddingRight={1}>
          <TUIText>
            <TUISpan fg={getConnectionStatusColor(viewModel.connection.status)}>
              {getConnectionStatusText(viewModel.connection.status, url)}
            </TUISpan>
          </TUIText>
          {viewModel.connection.errorMessage !== null && (
            <TUIText>
              <TUISpan fg={TUIPrimitives.styleSystem.getColor("error")}>
                {` - ${viewModel.connection.errorMessage}`}
              </TUISpan>
            </TUIText>
          )}
        </box>

        {/* Main DevTools Panel */}
        <DevToolsPanel
          viewModel={viewModel}
          onTabChange={handleTabChange}
          onClose={handleClose}
        >
          {children}
        </DevToolsPanel>

        {/* Footer with keyboard shortcuts */}
        <box
          flexDirection="row"
          justifyContent="center"
          paddingTop={0}
          paddingBottom={0}
        >
          <TUIText>
            <TUISpan fg={TUIPrimitives.styleSystem.getColor("muted")}>
              [1-4] Select tab | [N]ext [P]rev tab | [Q] Quit
            </TUISpan>
          </TUIText>
        </box>
      </box>
    </PrimitivesProvider>
  );
}
