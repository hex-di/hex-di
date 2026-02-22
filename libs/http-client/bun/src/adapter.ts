/**
 * Bun fetch transport adapter for @hex-di/http-client.
 *
 * Provides `HttpClientPort` using Bun's native fetch API.
 * Identical to the fetch adapter but explicitly uses `Bun.fetch` for
 * Bun-native performance optimizations.
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
 * Options for `createBunHttpClient`.
 */
export interface BunHttpClientOptions {
  /**
   * Custom fetch function. Default: `globalThis.fetch` (Bun's native fetch).
   * Override for testing or custom environments.
   */
  readonly fetch?: typeof globalThis.fetch;

  /**
   * Default request init merged into every fetch call.
   * The `method`, `headers`, `body`, and `signal` properties are controlled
   * by the adapter and cannot be overridden via this option.
   */
  readonly requestInit?: Omit<RequestInit, "method" | "headers" | "body" | "signal">;
}

// =============================================================================
// Body serialization
// =============================================================================

interface SerializedBody {
  readonly body: string | Blob | ArrayBuffer | FormData | URLSearchParams | ReadableStream<Uint8Array> | null;
  readonly contentType: string | undefined;
}

function serializeBody(httpBody: Parameters<typeof isEmptyBody>[0]): SerializedBody {
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
    return { body: httpBody.value.slice().buffer, contentType: httpBody.contentType };
  }
  if (isUrlEncodedBody(httpBody)) {
    const params = new URLSearchParams();
    for (const [key, value] of httpBody.value.entries) {
      params.append(key, value);
    }
    return { body: params, contentType: "application/x-www-form-urlencoded" };
  }
  if (isFormDataBody(httpBody)) {
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

function mapBunFetchError(error: unknown): HttpRequestError["reason"] {
  if (error instanceof DOMException) {
    if (error.name === "TimeoutError") return "Timeout";
    if (error.name === "AbortError") return "Aborted";
  }
  if (error instanceof TypeError) {
    return "Transport";
  }
  return "Transport";
}

// =============================================================================
// Internal execute function
// =============================================================================

async function buildFetchPromise(
  request: HttpRequest,
  fetchFn: typeof globalThis.fetch,
  defaultInit: Omit<RequestInit, "method" | "headers" | "body" | "signal">,
  finalUrl: string,
): Promise<HttpResponse> {
  const { method, headers, body, signal, timeoutMs } = request;

  const { body: serializedBody, contentType } = serializeBody(body);
  const headerRecord: Record<string, string> = { ...headersToRecord(headers) };
  if (contentType !== undefined && !("content-type" in headerRecord)) {
    headerRecord["content-type"] = contentType;
  }

  // Build abort signal combining user signal with timeout
  let fetchSignal: AbortSignal | undefined;
  if (timeoutMs !== undefined && signal !== undefined) {
    fetchSignal = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  } else if (timeoutMs !== undefined) {
    fetchSignal = AbortSignal.timeout(timeoutMs);
  } else if (signal !== undefined) {
    fetchSignal = signal;
  }

  const nativeResponse = await fetchFn(finalUrl, {
    ...defaultInit,
    method,
    headers: headerRecord,
    body: serializedBody ?? undefined,
    signal: fetchSignal,
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

function executeRequest(
  request: HttpRequest,
  fetchFn: typeof globalThis.fetch,
  defaultInit: Omit<RequestInit, "method" | "headers" | "body" | "signal">,
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
    Promise.resolve().then(() => buildFetchPromise(request, fetchFn, defaultInit, finalUrl)),
    (error) => {
      const reason = mapBunFetchError(error);
      const message = error instanceof Error ? error.message : String(error);
      return httpRequestError(reason, request, message, error);
    },
  );
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an `HttpClient` backed by Bun's native fetch.
 *
 * @example
 * ```typescript
 * // Default: uses globalThis.fetch (Bun's native fetch)
 * const client = createBunHttpClient();
 *
 * // With default credentials
 * const client = createBunHttpClient({ requestInit: { credentials: "include" } });
 * ```
 */
export function createBunHttpClient(options?: BunHttpClientOptions) {
  const fetchFn = options?.fetch ?? globalThis.fetch;
  const defaultInit = options?.requestInit ?? {};

  return createHttpClient((request) => executeRequest(request, fetchFn, defaultInit));
}

// =============================================================================
// Pre-built Adapter
// =============================================================================

/**
 * Pre-built HexDI adapter that provides `HttpClientPort` using Bun's native fetch.
 *
 * Register this in your graph to inject an `HttpClient` into services that
 * depend on `HttpClientPort`.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { BunHttpClientAdapter } from "@hex-di/http-client-bun";
 *
 * const graph = GraphBuilder.create()
 *   .provide(BunHttpClientAdapter)
 *   .provide(UserServiceAdapter) // requires HttpClientPort
 *   .build();
 * ```
 */
export const BunHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: SINGLETON,
  factory: () => createBunHttpClient(),
});
