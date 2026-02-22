/**
 * Fetch API transport adapter for @hex-di/http-client.
 *
 * Provides `HttpClientPort` using the global `fetch` API, available in
 * browsers, Node.js 18+, Deno, Bun, and Cloudflare Workers.
 *
 * @packageDocumentation
 */

import { createAdapter, SINGLETON } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import {
  HttpClientPort,
  createHttpClient,
  httpRequestError,
  toQueryString,
  headersToRecord,
} from "@hex-di/http-client";
import type { HttpRequest, HttpResponse, HttpRequestError } from "@hex-di/http-client";
import { serializeBody } from "./body-serializer.js";
import { mapFetchError } from "./error-mapper.js";
import { buildResponse } from "./response-builder.js";

// =============================================================================
// Options
// =============================================================================

/**
 * Options for `createFetchHttpClient`.
 */
export interface FetchHttpClientOptions {
  /**
   * Custom fetch function. Default: `globalThis.fetch`.
   * Use this for environments with a non-standard fetch (Cloudflare Workers, testing).
   */
  readonly fetch?: typeof globalThis.fetch;

  /**
   * Default request init merged into every fetch call.
   * Useful for setting credentials, mode, cache, and redirect policies.
   * The `method`, `headers`, `body`, and `signal` properties are controlled
   * by the adapter and cannot be overridden via this option.
   */
  readonly requestInit?: Omit<RequestInit, "method" | "headers" | "body" | "signal">;
}

// =============================================================================
// Internal execute function
// =============================================================================

function buildFetchPromise(
  request: HttpRequest,
  fetchFn: typeof globalThis.fetch,
  defaultInit: Omit<RequestInit, "method" | "headers" | "body" | "signal">,
  finalUrl: string,
): Promise<HttpResponse> {
  const { method, headers, body, signal, timeoutMs } = request;

  // Serialize the request body
  const { body: serializedBody, contentType } = serializeBody(body);

  // Build headers record, setting content-type if the adapter determined one
  const headerRecord = headersToRecord(headers);
  const fetchHeaders: Record<string, string> = { ...headerRecord };
  if (contentType !== undefined && !("content-type" in fetchHeaders)) {
    fetchHeaders["content-type"] = contentType;
  }

  // Build the abort signal, combining user signal with timeout signal if needed
  let fetchSignal: AbortSignal | undefined;
  if (timeoutMs !== undefined && signal !== undefined) {
    fetchSignal = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  } else if (timeoutMs !== undefined) {
    fetchSignal = AbortSignal.timeout(timeoutMs);
  } else if (signal !== undefined) {
    fetchSignal = signal;
  }

  // Promise.resolve().then() ensures synchronous throws from fetchFn are
  // captured as promise rejections rather than propagating synchronously.
  return Promise.resolve().then(() =>
    fetchFn(finalUrl, {
      ...defaultInit,
      method,
      headers: fetchHeaders,
      body: serializedBody ?? undefined,
      signal: fetchSignal,
    }).then((nativeResponse) => buildResponse(nativeResponse, request)),
  );
}

function executeRequest(
  request: HttpRequest,
  fetchFn: typeof globalThis.fetch,
  defaultInit: Omit<RequestInit, "method" | "headers" | "body" | "signal">,
): ResultAsync<HttpResponse, HttpRequestError> {
  const { url, urlParams } = request;

  // Build the final URL with query parameters
  const queryString = toQueryString(urlParams);
  const finalUrl = queryString ? `${url}?${queryString}` : url;

  // Validate URL eagerly — return synchronous Err for invalid URLs
  try {
    new URL(finalUrl);
  } catch (cause) {
    return ResultAsync.err(
      httpRequestError("InvalidUrl", request, `Invalid URL: ${finalUrl}`, cause),
    );
  }

  const fetchPromise = buildFetchPromise(request, fetchFn, defaultInit, finalUrl);

  return ResultAsync.fromPromise(fetchPromise, (error) => {
    const reason = mapFetchError(error);
    const message = error instanceof Error ? error.message : String(error);
    return httpRequestError(reason, request, message, error);
  });
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an `HttpClient` backed by the Fetch API.
 *
 * @example
 * ```typescript
 * // Default: uses globalThis.fetch
 * const client = createFetchHttpClient();
 *
 * // Custom fetch function (e.g., for Cloudflare Workers or testing)
 * const client = createFetchHttpClient({ fetch: myFetch });
 *
 * // With default credentials
 * const client = createFetchHttpClient({ requestInit: { credentials: "include" } });
 * ```
 */
export function createFetchHttpClient(options?: FetchHttpClientOptions) {
  const fetchFn = options?.fetch ?? globalThis.fetch;
  const defaultInit = options?.requestInit ?? {};

  return createHttpClient((request) => executeRequest(request, fetchFn, defaultInit));
}

// =============================================================================
// Pre-built Adapter
// =============================================================================

/**
 * Pre-built HexDI adapter that provides `HttpClientPort` using the global Fetch API.
 *
 * Register this in your graph to inject an `HttpClient` into services that
 * depend on `HttpClientPort`.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { FetchHttpClientAdapter } from "@hex-di/http-client-fetch";
 *
 * const graph = GraphBuilder.create()
 *   .provide(FetchHttpClientAdapter)
 *   .provide(UserServiceAdapter) // requires HttpClientPort
 *   .build();
 * ```
 */
export const FetchHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: SINGLETON,
  factory: () => createFetchHttpClient(),
});
