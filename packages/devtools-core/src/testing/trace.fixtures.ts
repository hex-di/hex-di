/**
 * Trace fixture factories for testing.
 *
 * @internal This module is for internal testing only and is not part of the public API.
 * @packageDocumentation
 */

import type { TraceEntry, TraceStats } from "@hex-di/core";

// =============================================================================
// Trace Entry Factory
// =============================================================================

/**
 * Options for creating a trace entry with required id.
 *
 * @internal
 */
export type CreateTraceEntryOptions = Partial<Omit<TraceEntry, "id">> & {
  readonly id: string;
};

// Counter for generating unique trace IDs and order values
let traceCounter = 0;

/**
 * Reset the trace counter.
 * Useful for ensuring deterministic test output.
 *
 * @internal
 */
export function resetTraceCounter(): void {
  traceCounter = 0;
}

/**
 * Create a trace entry with sensible defaults.
 *
 * Only `id` is required; all other properties have defaults:
 * - `portName`: defaults to `id`
 * - `lifetime`: defaults to `"singleton"`
 * - `startTime`: defaults to `Date.now()`
 * - `duration`: defaults to `1`
 * - `isCacheHit`: defaults to `false`
 * - `isPinned`: defaults to `false`
 * - `parentId`: defaults to `null`
 * - `childIds`: defaults to `[]`
 * - `scopeId`: defaults to `null`
 * - `order`: defaults to auto-incrementing counter
 *
 * @internal This function is for internal testing only.
 *
 * @param options - Trace entry options with required id
 * @returns A TraceEntry with all required fields
 */
export function createTraceEntry(options: CreateTraceEntryOptions): TraceEntry {
  const {
    id,
    portName,
    lifetime,
    startTime,
    duration,
    isCacheHit,
    isPinned,
    parentId,
    childIds,
    scopeId,
    order,
  } = options;

  return {
    id,
    portName: portName ?? id,
    lifetime: lifetime ?? "singleton",
    startTime: startTime ?? Date.now(),
    duration: duration ?? 1,
    isCacheHit: isCacheHit ?? false,
    isPinned: isPinned ?? false,
    parentId: parentId ?? null,
    childIds: childIds ?? [],
    scopeId: scopeId ?? null,
    order: order ?? traceCounter++,
  };
}

/**
 * Generate a unique trace ID.
 *
 * @internal
 *
 * @param prefix - Optional prefix for the ID
 * @returns A unique trace ID string
 */
export function generateTraceId(prefix = "trace"): string {
  return `${prefix}-${traceCounter++}-${Date.now()}`;
}

// =============================================================================
// Trace Stats Factory
// =============================================================================

/**
 * Options for creating trace statistics.
 *
 * @internal
 */
export interface CreateTraceStatsOptions {
  readonly totalResolutions?: number;
  readonly averageDuration?: number;
  readonly cacheHitRate?: number;
  readonly slowCount?: number;
  readonly sessionStart?: number;
  readonly totalDuration?: number;
}

/**
 * Create trace statistics with sensible defaults.
 *
 * @internal This function is for internal testing only.
 *
 * @param options - Stats creation options
 * @returns A TraceStats object
 */
export function createTraceStats(options: CreateTraceStatsOptions = {}): TraceStats {
  return {
    totalResolutions: options.totalResolutions ?? 0,
    averageDuration: options.averageDuration ?? 0,
    cacheHitRate: options.cacheHitRate ?? 0,
    slowCount: options.slowCount ?? 0,
    sessionStart: options.sessionStart ?? Date.now(),
    totalDuration: options.totalDuration ?? 0,
  };
}

// =============================================================================
// Pre-built Test Traces
// =============================================================================

/**
 * Create a set of test trace entries representing a typical resolution sequence.
 *
 * The sequence represents resolving UserService, which depends on Logger and Config:
 * 1. Logger resolution (singleton, fast)
 * 2. Config resolution (singleton, fast)
 * 3. UserService resolution (scoped, with children)
 *
 * @internal
 *
 * @param baseTime - Optional base timestamp (defaults to Date.now())
 * @returns Array of TraceEntry
 */
export function createTestTraces(baseTime?: number): readonly TraceEntry[] {
  const now = baseTime ?? Date.now();

  const loggerTrace = createTraceEntry({
    id: "trace-logger",
    portName: "Logger",
    lifetime: "singleton",
    startTime: now,
    duration: 2,
    isCacheHit: false,
    order: 0,
  });

  const configTrace = createTraceEntry({
    id: "trace-config",
    portName: "Config",
    lifetime: "singleton",
    startTime: now + 3,
    duration: 1,
    isCacheHit: false,
    order: 1,
  });

  const userServiceTrace = createTraceEntry({
    id: "trace-user-service",
    portName: "UserService",
    lifetime: "scoped",
    startTime: now + 5,
    duration: 10,
    isCacheHit: false,
    childIds: ["trace-logger", "trace-config"],
    order: 2,
  });

  // Update parent references
  const loggerWithParent: TraceEntry = {
    ...loggerTrace,
    parentId: "trace-user-service",
  };

  const configWithParent: TraceEntry = {
    ...configTrace,
    parentId: "trace-user-service",
  };

  return [loggerWithParent, configWithParent, userServiceTrace];
}

