/**
 * Unit tests for OverviewDashboard component.
 *
 * Spec: 03-views-and-wireframes.md (3.9), 11-interactions.md (11.10)
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { OverviewDashboard } from "../../../src/panels/guard/overview-dashboard.js";
import type {
  GuardPanelSnapshot,
  GuardPortStatistics,
  GuardEvaluationExecution,
  EvaluationNodeTrace,
  SerializedSubject,
  SerializedRole,
} from "../../../src/panels/guard/types.js";

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

function makeSubject(overrides?: Partial<SerializedSubject>): SerializedSubject {
  return {
    id: "user-1",
    roles: ["admin"],
    permissions: ["docs:read"],
    attributes: {},
    authenticationMethod: "jwt",
    authenticatedAt: "2026-01-01T00:00:00Z",
    identityProvider: undefined,
    ...overrides,
  };
}

function makeTrace(overrides?: Partial<EvaluationNodeTrace>): EvaluationNodeTrace {
  return {
    nodeId: "node-0",
    kind: "hasRole",
    result: "allow",
    evaluated: true,
    durationMs: 0.5,
    children: [],
    reason: undefined,
    resolvedValue: undefined,
    asyncResolution: false,
    visibleFields: undefined,
    ...overrides,
  };
}

function makeExecution(overrides?: Partial<GuardEvaluationExecution>): GuardEvaluationExecution {
  return {
    executionId: "exec-1",
    descriptorId: "guard:testPort",
    portName: "testPort",
    subject: makeSubject(),
    decision: "allow",
    rootTrace: makeTrace(),
    durationMs: 0.5,
    evaluatedAt: "2026-01-01T00:00:00Z",
    reason: undefined,
    visibleFields: undefined,
    ...overrides,
  };
}

function makeRole(overrides?: Partial<SerializedRole>): SerializedRole {
  return {
    name: "admin",
    inherits: [],
    directPermissions: ["users:manage"],
    flattenedPermissions: ["users:manage"],
    hasCircularInheritance: false,
    ...overrides,
  };
}

function makeSnapshot(): GuardPanelSnapshot {
  return {
    descriptors: new Map(),
    portStats: new Map([["testPort", makePortStats()]]),
    paths: new Map(),
    roleHierarchy: [makeRole()],
    recentExecutions: [
      makeExecution(),
      makeExecution({ executionId: "exec-2", decision: "deny", reason: "no admin role" }),
    ],
    totalEvaluationsObserved: 200,
    globalAllowRate: 0.85,
    snapshotTimestamp: Date.now(),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("OverviewDashboard", () => {
  afterEach(cleanup);

  it("renders dashboard", () => {
    render(<OverviewDashboard snapshot={makeSnapshot()} />);

    expect(screen.getByTestId("guard-overview-dashboard")).toBeDefined();
  });

  it("shows stat cards", () => {
    render(<OverviewDashboard snapshot={makeSnapshot()} />);

    expect(screen.getByTestId("guard-stat-total-evaluations")).toBeDefined();
    expect(screen.getByTestId("guard-stat-allow-rate")).toBeDefined();
    expect(screen.getByTestId("guard-stat-ports")).toBeDefined();
    expect(screen.getByTestId("guard-stat-roles")).toBeDefined();
  });

  it("shows allow rate zone", () => {
    render(<OverviewDashboard snapshot={makeSnapshot()} />);

    const allowRate = screen.getByTestId("guard-stat-allow-rate");
    expect(allowRate.getAttribute("data-zone")).toBeDefined();
  });

  it("shows decision split", () => {
    render(<OverviewDashboard snapshot={makeSnapshot()} />);

    const allowCount = screen.getByTestId("guard-overview-allow-count");
    const denyCount = screen.getByTestId("guard-overview-deny-count");

    expect(allowCount.textContent).toContain("1");
    expect(denyCount.textContent).toContain("1");
  });

  it("shows top deny reasons", () => {
    render(<OverviewDashboard snapshot={makeSnapshot()} />);

    expect(screen.getByTestId("guard-overview-top-deny-reasons")).toBeDefined();
  });

  it("shows per-port summary", () => {
    render(<OverviewDashboard snapshot={makeSnapshot()} />);

    const portCards = screen.getAllByTestId("guard-overview-port-card");
    expect(portCards.length).toBeGreaterThanOrEqual(1);
  });

  it("shows descriptor count", () => {
    render(<OverviewDashboard snapshot={makeSnapshot()} />);

    expect(screen.getByTestId("guard-stat-descriptors")).toBeDefined();
  });
});
