/**
 * OpenTelemetry attribute types.
 *
 * Attributes are key-value pairs used to annotate spans with additional context.
 * They follow the OpenTelemetry semantic conventions for consistent observability.
 *
 * @packageDocumentation
 */

/**
 * Valid attribute value types per OpenTelemetry specification.
 *
 * Primitive values (string, number, boolean) represent single values.
 * Array values must be homogeneous - all elements must be the same primitive type.
 *
 * **Examples:**
 * ```typescript
 * const validAttributes = {
 *   'http.method': 'GET',                    // string
 *   'http.status_code': 200,                 // number
 *   'http.success': true,                    // boolean
 *   'http.headers': ['Accept', 'User-Agent'], // string[]
 *   'http.retry_counts': [1, 2, 3],          // number[]
 *   'http.cached_responses': [true, false]   // boolean[]
 * };
 * ```
 *
 * **Semantic conventions:**
 * - Use dot notation for namespacing: `service.name`, `http.method`
 * - Prefer lowercase with underscores: `http.status_code`
 * - See: https://opentelemetry.io/docs/specs/semconv/
 *
 * @public
 */
export type AttributeValue = string | number | boolean | string[] | number[] | boolean[];

/**
 * Immutable map of attribute key-value pairs.
 *
 * Used to attach metadata to spans for filtering, grouping, and analysis.
 * The readonly record ensures attributes cannot be mutated after creation.
 *
 * **Common use cases:**
 * - HTTP request metadata: method, URL, status code, headers
 * - Database operations: query, table, rows affected
 * - Service identification: service.name, service.version
 * - Environment context: deployment.environment, host.name
 *
 * @public
 */
export type Attributes = Readonly<Record<string, AttributeValue>>;
