/**
 * Tracing types for resolution monitoring.
 *
 * These types define the tracing API used for performance monitoring
 * and debugging service resolution.
 *
 * @packageDocumentation
 */

import type { Lifetime } from "./container-types.js";

// =============================================================================
// Trace Types (Canonical - Single Source of Truth)
// =============================================================================

/**
 * Represents a single resolution trace entry.
 *
 * Each TraceEntry captures comprehensive data about one service resolution,
 * including timing information, cache status, and dependency hierarchy.
 * Entries form a tree structure through parentId/childIds relationships.
 *
 * @example
 * ```typescript
 * const entry: TraceEntry = {
 *   id: "trace-1",
 *   portName: "UserService",
 *   lifetime: "scoped",
 *   startTime: 1234.567,
 *   duration: 25.3,
 *   isCacheHit: false,
 *   parentId: null,
 *   childIds: ["trace-2", "trace-3"],
 *   scopeId: "scope-1",
 *   order: 1,
 *   isPinned: false,
 * };
 * ```
 */
export interface TraceEntry {
  /** Unique identifier for this trace entry */
  readonly id: string;
  /** Name of the port being resolved */
  readonly portName: string;
  /** Service lifetime of the resolved adapter */
  readonly lifetime: Lifetime;
  /**
   * Timestamp when resolution started.
   *
   * ## Clock Source Contract
   *
   * This value is produced by the clock function configured on the container.
   * The default clock is `performance.now()` (monotonic, high-resolution).
   *
   * | Clock Source       | Units          | Monotonic | Cross-Process |
   * |--------------------|----------------|-----------|---------------|
   * | `performance.now()`| milliseconds   | Yes       | No            |
   * | `Date.now()`       | epoch ms       | No        | Yes           |
   * | Custom             | user-defined   | Depends   | Depends       |
   *
   * For GxP cross-system correlation, use `Date.now()` or a synchronized clock.
   * For local performance analysis, use `performance.now()` (default).
   *
   * @see TracingOptions - For clock configuration
   */
  readonly startTime: number;
  /** Duration of the resolution in milliseconds */
  readonly duration: number;
  /** Whether this resolution was served from cache */
  readonly isCacheHit: boolean;
  /** ID of the parent trace entry, or null for root resolutions */
  readonly parentId: string | null;
  /** IDs of child trace entries */
  readonly childIds: readonly string[];
  /** ID of the scope where resolution occurred, or null for container-level */
  readonly scopeId: string | null;
  /** Global resolution order counter */
  readonly order: number;
  /** Whether this trace is pinned (protected from FIFO eviction) */
  readonly isPinned: boolean;
}

/**
 * Aggregate statistics computed from trace entries.
 *
 * Provides high-level metrics for performance analysis and monitoring.
 *
 * @example
 * ```typescript
 * const stats: TraceStats = {
 *   totalResolutions: 150,
 *   averageDuration: 25.5,
 *   cacheHitRate: 0.65,    // 65% cache hit rate
 *   slowCount: 12,
 *   sessionStart: 1702500000000,
 *   totalDuration: 3825.0,
 * };
 * ```
 */
export interface TraceStats {
  /** Total number of resolution traces recorded */
  readonly totalResolutions: number;
  /** Average resolution duration in milliseconds */
  readonly averageDuration: number;
  /** Ratio of cache hits to total resolutions (0 to 1) */
  readonly cacheHitRate: number;
  /** Number of resolutions that exceeded slowThresholdMs */
  readonly slowCount: number;
  /** Timestamp when the tracing session started */
  readonly sessionStart: number;
  /** Total cumulative duration of all resolutions in milliseconds */
  readonly totalDuration: number;
}

/**
 * Filter criteria for querying trace entries.
 *
 * All properties are optional; multiple criteria are ANDed together.
 *
 * @example
 * ```typescript
 * const filter: TraceFilter = {
 *   lifetime: "scoped",
 *   minDuration: 50,
 * };
 * ```
 */
