/**
 * EvaluationTimeline — Duration bars for guard evaluation executions.
 *
 * Renders a horizontal bar chart showing evaluation durations over time,
 * with color-coded allow/deny decisions and selection highlighting.
 *
 * Spec: 03-views-and-wireframes.md (3.7), 08-timeline-view.md
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import { formatGuardDuration, getDecisionColor } from "./visual-encoding.js";
import type { GuardEvaluationExecution } from "./types.js";

// ── Style Constants ─────────────────────────────────────────────────────────

const VIEW_CONTAINER_STYLE: React.CSSProperties = {
  fontFamily: "var(--hex-font-sans, system-ui, sans-serif)",
  fontSize: "13px",
  color: "var(--hex-text-primary, #e2e8f0)",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const SVG_CARD_STYLE: React.CSSProperties = {
  backgroundColor: "var(--hex-bg-secondary, #1e293b)",
  borderRadius: "8px",
  padding: "16px 0",
  overflow: "hidden",
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

const STAT_VALUE_STYLE: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  fontFamily: "var(--hex-font-mono, monospace)",
  color: "var(--hex-text-primary, #e2e8f0)",
  lineHeight: 1.2,
};

const STAT_LABEL_STYLE: React.CSSProperties = {
  fontSize: "10px",
  color: "var(--hex-text-muted, #94a3b8)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

// ── Props ───────────────────────────────────────────────────────────────────

interface EvaluationTimelineProps {
  readonly executions: readonly GuardEvaluationExecution[];
  readonly selectedExecutionId: string | undefined;
}

// ── Constants ───────────────────────────────────────────────────────────────

const BAR_HEIGHT = 20;
const BAR_GAP = 4;
const MAX_BAR_WIDTH = 400;
const MARGIN_LEFT = 120;

// ── Component ───────────────────────────────────────────────────────────────

function EvaluationTimeline({
  executions,
  selectedExecutionId,
}: EvaluationTimelineProps): React.ReactElement {
  // ── Computed layout ─────────────────────────────────────────────────────

  const maxDuration = useMemo(() => {
    if (executions.length === 0) return 1;
    let max = 0;
    for (const exec of executions) {
      if (exec.durationMs > max) max = exec.durationMs;
    }
    return max || 1;
  }, [executions]);

  const stats = useMemo(() => {
    if (executions.length === 0) return { avg: 0, p50: 0, p95: 0, p99: 0 };
    const durations = executions.map(e => e.durationMs).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const avg = sum / durations.length;
    const p50 = durations[Math.floor(durations.length * 0.5)] ?? 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] ?? 0;
    return { avg, p50, p95, p99 };
  }, [executions]);

  const totalHeight = executions.length * (BAR_HEIGHT + BAR_GAP) + 40;

  return (
    <div
      data-testid="guard-evaluation-timeline"
      role="img"
      aria-label={`Evaluation timeline: ${executions.length} executions`}
      style={VIEW_CONTAINER_STYLE}
    >
      {/* Statistics summary */}
      <div
        data-testid="guard-timeline-stats"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "16px 20px",
          backgroundColor: "var(--hex-bg-secondary, #1e293b)",
          borderRadius: "8px",
          borderLeft: "4px solid var(--hex-accent, #818cf8)",
        }}
      >
        <span data-testid="guard-timeline-count" style={{ textAlign: "center", minWidth: "70px" }}>
          <div style={STAT_VALUE_STYLE}>{executions.length}</div>
          <div style={STAT_LABEL_STYLE}>evaluations</div>
        </span>
        <span data-testid="guard-timeline-avg" style={{ textAlign: "center", minWidth: "70px" }}>
          <div style={STAT_VALUE_STYLE}>{formatGuardDuration(stats.avg)}</div>
          <div style={STAT_LABEL_STYLE}>avg</div>
        </span>
        <span data-testid="guard-timeline-p50" style={{ textAlign: "center", minWidth: "70px" }}>
          <div style={STAT_VALUE_STYLE}>{formatGuardDuration(stats.p50)}</div>
          <div style={STAT_LABEL_STYLE}>p50</div>
        </span>
        <span data-testid="guard-timeline-p95" style={{ textAlign: "center", minWidth: "70px" }}>
          <div style={STAT_VALUE_STYLE}>{formatGuardDuration(stats.p95)}</div>
          <div style={STAT_LABEL_STYLE}>p95</div>
        </span>
        <span data-testid="guard-timeline-p99" style={{ textAlign: "center", minWidth: "70px" }}>
          <div style={STAT_VALUE_STYLE}>{formatGuardDuration(stats.p99)}</div>
          <div style={STAT_LABEL_STYLE}>p99</div>
        </span>
      </div>

      {/* Duration bars */}
      <div style={SVG_CARD_STYLE}>
        <svg
          data-testid="guard-timeline-svg"
          width="100%"
          height={totalHeight}
          viewBox={`0 0 ${MARGIN_LEFT + MAX_BAR_WIDTH + 80} ${totalHeight}`}
          style={{ display: "block" }}
        >
          {executions.map((exec, index) => {
            const y = index * (BAR_HEIGHT + BAR_GAP);
            const barWidth = Math.max((exec.durationMs / maxDuration) * MAX_BAR_WIDTH, 2);
            const decisionColor = getDecisionColor(exec.decision);
            const isSelected = exec.executionId === selectedExecutionId;
            const timestamp = new Date(exec.evaluatedAt);
            const timeLabel = `${String(timestamp.getHours()).padStart(2, "0")}:${String(timestamp.getMinutes()).padStart(2, "0")}:${String(timestamp.getSeconds()).padStart(2, "0")}`;

            return (
              <g
                key={exec.executionId}
                data-testid="guard-timeline-bar"
                data-execution-id={exec.executionId}
                data-decision={exec.decision}
                data-selected={isSelected ? "true" : "false"}
              >
                {/* Time label */}
                <text
                  x={MARGIN_LEFT - 8}
                  y={y + BAR_HEIGHT / 2 + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--hex-text-muted, #6b6b80)"
                  fontFamily="var(--hex-font-mono, monospace)"
                >
                  {timeLabel}
                </text>

                {/* Selection highlight */}
                {isSelected && (
                  <rect
                    x={MARGIN_LEFT - 4}
                    y={y - 2}
                    width={MAX_BAR_WIDTH + 8}
                    height={BAR_HEIGHT + 4}
                    fill="var(--hex-accent, #818cf8)"
                    opacity={0.15}
                    rx={4}
                  />
                )}

                {/* Duration bar */}
                <rect
                  x={MARGIN_LEFT}
                  y={y}
                  width={barWidth}
                  height={BAR_HEIGHT}
                  fill={decisionColor}
                  rx={3}
                  opacity={isSelected ? 1 : 0.7}
                />

                {/* Duration label */}
                <text
                  x={MARGIN_LEFT + barWidth + 6}
                  y={y + BAR_HEIGHT / 2 + 4}
                  fontSize={10}
                  fill="var(--hex-text-secondary, #a0a0b8)"
                  fontFamily="var(--hex-font-mono, monospace)"
                >
                  {formatGuardDuration(exec.durationMs)}
                </text>
              </g>
            );
          })}

          {/* Empty state inside SVG */}
          {executions.length === 0 && (
            <text
              x={(MARGIN_LEFT + MAX_BAR_WIDTH) / 2}
              y={20}
              textAnchor="middle"
              fontSize={14}
              fill="var(--hex-text-muted, #6b6b80)"
            >
              No evaluation data
            </text>
          )}
        </svg>
      </div>

      {/* HTML empty state */}
      {executions.length === 0 && <div style={EMPTY_STATE_STYLE}>No evaluation data</div>}
    </div>
  );
}

export { EvaluationTimeline };
export type { EvaluationTimelineProps };
