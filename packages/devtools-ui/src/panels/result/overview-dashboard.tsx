/**
 * OverviewDashboardView — Summary dashboard for the Result Panel.
 *
 * Spec: 03-views-and-wireframes.md (3.7), 11-interactions.md (11.10)
 *
 * @packageDocumentation
 */

import { useCallback } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface PortSummary {
  readonly portName: string;
  readonly okRate: number;
  readonly errCount: number;
  readonly stabilityHistory: readonly number[];
}

interface ErrorRow {
  readonly portName: string;
  readonly errorType: string;
  readonly count: number;
  readonly lastSeen: number;
}

interface ErrorSegment {
  readonly errorType: string;
  readonly count: number;
  readonly percentage: number;
}

interface DashboardData {
  readonly totalCalls: number;
  readonly okRate: number;
  readonly okRateTrend: "up" | "down" | "stable";
  readonly chainCount: number;
  readonly activeErrPorts: number;
  readonly portSummaries: readonly PortSummary[];
  readonly topErrors: readonly ErrorRow[];
  readonly errorDistribution: readonly ErrorSegment[];
}

// ── Props ───────────────────────────────────────────────────────────────────

interface OverviewDashboardViewProps {
  readonly data: DashboardData;
  readonly onNavigate?: (target: string) => void;
  readonly onFilterByErrorType?: (errorType: string) => void;
  readonly onTimeRangeChange?: (range: string) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

// ── Component ───────────────────────────────────────────────────────────────

function OverviewDashboardView({
  data,
  onNavigate,
  onFilterByErrorType,
  onTimeRangeChange,
}: OverviewDashboardViewProps): React.ReactElement {
  const handleTimeRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onTimeRangeChange?.(e.target.value);
    },
    [onTimeRangeChange]
  );

  return (
    <div data-testid="overview-dashboard-view">
      {/* Time range selector */}
      <select data-testid="dashboard-time-range" onChange={handleTimeRangeChange}>
        <option value="5m">5 minutes</option>
        <option value="1h">1 hour</option>
        <option value="24h">24 hours</option>
        <option value="all">All time</option>
      </select>

      {/* Stat cards */}
      <div data-testid="stat-cards">
        <div data-testid="stat-card-total-calls" onClick={() => onNavigate?.("log")}>
          <span>Total Calls</span>
          <span>{formatCount(data.totalCalls)}</span>
        </div>

        <div
          data-testid="stat-card-ok-rate"
          data-trend={data.okRateTrend}
          onClick={() => onNavigate?.("sankey")}
        >
          <span>Ok Rate</span>
          <span>{Math.round(data.okRate * 1000) / 10}%</span>
          <span>{data.okRateTrend === "up" ? "↑" : data.okRateTrend === "down" ? "↓" : "→"}</span>
        </div>

        <div data-testid="stat-card-chains" onClick={() => onNavigate?.("railway")}>
          <span>Chains</span>
          <span>{data.chainCount}</span>
        </div>

        <div data-testid="stat-card-err-ports" onClick={() => onNavigate?.("sankey")}>
          <span>Active Err Ports</span>
          <span>{data.activeErrPorts}</span>
        </div>
      </div>

      {/* Error distribution chart */}
      <div data-testid="error-distribution-chart">
        {data.errorDistribution.map(segment => (
          <div
            key={segment.errorType}
            data-testid="error-distribution-segment"
            data-error-type={segment.errorType}
            data-percentage={segment.percentage}
            onClick={() => onFilterByErrorType?.(segment.errorType)}
            style={{ width: `${segment.percentage}%` }}
          >
            <span>{segment.errorType}</span>
            <span>{segment.percentage}%</span>
          </div>
        ))}
      </div>

      {/* Stability timeline sparklines */}
      <div data-testid="stability-timelines">
        {data.portSummaries.map(port => (
          <div
            key={port.portName}
            data-testid="port-stability-sparkline"
            data-port-name={port.portName}
          >
            <span>{port.portName}</span>
            {port.stabilityHistory.map((score, i) => (
              <span key={i} data-score={score} />
            ))}
          </div>
        ))}
      </div>

      {/* Top errors table */}
      <div data-testid="top-errors-table">
        {data.topErrors.map((error, i) => (
          <div
            key={i}
            data-testid="top-error-row"
            data-count={error.count}
            onClick={() => onNavigate?.(`log:${error.errorType}`)}
          >
            <span>{error.portName}</span>
            <span>{error.errorType}</span>
            <span>{error.count}</span>
            <span>{error.lastSeen}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { OverviewDashboardView };
export type { OverviewDashboardViewProps, DashboardData };
