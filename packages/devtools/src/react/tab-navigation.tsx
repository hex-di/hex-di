/**
 * TabNavigation React component for DevTools panel.
 *
 * Provides a tabbed navigation interface for switching between
 * plugin tabs. Tabs are dynamically rendered from the plugin
 * list via the DevTools runtime.
 *
 * @packageDocumentation
 */

import React, { useCallback, useRef, type ReactElement, type KeyboardEvent } from "react";
import type { CSSProperties } from "react";
import { useTabList, useActiveTab, useDevToolsStore, type TabConfig } from "../store/index.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the TabNavigation component.
 *
 * With the plugin architecture, TabNavigation reads tabs from the runtime
 * and no longer requires props for tab configuration.
 *
 * Note: Empty object type is intentional - all state comes from runtime context.
 */
export type TabNavigationProps = Record<string, never>;

// =============================================================================
// Styles
// =============================================================================

/**
 * Styles for the tab navigation.
 */
const tabNavigationStyles: {
  readonly container: CSSProperties;
  readonly tab: CSSProperties;
  readonly tabActive: CSSProperties;
} = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: 10,
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    margin: "4px 8px 0 8px",
    padding: "6px 10px",
  },
  tab: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    minHeight: 38,
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: 12,
    cursor: "pointer",
    transition: "all 0.18s ease",
    outline: "none",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  tabActive: {
    color: "var(--hex-devtools-accent, #89b4fa)",
    backgroundColor: "rgba(137, 180, 250, 0.14)",
    border: "1px solid var(--hex-devtools-accent, #89b4fa)",
    boxShadow: "0 6px 18px rgba(137, 180, 250, 0.18)",
  },
};

// =============================================================================
// TabNavigation Component
// =============================================================================

/**
 * TabNavigation component for the DevTools panel.
 *
 * Features:
 * - Dynamic tabs from registered plugins
 * - Keyboard navigation (Arrow keys, Home, End)
 * - ARIA-compliant tab pattern
 * - Visual indication of active tab
 *
 * This component must be used within a DevToolsRuntimeProvider.
 * It reads tab configuration from the runtime's plugin list and
 * dispatches selectTab commands when tabs are clicked.
 *
 * @returns A React element containing the tab navigation
 *
 * @example
 * ```tsx
 * function DevToolsPanel() {
 *   return (
 *     <DevToolsRuntimeProvider runtime={runtime}>
 *       <TabNavigation />
 *       <PluginTabContent />
 *     </DevToolsRuntimeProvider>
 *   );
 * }
 * ```
 */
export function TabNavigation(_props: TabNavigationProps = {}): ReactElement {
  // Use store hooks instead of plugin-based hooks
  const selectTab = useDevToolsStore(state => state.selectTab);
  const tabs = useTabList();
  const activeTabId = useActiveTab();

  const [hoveredTab, setHoveredTab] = React.useState<string | null>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  /**
   * Handle tab selection - dispatches to store.
   */
  const handleTabSelect = useCallback(
    (tabId: string) => {
      selectTab(tabId);
    },
    [selectTab]
  );

  /**
   * Handle keyboard navigation between tabs.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentTabId: string) => {
      const currentIndex = tabs.findIndex(tab => tab.id === currentTabId);
      let nextIndex: number | null = null;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          event.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          event.preventDefault();
          nextIndex = tabs.length - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          handleTabSelect(currentTabId);
          return;
        default:
          return;
      }

      if (nextIndex !== null) {
        const nextTab = tabs[nextIndex];
        if (nextTab !== undefined) {
          const nextTabElement = tabRefs.current.get(nextTab.id);
          if (nextTabElement !== null && nextTabElement !== undefined) {
            nextTabElement.focus();
            handleTabSelect(nextTab.id);
          }
        }
      }
    },
    [tabs, handleTabSelect]
  );

  /**
   * Set ref for a tab element.
   */
  const setTabRef = useCallback(
    (tabId: string) => (element: HTMLButtonElement | null) => {
      tabRefs.current.set(tabId, element);
    },
    []
  );

  return (
    <div
      data-testid="tab-navigation"
      role="tablist"
      aria-label="DevTools panels"
      style={tabNavigationStyles.container}
    >
      {tabs.map((tab: TabConfig) => {
        const isActive = activeTabId === tab.id;
        const isHovered = hoveredTab === tab.id;
        const tabStyle: CSSProperties = {
          ...tabNavigationStyles.tab,
          ...(isActive ? tabNavigationStyles.tabActive : {}),
          ...(isHovered && !isActive
            ? {
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--hex-devtools-border-hover, #565f89)",
                boxShadow: "0 6px 18px rgba(86, 95, 137, 0.25)",
                color: "var(--hex-devtools-text, #cdd6f4)",
              }
            : {}),
        };

        return (
          <button
            key={tab.id}
            ref={setTabRef(tab.id)}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            style={tabStyle}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(prev => (prev === tab.id ? null : prev))}
            onClick={() => handleTabSelect(tab.id)}
            onKeyDown={e => handleKeyDown(e, tab.id)}
            type="button"
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
