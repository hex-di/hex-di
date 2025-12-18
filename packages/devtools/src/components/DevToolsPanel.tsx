/**
 * DevToolsPanel - Main container component for DevTools.
 *
 * This is a shared headless component that renders the main DevTools panel
 * with tab navigation. It uses primitives from usePrimitives() hook and
 * works in both DOM and TUI environments.
 *
 * @packageDocumentation
 */

import React from "react";
import { usePrimitives } from "../hooks/use-primitives.js";
import type { PanelViewModel, TabId, TabViewModel } from "../view-models/panel.vm.js";

// =============================================================================
// Props Interface
// =============================================================================

/**
 * Props for the DevToolsPanel component.
 */
export interface DevToolsPanelProps {
  /** The panel view model containing all display state */
  readonly viewModel: PanelViewModel;
  /** Callback when a tab is selected */
  readonly onTabChange?: (tabId: TabId) => void;
  /** Callback when close button is clicked */
  readonly onClose?: () => void;
  /** Callback when fullscreen is toggled */
  readonly onToggleFullscreen?: () => void;
  /** Content to render in the active tab (optional) */
  readonly children?: React.ReactNode;
}

// =============================================================================
// Tab Button Component
// =============================================================================

interface TabButtonProps {
  readonly tab: TabViewModel;
  readonly onClick: () => void;
}

function TabButton({ tab, onClick }: TabButtonProps): React.ReactElement {
  const { Box, Text, Icon } = usePrimitives();

  const pillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 10,
    border: `1px solid ${
      tab.isActive
        ? "var(--hex-devtools-primary, #89b4fa)"
        : "var(--hex-devtools-border, #45475a)"
    }`,
    backgroundColor: tab.isActive
      ? "rgba(137, 180, 250, 0.14)"
      : "rgba(255, 255, 255, 0.02)",
    color: tab.isActive
      ? "var(--hex-devtools-primary, #89b4fa)"
      : "var(--hex-devtools-text, #cdd6f4)",
    boxShadow: tab.isActive ? "0 6px 18px rgba(137, 180, 250, 0.18)" : "none",
    transition: "all 0.18s ease",
    minHeight: 38,
  };

  return (
    <Box
      flexDirection="row"
      data-testid={`tab-${tab.id}`}
      style={{ paddingBottom: 6 }}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        gap="sm"
        style={pillStyle}
        onClick={onClick}
      >
        <Icon name={tab.icon} size="sm" color={tab.isActive ? "primary" : "foreground"} />
        <Text
          variant="label"
          color={tab.isActive ? "primary" : "foreground"}
          bold
        >
          {tab.label}
        </Text>
        {tab.showBadge && tab.badgeCount !== null && (
          <Box
            style={{
              backgroundColor: "var(--hex-devtools-accent, #89b4fa)",
              borderRadius: 9999,
              minWidth: 22,
              height: 22,
              padding: "2px 6px",
              marginLeft: 6,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(137, 180, 250, 0.3)",
            }}
          >
            <Text variant="caption" color="background" bold>
              {tab.badgeCount}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// =============================================================================
// DevToolsPanel Component
// =============================================================================

/**
 * Main DevTools panel component with tab navigation.
 *
 * Renders a header with app info and tabs, plus a content area for the
 * active view. Uses primitives from usePrimitives() for platform-agnostic
 * rendering.
 *
 * @example
 * ```tsx
 * import { DevToolsPanel } from '@hex-di/devtools';
 * import { PrimitivesProvider } from '@hex-di/devtools';
 * import { DOMPrimitives } from '@hex-di/devtools/dom';
 *
 * function App() {
 *   const [viewModel, setViewModel] = useState(createEmptyPanelViewModel());
 *
 *   return (
 *     <PrimitivesProvider primitives={DOMPrimitives}>
 *       <DevToolsPanel
 *         viewModel={viewModel}
 *         onTabChange={(tabId) => console.log('Tab:', tabId)}
 *       />
 *     </PrimitivesProvider>
 *   );
 * }
 * ```
 */
export function DevToolsPanel({
  viewModel,
  onTabChange,
  onClose,
  onToggleFullscreen,
  children,
}: DevToolsPanelProps): React.ReactElement {
  const { Box, Text, Button, Icon, Divider } = usePrimitives();

  const handleTabClick = (tabId: TabId): void => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <Box flexDirection="column" height="100%" data-testid="devtools-panel">
      {/* Header */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        padding="md"
        gap="lg"
      >
        {/* App Info */}
        <Box flexDirection="row" alignItems="center" gap="sm">
          <Text variant="heading" color="foreground" bold>
            {viewModel.appName}
          </Text>
          <Text variant="caption" color="muted" bold>
            v{viewModel.appVersion}
          </Text>
        </Box>

        {/* Control Buttons */}
        <Box flexDirection="row" alignItems="center" gap="xs">
          {onToggleFullscreen && (
            <Button
              label=""
              onClick={onToggleFullscreen}
              variant="ghost"
              size="sm"
              data-testid="fullscreen-button"
            />
          )}
          {onClose && (
            <Button
              label=""
              onClick={onClose}
              variant="ghost"
              size="sm"
              data-testid="close-button"
            />
          )}
        </Box>
      </Box>

      <Divider orientation="horizontal" color="border" />

      {/* Tab Bar */}
      <Box
        flexDirection="row"
        alignItems="center"
        gap="xs"
        padding="xs"
        style={{
          backgroundColor: "var(--hex-devtools-bg-secondary, #24283b)",
          border: "1px solid var(--hex-devtools-border, #3b4261)",
          borderRadius: 10,
          margin: "0 4px",
        }}
      >
        {viewModel.tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            onClick={() => handleTabClick(tab.id)}
          />
        ))}
      </Box>

      <Divider orientation="horizontal" color="border" />

      {/* Content Area */}
      <Box flexDirection="column" flexGrow={1} padding="sm">
        {children}
      </Box>

      {/* Footer with connection status */}
      <Divider orientation="horizontal" color="border" />
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        padding="xs"
        paddingX="sm"
      >
        <Text variant="caption" color="muted">
          HexDI v{viewModel.hexDIVersion}
        </Text>
        <Box flexDirection="row" alignItems="center" gap="xs">
          <Icon
            name={viewModel.connection.status === "connected" ? "singleton" : "scoped"}
            size="sm"
            color={viewModel.connection.status === "connected" ? "success" : "error"}
          />
          <Text
            variant="caption"
            color={viewModel.connection.status === "connected" ? "success" : "muted"}
          >
            {viewModel.connection.status}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
