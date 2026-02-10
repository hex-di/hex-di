/**
 * useTracingSummary hook for reactive tracing metrics.
 *
 * Returns a summary of tracing data (total spans, error count, avg duration,
 * cache hit rate) and re-renders when the container state changes.
 *
 * Uses the library inspector registry protocol — no dependency on @hex-di/tracing.
 *
 * @packageDocumentation
 */

import { useRef, useSyncExternalStore } from "react";
import { useInspector } from "./use-inspector.js";

/**
 * Summary of tracing metrics from the tracing library inspector.
 */
export interface TracingSummary {
  readonly totalSpans: number;
  readonly errorCount: number;
  readonly averageDuration: number;
  readonly cacheHitRate: number;
}

/**
 * Extracts a numeric value from a record, returning 0 if not a number.
 */
function numericOr0(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

/**
 * Hook that returns a summary of tracing metrics, re-rendering on changes.
 *
 * Uses the library inspector registry protocol to access the tracing
 * library's snapshot without depending on `@hex-di/tracing` directly.
 * Subscribes to inspector events via `useSyncExternalStore` — no polling.
 *
 * @returns TracingSummary when a tracing library inspector is registered,
 *          undefined when no tracing inspector is available.
 *
 * @throws {MissingProviderError} If called outside an InspectorProvider.
 *
 * @example Basic usage
 * ```tsx
 * function TracingDashboard() {
 *   const summary = useTracingSummary();
 *   if (!summary) return <p>Tracing not enabled</p>;
 *   return (
 *     <div>
 *       <p>Total Spans: {summary.totalSpans}</p>
 *       <p>Errors: {summary.errorCount}</p>
 *       <p>Avg Duration: {summary.averageDuration.toFixed(2)}ms</p>
 *       <p>Cache Hit Rate: {(summary.cacheHitRate * 100).toFixed(1)}%</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTracingSummary(): TracingSummary | undefined {
  const inspector = useInspector();
  const cachedRef = useRef<TracingSummary | undefined>(undefined);

  // getSnapshot must return a referentially stable value when data hasn't changed,
  // otherwise useSyncExternalStore will trigger infinite re-renders.
  const getSnapshot = (): TracingSummary | undefined => {
    const tracingInspector = inspector.getLibraryInspector("tracing");
    if (!tracingInspector) {
      cachedRef.current = undefined;
      return undefined;
    }
    const raw = tracingInspector.getSnapshot();
    const totalSpans = numericOr0(raw.totalSpans);
    const errorCount = numericOr0(raw.errorCount);
    const averageDuration = numericOr0(raw.averageDuration);
    const cacheHitRate = numericOr0(raw.cacheHitRate);

    const prev = cachedRef.current;
    if (
      prev !== undefined &&
      prev.totalSpans === totalSpans &&
      prev.errorCount === errorCount &&
      prev.averageDuration === averageDuration &&
      prev.cacheHitRate === cacheHitRate
    ) {
      return prev;
    }

    const next: TracingSummary = { totalSpans, errorCount, averageDuration, cacheHitRate };
    cachedRef.current = next;
    return next;
  };

  return useSyncExternalStore(
    onStoreChange => inspector.subscribe(() => onStoreChange()),
    getSnapshot,
    getSnapshot
  );
}
