/**
 * Component tests for CombinatorStatisticsView.
 *
 * Spec: 09-combinator-matrix.md (9.10-9.11)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CombinatorStatisticsView } from "../../../src/panels/result/combinator-statistics.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

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

const statsData: CombinatorStatisticsData = {
  combinatorMethod: "all",
  totalExecutions: 870,
  overallOkRate: 0.821,
  inputStats: [
    { label: "fetchUser", okRate: 0.991, totalExecutions: 870 },
    { label: "fetchPosts", okRate: 0.942, totalExecutions: 870 },
    { label: "fetchTags", okRate: 0.873, totalExecutions: 870 },
  ],
  bottleneckLabel: "fetchTags",
  errorCombinations: [
    { pattern: "Only fetchTags fails", percentage: 68.3, count: 595 },
    { pattern: "fetchPosts + fetchTags", percentage: 18.2, count: 158 },
    { pattern: "Only fetchPosts fails", percentage: 10.1, count: 88 },
    { pattern: "All three fail", percentage: 2.4, count: 21 },
    { pattern: "Only fetchUser fails", percentage: 1.0, count: 8 },
  ],
  correlations: [
    { inputA: "fetchUser", inputB: "fetchPosts", coefficient: 0.12 },
    { inputA: "fetchUser", inputB: "fetchTags", coefficient: 0.08 },
    { inputA: "fetchPosts", inputB: "fetchTags", coefficient: 0.67 },
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

describe("CombinatorStatisticsView", () => {
  beforeEach(setupEnv);

  it("statistics view shows input success rate bars", () => {
    render(<CombinatorStatisticsView data={statsData} />);

    const bars = screen.getAllByTestId("input-success-rate-bar");
    expect(bars).toHaveLength(3);
    // First bar should show 99.1% for fetchUser
    expect(bars[0].dataset["okRate"]).toBe("0.991");
  });

  it("bottleneck identification highlights weakest input", () => {
    render(<CombinatorStatisticsView data={statsData} />);

    const bottleneck = screen.getByTestId("bottleneck-indicator");
    expect(bottleneck.textContent).toContain("fetchTags");
  });

  it("error combination table shows top 5 failure patterns", () => {
    render(<CombinatorStatisticsView data={statsData} />);

    const rows = screen.getAllByTestId("error-combination-row");
    expect(rows).toHaveLength(5);
    expect(rows[0].textContent).toContain("fetchTags");
    expect(rows[0].textContent).toContain("68.3");
  });

  it("correlation heatmap renders for 3+ inputs", () => {
    render(<CombinatorStatisticsView data={statsData} />);

    const heatmap = screen.getByTestId("correlation-heatmap");
    expect(heatmap).toBeDefined();
  });

  it("heatmap cells colored by correlation coefficient", () => {
    render(<CombinatorStatisticsView data={statsData} />);

    const cells = screen.getAllByTestId("heatmap-cell");
    expect(cells.length).toBeGreaterThan(0);
    // Each cell should have a correlation data attribute
    expect(cells[0].dataset["coefficient"]).toBeDefined();
  });

  it("high correlation (>0.5) cell uses red tint", () => {
    render(<CombinatorStatisticsView data={statsData} />);

    const cells = screen.getAllByTestId("heatmap-cell");
    const highCorrCell = cells.find(c => Number(c.dataset["coefficient"]) > 0.5);
    expect(highCorrCell).toBeDefined();
    expect(highCorrCell?.dataset["tint"]).toBe("high");
  });

  it("low correlation (<0.2) cell has no tint", () => {
    render(<CombinatorStatisticsView data={statsData} />);

    const cells = screen.getAllByTestId("heatmap-cell");
    const lowCorrCell = cells.find(c => Number(c.dataset["coefficient"]) < 0.2);
    expect(lowCorrCell).toBeDefined();
    expect(lowCorrCell?.dataset["tint"]).toBe("none");
  });
});
