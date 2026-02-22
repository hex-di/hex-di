/**
 * Visualization Pane component.
 *
 * Renders a tab bar showing registered panels (ordered by panel.order),
 * an active panel wrapped in an ErrorBoundary, and appropriate empty
 * or loading states.
 *
 * @see spec/playground/05-layout-and-panels.md Section 22
 */

import { useState, useRef, useCallback, useMemo } from "react";
import {
  useDataSource,
  useTheme,
  useResizeObserver,
  ErrorBoundary,
  EmptyState,
} from "@hex-di/devtools-ui";
import type { DevToolsPanel, PanelProps } from "@hex-di/devtools-ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the VisualizationPane component. */
export interface VisualizationPaneProps {
  /** Registered panels, ordered by panel.order. */
  readonly panels: readonly DevToolsPanel[];
  /** Whether code is currently executing (show loading overlay). */
  readonly isExecuting?: boolean;
  /** Whether code has been run at least once. */
  readonly hasRun?: boolean;
}

// ---------------------------------------------------------------------------
// Session storage helpers
// ---------------------------------------------------------------------------

const SESSION_KEY = "hex-playground-active-panel";

function readActivePanel(): string | undefined {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ?? undefined;
  } catch {
    return undefined;
  }
}

function writeActivePanel(panelId: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, panelId);
  } catch {
    // Storage unavailable
  }
}

// ---------------------------------------------------------------------------
// PanelTabBar
// ---------------------------------------------------------------------------

