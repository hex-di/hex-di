/**
 * useDataSourceTracingSummary hook for reactive tracing metrics.
 *
 * Returns a summary of tracing data (total spans, error count, avg duration,
 * cache hit rate) from the InspectorDataSource and re-renders when data changes.
 *
 * Uses the library inspector registry protocol -- no dependency on @hex-di/tracing.
 *
 * @packageDocumentation
 */

import { useRef, useSyncExternalStore } from "react";
import { useDataSource } from "../context/data-source-context.js";

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
 * Reactive tracing summary computed from the data source.
 * Returns undefined when no tracing inspector is available.
 */
export function useDataSourceTracingSummary(): TracingSummary | undefined {
  const dataSource = useDataSource();
  const cachedRef = useRef<TracingSummary | undefined>(undefined);

  const getSnapshot = (): TracingSummary | undefined => {
    const libraryInspectors = dataSource.getLibraryInspectors();
    if (!libraryInspectors) {
      cachedRef.current = undefined;
      return undefined;
    }

    const tracingInspector = libraryInspectors.get("tracing");
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
    onStoreChange => dataSource.subscribe(() => onStoreChange()),
    getSnapshot,
    getSnapshot
  );
}
