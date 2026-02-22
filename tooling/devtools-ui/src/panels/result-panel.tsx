/**
 * ResultPanel -- top-level PanelProps-compatible shell for the Result Panel.
 *
 * Bridges the InspectorDataSource interface to the Result Panel views.
 * Uses getAllResultStatistics() for Level 0 data (overview dashboard).
 * The Railway view uses real TracedResult data (Level 1) when available,
 * falling back to synthesized chain data from stats.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PanelProps } from "./types.js";
import type { ResultStatistics } from "@hex-di/core";
import type { InspectorDataSource } from "../data/inspector-data-source.js";
import { StatCard } from "../components/stat-card.js";
import { SectionHeader } from "../components/section-header.js";
import { EmptyState } from "../components/empty-state.js";
import { OperationLogView } from "./result/operation-log.js";
import { CaseExplorerView } from "./result/case-explorer.js";
import { SankeyStatisticsView } from "./result/sankey-statistics.js";
import { AsyncWaterfallView } from "./result/async-waterfall.js";
import { CombinatorMatrixView } from "./result/combinator-matrix.js";
import type {
  CombinatorData,
  CombinatorInput,
} from "./result/combinator-matrix.js";
import type { FlowData } from "./result/sankey-statistics.js";
import { computePaths } from "./result/path-analysis.js";
import { useResultChainData } from "../hooks/use-result-chain-data.js";
import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultOperationDescriptor,
  ResultPathDescriptor,
  ResultPortStatistics,
  SerializedValue,
} from "./result/types.js";
import { buildOverviewFromChains } from "./result-data-adapter.js";
import type { ChainOverview } from "./result-data-adapter.js";

// ── View registry ────────────────────────────────────────────────────────────

type ResultViewId =
  | "overview"
  | "railway"
  | "log"
  | "cases"
  | "sankey"
  | "waterfall"
  | "combinator";

interface ViewDef {
  readonly id: ResultViewId;
  readonly label: string;
}

const VIEWS: readonly ViewDef[] = [
  { id: "overview", label: "Overview" },
  { id: "railway", label: "Railway" },
  { id: "log", label: "Log" },
  { id: "cases", label: "Cases" },
  { id: "sankey", label: "Sankey" },
  { id: "waterfall", label: "Waterfall" },
  { id: "combinator", label: "Combinator" },
];

// ── Overview content ─────────────────────────────────────────────────────────

interface OverviewContentProps {
  readonly stats: ReadonlyMap<string, ResultStatistics>;
  readonly chainOverview: ChainOverview | undefined;
}

function OverviewContent({ stats, chainOverview }: OverviewContentProps): React.ReactElement {
  // If we have chain data but no DI stats, render chain-based overview
  if (stats.size === 0 && chainOverview !== undefined && chainOverview.chainCount > 0) {
    return <ChainOverviewContent overview={chainOverview} />;
  }

  if (stats.size === 0) {
    return (
      <div data-testid="result-overview-content">
        <EmptyState
          icon={"\u23F3"}
          message="Awaiting Result data"
          description="Run your code. Result<T, E> statistics will appear here after methods return ok() or err() values."
        />
      </div>
    );
  }

  const entries = [...stats.values()];
  const totalCalls = entries.reduce((sum, s) => sum + s.totalCalls, 0);
  const totalOk = entries.reduce((sum, s) => sum + s.okCount, 0);
  const totalErr = entries.reduce((sum, s) => sum + s.errCount, 0);
  const okRate = totalCalls > 0 ? totalOk / totalCalls : 1;
  const errorPorts = entries.filter(s => s.errorRate > 0).length;

  return (
    <div data-testid="result-overview-content">
      <SectionHeader title="Result Statistics" subtitle="Aggregate Result<T, E> port metrics" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "var(--hex-space-md)",
          marginBottom: "var(--hex-space-xl)",
        }}
      >
        <StatCard label="Total Calls" value={totalCalls} />
        <StatCard
          label="Ok Rate"
          value={`${Math.round(okRate * 1000) / 10}%`}
          variant={okRate < 0.95 ? "warning" : "neutral"}
        />
        <StatCard label="Ports" value={stats.size} />
        <StatCard
          label="Error Ports"
          value={errorPorts}
          variant={errorPorts > 0 ? "error" : "neutral"}
        />
      </div>

      {totalErr > 0 && (
        <>
          <div
            style={{
              borderTop: "1px solid var(--hex-border)",
              marginBottom: "var(--hex-space-xl)",
            }}
          />
          <SectionHeader title="Port Breakdown" count={stats.size} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--hex-space-sm)",
            }}
          >
            {entries.map(stat => (
              <div
                key={stat.portName}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--hex-space-sm) var(--hex-space-md)",
                  backgroundColor:
                    stat.errorRate > 0 ? "var(--hex-error-muted)" : "var(--hex-bg-secondary)",
                  borderRadius: "var(--hex-radius-md)",
                  borderLeft:
                    stat.errorRate > 0
                      ? "3px solid var(--hex-error)"
                      : "3px solid var(--hex-success)",
                  fontFamily: "var(--hex-font-mono)",
                  fontSize: "var(--hex-font-size-sm)",
                }}
              >
                <span style={{ color: "var(--hex-text-primary)" }}>{stat.portName}</span>
                <span style={{ color: "var(--hex-text-muted)" }}>
                  {stat.okCount}ok / {stat.errCount}err
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Chain-based overview (when DI stats are absent but chain data exists) ────

function ChainOverviewContent({
  overview,
}: {
  readonly overview: ChainOverview;
}): React.ReactElement {
  const okRate = overview.totalExecutions > 0 ? overview.okCount / overview.totalExecutions : 1;

  return (
    <div data-testid="result-overview-content">
      <SectionHeader
        title="Result Chain Statistics"
        subtitle="Derived from traced Result operations"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "var(--hex-space-md)",
          marginBottom: "var(--hex-space-xl)",
        }}
      >
        <StatCard label="Total Executions" value={overview.totalExecutions} />
        <StatCard
          label="Ok Rate"
          value={`${Math.round(okRate * 1000) / 10}%`}
          variant={okRate < 0.95 ? "warning" : "neutral"}
        />
        <StatCard label="Chains" value={overview.chainCount} />
        <StatCard
          label="Error Chains"
          value={overview.chainsWithErrors}
          variant={overview.chainsWithErrors > 0 ? "error" : "neutral"}
        />
      </div>

      {overview.perChain.length > 0 && (
        <>
          <div
            style={{
              borderTop: "1px solid var(--hex-border)",
              marginBottom: "var(--hex-space-xl)",
            }}
          />
          <SectionHeader title="Chain Breakdown" count={overview.perChain.length} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--hex-space-sm)",
            }}
          >
            {overview.perChain.map(entry => (
              <div
                key={entry.chainId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--hex-space-sm) var(--hex-space-md)",
                  backgroundColor:
                    entry.errCount > 0 ? "var(--hex-error-muted)" : "var(--hex-bg-secondary)",
                  borderRadius: "var(--hex-radius-md)",
                  borderLeft:
                    entry.errCount > 0
                      ? "3px solid var(--hex-error)"
                      : "3px solid var(--hex-success)",
                  fontFamily: "var(--hex-font-mono)",
                  fontSize: "var(--hex-font-size-sm)",
                }}
              >
                <span style={{ color: "var(--hex-text-primary)" }}>{entry.label}</span>
                <span style={{ color: "var(--hex-text-muted)" }}>
                  {entry.okCount}ok / {entry.errCount}err
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── View placeholder ─────────────────────────────────────────────────────────

function ViewPlaceholder({ viewId }: { readonly viewId: ResultViewId }): React.ReactElement {
  const messages: Record<ResultViewId, { message: string; description: string }> = {
    overview: { message: "", description: "" },
    railway: {
      message: "No Result chain data yet",
      description: "Run code that returns ok()/err() to see the railway visualization.",
    },
    log: {
      message: "No Result operations recorded yet",
      description: "Execute code to see the operation log.",
    },
    cases: {
      message: "No case analysis data yet",
      description: "Run code with branching Result logic to see case breakdown.",
    },
    sankey: {
      message: "No flow data yet",
      description: "Run code to see how ok/err results flow through your ports.",
    },
    waterfall: {
      message: "No async timing data yet",
      description: "Run code with async Result operations to see the waterfall.",
    },
    combinator: {
      message: "No combinator operations recorded yet",
      description:
        "Run the Result: Combinators example — uses all(), allSettled(), any(), collect().",
    },
  };

  const entry = messages[viewId];

  return (
    <div data-testid={`result-view-${viewId}`} style={{ padding: "var(--hex-space-xl)" }}>
      <EmptyState message={entry.message} description={entry.description} />
    </div>
  );
}

// ── Railway content ──────────────────────────────────────────────────────────

interface RailwayContentProps {
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly getExecutions: (chainId: string) => readonly ResultChainExecution[];
  readonly isRealData: boolean;
}

interface ChainRowData {
  readonly chain: ResultChainDescriptor;
  readonly latestExec: ResultChainExecution | undefined;
  readonly finalTrack: "ok" | "err" | undefined;
  readonly totalDuration: number;
  readonly methodSequence: readonly string[];
  readonly switchCount: number;
}

function buildChainRows(
  chains: ReadonlyMap<string, ResultChainDescriptor>,
  getExecutions: (chainId: string) => readonly ResultChainExecution[],
): readonly ChainRowData[] {
  const rows: ChainRowData[] = [];
  for (const [chainId, chain] of chains) {
    const execs = getExecutions(chainId);
    const latest = execs.length > 0 ? execs[execs.length - 1] : undefined;
    const methods = chain.operations.map(op => op.method);
    const switches = latest !== undefined
      ? latest.steps.filter(s => s.switched).length
      : 0;
    rows.push({
      chain,
      latestExec: latest,
      finalTrack: latest?.finalTrack,
      totalDuration: latest?.totalDurationMicros ?? 0,
      methodSequence: methods,
      switchCount: switches,
    });
  }
  // Sort: errors first, then preserve insertion order
  rows.sort((a, b) => {
    const aErr = a.finalTrack === "err" ? 0 : 1;
    const bErr = b.finalTrack === "err" ? 0 : 1;
    return aErr - bErr;
  });
  return rows;
}

const CONSTRUCTOR_METHODS = new Set(["ok", "err", "fromNullable", "fromPredicate", "fromThrowable", "tryCatch"]);

function formatSourceLocation(loc: string): string {
  const lastSlash = loc.lastIndexOf("/");
  return lastSlash >= 0 ? loc.slice(lastSlash + 1) : loc;
}

function formatValue(val: SerializedValue): string {
  if (typeof val.data === "string") return val.data;
  if (typeof val.data === "number" || typeof val.data === "boolean") return String(val.data);
  if (val.data === null || val.data === undefined) return String(val.data);
  try {
    return JSON.stringify(val.data);
  } catch {
    return "[...]";
  }
}

function formatDuration(micros: number): string {
  if (micros < 1) return "sync";
  if (micros < 1000) return `${Math.round(micros)}\u00B5s`;
  if (micros < 1_000_000) return `${(micros / 1000).toFixed(1)}ms`;
  return `${(micros / 1_000_000).toFixed(2)}s`;
}

function RailwayContent({
  chains,
  getExecutions,
  isRealData: _isRealData,
}: RailwayContentProps): React.ReactElement {
  const [expandedChainId, setExpandedChainId] = useState<string | undefined>(undefined);
  const [hideConstructors, setHideConstructors] = useState(false);

  if (chains.size === 0) {
    return (
      <div
        data-testid="result-view-railway"
        style={{ padding: "var(--hex-space-xl)", height: "100%" }}
      >
        <EmptyState
          icon={"\u{1F6E4}"}
          message="No Result chain data yet"
          description="Run code that returns ok()/err() to see the railway visualization."
        />
      </div>
    );
  }

  const allRows = buildChainRows(chains, getExecutions);
  // When hiding constructors, also hide entire single-op constructor chains
  const rows = hideConstructors
    ? allRows.filter(r => !(r.chain.operations.length === 1 && CONSTRUCTOR_METHODS.has(r.chain.operations[0].method)))
    : allRows;
  const okCount = rows.filter(r => r.finalTrack === "ok").length;
  const errCount = rows.filter(r => r.finalTrack === "err").length;

  return (
    <div
      data-testid="railway-content"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      {/* Aggregate stats header */}
      <div
        data-testid="railway-stats-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "var(--hex-space-xs) var(--hex-space-md)",
          borderBottom: "1px solid var(--hex-border)",
          fontSize: 12,
          color: "var(--hex-text-secondary)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--hex-text-primary)" }}>
          {rows.length} chains
        </span>
        <span style={{ color: "var(--hex-success, #22c55e)" }}>{okCount} ok</span>
        <span style={{ color: "var(--hex-error, #ef4444)" }}>{errCount} err</span>
        <button
          data-testid="railway-hide-constructors"
          onClick={() => setHideConstructors(h => !h)}
          style={{
            marginLeft: "auto",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
            fontFamily: "var(--hex-font-mono)",
            border: "1px solid var(--hex-border)",
            backgroundColor: hideConstructors ? "var(--hex-bg-active, #e0e7ff)" : "transparent",
            color: hideConstructors ? "var(--hex-text-primary)" : "var(--hex-text-muted)",
            cursor: "pointer",
          }}
        >
          {hideConstructors ? "Show constructors" : "Hide constructors"}
        </button>
      </div>

      {/* Chain list */}
      <div
        data-testid="railway-chain-list"
        style={{ flex: 1, overflowY: "auto" }}
      >
        {rows.map(row => {
          const trackColor = row.finalTrack === "err"
            ? "var(--hex-error, #ef4444)"
            : "var(--hex-success, #22c55e)";
          const isExpanded = expandedChainId === row.chain.chainId;

          return (
            <div key={row.chain.chainId}>
              <div
                data-testid="railway-chain-row"
                onClick={() => setExpandedChainId(isExpanded ? undefined : row.chain.chainId)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "var(--hex-space-sm) var(--hex-space-md)",
                  borderBottom: "1px solid var(--hex-border)",
                  borderLeft: row.finalTrack === "err"
                    ? "3px solid var(--hex-error, #ef4444)"
                    : "3px solid transparent",
                  cursor: "pointer",
                  backgroundColor: isExpanded ? "var(--hex-bg-secondary, #f9fafb)" : undefined,
                }}
              >
                {/* Expand indicator */}
                <span style={{ fontSize: 10, color: "var(--hex-text-muted)", width: 12, flexShrink: 0 }}>
                  {isExpanded ? "\u25BC" : "\u25B6"}
                </span>

                {/* Chain label */}
                <span
                  data-testid="railway-chain-label"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "var(--hex-font-mono)",
                    color: "var(--hex-text-primary)",
                    whiteSpace: "nowrap",
                    minWidth: 80,
                  }}
                >
                  {row.chain.label}
                </span>

                {/* Port name badge */}
                {row.chain.portName !== undefined && (
                  <span
                    data-testid="railway-chain-port"
                    style={{
                      fontSize: 10,
                      padding: "1px 5px",
                      borderRadius: 4,
                      backgroundColor: "var(--hex-bg-secondary, #f3f4f6)",
                      color: "var(--hex-text-muted)",
                      fontFamily: "var(--hex-font-mono)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.chain.portName}
                  </span>
                )}

                {/* Async badge */}
                {row.chain.isAsync && (
                  <span
                    data-testid="railway-chain-async"
                    style={{
                      fontSize: 9,
                      padding: "1px 4px",
                      borderRadius: 3,
                      backgroundColor: "var(--hex-accent-muted, #dbeafe)",
                      color: "var(--hex-accent, #3b82f6)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    async
                  </span>
                )}

                {/* Source location */}
                {row.chain.sourceLocation !== undefined && (
                  <span
                    data-testid="railway-chain-source"
                    title={row.chain.sourceLocation}
                    style={{
                      fontSize: 10,
                      color: "var(--hex-text-muted)",
                      fontFamily: "var(--hex-font-mono)",
                      opacity: 0.7,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatSourceLocation(row.chain.sourceLocation)}
                  </span>
                )}

                {/* Method sequence badges */}
                <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap", alignItems: "center" }}>
                  {row.methodSequence
                    .filter(method => !hideConstructors || !CONSTRUCTOR_METHODS.has(method))
                    .map((method, i) => (
                      <span
                        key={i}
                        data-testid="railway-method-badge"
                        style={{
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontFamily: "var(--hex-font-mono)",
                          backgroundColor: "var(--hex-bg-secondary, #f3f4f6)",
                          color: "var(--hex-text-secondary)",
                        }}
                      >
                        {method}
                      </span>
                    ))}
                </div>

                {/* Entry → Final value preview */}
                {row.latestExec?.entryValue !== undefined && (
                  <span
                    data-testid="railway-chain-entry-value"
                    style={{
                      fontSize: 10,
                      color: "var(--hex-text-muted)",
                      maxWidth: 80,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--hex-font-mono)",
                    }}
                  >
                    {formatValue(row.latestExec.entryValue)}
                  </span>
                )}
                {row.latestExec?.entryValue !== undefined && row.latestExec.finalValue !== undefined && (
                  <span style={{ color: "var(--hex-text-muted)", fontSize: 10 }}>{"\u2192"}</span>
                )}
                {row.latestExec?.finalValue !== undefined && (
                  <span
                    data-testid="railway-chain-final-value"
                    style={{
                      fontSize: 10,
                      color: row.finalTrack === "err" ? "var(--hex-error, #ef4444)" : "var(--hex-success, #22c55e)",
                      maxWidth: 80,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--hex-font-mono)",
                    }}
                  >
                    {formatValue(row.latestExec.finalValue)}
                  </span>
                )}

                {/* Track switch count */}
                {row.switchCount > 0 && (
                  <span
                    data-testid="railway-chain-switches"
                    title={`${row.switchCount} track switch${row.switchCount > 1 ? "es" : ""}`}
                    style={{
                      fontSize: 10,
                      padding: "1px 5px",
                      borderRadius: 4,
                      backgroundColor: "var(--hex-warning-muted, #fef3c7)",
                      color: "var(--hex-warning, #f59e0b)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {"\u21C5"}{row.switchCount}
                  </span>
                )}

                {/* Op count */}
                <span
                  data-testid="railway-chain-ops"
                  style={{ fontSize: 11, color: "var(--hex-text-muted)", whiteSpace: "nowrap" }}
                >
                  {row.chain.operations.length} ops
                </span>

                {/* Duration */}
                <span
                  data-testid="railway-chain-duration"
                  style={{ fontSize: 11, color: "var(--hex-text-muted)", whiteSpace: "nowrap", minWidth: 48, textAlign: "right" }}
                >
                  {formatDuration(row.totalDuration)}
                </span>

                {/* Outcome badge */}
                <span
                  data-testid="railway-chain-outcome"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: trackColor,
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {row.finalTrack === "err" ? "\u2717" : "\u2713"}
                </span>
              </div>

              {/* Expanded detail: show individual operations */}
              {isExpanded && (
                <div
                  data-testid="railway-chain-detail"
                  style={{
                    borderBottom: "1px solid var(--hex-border)",
                    backgroundColor: "var(--hex-bg-secondary, #f9fafb)",
                    paddingLeft: "var(--hex-space-xl)",
                  }}
                >
                  {row.chain.operations.map((op, i) => {
                    const step = row.latestExec?.steps[i];
                    const stepTrack = step?.outputTrack;
                    const stepColor = stepTrack === "err"
                      ? "var(--hex-error, #ef4444)"
                      : stepTrack === "ok"
                        ? "var(--hex-success, #22c55e)"
                        : "var(--hex-text-muted)";

                    return (
                      <div
                        key={op.index}
                        data-testid="railway-op-row"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px var(--hex-space-md)",
                          fontSize: 11,
                          fontFamily: "var(--hex-font-mono)",
                          borderLeft: step?.switched
                            ? "2px solid var(--hex-error, #ef4444)"
                            : "2px solid transparent",
                        }}
                      >
                        <span style={{ color: "var(--hex-text-primary)", fontWeight: 500, minWidth: 64 }}>
                          {op.method}
                        </span>
                        {step?.callbackThrew && (
                          <span
                            data-testid="railway-op-threw"
                            title="Callback threw an exception"
                            style={{
                              color: "var(--hex-warning, #f59e0b)",
                              fontSize: 12,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {"\u26A0"}
                          </span>
                        )}
                        <span style={{ color: "var(--hex-text-muted)", flex: 1 }}>
                          {op.label}
                        </span>
                        {op.callbackLocation !== undefined && (
                          <span
                            data-testid="railway-op-location"
                            style={{
                              color: "var(--hex-text-muted)",
                              fontSize: 10,
                              fontFamily: "var(--hex-font-mono)",
                              opacity: 0.7,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {op.callbackLocation}
                          </span>
                        )}
                        {step && (
                          <>
                            {step.inputValue !== undefined && (
                              <span
                                data-testid="railway-op-input"
                                style={{
                                  color: "var(--hex-text-muted)",
                                  fontSize: 10,
                                  maxWidth: 100,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatValue(step.inputValue)}
                              </span>
                            )}
                            {step.inputValue !== undefined && step.outputValue !== undefined && (
                              <span style={{ color: "var(--hex-text-muted)", fontSize: 10 }}>{"\u2192"}</span>
                            )}
                            {step.outputValue !== undefined && (
                              <span
                                data-testid="railway-op-output"
                                style={{
                                  color: "var(--hex-text-secondary)",
                                  fontSize: 10,
                                  maxWidth: 120,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatValue(step.outputValue)}
                              </span>
                            )}
                            <span style={{ color: stepColor, fontWeight: 600 }}>
                              {stepTrack}
                            </span>
                            <span style={{ color: "var(--hex-text-muted)", minWidth: 40, textAlign: "right" }}>
                              {formatDuration(step.durationMicros)}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Log content ─────────────────────────────────────────────────────────────

interface LogContentProps {
  readonly mergedChain: ResultChainDescriptor | undefined;
  readonly mergedExecution: ResultChainExecution | undefined;
}

function LogContent({ mergedChain, mergedExecution }: LogContentProps): React.ReactElement {
  if (!mergedChain || !mergedExecution || mergedExecution.steps.length === 0) {
    return <ViewPlaceholder viewId="log" />;
  }

  return <OperationLogView chain={mergedChain} execution={mergedExecution} />;
}

// ── Cases content ────────────────────────────────────────────────────────────

interface CasesContentProps {
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly getExecutions: (chainId: string) => readonly ResultChainExecution[];
}

function CasesContent({ chains, getExecutions }: CasesContentProps): React.ReactElement {
  if (chains.size === 0) {
    return <ViewPlaceholder viewId="cases" />;
  }

  // Compute paths per individual chain and overlay per-chain executions.
  // This avoids the cross-chain combinatorial explosion from merging.
  const allPaths: ResultPathDescriptor[] = [];
  const allOperations: ResultOperationDescriptor[] = [];

  for (const [chainId, chain] of chains) {
    const staticPaths = computePaths(chain.operations);
    const executions = getExecutions(chainId);

    // Build a frequency map: track-sequence-key → observation count
    const observedCounts = new Map<string, number>();
    for (const exec of executions) {
      if (exec.steps.length === 0) continue;
      const key = exec.steps.map(s => s.outputTrack).join(",");
      observedCounts.set(key, (observedCounts.get(key) ?? 0) + 1);
    }

    const totalExecs = executions.length;

    const overlaid = staticPaths.map(path => {
      const key = path.trackSequence.join(",");
      const count = observedCounts.get(key) ?? 0;
      if (count > 0) {
        return {
          ...path,
          // Prefix pathId with chainId to avoid collisions across chains
          pathId: `${chainId}:${path.pathId}`,
          observed: true,
          observedCount: count,
          frequency: totalExecs > 0 ? count / totalExecs : 0,
        };
      }
      return { ...path, pathId: `${chainId}:${path.pathId}` };
    });

    allPaths.push(...overlaid);

    // Collect operations (re-indexed to global offset)
    const offset = allOperations.length;
    for (const op of chain.operations) {
      allOperations.push({ ...op, index: op.index + offset });
    }
  }

  // Build a synthetic merged chain descriptor for display
  const displayChain: ResultChainDescriptor = {
    chainId: "cases-merged",
    label: chains.size === 1 ? [...chains.values()][0].label : `${chains.size} chains`,
    portName: undefined,
    operations: allOperations,
    isAsync: false,
    sourceLocation: undefined,
  };

  return <CaseExplorerView chain={displayChain} paths={allPaths} />;
}

// ── Sankey content ───────────────────────────────────────────────────────────

interface SankeyContentProps {
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly getExecutions: (chainId: string) => readonly ResultChainExecution[];
}

function SankeyContent({ chains, getExecutions }: SankeyContentProps): React.ReactElement {
  if (chains.size === 0) {
    return <ViewPlaceholder viewId="sankey" />;
  }

  // Aggregate flow data across all chains and their executions.
  // For each operation, count input→output track transitions.
  const flowMap = new Map<
    number,
    { okToOk: number; okToErr: number; errToOk: number; errToErr: number }
  >();
  let totalCalls = 0;
  let okCount = 0;
  let errCount = 0;
  const errorsByCode = new Map<string, number>();
  let lastTimestamp: number | undefined;
  const chainIds: string[] = [];
  let displayChain: ResultChainDescriptor | undefined;

  for (const [chainId, chain] of chains) {
    chainIds.push(chainId);
    if (displayChain === undefined || chain.operations.length > displayChain.operations.length) {
      displayChain = chain;
    }

    const executions = getExecutions(chainId);

    for (const exec of executions) {
      totalCalls++;
      if (exec.finalTrack === "ok") {
        okCount++;
      } else {
        errCount++;
        if (exec.finalValue !== undefined) {
          const code =
            typeof exec.finalValue.data === "string"
              ? exec.finalValue.data
              : exec.finalValue.typeName;
          errorsByCode.set(code, (errorsByCode.get(code) ?? 0) + 1);
        }
      }

      if (lastTimestamp === undefined || exec.startTimestamp > lastTimestamp) {
        lastTimestamp = exec.startTimestamp;
      }

      for (const step of exec.steps) {
        let entry = flowMap.get(step.operationIndex);
        if (entry === undefined) {
          entry = { okToOk: 0, okToErr: 0, errToOk: 0, errToErr: 0 };
          flowMap.set(step.operationIndex, entry);
        }

        if (step.inputTrack === "ok" && step.outputTrack === "ok") {
          entry.okToOk++;
        } else if (step.inputTrack === "ok" && step.outputTrack === "err") {
          entry.okToErr++;
        } else if (step.inputTrack === "err" && step.outputTrack === "ok") {
          entry.errToOk++;
        } else {
          entry.errToErr++;
        }
      }
    }
  }

  if (displayChain === undefined || totalCalls === 0) {
    return <ViewPlaceholder viewId="sankey" />;
  }

  // Build FlowData array sorted by operation index
  const flows: FlowData[] = [...flowMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([operationIndex, counts]) => ({
      operationIndex,
      ...counts,
    }));

  const portStats: ResultPortStatistics = {
    portName: displayChain.portName ?? displayChain.label,
    totalCalls,
    okCount,
    errCount,
    errorRate: totalCalls > 0 ? errCount / totalCalls : 0,
    errorsByCode,
    lastError: undefined,
    stabilityScore: totalCalls > 0 ? okCount / totalCalls : 1,
    chainIds,
    lastExecutionTimestamp: lastTimestamp,
  };

  return (
    <SankeyStatisticsView
      chain={displayChain}
      flows={flows}
      portStats={portStats}
      stabilityHistory={[]}
    />
  );
}

// ── Waterfall content ────────────────────────────────────────────────────────

interface WaterfallContentProps {
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly getExecutions: (chainId: string) => readonly ResultChainExecution[];
}

function WaterfallContent({ chains, getExecutions }: WaterfallContentProps): React.ReactElement {
  if (chains.size === 0) {
    return <ViewPlaceholder viewId="waterfall" />;
  }

  // Prefer async chains for the waterfall view; fall back to any chain
  let selectedChain: ResultChainDescriptor | undefined;
  let selectedExecution: ResultChainExecution | undefined;

  for (const [chainId, chain] of chains) {
    const executions = getExecutions(chainId);
    if (chain.isAsync && executions.length > 0) {
      selectedChain = chain;
      selectedExecution = executions[executions.length - 1];
      break;
    }
  }

  // If no async chain with executions, try any chain with executions
  if (selectedChain === undefined) {
    for (const [chainId, chain] of chains) {
      const executions = getExecutions(chainId);
      if (executions.length > 0) {
        selectedChain = chain;
        selectedExecution = executions[executions.length - 1];
        break;
      }
    }
  }

  if (selectedChain === undefined) {
    return <ViewPlaceholder viewId="waterfall" />;
  }

  return <AsyncWaterfallView chain={selectedChain} execution={selectedExecution} />;
}

// ── Combinator content ───────────────────────────────────────────────────────

interface CombinatorContentProps {
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly getExecutions: (chainId: string) => readonly ResultChainExecution[];
}

const COMBINATOR_METHODS = new Set(["all", "allSettled", "any", "collect"]);

interface CombinatorChainEntry {
  readonly chain: ResultChainDescriptor;
  readonly opIndex: number;
  readonly method: "all" | "allSettled" | "any" | "collect";
  readonly finalTrack: "ok" | "err" | undefined;
  readonly inputCount: number;
}

const METHOD_ICONS: Record<string, string> = { all: "∀", allSettled: "≡", any: "∃", collect: "{}" };

function collectCombinatorChains(
  chains: ReadonlyMap<string, ResultChainDescriptor>,
  getExecutions: (chainId: string) => readonly ResultChainExecution[]
): readonly CombinatorChainEntry[] {
  const result: CombinatorChainEntry[] = [];
  for (const [, chain] of chains) {
    const idx = chain.operations.findIndex(op => COMBINATOR_METHODS.has(op.method));
    if (idx < 0) continue;
    const method = chain.operations[idx].method as "all" | "allSettled" | "any" | "collect";
    const execs = getExecutions(chain.chainId);
    const latest = execs.length > 0 ? execs[execs.length - 1] : undefined;
    const step = latest?.steps.find(s => s.operationIndex === idx);
    const inputData = step?.inputValue?.data;
    const inputCount = Array.isArray(inputData) ? inputData.length : 0;
    result.push({
      chain,
      opIndex: idx,
      method,
      finalTrack: latest?.finalTrack,
      inputCount,
    });
  }
  return result;
}

function buildCombinatorData(
  entry: CombinatorChainEntry,
  getExecutions: (chainId: string) => readonly ResultChainExecution[]
): CombinatorData | undefined {
  const execs = getExecutions(entry.chain.chainId);
  const latestExec = execs.length > 0 ? execs[execs.length - 1] : undefined;
  if (latestExec === undefined) return undefined;

  const combinatorStep = latestExec.steps.find(s => s.operationIndex === entry.opIndex);
  if (combinatorStep === undefined) return undefined;

  const method = entry.method;
  let inputs: CombinatorInput[] = [];
  const inputData = combinatorStep.inputValue?.data;

  if (Array.isArray(inputData)) {
    inputs = inputData.map((item: Record<string, unknown>, i: number) => ({
      index: typeof item["index"] === "number" ? item["index"] : i,
      name: typeof item["name"] === "string" ? item["name"] : undefined,
      sourceLabel: typeof item["sourceLabel"] === "string" ? item["sourceLabel"] : `input-${i}`,
      track: item["track"] === "err" ? ("err" as const) : ("ok" as const),
      valuePreview: typeof item["valuePreview"] === "string" ? item["valuePreview"] : "—",
      isShortCircuitCause: item["isShortCircuitCause"] === true,
      isSkipped: item["isSkipped"] === true,
    }));
  }

  if ((method === "all" || method === "collect") && combinatorStep.outputTrack === "err") {
    const firstErr = inputs.findIndex(inp => inp.track === "err");
    if (firstErr >= 0) {
      inputs = inputs.map((inp, i) => ({
        ...inp,
        isShortCircuitCause: i === firstErr,
        isSkipped: i > firstErr && inp.track !== "err",
      }));
    }
  }

  const outputValuePreview =
    combinatorStep.outputValue !== undefined
      ? typeof combinatorStep.outputValue.data === "string"
        ? combinatorStep.outputValue.data
        : JSON.stringify(combinatorStep.outputValue.data)
      : "—";

  return {
    combinatorMethod: method,
    inputs,
    output: {
      track: combinatorStep.outputTrack,
      valuePreview: outputValuePreview,
      sourceNote: buildSourceNote(method, inputs, combinatorStep.outputTrack),
    },
  };
}

function CombinatorContent({ chains, getExecutions }: CombinatorContentProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [methodFilter, setMethodFilter] = useState<string | null>(null);

  const allEntries = useMemo(
    () => collectCombinatorChains(chains, getExecutions),
    [chains, getExecutions]
  );

  // All hooks must be called before any early return (React rules of hooks)
  const methodCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of allEntries) {
      counts.set(e.method, (counts.get(e.method) ?? 0) + 1);
    }
    return counts;
  }, [allEntries]);

  if (allEntries.length === 0) {
    return <ViewPlaceholder viewId="combinator" />;
  }

  const entries =
    methodFilter !== null ? allEntries.filter(e => e.method === methodFilter) : allEntries;

  if (entries.length === 0) {
    return <ViewPlaceholder viewId="combinator" />;
  }

  // Aggregate stats
  const okCount = allEntries.filter(e => e.finalTrack === "ok").length;
  const errCount = allEntries.filter(e => e.finalTrack === "err").length;

  const safeIndex = selectedIndex < entries.length ? selectedIndex : 0;
  const activeEntry = entries[safeIndex];
  const combinatorData = buildCombinatorData(activeEntry, getExecutions);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Aggregate stats header */}
      <div
        data-testid="combinator-stats-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "var(--hex-space-xs) var(--hex-space-md)",
          borderBottom: "1px solid var(--hex-border)",
          fontSize: 12,
          color: "var(--hex-text-secondary)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--hex-text-primary)" }}>
          {allEntries.length} calls
        </span>
        <span style={{ color: "var(--hex-success, #22c55e)" }}>{okCount} ok</span>
        <span style={{ color: "var(--hex-error, #ef4444)" }}>{errCount} err</span>
      </div>

      {/* Main content (sidebar + detail) */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Chain list sidebar */}
        <div
          data-testid="combinator-chain-list"
          style={{
            width: 220,
            minWidth: 220,
            borderRight: "1px solid var(--hex-border)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Method filter badges */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              padding: "var(--hex-space-xs) var(--hex-space-sm)",
              borderBottom: "1px solid var(--hex-border)",
            }}
          >
            {[...methodCounts.entries()].map(([method, count]) => {
              const isActive = methodFilter === method;
              return (
                <button
                  key={method}
                  data-testid="combinator-method-filter"
                  onClick={() => {
                    setMethodFilter(isActive ? null : method);
                    setSelectedIndex(0);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 12,
                    border: isActive
                      ? "1px solid var(--hex-accent)"
                      : "1px solid var(--hex-border)",
                    background: isActive ? "var(--hex-accent)" : "transparent",
                    color: isActive ? "#fff" : "var(--hex-text-secondary)",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <span>{METHOD_ICONS[method] ?? "?"}</span>
                  <span>{method}</span>
                  <span style={{ opacity: 0.7 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Chain items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--hex-space-xs) 0" }}>
            {entries.map((entry, i) => {
              const isActive = i === safeIndex;
              const icon = METHOD_ICONS[entry.method] ?? "?";
              const trackColor =
                entry.finalTrack === "err"
                  ? "var(--hex-error, #ef4444)"
                  : "var(--hex-success, #22c55e)";

              return (
                <button
                  key={entry.chain.chainId}
                  data-testid="combinator-chain-item"
                  onClick={() => setSelectedIndex(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "var(--hex-space-xs) var(--hex-space-sm)",
                    border: "none",
                    background: isActive ? "var(--hex-bg-hover, rgba(0,0,0,0.05))" : "transparent",
                    borderLeft: isActive ? "3px solid var(--hex-accent)" : "3px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--hex-text-primary)",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: "var(--hex-bg-secondary, #f3f4f6)",
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    {icon}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.method}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: trackColor,
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {entry.finalTrack === "err" ? "✗" : "✓"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--hex-text-secondary)" }}>
                    {entry.inputCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail view */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <CombinatorMatrixView chain={activeEntry.chain} combinatorData={combinatorData} />
        </div>
      </div>
    </div>
  );
}

function buildSourceNote(
  method: "all" | "allSettled" | "any" | "collect",
  inputs: readonly CombinatorInput[],
  outputTrack: "ok" | "err"
): string {
  const okCount = inputs.filter(i => i.track === "ok").length;
  const errCount = inputs.filter(i => i.track === "err").length;

  if (method === "all" || method === "collect") {
    if (outputTrack === "err") {
      const cause = inputs.find(i => i.isShortCircuitCause);
      const causeLabel = cause !== undefined ? ` (${cause.sourceLabel})` : "";
      return `Failed at input #${(cause?.index ?? 0) + 1}${causeLabel}`;
    }
    return `All ${inputs.length} inputs Ok`;
  }

  if (method === "any") {
    if (outputTrack === "ok") {
      const firstOk = inputs.find(i => i.track === "ok");
      const label = firstOk !== undefined ? ` (${firstOk.sourceLabel})` : "";
      return `First Ok: input #${(firstOk?.index ?? 0) + 1}${label}`;
    }
    return `All ${inputs.length} inputs failed`;
  }

  // allSettled
  return `${okCount} Ok, ${errCount} Err`;
}

// ── Main component ───────────────────────────────────────────────────────────

/**
 * ResultPanel displays Result<T, E> statistics and chain visualizations.
 *
 * Implements PanelProps so it can be registered in getBuiltInPanels().
 */
function ResultPanel({ dataSource }: PanelProps): React.ReactElement {
  const [version, setVersion] = useState(0);

  // Subscribe to data source events to trigger re-renders when chain data arrives
  useEffect(() => {
    const unsubscribe = dataSource.subscribe(event => {
      if (
        event.type === "snapshot-changed" ||
        event.type === "chain-registered" ||
        event.type === "execution-added"
      ) {
        setVersion(v => v + 1);
      }
    });
    return unsubscribe;
  }, [dataSource]);

  void version; // used to trigger re-reads of data source
  const stats = dataSource.getAllResultStatistics();

  // Single hook call at panel level — data is shared across all tabs
  const { mergedChain, mergedExecution, chains, getExecutions, isRealData } =
    useResultChainData(dataSource);

  const hasRealChains = chains.size > 0 && isRealData;

  // Compute chain-based overview for when DI stats are absent
  const chainOverview = hasRealChains ? buildOverviewFromChains(chains, getExecutions) : undefined;

  const [activeView, setActiveView] = useState<ResultViewId>("overview");
  const userSwitchedRef = useRef(false);

  const handleViewSwitch = useCallback((viewId: ResultViewId) => {
    userSwitchedRef.current = true;
    setActiveView(viewId);
  }, []);

  // Empty state: no statistics AND no real chain data
  if (stats === undefined && !hasRealChains) {
    return (
      <div
        data-testid="result-panel-shell"
        role="region"
        aria-label="Result Panel"
        style={{
          padding: "var(--hex-space-xl)",
          overflow: "auto",
          height: "100%",
        }}
      >
        <div
          role="tablist"
          aria-label="Result Panel views"
          style={{
            display: "flex",
            gap: "var(--hex-space-xs)",
            marginBottom: "var(--hex-space-lg)",
            borderBottom: "1px solid var(--hex-border)",
            paddingBottom: "var(--hex-space-sm)",
          }}
        >
          {VIEWS.map(v => (
            <button
              key={v.id}
              role="tab"
              aria-selected={v.id === activeView}
              onClick={() => handleViewSwitch(v.id)}
              style={{
                padding: "var(--hex-space-xs) var(--hex-space-md)",
                border: "none",
                borderBottom:
                  v.id === activeView ? "2px solid var(--hex-accent)" : "2px solid transparent",
                backgroundColor: "transparent",
                color: v.id === activeView ? "var(--hex-text-primary)" : "var(--hex-text-muted)",
                fontWeight: v.id === activeView ? 600 : 400,
                fontSize: "var(--hex-font-size-sm)",
                fontFamily: "var(--hex-font-sans)",
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <EmptyState
          icon={"\uD83D\uDD0D"}
          message="No Result data"
          description="Run your code to see Result<T, E> statistics and chain visualizations."
        />
      </div>
    );
  }

  // Normal render with data
  return (
    <div
      data-testid="result-panel-shell"
      role="region"
      aria-label="Result Panel"
      style={{
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* View tab bar */}
      <div
        role="tablist"
        aria-label="Result Panel views"
        style={{
          display: "flex",
          gap: "var(--hex-space-xs)",
          padding: "var(--hex-space-sm) var(--hex-space-xl)",
          borderBottom: "1px solid var(--hex-border)",
          flexShrink: 0,
        }}
      >
        {VIEWS.map(v => (
          <button
            key={v.id}
            role="tab"
            aria-selected={v.id === activeView}
            onClick={() => handleViewSwitch(v.id)}
            style={{
              padding: "var(--hex-space-xs) var(--hex-space-md)",
              border: "none",
              borderBottom:
                v.id === activeView ? "2px solid var(--hex-accent)" : "2px solid transparent",
              backgroundColor: "transparent",
              color: v.id === activeView ? "var(--hex-text-primary)" : "var(--hex-text-muted)",
              fontWeight: v.id === activeView ? 600 : 400,
              fontSize: "var(--hex-font-size-sm)",
              fontFamily: "var(--hex-font-sans)",
              cursor: "pointer",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Active view content */}
      <div
        style={{
          flex: 1,
          overflow: activeView === "railway" || activeView === "log" ? "hidden" : "auto",
          padding: activeView === "railway" || activeView === "log" ? 0 : "var(--hex-space-xl)",
        }}
      >
        {activeView === "overview" ? (
          <OverviewContent stats={stats ?? new Map()} chainOverview={chainOverview} />
        ) : activeView === "railway" ? (
          <RailwayContent
            chains={chains}
            getExecutions={getExecutions}
            isRealData={isRealData}
          />
        ) : activeView === "log" ? (
          <LogContent mergedChain={mergedChain} mergedExecution={mergedExecution} />
        ) : activeView === "cases" ? (
          <CasesContent chains={chains} getExecutions={getExecutions} />
        ) : activeView === "sankey" ? (
          <SankeyContent chains={chains} getExecutions={getExecutions} />
        ) : activeView === "waterfall" ? (
          <WaterfallContent chains={chains} getExecutions={getExecutions} />
        ) : activeView === "combinator" ? (
          <CombinatorContent chains={chains} getExecutions={getExecutions} />
        ) : (
          <ViewPlaceholder viewId={activeView} />
        )}
      </div>
    </div>
  );
}

export { ResultPanel };
