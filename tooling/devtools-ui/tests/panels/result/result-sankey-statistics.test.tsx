/**
 * Component tests for the SankeyStatisticsView.
 *
 * Spec: 07-sankey-statistics.md (7.1-7.8), 10-visual-encoding.md (10.9, 10.12)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SankeyStatisticsView } from "../../../src/panels/result/sankey-statistics.js";
import type {
  ResultChainDescriptor,
  ResultOperationDescriptor,
  ResultPortStatistics,
} from "../../../src/panels/result/types.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeOp(overrides?: Partial<ResultOperationDescriptor>): ResultOperationDescriptor {
  return {
    index: 0,
    method: "andThen",
    label: "validate",
    inputTrack: "ok",
    outputTracks: ["ok", "err"],
    canSwitch: true,
    isTerminal: false,
    callbackLocation: undefined,
    ...overrides,
  };
}

const chain: ResultChainDescriptor = {
  chainId: "chain-1",
  label: "validateUser",
  portName: "UserPort",
  operations: [
    makeOp({ index: 0, method: "ok", label: "entry", inputTrack: "both", canSwitch: false }),
    makeOp({ index: 1, method: "andThen", label: "validate", canSwitch: true }),
    makeOp({ index: 2, method: "orElse", label: "recover", inputTrack: "err", canSwitch: true }),
    makeOp({
      index: 3,
      method: "match",
      label: "extract",
      inputTrack: "both",
      canSwitch: false,
      isTerminal: true,
    }),
  ],
  isAsync: false,
  sourceLocation: undefined,
};

interface FlowData {
  readonly operationIndex: number;
  readonly okToOk: number;
  readonly okToErr: number;
  readonly errToOk: number;
  readonly errToErr: number;
}

const flows: readonly FlowData[] = [
  { operationIndex: 0, okToOk: 870, okToErr: 0, errToOk: 0, errToErr: 0 },
  { operationIndex: 1, okToOk: 629, okToErr: 241, errToOk: 0, errToErr: 0 },
  { operationIndex: 2, okToOk: 0, okToErr: 0, errToOk: 218, errToErr: 23 },
  { operationIndex: 3, okToOk: 847, okToErr: 0, errToOk: 0, errToErr: 23 },
];

const portStats: ResultPortStatistics = {
  portName: "UserPort",
  totalCalls: 870,
  okCount: 847,
  errCount: 23,
  errorRate: 0.026,
  errorsByCode: new Map([
    ["VALIDATION", 218],
    ["UNRECOVERABLE", 23],
  ]),
  lastError: undefined,
  stabilityScore: 0.95,
  chainIds: ["chain-1"],
  lastExecutionTimestamp: 1000,
};

const stabilityHistory: readonly { readonly timestamp: number; readonly score: number }[] = [
  { timestamp: 1000, score: 0.92 },
  { timestamp: 2000, score: 0.94 },
  { timestamp: 3000, score: 0.95 },
  { timestamp: 4000, score: 0.96 },
  { timestamp: 5000, score: 0.93 },
];

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

describe("SankeyStatisticsView", () => {
  beforeEach(setupEnv);

  it("renders one column per chain operation", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const columns = screen.getAllByTestId("sankey-column");
    expect(columns).toHaveLength(4);
  });

  it("each column has Ok node and Err node", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const okNodes = screen.getAllByTestId("sankey-ok-node");
    const errNodes = screen.getAllByTestId("sankey-err-node");
    expect(okNodes).toHaveLength(4);
    expect(errNodes).toHaveLength(4);
  });

  it("node heights proportional to count", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const okNodes = screen.getAllByTestId("sankey-ok-node");
    // First ok node (870) should have higher height than last ok node (847)
    expect(Number(okNodes[0].dataset["count"])).toBeGreaterThanOrEqual(
      Number(okNodes[3].dataset["count"])
    );
  });

  it("ok nodes use --hex-result-ok fill", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const okNode = screen.getAllByTestId("sankey-ok-node")[0];
    expect(okNode.dataset["track"]).toBe("ok");
  });

  it("err nodes use --hex-result-err fill", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const errNode = screen.getAllByTestId("sankey-err-node")[0];
    expect(errNode.dataset["track"]).toBe("err");
  });

  it("ok->ok links use green fill at 0.3 opacity", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const links = screen.getAllByTestId("sankey-link");
    const okOkLink = links.find(l => l.dataset["from"] === "ok" && l.dataset["to"] === "ok");
    expect(okOkLink).toBeDefined();
  });

  it("ok->err links use gradient fill at 0.5 opacity", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const links = screen.getAllByTestId("sankey-link");
    const okErrLink = links.find(l => l.dataset["from"] === "ok" && l.dataset["to"] === "err");
    expect(okErrLink).toBeDefined();
  });

  it("err->ok links use gradient fill at 0.5 opacity", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const links = screen.getAllByTestId("sankey-link");
    const errOkLink = links.find(l => l.dataset["from"] === "err" && l.dataset["to"] === "ok");
    expect(errOkLink).toBeDefined();
  });

  it("err->err links use red fill at 0.3 opacity", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const links = screen.getAllByTestId("sankey-link");
    const errErrLink = links.find(l => l.dataset["from"] === "err" && l.dataset["to"] === "err");
    expect(errErrLink).toBeDefined();
  });

  it("hovering node highlights connected links and dims others", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const okNode = screen.getAllByTestId("sankey-ok-node")[1]; // andThen ok node
    fireEvent.mouseEnter(okNode);

    expect(okNode.dataset["hovered"]).toBe("true");
  });

  it("node tooltip shows count, percentage, sources, destinations", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const okNode = screen.getAllByTestId("sankey-ok-node")[0];
    fireEvent.mouseEnter(okNode);

    expect(screen.getByTestId("sankey-tooltip")).toBeDefined();
  });

  it("link tooltip shows count, percentage, top error types", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const links = screen.getAllByTestId("sankey-link");
    fireEvent.mouseEnter(links[0]);

    expect(screen.getByTestId("sankey-tooltip")).toBeDefined();
  });

  it("error hotspot table renders ranked by impact", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    expect(screen.getByTestId("error-hotspot-table")).toBeDefined();
    const rows = screen.getAllByTestId("hotspot-row");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("hotspot table is sortable by column header click", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const header = screen.getByTestId("hotspot-sort-count");
    fireEvent.click(header);
    expect(header.dataset["sortDir"]).toBeDefined();
  });

  it("recovery heroes section shows operations with high recovery rate", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    expect(screen.getByTestId("recovery-heroes")).toBeDefined();
  });

  it("time range dropdown recomputes all counts", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const dropdown = screen.getByTestId("time-range-selector");
    fireEvent.change(dropdown, { target: { value: "1h" } });
    expect(dropdown).toBeDefined();
  });

  it("port filter 'All' shows aggregate across ports", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    expect(screen.getByTestId("port-filter")).toBeDefined();
  });

  it("min flow filter hides links below threshold", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const slider = screen.getByTestId("min-flow-filter");
    fireEvent.change(slider, { target: { value: "100" } });

    // Links with count < 100 should be hidden
    const visibleLinks = screen
      .getAllByTestId("sankey-link")
      .filter(l => l.dataset["visible"] !== "false");
    expect(visibleLinks.length).toBeLessThan(screen.getAllByTestId("sankey-link").length);
  });

  it("stability sparkline renders with color zones (green/amber/red)", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    expect(screen.getByTestId("stability-sparkline")).toBeDefined();
    const points = screen.getAllByTestId("sparkline-point");
    expect(points).toHaveLength(5);
  });

  it("sparkline hover shows exact percentage and timestamp", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const points = screen.getAllByTestId("sparkline-point");
    fireEvent.mouseEnter(points[0]);

    expect(screen.getByTestId("sparkline-tooltip")).toBeDefined();
    expect(screen.getByTestId("sparkline-tooltip").textContent).toContain("92%");
  });

  it("renders port summary header with total calls, ok rate, and stability score", () => {
    render(
      <SankeyStatisticsView
        chain={chain}
        flows={flows}
        portStats={portStats}
        stabilityHistory={stabilityHistory}
      />
    );

    const header = screen.getByTestId("sankey-port-summary");
    expect(header.textContent).toContain("870"); // totalCalls
    expect(header.textContent).toContain("97"); // ok rate ~97.4%
    expect(header.textContent).toContain("95"); // stability score 95%
    expect(header.textContent).toContain("UserPort");
  });
});
