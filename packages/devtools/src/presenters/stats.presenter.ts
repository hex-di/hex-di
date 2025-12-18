/**
 * StatsPresenter - Pure presentation logic for statistics dashboard.
 *
 * Transforms trace stats into StatsViewModel ready for rendering.
 *
 * @packageDocumentation
 */

import type { PresenterDataSourceContract, TraceEntry } from "@hex-di/devtools-core";
import type {
  StatsViewModel,
  MetricViewModel,
  TopServiceViewModel,
  LifetimeBreakdown,
  MemoryTrackingViewModel,
} from "../view-models/index.js";
import { createEmptyStatsViewModel } from "../view-models/index.js";

// =============================================================================
// StatsPresenter
// =============================================================================

/**
 * Presenter for statistics dashboard.
 */
export class StatsPresenter {
  private topServicesLimit = 10;

  constructor(private readonly dataSource: PresenterDataSourceContract) {}

  /**
   * Get the current stats view model.
   */
  getViewModel(): StatsViewModel {
    if (!this.dataSource.hasTracing()) {
      return createEmptyStatsViewModel();
    }

    const stats = this.dataSource.getStats();
    const traces = this.dataSource.getTraces();

    if (traces.length === 0) {
      return createEmptyStatsViewModel();
    }

    const lifetimeBreakdown = this.calculateLifetimeBreakdown(traces);
    const serviceStats = this.calculateServiceStats(traces);
    const memoryTracking = this.calculateMemoryTracking();

    return Object.freeze({
      metrics: Object.freeze({
        totalResolutions: this.createMetric(
          "totalResolutions",
          "Total Resolutions",
          stats.totalResolutions,
          stats.totalResolutions.toString(),
          ""
        ),
        averageDuration: this.createMetric(
          "averageDuration",
          "Avg Duration",
          stats.averageDuration,
          this.formatDuration(stats.averageDuration),
          "ms"
        ),
        cacheHitRate: this.createMetric(
          "cacheHitRate",
          "Cache Hit Rate",
          stats.cacheHitRate * 100,
          `${(stats.cacheHitRate * 100).toFixed(1)}%`,
          "%"
        ),
        slowResolutions: this.createMetric(
          "slowResolutions",
          "Slow Resolutions",
          stats.slowCount,
          stats.slowCount.toString(),
          ""
        ),
        sessionDuration: this.createMetric(
          "sessionDuration",
          "Session Duration",
          stats.totalDuration,
          this.formatSessionDuration(stats.totalDuration),
          ""
        ),
        resolutionsPerSecond: this.createMetric(
          "resolutionsPerSecond",
          "Res/sec",
          stats.totalDuration > 0 ? stats.totalResolutions / (stats.totalDuration / 1000) : 0,
          (stats.totalDuration > 0 ? stats.totalResolutions / (stats.totalDuration / 1000) : 0).toFixed(1),
          ""
        ),
      }),
      lifetimeBreakdown: Object.freeze(lifetimeBreakdown),
      lifetimeBreakdownFormatted: Object.freeze({
        singleton: this.formatPercent(lifetimeBreakdown.singleton, lifetimeBreakdown.total),
        scoped: this.formatPercent(lifetimeBreakdown.scoped, lifetimeBreakdown.total),
        request: this.formatPercent(lifetimeBreakdown.request, lifetimeBreakdown.total),
      }),
      topServicesByCount: Object.freeze(
        serviceStats
          .sort((a, b) => b.count - a.count)
          .slice(0, this.topServicesLimit)
      ),
      topServicesByDuration: Object.freeze(
        serviceStats
          .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
          .slice(0, this.topServicesLimit)
      ),
      slowestServices: Object.freeze(
        serviceStats
          .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
          .slice(0, this.topServicesLimit)
      ),
      resolutionTimeSeries: Object.freeze({
        id: "resolutions",
        label: "Resolutions over time",
        points: Object.freeze([]),
      }),
      cacheHitTimeSeries: Object.freeze({
        id: "cacheHit",
        label: "Cache hit rate over time",
        points: Object.freeze([]),
      }),
      memoryTracking,
      sessionStart: new Date(stats.sessionStart).toLocaleString(),
      sessionDuration: this.formatSessionDuration(stats.totalDuration),
      isEmpty: false,
      lastUpdated: new Date().toLocaleString(),
    });
  }

  /**
   * Set the limit for top services lists.
   */
  setTopServicesLimit(limit: number): void {
    this.topServicesLimit = Math.max(1, Math.min(50, limit));
  }

