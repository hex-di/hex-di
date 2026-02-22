/**
 * Console Pane component.
 *
 * Provides a toolbar with clear button, level filter, entry count,
 * and auto-scroll indicator. Wraps ConsoleRenderer with a scrollable
 * container and a "Jump to bottom" button.
 *
 * @see spec/playground/05-layout-and-panels.md Section 23.4-23.5
 */

import { useState, useRef, useCallback, useMemo } from "react";
import { ConsoleRenderer } from "../console/console-renderer.js";
import type { ConsoleEntry } from "../sandbox/worker-protocol.js";
import { MAX_ENTRIES } from "../console/console-interceptor.js";
import { useAutoScroll } from "@hex-di/devtools-ui";
import { TrashIcon, ArrowDownIcon } from "./icons.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Console log levels that can be filtered. */
type ConsoleLevel = "log" | "warn" | "error" | "info" | "debug";

/** Props for the ConsolePane component. */
export interface ConsolePaneProps {
  /** All console entries. */
  readonly entries: readonly ConsoleEntry[];
  /** Callback to clear console entries. */
  readonly onClear: () => void;
  /** Callback when a file reference is clicked. */
  readonly onNavigate?: (file: string, line: number, column: number) => void;
}

// ---------------------------------------------------------------------------
// Level filter config
// ---------------------------------------------------------------------------

const ALL_LEVELS: readonly ConsoleLevel[] = ["log", "warn", "error", "info", "debug"];

