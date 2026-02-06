/**
 * Exporter configuration types.
 *
 * @packageDocumentation
 */

import type { ResourceConfig } from "../resources/resource.js";

/**
 * Configuration options for OTLP HTTP exporter.
 *
 * These options control how spans are sent to OpenTelemetry-compatible
 * collectors via HTTP. All fields are optional with sensible defaults.
 *
 * @remarks
 * - Default endpoint is localhost collector (development setup)
 * - Production should override with actual collector URL
 * - Headers commonly used for authentication (API keys, bearer tokens)
 * - Resource metadata identifies the service generating traces
 *
 * @example
 * ```typescript
 * // Development - local collector
 * const exporter = createOtlpHttpExporter({
 *   resource: { serviceName: 'my-service' },
 * });
 *
 * // Production - cloud collector with auth
 * const exporter = createOtlpHttpExporter({
 *   url: 'https://api.honeycomb.io/v1/traces',
 *   headers: {
 *     'x-honeycomb-team': process.env.HONEYCOMB_API_KEY,
 *   },
 *   timeout: 30000,
 *   resource: {
 *     serviceName: 'my-service',
 *     serviceVersion: '1.2.3',
 *     deploymentEnvironment: 'production',
 *   },
 * });
 * ```
 */
export interface OtlpHttpExporterOptions {
  /**
   * OTLP HTTP endpoint URL.
   *
   * @default 'http://localhost:4318/v1/traces'
   *
   * @example
   * - Local collector: 'http://localhost:4318/v1/traces'
   * - Honeycomb: 'https://api.honeycomb.io/v1/traces'
   * - Lightstep: 'https://ingest.lightstep.com/traces/otlp/v0.9'
   * - Grafana Cloud: 'https://otlp-gateway-{region}.grafana.net/otlp/v1/traces'
   */
  url?: string;

  /**
   * HTTP headers for authentication and metadata.
   *
   * Common headers:
   * - `x-honeycomb-team`: Honeycomb API key
   * - `lightstep-access-token`: Lightstep access token
   * - `Authorization`: Bearer token for authenticated endpoints
   *
   * @example
   * ```typescript
   * {
   *   'x-honeycomb-team': 'your-api-key',
   *   'x-honeycomb-dataset': 'my-dataset',
   * }
   * ```
   */
  headers?: Record<string, string>;

  /**
   * Compression algorithm for request payloads.
   *
   * @default 'none'
   *
   * @remarks
   * - 'gzip' reduces network bandwidth but adds CPU overhead
   * - 'none' is faster for small payloads or local collectors
   * - Check collector supports gzip before enabling
   */
  compression?: "gzip" | "none";

  /**
   * Request timeout in milliseconds.
   *
   * @default 10000 (10 seconds)
   *
   * @remarks
   * - Too short: exports fail on network latency
   * - Too long: blocks shutdown if collector is down
   * - Recommended: 10-30 seconds for production
   */
  timeout?: number;

  /**
   * Resource metadata for service identification.
   *
   * Resource attributes are attached to all spans and identify the
   * service generating the telemetry. At minimum, provide serviceName.
   *
   * @example
   * ```typescript
   * {
   *   serviceName: 'my-api',
   *   serviceVersion: '1.2.3',
   *   deploymentEnvironment: 'production',
   *   attributes: {
   *     'cloud.provider': 'aws',
   *     'cloud.region': 'us-west-2',
   *   },
   * }
   * ```
   */
  resource?: ResourceConfig;
}
