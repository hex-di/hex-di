/**
 * StatsViewModel - Immutable view data for statistics dashboard.
 *
 * Contains computed metrics and aggregated statistics about resolutions,
 * cache efficiency, and performance. All values are pre-formatted for display.
 *
 * @packageDocumentation
 */

// =============================================================================
// Metric Types
// =============================================================================

/**
 * A single metric value with formatting.
 */
export interface MetricViewModel {
  /** Metric identifier */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Raw numeric value */
  readonly value: number;
  /** Formatted string value for display */
  readonly formattedValue: string;
  /** Optional unit (e.g., "ms", "%", "resolutions") */
  readonly unit: string;
  /** Trend direction compared to previous period */
  readonly trend: "up" | "down" | "stable" | "none";
  /** Percentage change from previous period */
  readonly trendPercent: number;
}

/**
 * Breakdown of resolutions by lifetime.
 */
export interface LifetimeBreakdown {
  readonly singleton: number;
  readonly scoped: number;
  readonly request: number;
  readonly total: number;
}

/**
 * Top services by resolution count or duration.
 */
export interface TopServiceViewModel {
  /** Port name */
  readonly portName: string;
  /** Resolution count */
  readonly count: number;
  /** Total duration across all resolutions */
  readonly totalDurationMs: number;
  /** Average duration per resolution */
  readonly avgDurationMs: number;
  /** Formatted average duration */
  readonly avgDurationFormatted: string;
  /** Cache hit rate for this service */
  readonly cacheHitRate: number;
  /** Formatted cache hit rate (e.g., "85%") */
  readonly cacheHitRateFormatted: string;
  /** Percentage of total resolutions */
  readonly percentOfTotal: number;
}

// =============================================================================
// Chart Data
// =============================================================================

/**
 * Data point for time-series charts.
 */
export interface TimeSeriesPoint {
  /** Timestamp in milliseconds */
  readonly timestamp: number;
  /** Formatted time label */
  readonly label: string;
  /** Value at this point */
  readonly value: number;
}

/**
 * Time series data for charts.
 */
export interface TimeSeriesData {
  /** Series identifier */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Data points */
  readonly points: readonly TimeSeriesPoint[];
  /** Color for rendering (optional hint) */
  readonly color?: string;
}

// =============================================================================
// Stats View Model
// =============================================================================

/**
 * Complete view model for rendering statistics dashboard.
 */
export interface StatsViewModel {
  /** Summary metrics */
  readonly metrics: {
    readonly totalResolutions: MetricViewModel;
    readonly averageDuration: MetricViewModel;
    readonly cacheHitRate: MetricViewModel;
    readonly slowResolutions: MetricViewModel;
    readonly sessionDuration: MetricViewModel;
    readonly resolutionsPerSecond: MetricViewModel;
  };
  /** Breakdown by lifetime */
  readonly lifetimeBreakdown: LifetimeBreakdown;
  /** Formatted lifetime breakdown percentages */
  readonly lifetimeBreakdownFormatted: {
    readonly singleton: string;
    readonly scoped: string;
    readonly request: string;
  };
  /** Top services by resolution count */
  readonly topServicesByCount: readonly TopServiceViewModel[];
  /** Top services by total duration */
  readonly topServicesByDuration: readonly TopServiceViewModel[];
  /** Top services by average duration (slowest) */
  readonly slowestServices: readonly TopServiceViewModel[];
  /** Resolution count over time */
  readonly resolutionTimeSeries: TimeSeriesData;
  /** Cache hit rate over time */
  readonly cacheHitTimeSeries: TimeSeriesData;
  /** Session start time (formatted) */
  readonly sessionStart: string;
  /** Session duration (formatted) */
  readonly sessionDuration: string;
  /** Whether stats are empty (no data) */
  readonly isEmpty: boolean;
  /** Last update timestamp */
  readonly lastUpdated: string;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a metric view model with default values.
 */
function createEmptyMetric(id: string, label: string, unit: string): MetricViewModel {
  return Object.freeze({
    id,
    label,
    value: 0,
    formattedValue: "0",
    unit,
    trend: "none" as const,
    trendPercent: 0,
  });
}

/**
 * Creates an empty StatsViewModel.
 */
export function createEmptyStatsViewModel(): StatsViewModel {
  return Object.freeze({
    metrics: Object.freeze({
      totalResolutions: createEmptyMetric("totalResolutions", "Total Resolutions", ""),
      averageDuration: createEmptyMetric("averageDuration", "Avg Duration", "ms"),
      cacheHitRate: createEmptyMetric("cacheHitRate", "Cache Hit Rate", "%"),
      slowResolutions: createEmptyMetric("slowResolutions", "Slow Resolutions", ""),
      sessionDuration: createEmptyMetric("sessionDuration", "Session Duration", ""),
      resolutionsPerSecond: createEmptyMetric("resolutionsPerSecond", "Res/sec", ""),
    }),
    lifetimeBreakdown: Object.freeze({ singleton: 0, scoped: 0, request: 0, total: 0 }),
    lifetimeBreakdownFormatted: Object.freeze({ singleton: "0%", scoped: "0%", request: "0%" }),
    topServicesByCount: Object.freeze([]),
    topServicesByDuration: Object.freeze([]),
    slowestServices: Object.freeze([]),
    resolutionTimeSeries: Object.freeze({ id: "resolutions", label: "Resolutions", points: Object.freeze([]) }),
    cacheHitTimeSeries: Object.freeze({ id: "cacheHit", label: "Cache Hit Rate", points: Object.freeze([]) }),
    sessionStart: "-",
    sessionDuration: "-",
    isEmpty: true,
    lastUpdated: "-",
  });
}
