/**
 * Mock implementation of ResultDataSource for testing.
 *
 * Spec: 14-integration.md Section 14.2
 *
 * @packageDocumentation
 */

import { computePaths } from "./path-analysis.js";
import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultDataEvent,
  ResultDataSource,
  ResultPanelSnapshot,
  ResultPathDescriptor,
  ResultPortStatistics,
} from "./types.js";

interface MockResultDataSourceOptions {
  readonly maxExecutionsPerChain?: number;
}

/**
 * In-memory implementation of ResultDataSource for tests and Playground.
 * Supports registering chains, adding executions, and notifying subscribers.
 */
export class MockResultDataSource implements ResultDataSource {
  private readonly chains = new Map<string, ResultChainDescriptor>();
  private readonly executions = new Map<string, ResultChainExecution[]>();
  private readonly portStats = new Map<string, ResultPortStatistics>();
  private readonly listeners = new Set<(event: ResultDataEvent) => void>();
  private readonly maxExecutionsPerChain: number;

  constructor(options?: MockResultDataSourceOptions) {
    this.maxExecutionsPerChain = options?.maxExecutionsPerChain ?? 100;
  }

  // ── ResultDataSource interface ──────────────────────────────────────────

  getChains(): ReadonlyMap<string, ResultChainDescriptor> {
    return this.chains;
  }

  getPortStatistics(): ReadonlyMap<string, ResultPortStatistics> {
    return this.portStats;
  }

  getExecutions(chainId: string): readonly ResultChainExecution[] {
    const execs = this.executions.get(chainId) ?? [];
    // Return newest first (sorted by startTimestamp descending)
    return [...execs].sort((a, b) => b.startTimestamp - a.startTimestamp);
  }

  getPaths(chainId: string): readonly ResultPathDescriptor[] {
    const chain = this.chains.get(chainId);
    if (!chain) {
      return [];
    }
    return computePaths(chain.operations);
  }

  getSnapshot(): ResultPanelSnapshot {
    let totalOk = 0;
    let totalCalls = 0;
    for (const stats of this.portStats.values()) {
      totalOk += stats.okCount;
      totalCalls += stats.totalCalls;
    }

    const allExecutions: ResultChainExecution[] = [];
    for (const execs of this.executions.values()) {
      allExecutions.push(...execs);
    }
    allExecutions.sort((a, b) => b.startTimestamp - a.startTimestamp);

    const paths = new Map<string, readonly ResultPathDescriptor[]>();
    for (const chainId of this.chains.keys()) {
      paths.set(chainId, this.getPaths(chainId));
    }

    return {
      chains: new Map(this.chains),
      portStats: new Map(this.portStats),
      recentExecutions: allExecutions,
      paths,
      totalOperationsObserved: totalCalls,
      globalOkRate: totalCalls > 0 ? totalOk / totalCalls : 0,
      snapshotTimestamp: Date.now(),
    };
  }

  subscribe(listener: (event: ResultDataEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ── Mutation methods (for tests) ────────────────────────────────────────

  registerChain(chain: ResultChainDescriptor): void {
    this.chains.set(chain.chainId, chain);
    if (!this.executions.has(chain.chainId)) {
      this.executions.set(chain.chainId, []);
    }
    this.emit({ type: "chain-registered", chainId: chain.chainId });
  }

  addExecution(execution: ResultChainExecution): void {
    const execs = this.executions.get(execution.chainId);
    if (execs) {
      execs.push(execution);
      // Enforce ring buffer limit
      while (execs.length > this.maxExecutionsPerChain) {
        execs.shift();
      }
    }
    this.emit({
      type: "execution-added",
      chainId: execution.chainId,
      executionId: execution.executionId,
    });
  }

  setPortStatistics(portName: string, stats: ResultPortStatistics): void {
    this.portStats.set(portName, stats);
    this.emit({ type: "statistics-updated", portName });
  }

  emitEvent(event: ResultDataEvent): void {
    this.emit(event);
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private emit(event: ResultDataEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
