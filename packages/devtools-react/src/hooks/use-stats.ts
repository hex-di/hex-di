/**
 * useStats - Hook for trace statistics data.
 *
 * Provides access to statistics view model.
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import { useDevToolsContext } from "../context/devtools-context.js";
import type { StatsViewModel } from "@hex-di/devtools-ui";

/**
 * Stats hook return type.
 */
export interface UseStatsResult {
  /**
   * The stats view model, or null if not available.
   */
  readonly viewModel: StatsViewModel | null;

  /**
   * Whether tracing is available.
   */
  readonly hasTracing: boolean;

  /**
   * Total resolution count.
   */
  readonly totalResolutions: number;

  /**
   * Average resolution duration.
   */
  readonly averageDuration: number;

  /**
   * Cache hit rate (0-1).
   */
  readonly cacheHitRate: number;

  /**
   * Number of slow resolutions.
   */
  readonly slowCount: number;
}

/**
 * Hook to access trace statistics.
 *
 * @example
 * ```tsx
 * function StatsView() {
 *   const { viewModel, totalResolutions, cacheHitRate } = useStats();
 *
 *   return (
 *     <div>
 *       <p>Total: {totalResolutions}</p>
 *       <p>Cache Hit Rate: {(cacheHitRate * 100).toFixed(1)}%</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useStats(): UseStatsResult {
  const context = useDevToolsContext();

  const stats = context.dataSource?.getStats();

  const result = useMemo((): UseStatsResult => ({
    viewModel: context.viewModels.stats,
    hasTracing: context.dataSource?.hasTracing() ?? false,
    totalResolutions: stats?.totalResolutions ?? 0,
    averageDuration: stats?.averageDuration ?? 0,
    cacheHitRate: stats?.cacheHitRate ?? 0,
    slowCount: stats?.slowCount ?? 0,
  }), [
    context.viewModels.stats,
    context.dataSource,
    stats?.totalResolutions,
    stats?.averageDuration,
    stats?.cacheHitRate,
    stats?.slowCount,
  ]);

  return result;
}
