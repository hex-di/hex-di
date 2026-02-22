/**
 * GraphToolbar — layout toggle, filter, analysis, export, zoom controls.
 *
 * @packageDocumentation
 */

import { useCallback, useState } from "react";
import type { GraphExportFormat } from "../types.js";

interface GraphToolbarProps {
  readonly layoutDirection: "TB" | "LR";
  readonly activeFilterCount: number;
  readonly analysisSidebarOpen: boolean;
  readonly minimapVisible: boolean;
  readonly onToggleLayout: () => void;
  readonly onToggleFilter: () => void;
  readonly onToggleAnalysis: () => void;
  readonly onToggleMinimap: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFitView: () => void;
  readonly onExport: (format: GraphExportFormat) => void;
  readonly onCopyLink: () => void;
}

const buttonStyle: React.CSSProperties = {
  padding: "var(--hex-space-xs) var(--hex-space-sm)",
  border: "1px solid var(--hex-border)",
  borderRadius: "var(--hex-radius-sm)",
  backgroundColor: "var(--hex-bg-secondary)",
  color: "var(--hex-text-primary)",
  cursor: "pointer",
  fontFamily: "var(--hex-font-sans)",
  fontSize: "var(--hex-font-size-sm)",
  position: "relative" as const,
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: "var(--hex-accent)",
  color: "var(--hex-accent)",
};

function GraphToolbar({
  layoutDirection,
  activeFilterCount,
  analysisSidebarOpen,
  minimapVisible,
  onToggleLayout,
  onToggleFilter,
  onToggleAnalysis,
  onToggleMinimap,
  onZoomIn,
  onZoomOut,
  onFitView,
  onExport,
  onCopyLink,
}: GraphToolbarProps): React.ReactElement {
  const [exportOpen, setExportOpen] = useState(false);

  const handleExport = useCallback(
    (format: GraphExportFormat) => {
      onExport(format);
      setExportOpen(false);
    },
    [onExport]
  );

  return (
    <div
      data-testid="graph-toolbar"
      style={{
        display: "flex",
        gap: "var(--hex-space-xs)",
        padding: "var(--hex-space-xs) var(--hex-space-sm)",
        backgroundColor: "var(--hex-bg-secondary)",
        borderBottom: "1px solid var(--hex-border)",
        alignItems: "center",
        flexWrap: "wrap",
      }}
      role="toolbar"
      aria-label="Graph toolbar"
    >
      {/* Layout direction toggle */}
      <button
        onClick={onToggleLayout}
        style={buttonStyle}
        aria-label={`Layout direction: ${layoutDirection === "TB" ? "top to bottom" : "left to right"}`}
      >
        {layoutDirection === "TB" ? "\u2193 TB" : "\u2192 LR"}
      </button>

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 20,
          backgroundColor: "var(--hex-border)",
        }}
      />

      {/* Filter */}
      <button
        onClick={onToggleFilter}
        style={activeFilterCount > 0 ? activeButtonStyle : buttonStyle}
        aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
      >
        Filter
        {activeFilterCount > 0 && (
          <span
            style={{
              marginLeft: 4,
              backgroundColor: "var(--hex-accent)",
              color: "var(--hex-text-inverse)",
              borderRadius: 8,
              padding: "0 5px",
              fontSize: "10px",
              fontWeight: "bold",
            }}
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Analysis */}
      <button
        onClick={onToggleAnalysis}
        style={analysisSidebarOpen ? activeButtonStyle : buttonStyle}
        aria-label="Toggle analysis sidebar"
      >
        Analysis
      </button>

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 20,
          backgroundColor: "var(--hex-border)",
        }}
      />

      {/* Zoom controls */}
      <button onClick={onZoomIn} style={buttonStyle} aria-label="Zoom in">
        +
      </button>
      <button onClick={onZoomOut} style={buttonStyle} aria-label="Zoom out">
        -
      </button>
      <button onClick={onFitView} style={buttonStyle} aria-label="Fit to view">
        Fit
      </button>

      {/* Minimap toggle */}
      <button
        onClick={onToggleMinimap}
        style={minimapVisible ? activeButtonStyle : buttonStyle}
        aria-label="Toggle minimap"
      >
        Map
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Export dropdown */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setExportOpen(!exportOpen)}
          style={buttonStyle}
          aria-label="Export graph"
          aria-expanded={exportOpen}
        >
          Export
        </button>
        {exportOpen && (
          <div
            data-testid="export-dropdown"
            style={{
              position: "absolute",
              right: 0,
              top: "100%",
              marginTop: 4,
              backgroundColor: "var(--hex-bg-secondary)",
              border: "1px solid var(--hex-border)",
              borderRadius: "var(--hex-radius-sm)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              zIndex: 200,
              minWidth: 140,
            }}
            role="menu"
          >
            {(
              [
                ["dot", "DOT (Graphviz)"],
                ["mermaid", "Mermaid"],
                ["svg", "SVG"],
                ["png", "PNG"],
                ["json", "JSON"],
                ["structured-logs", "Structured Logs"],
              ] as const
            ).map(([format, label]) => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "var(--hex-space-xs) var(--hex-space-sm)",
                  border: "none",
                  backgroundColor: "transparent",
                  color: "var(--hex-text-primary)",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "var(--hex-font-sans)",
                  fontSize: "var(--hex-font-size-sm)",
                }}
                role="menuitem"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Copy Link */}
      <button onClick={onCopyLink} style={buttonStyle} aria-label="Copy link">
        Copy Link
      </button>
    </div>
  );
}

export { GraphToolbar };
export type { GraphToolbarProps };
