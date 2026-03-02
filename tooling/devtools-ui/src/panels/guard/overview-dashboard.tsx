/**
 * OverviewDashboard — Summary dashboard for the Guard Panel.
 *
 * Renders stat cards for total evaluations, global allow rate,
 * port count, role count, and recent activity summaries.
 *
 * Spec: 03-views-and-wireframes.md (3.9), 11-interactions.md (11.10)
 *
 * @packageDocumentation
 */

import { getAllowRateZoneColor } from "./visual-encoding.js";
import type { GuardPanelSnapshot } from "./types.js";

// ── Props ───────────────────────────────────────────────────────────────────

interface OverviewDashboardProps {
  readonly snapshot: GuardPanelSnapshot;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

// ── Component ───────────────────────────────────────────────────────────────

function OverviewDashboard({ snapshot }: OverviewDashboardProps): React.ReactElement {
  const allowRatePct = Math.round(snapshot.globalAllowRate * 100);
  const allowZone = getAllowRateZoneColor(snapshot.globalAllowRate);
  const portCount = snapshot.portStats.size;
  const roleCount = snapshot.roleHierarchy.length;
  const descriptorCount = snapshot.descriptors.size;
  const recentCount = snapshot.recentExecutions.length;

  // ── Compute deny breakdown ──────────────────────────────────────────────

  const denyReasons = new Map<string, number>();
  for (const exec of snapshot.recentExecutions) {
    if (exec.decision === "deny" && exec.reason) {
      denyReasons.set(exec.reason, (denyReasons.get(exec.reason) ?? 0) + 1);
    }
  }
  const topDenyReasons = [...denyReasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── Allow/deny counts ───────────────────────────────────────────────────

  let allowCount = 0;
  let denyCount = 0;
  for (const exec of snapshot.recentExecutions) {
    if (exec.decision === "allow") allowCount++;
    else denyCount++;
  }

  const statCardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--hex-space-xxs)",
    padding: "var(--hex-space-md)",
    backgroundColor: "var(--hex-bg-secondary)",
    borderRadius: "var(--hex-radius-md)",
    border: "1px solid var(--hex-border)",
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: "var(--hex-font-size-xs)",
    color: "var(--hex-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: 500,
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: "var(--hex-font-size-xxl, 20px)",
    fontWeight: "var(--hex-font-weight-semibold)" as never,
    color: "var(--hex-text-primary)",
    fontFamily: "var(--hex-font-mono)",
  };

  const allowRateValueColor =
    allowZone === "green"
      ? "var(--hex-guard-allow)"
      : allowZone === "amber"
        ? "var(--hex-guard-amber, #f59e0b)"
        : "var(--hex-guard-deny)";

