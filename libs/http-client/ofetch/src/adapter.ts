/**
 * Ofetch transport adapter for @hex-di/http-client.
 *
 * Provides `HttpClientPort` using ofetch as the HTTP transport.
 * Universal — works in browsers, Node.js, Deno, Bun, and Workers.
 *
 * Configuration notes:
 * - `parseResponse: (text) => text` — disables auto-parsing (adapter controls body access)
 * - `retry: 0` — disables ofetch retry (HexDI `retry` combinator handles this)
 * - No interceptors — HexDI combinators replace ofetch interceptors
 *
 * @packageDocumentation
 */

import { $fetch } from "ofetch";
import { createAdapter, SINGLETON } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import {
  HttpClientPort,
  createHttpClient,
  httpRequestError,
  toQueryString,
  headersToRecord,
  createHttpResponse,
  createHeaders,
  isEmptyBody,
  isTextBody,
  isJsonBody,
  isUint8ArrayBody,
  isUrlEncodedBody,
  isFormDataBody,
  isStreamBody,
} from "@hex-di/http-client";
import type { HttpRequest, HttpResponse, HttpRequestError } from "@hex-di/http-client";
import type { $Fetch } from "ofetch";

// =============================================================================
// Options
// =============================================================================

/**
 * Options for `createOfetchHttpClient`.
 */
export interface OfetchHttpClientOptions {
  /**
   * Custom ofetch instance. Default: $fetch.create().
   * Use this to share an ofetch instance with existing code.
   */
  readonly instance?: $Fetch;

  /**
   * Disable ofetch's automatic response parsing.
   * Default: true (adapter uses parseResponse: identity).
   */
  readonly disableAutoParse?: boolean;
}

// =============================================================================
// Body serialization
// =============================================================================

interface SerializedOfetchBody {
  readonly body: string | Uint8Array | URLSearchParams | FormData | ReadableStream<Uint8Array> | undefined;
  readonly contentType: string | undefined;
}

function serializeBody(httpBody: Parameters<typeof isEmptyBody>[0]): SerializedOfetchBody {
  if (isEmptyBody(httpBody)) {
    return { body: undefined, contentType: undefined };
  }
  if (isTextBody(httpBody)) {
    return { body: httpBody.value, contentType: httpBody.contentType };
  }
  if (isJsonBody(httpBody)) {
    return { body: JSON.stringify(httpBody.value), contentType: "application/json" };
  }
  if (isUint8ArrayBody(httpBody)) {
    return { body: httpBody.value, contentType: httpBody.contentType };
  }
  if (isUrlEncodedBody(httpBody)) {
    const params = new URLSearchParams();
    for (const [key, value] of httpBody.value.entries) {
      params.append(key, value);
    }
    return { body: params, contentType: "application/x-www-form-urlencoded" };
  }
  if (isFormDataBody(httpBody)) {
    // Browser sets Content-Type with boundary automatically
    return { body: httpBody.value, contentType: undefined };
  }
  if (isStreamBody(httpBody)) {
    return { body: httpBody.value, contentType: httpBody.contentType };
  }

  const _exhaustive: never = httpBody;
  return _exhaustive;
}

// =============================================================================
// Error mapping
// =============================================================================

function mapOfetchError(error: unknown): HttpRequestError["reason"] {
  if (error instanceof DOMException) {
    if (error.name === "TimeoutError") return "Timeout";
    if (error.name === "AbortError") return "Aborted";
  }
  if (error instanceof TypeError) {
    return "Transport";
  }
  if (typeof error === "object" && error !== null) {
    const name = (error as { name?: string }).name;
    if (name === "FetchError") {
      const cause = (error as { cause?: unknown }).cause;
      if (cause instanceof DOMException) {
        if (cause.name === "TimeoutError") return "Timeout";
        if (cause.name === "AbortError") return "Aborted";
      }
      return "Transport";
    }
    if (name === "TimeoutError") return "Timeout";
    if (name === "AbortError") return "Aborted";
  }
  return "Transport";
}

