/**
 * TracingPlugin - Plugin for tracing container resolutions.
 *
 * Provides resolution instrumentation via the plugin hook system.
 * Traces are collected in real-time with parent-child hierarchy tracking,
 * timing information, and cache hit detection.
 *
 * @packageDocumentation
 */

import { definePlugin } from "../../plugin/index.js";
import type { PluginHooks } from "../../plugin/index.js";
import type {
  TracingAPI,
  TraceEntry,
  TraceFilter,
  TraceStats,
  TraceRetentionPolicy,
} from "@hex-di/plugin";
import { DEFAULT_RETENTION_POLICY } from "@hex-di/plugin";
import { MemoryCollector } from "./collectors/memory-collector.js";
import type { TraceCollector } from "./collectors/collector.js";

// =============================================================================
// Tracing Symbol
// =============================================================================

/**
 * Symbol for accessing the TracingAPI on a container.
 *
 * Use this to access tracing functionality on containers created with TracingPlugin:
 *
 * @example
 * ```typescript
 * import { createContainer, TracingPlugin, TRACING } from "@hex-di/runtime";
 *
 * const container = createContainer(graph, {
 *   plugins: [TracingPlugin],
 * });
 *
 * const tracing = container[TRACING];
 * tracing.getTraces();  // Get all traces
 * tracing.getStats();   // Get aggregate statistics
 * ```
 */
export const TRACING = Symbol.for("hex-di/tracing");

// =============================================================================
// Plugin Options
// =============================================================================

/**
 * Configuration options for the tracing plugin.
 */
export interface TracingPluginOptions {
  /**
   * Custom trace collector implementation.
   *
   * If not provided, a MemoryCollector is used with the retention policy.
   * Use NoOpCollector for production environments where tracing is disabled.
   */
  readonly collector?: TraceCollector;

  /**
   * Retention policy for the default MemoryCollector.
   *
   * Ignored if a custom collector is provided.
   */
  readonly retentionPolicy?: Partial<TraceRetentionPolicy>;
}

// =============================================================================
// Internal State Types
// =============================================================================

/**
 * Tracks an active resolution in progress.
 * @internal
 */
interface ActiveTrace {
  /** Unique trace ID */
  readonly id: string;
  /** High-resolution start time */
  readonly startTime: number;
  /** Child trace IDs accumulated during resolution */
  readonly childIds: string[];
}

/**
 * Internal state for the tracing plugin.
 * @internal
 */
interface TracingState {
  /** Whether tracing is paused */
  isPaused: boolean;
  /** Counter for generating unique trace IDs */
  traceIdCounter: number;
  /** Global ordering counter for traces */
  orderCounter: number;
  /** Map of active traces by port name */
  activeTraces: Map<string, ActiveTrace>;
  /** Stack of trace IDs for parent tracking (LIFO) */
  traceStack: string[];
}

// =============================================================================
// Plugin Factory
// =============================================================================

/**
 * Creates a TracingPlugin with custom configuration.
 *
 * Use this factory when you need to customize the collector or retention policy.
 * For default configuration, use the pre-created `TracingPlugin` constant.
 *
 * @param options - Optional configuration
 * @returns A configured TracingPlugin
 *
 * @example Custom retention policy
 * ```typescript
 * const CustomTracingPlugin = createTracingPlugin({
 *   retentionPolicy: {
 *     maxTraces: 5000,
 *     slowThresholdMs: 50,
 *   },
 * });
 *
 * const container = createContainer(graph, {
 *   plugins: [CustomTracingPlugin],
 * });
 * ```
 *
 * @example Production with NoOpCollector
 * ```typescript
 * import { createTracingPlugin, NoOpCollector } from "@hex-di/runtime";
 *
 * const ProductionTracingPlugin = createTracingPlugin({
 *   collector: new NoOpCollector(),
 * });
 * ```
 */
