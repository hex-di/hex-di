/**
 * Factory functions for creating mock HttpResponse and HttpRequestError instances in tests.
 * @packageDocumentation
 */

import { createHttpResponse } from "../response/http-response.js";
import { createHeaders } from "../types/headers.js";
import { httpRequestError } from "../errors/http-request-error.js";
import { get as makeGet } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpRequestError } from "../errors/http-request-error.js";

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Default placeholder request used when no request context is available.
 * Tests that need a specific request should pass one via options.
 */
function defaultRequest(): HttpRequest {
  return makeGet("http://mock.test/");
}

/**
 * Lookup table for common HTTP status text values.
 */
function statusTextForCode(status: number): string {
  const texts: Readonly<Record<number, string>> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    409: "Conflict",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return texts[status] ?? "Unknown";
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Create a simple mock HTTP response with the given status code.
 *
 * @example
 * ```typescript
 * const ok = mockResponse(200);
 * const noContent = mockResponse(204);
 * const notFound = mockResponse(404, { text: "Not found" });
 * ```
 */
export function mockResponse(
  status: number,
  options?: {
    readonly headers?: Readonly<Record<string, string>>;
    readonly text?: string;
    readonly request?: HttpRequest;
  },
): HttpResponse {
  const request = options?.request ?? defaultRequest();
  const statusText = statusTextForCode(status);
  const headers = createHeaders(options?.headers);

  const rawBody =
    options?.text !== undefined
      ? new TextEncoder().encode(options.text)
      : undefined;

  return createHttpResponse({ status, statusText, headers, request, rawBody });
}

/**
 * Create a mock HTTP response with a JSON-serialized body.
 *
 * The `content-type` header is automatically set to `application/json`.
 *
 * @example
 * ```typescript
 * const users = mockJsonResponse(200, [{ id: 1, name: "Alice" }]);
 * const created = mockJsonResponse(201, { id: 42 }, { headers: { "X-Request-Id": "abc" } });
 * const error = mockJsonResponse(404, { error: "Not found" });
 * ```
 */
export function mockJsonResponse(
  status: number,
  body: unknown,
  options?: {
    readonly headers?: Readonly<Record<string, string>>;
    readonly request?: HttpRequest;
  },
): HttpResponse {
  const request = options?.request ?? defaultRequest();
  const statusText = statusTextForCode(status);
  const headers = createHeaders({
    "content-type": "application/json",
    ...options?.headers,
  });
  const rawBody = new TextEncoder().encode(JSON.stringify(body));

  return createHttpResponse({ status, statusText, headers, request, rawBody });
}

/**
 * Create a mock streaming HTTP response with the given chunks.
 *
 * The chunks are enqueued in order with an optional delay between them.
 *
 * @example
 * ```typescript
 * const encoder = new TextEncoder();
 * const stream = mockStreamResponse(200, [
 *   encoder.encode("chunk1"),
 *   encoder.encode("chunk2"),
 * ]);
 * ```
 */
export function mockStreamResponse(
  status: number,
  chunks: readonly Uint8Array[],
  options?: {
    readonly headers?: Readonly<Record<string, string>>;
    readonly delayBetweenChunks?: number;
    readonly request?: HttpRequest;
  },
): HttpResponse {
  const request = options?.request ?? defaultRequest();
  const statusText = statusTextForCode(status);
  const headers = createHeaders(options?.headers);
  const delayMs = options?.delayBetweenChunks ?? 0;

  const rawStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        if (delayMs > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
        }
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  return createHttpResponse({ status, statusText, headers, request, rawStream });
}

/**
 * Create a mock `HttpRequestError` for use with dynamic mock handlers.
 *
 * This simulates network-level failures (connection refused, timeout, etc.)
 * before a response is received.
 *
 * @example
 * ```typescript
 * const networkError = mockRequestError("Transport", "ECONNREFUSED");
 * const timeoutError = mockRequestError("Timeout");
 * const abortedError = mockRequestError("Aborted");
 * ```
 */
export function mockRequestError(
  reason: HttpRequestError["reason"],
  message?: string,
  request?: HttpRequest,
): HttpRequestError {
  const req = request ?? defaultRequest();
  const msg = message ?? `Mock ${reason} error`;
  return httpRequestError(reason, req, msg);
}
