/**
 * Metrics for the tracing pipeline itself.
 *
 * These counters enable monitoring the health of span collection
 * and export without external observability tooling.
 *
 * @packageDocumentation
 */

/**
 * Metrics for monitoring tracing pipeline health.
 *
 * Provides counters for tracking span creation, export success/failure,
 * and data loss through buffer overflow. These are the minimum metrics
 * needed for SRE dashboards to assess tracing pipeline health.
 *
 * @public
 */
export interface TracingMetrics {
  /** Total spans successfully exported */
  readonly spansExported: number;
  /** Total spans dropped due to buffer overflow */
  readonly spansDropped: number;
  /** Total export attempts that failed */
  readonly exportFailures: number;
  /** Total export attempts that succeeded */
  readonly exportSuccesses: number;
}
