/**
 * Ky transport adapter for @hex-di/http-client.
 *
 * Provides `HttpClientPort` using ky as the HTTP transport.
 * Universal — works in browsers and Node.js (fetch-based).
 *
 * Configuration notes:
 * - `retry: 0` — disables ky retry (HexDI `retry` combinator handles this)
 * - `throwHttpErrors: false` — all status codes are passed through
 * - `timeout: false` — disables ky timeout (HexDI `timeout` combinator handles this)
 * - No hooks — HexDI combinators replace ky hooks
 *
 * @packageDocumentation
 */

import ky from "ky";
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
import type { KyInstance } from "ky";

// =============================================================================
// Options
// =============================================================================

/**
 * Options for `createKyHttpClient`.
 */
export interface KyHttpClientOptions {
  /**
   * Custom ky instance. Default: ky.create().
   * Use this to share a ky instance with existing code.
   */
  readonly instance?: KyInstance;

  /**
   * Disable ky's automatic retry.
   * Default: true (HexDI retry combinator handles retries).
   */
  readonly disableRetry?: boolean;
}

// =============================================================================
// Body serialization
// =============================================================================

interface SerializedKyBody {
  readonly body: BodyInit | undefined;
  readonly contentType: string | undefined;
}

function serializeBody(httpBody: Parameters<typeof isEmptyBody>[0]): SerializedKyBody {
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
    // new Uint8Array() narrows Uint8Array<ArrayBufferLike> → Uint8Array<ArrayBuffer> (TS 5.7+)
    return { body: new Uint8Array(httpBody.value), contentType: httpBody.contentType };
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

function mapKyError(error: unknown): HttpRequestError["reason"] {
  if (error instanceof DOMException) {
    if (error.name === "TimeoutError") return "Timeout";
    if (error.name === "AbortError") return "Aborted";
  }
  if (error instanceof TypeError) {
    return "Transport";
  }
  if (typeof error === "object" && error !== null) {
    const name = (error as { name?: string }).name;
    if (name === "TimeoutError") return "Timeout";
    if (name === "AbortError") return "Aborted";
  }
  return "Transport";
}

// =============================================================================
// Internal execute function
// =============================================================================

async function executeKyRequest(
  request: HttpRequest,
  kyInstance: KyInstance,
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

  const response = await kyInstance(finalUrl, {
    method,
    headers: headerRecord,
    body: serializedBody,
    retry: 0,
    throwHttpErrors: false,
    timeout: false,
    signal: cancelSignal,
  });

  const nativeHeaders = response.headers;
  const headerEntries: Record<string, string> = {};
  nativeHeaders.forEach((value, key) => {
    headerEntries[key] = value;
  });

  const arrayBuffer = await response.arrayBuffer();
  const rawBody = arrayBuffer.byteLength > 0 ? new Uint8Array(arrayBuffer) : undefined;

  return createHttpResponse({
    status: response.status,
    statusText: response.statusText,
    headers: createHeaders(headerEntries),
    request,
    rawBody,
  });
}

function executeRequest(
  request: HttpRequest,
  kyInstance: KyInstance,
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
    executeKyRequest(request, kyInstance),
    (error) => {
      const reason = mapKyError(error);
      const message = error instanceof Error ? error.message : String(error);
      return httpRequestError(reason, request, message, error);
    },
  );
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an `HttpClient` backed by ky.
 *
 * @example
 * ```typescript
 * // Default: uses ky with HexDI-compatible defaults
 * const client = createKyHttpClient();
 *
 * // Share an existing ky instance
 * const client = createKyHttpClient({ instance: myKy });
 * ```
 */
export function createKyHttpClient(options?: KyHttpClientOptions) {
  const kyInstance =
    options?.instance ??
    ky.create({
      retry: 0,
      throwHttpErrors: false,
      timeout: false,
    });

  return createHttpClient((request) => executeRequest(request, kyInstance));
}

// =============================================================================
// Pre-built Adapter
// =============================================================================

/**
 * Pre-built HexDI adapter that provides `HttpClientPort` using ky.
 *
 * Register this in your graph to inject an `HttpClient` into services that
 * depend on `HttpClientPort`.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { KyHttpClientAdapter } from "@hex-di/http-client-ky";
 *
 * const graph = GraphBuilder.create()
 *   .provide(KyHttpClientAdapter)
 *   .provide(UserServiceAdapter) // requires HttpClientPort
 *   .build();
 * ```
 */
export const KyHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: SINGLETON,
  factory: () => createKyHttpClient(),
});
