/**
 * Console Renderer component.
 *
 * Renders an array of ConsoleEntry objects as styled rows.
 * Supports different entry types (log, compilation-error, runtime-error,
 * timeout, status) with appropriate coloring and formatting.
 *
 * @see spec/playground/05-layout-and-panels.md Section 23.3
 */

import { useCallback } from "react";
import type {
  ConsoleEntry,
  SerializedValue,
  CompilationError,
  SerializedError,
} from "../sandbox/worker-protocol.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the ConsoleRenderer component. */
export interface ConsoleRendererProps {
  /** Entries to render. */
  readonly entries: readonly ConsoleEntry[];
  /** Callback when a file reference is clicked (e.g., from error stack). */
  readonly onNavigate?: (file: string, line: number, column: number) => void;
}

// ---------------------------------------------------------------------------
// Colors -- using CSS variables for dark mode compatibility
// ---------------------------------------------------------------------------

const LEVEL_COLORS: Record<string, string> = {
  log: "inherit",
  warn: "var(--hex-warning, #f59e0b)",
  error: "var(--hex-error, #ef4444)",
  info: "var(--hex-info, #3b82f6)",
  debug: "var(--hex-text-muted, #9b9bb0)",
};

const STATUS_COLORS: Record<string, string> = {
  info: "var(--hex-info, #3b82f6)",
  success: "var(--hex-success, #22c55e)",
  error: "var(--hex-error, #ef4444)",
};

// ---------------------------------------------------------------------------
// Value rendering
// ---------------------------------------------------------------------------

/**
 * Format a SerializedValue for display.
 */
function formatValue(val: SerializedValue): string {
  switch (val.type) {
    case "string":
      return val.value;
    case "number":
    case "boolean":
    case "null":
    case "undefined":
      return val.value;
    case "function":
      return val.value;
    case "symbol":
      return val.value;
    case "error":
      return val.value;
    case "array":
    case "object":
      return val.value;
    default:
      return String(val.value);
  }
}

/**
 * Format all args from a log entry into a single display string.
 */
