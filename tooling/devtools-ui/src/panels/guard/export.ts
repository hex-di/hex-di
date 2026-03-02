/**
 * Export utilities for the Guard Panel.
 *
 * Supports JSON full/filtered snapshots, CSV decision log,
 * JSONL audit trail, and SVG exports.
 *
 * Spec: 14-integration.md Section 14.5
 *
 * @packageDocumentation
 */

import type { GuardEvaluationExecution, GuardFilterState, GuardPanelSnapshot } from "./types.js";

// ── JSON Export ──────────────────────────────────────────────────────────────

/** Export the full panel snapshot as a JSON string. */
export function exportSnapshotJSON(snapshot: GuardPanelSnapshot): string {
  return JSON.stringify(snapshotToSerializable(snapshot), null, 2);
}

/**
 * Export a filtered snapshot as a JSON string.
 * Applies the current filter state to narrow the data.
 */
export function exportFilteredJSON(snapshot: GuardPanelSnapshot, filter: GuardFilterState): string {
  const filtered = applyFilter(snapshot, filter);
  return JSON.stringify(snapshotToSerializable(filtered), null, 2);
}

// ── CSV Export ───────────────────────────────────────────────────────────────

/** CSV column headers for the decision log. */
const CSV_HEADERS = [
  "executionId",
  "portName",
  "subjectId",
  "decision",
  "durationMs",
  "evaluatedAt",
  "reason",
];

/** Export the decision log as CSV. */
export function exportDecisionCSV(executions: readonly GuardEvaluationExecution[]): string {
  const rows = [CSV_HEADERS.join(",")];
  for (const exec of executions) {
    rows.push(
      [
        escapeCSV(exec.executionId),
        escapeCSV(exec.portName),
        escapeCSV(exec.subject.id),
        exec.decision,
        String(exec.durationMs),
        escapeCSV(exec.evaluatedAt),
        escapeCSV(exec.reason ?? ""),
      ].join(",")
    );
  }
  return rows.join("\n");
}

// ── JSONL Export ──────────────────────────────────────────────────────────────

/**
 * Export executions as a JSONL audit trail (one entry per line).
 */
export function exportAuditJSONL(executions: readonly GuardEvaluationExecution[]): string {
  return executions
    .map(exec =>
      JSON.stringify({
        executionId: exec.executionId,
        portName: exec.portName,
        subjectId: exec.subject.id,
        decision: exec.decision,
        durationMs: exec.durationMs,
        evaluatedAt: exec.evaluatedAt,
        reason: exec.reason,
        roles: exec.subject.roles,
        authenticationMethod: exec.subject.authenticationMethod,
      })
    )
    .join("\n");
}

// ── SVG Export (stubs) ───────────────────────────────────────────────────────

/** Export the policy evaluation tree as SVG. */
export function exportTreeSVG(_snapshot: GuardPanelSnapshot, _descriptorId: string): string {
  // SVG tree rendering will be implemented with the tree view component
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><text x="400" y="300" text-anchor="middle">Policy Tree</text></svg>`;
}

/** Export the role hierarchy as SVG. */
export function exportRolesSVG(_snapshot: GuardPanelSnapshot): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><text x="400" y="300" text-anchor="middle">Role Hierarchy</text></svg>`;
}

/** Export the access flow Sankey diagram as SVG. */
export function exportSankeySVG(_snapshot: GuardPanelSnapshot): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><text x="400" y="300" text-anchor="middle">Access Flow</text></svg>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

interface SerializableSnapshot {
  readonly descriptors: ReadonlyArray<[string, unknown]>;
  readonly portStats: ReadonlyArray<[string, unknown]>;
  readonly recentExecutions: readonly GuardEvaluationExecution[];
  readonly roleHierarchy: GuardPanelSnapshot["roleHierarchy"];
  readonly totalEvaluationsObserved: number;
  readonly globalAllowRate: number;
  readonly snapshotTimestamp: number;
}

function snapshotToSerializable(snapshot: GuardPanelSnapshot): SerializableSnapshot {
  return {
    descriptors: [...snapshot.descriptors].map(([k, v]) => [
      k,
      {
        ...v,
        policyKinds: [...v.policyKinds],
      },
    ]),
    portStats: [...snapshot.portStats],
    recentExecutions: snapshot.recentExecutions,
    roleHierarchy: snapshot.roleHierarchy,
    totalEvaluationsObserved: snapshot.totalEvaluationsObserved,
    globalAllowRate: snapshot.globalAllowRate,
    snapshotTimestamp: snapshot.snapshotTimestamp,
  };
}

function applyFilter(snapshot: GuardPanelSnapshot, filter: GuardFilterState): GuardPanelSnapshot {
  let executions = snapshot.recentExecutions;

  if (filter.portSearch) {
    const search = filter.portSearch.toLowerCase();
    executions = executions.filter(e => e.portName.toLowerCase().includes(search));
  }

  if (filter.subjectId !== undefined) {
    executions = executions.filter(e => e.subject.id === filter.subjectId);
  }

  if (filter.decision !== "all") {
    if (filter.decision === "allow") {
      executions = executions.filter(e => e.decision === "allow");
    } else if (filter.decision === "deny") {
      executions = executions.filter(e => e.decision === "deny");
    }
  }

  if (filter.timeRange !== "all" && typeof filter.timeRange !== "string") {
    executions = executions.filter(e => {
      const ts = new Date(e.evaluatedAt).getTime();
      const range = filter.timeRange;
      if (typeof range === "object") {
        return ts >= range.from && ts <= range.to;
      }
      return true;
    });
  } else if (typeof filter.timeRange === "string" && filter.timeRange !== "all") {
    const now = Date.now();
    const windowMs =
      filter.timeRange === "5m"
        ? 5 * 60 * 1000
        : filter.timeRange === "1h"
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;
    const cutoff = now - windowMs;
    executions = executions.filter(e => new Date(e.evaluatedAt).getTime() >= cutoff);
  }

  return {
    ...snapshot,
    recentExecutions: executions,
  };
}
