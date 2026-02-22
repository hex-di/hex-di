/**
 * AsyncWaterfallView — Jaeger-inspired temporal visualization for ResultAsync chains.
 *
 * Spec: 08-async-waterfall.md (8.1-8.9), 10-visual-encoding.md (10.10)
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useState } from "react";
import { formatDuration, getDurationBarColor, TRACK_COLORS } from "./visual-encoding.js";
import type { ResultChainDescriptor, ResultChainExecution, ResultStepTrace } from "./types.js";

// ── Types ───────────────────────────────────────────────────────────────────

interface ConcurrentInput {
  readonly label: string;
  readonly durationMicros: number;
  readonly startMicros: number;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface AsyncWaterfallViewProps {
  readonly chain: ResultChainDescriptor;
  readonly execution: ResultChainExecution | undefined;
  readonly comparisonExecution?: ResultChainExecution | undefined;
  readonly concurrentInputs?: readonly ConcurrentInput[];
  readonly p50?: number;
  readonly p90?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

interface WaterfallRow {
  readonly operationIndex: number;
  readonly method: string;
  readonly label: string;
  readonly startMicros: number;
  readonly durationMicros: number;
  readonly outputTrack: "ok" | "err";
  readonly switched: boolean;
  readonly isRecovery: boolean;
  readonly waitGapMicros: number;
  readonly depth: number;
}

function computeRows(
  chain: ResultChainDescriptor,
  execution: ResultChainExecution
): WaterfallRow[] {
  const rows: WaterfallRow[] = [];

  for (const step of execution.steps) {
    const op = chain.operations[step.operationIndex];
    if (!op) continue;

    const prevStep = rows.length > 0 ? rows[rows.length - 1] : undefined;
    const prevEnd = prevStep ? prevStep.startMicros + prevStep.durationMicros : 0;
    const waitGap = Math.max(0, step.timestamp - prevEnd);

    const isRecovery = step.switched && step.inputTrack === "err" && step.outputTrack === "ok";

    const depth = step.operationIndex === 0 ? 0 : 1;

    rows.push({
      operationIndex: step.operationIndex,
      method: op.method,
      label: op.label,
      startMicros: step.timestamp,
      durationMicros: step.durationMicros,
      outputTrack: step.outputTrack,
      switched: step.switched,
      isRecovery,
      waitGapMicros: waitGap,
      depth,
    });
  }

  return rows;
}

function getColorZone(step: ResultStepTrace, p50: number, p90: number): "ok" | "warning" | "error" {
  return getDurationBarColor({
    durationMicros: step.durationMicros,
    p50,
    p90,
    track: step.outputTrack,
  });
}

interface CriticalPathInfo {
  readonly steps: readonly { readonly method: string; readonly durationMicros: number }[];
  readonly totalMicros: number;
}

function computeCriticalPath(
  chain: ResultChainDescriptor,
  execution: ResultChainExecution
): CriticalPathInfo {
  const sorted = [...execution.steps]
    .filter(s => s.durationMicros > 0)
    .sort((a, b) => b.durationMicros - a.durationMicros);

  const steps = sorted.map(s => {
    const op = chain.operations[s.operationIndex];
    return {
      method: op?.method ?? "unknown",
      durationMicros: s.durationMicros,
    };
  });

  const totalMicros = steps.reduce((sum, s) => sum + s.durationMicros, 0);

  return { steps, totalMicros };
}

interface DeltaInfo {
  readonly operationIndex: number;
  readonly deltaMicros: number;
}

function computeDeltas(exec1: ResultChainExecution, exec2: ResultChainExecution): DeltaInfo[] {
  const deltas: DeltaInfo[] = [];

  for (const step1 of exec1.steps) {
    const step2 = exec2.steps.find(s => s.operationIndex === step1.operationIndex);
    if (step2) {
      deltas.push({
        operationIndex: step1.operationIndex,
        deltaMicros: step2.durationMicros - step1.durationMicros,
      });
    }
  }

  return deltas;
}

// ── Color zone helpers ──────────────────────────────────────────────────────

function getBarColor(zone: "ok" | "warning" | "error"): string {
  if (zone === "ok") return TRACK_COLORS.ok;
  if (zone === "warning") return TRACK_COLORS.warning;
  return TRACK_COLORS.err;
}

function getBarOpacity(zone: "ok" | "warning" | "error", isRecovery: boolean): number {
  if (isRecovery) return 0.6;
  if (zone === "error") return 0.6;
  return 0.8;
}

// ── Component ───────────────────────────────────────────────────────────────

function AsyncWaterfallView({
  chain,
  execution,
  comparisonExecution,
  concurrentInputs,
  p50 = 50_000,
  p90 = 200_000,
}: AsyncWaterfallViewProps): React.ReactElement {
  const [scale, setScale] = useState("auto");

  // ── Sync chain guard ─────────────────────────────────────────────────

  if (!chain.isAsync) {
    return (
      <div
        data-testid="async-waterfall-view"
        style={{
          fontFamily: "var(--hex-font-sans, system-ui, sans-serif)",
          padding: "40px 20px",
          textAlign: "center",
        }}
      >
        <div
          data-testid="sync-chain-message"
          style={{
            color: "var(--hex-text-muted, #94a3b8)",
            fontSize: "14px",
            backgroundColor: "var(--hex-bg-secondary, #1e293b)",
            padding: "24px",
            borderRadius: "8px",
            border: "1px solid var(--hex-border, #334155)",
          }}
        >
          This chain is synchronous. Async Waterfall is available for ResultAsync chains.
        </div>
      </div>
    );
  }

  // ── No execution guard ───────────────────────────────────────────────

  if (!execution) {
    return (
      <div
        data-testid="async-waterfall-view"
        style={{
          fontFamily: "var(--hex-font-sans, system-ui, sans-serif)",
          padding: "40px 20px",
          textAlign: "center",
        }}
      >
        <div
          data-testid="no-execution-message"
          style={{
            color: "var(--hex-text-muted, #94a3b8)",
            fontSize: "14px",
            backgroundColor: "var(--hex-bg-secondary, #1e293b)",
            padding: "24px",
            borderRadius: "8px",
            border: "1px solid var(--hex-border, #334155)",
          }}
        >
          Select an execution to view the async waterfall.
        </div>
      </div>
    );
  }

  return (
    <AsyncWaterfallContent
      chain={chain}
      execution={execution}
      comparisonExecution={comparisonExecution}
      concurrentInputs={concurrentInputs}
      p50={p50}
      p90={p90}
      scale={scale}
      onScaleChange={setScale}
    />
  );
}

// Split out to avoid hooks-after-return issues
interface AsyncWaterfallContentProps {
  readonly chain: ResultChainDescriptor;
  readonly execution: ResultChainExecution;
  readonly comparisonExecution?: ResultChainExecution | undefined;
  readonly concurrentInputs?: readonly ConcurrentInput[];
  readonly p50: number;
  readonly p90: number;
  readonly scale: string;
  readonly onScaleChange: (scale: string) => void;
}

function AsyncWaterfallContent({
  chain,
  execution,
  comparisonExecution,
  concurrentInputs,
  p50,
  p90,
  scale,
  onScaleChange,
}: AsyncWaterfallContentProps): React.ReactElement {
  const [zoomLevel, setZoomLevel] = useState(1);

  // ── Computed data ──────────────────────────────────────────────────────

  const rows = useMemo(() => computeRows(chain, execution), [chain, execution]);

  const criticalPath = useMemo(() => computeCriticalPath(chain, execution), [chain, execution]);

  const deltas = useMemo(() => {
    if (!comparisonExecution) return [];
    return computeDeltas(execution, comparisonExecution);
  }, [execution, comparisonExecution]);

  const comparisonRows = useMemo(() => {
    if (!comparisonExecution) return [];
    return computeRows(chain, comparisonExecution);
  }, [chain, comparisonExecution]);

  // Suppress unused variable warning
  void comparisonRows;

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleScaleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onScaleChange(e.target.value);
    },
    [onScaleChange]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(prev * 1.2, 10));
    } else {
      setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="async-waterfall-view"
      style={{
        fontFamily: "var(--hex-font-sans, system-ui, sans-serif)",
        fontSize: "13px",
        color: "var(--hex-text-primary, #e2e8f0)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Execution Summary Header */}
      <div
        data-testid="waterfall-exec-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "14px 20px",
          backgroundColor: "var(--hex-bg-secondary, #1e293b)",
          borderRadius: "8px",
          borderLeft: `4px solid ${execution.finalTrack === "ok" ? TRACK_COLORS.ok : TRACK_COLORS.err}`,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--hex-text-primary, #e2e8f0)",
              marginBottom: "2px",
            }}
          >
            {chain.label}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--hex-text-muted, #94a3b8)",
              fontFamily: "var(--hex-font-mono, monospace)",
            }}
          >
            {execution.executionId}
          </div>
        </div>

        <HeaderStat label="Duration" value={formatDuration(execution.totalDurationMicros)} />
        <HeaderStat label="Steps" value={String(execution.steps.length)} />
        <HeaderStat
          label="Result"
          value={execution.finalTrack === "ok" ? "Ok" : "Err"}
          color={execution.finalTrack === "ok" ? TRACK_COLORS.ok : TRACK_COLORS.err}
        />
        <HeaderStat
          label="Critical"
          value={formatDuration(criticalPath.totalMicros)}
          color={TRACK_COLORS.warning}
        />
      </div>

      {/* Scale Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "6px 12px",
          backgroundColor: "var(--hex-bg-secondary, #1e293b)",
          borderRadius: "6px",
          fontSize: "12px",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--hex-text-muted, #94a3b8)",
          }}
        >
          Scale
          <select
            data-testid="waterfall-scale-selector"
            value={scale}
            onChange={handleScaleChange}
            style={{
              backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
              color: "var(--hex-text-primary, #e2e8f0)",
              border: "1px solid var(--hex-border, #334155)",
              borderRadius: "4px",
              padding: "3px 8px",
              fontSize: "12px",
            }}
          >
            <option value="auto">Auto</option>
            <option value="1ms">1ms/px</option>
            <option value="10ms">10ms/px</option>
            <option value="100ms">100ms/px</option>
          </select>
        </label>

        <div
          style={{
            fontSize: "11px",
            color: "var(--hex-text-muted, #94a3b8)",
            marginLeft: "auto",
          }}
        >
          Zoom: {Math.round(zoomLevel * 100)}% (scroll to zoom)
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "12px", fontSize: "10px" }}>
          <LegendDot color={TRACK_COLORS.ok} label="< p50" />
          <LegendDot color={TRACK_COLORS.warning} label="p50-p90" />
          <LegendDot color={TRACK_COLORS.err} label="> p90 / Err" />
        </div>
      </div>

      {/* Waterfall Canvas */}
      <div
        data-testid="waterfall-canvas"
        data-scale={zoomLevel}
        onWheel={handleWheel}
        style={{
          backgroundColor: "var(--hex-bg-secondary, #1e293b)",
          borderRadius: "8px",
          padding: "16px 0",
          overflow: "hidden",
        }}
      >
        {/* Column headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr 80px 60px",
            padding: "0 16px 8px",
            borderBottom: "1px solid var(--hex-border, #334155)",
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--hex-text-muted, #94a3b8)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          <span>Operation</span>
          <span>Timeline</span>
          <span style={{ textAlign: "right" }}>Duration</span>
          <span style={{ textAlign: "center" }}>Track</span>
        </div>

        {/* Rows */}
        {rows.map(row => {
          const step = execution.steps.find(s => s.operationIndex === row.operationIndex);
          const colorZone = step ? getColorZone(step, p50, p90) : "ok";
          const barColor = getBarColor(colorZone);
          const barOpacity = getBarOpacity(colorZone, row.isRecovery);
          const barWidthPct = Math.max(
            1,
            (row.durationMicros / execution.totalDurationMicros) * 100
          );
          const barOffsetPct = (row.startMicros / execution.totalDurationMicros) * 100;

          return (
            <div
              key={row.operationIndex}
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
              {/* Operation name */}
              <div
                style={{
                  fontSize: "12px",
                  fontFamily: "var(--hex-font-mono, monospace)",
                  color: row.isRecovery
                    ? TRACK_COLORS.ok
                    : row.outputTrack === "err"
                      ? TRACK_COLORS.err
                      : "var(--hex-text-primary, #e2e8f0)",
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

              {/* Timeline bar area */}
              <div
                style={{
                  position: "relative",
                  height: "20px",
                  backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
                  borderRadius: "3px",
                  overflow: "hidden",
                }}
              >
                {/* Wait gap */}
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
                      borderRight:
                        row.waitGapMicros > 0 ? "1px dashed rgba(148, 163, 184, 0.3)" : "none",
                    }}
                  />
                )}

                {/* Duration bar */}
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

              {/* Duration text */}
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

              {/* Track indicator */}
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
        })}

        {/* Concurrent inputs for combinator operations */}
        {concurrentInputs?.map((input, i) => {
          const barWidthPct = Math.max(
            1,
            (input.durationMicros / execution.totalDurationMicros) * 100
          );
          const barOffsetPct = (input.startMicros / execution.totalDurationMicros) * 100;

          return (
            <div
              key={i}
              data-testid="waterfall-concurrent-row"
              data-label={input.label}
              data-start-micros={input.startMicros}
              data-duration-micros={input.durationMicros}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 80px 60px",
                padding: "4px 16px",
                alignItems: "center",
                borderBottom: "1px dashed var(--hex-border, #334155)",
                backgroundColor: "rgba(99, 102, 241, 0.05)",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#818cf8",
                  fontFamily: "var(--hex-font-mono, monospace)",
                  paddingLeft: "32px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span style={{ color: "var(--hex-text-muted, #94a3b8)", fontSize: "9px" }}>
                  {"\u2502"}
                </span>
                {input.label}
              </div>
              <div
                style={{
                  position: "relative",
                  height: "14px",
                  backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
                  borderRadius: "3px",
                  overflow: "hidden",
                }}
              >
                <div
                  data-testid="waterfall-bar"
                  data-start-micros={input.startMicros}
                  data-duration-micros={input.durationMicros}
                  style={{
                    position: "absolute",
                    left: `${barOffsetPct}%`,
                    width: `${barWidthPct}%`,
                    height: "100%",
                    backgroundColor: "#818cf8",
                    opacity: 0.5,
                    borderRadius: "2px",
                  }}
                />
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: "10px",
                  fontFamily: "var(--hex-font-mono, monospace)",
                  color: "#818cf8",
                }}
              >
                {formatDuration(input.durationMicros)}
              </div>
              <div />
            </div>
          );
        })}
      </div>

      {/* Bottom panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Summary */}
        <div
          data-testid="waterfall-summary"
          style={{
            backgroundColor: "var(--hex-bg-secondary, #1e293b)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid var(--hex-border, #334155)",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--hex-text-primary, #e2e8f0)",
            }}
          >
            Duration Breakdown
          </div>

          <div style={{ padding: "8px 16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid var(--hex-border, #334155)",
                fontWeight: 600,
                fontSize: "12px",
              }}
            >
              <span>Total</span>
              <span style={{ fontFamily: "var(--hex-font-mono, monospace)" }}>
                {formatDuration(execution.totalDurationMicros)}
              </span>
            </div>

            {rows.map(row => {
              const pct =
                execution.totalDurationMicros > 0
                  ? Math.round((row.durationMicros / execution.totalDurationMicros) * 100)
                  : 0;
              return (
                <div
                  key={row.operationIndex}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "4px 0",
                    fontSize: "11px",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--hex-font-mono, monospace)",
                      color: "var(--hex-text-muted, #94a3b8)",
                      flex: 1,
                    }}
                  >
                    {row.method}
                  </span>
                  <div
                    style={{
                      width: "60px",
                      height: "4px",
                      backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        backgroundColor:
                          row.outputTrack === "ok" ? TRACK_COLORS.ok : TRACK_COLORS.err,
                        borderRadius: "2px",
                        opacity: 0.6,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--hex-font-mono, monospace)",
                      color: "var(--hex-text-primary, #e2e8f0)",
                      minWidth: "60px",
                      textAlign: "right",
                    }}
                  >
                    {formatDuration(row.durationMicros)} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Critical Path */}
        <div
          style={{
            backgroundColor: "var(--hex-bg-secondary, #1e293b)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <div
            data-testid="waterfall-critical-path"
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid var(--hex-border, #334155)",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--hex-text-primary, #e2e8f0)",
            }}
          >
            Critical path: {criticalPath.steps.map(s => s.method).join(" \u2192 ")} (
            {formatDuration(criticalPath.totalMicros)})
          </div>

          <div style={{ padding: "8px 16px" }}>
            {criticalPath.steps.map((s, i) => {
              const pct =
                criticalPath.totalMicros > 0
                  ? Math.round((s.durationMicros / criticalPath.totalMicros) * 100)
                  : 0;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "4px 0",
                    fontSize: "11px",
                  }}
                >
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: `${TRACK_COLORS.warning}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      fontWeight: 700,
                      color: TRACK_COLORS.warning,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--hex-font-mono, monospace)",
                      color: "var(--hex-text-primary, #e2e8f0)",
                      flex: 1,
                    }}
                  >
                    {s.method}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--hex-font-mono, monospace)",
                      color: TRACK_COLORS.warning,
                      fontWeight: 600,
                    }}
                  >
                    {formatDuration(s.durationMicros)} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comparison Mode */}
      {comparisonExecution && (
        <div
          data-testid="waterfall-comparison"
          style={{
            backgroundColor: "var(--hex-bg-secondary, #1e293b)",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--hex-text-primary, #e2e8f0)",
              marginBottom: "12px",
            }}
          >
            Comparison
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
                borderRadius: "6px",
                borderLeft: `3px solid ${TRACK_COLORS.ok}`,
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--hex-text-muted, #94a3b8)" }}>
                {execution.executionId}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  fontFamily: "var(--hex-font-mono, monospace)",
                  color: "var(--hex-text-primary, #e2e8f0)",
                }}
              >
                Total: {formatDuration(execution.totalDurationMicros)}
              </div>
            </div>
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
                borderRadius: "6px",
                borderLeft: `3px solid ${TRACK_COLORS.warning}`,
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--hex-text-muted, #94a3b8)" }}>
                {comparisonExecution.executionId}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  fontFamily: "var(--hex-font-mono, monospace)",
                  color: "var(--hex-text-primary, #e2e8f0)",
                }}
              >
                Total: {formatDuration(comparisonExecution.totalDurationMicros)}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {deltas.map(delta => {
              const isPositive = delta.deltaMicros >= 0;
              return (
                <div
                  key={delta.operationIndex}
                  data-testid="waterfall-delta"
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontFamily: "var(--hex-font-mono, monospace)",
                    fontWeight: 600,
                    backgroundColor: isPositive ? `${TRACK_COLORS.err}20` : `${TRACK_COLORS.ok}20`,
                    color: isPositive ? TRACK_COLORS.err : TRACK_COLORS.ok,
                  }}
                >
                  {isPositive
                    ? `+${formatDuration(delta.deltaMicros)}`
                    : `-${formatDuration(Math.abs(delta.deltaMicros))}`}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HeaderStat({
  label,
  value,
  color,
}: {
  readonly label: string;
  readonly value: string;
  readonly color?: string;
}): React.ReactElement {
  return (
    <div style={{ textAlign: "center", minWidth: "60px" }}>
      <div
        style={{
          fontSize: "16px",
          fontWeight: 700,
          fontFamily: "var(--hex-font-mono, monospace)",
          color: color ?? "var(--hex-text-primary, #e2e8f0)",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--hex-text-muted, #94a3b8)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
}: {
  readonly color: string;
  readonly label: string;
}): React.ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
      <span
        style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
      <span style={{ color: "var(--hex-text-muted, #94a3b8)" }}>{label}</span>
    </div>
  );
}

export { AsyncWaterfallView };
export type { AsyncWaterfallViewProps, ConcurrentInput };
