/**
 * Playground Layout component.
 *
 * Provides the three-pane layout (editor, visualization, console) with
 * resizable splitters and responsive breakpoints.
 *
 * Layout modes:
 * - Full (>=1200px): editor + visualization side-by-side, console below
 * - Stacked (800-1199px): editor, visualization, console stacked vertically
 * - Mobile (<800px): single-pane with tab switching
 *
 * @see spec/playground/05-layout-and-panels.md Section 20, 25
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useResizeObserver } from "@hex-di/devtools-ui";
import { ResizableSplit } from "./resizable-split.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Layout mode based on viewport width. */
type LayoutMode = "full" | "stacked" | "mobile";

/** Mobile tab names. */
type MobileTab = "editor" | "panels" | "console";

/** Props for the PlaygroundLayout component. */
export interface PlaygroundLayoutProps {
  /** Editor pane content. */
  readonly editor: React.ReactNode;
  /** Visualization pane content. */
  readonly visualization: React.ReactNode;
  /** Console pane content. */
  readonly console: React.ReactNode;
  /** Optional toolbar content rendered above the layout. */
  readonly toolbar?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERSIST_KEY = "hex-playground-layout";

// Breakpoints
const FULL_BREAKPOINT = 1200;
const STACKED_BREAKPOINT = 800;

// ---------------------------------------------------------------------------
// Layout mode detection
// ---------------------------------------------------------------------------

function getLayoutMode(width: number): LayoutMode {
  if (width >= FULL_BREAKPOINT) return "full";
  if (width >= STACKED_BREAKPOINT) return "stacked";
  return "mobile";
}

// ---------------------------------------------------------------------------
// Mobile tab bar
// ---------------------------------------------------------------------------

function MobileTabBar(props: {
  readonly activeTab: MobileTab;
  readonly onSelectTab: (tab: MobileTab) => void;
}): React.ReactElement {
  const { activeTab, onSelectTab } = props;
  const [hoveredTab, setHoveredTab] = useState<MobileTab | null>(null);
  const tabs: readonly { readonly id: MobileTab; readonly label: string }[] = [
    { id: "editor", label: "Editor" },
    { id: "panels", label: "Panels" },
    { id: "console", label: "Console" },
  ];

  return (
    <div
      data-testid="mobile-tab-bar"
      role="tablist"
      style={{
        display: "flex",
        borderBottom: "1px solid var(--hex-border, #e2e8f0)",
        fontSize: 14,
        fontFamily: "var(--hex-font-sans, sans-serif)",
        flexShrink: 0,
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        const isHovered = hoveredTab === tab.id;
        return (
          <button
            key={tab.id}
            data-testid={`mobile-tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectTab(tab.id)}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              flex: 1,
              padding: "10px 16px",
              cursor: "pointer",
              border: "none",
              borderBottom: isActive
                ? "2px solid var(--hex-accent, #6366f1)"
                : "2px solid transparent",
              backgroundColor: isActive
                ? "var(--hex-bg-secondary, #f1f5f9)"
                : isHovered
                  ? "var(--hex-bg-hover, #e8e8ec)"
                  : "transparent",
              color: isActive
                ? "var(--hex-text-primary, #1e293b)"
                : "var(--hex-text-secondary, #64748b)",
              fontFamily: "var(--hex-font-sans, sans-serif)",
              fontSize: 14,
              fontWeight: 500,
              transition: "var(--hex-transition-fast, 100ms ease)",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full layout (>=1200px)
// ---------------------------------------------------------------------------

function FullLayout(props: {
  readonly editor: React.ReactNode;
  readonly visualization: React.ReactNode;
  readonly console: React.ReactNode;
}): React.ReactElement {
  return (
    <ResizableSplit
      direction="vertical"
      initialRatio={0.75}
      minFirst={200}
      minSecond={100}
      persistKey={`${PERSIST_KEY}-main-console`}
      first={
        <ResizableSplit
          direction="horizontal"
          initialRatio={0.5}
          minFirst={300}
          minSecond={300}
          persistKey={`${PERSIST_KEY}-editor-viz`}
          first={props.editor}
          second={props.visualization}
        />
      }
      second={props.console}
    />
  );
}

// ---------------------------------------------------------------------------
// Stacked layout (800-1199px)
// ---------------------------------------------------------------------------

function StackedLayout(props: {
  readonly editor: React.ReactNode;
  readonly visualization: React.ReactNode;
  readonly console: React.ReactNode;
}): React.ReactElement {
  return (
    <ResizableSplit
      direction="vertical"
      initialRatio={0.7}
      minFirst={200}
      minSecond={100}
      persistKey={`${PERSIST_KEY}-stacked-main`}
      first={
        <ResizableSplit
          direction="vertical"
          initialRatio={0.5}
          minFirst={150}
          minSecond={150}
          persistKey={`${PERSIST_KEY}-stacked-editor-viz`}
          first={props.editor}
          second={props.visualization}
        />
      }
      second={props.console}
    />
  );
}

// ---------------------------------------------------------------------------
// Mobile layout (<800px)
// ---------------------------------------------------------------------------

function MobileLayout(props: {
  readonly editor: React.ReactNode;
  readonly visualization: React.ReactNode;
  readonly console: React.ReactNode;
}): React.ReactElement {
  const [activeTab, setActiveTab] = useState<MobileTab>("editor");

  return (
    <div
      data-testid="mobile-layout"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <MobileTabBar activeTab={activeTab} onSelectTab={setActiveTab} />
      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "editor" && props.editor}
        {activeTab === "panels" && props.visualization}
        {activeTab === "console" && props.console}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * PlaygroundLayout renders the three-pane layout with responsive breakpoints.
 *
 * - Full (>=1200px): editor + visualization side-by-side, console below
 * - Stacked (800-1199px): all panes stacked vertically with resizable splitters
 * - Mobile (<800px): single-pane with tab switching (Editor / Panels / Console)
 *
 * Split ratios are persisted to localStorage under `hex-playground-layout`.
 */
export function PlaygroundLayout(props: PlaygroundLayoutProps): React.ReactElement {
  const { editor, visualization, console: consolePaneContent, toolbar } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  // Use a state-based approach for layout mode to avoid flicker
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("full");

  useEffect(() => {
    if (width > 0) {
      setLayoutMode(getLayoutMode(width));
    }
  }, [width]);

  const renderLayout = useCallback((): React.ReactElement => {
    switch (layoutMode) {
      case "full":
        return (
          <FullLayout editor={editor} visualization={visualization} console={consolePaneContent} />
        );
      case "stacked":
        return (
          <StackedLayout
            editor={editor}
            visualization={visualization}
            console={consolePaneContent}
          />
        );
      case "mobile":
        return (
          <MobileLayout
            editor={editor}
            visualization={visualization}
            console={consolePaneContent}
          />
        );
    }
  }, [layoutMode, editor, visualization, consolePaneContent]);

  return (
    <div
      ref={containerRef}
      data-testid="playground-layout"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Toolbar (rendered above the layout) */}
      {toolbar !== undefined && (
        <div data-testid="playground-toolbar" style={{ flexShrink: 0 }}>
          {toolbar}
        </div>
      )}

      {/* Main layout area */}
      <div
        data-testid="playground-main"
        style={{
          flex: 1,
          overflow: "hidden",
        }}
      >
        {renderLayout()}
      </div>
    </div>
  );
}
