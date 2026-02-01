/**
 * Span Module
 *
 * Resolution span types and utilities for structured tracing.
 *
 * @packageDocumentation
 */

// Span types
export type { ResolutionSpan } from "./types.js";

// Span builder and utilities
export { SpanBuilder, toSpan, getSelfTime, getSpanDepth, countSpans } from "./builder.js";

// Metrics
export type { ContainerMetrics, LifetimeMetrics, PortMetrics } from "./metrics.js";
export { MetricsCollector, fromTraceStats } from "./metrics.js";
