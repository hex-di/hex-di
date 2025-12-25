/**
 * Hook for subscribing to trace statistics with automatic updates.
 *
 * @packageDocumentation
 */

import { useState, useEffect, useRef } from "react";
import type { TraceStats } from "@hex-di/devtools-core";
import { useTracingAPI } from "./use-devtools.js";

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
 * @returns Current TraceStats (empty stats if tracing unavailable)
 *
 * @example
 * ```typescript
 * function StatsPanel() {
 *   const stats = useTraceStats();
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
export function useTraceStats(): TraceStats {
  const tracingAPI = useTracingAPI();
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
