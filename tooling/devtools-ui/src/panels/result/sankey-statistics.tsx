/**
 * SankeyStatisticsView — Sankey flow diagram for Result chain statistics.
 *
 * Spec: 07-sankey-statistics.md (7.1-7.8), 10-visual-encoding.md (10.9, 10.12)
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useState } from "react";
import { TRACK_COLORS, getStabilityZoneColor } from "./visual-encoding.js";
import type { ResultChainDescriptor, ResultPortStatistics } from "./types.js";

// ── Types ───────────────────────────────────────────────────────────────────

interface FlowData {
  readonly operationIndex: number;
  readonly okToOk: number;
  readonly okToErr: number;
  readonly errToOk: number;
  readonly errToErr: number;
}

interface StabilityPoint {
  readonly timestamp: number;
  readonly score: number;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface SankeyStatisticsViewProps {
  readonly chain: ResultChainDescriptor;
  readonly flows: readonly FlowData[];
  readonly portStats: ResultPortStatistics;
  readonly stabilityHistory: readonly StabilityPoint[];
}

// ── Derived link data ───────────────────────────────────────────────────────

interface SankeyLink {
  readonly colIndex: number;
  readonly from: "ok" | "err";
  readonly to: "ok" | "err";
  readonly count: number;
}

function computeLinks(flows: readonly FlowData[]): SankeyLink[] {
  const links: SankeyLink[] = [];
  for (const flow of flows) {
    if (flow.okToOk > 0)
      links.push({ colIndex: flow.operationIndex, from: "ok", to: "ok", count: flow.okToOk });
    if (flow.okToErr > 0)
      links.push({ colIndex: flow.operationIndex, from: "ok", to: "err", count: flow.okToErr });
    if (flow.errToOk > 0)
      links.push({ colIndex: flow.operationIndex, from: "err", to: "ok", count: flow.errToOk });
    if (flow.errToErr > 0)
      links.push({ colIndex: flow.operationIndex, from: "err", to: "err", count: flow.errToErr });
  }
  return links;
}

// ── Hotspot data ────────────────────────────────────────────────────────────

interface HotspotRow {
  readonly errorType: string;
  readonly count: number;
}

function computeHotspots(portStats: ResultPortStatistics): HotspotRow[] {
  const rows: HotspotRow[] = [];
  for (const [errorType, count] of portStats.errorsByCode) {
    rows.push({ errorType, count });
  }
  return rows.sort((a, b) => b.count - a.count);
}

// ── Link color helper ───────────────────────────────────────────────────────

function getLinkColor(from: "ok" | "err", to: "ok" | "err"): string {
  if (from === "ok" && to === "ok") return TRACK_COLORS.ok;
  if (from === "err" && to === "err") return TRACK_COLORS.err;
  return TRACK_COLORS.warning; // cross-track transitions
}

function getLinkOpacity(from: "ok" | "err", to: "ok" | "err"): number {
  if (from === to) return 0.3;
  return 0.5;
}

// ── Sparkline color helper ──────────────────────────────────────────────────

function getSparklineColor(score: number): string {
  const zone = getStabilityZoneColor(score);
  if (zone === "green") return TRACK_COLORS.ok;
  if (zone === "amber") return TRACK_COLORS.warning;
  return TRACK_COLORS.err;
}

// ── Component ───────────────────────────────────────────────────────────────

function SankeyStatisticsView({
  chain,
  flows,
  portStats,
  stabilityHistory,
}: SankeyStatisticsViewProps): React.ReactElement {
  const [hoveredNode, setHoveredNode] = useState<string | undefined>(undefined);
  const [hoveredLink, setHoveredLink] = useState<number | undefined>(undefined);
  const [hoveredSparkline, setHoveredSparkline] = useState<number | undefined>(undefined);
  const [minFlow, setMinFlow] = useState(0);
  const [timeRange, setTimeRange] = useState("all");
  const [hotspotSortDir, setHotspotSortDir] = useState<"asc" | "desc">("desc");

  // ── Computed ──────────────────────────────────────────────────────────

  const links = useMemo(() => computeLinks(flows), [flows]);
  const hotspots = useMemo(() => {
    const rows = computeHotspots(portStats);
    return hotspotSortDir === "desc" ? rows : [...rows].sort((a, b) => a.count - b.count);
  }, [portStats, hotspotSortDir]);

  const columnData = useMemo(() => {
    return flows.map(flow => ({
      index: flow.operationIndex,
      okCount: flow.okToOk + flow.errToOk,
      errCount: flow.okToErr + flow.errToErr,
      label: chain.operations[flow.operationIndex]?.label ?? `#${flow.operationIndex}`,
      method: chain.operations[flow.operationIndex]?.method ?? "unknown",
    }));
  }, [flows, chain.operations]);

  const recoveryHeroes = useMemo(() => {
    return flows
      .filter(f => f.errToOk > 0)
      .map(f => ({
        operationIndex: f.operationIndex,
        recoveryRate: f.errToOk / (f.errToOk + f.errToErr),
        recoveryCount: f.errToOk,
        label: chain.operations[f.operationIndex]?.label ?? `#${f.operationIndex}`,
        method: chain.operations[f.operationIndex]?.method ?? "unknown",
      }));
  }, [flows, chain.operations]);

  // Max count for proportional node heights
  const maxCount = useMemo(() => {
    let max = 1;
    for (const col of columnData) {
      if (col.okCount > max) max = col.okCount;
      if (col.errCount > max) max = col.errCount;
    }
    return max;
  }, [columnData]);

  // Derived stats
  const okRate =
    portStats.totalCalls > 0
      ? Math.round((portStats.okCount / portStats.totalCalls) * 1000) / 10
      : 100;
  const stabilityPct = Math.round(portStats.stabilityScore * 100);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleMinFlowChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMinFlow(Number(e.target.value));
  }, []);

  const handleTimeRangeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(e.target.value);
  }, []);

  const toggleHotspotSort = useCallback(() => {
    setHotspotSortDir(prev => (prev === "desc" ? "asc" : "desc"));
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="sankey-statistics-view"
      style={{
        fontFamily: "var(--hex-font-sans, system-ui, sans-serif)",
        fontSize: "13px",
        color: "var(--hex-text-primary, #e2e8f0)",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Port Summary Header */}
      <div
        data-testid="sankey-port-summary"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "16px 20px",
          backgroundColor: "var(--hex-bg-secondary, #1e293b)",
          borderRadius: "8px",
          borderLeft: `4px solid ${okRate >= 95 ? TRACK_COLORS.ok : okRate >= 80 ? TRACK_COLORS.warning : TRACK_COLORS.err}`,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--hex-text-primary, #e2e8f0)",
              marginBottom: "2px",
            }}
          >
            {portStats.portName}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--hex-text-muted, #94a3b8)",
            }}
          >
            {chain.label} - {chain.operations.length} operations
          </div>
        </div>

        <StatBox label="Total Calls" value={portStats.totalCalls.toLocaleString()} />
        <StatBox
          label="Ok Rate"
          value={`${okRate}%`}
          color={
            okRate >= 95 ? TRACK_COLORS.ok : okRate >= 80 ? TRACK_COLORS.warning : TRACK_COLORS.err
          }
        />
        <StatBox
          label="Errors"
          value={portStats.errCount.toLocaleString()}
          color={portStats.errCount > 0 ? TRACK_COLORS.err : undefined}
        />
        <StatBox
          label="Stability"
          value={`${stabilityPct}%`}
          color={getSparklineColor(portStats.stabilityScore)}
        />
      </div>

      {/* Controls */}
      <div
        data-testid="sankey-controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "8px 12px",
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
          Time Range
          <select
            data-testid="time-range-selector"
            value={timeRange}
            onChange={handleTimeRangeChange}
            style={{
              backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
              color: "var(--hex-text-primary, #e2e8f0)",
              border: "1px solid var(--hex-border, #334155)",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "12px",
            }}
          >
            <option value="5m">5 minutes</option>
            <option value="1h">1 hour</option>
            <option value="24h">24 hours</option>
            <option value="all">All time</option>
          </select>
        </label>

        <div
          data-testid="port-filter"
          style={{
            padding: "4px 10px",
            backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
            border: "1px solid var(--hex-border, #334155)",
            borderRadius: "4px",
            color: "var(--hex-text-muted, #94a3b8)",
          }}
        >
          All ports
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--hex-text-muted, #94a3b8)",
            flex: 1,
          }}
        >
          Min Flow: {minFlow}
          <input
            data-testid="min-flow-filter"
            type="range"
            min="0"
            max="500"
            value={minFlow}
            onChange={handleMinFlowChange}
            style={{ flex: 1, accentColor: TRACK_COLORS.ok }}
          />
        </label>
      </div>

      {/* Sankey Diagram */}
      <div
        data-testid="sankey-diagram"
        style={{
          position: "relative",
          padding: "20px 0",
          backgroundColor: "var(--hex-bg-secondary, #1e293b)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {/* Column layout */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "flex-end",
            padding: "0 24px",
            minHeight: "180px",
            position: "relative",
          }}
        >
          {columnData.map(col => {
            const okHeight = Math.max(4, Math.round((col.okCount / maxCount) * 120));
            const errHeight = Math.max(
              col.errCount > 0 ? 4 : 0,
              Math.round((col.errCount / maxCount) * 120)
            );
            const total = col.okCount + col.errCount;

            return (
              <div
                key={col.index}
                data-testid="sankey-column"
                data-operation-index={col.index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  minWidth: "60px",
                }}
              >
                {/* Method label */}
                <div
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--hex-font-mono, monospace)",
                    color: "var(--hex-text-muted, #94a3b8)",
                    textAlign: "center",
                    marginBottom: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.method}
                </div>

                {/* Ok node */}
                <div
                  data-testid="sankey-ok-node"
                  data-track="ok"
                  data-count={col.okCount}
                  data-hovered={hoveredNode === `ok-${col.index}` ? "true" : "false"}
                  onMouseEnter={() => setHoveredNode(`ok-${col.index}`)}
                  onMouseLeave={() => setHoveredNode(undefined)}
                  style={{
                    width: "40px",
                    height: `${okHeight}px`,
                    backgroundColor: TRACK_COLORS.ok,
                    borderRadius: "4px 4px 0 0",
                    opacity:
                      hoveredNode !== undefined && hoveredNode !== `ok-${col.index}` ? 0.4 : 1,
                    transition: "opacity 0.15s",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  {okHeight > 16 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        fontSize: "9px",
                        fontWeight: 700,
                        color: "#064e3b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.okCount}
                    </span>
                  )}
                </div>

                {/* Err node */}
                <div
                  data-testid="sankey-err-node"
                  data-track="err"
                  data-count={col.errCount}
                  data-hovered={hoveredNode === `err-${col.index}` ? "true" : "false"}
                  onMouseEnter={() => setHoveredNode(`err-${col.index}`)}
                  onMouseLeave={() => setHoveredNode(undefined)}
                  style={{
                    width: "40px",
                    height: `${errHeight}px`,
                    backgroundColor: col.errCount > 0 ? TRACK_COLORS.err : "transparent",
                    borderRadius: "0 0 4px 4px",
                    opacity:
                      hoveredNode !== undefined && hoveredNode !== `err-${col.index}` ? 0.4 : 1,
                    transition: "opacity 0.15s",
                    cursor: col.errCount > 0 ? "pointer" : "default",
                    position: "relative",
                  }}
                >
                  {errHeight > 16 && col.errCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        fontSize: "9px",
                        fontWeight: 700,
                        color: "#7f1d1d",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.errCount}
                    </span>
                  )}
                </div>

                {/* Total label */}
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--hex-text-muted, #94a3b8)",
                    textAlign: "center",
                    marginTop: "2px",
                  }}
                >
                  {total}
                </div>

                {/* Operation label */}
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "var(--hex-text-primary, #e2e8f0)",
                    textAlign: "center",
                  }}
                >
                  {col.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Links — rendered as styled bars between columns */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            padding: "12px 24px 0",
            borderTop: "1px solid var(--hex-border, #334155)",
            marginTop: "12px",
          }}
        >
          {links.map((link, i) => {
            const visible = link.count >= minFlow;
            const color = getLinkColor(link.from, link.to);
            const opacity = getLinkOpacity(link.from, link.to);

            return (
              <div
                key={i}
                data-testid="sankey-link"
                data-from={link.from}
                data-to={link.to}
                data-count={link.count}
                data-visible={visible ? "true" : "false"}
                onMouseEnter={() => setHoveredLink(i)}
                onMouseLeave={() => setHoveredLink(undefined)}
                style={{
                  display: visible ? "flex" : "none",
                  alignItems: "center",
                  gap: "6px",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  backgroundColor: color,
                  opacity: hoveredLink !== undefined && hoveredLink !== i ? 0.2 : opacity,
                  transition: "opacity 0.15s",
                  fontSize: "10px",
                  fontFamily: "var(--hex-font-mono, monospace)",
                  color: "#000",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: link.from === "ok" ? "#166534" : "#991b1b",
                  }}
                />
                <span>{link.from}</span>
                <span style={{ color: "#475569" }}>{"\u2192"}</span>
                <span>{link.to}</span>
                <span style={{ marginLeft: "auto", fontWeight: 700 }}>{link.count}</span>
                <span style={{ fontSize: "9px", color: "#475569" }}>@op{link.colIndex}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {(hoveredNode !== undefined || hoveredLink !== undefined) && (
        <div
          data-testid="sankey-tooltip"
          style={{
            position: "fixed",
            top: "50%",
            right: "20px",
            transform: "translateY(-50%)",
            padding: "8px 12px",
            backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
            border: "1px solid var(--hex-border, #334155)",
            borderRadius: "6px",
            fontSize: "11px",
            color: "var(--hex-text-primary, #e2e8f0)",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {hoveredNode && <span>Node: {hoveredNode}</span>}
          {hoveredLink !== undefined && links[hoveredLink] && (
            <span>
              Link: {links[hoveredLink].from} {"\u2192"} {links[hoveredLink].to} (
              {links[hoveredLink].count})
            </span>
          )}
        </div>
      )}

      {/* Bottom panels — side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Error Hotspot Table */}
        <div
          data-testid="error-hotspot-table"
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
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {"\u{1F525}"} Error Hotspots
          </div>

          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px",
              padding: "6px 16px",
              borderBottom: "1px solid var(--hex-border, #334155)",
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--hex-text-muted, #94a3b8)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            <span>Error Type</span>
            <div
              data-testid="hotspot-sort-count"
              data-sort-dir={hotspotSortDir}
              onClick={toggleHotspotSort}
              style={{
                cursor: "pointer",
                textAlign: "right",
                userSelect: "none",
              }}
            >
              Count {hotspotSortDir === "desc" ? "\u25BC" : "\u25B2"}
            </div>
          </div>

          {/* Table rows */}
          {hotspots.length === 0 ? (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                color: "var(--hex-text-muted, #94a3b8)",
                fontSize: "12px",
              }}
            >
              No errors recorded
            </div>
          ) : (
            hotspots.map(row => {
              const pct =
                portStats.totalCalls > 0
                  ? Math.round((row.count / portStats.totalCalls) * 1000) / 10
                  : 0;
              return (
                <div
                  key={row.errorType}
                  data-testid="hotspot-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px",
                    padding: "8px 16px",
                    borderBottom: "1px solid var(--hex-border, #334155)",
                    fontSize: "12px",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span
                      style={{
                        fontFamily: "var(--hex-font-mono, monospace)",
                        color: TRACK_COLORS.err,
                        fontWeight: 500,
                      }}
                    >
                      {row.errorType}
                    </span>
                    <div
                      style={{
                        height: "3px",
                        backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
                        borderRadius: "2px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, pct * 2)}%`,
                          backgroundColor: TRACK_COLORS.err,
                          borderRadius: "2px",
                          opacity: 0.6,
                        }}
                      />
                    </div>
                  </div>
                  <span
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--hex-font-mono, monospace)",
                      fontWeight: 600,
                      color: "var(--hex-text-primary, #e2e8f0)",
                    }}
                  >
                    {row.count}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Right column: Recovery Heroes + Sparkline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Recovery Heroes */}
          <div
            data-testid="recovery-heroes"
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
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {"\u21A9"} Recovery Heroes
            </div>

            {recoveryHeroes.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  color: "var(--hex-text-muted, #94a3b8)",
                  fontSize: "12px",
                }}
              >
                No recovery operations
              </div>
            ) : (
              recoveryHeroes.map(hero => {
                const ratePct = Math.round(hero.recoveryRate * 100);
                return (
                  <div
                    key={hero.operationIndex}
                    data-testid="recovery-hero"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 16px",
                      borderBottom: "1px solid var(--hex-border, #334155)",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: `${TRACK_COLORS.ok}20`,
                        border: `2px solid ${TRACK_COLORS.ok}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: TRACK_COLORS.ok,
                        flexShrink: 0,
                      }}
                    >
                      {ratePct}%
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--hex-text-primary, #e2e8f0)",
                        }}
                      >
                        #{hero.operationIndex} {hero.label}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--hex-text-muted, #94a3b8)",
                          fontFamily: "var(--hex-font-mono, monospace)",
                        }}
                      >
                        {hero.method} - {hero.recoveryCount} recoveries
                      </div>
                    </div>
                    {/* Recovery bar */}
                    <div
                      style={{
                        width: "60px",
                        height: "6px",
                        backgroundColor: "var(--hex-bg-tertiary, #0f172a)",
                        borderRadius: "3px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${ratePct}%`,
                          backgroundColor: TRACK_COLORS.ok,
                          borderRadius: "3px",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Stability Sparkline */}
          <div
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
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {"\u{1F4C8}"} Stability Trend
            </div>

            <div
              data-testid="stability-sparkline"
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "3px",
                padding: "16px",
                height: "60px",
              }}
            >
              {stabilityHistory.map((point, i) => {
                const barHeight = Math.max(4, Math.round(point.score * 40));
                const color = getSparklineColor(point.score);
                return (
                  <span
                    key={i}
                    data-testid="sparkline-point"
                    data-score={point.score}
                    data-timestamp={point.timestamp}
                    onMouseEnter={() => setHoveredSparkline(i)}
                    onMouseLeave={() => setHoveredSparkline(undefined)}
                    style={{
                      flex: 1,
                      height: `${barHeight}px`,
                      backgroundColor: color,
                      borderRadius: "2px 2px 0 0",
                      opacity: hoveredSparkline !== undefined && hoveredSparkline !== i ? 0.4 : 0.8,
                      transition: "opacity 0.15s",
                      cursor: "pointer",
                      minWidth: "4px",
                    }}
                  />
                );
              })}
            </div>

            {hoveredSparkline !== undefined && stabilityHistory[hoveredSparkline] && (
              <div
                data-testid="sparkline-tooltip"
                style={{
                  padding: "6px 16px",
                  borderTop: "1px solid var(--hex-border, #334155)",
                  fontSize: "11px",
                  color: "var(--hex-text-muted, #94a3b8)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    color: getSparklineColor(stabilityHistory[hoveredSparkline].score),
                    fontWeight: 600,
                  }}
                >
                  {Math.round(stabilityHistory[hoveredSparkline].score * 100)}%
                </span>
                <span>at {stabilityHistory[hoveredSparkline].timestamp}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat box sub-component ──────────────────────────────────────────────────

function StatBox({
  label,
  value,
  color,
}: {
  readonly label: string;
  readonly value: string;
  readonly color?: string;
}): React.ReactElement {
  return (
    <div style={{ textAlign: "center", minWidth: "70px" }}>
      <div
        style={{
          fontSize: "18px",
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

export { SankeyStatisticsView };
export type { SankeyStatisticsViewProps, FlowData };
