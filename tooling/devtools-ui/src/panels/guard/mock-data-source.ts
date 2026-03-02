/**
 * Mock implementation of GuardDataSource for testing.
 *
 * Spec: 14-integration.md Section 14.2
 *
 * @packageDocumentation
 */

import { enumeratePaths } from "./path-analysis.js";
import type {
  GuardDataEvent,
  GuardDataSource,
  GuardEvaluationDescriptor,
  GuardEvaluationExecution,
  GuardPanelSnapshot,
  GuardPathDescriptor,
  GuardPortStatistics,
  SerializedRole,
} from "./types.js";

interface MockGuardDataSourceOptions {
  readonly maxExecutionsPerPort?: number;
}

/**
 * In-memory implementation of GuardDataSource for tests and Playground.
 * Supports registering descriptors, adding executions, and notifying subscribers.
 */
export class MockGuardDataSource implements GuardDataSource {
  private readonly descriptors = new Map<string, GuardEvaluationDescriptor>();
  private readonly executions = new Map<string, GuardEvaluationExecution[]>();
  private readonly portStats = new Map<string, GuardPortStatistics>();
  private roles: readonly SerializedRole[] = [];
  private readonly listeners = new Set<(event: GuardDataEvent) => void>();
  private readonly maxExecutionsPerPort: number;

  constructor(options?: MockGuardDataSourceOptions) {
    this.maxExecutionsPerPort = options?.maxExecutionsPerPort ?? 100;
  }

  // ── GuardDataSource interface ─────────────────────────────────────────────

  getDescriptors(): ReadonlyMap<string, GuardEvaluationDescriptor> {
    return this.descriptors;
  }

  getPortStatistics(): ReadonlyMap<string, GuardPortStatistics> {
    return this.portStats;
  }

  getExecutions(portName: string): readonly GuardEvaluationExecution[] {
    const execs = this.executions.get(portName) ?? [];
    return [...execs].sort(
      (a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
    );
  }

  getPaths(descriptorId: string): readonly GuardPathDescriptor[] {
    const descriptor = this.descriptors.get(descriptorId);
    if (!descriptor) {
      return [];
    }
    return enumeratePaths(descriptor.rootNode, descriptorId);
  }

  getRoleHierarchy(): readonly SerializedRole[] {
    return this.roles;
  }

  getSnapshot(): GuardPanelSnapshot {
    let totalAllow = 0;
    let totalEvals = 0;
    for (const stats of this.portStats.values()) {
      totalAllow += stats.allowCount;
      totalEvals += stats.totalEvaluations;
    }

    const allExecutions: GuardEvaluationExecution[] = [];
    for (const execs of this.executions.values()) {
      allExecutions.push(...execs);
    }
    allExecutions.sort(
      (a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
    );

    const paths = new Map<string, readonly GuardPathDescriptor[]>();
    for (const descriptorId of this.descriptors.keys()) {
      paths.set(descriptorId, this.getPaths(descriptorId));
    }

    return {
      descriptors: new Map(this.descriptors),
      portStats: new Map(this.portStats),
      recentExecutions: allExecutions,
      paths,
      roleHierarchy: this.roles,
      totalEvaluationsObserved: totalEvals,
      globalAllowRate: totalEvals > 0 ? totalAllow / totalEvals : 0,
      snapshotTimestamp: Date.now(),
    };
  }

  subscribe(listener: (event: GuardDataEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ── Mutation methods (for tests) ──────────────────────────────────────────

  registerDescriptor(descriptor: GuardEvaluationDescriptor): void {
    this.descriptors.set(descriptor.descriptorId, descriptor);
    if (!this.executions.has(descriptor.portName)) {
      this.executions.set(descriptor.portName, []);
    }
    this.emit({ type: "descriptor-registered", descriptorId: descriptor.descriptorId });
  }

  addExecution(execution: GuardEvaluationExecution): void {
    const execs = this.executions.get(execution.portName);
    if (execs) {
      execs.push(execution);
      // Enforce ring buffer limit
      while (execs.length > this.maxExecutionsPerPort) {
        execs.shift();
      }
    }
    this.emit({
      type: "execution-added",
      portName: execution.portName,
      executionId: execution.executionId,
    });
  }

  setPortStatistics(portName: string, stats: GuardPortStatistics): void {
    this.portStats.set(portName, stats);
    this.emit({ type: "statistics-updated", portName });
  }

  setRoleHierarchy(roles: readonly SerializedRole[]): void {
    this.roles = roles;
    this.emit({ type: "role-hierarchy-updated" });
  }

  emitEvent(event: GuardDataEvent): void {
    this.emit(event);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private emit(event: GuardDataEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
