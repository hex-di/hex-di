/**
 * @hex-di/runtime tracing plugin - Resolution tracing for @hex-di containers.
 *
 * Provides a TracingPlugin that instruments container resolutions,
 * collecting timing information, cache hit rates, and parent-child
 * dependency hierarchies.
 *
 * @example Basic usage
 * ```typescript
 * import { createContainer, TracingPlugin, TRACING } from "@hex-di/runtime";
 *
 * const container = createContainer(graph, {
 *   plugins: [TracingPlugin],
 * });
 *
 * // Access tracing API via symbol
 * const tracing = container[TRACING];
 * const traces = tracing.getTraces();
 * const stats = tracing.getStats();
 * ```
 *
 * @example Custom configuration
 * ```typescript
 * import { createTracingPlugin, TRACING } from "@hex-di/runtime";
 *
 * const CustomTracingPlugin = createTracingPlugin({
 *   retentionPolicy: {
 *     maxTraces: 5000,
 *     slowThresholdMs: 50,
 *   },
 * });
 * ```
 *
 * @example Production (zero overhead)
 * ```typescript
 * import { createTracingPlugin, NoOpCollector, TRACING } from "@hex-di/runtime";
 *
 * const ProductionTracingPlugin = createTracingPlugin({
 *   collector: new NoOpCollector(),
 * });
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Plugin Exports
// =============================================================================

export {
  TRACING,
  createTracingPlugin,
  TracingPlugin,
  type TracingPluginOptions,
} from "./plugin.js";

// =============================================================================
// Wrapper Export (Zustand/Redux-style enhancement pattern)
// =============================================================================

export { withTracing, type WithTracing } from "./wrapper.js";

// =============================================================================
// Collector Exports
// =============================================================================

export type { TraceCollector, TraceSubscriber, Unsubscribe } from "./collectors/collector.js";

export { MemoryCollector } from "./collectors/memory-collector.js";
export { NoOpCollector } from "./collectors/noop-collector.js";
export { CompositeCollector } from "./collectors/composite-collector.js";

// =============================================================================
// Type Guards and Helpers
// =============================================================================

export { hasTracing, getTracingAPI, type ContainerWithTracing } from "./type-guards.js";
