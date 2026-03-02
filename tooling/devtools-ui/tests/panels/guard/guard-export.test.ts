/**
 * Unit tests for Guard Panel export utilities.
 *
 * Spec: 14-integration.md Section 14.5
 */

import { describe, it, expect } from "vitest";
import {
  exportAuditJSONL,
  exportDecisionCSV,
  exportFilteredJSON,
  exportRolesSVG,
  exportSankeySVG,
  exportSnapshotJSON,
  exportTreeSVG,
} from "../../../src/panels/guard/export.js";
import type {
  GuardEvaluationExecution,
  GuardPanelSnapshot,
  SerializedSubject,
  EvaluationNodeTrace,
} from "../../../src/panels/guard/types.js";

// ── Test Fixture Factories ──────────────────────────────────────────────────

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

function makeSnapshot(overrides?: Partial<GuardPanelSnapshot>): GuardPanelSnapshot {
  return {
    descriptors: new Map(),
    portStats: new Map(),
    recentExecutions: [],
    paths: new Map(),
    roleHierarchy: [],
    totalEvaluationsObserved: 0,
    globalAllowRate: 0,
    snapshotTimestamp: Date.now(),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("exportSnapshotJSON", () => {
  it("exports valid JSON", () => {
    const snapshot = makeSnapshot();
    const json = exportSnapshotJSON(snapshot);

    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("includes all snapshot fields", () => {
    const snapshot = makeSnapshot({
      totalEvaluationsObserved: 42,
      globalAllowRate: 0.9,
    });
    const parsed = JSON.parse(exportSnapshotJSON(snapshot));

    expect(parsed.totalEvaluationsObserved).toBe(42);
    expect(parsed.globalAllowRate).toBe(0.9);
  });
});

describe("exportFilteredJSON", () => {
  it("filters executions by decision", () => {
    const snapshot = makeSnapshot({
      recentExecutions: [
        makeExecution({ executionId: "a", decision: "allow" }),
        makeExecution({ executionId: "b", decision: "deny" }),
      ],
    });
    const json = exportFilteredJSON(snapshot, {
      portSearch: "",
      subjectId: undefined,
      roleName: undefined,
      decision: "deny",
      policyKind: undefined,
      timeRange: "all",
    });
    const parsed = JSON.parse(json);

    expect(parsed.recentExecutions.length).toBe(1);
    expect(parsed.recentExecutions[0].executionId).toBe("b");
  });

  it("filters executions by port search", () => {
    const snapshot = makeSnapshot({
      recentExecutions: [
        makeExecution({ portName: "authPort" }),
        makeExecution({ portName: "dataPort" }),
      ],
    });
    const json = exportFilteredJSON(snapshot, {
      portSearch: "auth",
      subjectId: undefined,
      roleName: undefined,
      decision: "all",
      policyKind: undefined,
      timeRange: "all",
    });
    const parsed = JSON.parse(json);

    expect(parsed.recentExecutions.length).toBe(1);
  });
});

describe("exportDecisionCSV", () => {
  it("includes header row", () => {
    const csv = exportDecisionCSV([]);
    expect(csv).toContain("executionId,portName,subjectId,decision,durationMs,evaluatedAt,reason");
  });

  it("includes execution data rows", () => {
    const csv = exportDecisionCSV([makeExecution()]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain("exec-1");
    expect(lines[1]).toContain("testPort");
  });

  it("escapes CSV values with commas", () => {
    const csv = exportDecisionCSV([makeExecution({ reason: "policy,with,commas" })]);
    expect(csv).toContain('"policy,with,commas"');
  });
});

describe("exportAuditJSONL", () => {
  it("outputs one JSON object per line", () => {
    const executions = [makeExecution({ executionId: "e1" }), makeExecution({ executionId: "e2" })];
    const jsonl = exportAuditJSONL(executions);
    const lines = jsonl.split("\n");

    expect(lines.length).toBe(2);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it("includes audit-relevant fields", () => {
    const jsonl = exportAuditJSONL([makeExecution()]);
    const entry = JSON.parse(jsonl);

    expect(entry.executionId).toBe("exec-1");
    expect(entry.subjectId).toBe("user-1");
    expect(entry.decision).toBe("allow");
    expect(entry.authenticationMethod).toBe("jwt");
  });
});

describe("SVG exports", () => {
  it("exportTreeSVG returns valid SVG", () => {
    const svg = exportTreeSVG(makeSnapshot(), "desc-1");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("exportRolesSVG returns valid SVG", () => {
    const svg = exportRolesSVG(makeSnapshot());
    expect(svg).toContain("<svg");
  });

  it("exportSankeySVG returns valid SVG", () => {
    const svg = exportSankeySVG(makeSnapshot());
    expect(svg).toContain("<svg");
  });
});
