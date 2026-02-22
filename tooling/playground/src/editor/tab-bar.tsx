/**
 * Tab Bar component for the playground editor.
 *
 * Shows all open files as tabs above the Monaco editor. Each tab displays
 * the file name with a tooltip for the full path, a modified indicator
 * (dot), and a close button.
 *
 * @see spec/playground/03-code-editor.md Section 14.3
 */

import { useState, useCallback } from "react";
import { CloseIcon } from "../layout/icons.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the TabBar component. */
export interface TabBarProps {
  /** Ordered list of open file paths (most recently opened last). */
  readonly openFiles: readonly string[];
  /** Currently active (displayed in editor) file path. */
  readonly activeFile: string;
  /** Set of file paths with unsaved modifications. */
  readonly modifiedFiles: ReadonlySet<string>;
  /** Callback when a tab is clicked. */
  readonly onSelect: (path: string) => void;
  /** Callback when a tab's close button is clicked. */
  readonly onClose: (path: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts the file name from a path. */
function fileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * TabBar displays open files as tabs with close buttons.
 *
 * - Active tab is visually highlighted
 * - Modified files show a dot indicator
 * - Close button removes the tab (closing the last tab opens main.ts)
 * - Tab order matches the order files were opened
 */
export function TabBar(props: TabBarProps): React.ReactElement {
  const { openFiles, activeFile, modifiedFiles, onSelect, onClose } = props;
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [hoveredClose, setHoveredClose] = useState<string | null>(null);

  const handleClose = useCallback(
    (path: string, event: React.MouseEvent) => {
      event.stopPropagation();
      onClose(path);
    },
    [onClose]
  );

  return (
    <div
      data-testid="tab-bar"
      role="tablist"
      style={{
        display: "flex",
        overflowX: "auto",
        borderBottom: "1px solid var(--hex-border, #e2e8f0)",
        minHeight: 40,
        fontSize: 13,
        fontFamily: "var(--hex-font-sans, sans-serif)",
        flexShrink: 0,
      }}
    >
      {openFiles.map(path => {
        const isActive = path === activeFile;
        const isModified = modifiedFiles.has(path);
        const isHovered = hoveredTab === path;

        return (
          <div
            key={path}
            data-testid={`tab-${path}`}
            role="tab"
            aria-selected={isActive}
            title={path}
            onMouseEnter={() => setHoveredTab(path)}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              cursor: "pointer",
              borderBottom: isActive
                ? "2px solid var(--hex-accent, #6366f1)"
                : "2px solid transparent",
              backgroundColor: isActive
                ? "var(--hex-accent-muted, rgba(99,102,241,0.12))"
                : isHovered
                  ? "var(--hex-bg-hover, #e8e8ec)"
                  : "transparent",
              whiteSpace: "nowrap",
              userSelect: "none",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              transition: "var(--hex-transition-fast, 100ms ease)",
              color: isActive
                ? "var(--hex-text-primary, #1e293b)"
                : "var(--hex-text-secondary, #6b6b80)",
            }}
            onClick={() => onSelect(path)}
            onKeyDown={e => {
              if (e.key === "Enter") onSelect(path);
            }}
            tabIndex={0}
          >
            <span>
              {fileName(path)}
              {isModified && (
                <span
                  data-testid={`tab-modified-${path}`}
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "var(--hex-warning, #f59e0b)",
                    marginLeft: 4,
                    verticalAlign: "middle",
                  }}
                  aria-label="modified"
                />
              )}
            </span>
            <button
              data-testid={`tab-close-${path}`}
              aria-label={`Close ${fileName(path)}`}
              onClick={e => handleClose(path, e)}
              onMouseEnter={() => setHoveredClose(path)}
              onMouseLeave={() => setHoveredClose(null)}
              style={{
                border: "none",
                background: hoveredClose === path ? "var(--hex-bg-hover, #e8e8ec)" : "transparent",
                cursor: "pointer",
                lineHeight: 1,
                padding: "2px",
                color: "var(--hex-text-muted, #9b9bb0)",
                borderRadius: "var(--hex-radius-sm, 4px)",
                display: "flex",
                alignItems: "center",
                transition: "var(--hex-transition-fast, 100ms ease)",
              }}
            >
              <CloseIcon size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