  return (
    <div
      data-testid="guard-overview-dashboard"
      role="region"
      aria-label="Guard overview dashboard"
      style={{
        padding: "var(--hex-space-lg)",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--hex-space-lg)",
      }}
    >
      {/* Stat cards */}
      <div
        data-testid="guard-overview-stat-cards"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "var(--hex-space-md)",
        }}
      >
        <div data-testid="guard-stat-total-evaluations" style={statCardStyle}>
          <span style={statLabelStyle}>Total Evaluations</span>
          <span style={statValueStyle}>{formatCount(snapshot.totalEvaluationsObserved)}</span>
        </div>

        <div data-testid="guard-stat-allow-rate" data-zone={allowZone} style={statCardStyle}>
          <span style={statLabelStyle}>Allow Rate</span>
          <span style={{ ...statValueStyle, color: allowRateValueColor }}>{allowRatePct}%</span>
        </div>

        <div data-testid="guard-stat-ports" style={statCardStyle}>
          <span style={statLabelStyle}>Guarded Ports</span>
          <span style={statValueStyle}>{portCount}</span>
        </div>

        <div data-testid="guard-stat-descriptors" style={statCardStyle}>
          <span style={statLabelStyle}>Policy Trees</span>
          <span style={statValueStyle}>{descriptorCount}</span>
        </div>

        <div data-testid="guard-stat-roles" style={statCardStyle}>
          <span style={statLabelStyle}>Roles</span>
          <span style={statValueStyle}>{roleCount}</span>
        </div>

        <div data-testid="guard-stat-recent" style={statCardStyle}>
          <span style={statLabelStyle}>Recent Executions</span>
          <span style={statValueStyle}>{recentCount}</span>
        </div>
      </div>

      {/* Allow/deny split */}
      <div
        data-testid="guard-overview-decision-split"
        style={{
          display: "flex",
          gap: "var(--hex-space-lg)",
          padding: "var(--hex-space-md)",
          backgroundColor: "var(--hex-bg-secondary)",
          borderRadius: "var(--hex-radius-md)",
          border: "1px solid var(--hex-border)",
        }}
      >
        <span
          data-testid="guard-overview-allow-count"
          style={{
            fontSize: "var(--hex-font-size-sm)",
            fontWeight: 600,
            color: "var(--hex-guard-allow)",
            fontFamily: "var(--hex-font-mono)",
          }}
        >
          {formatCount(allowCount)} allow
        </span>
        <span
          data-testid="guard-overview-deny-count"
          style={{
            fontSize: "var(--hex-font-size-sm)",
            fontWeight: 600,
            color: "var(--hex-guard-deny)",
            fontFamily: "var(--hex-font-mono)",
          }}
        >
          {formatCount(denyCount)} deny
        </span>
      </div>

      {/* Top deny reasons */}
      {topDenyReasons.length > 0 && (
        <div
          data-testid="guard-overview-top-deny-reasons"
          style={{
            padding: "var(--hex-space-md)",
            backgroundColor: "var(--hex-bg-secondary)",
            borderRadius: "var(--hex-radius-md)",
            border: "1px solid var(--hex-border)",
          }}
        >
          <h4
            style={{
              fontSize: "var(--hex-font-size-xs)",
              color: "var(--hex-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: 600,
              margin: "0 0 var(--hex-space-sm) 0",
            }}
          >
            Top Deny Reasons
          </h4>
          {topDenyReasons.map(([reason, count]) => (
            <div
              key={reason}
              data-testid="guard-overview-deny-reason"
              data-count={count}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "var(--hex-font-size-sm)",
                padding: "2px 0",
              }}
            >
              <span style={{ color: "var(--hex-text-primary)" }}>{reason}</span>
              <span style={{ color: "var(--hex-text-muted)", fontFamily: "var(--hex-font-mono)" }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Per-port summary */}
      <div
        data-testid="guard-overview-port-summary"
        role="list"
        style={{ padding: "var(--hex-space-md) 0" }}
      >
        {[...snapshot.portStats.values()].map(port => {
          const zone = getAllowRateZoneColor(port.allowRate);
          return (
            <div
              key={port.portName}
              data-testid="guard-overview-port-card"
              data-port={port.portName}
              data-zone={zone}
              role="listitem"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--hex-space-sm)",
                padding: "var(--hex-space-xs) var(--hex-space-sm)",
                fontSize: "var(--hex-font-size-sm)",
                borderRadius: "var(--hex-radius-sm)",
                transition: "background-color var(--hex-transition-fast)",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontFamily: "var(--hex-font-mono)",
                  color: "var(--hex-text-primary)",
                }}
              >
                {port.portName}
              </span>
              <span style={{ color: "var(--hex-text-muted)" }}>{port.totalEvaluations} evals</span>
              <span style={{ color: "var(--hex-text-muted)" }}>
                {Math.round(port.allowRate * 100)}% allow
              </span>
              <span style={{ color: "var(--hex-text-muted)" }}>{port.uniqueSubjects} subjects</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { OverviewDashboard };
export type { OverviewDashboardProps };