/** Tab bar for selecting the active visualization panel. */
function PanelTabBar(props: {
  readonly panels: readonly DevToolsPanel[];
  readonly activePanel: string;
  readonly onSelectPanel: (panelId: string) => void;
}): React.ReactElement {
  const { panels, activePanel, onSelectPanel } = props;
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  return (
    <div
      data-testid="panel-tab-bar"
      role="tablist"
      style={{
        display: "flex",
        overflowX: "auto",
        borderBottom: "1px solid var(--hex-border, #e2e8f0)",
        minHeight: 40,
        fontSize: 13,
        fontFamily: "var(--hex-font-sans, sans-serif)",
        flexShrink: 0,
        background: "var(--hex-bg-secondary, #f5f5f7)",
      }}
    >
      {/* Section label */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 14px 8px 14px",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--hex-text-muted, #9b9bb0)",
          userSelect: "none",
          whiteSpace: "nowrap",
          borderRight: "1px solid var(--hex-border, #e2e8f0)",
        }}
      >
        Panels
      </span>
      {panels.map(panel => {
        const isActive = panel.id === activePanel;
        const isHovered = hoveredTab === panel.id;
        return (
          <button
            key={panel.id}
            data-testid={`panel-tab-${panel.id}`}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectPanel(panel.id)}
            onMouseEnter={() => setHoveredTab(panel.id)}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "8px 16px",
              cursor: "pointer",
              border: "none",
              borderBottom: isActive
                ? "2px solid var(--hex-accent, #6366f1)"
                : "2px solid transparent",
              backgroundColor: isActive
                ? "var(--hex-accent-muted, rgba(99,102,241,0.12))"
                : isHovered
                  ? "var(--hex-bg-hover, #e8e8ec)"
                  : "transparent",
              color: isActive
                ? "var(--hex-text-primary, #1e293b)"
                : "var(--hex-text-secondary, #64748b)",
              fontWeight: isActive ? 600 : 400,
              fontSize: 13,
              whiteSpace: "nowrap",
              fontFamily: "var(--hex-font-sans, sans-serif)",
              transition: "var(--hex-transition-fast, 100ms ease)",
            }}
          >
            {panel.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelHost
// ---------------------------------------------------------------------------

/** Renders the active panel with ErrorBoundary wrapping. */
function PanelHost(props: {
  readonly panel: DevToolsPanel | undefined;
  readonly panelProps: Omit<PanelProps, "dataSource"> & {
    readonly dataSource: PanelProps["dataSource"];
  };
  readonly isExecuting: boolean;
  readonly hasRun: boolean;
}): React.ReactElement {
  const { panel, panelProps, isExecuting, hasRun } = props;

  if (!panel) {
    return <EmptyState message="No panel selected" />;
  }

  if (!hasRun && !isExecuting) {
    return <EmptyState message="Run your code to see visualization results" />;
  }

  const PanelComponent = panel.component;

  return (
    <div
      data-testid={`panel-content-${panel.id}`}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <ErrorBoundary fallback={<PanelErrorFallback panelId={panel.id} />}>
        <PanelComponent
          dataSource={panelProps.dataSource}
          theme={panelProps.theme}
          width={panelProps.width}
          height={panelProps.height}
        />
      </ErrorBoundary>

      {/* Loading overlay -- uses two layers so text stays opaque */}
      {isExecuting && (
        <div
          data-testid="panel-loading-overlay"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {/* Background layer */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "var(--hex-bg-primary, #ffffff)",
              opacity: 0.5,
            }}
          />
          {/* Text layer */}
          <span
            style={{
              position: "relative",
              fontSize: 14,
              fontFamily: "var(--hex-font-sans, sans-serif)",
              color: "var(--hex-text-muted, #94a3b8)",
              fontWeight: 500,
            }}
          >
            Executing...
          </span>
        </div>
      )}
    </div>
  );
}

/** Fallback UI for panels that throw during render. */
function PanelErrorFallback(props: { readonly panelId: string }): React.ReactElement {
  return (
    <div
      data-testid={`panel-error-${props.panelId}`}
      style={{
        padding: 16,
        color: "var(--hex-error, #ef4444)",
        fontFamily: "var(--hex-font-sans, sans-serif)",
        fontSize: 13,
      }}
    >
      <strong>Panel Error</strong>
      <p>The {props.panelId} panel encountered an error while rendering.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * VisualizationPane renders a panel tab bar and the active panel content.
 *
 * Features:
 * - Tab bar with all registered panels ordered by panel.order
 * - Active panel persisted to sessionStorage
 * - ErrorBoundary per panel
 * - Empty state before first code run
 * - Loading overlay during execution
 */
export function VisualizationPane(props: VisualizationPaneProps): React.ReactElement {
  const { panels, isExecuting = false, hasRun = false } = props;

  const dataSource = useDataSource();
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(containerRef);

  // Active panel state with session persistence
  const [selectedPanel, setSelectedPanel] = useState<string>(() => {
    const persisted = readActivePanel();
    if (persisted !== undefined && panels.some(p => p.id === persisted)) {
      return persisted;
    }
    return panels.length > 0 ? panels[0].id : "";
  });

  // Sort panels by order
  const sortedPanels = useMemo(() => [...panels].sort((a, b) => a.order - b.order), [panels]);

  // Derive effective active panel: fall back to first if selected is invalid
  const activePanel = useMemo(() => {
    if (sortedPanels.some(p => p.id === selectedPanel)) {
      return selectedPanel;
    }
    return sortedPanels.length > 0 ? sortedPanels[0].id : "";
  }, [sortedPanels, selectedPanel]);

  const handleSelectPanel = useCallback((panelId: string) => {
    setSelectedPanel(panelId);
    writeActivePanel(panelId);
  }, []);

  const currentPanel = sortedPanels.find(p => p.id === activePanel);

  const panelProps: PanelProps = {
    dataSource,
    theme: theme.resolved,
    width,
    height,
  };

  return (
    <div
      data-testid="visualization-pane"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "var(--hex-bg-primary)",
      }}
    >
      <PanelTabBar
        panels={sortedPanels}
        activePanel={activePanel}
        onSelectPanel={handleSelectPanel}
      />

      <div
        ref={containerRef}
        data-testid="panel-container"
        style={{
          flex: 1,
          overflow: "auto",
          position: "relative",
          backgroundColor: "var(--hex-bg-primary)",
        }}
      >
        <PanelHost
          panel={currentPanel}
          panelProps={panelProps}
          isExecuting={isExecuting}
          hasRun={hasRun}
        />
      </div>
    </div>
  );
}