function formatArgs(args: readonly SerializedValue[]): string {
  return args.map(formatValue).join(" ");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Renders a single log entry row. */
function LogEntryRow(props: {
  readonly entry: Extract<ConsoleEntry, { readonly type: "log" }>;
  readonly index: number;
}): React.ReactElement {
  const { entry, index } = props;
  const color = LEVEL_COLORS[entry.level] ?? "inherit";

  return (
    <div
      data-testid={`console-entry-log-${entry.level}`}
      style={{
        padding: "8px 14px",
        fontFamily: "var(--hex-font-mono, monospace)",
        fontSize: 13,
        color,
        borderBottom: "1px solid var(--hex-border, #e2e8f0)",
        borderLeft: entry.level !== "log" ? `3px solid ${color}` : "3px solid transparent",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        backgroundColor: index % 2 === 1 ? "var(--hex-bg-secondary, #f5f5f7)" : "transparent",
        display: "flex",
        gap: 10,
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          color: "var(--hex-text-muted, #9b9bb0)",
          fontSize: 11,
          minWidth: 72,
          flexShrink: 0,
          borderRight: "1px solid var(--hex-border, #e2e8f0)",
          paddingRight: 10,
        }}
      >
        {new Date(entry.timestamp).toLocaleTimeString()}
      </span>
      <span style={{ flex: 1 }}>{formatArgs(entry.args)}</span>
    </div>
  );
}

/** Renders a compilation error entry. */
function CompilationErrorRow(props: {
  readonly errors: readonly CompilationError[];
  readonly onNavigate?: (file: string, line: number, column: number) => void;
}): React.ReactElement {
  const { errors, onNavigate } = props;

  return (
    <div
      data-testid="console-entry-compilation-error"
      style={{
        padding: "8px 14px",
        fontFamily: "var(--hex-font-mono, monospace)",
        fontSize: 13,
        color: "var(--hex-error, #ef4444)",
        borderBottom: "1px solid var(--hex-border, #e2e8f0)",
        borderLeft: "3px solid var(--hex-error, #ef4444)",
        backgroundColor: "var(--hex-error-muted, rgba(239,68,68,0.12))",
      }}
    >
      {errors.map((err, i) => (
        <div key={i} style={{ marginBottom: 2 }}>
          <span
            data-testid={`compilation-error-location-${i}`}
            style={{
              cursor: onNavigate ? "pointer" : "default",
              textDecoration: onNavigate ? "underline" : "none",
            }}
            onClick={() => onNavigate?.(err.file, err.line, err.column)}
            onKeyDown={e => {
              if (e.key === "Enter") onNavigate?.(err.file, err.line, err.column);
            }}
            tabIndex={onNavigate ? 0 : -1}
            role={onNavigate ? "link" : undefined}
          >
            {err.file}:{err.line}:{err.column}
          </span>
          {" - "}
          {err.message}
        </div>
      ))}
    </div>
  );
}

/** Renders a runtime error entry. */
function RuntimeErrorRow(props: {
  readonly error: SerializedError;
  readonly onNavigate?: (file: string, line: number, column: number) => void;
}): React.ReactElement {
  const { error, onNavigate } = props;

  return (
    <div
      data-testid="console-entry-runtime-error"
      style={{
        padding: "8px 14px",
        fontFamily: "var(--hex-font-mono, monospace)",
        fontSize: 13,
        color: "var(--hex-error, #ef4444)",
        borderBottom: "1px solid var(--hex-border, #e2e8f0)",
        borderLeft: "3px solid var(--hex-error, #ef4444)",
        backgroundColor: "var(--hex-error-muted, rgba(239,68,68,0.12))",
      }}
    >
      <div style={{ fontWeight: "bold" }}>
        {error.name}: {error.message}
      </div>
      {error.stack !== undefined && <StackTrace stack={error.stack} onNavigate={onNavigate} />}
    </div>
  );
}

/** Renders a stack trace with clickable file references. */
function StackTrace(props: {
  readonly stack: string;
  readonly onNavigate?: (file: string, line: number, column: number) => void;
}): React.ReactElement {
  const { stack, onNavigate } = props;

  // Parse stack lines to find file references
  const lines = stack.split("\n");

  return (
    <div style={{ color: "var(--hex-text-muted, #9b9bb0)", marginTop: 2 }}>
      {lines.map((line, i) => {
        const match = /(?:at\s+.*?\(|at\s+)(?:file:\/\/\/)?([^:)]+):(\d+):(\d+)/.exec(line);
        if (match && onNavigate) {
          const file = match[1];
          const lineNum = parseInt(match[2], 10);
          const col = parseInt(match[3], 10);
          return (
            <div key={i}>
              <span
                data-testid={`stack-line-${i}`}
                style={{ cursor: "pointer", textDecoration: "underline" }}
                onClick={() => onNavigate(file, lineNum, col)}
                onKeyDown={e => {
                  if (e.key === "Enter") onNavigate(file, lineNum, col);
                }}
                tabIndex={0}
                role="link"
              >
                {line}
              </span>
            </div>
          );
        }
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}

/** Renders a timeout entry. */
function TimeoutRow(props: { readonly timeoutMs: number }): React.ReactElement {
  return (
    <div
      data-testid="console-entry-timeout"
      style={{
        padding: "8px 14px",
        fontFamily: "var(--hex-font-mono, monospace)",
        fontSize: 13,
        color: "var(--hex-error, #ef4444)",
        borderBottom: "1px solid var(--hex-border, #e2e8f0)",
        borderLeft: "3px solid var(--hex-error, #ef4444)",
        backgroundColor: "var(--hex-error-muted, rgba(239,68,68,0.12))",
        fontWeight: "bold",
      }}
    >
      Execution timed out after {props.timeoutMs}ms
    </div>
  );
}

/** Renders a status entry. */
function StatusRow(props: {
  readonly message: string;
  readonly variant: "info" | "success" | "error";
}): React.ReactElement {
  const color = STATUS_COLORS[props.variant] ?? "inherit";

  return (
    <div
      data-testid={`console-entry-status-${props.variant}`}
      style={{
        padding: "8px 14px",
        fontFamily: "var(--hex-font-mono, monospace)",
        fontSize: 13,
        color,
        borderBottom: "1px solid var(--hex-border, #e2e8f0)",
        borderLeft: `3px solid ${color}`,
        fontStyle: "italic",
      }}
    >
      {props.message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * ConsoleRenderer displays a list of ConsoleEntry objects as styled rows.
 *
 * Each entry type has distinct styling:
 * - log: colored by level (log=default, warn=amber, error=red, info=blue, debug=muted)
 * - compilation-error: red with clickable file paths
 * - runtime-error: red with stack trace, clickable file references
 * - timeout: red bold timeout message
 * - status: colored by variant (info=blue, success=green, error=red)
 */
export function ConsoleRenderer(props: ConsoleRendererProps): React.ReactElement {
  const { entries, onNavigate } = props;

  const renderEntry = useCallback(
    (entry: ConsoleEntry, index: number): React.ReactElement => {
      switch (entry.type) {
        case "log":
          return <LogEntryRow key={index} entry={entry} index={index} />;
        case "compilation-error":
          return <CompilationErrorRow key={index} errors={entry.errors} onNavigate={onNavigate} />;
        case "runtime-error":
          return <RuntimeErrorRow key={index} error={entry.error} onNavigate={onNavigate} />;
        case "timeout":
          return <TimeoutRow key={index} timeoutMs={entry.timeoutMs} />;
        case "status":
          return <StatusRow key={index} message={entry.message} variant={entry.variant} />;
      }
    },
    [onNavigate]
  );

  return (
    <div data-testid="console-renderer">{entries.map((entry, i) => renderEntry(entry, i))}</div>
  );
}
