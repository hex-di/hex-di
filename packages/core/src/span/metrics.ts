/**
 * Container metrics types and collector for observability.
 *
 * Provides aggregated metrics about container resolution performance,
 * including cache hit rates, timing percentiles, and per-port statistics.
 *
 * @packageDocumentation
 */

import type { TraceStats, TraceEntry } from "../inspection/tracing-types.js";
import type { Lifetime } from "../adapters/types.js";

// =============================================================================
// Metrics Types
// =============================================================================

/**
 * Extended container metrics with percentile data and per-port breakdown.
 *
 * Builds on TraceStats with additional observability data useful for
 * monitoring and performance analysis.
 */
export interface ContainerMetrics {
  /** Total number of resolutions recorded */
  readonly totalResolutions: number;

  /** Number of resolutions served from cache */
  readonly cacheHits: number;

  /** Cache hit rate as decimal (0-1) */
  readonly cacheHitRate: number;

  /** Average resolution time in milliseconds */
  readonly avgDuration: number;

  /** Minimum resolution time in milliseconds */
  readonly minDuration: number;

  /** Maximum resolution time in milliseconds */
  readonly maxDuration: number;

  /** Median (p50) resolution time in milliseconds */
  readonly p50Duration: number;

  /** 90th percentile resolution time in milliseconds */
  readonly p90Duration: number;

  /** 99th percentile resolution time in milliseconds */
  readonly p99Duration: number;

  /** Total resolution time across all resolutions */
  readonly totalDuration: number;

  /** Breakdown by lifetime */
  readonly byLifetime: {
    readonly singleton: LifetimeMetrics;
    readonly scoped: LifetimeMetrics;
    readonly transient: LifetimeMetrics;
  };

  /** Top N slowest resolutions (port names) */
  readonly slowestPorts: readonly PortMetrics[];

  /** Timestamp when metrics were computed */
  readonly computedAt: number;
}

/**
 * Metrics for a specific lifetime.
 */
export interface LifetimeMetrics {
  /** Total resolutions for this lifetime */
  readonly count: number;
  /** Cache hits for this lifetime */
  readonly cacheHits: number;
  /** Average duration for this lifetime */
  readonly avgDuration: number;
}

/**
 * Per-port metrics summary.
 */
export interface PortMetrics {
  /** Port name */
  readonly portName: string;
  /** Number of resolutions */
  readonly count: number;
  /** Average duration */
  readonly avgDuration: number;
  /** Cache hit count */
  readonly cacheHits: number;
  /** Lifetime of this port */
  readonly lifetime: Lifetime;
}

// =============================================================================
// Metrics Collector
// =============================================================================

/**
 * Collects and computes container metrics from trace entries.
 *
 * Use this to get detailed performance insights from tracing data.
 *
 * @example
 * ```typescript
 * const collector = new MetricsCollector();
 *
 * // Add trace entries
 * for (const entry of tracingAPI.getTraces()) {
 *   collector.addEntry(entry);
 * }
 *
 * // Get computed metrics
 * const metrics = collector.getMetrics();
 * console.log(`Avg duration: ${metrics.avgDuration.toFixed(2)}ms`);
 * console.log(`P99: ${metrics.p99Duration.toFixed(2)}ms`);
 * console.log(`Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
 * ```
 */
export class MetricsCollector {
  /** Collected durations for percentile calculation */
  private readonly durations: number[] = [];
  /** Per-port aggregated data */
  private readonly perPort: Map<
    string,
    { count: number; totalDuration: number; cacheHits: number; lifetime: Lifetime }
  > = new Map();
  /** Per-lifetime aggregated data */
  private readonly perLifetime: Map<
    Lifetime,
    { count: number; totalDuration: number; cacheHits: number }
  > = new Map();

  private totalDuration = 0;
  private cacheHits = 0;
  private minDuration = Infinity;
  private maxDuration = -Infinity;

  /**
   * Adds a trace entry to the collector.
   *
   * @param entry - The trace entry to add
   */
  addEntry(entry: TraceEntry): void {
    const { portName, duration, isCacheHit, lifetime } = entry;

    // Overall stats
    this.durations.push(duration);
    this.totalDuration += duration;
    if (isCacheHit) this.cacheHits++;
    if (duration < this.minDuration) this.minDuration = duration;
    if (duration > this.maxDuration) this.maxDuration = duration;

    // Per-port stats
    const portStats = this.perPort.get(portName) ?? {
      count: 0,
      totalDuration: 0,
      cacheHits: 0,
      lifetime,
    };
    portStats.count++;
    portStats.totalDuration += duration;
    if (isCacheHit) portStats.cacheHits++;
    this.perPort.set(portName, portStats);

    // Per-lifetime stats
    const lifetimeStats = this.perLifetime.get(lifetime) ?? {
      count: 0,
      totalDuration: 0,
      cacheHits: 0,
    };
    lifetimeStats.count++;
    lifetimeStats.totalDuration += duration;
    if (isCacheHit) lifetimeStats.cacheHits++;
    this.perLifetime.set(lifetime, lifetimeStats);
  }

