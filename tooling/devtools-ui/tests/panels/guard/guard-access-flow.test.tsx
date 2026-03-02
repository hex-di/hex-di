/**
 * Unit tests for AccessFlowStatistics component.
 *
 * Spec: 03-views-and-wireframes.md (3.6), 09-sankey-statistics.md
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AccessFlowStatistics } from "../../../src/panels/guard/access-flow-statistics.js";
import type { GuardPanelSnapshot, GuardPortStatistics } from "../../../src/panels/guard/types.js";

// ── Test Fixture Factories ──────────────────────────────────────────────────

function makePortStats(overrides?: Partial<GuardPortStatistics>): GuardPortStatistics {
  return {
    portName: "testPort",
    totalEvaluations: 100,
    allowCount: 90,
    denyCount: 10,
    errorCount: 0,
    allowRate: 0.9,
    topDenyReason: undefined,
    uniqueSubjects: 5,
    policyKind: "hasRole",
    ...overrides,
  };
}

function makeSnapshot(portStats: ReadonlyMap<string, GuardPortStatistics>): GuardPanelSnapshot {
  return {
    descriptors: new Map(),
    portStats,
    paths: new Map(),
    roleHierarchy: [],
    recentExecutions: [],
    totalEvaluationsObserved: [...portStats.values()].reduce((s, p) => s + p.totalEvaluations, 0),
    globalAllowRate: 0.9,
    snapshotTimestamp: Date.now(),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AccessFlowStatistics", () => {
  afterEach(cleanup);

  it("renders flow diagram", () => {
    const portStats = new Map([["testPort", makePortStats()]]);
    const snapshot = makeSnapshot(portStats);

    render(<AccessFlowStatistics snapshot={snapshot} portStats={portStats} />);

    expect(screen.getByTestId("guard-access-flow")).toBeDefined();
  });

  it("shows total evaluations", () => {
    const portStats = new Map([["testPort", makePortStats({ totalEvaluations: 100 })]]);
    const snapshot = makeSnapshot(portStats);

    render(<AccessFlowStatistics snapshot={snapshot} portStats={portStats} />);

    const total = screen.getByTestId("guard-access-flow-total");
    expect(total.textContent).toContain("100");
  });

  it("shows allow rate with zone", () => {
    const portStats = new Map([["testPort", makePortStats()]]);
    const snapshot = makeSnapshot(portStats);

    render(<AccessFlowStatistics snapshot={snapshot} portStats={portStats} />);

    const rate = screen.getByTestId("guard-access-flow-rate");
    expect(rate.getAttribute("data-zone")).toBeDefined();
    expect(rate.textContent).toContain("90%");
  });

  it("shows port count", () => {
    const portStats = new Map([["testPort", makePortStats()]]);
    const snapshot = makeSnapshot(portStats);

    render(<AccessFlowStatistics snapshot={snapshot} portStats={portStats} />);

    const ports = screen.getByTestId("guard-access-flow-ports");
    expect(ports.textContent).toContain("1");
  });

  it("renders SVG", () => {
    const portStats = new Map([["testPort", makePortStats()]]);
    const snapshot = makeSnapshot(portStats);

    render(<AccessFlowStatistics snapshot={snapshot} portStats={portStats} />);

    expect(screen.getByTestId("guard-access-flow-svg")).toBeDefined();
  });

  it("renders per-port detail cards", () => {
    const portStats = new Map([
      ["portA", makePortStats({ portName: "portA" })],
      ["portB", makePortStats({ portName: "portB" })],
    ]);
    const snapshot = makeSnapshot(portStats);

    render(<AccessFlowStatistics snapshot={snapshot} portStats={portStats} />);

    const details = screen.getAllByTestId("guard-access-flow-detail");
    expect(details.length).toBe(2);
  });

  it("shows top deny reason when present", () => {
    const portStats = new Map([
      ["testPort", makePortStats({ topDenyReason: "missing admin role" })],
    ]);
    const snapshot = makeSnapshot(portStats);

    render(<AccessFlowStatistics snapshot={snapshot} portStats={portStats} />);

    const topDeny = screen.getByTestId("guard-access-flow-top-deny");
    expect(topDeny.textContent).toContain("missing admin role");
  });

  it("applies zone colors", () => {
    const portStats = new Map([
      ["highPort", makePortStats({ portName: "highPort", allowRate: 0.98 })],
      ["lowPort", makePortStats({ portName: "lowPort", allowRate: 0.5 })],
    ]);
    const snapshot = makeSnapshot(portStats);

    render(<AccessFlowStatistics snapshot={snapshot} portStats={portStats} />);

    const details = screen.getAllByTestId("guard-access-flow-detail");
    const highDetail = details.find(d => d.getAttribute("data-port") === "highPort");
    const lowDetail = details.find(d => d.getAttribute("data-port") === "lowPort");

    expect(highDetail?.getAttribute("data-zone")).toBe("green");
    expect(lowDetail?.getAttribute("data-zone")).toBe("red");
  });
});