const LEVEL_LABELS: Record<ConsoleLevel, string> = {
  log: "Log",
  warn: "Warn",
  error: "Error",
  info: "Info",
  debug: "Debug",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ConsolePane renders the console output area with toolbar, filters,
 * auto-scroll, and a jump-to-bottom button.
 */
export function ConsolePane(props: ConsolePaneProps): React.ReactElement {
  const { entries, onClear, onNavigate } = props;

  // Level filter state: all levels visible by default
  const [enabledLevels, setEnabledLevels] = useState<ReadonlySet<ConsoleLevel>>(
    () => new Set(ALL_LEVELS)
  );

  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null);
  const [isClearHovered, setIsClearHovered] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { isAutoScrolling, scrollToBottom } = useAutoScroll(scrollContainerRef);

  // Toggle a level filter
  const toggleLevel = useCallback((level: ConsoleLevel) => {
    setEnabledLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }, []);

  // Filter entries by level (only applies to log entries)
  const filteredEntries = useMemo(() => {
    // Enforce max entries limit
    const limited =
      entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries;

    return limited.filter(entry => {
      if (entry.type !== "log") return true;
      return enabledLevels.has(entry.level);
    });
  }, [entries, enabledLevels]);

  // Count entries by type for the toolbar
  const totalCount = entries.length;
  const filteredCount = filteredEntries.length;

  return (
    <div
      data-testid="console-pane"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "var(--hex-bg-primary, #ffffff)",
        position: "relative",
        borderTop: "1px solid var(--hex-border, #e2e8f0)",
      }}
    >
      {/* Toolbar */}
      <div
        data-testid="console-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderBottom: "1px solid var(--hex-border, #e2e8f0)",
          fontSize: 12,
          fontFamily: "var(--hex-font-sans, sans-serif)",
          flexShrink: 0,
          minHeight: 40,
          background: "var(--hex-bg-secondary, #f5f5f7)",
        }}
      >
        {/* Section label */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--hex-text-muted, #9b9bb0)",
            userSelect: "none",
            marginRight: 4,
          }}
        >
          Console
        </span>

        {/* Clear button */}
        <button
          data-testid="console-clear"
          onClick={onClear}
          onMouseEnter={() => setIsClearHovered(true)}
          onMouseLeave={() => setIsClearHovered(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            border: "1px solid var(--hex-border, #e2e8f0)",
            borderRadius: "var(--hex-radius-sm, 4px)",
            background: isClearHovered
              ? "var(--hex-bg-hover, #e8e8ec)"
              : "var(--hex-bg-primary, #ffffff)",
            cursor: "pointer",
            fontSize: 12,
            color: "var(--hex-text-secondary, #6b6b80)",
            padding: "4px 8px",
            transition: "var(--hex-transition-fast, 100ms ease)",
          }}
          title="Clear console"
        >
          <TrashIcon size={12} />
          Clear
        </button>

        {/* Level filter buttons */}
        <div data-testid="console-filters" style={{ display: "flex", gap: 6 }}>
          {ALL_LEVELS.map(level => {
            const isActive = enabledLevels.has(level);
            const isHovered = hoveredFilter === level;
            return (
              <button
                key={level}
                data-testid={`console-filter-${level}`}
                onClick={() => toggleLevel(level)}
                onMouseEnter={() => setHoveredFilter(level)}
                onMouseLeave={() => setHoveredFilter(null)}
                style={{
                  border: isActive
                    ? "1px solid var(--hex-accent, #6366f1)"
                    : "1px solid var(--hex-border, #e2e8f0)",
                  borderRadius: "var(--hex-radius-sm, 4px)",
                  background: isActive
                    ? "var(--hex-accent-muted, rgba(99,102,241,0.12))"
                    : isHovered
                      ? "var(--hex-bg-hover, #e8e8ec)"
                      : "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: "5px 12px",
                  color: isActive
                    ? "var(--hex-accent, #6366f1)"
                    : "var(--hex-text-secondary, #6b6b80)",
                  transition: "var(--hex-transition-fast, 100ms ease)",
                  fontWeight: isActive ? 500 : 400,
                }}
                title={`${isActive ? "Hide" : "Show"} ${level} entries`}
              >
                {LEVEL_LABELS[level]}
              </button>
            );
          })}
        </div>

        {/* Entry count */}
        <span
          data-testid="console-entry-count"
          style={{
            marginLeft: "auto",
            color: "var(--hex-text-muted, #9b9bb0)",
            fontSize: 11,
          }}
        >
          {filteredCount === totalCount
            ? `${totalCount} entries`
            : `${filteredCount} / ${totalCount} entries`}
        </span>

        {/* Auto-scroll indicator */}
        <span
          data-testid="console-autoscroll-indicator"
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: "var(--hex-radius-pill, 9999px)",
            background: isAutoScrolling
              ? "var(--hex-success-muted, rgba(34,197,94,0.12))"
              : "var(--hex-bg-tertiary, #ebebf0)",
            color: isAutoScrolling
              ? "var(--hex-success, #22c55e)"
              : "var(--hex-text-muted, #9b9bb0)",
            fontWeight: 500,
          }}
        >
          {isAutoScrolling ? "Auto-scroll ON" : "Auto-scroll OFF"}
        </span>
      </div>

      {/* Scrollable console output */}
      <div
        ref={scrollContainerRef}
        data-testid="console-output"
        style={{
          flex: 1,
          overflow: "auto",
          position: "relative",
        }}
      >
        <ConsoleRenderer entries={filteredEntries} onNavigate={onNavigate} />
      </div>

      {/* Jump to bottom button (shown when not auto-scrolling) */}
      {!isAutoScrolling && (
        <button
          data-testid="console-jump-to-bottom"
          onClick={scrollToBottom}
          style={{
            position: "absolute",
            bottom: 12,
            right: 16,
            display: "flex",
            alignItems: "center",
            gap: 4,
            border: "1px solid var(--hex-border, #e2e8f0)",
            borderRadius: "var(--hex-radius-pill, 9999px)",
            background: "var(--hex-bg-primary, #ffffff)",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 500,
            padding: "6px 14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            zIndex: 10,
            color: "var(--hex-text-primary, #1e293b)",
          }}
        >
          <ArrowDownIcon size={12} />
          Jump to bottom
        </button>
      )}
    </div>
  );
}
