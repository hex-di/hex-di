/**
 * AccessFlowStatistics — SVG Sankey-style diagram of guard access flows.
 *
 * Visualizes the flow of subjects through policy evaluations, showing
 * allow/deny proportions per port with a Sankey-inspired layout.
 *
 * Spec: 03-views-and-wireframes.md (3.6), 09-sankey-statistics.md
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import { getAllowRateZoneColor, getDecisionColor } from "./visual-encoding.js";
import type { GuardPanelSnapshot, GuardPortStatistics } from "./types.js";

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

// ── Helpers ─────────────────────────────────────────────────────────────────

const ZONE_COLOR_MAP: Record<"green" | "amber" | "red", string> = {
  green: "var(--hex-guard-allow, #22c55e)",
  amber: "var(--hex-guard-skip, #eab308)",
  red: "var(--hex-guard-deny, #ef4444)",
};

function zoneToColor(zone: "green" | "amber" | "red"): string {
  return ZONE_COLOR_MAP[zone];
}

// ── Props ───────────────────────────────────────────────────────────────────

interface AccessFlowStatisticsProps {
  readonly snapshot: GuardPanelSnapshot;
  readonly portStats: ReadonlyMap<string, GuardPortStatistics>;
}

// ── Constants ───────────────────────────────────────────────────────────────

const SVG_WIDTH = 800;
const SVG_HEIGHT = 400;
const PORT_BAR_WIDTH = 120;
const PORT_BAR_GAP = 16;
const MARGIN_LEFT = 40;
const MARGIN_TOP = 40;
const BAR_HEIGHT = 32;

// ── Component ───────────────────────────────────────────────────────────────

function AccessFlowStatistics({
  snapshot,
  portStats,
}: AccessFlowStatisticsProps): React.ReactElement {
  const ports = useMemo(() => [...portStats.values()], [portStats]);

  const totalEvaluations = snapshot.totalEvaluationsObserved;
  const globalAllowRate = snapshot.globalAllowRate;
  const globalZone = getAllowRateZoneColor(globalAllowRate);
  const globalZoneColor = zoneToColor(globalZone);

  return (
    <div
      data-testid="guard-access-flow"
      role="img"
      aria-label={`Access flow statistics: ${totalEvaluations} evaluations, ${Math.round(globalAllowRate * 100)}% allow rate`}
      style={VIEW_CONTAINER_STYLE}
    >
      {/* Global summary */}
      <div
        data-testid="guard-access-flow-summary"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "16px 20px",
          backgroundColor: "var(--hex-bg-secondary, #1e293b)",
          borderRadius: "8px",
          borderLeft: `4px solid ${globalZoneColor}`,
        }}
      >
        <span
          data-testid="guard-access-flow-total"
          style={{ textAlign: "center", minWidth: "70px" }}
        >
          <div style={STAT_VALUE_STYLE}>{totalEvaluations}</div>
          <div style={STAT_LABEL_STYLE}>evaluations</div>
        </span>
        <span
          data-testid="guard-access-flow-rate"
          data-zone={globalZone}
          style={{ textAlign: "center", minWidth: "70px" }}
        >
          <div style={{ ...STAT_VALUE_STYLE, color: globalZoneColor }}>
            {Math.round(globalAllowRate * 100)}%
          </div>
          <div style={STAT_LABEL_STYLE}>allow</div>
        </span>
        <span
          data-testid="guard-access-flow-ports"
          style={{ textAlign: "center", minWidth: "70px" }}
        >
          <div style={STAT_VALUE_STYLE}>{ports.length}</div>
          <div style={STAT_LABEL_STYLE}>ports</div>
        </span>
      </div>

      {/* SVG Sankey placeholder */}
      <div style={SVG_CARD_STYLE}>
        <svg
          data-testid="guard-access-flow-svg"
          width="100%"
          height={SVG_HEIGHT}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          style={{ display: "block" }}
        >
          {/* Title */}
          <text
            x={SVG_WIDTH / 2}
            y={20}
            textAnchor="middle"
            fontSize={14}
            fill="var(--hex-text-primary, #e4e4f0)"
            fontFamily="var(--hex-font-sans, sans-serif)"
          >
            Access Flow
          </text>

          {/* Port bars */}
          {ports.map((port, index) => {
            const x = MARGIN_LEFT;
            const y = MARGIN_TOP + index * (BAR_HEIGHT + PORT_BAR_GAP);
            const zone = getAllowRateZoneColor(port.allowRate);
            const allowWidth =
              port.totalEvaluations > 0
                ? (port.allowCount / port.totalEvaluations) * PORT_BAR_WIDTH
                : 0;
            const denyWidth = PORT_BAR_WIDTH - allowWidth;

            return (
              <g
                key={port.portName}
                data-testid={`guard-access-flow-port-${port.portName}`}
                data-zone={zone}
              >
                {/* Port label */}
                <text
                  x={x + PORT_BAR_WIDTH + 12}
                  y={y + BAR_HEIGHT / 2 + 4}
                  fontSize={11}
                  fill="var(--hex-text-primary, #e4e4f0)"
                  fontFamily="var(--hex-font-mono, monospace)"
                >
                  {port.portName}
                </text>

                {/* Allow segment */}
                <rect
                  x={x}
                  y={y}
                  width={Math.max(allowWidth, 0)}
                  height={BAR_HEIGHT}
                  fill={getDecisionColor("allow")}
                  rx={4}
                  opacity={0.8}
                />

                {/* Deny segment */}
                <rect
                  x={x + allowWidth}
                  y={y}
                  width={Math.max(denyWidth, 0)}
                  height={BAR_HEIGHT}
                  fill={getDecisionColor("deny")}
                  rx={4}
                  opacity={0.8}
                />

                {/* Counts */}
                <text
                  x={x + PORT_BAR_WIDTH + 12}
                  y={y + BAR_HEIGHT / 2 + 16}
                  fontSize={10}
                  fill="var(--hex-text-muted, #6b6b80)"
                  fontFamily="var(--hex-font-mono, monospace)"
                >
                  {port.allowCount}A / {port.denyCount}D ({Math.round(port.allowRate * 100)}%)
                </text>
              </g>
            );
          })}

          {/* Empty placeholder if no ports */}
          {ports.length === 0 && (
            <text
              x={SVG_WIDTH / 2}
              y={SVG_HEIGHT / 2}
              textAnchor="middle"
              fontSize={14}
              fill="var(--hex-text-muted, #6b6b80)"
            >
              No access flow data available
            </text>
          )}
        </svg>
      </div>

      {/* Per-port detail cards */}
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
          Port Details
        </div>

        <div data-testid="guard-access-flow-details" role="list">
          {ports.map(port => {
            const zone = getAllowRateZoneColor(port.allowRate);

            return (
              <div
                key={port.portName}
                data-testid="guard-access-flow-detail"
                data-port={port.portName}
                data-zone={zone}
                role="listitem"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  fontSize: "12px",
                  borderBottom: "1px solid var(--hex-border, #334155)",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontFamily: "var(--hex-font-mono, monospace)",
                  }}
                >
                  {port.portName}
                </span>
                <span
                  style={{
                    color: "var(--hex-text-muted, #94a3b8)",
                    fontFamily: "var(--hex-font-mono, monospace)",
                  }}
                >
                  {port.totalEvaluations} evals
                </span>
                <span
                  style={{
                    color: "var(--hex-text-muted, #94a3b8)",
                    fontFamily: "var(--hex-font-mono, monospace)",
                  }}
                >
                  {port.uniqueSubjects} subjects
                </span>
                {port.topDenyReason && (
                  <span
                    data-testid="guard-access-flow-top-deny"
                    style={{
                      color: "var(--hex-text-muted, #6b6b80)",
                      fontStyle: "italic",
                    }}
                  >
                    Top deny: {port.topDenyReason}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { AccessFlowStatistics };
export type { AccessFlowStatisticsProps };
