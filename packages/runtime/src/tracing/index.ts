/**
 * @hex-di/runtime tracing module - Resolution tracing for @hex-di containers.
 *
 * Provides tracing utilities via the built-in `container.tracer` property,
 * collecting timing information, cache hit rates, and parent-child
 * dependency hierarchies.
 *
 * NOTE: Core tracing types and implementations are now in @hex-di/core.
 * This module re-exports them for backward compatibility during migration.
 *
 * @example Basic usage with built-in tracer
 * ```typescript
 * import { createContainer } from "@hex-di/runtime";
 *
 * const container = createContainer({ graph: graph, name: 'Root'  });
 *
 * // Access tracer API via built-in property
 * const traces = container.tracer.getTraces();
 * const stats = container.tracer.getStats();
 * ```
 *
 * @example Using collectors
 * ```typescript
 * import { MemoryCollector, NoOpCollector } from "@hex-di/core";
 *
 * // Development: memory collector for debugging
 * const devCollector = new MemoryCollector();
 *
 * // Production: no-op collector for zero overhead
 * const prodCollector = new NoOpCollector();
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Re-exports from @hex-di/core
// =============================================================================

// Collector types and implementations
export type { TraceCollector, TraceSubscriber, Unsubscribe } from "@hex-di/core";
export { MemoryCollector, NoOpCollector, CompositeCollector } from "@hex-di/core";

// Span types and builder
export type { ResolutionSpan } from "@hex-di/core";
export { SpanBuilder, toSpan, getSelfTime, getSpanDepth, countSpans } from "@hex-di/core";

// Metrics types and collector
export type { ContainerMetrics } from "@hex-di/core";
export { MetricsCollector } from "@hex-di/core";

// =============================================================================
// Runtime-specific Type Guards and Helpers
// =============================================================================

export { hasTracing, getTracingAPI, type ContainerWithTracing } from "./type-guards.js";
