/**
 * TabNavigation React component for DevTools panel.
 *
 * Provides a tabbed navigation interface for switching between
 * Graph, Services, Tracing, and Inspector views.
 *
 * @packageDocumentation
 */

import React, { useCallback, useRef, type ReactElement, type KeyboardEvent } from "react";
import type { CSSProperties } from "react";
import { tracingStyles as _tracingStyles } from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Tab identifiers for the DevTools panel.
 */
export type TabId = "graph" | "services" | "tracing" | "inspector";

/**
 * Configuration for a single tab.
 */
interface TabConfig {
  readonly id: TabId;
  readonly label: string;
}

/**
 * Props for the TabNavigation component.
 */
export interface TabNavigationProps {
  /** The currently active tab */
  readonly activeTab: TabId;
  /** Callback when a tab is selected */
  readonly onTabChange: (tabId: TabId) => void;
  /** Whether to show the Inspector tab (requires container) */
  readonly showInspector?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Tab configuration for the DevTools panel.
 */
const TAB_CONFIGS: readonly TabConfig[] = [
  { id: "graph", label: "Graph" },
  { id: "services", label: "Services" },
  { id: "tracing", label: "Tracing" },
  { id: "inspector", label: "Inspector" },
] as const;

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
 * - Four tabs: Graph, Services, Tracing, Inspector
 * - Keyboard navigation (Arrow keys, Home, End)
 * - ARIA-compliant tab pattern
 * - Visual indication of active tab
 *
 * @param props - The component props
 * @returns A React element containing the tab navigation
 *
 * @example
 * ```tsx
 * function DevTools() {
 *   const [activeTab, setActiveTab] = useState<TabId>('graph');
 *   return (
 *     <TabNavigation
 *       activeTab={activeTab}
 *       onTabChange={setActiveTab}
 *       showInspector={true}
 *     />
 *   );
 * }
 * ```
 */
export function TabNavigation({
  activeTab,
  onTabChange,
  showInspector = true,
}: TabNavigationProps): ReactElement {
  const [hoveredTab, setHoveredTab] = React.useState<TabId | null>(null);
  const tabRefs = useRef<Map<TabId, HTMLButtonElement | null>>(new Map());

  // Filter tabs based on showInspector prop
  const visibleTabs = showInspector
    ? TAB_CONFIGS
    : TAB_CONFIGS.filter(tab => tab.id !== "inspector");

  /**
   * Handle keyboard navigation between tabs.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentTabId: TabId) => {
      const currentIndex = visibleTabs.findIndex(tab => tab.id === currentTabId);
      let nextIndex: number | null = null;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          nextIndex = (currentIndex + 1) % visibleTabs.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          nextIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
          break;
        case "Home":
          event.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          event.preventDefault();
          nextIndex = visibleTabs.length - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          onTabChange(currentTabId);
          return;
        default:
          return;
      }

      if (nextIndex !== null) {
        const nextTab = visibleTabs[nextIndex];
        if (nextTab !== undefined) {
          const nextTabElement = tabRefs.current.get(nextTab.id);
          if (nextTabElement !== null && nextTabElement !== undefined) {
            nextTabElement.focus();
            onTabChange(nextTab.id);
          }
        }
      }
    },
    [visibleTabs, onTabChange]
  );

  /**
   * Set ref for a tab element.
   */
  const setTabRef = useCallback(
    (tabId: TabId) => (element: HTMLButtonElement | null) => {
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
      {visibleTabs.map(tab => {
        const isActive = activeTab === tab.id;
        const isHovered = hoveredTab === tab.id;
        const tabStyle: CSSProperties = {
          ...tabNavigationStyles.tab,
          ...(isActive ? tabNavigationStyles.tabActive : {}),
          ...(isHovered && !isActive
            ? {
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderColor: "var(--hex-devtools-border-hover, #565f89)",
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
            onClick={() => onTabChange(tab.id)}
            onKeyDown={e => handleKeyDown(e, tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
