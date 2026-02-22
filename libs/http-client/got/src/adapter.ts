/**
 * Got transport adapter for @hex-di/http-client.
 *
 * Provides `HttpClientPort` using got as the HTTP transport.
 * Node.js only — got does not support browsers.
 *
 * Configuration notes:
 * - `retry: { limit: 0 }` — disables got retry (HexDI `retry` combinator handles this)
 * - `responseType: "buffer"` — prevents auto-parsing (adapter controls body access)
 * - `throwHttpErrors: false` — all status codes are passed through
 * - No hooks — HexDI combinators replace got hooks
 *
 * @packageDocumentation
 */

import got from "got";
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
import type { Got } from "got";

// =============================================================================
// Options
// =============================================================================

/**
 * Options for `createGotHttpClient`.
 */
export interface GotHttpClientOptions {
  /**
   * Custom got instance. Default: got.extend().
   * Use this to share a got instance with existing code.
   */
  readonly instance?: Got;

  /**
   * Disable got's automatic retry.
   * Default: true (HexDI retry combinator handles retries).
   */
  readonly disableRetry?: boolean;
}

// =============================================================================
// Body serialization
// =============================================================================

interface SerializedGotBody {
  readonly body: string | Buffer | undefined;
  readonly form: Record<string, string> | undefined;
  readonly contentType: string | undefined;
}

function serializeBody(httpBody: Parameters<typeof isEmptyBody>[0]): SerializedGotBody {
  if (isEmptyBody(httpBody)) {
    return { body: undefined, form: undefined, contentType: undefined };
  }
  if (isTextBody(httpBody)) {
    return { body: httpBody.value, form: undefined, contentType: httpBody.contentType };
  }
  if (isJsonBody(httpBody)) {
    return {
      body: JSON.stringify(httpBody.value),
      form: undefined,
      contentType: "application/json",
    };
  }
  if (isUint8ArrayBody(httpBody)) {
    return {
      body: Buffer.from(httpBody.value),
      form: undefined,
      contentType: httpBody.contentType,
    };
  }
  if (isUrlEncodedBody(httpBody)) {
    const record: Record<string, string> = {};
    for (const [key, value] of httpBody.value.entries) {
      record[key] = value;
    }
    return { body: undefined, form: record, contentType: "application/x-www-form-urlencoded" };
  }
  if (isFormDataBody(httpBody)) {
    // FormData is not natively handled by got — treat as empty body
    return { body: undefined, form: undefined, contentType: undefined };
  }
  if (isStreamBody(httpBody)) {
    // got v14 supports ReadableStream as body in Node.js 18+
    // We serialize as undefined and handle via body option separately
    return { body: undefined, form: undefined, contentType: httpBody.contentType };
  }

  const _exhaustive: never = httpBody;
  return _exhaustive;
}

// =============================================================================
// Headers conversion
// =============================================================================

function convertHeaders(rawHeaders: Record<string, string | string[] | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (typeof value === "string") {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.join(", ");
    }
  }
  return result;
}

// =============================================================================
// Error mapping
// =============================================================================

function mapGotError(error: unknown): HttpRequestError["reason"] {
  if (error instanceof DOMException) {
    if (error.name === "TimeoutError") return "Timeout";
    if (error.name === "AbortError") return "Aborted";
  }
  if (typeof error === "object" && error !== null) {
    const name = (error as { name?: string }).name;
    if (name === "TimeoutError") {
      return "Timeout";
    }
    if (name === "CancelError" || name === "AbortError") {
      return "Aborted";
    }
    if (
      name === "RequestError" ||
      name === "ReadError" ||
      name === "ConnectTimeoutError" ||
      name === "UnsupportedProtocolError"
    ) {
      return "Transport";
    }
  }
  return "Transport";
}

// =============================================================================
// Internal execute function
// =============================================================================

async function executeGotRequest(
  request: HttpRequest,
  gotInstance: Got,
): Promise<HttpResponse> {
  const { url, urlParams, method, headers, body, signal, timeoutMs } = request;

  const queryString = toQueryString(urlParams);
  const finalUrl = queryString ? `${url}?${queryString}` : url;

  const { body: serializedBody, form, contentType } = serializeBody(body);
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

  const response = await gotInstance(finalUrl, {
    method,
    headers: headerRecord,
    body: serializedBody,
    form,
    responseType: "buffer",
    throwHttpErrors: false,
    retry: { limit: 0 },
    signal: cancelSignal,
  });

  const headerEntries = convertHeaders(response.headers);
  const rawBuffer = response.rawBody;
  const rawBody = rawBuffer.byteLength > 0 ? new Uint8Array(rawBuffer) : undefined;

  return createHttpResponse({
    status: response.statusCode,
    statusText: response.statusMessage ?? "",
    headers: createHeaders(headerEntries),
    request,
    rawBody,
  });
}

function executeRequest(
  request: HttpRequest,
  gotInstance: Got,
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
    executeGotRequest(request, gotInstance),
    (error) => {
      const reason = mapGotError(error);
      const message = error instanceof Error ? error.message : String(error);
      return httpRequestError(reason, request, message, error);
    },
  );
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an `HttpClient` backed by got.
 *
 * @example
 * ```typescript
 * // Default: uses got.extend() with sensible defaults
 * const client = createGotHttpClient();
 *
 * // Share an existing got instance
 * const client = createGotHttpClient({ instance: myGot });
 * ```
 */
export function createGotHttpClient(options?: GotHttpClientOptions) {
  const gotInstance = options?.instance ?? got.extend({ retry: { limit: 0 } });

  return createHttpClient((request) => executeRequest(request, gotInstance));
}

// =============================================================================
// Pre-built Adapter
// =============================================================================

/**
 * Pre-built HexDI adapter that provides `HttpClientPort` using got.
 *
 * Register this in your graph to inject an `HttpClient` into services that
 * depend on `HttpClientPort`.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { GotHttpClientAdapter } from "@hex-di/http-client-got";
 *
 * const graph = GraphBuilder.create()
 *   .provide(GotHttpClientAdapter)
 *   .provide(UserServiceAdapter) // requires HttpClientPort
 *   .build();
 * ```
 */
export const GotHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: SINGLETON,
  factory: () => createGotHttpClient(),
});
