/**
 * GuardPanel -- top-level PanelProps-compatible shell for the Guard Panel.
 *
 * Thin adapter that bridges InspectorDataSource to GuardDataSource,
 * then delegates all rendering to the internal GuardPanel component.
 *
 * @packageDocumentation
 */

import { useCallback, useMemo } from "react";
import type { PanelProps } from "./types.js";
import type { InspectorDataSource } from "../data/inspector-data-source.js";
import { enumeratePaths } from "./guard/path-analysis.js";
import type {
  GuardDataEvent,
  GuardDataSource,
  GuardEvaluationDescriptor,
  GuardEvaluationExecution,
  GuardPanelSnapshot,
  GuardPathDescriptor,
  GuardPortStatistics,
  SerializedRole,
} from "./guard/types.js";
import {
  buildDescriptorsFromSnapshot,
  buildPortStatisticsFromSnapshot,
  isGuardInspectionSnapshot,
} from "./guard-data-adapter.js";
import type { GuardInspectionSnapshotLike } from "./guard-data-adapter.js";
import { GuardPanel as InternalGuardPanel } from "./guard/guard-panel.js";

// ── Adapter: InspectorDataSource → GuardDataSource ──────────────────────────

class GuardDataSourceAdapter implements GuardDataSource {
  private readonly source: InspectorDataSource;

  constructor(source: InspectorDataSource) {
    this.source = source;
  }

  getDescriptors(): ReadonlyMap<string, GuardEvaluationDescriptor> {
    // Try Level 1 data first
    const level1 = this.source.getGuardDescriptors?.();
    if (level1) return level1;

    // Fall back to Level 0 via library inspector snapshot
    const snapshot = this.getLevel0Snapshot();
    if (!snapshot) return new Map<string, GuardEvaluationDescriptor>();
    return buildDescriptorsFromSnapshot(snapshot);
  }

  getPortStatistics(): ReadonlyMap<string, GuardPortStatistics> {
    const snapshot = this.getLevel0Snapshot();
    if (!snapshot) return new Map<string, GuardPortStatistics>();
    return buildPortStatisticsFromSnapshot(snapshot);
  }

  getExecutions(portName: string): readonly GuardEvaluationExecution[] {
    return this.source.getGuardExecutions?.(portName) ?? [];
  }

  getPaths(descriptorId: string): readonly GuardPathDescriptor[] {
    const descriptor = this.getDescriptors().get(descriptorId);
    if (!descriptor) return [];
    return enumeratePaths(descriptor.rootNode, descriptorId);
  }

  getRoleHierarchy(): readonly SerializedRole[] {
    return this.source.getGuardRoleHierarchy?.() ?? [];
  }

  getSnapshot(): GuardPanelSnapshot {
    const descriptors = this.getDescriptors();
    const portStats = this.getPortStatistics();

    let totalAllow = 0;
    let totalEvals = 0;
    for (const stats of portStats.values()) {
      totalAllow += stats.allowCount;
      totalEvals += stats.totalEvaluations;
    }

    const allExecutions: GuardEvaluationExecution[] = [];
    for (const descriptor of descriptors.values()) {
      const execs = this.getExecutions(descriptor.portName);
      allExecutions.push(...execs);
    }
    allExecutions.sort(
      (a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
    );

    const paths = new Map<string, readonly GuardPathDescriptor[]>();
    for (const descriptorId of descriptors.keys()) {
      paths.set(descriptorId, this.getPaths(descriptorId));
    }

    return {
      descriptors: new Map(descriptors),
      portStats: new Map(portStats),
      recentExecutions: allExecutions,
      paths,
      roleHierarchy: this.getRoleHierarchy(),
      totalEvaluationsObserved: totalEvals,
      globalAllowRate: totalEvals > 0 ? totalAllow / totalEvals : 0,
      snapshotTimestamp: Date.now(),
    };
  }

  subscribe(listener: (event: GuardDataEvent) => void): () => void {
    return this.source.subscribe(() => {
      listener({ type: "snapshot-changed" });
    });
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private getLevel0Snapshot(): GuardInspectionSnapshotLike | undefined {
    const inspectors = this.source.getLibraryInspectors?.();
    const guardInspector = inspectors?.get("guard");
    if (!guardInspector) return undefined;

    const raw: unknown = guardInspector.getSnapshot();
    if (isGuardInspectionSnapshot(raw)) return raw;
    return undefined;
  }
}

// ── Main Panel Component ────────────────────────────────────────────────────

function GuardPanel({ dataSource, theme }: PanelProps): React.ReactElement {
  const adapter = useMemo(() => new GuardDataSourceAdapter(dataSource), [dataSource]);

  const navigateTo = useCallback((_panel: string, _context: Record<string, unknown>) => {
    // Navigation between panels — no-op for now
  }, []);

  return <InternalGuardPanel dataSource={adapter} theme={theme} navigateTo={navigateTo} />;
}

export { GuardPanel };
