/**
 * DecisionLogEntry — Single row in the guard decision log table.
 *
 * Displays execution ID, timestamp, port, subject, decision badge,
 * root policy kind, and duration for a single evaluation execution.
 *
 * Spec: 05-decision-log.md (5.3)
 *
 * @packageDocumentation
 */

import { formatGuardDuration, getDecisionColor, getPolicyKindIcon } from "./visual-encoding.js";
import type { GuardEvaluationExecution } from "./types.js";

// ── Props ───────────────────────────────────────────────────────────────────

interface DecisionLogEntryProps {
  readonly execution: GuardEvaluationExecution;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const millis = String(date.getMilliseconds()).padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${millis}`;
}

function truncateId(id: string, maxLen: number): string {
  if (id.length <= maxLen) return id;
  return id.slice(0, maxLen) + "\u2026";
}

// ── Component ───────────────────────────────────────────────────────────────

function DecisionLogEntry({
  execution,
  selected,
  onSelect,
}: DecisionLogEntryProps): React.ReactElement {
  const decisionColor = getDecisionColor(execution.decision);
  const kindIcon = getPolicyKindIcon(execution.rootTrace.kind);
  const duration = formatGuardDuration(execution.durationMs);

  return (
    <div
      data-testid="guard-decision-log-entry"
      data-execution-id={execution.executionId}
      data-decision={execution.decision}
      data-selected={selected ? "true" : "false"}
      role="row"
      onClick={onSelect}
      style={{
        display: "grid",
        gridTemplateColumns: "80px 100px 1fr 1fr 70px 100px 70px",
        gap: "var(--hex-space-xs, 4px)",
        alignItems: "center",
        padding: "var(--hex-space-xs, 4px) var(--hex-space-md, 12px)",
        borderBottom: "1px solid var(--hex-border-subtle, #32324a)",
        backgroundColor: selected ? "var(--hex-bg-active, #2d2d50)" : "transparent",
        cursor: "pointer",
        fontSize: "var(--hex-font-size-sm, 12px)",
      }}
    >
      {/* Execution ID */}
      <span
        data-testid="guard-log-cell-id"
        style={{
          fontFamily: "var(--hex-font-mono, monospace)",
          fontSize: "var(--hex-font-size-xs, 11px)",
          color: "var(--hex-text-muted, #6b6b80)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {truncateId(execution.executionId, 8)}
      </span>

      {/* Timestamp */}
      <span
        data-testid="guard-log-cell-timestamp"
        style={{
          fontFamily: "var(--hex-font-mono, monospace)",
          fontSize: "var(--hex-font-size-xs, 11px)",
          color: "var(--hex-text-secondary, #a0a0b8)",
        }}
      >
        {formatTimestamp(execution.evaluatedAt)}
      </span>

      {/* Port */}
      <span
        data-testid="guard-log-cell-port"
        style={{
          fontFamily: "var(--hex-font-mono, monospace)",
          fontSize: "var(--hex-font-size-xs, 11px)",
          color: "var(--hex-text-primary, #e4e4f0)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {execution.portName}
      </span>

      {/* Subject */}
      <span
        data-testid="guard-log-cell-subject"
        style={{
          fontFamily: "var(--hex-font-mono, monospace)",
          fontSize: "var(--hex-font-size-xs, 11px)",
          color: "var(--hex-text-primary, #e4e4f0)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {execution.subject.id}
      </span>

      {/* Decision badge */}
      <span
        data-testid="guard-log-cell-decision"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1px 6px",
          borderRadius: "var(--hex-radius-pill, 9999px)",
          fontSize: "var(--hex-font-size-xs, 11px)",
          fontWeight: 600,
          color: "#fff",
          backgroundColor: decisionColor,
        }}
      >
        {execution.decision}
      </span>

      {/* Policy kind */}
      <span
        data-testid="guard-log-cell-kind"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: "var(--hex-font-size-xs, 11px)",
          color: "var(--hex-text-secondary, #a0a0b8)",
        }}
      >
        <span>{kindIcon}</span>
        <span>{execution.rootTrace.kind}</span>
      </span>

      {/* Duration */}
      <span
        data-testid="guard-log-cell-duration"
        style={{
          fontFamily: "var(--hex-font-mono, monospace)",
          fontSize: "var(--hex-font-size-xs, 11px)",
          color: "var(--hex-text-secondary, #a0a0b8)",
          textAlign: "right",
        }}
      >
        {duration}
      </span>
    </div>
  );
}

export { DecisionLogEntry };
export type { DecisionLogEntryProps };
