/**
 * Embed Mode Layout
 *
 * Compact layout for iframe embedding. Hides file tree, example dropdown,
 * and share button. Shows Run button, theme toggle, and "Open in Playground"
 * link.
 *
 * Layout:
 * - Wide (>=600px): side-by-side editor | panel
 * - Narrow (<600px): tabbed (editor or panel)
 *
 * @see spec/playground/06-examples-and-sharing.md Section 29
 */

import { useState, useCallback, useRef, useMemo } from "react";
import { useResizeObserver, useTheme } from "@hex-di/devtools-ui";
import type { DevToolsPanel } from "@hex-di/devtools-ui";
import type { VirtualFS } from "../editor/virtual-fs.js";
import type { SandboxStatus } from "../context/sandbox-context.js";
import { encodeShareableState } from "../sharing/url-encoder.js";
import type { ShareableState } from "../sharing/types.js";
import { RunButton, ThemeToggle } from "../layout/toolbar.js";
import type { EmbedOptions } from "./embed-detector.js";

// =============================================================================
// Types
// =============================================================================

/** Props for the EmbedMode component. */
export interface EmbedModeProps {
  /** The editor pane content. */
  readonly editor: React.ReactNode;
  /** The visualization pane content. */
  readonly visualization: React.ReactNode;
  /** The console pane content. */
  readonly console: React.ReactNode;
  /** Current sandbox status. */
  readonly status: SandboxStatus;
  /** Callback to run code. */
  readonly onRun: () => void;
  /** The virtual filesystem (for "Open in Playground" link). */
  readonly virtualFS: VirtualFS;
  /** The currently active file. */
  readonly activeFile: string;
  /** Embed options parsed from query params. */
  readonly options: EmbedOptions;
}

// =============================================================================
// Constants
// =============================================================================

/** Breakpoint for side-by-side vs tabbed layout in embed mode. */
const EMBED_WIDE_BREAKPOINT = 600;

// =============================================================================
// Embed tab type
// =============================================================================

type EmbedTab = "editor" | "panel";

// =============================================================================
// OpenInPlaygroundLink
// =============================================================================

function OpenInPlaygroundLink(props: {
  readonly virtualFS: VirtualFS;
  readonly activeFile: string;
}): React.ReactElement {
  const { virtualFS, activeFile } = props;

  const playgroundUrl = useMemo(() => {
    const files = virtualFS.getAll();
    const state: ShareableState = {
      files: [...files.entries()],
      activeFile,
    };
    const result = encodeShareableState(state);
    if (!result.success) {
      return window.location.origin + window.location.pathname;
    }
    const base = window.location.origin + window.location.pathname;
    // Build a URL without the ?embed=true param
    return `${base}#${result.encoded}`;
  }, [virtualFS, activeFile]);

  return (
    <a
      data-testid="open-in-playground"
      href={playgroundUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        fontSize: 12,
        fontFamily: "sans-serif",
        color: "var(--hex-accent, #6366f1)",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      Open in Playground {"\u2197"}
    </a>
  );
}

// =============================================================================
// EmbedMode component
// =============================================================================

/**
 * Compact embed layout for iframe embedding.
 *
 * Features:
 * - Toolbar: Run button, theme toggle, "Open in Playground" link
 * - Wide (>=600px): side-by-side editor | panel
 * - Narrow (<600px): tabbed editor or panel
 * - Console: collapsed by default, toggleable
 */
export function EmbedMode(props: EmbedModeProps): React.ReactElement {
  const {
    editor,
    visualization,
    console: consolePaneContent,
    status,
    onRun,
    virtualFS,
    activeFile,
    options,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);

  const isWide = width >= EMBED_WIDE_BREAKPOINT;

  // Tab state for narrow mode
  const [activeTab, setActiveTab] = useState<EmbedTab>("editor");

  // Console visibility (per spec, collapsed by default in embed mode)
  const [showConsole, setShowConsole] = useState(options.console === "show");

  const toggleConsole = useCallback(() => {
    setShowConsole(prev => !prev);
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="embed-mode"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        fontFamily: "sans-serif",
      }}
    >
      {/* Embed toolbar */}
      <div
        data-testid="embed-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 8px",
          borderBottom: "1px solid var(--hex-border, #e2e8f0)",
          flexShrink: 0,
          minHeight: 34,
        }}
      >
        <RunButton status={status} onRun={onRun} />

        {/* Narrow mode tab switcher */}
        {!isWide && (
          <div style={{ display: "flex", gap: 2 }}>
            <button
              data-testid="embed-tab-editor"
              onClick={() => setActiveTab("editor")}
              style={{
                padding: "2px 8px",
                border: "1px solid var(--hex-border, #e2e8f0)",
                borderRadius: 4,
                background:
                  activeTab === "editor" ? "var(--hex-bg-secondary, #f1f5f9)" : "transparent",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
                color: "var(--hex-text-primary, #1e293b)",
              }}
            >
              Editor
            </button>
            <button
              data-testid="embed-tab-panel"
              onClick={() => setActiveTab("panel")}
              style={{
                padding: "2px 8px",
                border: "1px solid var(--hex-border, #e2e8f0)",
                borderRadius: 4,
                background:
                  activeTab === "panel" ? "var(--hex-bg-secondary, #f1f5f9)" : "transparent",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
                color: "var(--hex-text-primary, #1e293b)",
              }}
            >
              Panel
            </button>
          </div>
        )}

        {/* Console toggle */}
        <button
          data-testid="embed-console-toggle"
          onClick={toggleConsole}
          style={{
            padding: "2px 8px",
            border: "1px solid var(--hex-border, #e2e8f0)",
            borderRadius: 4,
            background: showConsole ? "var(--hex-bg-secondary, #f1f5f9)" : "transparent",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "inherit",
            color: "var(--hex-text-primary, #1e293b)",
          }}
        >
          Console
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        <ThemeToggle />

        <OpenInPlaygroundLink virtualFS={virtualFS} activeFile={activeFile} />
      </div>

      {/* Main content area */}
      <div
        data-testid="embed-content"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: isWide ? "row" : "column",
          overflow: "hidden",
        }}
      >
        {isWide ? (
          <>
            {/* Side-by-side: editor | panel */}
            <div style={{ flex: 1, overflow: "hidden" }}>{editor}</div>
            <div
              style={{
                width: 1,
                backgroundColor: "var(--hex-border, #e2e8f0)",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, overflow: "hidden" }}>{visualization}</div>
          </>
        ) : (
          <>
            {/* Tabbed: editor or panel */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              {activeTab === "editor" ? editor : visualization}
            </div>
          </>
        )}
      </div>

      {/* Console (collapsed by default) */}
      {showConsole && (
        <div
          data-testid="embed-console"
          style={{
            height: 150,
            borderTop: "1px solid var(--hex-border, #e2e8f0)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {consolePaneContent}
        </div>
      )}
    </div>
  );
}
