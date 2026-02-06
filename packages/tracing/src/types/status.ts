/**
 * Span classification and status types.
 *
 * These types categorize spans by their role in the distributed system
 * and track their execution status per OpenTelemetry specification.
 *
 * @packageDocumentation
 */

/**
 * Categorizes the role of a span in a distributed trace.
 *
 * **When to use each kind:**
 *
 * - `internal`: Default for application code, internal operations, business logic
 * - `server`: Handling incoming requests (HTTP server, gRPC server, message consumer)
 * - `client`: Outgoing requests (HTTP client, database query, external API call)
 * - `producer`: Publishing messages to a queue/stream without waiting for processing
 * - `consumer`: Processing messages from a queue/stream (NOT receiving - use server)
 *
 * **Example trace:**
 * ```
 * [server] HTTP GET /users/123
 *   [internal] validateRequest()
 *   [client] SELECT * FROM users WHERE id=123
 *   [internal] transformUserData()
 *   [client] POST /audit-log
 * ```
 *
 * @public
 */
export type SpanKind = "internal" | "server" | "client" | "producer" | "consumer";

/**
 * Indicates the final status of a completed span.
 *
 * **Status meanings:**
 *
 * - `unset`: Default status, operation completed without explicit success/failure
 *   - Use for spans that don't have meaningful error conditions
 *   - Most internal operations use this
 *
 * - `ok`: Operation explicitly succeeded
 *   - Use when success is meaningful (e.g., auth succeeded, validation passed)
 *   - Rarely needed - unset is usually sufficient
 *
 * - `error`: Operation failed with an error
 *   - MUST be set when exceptions are thrown or errors occur
 *   - Include error details in span attributes or events
 *
 * **Note:** Status is immutable once set. Setting `ok` then `error` keeps `ok`.
 * Always set error status via `span.setStatus('error')` when handling exceptions.
 *
 * @public
 */
export type SpanStatus = "unset" | "ok" | "error";
