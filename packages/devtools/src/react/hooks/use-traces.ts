/**
 * Hook for subscribing to trace entries with automatic updates.
 *
 * @packageDocumentation
 */

import { useState, useEffect, useRef } from "react";
import type { TraceEntry, TraceFilter } from "@hex-di/devtools-core";
import { useTracingAPI } from "./use-devtools.js";

/**
 * Result returned by useTraces hook.
 */
export interface UseTracesResult {
  /** Current trace entries (filtered if filter provided) */
  readonly traces: readonly TraceEntry[];

  /** Whether tracing is available */
  readonly isAvailable: boolean;

  /** Manually refresh traces (useful after filter changes) */
  readonly refresh: () => void;
}

/**
 * Subscribe to trace entries with automatic updates.
 *
 * Uses requestAnimationFrame to debounce high-frequency updates from TracingAPI.
 * The hook automatically subscribes to new traces and updates state accordingly.
 *
 * @param filter - Optional filter to apply to traces
 * @returns UseTracesResult with traces, availability, and refresh function
 *
 * @example Basic usage
 * ```typescript
 * function TraceList() {
 *   const { traces, isAvailable } = useTraces();
 *
 *   if (!isAvailable) return <div>Tracing not enabled</div>;
 *
 *   return (
 *     <ul>
 *       {traces.map(trace => (
 *         <li key={trace.id}>{trace.portName}: {trace.duration}ms</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 *
 * @example With filter
 * ```typescript
 * function SlowTraces() {
 *   const filter = useMemo(() => ({ minDuration: 100 }), []);
 *   const { traces } = useTraces(filter);
 *
 *   return <div>Slow traces: {traces.length}</div>;
 * }
 * ```
 */
export function useTraces(filter?: TraceFilter): UseTracesResult {
  const tracingAPI = useTracingAPI();
  const [traces, setTraces] = useState<readonly TraceEntry[]>([]);
  const rafIdRef = useRef<number | null>(null);

  const refresh = (): void => {
    if (tracingAPI) {
      setTraces(tracingAPI.getTraces(filter));
    }
  };

  useEffect(() => {
    if (!tracingAPI) {
      setTraces([]);
      return;
    }

    // Initial fetch
    setTraces(tracingAPI.getTraces(filter));

    // Subscribe to updates with RAF debouncing
    const unsubscribe = tracingAPI.subscribe(() => {
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          setTraces(tracingAPI.getTraces(filter));
        });
      }
    });

    return () => {
      unsubscribe();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [tracingAPI, filter]);

  return {
    traces,
    isAvailable: tracingAPI !== null,
    refresh,
  };
}
