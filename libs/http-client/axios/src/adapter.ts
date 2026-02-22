/**
 * Axios transport adapter for @hex-di/http-client.
 *
 * Provides `HttpClientPort` using axios as the HTTP transport.
 * Works in browsers and Node.js.
 *
 * Configuration notes:
 * - `responseType: "arraybuffer"` — prevents auto-parsing (adapter controls body access)
 * - `validateStatus: () => true` — all status codes are passed through
 * - `timeout: 0` — disables axios timeout (HexDI `timeout` combinator handles this)
 * - No interceptors — HexDI combinators replace axios interceptors
 *
 * @packageDocumentation
 */

import axios from "axios";
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
import type { AxiosInstance, AxiosError, RawAxiosResponseHeaders, AxiosResponseHeaders } from "axios";

// =============================================================================
// Options
// =============================================================================

/**
 * Options for `createAxiosHttpClient`.
 */
export interface AxiosHttpClientOptions {
  /**
   * Custom axios instance. Default: axios.create().
   * Use this to share an axios instance with existing code.
   */
  readonly instance?: AxiosInstance;

  /**
   * Disable axios's automatic response parsing.
   * Default: true (adapter controls parsing via responseType: "arraybuffer").
   */
  readonly disableAutoParse?: boolean;
}

// =============================================================================
// Body serialization
// =============================================================================

interface SerializedAxiosBody {
  readonly data: unknown;
  readonly contentType: string | undefined;
}

function serializeBody(httpBody: Parameters<typeof isEmptyBody>[0]): SerializedAxiosBody {
  if (isEmptyBody(httpBody)) {
    return { data: undefined, contentType: undefined };
  }
  if (isTextBody(httpBody)) {
    return { data: httpBody.value, contentType: httpBody.contentType };
  }
  if (isJsonBody(httpBody)) {
    return { data: JSON.stringify(httpBody.value), contentType: "application/json" };
  }
  if (isUint8ArrayBody(httpBody)) {
    return { data: httpBody.value, contentType: httpBody.contentType };
  }
  if (isUrlEncodedBody(httpBody)) {
    const params = new URLSearchParams();
    for (const [key, value] of httpBody.value.entries) {
      params.append(key, value);
    }
    return { data: params.toString(), contentType: "application/x-www-form-urlencoded" };
  }
  if (isFormDataBody(httpBody)) {
    // Browser sets Content-Type with boundary automatically
    return { data: httpBody.value, contentType: undefined };
  }
  if (isStreamBody(httpBody)) {
    return { data: httpBody.value, contentType: httpBody.contentType };
  }

  const _exhaustive: never = httpBody;
  return _exhaustive;
}

// =============================================================================
// Headers conversion
// =============================================================================

function convertAxiosHeaders(
  raw: RawAxiosResponseHeaders | AxiosResponseHeaders,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      result[key] = value;
    } else if (typeof value === "number") {
      result[key] = String(value);
    } else if (Array.isArray(value)) {
      result[key] = (value as string[]).join(", ");
    }
  }
  return result;
}

// =============================================================================
// Error mapping
// =============================================================================

function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === "object" &&
    error !== null &&
    "isAxiosError" in error &&
    (error as Record<string, unknown>)["isAxiosError"] === true
  );
}

function mapAxiosError(error: unknown): HttpRequestError["reason"] {
  if (isAxiosError(error)) {
    const code = error.code;
    if (code === "ERR_CANCELED") {
      return "Aborted";
    }
    if (code === "ECONNABORTED") {
      return "Timeout";
    }
    if (code === "ERR_NETWORK") {
      return "Transport";
    }
  }
  if (error instanceof DOMException) {
    if (error.name === "TimeoutError") return "Timeout";
    if (error.name === "AbortError") return "Aborted";
  }
  return "Transport";
}

// =============================================================================
// Internal execute function
// =============================================================================

async function executeAxiosRequest(
  request: HttpRequest,
  axiosInstance: AxiosInstance,
): Promise<HttpResponse> {
  const { url, urlParams, method, headers, body, signal, timeoutMs } = request;

  const queryString = toQueryString(urlParams);
  const finalUrl = queryString ? `${url}?${queryString}` : url;

  const { data, contentType } = serializeBody(body);
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

  const response = await axiosInstance.request<ArrayBuffer>({
    url: finalUrl,
    method,
    headers: headerRecord,
    data,
    responseType: "arraybuffer",
    validateStatus: () => true,
    timeout: 0,
    signal: cancelSignal,
  });

  const headerEntries = convertAxiosHeaders(response.headers);
  const arrayBuffer = response.data;
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
  axiosInstance: AxiosInstance,
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
    executeAxiosRequest(request, axiosInstance),
    (error) => {
      const reason = mapAxiosError(error);
      const message = error instanceof Error ? error.message : String(error);
      return httpRequestError(reason, request, message, error);
    },
  );
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an `HttpClient` backed by axios.
 *
 * @example
 * ```typescript
 * // Default: creates a new axios instance
 * const client = createAxiosHttpClient();
 *
 * // Share an existing axios instance
 * const client = createAxiosHttpClient({ instance: myAxios });
 * ```
 */
export function createAxiosHttpClient(options?: AxiosHttpClientOptions) {
  const axiosInstance = options?.instance ?? axios.create();

  return createHttpClient((request) => executeRequest(request, axiosInstance));
}

// =============================================================================
// Pre-built Adapter
// =============================================================================

/**
 * Pre-built HexDI adapter that provides `HttpClientPort` using axios.
 *
 * Register this in your graph to inject an `HttpClient` into services that
 * depend on `HttpClientPort`.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { AxiosHttpClientAdapter } from "@hex-di/http-client-axios";
 *
 * const graph = GraphBuilder.create()
 *   .provide(AxiosHttpClientAdapter)
 *   .provide(UserServiceAdapter) // requires HttpClientPort
 *   .build();
 * ```
 */
export const AxiosHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: SINGLETON,
  factory: () => createAxiosHttpClient(),
});
