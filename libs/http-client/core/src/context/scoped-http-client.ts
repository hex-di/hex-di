/**
 * Scoped HTTP client with context propagation.
 * @packageDocumentation
 */

import type {
  HttpClient,
  RequestOptions,
  RequestOptionsWithBody,
} from "../ports/http-client-port.js";
import { setRequestHeaders } from "../request/http-request.js";

// =============================================================================
// ScopedHttpClientContext
// =============================================================================

/**
 * Context shape for a scoped HTTP client.
 *
 * All fields are optional — only the ones provided are injected into outgoing
 * requests as standard HTTP headers.
 */
export interface ScopedHttpClientContext {
  /** Correlation ID to attach to all requests as `x-correlation-id`. */
  readonly correlationId?: string;
  /** Default headers to merge into all requests. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Tenant identifier for multi-tenant scenarios, injected as `x-tenant-id`. */
  readonly tenantId?: string;
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Builds a flat header map from the scoped context.
 * Explicit `correlationId` / `tenantId` fields are set first so that
 * caller-supplied `headers` can override them when needed.
 */
function buildContextHeaders(context: ScopedHttpClientContext): Record<string, string> {
  const headers: Record<string, string> = {};

  if (context.correlationId) {
    headers["x-correlation-id"] = context.correlationId;
  }
  if (context.tenantId) {
    headers["x-tenant-id"] = context.tenantId;
  }
  // Caller-provided headers override the built-in ones.
  if (context.headers) {
    Object.assign(headers, context.headers);
  }

  return headers;
}

/**
 * Merges context headers into `RequestOptions`.
 * Caller-supplied headers take precedence over context headers.
 */
function mergeOptions(
  opts: RequestOptions | undefined,
  contextHeaders: Readonly<Record<string, string>>,
): RequestOptions {
  return {
    ...opts,
    headers: { ...contextHeaders, ...opts?.headers },
  };
}

/**
 * Merges context headers into `RequestOptionsWithBody`.
 * Caller-supplied headers take precedence over context headers.
 */
function mergeOptionsWithBody(
  opts: RequestOptionsWithBody | undefined,
  contextHeaders: Readonly<Record<string, string>>,
): RequestOptionsWithBody {
  return {
    ...opts,
    headers: { ...contextHeaders, ...opts?.headers },
  };
}

// =============================================================================
// Public factory
// =============================================================================

/**
 * Create a scoped HTTP client that applies context to all requests.
 *
 * The returned client wraps `base` and injects context-derived headers into
 * every outgoing request:
 *
 * - `execute` — applies headers at the `HttpRequest` level via combinators.
 * - All convenience methods — merges headers into `RequestOptions`.
 *
 * Caller-supplied headers always take precedence over context headers, so
 * individual call sites can still override individual header values.
 *
 * @example
 * ```typescript
 * const client = createScopedClient(baseClient, {
 *   correlationId: "req-abc123",
 *   tenantId: "acme",
 *   headers: { "x-feature-flag": "on" },
 * });
 *
 * // All requests will carry x-correlation-id, x-tenant-id, x-feature-flag.
 * client.get("https://api.example.com/users");
 * ```
 */
export function createScopedClient(base: HttpClient, context: ScopedHttpClientContext): HttpClient {
  const contextHeaders = buildContextHeaders(context);
  const applyHeaders = setRequestHeaders(contextHeaders);

  return {
    execute: (req) => base.execute(applyHeaders(req)),
    get: (url, opts) => base.get(url, mergeOptions(opts, contextHeaders)),
    post: (url, opts) => base.post(url, mergeOptionsWithBody(opts, contextHeaders)),
    put: (url, opts) => base.put(url, mergeOptionsWithBody(opts, contextHeaders)),
    patch: (url, opts) => base.patch(url, mergeOptionsWithBody(opts, contextHeaders)),
    del: (url, opts) => base.del(url, mergeOptions(opts, contextHeaders)),
    head: (url, opts) => base.head(url, mergeOptions(opts, contextHeaders)),
  };
}