// =============================================================================
// Internal execute function
// =============================================================================

async function executeOfetchRequest(
  request: HttpRequest,
  fetchInstance: $Fetch,
): Promise<HttpResponse> {
  const { url, urlParams, method, headers, body, signal, timeoutMs } = request;

  const queryString = toQueryString(urlParams);
  const finalUrl = queryString ? `${url}?${queryString}` : url;

  const { body: serializedBody, contentType } = serializeBody(body);
  const headerRecord: Record<string, string> = { ...headersToRecord(headers) };
  if (contentType !== undefined && !("content-type" in headerRecord)) {
    headerRecord["content-type"] = contentType;
  }

  // Build abort signal combining user signal with timeout
  let cancelSignal: AbortSignal | undefined;
  if (timeoutMs !== undefined && signal !== undefined) {
    cancelSignal = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  } else if (timeoutMs !== undefined) {
    cancelSignal = AbortSignal.timeout(timeoutMs);
  } else if (signal !== undefined) {
    cancelSignal = signal;
  }

  // Use raw() to get the native Response-like object without auto-parsing
  const rawResponse = await fetchInstance.raw<string>(finalUrl, {
    method,
    headers: headerRecord,
    body: serializedBody,
    signal: cancelSignal,
    retry: 0,
    parseResponse: (text) => text,
    ignoreResponseError: true,
  });

  const nativeHeaders = rawResponse.headers;
  const headerEntries: Record<string, string> = {};
  nativeHeaders.forEach((value: string, key: string) => {
    headerEntries[key] = value;
  });

  const arrayBuffer = await rawResponse.arrayBuffer();
  const rawBody = arrayBuffer.byteLength > 0 ? new Uint8Array(arrayBuffer) : undefined;

  return createHttpResponse({
    status: rawResponse.status,
    statusText: rawResponse.statusText,
    headers: createHeaders(headerEntries),
    request,
    rawBody,
  });
}

function executeRequest(
  request: HttpRequest,
  fetchInstance: $Fetch,
): ResultAsync<HttpResponse, HttpRequestError> {
  const { url, urlParams } = request;

  const queryString = toQueryString(urlParams);
  const finalUrl = queryString ? `${url}?${queryString}` : url;

  try {
    new URL(finalUrl);
  } catch (cause) {
    return ResultAsync.err(
      httpRequestError("InvalidUrl", request, `Invalid URL: ${finalUrl}`, cause),
    );
  }

  return ResultAsync.fromPromise(
    Promise.resolve().then(() => executeOfetchRequest(request, fetchInstance)),
    (error) => {
      const reason = mapOfetchError(error);
      const message = error instanceof Error ? error.message : String(error);
      return httpRequestError(reason, request, message, error);
    },
  );
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an `HttpClient` backed by ofetch.
 *
 * @example
 * ```typescript
 * // Default: uses $fetch.create() with HexDI-compatible defaults
 * const client = createOfetchHttpClient();
 *
 * // Share an existing ofetch instance
 * const client = createOfetchHttpClient({ instance: myFetch });
 * ```
 */
export function createOfetchHttpClient(options?: OfetchHttpClientOptions) {
  const fetchInstance =
    options?.instance ??
    $fetch.create({
      retry: 0,
      parseResponse: (text) => text,
      ignoreResponseError: true,
    });

  return createHttpClient((request) => executeRequest(request, fetchInstance));
}

// =============================================================================
// Pre-built Adapter
// =============================================================================

/**
 * Pre-built HexDI adapter that provides `HttpClientPort` using ofetch.
 *
 * Register this in your graph to inject an `HttpClient` into services that
 * depend on `HttpClientPort`.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { OfetchHttpClientAdapter } from "@hex-di/http-client-ofetch";
 *
 * const graph = GraphBuilder.create()
 *   .provide(OfetchHttpClientAdapter)
 *   .provide(UserServiceAdapter) // requires HttpClientPort
 *   .build();
 * ```
 */
export const OfetchHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: SINGLETON,
  factory: () => createOfetchHttpClient(),
});
