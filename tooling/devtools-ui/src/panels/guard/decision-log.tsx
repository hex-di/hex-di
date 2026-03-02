/**
 * DecisionLog — Sortable table of guard evaluation executions.
 *
 * Columns: ID, timestamp, port, subject, decision, policy kind, duration.
 * Supports sorting by clicking column headers.
 *
 * Spec: 03-views-and-wireframes.md (3.4), 05-decision-log.md
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useState } from "react";
import { DecisionLogEntry } from "./decision-log-entry.js";
import type { GuardEvaluationExecution } from "./types.js";

// ── Sort State ──────────────────────────────────────────────────────────────

type SortColumn = "id" | "timestamp" | "port" | "subject" | "decision" | "kind" | "duration";
type SortDirection = "asc" | "desc";

interface SortState {
  readonly column: SortColumn;
  readonly direction: SortDirection;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface DecisionLogProps {
  readonly executions: readonly GuardEvaluationExecution[];
  readonly onSelect: (executionId: string) => void;
  readonly selectedId: string | undefined;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function compareExecutions(
  a: GuardEvaluationExecution,
  b: GuardEvaluationExecution,
  column: SortColumn,
  direction: SortDirection
): number {
  let cmp = 0;

  switch (column) {
    case "id":
      cmp = a.executionId.localeCompare(b.executionId);
      break;
    case "timestamp":
      cmp = a.evaluatedAt.localeCompare(b.evaluatedAt);
      break;
    case "port":
      cmp = a.portName.localeCompare(b.portName);
      break;
    case "subject":
      cmp = a.subject.id.localeCompare(b.subject.id);
      break;
    case "decision":
      cmp = a.decision.localeCompare(b.decision);
      break;
    case "kind":
      cmp = a.rootTrace.kind.localeCompare(b.rootTrace.kind);
      break;
    case "duration":
      cmp = a.durationMs - b.durationMs;
      break;
  }

  return direction === "desc" ? -cmp : cmp;
}

// ── Column Definitions ──────────────────────────────────────────────────────

const COLUMNS: readonly { readonly key: SortColumn; readonly label: string }[] = [
  { key: "id", label: "ID" },
  { key: "timestamp", label: "Timestamp" },
  { key: "port", label: "Port" },
  { key: "subject", label: "Subject" },
  { key: "decision", label: "Decision" },
  { key: "kind", label: "Policy Kind" },
  { key: "duration", label: "Duration" },
];

// ── Component ───────────────────────────────────────────────────────────────

function DecisionLog({ executions, onSelect, selectedId }: DecisionLogProps): React.ReactElement {
  const [sort, setSort] = useState<SortState>({ column: "timestamp", direction: "desc" });

  const sortedExecutions = useMemo(() => {
    const sorted = [...executions];
    sorted.sort((a, b) => compareExecutions(a, b, sort.column, sort.direction));
    return sorted;
  }, [executions, sort]);

  const handleSort = useCallback((column: SortColumn) => {
    setSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  return (
    <div
      data-testid="guard-decision-log"
      role="table"
      aria-label="Guard evaluation decision log"
      style={{
        display: "flex",
        flexDirection: "column",
        fontSize: "var(--hex-font-size-sm)",
      }}
    >
      {/* Header row */}
      <div
        data-testid="guard-decision-log-header"
        role="row"
        style={{
          display: "grid",
          gridTemplateColumns: "80px 100px 1fr 1fr 70px 100px 70px",
          gap: "var(--hex-space-xs)",
          padding: "var(--hex-space-xs) var(--hex-space-md)",
          borderBottom: "1px solid var(--hex-border)",
          backgroundColor: "var(--hex-bg-secondary)",
        }}
      >
        {COLUMNS.map(col => (
          <span
            key={col.key}
            role="columnheader"
            aria-sort={
              sort.column === col.key
                ? sort.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none"
            }
            data-testid={`guard-decision-log-col-${col.key}`}
            onClick={() => handleSort(col.key)}
            style={{
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "var(--hex-font-size-xs)",
              color: "var(--hex-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              userSelect: "none",
            }}
          >
            {col.label}
            {sort.column === col.key && (sort.direction === "asc" ? " \u2191" : " \u2193")}
          </span>
        ))}
      </div>

      {/* Execution rows */}
      <div data-testid="guard-decision-log-body" role="rowgroup" style={{ overflow: "auto" }}>
        {sortedExecutions.map(execution => (
          <DecisionLogEntry
            key={execution.executionId}
            execution={execution}
            selected={execution.executionId === selectedId}
            onSelect={() => onSelect(execution.executionId)}
          />
        ))}
      </div>

      {/* Empty state */}
      {executions.length === 0 && (
        <div
          data-testid="guard-decision-log-empty"
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--hex-space-xl)",
            color: "var(--hex-text-muted)",
            fontSize: "var(--hex-font-size-sm)",
          }}
        >
          No evaluations recorded
        </div>
      )}
    </div>
  );
}

export { DecisionLog };
export type { DecisionLogProps };
