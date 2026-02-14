/**
 * CombinatorStatisticsView — Aggregate statistics for combinator operations.
 *
 * Spec: 09-combinator-matrix.md (9.10-9.11)
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import { TRACK_COLORS } from "./visual-encoding.js";

// ── Types ───────────────────────────────────────────────────────────────────

interface InputStatistic {
  readonly label: string;
  readonly okRate: number;
  readonly totalExecutions: number;
}

interface ErrorCombination {
  readonly pattern: string;
  readonly percentage: number;
  readonly count: number;
}

interface CorrelationEntry {
  readonly inputA: string;
  readonly inputB: string;
  readonly coefficient: number;
}

interface CombinatorStatisticsData {
  readonly combinatorMethod: string;
  readonly totalExecutions: number;
  readonly overallOkRate: number;
  readonly inputStats: readonly InputStatistic[];
  readonly bottleneckLabel: string;
  readonly errorCombinations: readonly ErrorCombination[];
  readonly correlations: readonly CorrelationEntry[];
}

// ── Props ───────────────────────────────────────────────────────────────────

interface CombinatorStatisticsViewProps {
  readonly data: CombinatorStatisticsData;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getCorrelationTint(coefficient: number): "none" | "medium" | "high" {
  if (coefficient > 0.5) return "high";
  if (coefficient >= 0.2) return "medium";
  return "none";
}

function getCorrelationColor(tint: "none" | "medium" | "high"): string {
  if (tint === "high") return TRACK_COLORS.err;
  if (tint === "medium") return TRACK_COLORS.warning;
  return "#475569";
}

// ── Component ───────────────────────────────────────────────────────────────

function CombinatorStatisticsView({ data }: CombinatorStatisticsViewProps): React.ReactElement {
  const inputLabels = useMemo(() => data.inputStats.map(s => s.label), [data.inputStats]);

  return (
    <div
      data-testid="combinator-statistics-view"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* ── Input success rate bars ─────────────────────────────────── */}
      <div
        style={{
          padding: "16px 20px",
          backgroundColor: "rgba(30, 41, 59, 0.4)",
          borderRadius: 12,
          border: "1px solid rgba(100, 116, 139, 0.15)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 12,
          }}
        >
          Input Success Rates
        </div>

        <div
          data-testid="input-success-rates"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {data.inputStats.map(stat => {
            const pct = Math.round(stat.okRate * 1000) / 10;
            const isBottleneck = stat.label === data.bottleneckLabel;

            return (
              <div
                key={stat.label}
                data-testid="input-success-rate-bar"
                data-ok-rate={stat.okRate}
                data-label={stat.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {/* Label */}
                <span
                  style={{
                    width: 120,
                    fontSize: 12,
                    fontWeight: isBottleneck ? 700 : 500,
                    color: isBottleneck ? TRACK_COLORS.err : "#e2e8f0",
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                  }}
                >
                  {stat.label}
                </span>

                {/* Progress bar container */}
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    backgroundColor: "rgba(71, 85, 105, 0.3)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(stat.okRate * 100)}%`,
                      height: "100%",
                      borderRadius: 4,
                      backgroundColor:
                        stat.okRate >= 0.95
                          ? TRACK_COLORS.ok
                          : stat.okRate >= 0.8
                            ? TRACK_COLORS.warning
                            : TRACK_COLORS.err,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                {/* Percentage */}
                <span
                  style={{
                    width: 50,
                    fontSize: 11,
                    fontWeight: 600,
                    color:
                      stat.okRate >= 0.95
                        ? TRACK_COLORS.ok
                        : stat.okRate >= 0.8
                          ? TRACK_COLORS.warning
                          : TRACK_COLORS.err,
                    textAlign: "right",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  Ok: {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottleneck indicator ────────────────────────────────────── */}
      <div
        data-testid="bottleneck-indicator"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          borderRadius: 8,
          backgroundColor: `${TRACK_COLORS.err}10`,
          border: `1px solid ${TRACK_COLORS.err}33`,
        }}
      >
        <span
          style={{
            fontSize: 16,
          }}
        >
          {"\u26A0\uFE0F"}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "#e2e8f0",
          }}
        >
          Bottleneck:{" "}
          <span
            style={{
              fontWeight: 700,
              color: TRACK_COLORS.err,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {data.bottleneckLabel}
          </span>
        </span>
      </div>

      {/* ── Error combination table ────────────────────────────────── */}
      <div
        style={{
          padding: "16px 20px",
          backgroundColor: "rgba(30, 41, 59, 0.4)",
          borderRadius: 12,
          border: "1px solid rgba(100, 116, 139, 0.15)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 12,
          }}
        >
          Error Combinations
        </div>

        <div
          data-testid="error-combinations"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {data.errorCombinations.map((combo, i) => (
            <div
              key={i}
              data-testid="error-combination-row"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 60px 80px",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 6,
                backgroundColor: i === 0 ? `${TRACK_COLORS.err}08` : "transparent",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "#e2e8f0",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {combo.pattern}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: TRACK_COLORS.err,
                  textAlign: "right",
                }}
              >
                {combo.percentage}%
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  textAlign: "right",
                }}
              >
                ({combo.count} times)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Correlation heatmap (only for 3+ inputs) ───────────────── */}
      {inputLabels.length >= 3 && (
        <div
          style={{
            padding: "16px 20px",
            backgroundColor: "rgba(30, 41, 59, 0.4)",
            borderRadius: 12,
            border: "1px solid rgba(100, 116, 139, 0.15)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 12,
            }}
          >
            Error Correlation Heatmap
          </div>

          <div
            data-testid="correlation-heatmap"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {data.correlations.map((entry, i) => {
              const tint = getCorrelationTint(entry.coefficient);
              const color = getCorrelationColor(tint);

              return (
                <div
                  key={i}
                  data-testid="heatmap-cell"
                  data-input-a={entry.inputA}
                  data-input-b={entry.inputB}
                  data-coefficient={entry.coefficient}
                  data-tint={tint}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 60px",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 6,
                    backgroundColor: `${color}10`,
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "#e2e8f0",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {entry.inputA} \u00D7 {entry.inputB}: {entry.coefficient}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color,
                      textAlign: "right",
                      textTransform: "uppercase",
                    }}
                  >
                    {tint === "high" ? "High" : tint === "medium" ? "Med" : "Low"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { CombinatorStatisticsView };
export type { CombinatorStatisticsViewProps, CombinatorStatisticsData };