export interface TraceFilter {
  /** Filter by port name (partial match, case-insensitive) */
  readonly portName?: string;
  /** Filter by service lifetime */
  readonly lifetime?: Lifetime;
  /** Filter by cache hit status */
  readonly isCacheHit?: boolean;
  /** Minimum duration in milliseconds (inclusive) */
  readonly minDuration?: number;
  /** Maximum duration in milliseconds (inclusive) */
  readonly maxDuration?: number;
  /** Filter by scope ID */
  readonly scopeId?: string | null;
  /** Filter by pinned status */
  readonly isPinned?: boolean;
}

/**
 * Configuration for trace buffer retention and eviction policy.
 */
export interface TraceRetentionPolicy {
  /** Maximum number of traces to retain in the buffer. @default 1000 */
  readonly maxTraces: number;
  /** Maximum number of pinned (slow) traces to retain. @default 100 */
  readonly maxPinnedTraces: number;
  /** Duration threshold in milliseconds for auto-pinning slow traces. @default 100 */
  readonly slowThresholdMs: number;
  /** Time in milliseconds after which non-pinned traces expire. @default 300000 */
  readonly expiryMs: number;
}

/**
 * Default trace retention policy values.
 */
export const DEFAULT_RETENTION_POLICY: TraceRetentionPolicy = {
  maxTraces: 1000,
  maxPinnedTraces: 100,
  slowThresholdMs: 100,
  expiryMs: 300000,
} as const;

/**
 * Configuration options for tracing-enabled containers.
 */
export interface TracingOptions {
  /** Custom retention policy configuration */
  readonly retentionPolicy?: Partial<TraceRetentionPolicy>;

  /**
   * Custom clock function for timestamp generation.
   *
   * @default performance.now (when available) or Date.now
   *
   * For GxP cross-system correlation, use:
   * ```typescript
   * { clock: () => Date.now() }
   * ```
   */
  readonly clock?: () => number;
}

/**
 * API exposed via TRACING_ACCESS Symbol on tracing-enabled containers.
 */
export interface TracingAPI {
  /** Retrieves trace entries, optionally filtered */
  getTraces(filter?: TraceFilter): readonly TraceEntry[];
  /** Computes and returns aggregate trace statistics */
  getStats(): TraceStats;
  /** Pauses trace recording */
  pause(): void;
  /** Resumes trace recording after pause() */
  resume(): void;
  /** Clears all traces from the buffer */
  clear(): void;
  /** Subscribes to new trace entries in real-time */
  subscribe(callback: (entry: TraceEntry) => void): () => void;
  /** Returns whether tracing is currently paused */
  isPaused(): boolean;
  /** Manually pins a trace to protect it from FIFO eviction */
  pin(traceId: string): void;
  /** Unpins a trace, making it eligible for FIFO eviction */
  unpin(traceId: string): void;

  /**
   * Subscribes to trace eviction events.
   *
   * Called when traces are removed from the buffer due to:
   * - FIFO eviction (buffer full)
   * - Expiry (trace older than expiryMs)
   * - Manual clear() call
   *
   * Use this callback to persist traces to durable storage
   * before they are lost.
   *
   * @param callback - Called with evicted entries and eviction reason
   * @returns Unsubscribe function
   */
  onEvict(
    callback: (entries: readonly TraceEntry[], reason: TraceEvictionReason) => void
  ): () => void;
}

/**
 * Reason for trace eviction from the buffer.
 */
export type TraceEvictionReason = "fifo" | "expiry" | "clear";

/**
 * Type guard to check if an object has tracing capabilities.
 */
export function hasTracingAccess(container: unknown): container is { [key: symbol]: TracingAPI } {
  return (
    typeof container === "object" &&
    container !== null &&
    Symbol.for("hex-di/tracing-access") in container
  );
}