/**
 * Create test traces with cache hits.
 *
 * Represents a second resolution of the same services, where singletons hit cache:
 * 1. Logger resolution (cache hit)
 * 2. Config resolution (cache hit)
 * 3. UserService resolution (new scoped instance)
 *
 * @internal
 *
 * @param baseTime - Optional base timestamp
 * @returns Array of TraceEntry with cache hits
 */
export function createCacheHitTraces(baseTime?: number): readonly TraceEntry[] {
  const now = baseTime ?? Date.now();

  return [
    createTraceEntry({
      id: "trace-logger-cached",
      portName: "Logger",
      lifetime: "singleton",
      startTime: now,
      duration: 0.1,
      isCacheHit: true,
      order: 0,
    }),
    createTraceEntry({
      id: "trace-config-cached",
      portName: "Config",
      lifetime: "singleton",
      startTime: now + 1,
      duration: 0.1,
      isCacheHit: true,
      order: 1,
    }),
    createTraceEntry({
      id: "trace-user-service-2",
      portName: "UserService",
      lifetime: "scoped",
      startTime: now + 2,
      duration: 5,
      isCacheHit: false,
      childIds: ["trace-logger-cached", "trace-config-cached"],
      order: 2,
    }),
  ];
}

/**
 * Create test traces representing slow resolutions.
 *
 * @internal
 *
 * @param baseTime - Optional base timestamp
 * @param slowThreshold - Duration threshold for "slow" (default: 100ms)
 * @returns Array of TraceEntry with slow resolutions
 */
export function createSlowTraces(baseTime?: number, slowThreshold = 100): readonly TraceEntry[] {
  const now = baseTime ?? Date.now();

  return [
    createTraceEntry({
      id: "trace-slow-database",
      portName: "Database",
      lifetime: "singleton",
      startTime: now,
      duration: slowThreshold + 50, // 150ms
      isCacheHit: false,
      order: 0,
    }),
    createTraceEntry({
      id: "trace-slow-cache",
      portName: "Cache",
      lifetime: "singleton",
      startTime: now + 200,
      duration: slowThreshold + 100, // 200ms
      isCacheHit: false,
      order: 1,
    }),
    createTraceEntry({
      id: "trace-fast-logger",
      portName: "Logger",
      lifetime: "singleton",
      startTime: now + 450,
      duration: 5, // Fast
      isCacheHit: false,
      order: 2,
    }),
  ];
}

/**
 * Create realistic test statistics based on trace data.
 *
 * @internal
 *
 * @param traces - Optional trace entries to calculate stats from
 * @returns TraceStats calculated from traces
 */
export function createStatsFromTraces(traces: readonly TraceEntry[]): TraceStats {
  if (traces.length === 0) {
    return createTraceStats();
  }

  const durations = traces.map(t => t.duration);
  const cacheHits = traces.filter(t => t.isCacheHit).length;
  const totalDuration = durations.reduce((sum, d) => sum + d, 0);
  const averageDuration = totalDuration / traces.length;
  const slowCount = traces.filter(t => t.duration > 100).length;

  const startTimes = traces.map(t => t.startTime);
  const sessionStart = Math.min(...startTimes);

  return createTraceStats({
    totalResolutions: traces.length,
    averageDuration,
    cacheHitRate: cacheHits / traces.length,
    slowCount,
    sessionStart,
    totalDuration,
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create multiple trace entries for the same port (simulating repeated resolutions).
 *
 * @internal
 *
 * @param portName - The port name for all traces
 * @param count - Number of traces to create
 * @param common - Common properties for all traces
 * @returns Array of TraceEntry
 */
export function createRepeatedTraces(
  portName: string,
  count: number,
  common: Partial<Omit<TraceEntry, "id" | "portName" | "order">> = {}
): readonly TraceEntry[] {
  const traces: TraceEntry[] = [];
  const baseTime = common.startTime ?? Date.now();

  for (let i = 0; i < count; i++) {
    traces.push(
      createTraceEntry({
        id: `trace-${portName.toLowerCase()}-${i}`,
        portName,
        startTime: baseTime + i * 10,
        ...common,
      })
    );
  }

  return traces;
}

/**
 * Create a trace entry hierarchy (parent with children).
 *
 * @internal
 *
 * @param parentOptions - Options for the parent trace
 * @param childOptions - Array of options for child traces
 * @returns Object with parent and children traces
 */
export function createTraceHierarchy(
  parentOptions: CreateTraceEntryOptions,
  childOptions: readonly CreateTraceEntryOptions[]
): {
  readonly parent: TraceEntry;
  readonly children: readonly TraceEntry[];
  readonly all: readonly TraceEntry[];
} {
  const childIds = childOptions.map(opt => opt.id);

  const parent = createTraceEntry({
    ...parentOptions,
    childIds: childIds,
  });

  const children = childOptions.map(opt =>
    createTraceEntry({
      ...opt,
      parentId: parent.id,
    })
  );

  return {
    parent,
    children,
    all: [...children, parent],
  };
}
