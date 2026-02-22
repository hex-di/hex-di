/**
 * Health derivation from HTTP client inspector state.
 *
 * Derives a health status (healthy/degraded/unhealthy) from the client's
 * error rate and latency metrics.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface HealthCheckResult {
  readonly _tag: "HealthCheckResult";
  readonly status: HealthStatus;
  readonly latencyMs: number | undefined;
  readonly errorRate: number;
  readonly message: string;
}

export interface HealthConfig {
  /** Error rate threshold for degraded status (0.0-1.0). Default: 0.1. */
  readonly degradedThreshold?: number;

  /** Error rate threshold for unhealthy status (0.0-1.0). Default: 0.5. */
  readonly unhealthyThreshold?: number;
}

export interface HealthMetrics {
  readonly totalRequests: number;
  readonly failedRequests: number;
  readonly averageLatencyMs: number | undefined;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Derive health status from HTTP client metrics.
 *
 * @example
 * ```typescript
 * const health = deriveHealth({
 *   totalRequests: 100,
 *   failedRequests: 5,
 *   averageLatencyMs: 150,
 * });
 * // { status: "healthy", errorRate: 0.05, latencyMs: 150, ... }
 * ```
 */
export function deriveHealth(
  metrics: HealthMetrics,
  config?: HealthConfig,
): HealthCheckResult {
  const degradedThreshold = config?.degradedThreshold ?? 0.1;
  const unhealthyThreshold = config?.unhealthyThreshold ?? 0.5;

  const errorRate =
    metrics.totalRequests > 0
      ? metrics.failedRequests / metrics.totalRequests
      : 0;

  let status: HealthStatus;
  let message: string;

  if (metrics.totalRequests === 0) {
    status = "healthy";
    message = "No requests recorded";
  } else if (errorRate >= unhealthyThreshold) {
    status = "unhealthy";
    message = `Error rate ${(errorRate * 100).toFixed(1)}% exceeds unhealthy threshold ${(unhealthyThreshold * 100).toFixed(1)}%`;
  } else if (errorRate >= degradedThreshold) {
    status = "degraded";
    message = `Error rate ${(errorRate * 100).toFixed(1)}% exceeds degraded threshold ${(degradedThreshold * 100).toFixed(1)}%`;
  } else {
    status = "healthy";
    message = `Error rate ${(errorRate * 100).toFixed(1)}% is within acceptable range`;
  }

  return Object.freeze({
    _tag: "HealthCheckResult" as const,
    status,
    latencyMs: metrics.averageLatencyMs,
    errorRate,
    message,
  });
}