  /**
   * Create a metric view model.
   */
  private createMetric(
    id: string,
    label: string,
    value: number,
    formattedValue: string,
    unit: string
  ): MetricViewModel {
    return Object.freeze({
      id,
      label,
      value,
      formattedValue,
      unit,
      trend: "none" as const,
      trendPercent: 0,
    });
  }

  /**
   * Calculate breakdown by lifetime.
   */
  private calculateLifetimeBreakdown(traces: readonly TraceEntry[]): LifetimeBreakdown {
    const breakdown = { singleton: 0, scoped: 0, request: 0, total: traces.length };

    traces.forEach(trace => {
      switch (trace.lifetime) {
        case "singleton":
          breakdown.singleton++;
          break;
        case "scoped":
          breakdown.scoped++;
          break;
        case "transient":
          breakdown.request++;
          break;
      }
    });

    return breakdown;
  }

  /**
   * Calculate per-service statistics.
   */
  private calculateServiceStats(traces: readonly TraceEntry[]): TopServiceViewModel[] {
    const serviceMap = new Map<string, {
      count: number;
      totalDuration: number;
      cacheHits: number;
    }>();

    traces.forEach(trace => {
      const stats = serviceMap.get(trace.portName) ?? {
        count: 0,
        totalDuration: 0,
        cacheHits: 0,
      };

      stats.count++;
      stats.totalDuration += trace.duration;
      if (trace.isCacheHit) {
        stats.cacheHits++;
      }

      serviceMap.set(trace.portName, stats);
    });

    const totalResolutions = traces.length;

    return Array.from(serviceMap.entries()).map(([portName, stats]) => {
      const avgDurationMs = stats.count > 0 ? stats.totalDuration / stats.count : 0;
      const cacheHitRate = stats.count > 0 ? stats.cacheHits / stats.count : 0;

      return Object.freeze({
        portName,
        count: stats.count,
        totalDurationMs: stats.totalDuration,
        avgDurationMs,
        avgDurationFormatted: this.formatDuration(avgDurationMs),
        cacheHitRate,
        cacheHitRateFormatted: `${(cacheHitRate * 100).toFixed(0)}%`,
        percentOfTotal: totalResolutions > 0 ? (stats.count / totalResolutions) * 100 : 0,
      });
    });
  }

  /**
   * Format duration for display.
   */
  private formatDuration(ms: number): string {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(0)}us`;
    }
    if (ms < 1000) {
      return `${ms.toFixed(2)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * Format session duration for display.
   */
  private formatSessionDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Format percentage.
   */
  private formatPercent(value: number, total: number): string {
    if (total === 0) return "0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  }

  /**
   * Calculate memory tracking information from container snapshot.
   */
  private calculateMemoryTracking(): MemoryTrackingViewModel {
    // Get container snapshot if available
    const snapshot = this.dataSource.getContainerSnapshot();

    if (!snapshot) {
      return Object.freeze({
        singletonCount: 0,
        scopedCount: 0,
        activeScopeCount: 0,
        singletonPoolSize: 0,
        scopedDistribution: Object.freeze({ min: 0, max: 0, avg: 0 }),
        growthTrend: "unknown" as const,
      });
    }

    // Count singletons (each unique service is one instance)
    const singletonCount = snapshot.singletons.length;
    const singletonPoolSize = singletonCount;

    // Count active scopes
    const activeScopes = snapshot.scopes.filter(s => s.isActive);
    const activeScopeCount = activeScopes.length;

    // Count scoped instances across all active scopes
    const scopedCount = activeScopes.reduce(
      (sum, scope) => sum + scope.resolvedPorts.length,
      0
    );

    // Calculate distribution of scoped instances per scope
    const scopeSizes = activeScopes.map(s => s.resolvedPorts.length);
    const scopedDistribution = {
      min: scopeSizes.length > 0 ? Math.min(...scopeSizes) : 0,
      max: scopeSizes.length > 0 ? Math.max(...scopeSizes) : 0,
      avg: scopeSizes.length > 0 ? scopeSizes.reduce((a, b) => a + b, 0) / scopeSizes.length : 0,
    };

    // Determine growth trend (simple heuristic based on scope count)
    // In a real implementation, this would track history over time
    let growthTrend: "increasing" | "stable" | "decreasing" | "unknown" = "unknown";
    if (activeScopeCount === 0) {
      growthTrend = "stable";
    } else if (activeScopeCount > 5) {
      growthTrend = "increasing";
    } else {
      growthTrend = "stable";
    }

    return Object.freeze({
      singletonCount,
      scopedCount,
      activeScopeCount,
      singletonPoolSize,
      scopedDistribution: Object.freeze(scopedDistribution),
      growthTrend,
    });
  }
}