export function createTracingPlugin(options?: TracingPluginOptions) {
  const policy = { ...DEFAULT_RETENTION_POLICY, ...options?.retentionPolicy };
  const collector = options?.collector ?? new MemoryCollector(policy);

  const state: TracingState = {
    isPaused: false,
    traceIdCounter: 0,
    orderCounter: 0,
    activeTraces: new Map(),
    traceStack: [],
  };

  const hooks: PluginHooks = {
    beforeResolve(ctx) {
      if (state.isPaused) return;

      const traceId = `trace-${++state.traceIdCounter}`;

      // Get parent trace ID from stack if exists
      const parentTraceId =
        state.traceStack.length > 0 ? state.traceStack[state.traceStack.length - 1] : null;

      // Register as child of parent trace
      if (parentTraceId !== null) {
        // Find parent's active trace entry and add this as child
        for (const active of state.activeTraces.values()) {
          if (active.id === parentTraceId) {
            active.childIds.push(traceId);
            break;
          }
        }
      }

      // Store active trace for this port
      state.activeTraces.set(ctx.portName, {
        id: traceId,
        startTime: Date.now(),
        childIds: [],
      });

      // Push onto stack for child tracking
      state.traceStack.push(traceId);
    },

    afterResolve(ctx) {
      if (state.isPaused) return;

      const active = state.activeTraces.get(ctx.portName);
      if (!active) return;

      // Pop from stack
      state.traceStack.pop();
      state.activeTraces.delete(ctx.portName);

      // Determine parent ID from current stack (after pop)
      const parentId =
        state.traceStack.length > 0 ? state.traceStack[state.traceStack.length - 1] : null;

      const entry: TraceEntry = {
        id: active.id,
        portName: ctx.portName,
        lifetime: ctx.lifetime,
        startTime: active.startTime,
        duration: ctx.duration,
        isCacheHit: ctx.isCacheHit,
        parentId,
        childIds: Object.freeze([...active.childIds]),
        scopeId: ctx.scopeId,
        order: ++state.orderCounter,
        isPinned: false,
      };

      collector.collect(entry);
    },
  };

  return definePlugin({
    name: "tracing",
    symbol: TRACING,
    requires: [] as const,
    enhancedBy: [] as const,

    createApi(): TracingAPI {
      return Object.freeze({
        getTraces: (filter?: TraceFilter) => collector.getTraces(filter),
        getStats: (): TraceStats => collector.getStats(),
        pause: (): void => {
          state.isPaused = true;
        },
        resume: (): void => {
          state.isPaused = false;
        },
        clear: (): void => collector.clear(),
        subscribe: (cb: (entry: TraceEntry) => void) => collector.subscribe(cb),
        isPaused: (): boolean => state.isPaused,
        pin: (id: string): void => collector.pin?.(id),
        unpin: (id: string): void => collector.unpin?.(id),
      });
    },

    hooks,
  });
}

// =============================================================================
// Default Plugin Instance
// =============================================================================

/**
 * Pre-configured TracingPlugin with default settings.
 *
 * Uses MemoryCollector with DEFAULT_RETENTION_POLICY:
 * - maxTraces: 1000
 * - maxPinnedTraces: 100
 * - slowThresholdMs: 100
 * - expiryMs: 300000 (5 minutes)
 *
 * @example
 * ```typescript
 * import { createContainer, TracingPlugin, TRACING } from "@hex-di/runtime";
 *
 * const container = createContainer(graph, {
 *   plugins: [TracingPlugin],
 * });
 *
 * // Access tracing API via symbol
 * const tracing = container[TRACING];
 *
 * // Get all traces
 * const traces = tracing.getTraces();
 *
 * // Get stats
 * const stats = tracing.getStats();
 * console.log(`Total resolutions: ${stats.totalResolutions}`);
 * console.log(`Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
 *
 * // Subscribe to new traces
 * const unsubscribe = tracing.subscribe((entry) => {
 *   console.log(`Resolved ${entry.portName} in ${entry.duration}ms`);
 * });
 *
 * // Pause/resume tracing
 * tracing.pause();
 * tracing.resume();
 *
 * // Clear traces
 * tracing.clear();
 * ```
 */
export const TracingPlugin = createTracingPlugin();
