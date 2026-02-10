/**
 * Tracing Inspection API barrel export.
 *
 * @packageDocumentation
 */

// Types
export type {
  SpanFilter,
  TimeRangeOptions,
  TraceTree,
  TracingQueryAPI,
  SpanSource,
} from "./types.js";

// Filter
export { matchesFilter, filterSpans } from "./filter.js";

// Aggregation
export {
  computeAverageDuration,
  computeErrorCount,
  computeCacheHitRate,
  computePercentiles,
  buildTraceTree,
} from "./aggregation.js";

// Query API Factory
export { createTracingQueryApi } from "./query-api.js";

// Library Inspector Bridge
export {
  TracingLibraryInspectorPort,
  createTracingLibraryInspector,
} from "./library-inspector-bridge.js";

// Ports
export { TracingQueryApiPort } from "./ports.js";

// Adapters
export { TracingLibraryInspectorAdapter } from "./adapters.js";
