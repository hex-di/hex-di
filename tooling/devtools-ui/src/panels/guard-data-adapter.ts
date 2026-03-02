/**
 * Pure functions that synthesize GuardEvaluationDescriptor and GuardPortStatistics
 * from Level 0 GuardInspectionSnapshot data.
 *
 * Used when the Guard Panel needs to render an overview from always-available
 * DI-based stats without requiring Level 1 tracing instrumentation.
 *
 * @packageDocumentation
 */

import type {
  GuardEvaluationDescriptor,
  GuardPortStatistics,
  PolicyNodeDescriptor,
} from "./guard/types.js";

// ── Level 0 snapshot shape (from @hex-di/guard GuardInspector) ──────────────

interface GuardInspectionSnapshotLike {
  readonly activePolicies: Readonly<Record<string, string>>;
  readonly recentDecisions: ReadonlyArray<{
    readonly evaluationId: string;
    readonly portName: string;
    readonly decision: "allow" | "deny";
    readonly subjectId: string;
    readonly evaluatedAt: string;
  }>;
  readonly permissionStats: Readonly<
    Record<string, { readonly allow: number; readonly deny: number }>
  >;
}

// ── Build synthetic descriptor from Level 0 data ────────────────────────────

/**
 * Creates a minimal descriptor for a port from Level 0 stats.
 * The tree is a single leaf node since we don't know the full policy tree.
 */
function buildDescriptorFromStats(portName: string, policyKind: string): GuardEvaluationDescriptor {
  const rootNode: PolicyNodeDescriptor = {
    nodeId: "node-0",
    kind:
      policyKind === "allOf" ||
      policyKind === "anyOf" ||
      policyKind === "not" ||
      policyKind === "labeled"
        ? policyKind
        : policyKind === "hasPermission" ||
            policyKind === "hasRole" ||
            policyKind === "hasAttribute" ||
            policyKind === "hasResourceAttribute" ||
            policyKind === "hasSignature" ||
            policyKind === "hasRelationship"
          ? policyKind
          : "hasRole",
    label: undefined,
    children: [],
    leafData: undefined,
    depth: 0,
    fieldStrategy: undefined,
  };

  return {
    descriptorId: `guard:${portName}`,
    portName,
    label: portName,
    rootNode,
    leafCount: 1,
    maxDepth: 0,
    policyKinds: new Set([rootNode.kind]),
    hasAsyncPolicies: false,
    sourceLocation: undefined,
  };
}

/**
 * Build descriptors from Level 0 snapshot — one descriptor per active port.
 */
function buildDescriptorsFromSnapshot(
  snapshot: GuardInspectionSnapshotLike
): ReadonlyMap<string, GuardEvaluationDescriptor> {
  const descriptors = new Map<string, GuardEvaluationDescriptor>();

  for (const [portName, policyKind] of Object.entries(snapshot.activePolicies)) {
    const descriptor = buildDescriptorFromStats(portName, policyKind);
    descriptors.set(descriptor.descriptorId, descriptor);
  }

  return descriptors;
}

/**
 * Build port statistics from Level 0 snapshot.
 */
function buildPortStatisticsFromSnapshot(
  snapshot: GuardInspectionSnapshotLike
): ReadonlyMap<string, GuardPortStatistics> {
  const stats = new Map<string, GuardPortStatistics>();

  for (const [portName, counts] of Object.entries(snapshot.permissionStats)) {
    const total = counts.allow + counts.deny;
    const policyKind = snapshot.activePolicies[portName] ?? "hasRole";

    // Count unique subjects from recent decisions
    const uniqueSubjects = new Set(
      snapshot.recentDecisions.filter(d => d.portName === portName).map(d => d.subjectId)
    ).size;

    stats.set(portName, {
      portName,
      totalEvaluations: total,
      allowCount: counts.allow,
      denyCount: counts.deny,
      errorCount: 0,
      allowRate: total > 0 ? counts.allow / total : 0,
      topDenyReason: undefined,
      uniqueSubjects,
      policyKind,
    });
  }

  return stats;
}

// ── Overview aggregation from descriptors ───────────────────────────────────

interface GuardOverview {
  readonly totalEvaluations: number;
  readonly allowCount: number;
  readonly denyCount: number;
  readonly allowRate: number;
  readonly portCount: number;
  readonly portsWithDenials: number;
  readonly perPort: readonly GuardOverviewEntry[];
}

interface GuardOverviewEntry {
  readonly descriptorId: string;
  readonly label: string;
  readonly allowCount: number;
  readonly denyCount: number;
  readonly totalEvaluations: number;
}

/**
 * Derives overview statistics from port statistics.
 */
function buildOverviewFromStats(
  portStats: ReadonlyMap<string, GuardPortStatistics>
): GuardOverview {
  let totalAllow = 0;
  let totalDeny = 0;
  let portsWithDenials = 0;
  const perPort: GuardOverviewEntry[] = [];

  for (const [, stats] of portStats) {
    totalAllow += stats.allowCount;
    totalDeny += stats.denyCount;
    if (stats.denyCount > 0) {
      portsWithDenials += 1;
    }

    perPort.push({
      descriptorId: `guard:${stats.portName}`,
      label: stats.portName,
      allowCount: stats.allowCount,
      denyCount: stats.denyCount,
      totalEvaluations: stats.totalEvaluations,
    });
  }

  const total = totalAllow + totalDeny;

  return {
    totalEvaluations: total,
    allowCount: totalAllow,
    denyCount: totalDeny,
    allowRate: total > 0 ? totalAllow / total : 1,
    portCount: portStats.size,
    portsWithDenials,
    perPort,
  };
}

// ── Type guard for Level 0 snapshot ──────────────────────────────────────────

/**
 * Type predicate that validates an unknown value has the shape of
 * GuardInspectionSnapshotLike. Used to safely narrow `getSnapshot()` results.
 */
function isGuardInspectionSnapshot(value: unknown): value is GuardInspectionSnapshotLike {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "activePolicies" in value &&
    "recentDecisions" in value &&
    "permissionStats" in value
  );
}

export {
  buildDescriptorFromStats,
  buildDescriptorsFromSnapshot,
  buildOverviewFromStats,
  buildPortStatisticsFromSnapshot,
  isGuardInspectionSnapshot,
};
export type { GuardInspectionSnapshotLike, GuardOverview, GuardOverviewEntry };
