/**
 * Hook for subscribing to trace statistics with automatic updates.
 *
 * This hook now requires a TracingAPI to be passed explicitly
 * since the legacy DevToolsContext has been removed.
 *
 * @packageDocumentation
 */

import { useState, useEffect, useRef } from "react";
import type { TraceStats, TracingAPI } from "@hex-di/plugin";

/**
 * Empty stats object returned when tracing is not available.
 */
const EMPTY_STATS: TraceStats = {
  totalResolutions: 0,
  averageDuration: 0,
  cacheHitRate: 0,
  slowCount: 0,
  sessionStart: 0,
  totalDuration: 0,
};

/**
 * Subscribe to trace statistics with automatic updates.
 *
 * Uses requestAnimationFrame to debounce high-frequency updates.
 * Returns empty stats if tracing is not available.
 *
 * @param tracingAPI - The tracing API instance (optional, returns empty stats if null/undefined)
 * @returns Current TraceStats (empty stats if tracing unavailable)
 *
 * @example
 * ```typescript
 * function StatsPanel({ tracingAPI }: { tracingAPI?: TracingAPI }) {
 *   const stats = useTraceStats(tracingAPI);
 *
 *   return (
 *     <div>
 *       <div>Total: {stats.totalResolutions}</div>
 *       <div>Cache Hit Rate: {(stats.cacheHitRate * 100).toFixed(1)}%</div>
 *       <div>Avg Duration: {stats.averageDuration.toFixed(2)}ms</div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTraceStats(tracingAPI: TracingAPI | undefined | null): TraceStats {
  const [stats, setStats] = useState<TraceStats>(EMPTY_STATS);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!tracingAPI) {
      setStats(EMPTY_STATS);
      return;
    }

    // Initial fetch
    setStats(tracingAPI.getStats());

    // Subscribe to updates with RAF debouncing
    const unsubscribe = tracingAPI.subscribe(() => {
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          setStats(tracingAPI.getStats());
        });
      }
    });

    return () => {
      unsubscribe();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [tracingAPI]);

  return stats;
}
