import type { ReactElement } from "react";
import { formatDuration, TRACK_COLORS } from "../visual-encoding.js";
import type { ResultChainExecution } from "../types.js";
import {
  getBarColor,
  getBarOpacity,
  getColorZone,
  type WaterfallRow,
} from "../helpers/waterfall-helpers.js";

interface WaterfallTimelineRowProps {
  readonly row: WaterfallRow;
  readonly execution: ResultChainExecution;
  readonly p50: number;
  readonly p90: number;
}

function getOperationNameColor(row: WaterfallRow): string {
  if (row.isRecovery) return TRACK_COLORS.ok;
  if (row.outputTrack === "err") return TRACK_COLORS.err;
  return "var(--hex-text-primary, #e2e8f0)";
}

function WaterfallTimelineRow({
  row,
  execution,
  p50,
  p90,
}: WaterfallTimelineRowProps): ReactElement {
  const step = execution.steps.find(s => s.operationIndex === row.operationIndex);
  const colorZone = step ? getColorZone(step, p50, p90) : "ok";
  const barColor = getBarColor(colorZone);
  const barOpacity = getBarOpacity(colorZone, row.isRecovery);
  const barWidthPct = Math.max(1, (row.durationMicros / execution.totalDurationMicros) * 100);
  const barOffsetPct = (row.startMicros / execution.totalDurationMicros) * 100;
  const operationNameColor = getOperationNameColor(row);

  return (
    <div
      data-testid="waterfall-row"
      data-depth={row.depth}
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr 80px 60px",
        padding: "6px 16px",
        alignItems: "center",
        borderBottom: "1px solid var(--hex-border, #334155)",
        backgroundColor: row.switched ? "rgba(251, 191, 36, 0.05)" : "transparent",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontFamily: "var(--hex-font-mono, monospace)",
          color: operationNameColor,
          paddingLeft: row.depth > 0 ? "16px" : "0",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {row.depth > 0 && (
          <span style={{ color: "var(--hex-text-muted, #94a3b8)", fontSize: "10px" }}>
            {"\u2514\u2500"}
          </span>
        )}
        <span>{row.method}</span>
        <span style={{ color: "var(--hex-text-muted, #94a3b8)", fontSize: "11px" }}>
          ({row.label})
        </span>
      </div>

      <div
        style={{
          position: "relative",
          height: "20px",
          backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        {row.operationIndex > 0 && (
          <div
            data-testid="waterfall-wait-gap"
            data-gap-micros={row.waitGapMicros}
            style={{
              position: "absolute",
              left: `${Math.max(0, barOffsetPct - (row.waitGapMicros / execution.totalDurationMicros) * 100)}%`,
              width: `${(row.waitGapMicros / execution.totalDurationMicros) * 100}%`,
              height: "100%",
              backgroundColor: "rgba(148, 163, 184, 0.1)",
              borderRight: row.waitGapMicros > 0 ? "1px dashed rgba(148, 163, 184, 0.3)" : "none",
            }}
          />
        )}

        <div
          data-testid="waterfall-bar"
          data-start-micros={row.startMicros}
          data-duration-micros={row.durationMicros}
          data-track={row.outputTrack}
          data-color-zone={colorZone}
          data-recovery={row.isRecovery ? "true" : "false"}
          style={{
            position: "absolute",
            left: `${barOffsetPct}%`,
            width: `${barWidthPct}%`,
            height: "100%",
            backgroundColor: barColor,
            opacity: barOpacity,
            borderRadius: "2px",
            borderStyle: row.isRecovery ? "dashed" : "solid",
            borderWidth: row.isRecovery ? "1px" : "0",
            borderColor: row.isRecovery ? TRACK_COLORS.ok : "transparent",
            transition: "opacity 0.15s",
          }}
        />
      </div>

      <div
        style={{
          textAlign: "right",
          fontSize: "11px",
          fontFamily: "var(--hex-font-mono, monospace)",
          color: barColor,
          fontWeight: 600,
        }}
      >
        {formatDuration(row.durationMicros)}
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: "11px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "3px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: row.outputTrack === "ok" ? TRACK_COLORS.ok : TRACK_COLORS.err,
          }}
        />
        <span
          style={{
            color: row.outputTrack === "ok" ? TRACK_COLORS.ok : TRACK_COLORS.err,
            fontWeight: 500,
            fontSize: "10px",
          }}
        >
          {row.outputTrack === "ok" ? "Ok" : "Err"}
        </span>
        {row.switched && (
          <span style={{ color: TRACK_COLORS.warning, fontSize: "10px" }}>{"\u26A1"}</span>
        )}
      </div>
    </div>
  );
}

export { WaterfallTimelineRow };
