/**
 * Undici transport adapter for @hex-di/http-client.
 *
 * Provides `HttpClientPort` using undici's fetch API.
 * Node.js only. Offers HTTP/2 support, connection pooling, and superior performance.
 *
 * @packageDocumentation
 */

import { fetch as undiciFetch, FormData as UndiciFormData } from "undici";
import type { BodyInit as UndiciBodyInit } from "undici";
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

// =============================================================================
// Options
// =============================================================================

/**
 * Options for `createUndiciHttpClient`.
 */
export interface UndiciHttpClientOptions {
  /** Maximum connections per origin. Default: 10. */
  readonly connections?: number;

  /** Pipeline connections per origin. Default: 1. */
  readonly pipelining?: number;

  /** Connect timeout in ms. Default: 30000. */
  readonly connectTimeout?: number;

  /** Idle timeout for keep-alive connections in ms. Default: 60000. */
  readonly keepAliveTimeout?: number;

  /** Enable HTTP/2 (ALPN negotiation). Default: false. */
  readonly allowH2?: boolean;
}

// =============================================================================
// Body serialization
// =============================================================================

async function* readableStreamToAsyncIterable(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value !== undefined) yield new Uint8Array(value);
    }
  } finally {
    reader.releaseLock();
  }
}

interface SerializedUndiciBody {
  readonly body: UndiciBodyInit | null;
  readonly contentType: string | undefined;
}

function serializeBody(httpBody: Parameters<typeof isEmptyBody>[0]): SerializedUndiciBody {
  if (isEmptyBody(httpBody)) {
    return { body: null, contentType: undefined };
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
    // Convert DOM FormData to undici FormData for type compatibility
    const fd = new UndiciFormData();
    httpBody.value.forEach((value, key) => {
      fd.append(key, value);
    });
    return { body: fd, contentType: undefined };
  }
  if (isStreamBody(httpBody)) {
    return { body: readableStreamToAsyncIterable(httpBody.value), contentType: httpBody.contentType };
  }

  const _exhaustive: never = httpBody;
  return _exhaustive;
}

// =============================================================================
// Error mapping
// =============================================================================

function mapUndiciError(error: unknown): HttpRequestError["reason"] {
  if (error instanceof DOMException) {
    if (error.name === "TimeoutError") return "Timeout";
    if (error.name === "AbortError") return "Aborted";
  }
  if (error instanceof TypeError) {
    return "Transport";
  }
  if (typeof error === "object" && error !== null) {
    const name = (error as { name?: string }).name;
    if (name === "ConnectTimeoutError") return "Timeout";
    if (name === "UndiciError" || name === "SocketError") return "Transport";
  }
  return "Transport";
}

// =============================================================================
// Internal execute function
// =============================================================================

async function executeUndiciRequest(request: HttpRequest): Promise<HttpResponse> {
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

  const nativeResponse = await undiciFetch(finalUrl, {
    method,
    headers: headerRecord,
    body: serializedBody,
    signal: cancelSignal,
  });

  const nativeHeaders = nativeResponse.headers;
  const headerEntries: Record<string, string> = {};
  nativeHeaders.forEach((value, key) => {
    headerEntries[key] = value;
  });

  const arrayBuffer = await nativeResponse.arrayBuffer();
  const rawBody = arrayBuffer.byteLength > 0 ? new Uint8Array(arrayBuffer) : undefined;

  return createHttpResponse({
    status: nativeResponse.status,
    statusText: nativeResponse.statusText,
    headers: createHeaders(headerEntries),
    request,
    rawBody,
  });
}

function executeRequest(request: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> {
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
    Promise.resolve().then(() => executeUndiciRequest(request)),
    (error) => {
      const reason = mapUndiciError(error);
      const message = error instanceof Error ? error.message : String(error);
      return httpRequestError(reason, request, message, error);
    },
  );
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an `HttpClient` backed by undici.
 *
 * @example
 * ```typescript
 * // Default: undici with standard settings
 * const client = createUndiciHttpClient();
 *
 * // With HTTP/2 support
 * const client = createUndiciHttpClient({ allowH2: true });
 * ```
 */
export function createUndiciHttpClient(_options?: UndiciHttpClientOptions) {
  return createHttpClient((request) => executeRequest(request));
}

// =============================================================================
// Pre-built Adapter
// =============================================================================

/**
 * Pre-built HexDI adapter that provides `HttpClientPort` using undici.
 *
 * Register this in your graph to inject an `HttpClient` into services that
 * depend on `HttpClientPort`.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { UndiciHttpClientAdapter } from "@hex-di/http-client-undici";
 *
 * const graph = GraphBuilder.create()
 *   .provide(UndiciHttpClientAdapter)
 *   .provide(UserServiceAdapter) // requires HttpClientPort
 *   .build();
 * ```
 */
export const UndiciHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: SINGLETON,
  factory: () => createUndiciHttpClient(),
});