  /**
   * Adds multiple trace entries to the collector.
   *
   * @param entries - The trace entries to add
   */
  addEntries(entries: readonly TraceEntry[]): void {
    for (const entry of entries) {
      this.addEntry(entry);
    }
  }

  /**
   * Computes and returns the container metrics.
   *
   * @param topN - Number of slowest ports to include (default: 10)
   * @returns Computed ContainerMetrics
   */
  getMetrics(topN = 10): ContainerMetrics {
    const count = this.durations.length;

    if (count === 0) {
      return this.emptyMetrics();
    }

    // Sort for percentiles
    const sorted = [...this.durations].sort((a, b) => a - b);

    const avgDuration = this.totalDuration / count;
    const p50Duration = this.percentile(sorted, 0.5);
    const p90Duration = this.percentile(sorted, 0.9);
    const p99Duration = this.percentile(sorted, 0.99);

    // Per-lifetime breakdown
    const byLifetime = {
      singleton: this.getLifetimeMetrics("singleton"),
      scoped: this.getLifetimeMetrics("scoped"),
      transient: this.getLifetimeMetrics("transient"),
    };

    // Slowest ports
    const slowestPorts = this.getSlowestPorts(topN);

    return Object.freeze({
      totalResolutions: count,
      cacheHits: this.cacheHits,
      cacheHitRate: this.cacheHits / count,
      avgDuration,
      minDuration: this.minDuration === Infinity ? 0 : this.minDuration,
      maxDuration: this.maxDuration === -Infinity ? 0 : this.maxDuration,
      p50Duration,
      p90Duration,
      p99Duration,
      totalDuration: this.totalDuration,
      byLifetime: Object.freeze(byLifetime),
      slowestPorts: Object.freeze(slowestPorts),
      computedAt: Date.now(),
    });
  }

  /**
   * Clears all collected data.
   */
  clear(): void {
    this.durations.length = 0;
    this.perPort.clear();
    this.perLifetime.clear();
    this.totalDuration = 0;
    this.cacheHits = 0;
    this.minDuration = Infinity;
    this.maxDuration = -Infinity;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private emptyMetrics(): ContainerMetrics {
    const emptyLifetime: LifetimeMetrics = { count: 0, cacheHits: 0, avgDuration: 0 };
    return Object.freeze({
      totalResolutions: 0,
      cacheHits: 0,
      cacheHitRate: 0,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      p50Duration: 0,
      p90Duration: 0,
      p99Duration: 0,
      totalDuration: 0,
      byLifetime: Object.freeze({
        singleton: emptyLifetime,
        scoped: emptyLifetime,
        transient: emptyLifetime,
      }),
      slowestPorts: Object.freeze([]),
      computedAt: Date.now(),
    });
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(p * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }

  private getLifetimeMetrics(lifetime: Lifetime): LifetimeMetrics {
    const stats = this.perLifetime.get(lifetime);
    if (!stats || stats.count === 0) {
      return { count: 0, cacheHits: 0, avgDuration: 0 };
    }
    return {
      count: stats.count,
      cacheHits: stats.cacheHits,
      avgDuration: stats.totalDuration / stats.count,
    };
  }

  private getSlowestPorts(topN: number): PortMetrics[] {
    const portMetrics: PortMetrics[] = [];

    for (const [portName, stats] of this.perPort) {
      portMetrics.push({
        portName,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
        cacheHits: stats.cacheHits,
        lifetime: stats.lifetime,
      });
    }

    // Sort by avgDuration descending
    portMetrics.sort((a, b) => b.avgDuration - a.avgDuration);

    return portMetrics.slice(0, topN);
  }
}

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Converts TraceStats to ContainerMetrics format.
 *
 * Useful when you have existing TraceStats and want ContainerMetrics interface.
 * Note: This provides limited data since TraceStats doesn't include all fields.
 * Fields not available in TraceStats will be estimated or set to defaults.
 *
 * @param stats - The TraceStats to convert
 * @returns ContainerMetrics with available data (percentiles will be estimates)
 */
export function fromTraceStats(stats: TraceStats): ContainerMetrics {
  const emptyLifetime: LifetimeMetrics = { count: 0, cacheHits: 0, avgDuration: 0 };

  // Calculate cache hits from rate (since TraceStats only provides rate)
  const estimatedCacheHits = Math.round(stats.totalResolutions * stats.cacheHitRate);

  return Object.freeze({
    totalResolutions: stats.totalResolutions,
    cacheHits: estimatedCacheHits,
    cacheHitRate: stats.cacheHitRate,
    avgDuration: stats.averageDuration,
    // Min/max not available in TraceStats - use average as estimate
    minDuration: 0,
    maxDuration: stats.averageDuration * 2, // Rough estimate
    // Percentiles estimated from average
    p50Duration: stats.averageDuration,
    p90Duration: stats.averageDuration * 1.5,
    p99Duration: stats.averageDuration * 2,
    totalDuration: stats.totalDuration,
    byLifetime: Object.freeze({
      singleton: emptyLifetime,
      scoped: emptyLifetime,
      transient: emptyLifetime,
    }),
    slowestPorts: Object.freeze([]),
    computedAt: Date.now(),
  });
}
