/**
 * Component tests for the OverviewDashboardView.
 *
 * Spec: 03-views-and-wireframes.md (3.7), 11-interactions.md (11.10)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { OverviewDashboardView } from "../../../src/panels/result/overview-dashboard.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

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

const dashboardData: DashboardData = {
  totalCalls: 12_450,
  okRate: 0.946,
  okRateTrend: "up",
  chainCount: 24,
  activeErrPorts: 3,
  portSummaries: [
    {
      portName: "UserPort",
      okRate: 0.99,
      errCount: 12,
      stabilityHistory: [0.98, 0.99, 0.99, 0.99, 0.99],
    },
    {
      portName: "ApiPort",
      okRate: 0.91,
      errCount: 113,
      stabilityHistory: [0.85, 0.88, 0.9, 0.91, 0.91],
    },
    {
      portName: "DbPort",
      okRate: 0.87,
      errCount: 162,
      stabilityHistory: [0.92, 0.9, 0.88, 0.87, 0.87],
    },
  ],
  topErrors: [
    { portName: "DbPort", errorType: "TIMEOUT", count: 89, lastSeen: 1700000000 },
    { portName: "ApiPort", errorType: "NETWORK", count: 67, lastSeen: 1700000100 },
    { portName: "DbPort", errorType: "CONSTRAINT", count: 45, lastSeen: 1700000050 },
    { portName: "ApiPort", errorType: "RATE_LIMIT", count: 23, lastSeen: 1699999900 },
    { portName: "UserPort", errorType: "VALIDATION", count: 12, lastSeen: 1699999800 },
  ],
  errorDistribution: [
    { errorType: "TIMEOUT", count: 89, percentage: 37.7 },
    { errorType: "NETWORK", count: 67, percentage: 28.4 },
    { errorType: "CONSTRAINT", count: 45, percentage: 19.1 },
    { errorType: "RATE_LIMIT", count: 23, percentage: 9.7 },
    { errorType: "VALIDATION", count: 12, percentage: 5.1 },
  ],
};

function setupEnv(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

afterEach(() => {
  cleanup();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("OverviewDashboardView", () => {
  beforeEach(setupEnv);

  it("stat card 'Total Calls' shows correct count", () => {
    render(<OverviewDashboardView data={dashboardData} />);

    const card = screen.getByTestId("stat-card-total-calls");
    expect(card.textContent).toContain("12,450");
  });

  it("stat card 'Ok Rate' shows percentage with trend indicator", () => {
    render(<OverviewDashboardView data={dashboardData} />);

    const card = screen.getByTestId("stat-card-ok-rate");
    expect(card.textContent).toContain("94.6%");
    expect(card.dataset["trend"]).toBe("up");
  });

  it("stat card 'Chains' shows traced chain count", () => {
    render(<OverviewDashboardView data={dashboardData} />);

    const card = screen.getByTestId("stat-card-chains");
    expect(card.textContent).toContain("24");
  });

  it("stat card 'Active Err Ports' shows count of ports with errors", () => {
    render(<OverviewDashboardView data={dashboardData} />);

    const card = screen.getByTestId("stat-card-err-ports");
    expect(card.textContent).toContain("3");
  });

  it("error distribution chart renders segments per error type", () => {
    render(<OverviewDashboardView data={dashboardData} />);

    const segments = screen.getAllByTestId("error-distribution-segment");
    expect(segments).toHaveLength(5);
  });

  it("clicking chart segment filters top errors list", () => {
    const onFilter = vi.fn();
    render(<OverviewDashboardView data={dashboardData} onFilterByErrorType={onFilter} />);

    const segments = screen.getAllByTestId("error-distribution-segment");
    fireEvent.click(segments[0]); // Click TIMEOUT segment
    expect(onFilter).toHaveBeenCalledWith("TIMEOUT");
  });

  it("stability timeline renders sparkline per port", () => {
    render(<OverviewDashboardView data={dashboardData} />);

    const sparklines = screen.getAllByTestId("port-stability-sparkline");
    expect(sparklines).toHaveLength(3);
  });

  it("top errors table shows port, error type, count, last seen", () => {
    render(<OverviewDashboardView data={dashboardData} />);

    const rows = screen.getAllByTestId("top-error-row");
    expect(rows).toHaveLength(5);
    expect(rows[0].textContent).toContain("DbPort");
    expect(rows[0].textContent).toContain("TIMEOUT");
    expect(rows[0].textContent).toContain("89");
  });

  it("top errors sorted by count descending", () => {
    render(<OverviewDashboardView data={dashboardData} />);

    const rows = screen.getAllByTestId("top-error-row");
    const counts = rows.map(r => Number(r.dataset["count"]));
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i - 1]).toBeGreaterThanOrEqual(counts[i]);
    }
  });

  it("clicking stat card navigates to related view", () => {
    const onNavigate = vi.fn();
    render(<OverviewDashboardView data={dashboardData} onNavigate={onNavigate} />);

    const card = screen.getByTestId("stat-card-total-calls");
    fireEvent.click(card);
    expect(onNavigate).toHaveBeenCalled();
  });

  it("clicking top error row navigates to Operation Log", () => {
    const onNavigate = vi.fn();
    render(<OverviewDashboardView data={dashboardData} onNavigate={onNavigate} />);

    const rows = screen.getAllByTestId("top-error-row");
    fireEvent.click(rows[0]);
    expect(onNavigate).toHaveBeenCalled();
  });

  it("dashboard refreshes when time range changes", () => {
    const onTimeRangeChange = vi.fn();
    render(<OverviewDashboardView data={dashboardData} onTimeRangeChange={onTimeRangeChange} />);

    const selector = screen.getByTestId("dashboard-time-range");
    fireEvent.change(selector, { target: { value: "1h" } });
    expect(onTimeRangeChange).toHaveBeenCalledWith("1h");
  });
});
