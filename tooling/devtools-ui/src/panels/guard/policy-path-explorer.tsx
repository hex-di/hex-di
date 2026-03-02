/**
 * PolicyPathExplorer — Path list with coverage percentages.
 *
 * Displays all discovered paths through a policy tree, showing
 * path outcome, observation frequency, and coverage statistics.
 *
 * Spec: 03-views-and-wireframes.md (3.5), 06-path-analysis.md
 *
 * @packageDocumentation
 */

import { useCallback, useMemo } from "react";
import { getDecisionColor } from "./visual-encoding.js";
import type { GuardPathDescriptor } from "./types.js";

// ── Style Constants ─────────────────────────────────────────────────────────

const VIEW_CONTAINER_STYLE: React.CSSProperties = {
  fontFamily: "var(--hex-font-sans, system-ui, sans-serif)",
  fontSize: "13px",
  color: "var(--hex-text-primary, #e2e8f0)",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const EMPTY_STATE_STYLE: React.CSSProperties = {
  color: "var(--hex-text-muted, #94a3b8)",
  fontSize: "14px",
  backgroundColor: "var(--hex-bg-secondary, #1e293b)",
  padding: "24px",
  borderRadius: "8px",
  border: "1px solid var(--hex-border, #334155)",
  textAlign: "center" as const,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function coverageBorderColor(pct: number): string {
  if (pct >= 90) return "var(--hex-guard-allow, #22c55e)";
  if (pct >= 60) return "var(--hex-guard-skip, #eab308)";
  return "var(--hex-guard-deny, #ef4444)";
}

// ── Props ───────────────────────────────────────────────────────────────────

interface PolicyPathExplorerProps {
  readonly paths: readonly GuardPathDescriptor[];
  readonly descriptorId: string;
  readonly onPathSelect: (pathId: string) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

function PolicyPathExplorer({
  paths,
  descriptorId,
  onPathSelect,
}: PolicyPathExplorerProps): React.ReactElement {
  const handlePathClick = useCallback(
    (pathId: string) => {
      onPathSelect(pathId);
    },
    [onPathSelect]
  );

  // ── Coverage statistics ─────────────────────────────────────────────────

  const coverage = useMemo(() => {
    const total = paths.length;
    const observed = paths.filter(p => p.observedCount > 0).length;
    const percentage = total > 0 ? Math.round((observed / total) * 100) : 0;
    const allowPaths = paths.filter(p => p.finalOutcome === "allow").length;
    const denyPaths = paths.filter(p => p.finalOutcome === "deny").length;
    return { total, observed, percentage, allowPaths, denyPaths };
  }, [paths]);

  return (
    <div
      data-testid="guard-path-explorer"
      data-descriptor-id={descriptorId}
      role="region"
      aria-label="Policy path explorer"
      style={VIEW_CONTAINER_STYLE}
    >
      {/* Coverage summary */}
      <div
        data-testid="guard-path-coverage"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "16px 20px",
          backgroundColor: "var(--hex-bg-secondary, #1e293b)",
          borderRadius: "8px",
          borderLeft: `4px solid ${coverageBorderColor(coverage.percentage)}`,
        }}
      >
        <span
          data-testid="guard-path-coverage-pct"
          style={{
            fontSize: "16px",
            fontWeight: 700,
            fontFamily: "var(--hex-font-mono, monospace)",
            color: coverageBorderColor(coverage.percentage),
          }}
        >
          {coverage.percentage}% coverage
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "var(--hex-text-muted, #94a3b8)",
          }}
        >
          ({coverage.observed}/{coverage.total} paths observed)
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "var(--hex-guard-allow, #22c55e)",
          }}
        >
          {coverage.allowPaths} allow
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "var(--hex-guard-deny, #ef4444)",
          }}
        >
          {coverage.denyPaths} deny
        </span>
      </div>

      {/* Path list */}
      <div
        style={{
          backgroundColor: "var(--hex-bg-secondary, #1e293b)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {/* Section header */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--hex-border, #334155)",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--hex-text-primary, #e2e8f0)",
          }}
        >
          Evaluation Paths
        </div>

        <div data-testid="guard-path-list" role="list" aria-label="Policy evaluation paths">
          {paths.map(path => {
            const outcomeColor = getDecisionColor(path.finalOutcome);
            const frequencyPct =
              path.frequency !== undefined ? Math.round(path.frequency * 100) : undefined;

            return (
              <div
                key={path.pathId}
                data-testid="guard-path-item"
                data-path-id={path.pathId}
                data-outcome={path.finalOutcome}
                data-observed={path.observedCount > 0 ? "true" : "false"}
                role="listitem"
                onClick={() => handlePathClick(path.pathId)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 16px",
                  borderBottom: "1px solid var(--hex-border, #334155)",
                  cursor: "pointer",
                }}
              >
                {/* Outcome badge */}
                <span
                  data-testid="guard-path-outcome"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "1px 6px",
                    borderRadius: "var(--hex-radius-pill, 9999px)",
                    fontSize: "var(--hex-font-size-xs, 11px)",
                    fontWeight: 600,
                    color: "#fff",
                    backgroundColor: outcomeColor,
                    flexShrink: 0,
                  }}
                >
                  {path.finalOutcome}
                </span>

                {/* Description */}
                <span
                  data-testid="guard-path-description"
                  style={{
                    flex: 1,
                    fontSize: "var(--hex-font-size-sm, 12px)",
                    color: "var(--hex-text-primary, #e4e4f0)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {path.description}
                </span>

                {/* Node count */}
                <span
                  data-testid="guard-path-node-count"
                  style={{
                    fontSize: "var(--hex-font-size-xs, 11px)",
                    color: "var(--hex-text-muted, #6b6b80)",
                    fontFamily: "var(--hex-font-mono, monospace)",
                  }}
                >
                  {path.nodeIds.length} nodes
                </span>

                {/* Frequency */}
                {frequencyPct !== undefined && (
                  <span
                    data-testid="guard-path-frequency"
                    style={{
                      fontSize: "var(--hex-font-size-xs, 11px)",
                      color: "var(--hex-text-secondary, #a0a0b8)",
                      fontFamily: "var(--hex-font-mono, monospace)",
                    }}
                  >
                    {frequencyPct}%
                  </span>
                )}

                {/* Observation count */}
                <span
                  data-testid="guard-path-observed-count"
                  style={{
                    fontSize: "var(--hex-font-size-xs, 11px)",
                    color: "var(--hex-text-muted, #6b6b80)",
                    fontFamily: "var(--hex-font-mono, monospace)",
                  }}
                >
                  {path.observedCount}x
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {paths.length === 0 && (
        <div data-testid="guard-path-empty" role="status" style={EMPTY_STATE_STYLE}>
          No paths discovered
        </div>
      )}
    </div>
  );
}

export { PolicyPathExplorer };
export type { PolicyPathExplorerProps };
