/**
 * Mock HTTP client for testing.
 *
 * Supports route-based response matching with glob patterns, and dynamic
 * handler functions that receive the full request and return a Result.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { HttpClient, RequestOptions, RequestOptionsWithBody } from "../ports/http-client-port.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import {
  get as makeGet,
  post as makePost,
  put as makePut,
  patch as makePatch,
  del as makeDel,
  head as makeHead,
  setRequestHeaders,
  setUrlParams,
  withSignal,
  withTimeout,
  bodyJson,
  bodyText,
  bodyUint8Array,
} from "../request/http-request.js";
import { createHeaders } from "../types/headers.js";
import { createHttpResponse } from "../response/http-response.js";
import { httpRequestError } from "../errors/http-request-error.js";
import type { HttpBody } from "../types/body.js";

// =============================================================================
// Public Types
// =============================================================================

/**
 * A static route map: pattern → response or inline response config.
 *
 * Patterns follow the format `"METHOD /path"` where METHOD can be `*` for
 * any method and path supports glob wildcards (`*` and `**`).
 *
 * @example
 * ```typescript
 * const routes: MockRoutes = {
 *   "GET /api/users": mockJsonResponse(200, []),
 *   "POST /api/users": mockJsonResponse(201, { id: 1 }),
 *   "DELETE /api/users/*": mockResponse(204),
 *   "* /api/health": mockResponse(200),
 * };
 * ```
 */
export type MockRoutes = Readonly<Record<string, HttpResponse | MockResponseConfig>>;

/**
 * Configuration for building a response inline without calling `mockResponse`.
 */
export interface MockResponseConfig {
  /** HTTP status code. */
  readonly status: number;
  /** Optional response headers. */
  readonly headers?: Readonly<Record<string, string>>;
  /** JSON body (serialized automatically). */
  readonly body?: unknown;
  /** Plain text body. */
  readonly text?: string;
  /** Artificial delay before responding (milliseconds). */
  readonly delay?: number;
}

/**
 * Dynamic mock handler: receives the request and returns a synchronous Result.
 *
 * @example
 * ```typescript
 * const handler: MockHandler = (request) => {
 *   if (request.url.includes("/fail")) {
 *     return err(httpRequestError("Transport", request, "Connection refused"));
 *   }
 *   return ok(mockJsonResponse(200, { message: "ok" }));
 * };
 * ```
 */
export type MockHandler = (request: HttpRequest) => Result<HttpResponse, HttpRequestError>;

// =============================================================================
// Internal — Route Matching
// =============================================================================

/**
 * Extract the pathname from a URL string.
 * Falls back to the raw string (minus query string) for relative paths.
 */
function extractPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    const qIdx = url.indexOf("?");
    return qIdx === -1 ? url : url.slice(0, qIdx);
  }
}

/**
 * Convert a glob pattern to a RegExp.
 * `**` matches any sequence including `/`, `*` matches any non-slash sequence.
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regexStr = escaped
    .replace(/\*\*/g, "@@DOUBLE@@")
    .replace(/\*/g, "[^/]*")
    .replace(/@@DOUBLE@@/g, ".*");
  return new RegExp(`^${regexStr}$`);
}

/**
 * Test whether a path matches a path pattern (with glob support).
 */
function matchesPathPattern(pattern: string, urlPath: string): boolean {
  if (pattern === "*") return true;
  if (!pattern.includes("*")) return urlPath === pattern;
  return globToRegex(pattern).test(urlPath);
}

/**
 * Test whether a request matches a route pattern like `"GET /api/users"`.
 */
function matchesRoute(pattern: string, req: HttpRequest): boolean {
  const spaceIdx = pattern.indexOf(" ");

  if (spaceIdx === -1) {
    return matchesPathPattern(pattern, extractPathname(req.url));
  }

  const methodPart = pattern.slice(0, spaceIdx);
  const pathPart = pattern.slice(spaceIdx + 1);

  if (methodPart !== "*" && methodPart !== req.method) {
    return false;
  }

  return matchesPathPattern(pathPart, extractPathname(req.url));
}

// =============================================================================
// Internal — Config → Response
// =============================================================================

function statusTextForCode(status: number): string {
  const texts: Readonly<Record<number, string>> = {
    200: "OK",
    201: "Created",
    204: "No Content",
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

function configToResultAsync(
  config: MockResponseConfig,
  req: HttpRequest,
): ResultAsync<HttpResponse, HttpRequestError> {
  const { status, headers, body, text, delay } = config;

  const buildResponse = (): HttpResponse => {
    const rawBody =
      body !== undefined
        ? new TextEncoder().encode(JSON.stringify(body))
        : text !== undefined
          ? new TextEncoder().encode(text)
          : undefined;

    const headerInit: Readonly<Record<string, string>> = {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    };

    return createHttpResponse({
      status,
      statusText: statusTextForCode(status),
      headers: createHeaders(headerInit),
      request: req,
      rawBody,
    });
  };

  if (delay !== undefined && delay > 0) {
    const delayed = new Promise<HttpResponse>((resolve) =>
      setTimeout(() => resolve(buildResponse()), delay),
    );
    return ResultAsync.fromSafePromise(delayed);
  }

  return ResultAsync.ok(buildResponse());
}

/**
 * Determine whether a value is an `HttpResponse` (has the `stream` duck-type marker)
 * or a `MockResponseConfig`.
 */
function isHttpResponse(value: HttpResponse | MockResponseConfig): value is HttpResponse {
  return "stream" in value;
}

function routeValueToResultAsync(
  value: HttpResponse | MockResponseConfig,
  req: HttpRequest,
): ResultAsync<HttpResponse, HttpRequestError> {
  if (isHttpResponse(value)) {
    return ResultAsync.ok(value);
  }
  return configToResultAsync(value, req);
}

// =============================================================================
// Internal — Request Building
// =============================================================================

function applyRequestOptions(req: HttpRequest, options: RequestOptions | undefined): HttpRequest {
  let result = req;
  if (options?.headers !== undefined) {
    result = setRequestHeaders(options.headers)(result);
  }
  if (options?.urlParams !== undefined) {
    result = setUrlParams(options.urlParams)(result);
  }
  if (options?.signal !== undefined) {
    result = withSignal(options.signal)(result);
  }
  if (options?.timeout !== undefined) {
    result = withTimeout(options.timeout)(result);
  }
  return result;
}

function applyRequestOptionsWithBody(
  req: HttpRequest,
  options: RequestOptionsWithBody | undefined,
): HttpRequest {
  let result = applyRequestOptions(req, options);

  if (options?.json !== undefined) {
    const bodyResult = bodyJson(options.json)(result);
    if (bodyResult._tag === "Ok") {
      result = bodyResult.value;
    }
    return result;
  }

  if (options?.body !== undefined) {
    const body: HttpBody = options.body;
    switch (body._tag) {
      case "TextBody":
        result = bodyText(body.value, body.contentType)(result);
        break;
      case "Uint8ArrayBody":
        result = bodyUint8Array(body.value, body.contentType)(result);
        break;
      default:
        result = Object.freeze({ ...result, body });
        break;
    }
  }

  return result;
}

// =============================================================================
// createMockHttpClient
// =============================================================================

/**
 * Create a mock `HttpClient` for use in tests.
 *
 * Accepts either:
 * - A **static route map** (`MockRoutes`): maps `"METHOD /path"` patterns to responses.
 * - A **dynamic handler** (`MockHandler`): a function receiving the request and returning a `Result`.
 *
 * Routes are matched in insertion order; the first matching pattern wins.
 * When no route matches, the client returns a Transport error.
 *
 * @example
 * ```typescript
 * // Static route map
 * const mock = createMockHttpClient({
 *   "GET /api/users": mockJsonResponse(200, [{ id: 1, name: "Alice" }]),
 *   "POST /api/users": mockJsonResponse(201, { id: 2 }),
 *   "DELETE /api/users/*": mockResponse(204),
 *   "* /api/health": mockResponse(200, { text: "ok" }),
 * });
 *
 * // Dynamic handler
 * const dynamicMock = createMockHttpClient((request) => {
 *   if (request.url.includes("/fail")) {
 *     return err(httpRequestError("Transport", request, "Connection refused"));
 *   }
 *   return ok(mockJsonResponse(200, { message: "ok" }));
 * });
 * ```
 */
export function createMockHttpClient(routesOrHandler: MockRoutes | MockHandler): HttpClient {
  function resolveRequest(req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> {
    if (typeof routesOrHandler === "function") {
      const result = routesOrHandler(req);
      if (result._tag === "Ok") {
        return ResultAsync.ok(result.value);
      }
      return ResultAsync.err(result.error);
    }

    const routes = routesOrHandler;
    for (const pattern of Object.keys(routes)) {
      if (matchesRoute(pattern, req)) {
        const value = routes[pattern];
        if (value !== undefined) {
          return routeValueToResultAsync(value, req);
        }
      }
    }

    return ResultAsync.err(
      httpRequestError(
        "Transport",
        req,
        `No mock route matches: ${req.method} ${req.url}`,
      ),
    );
  }

  return {
    execute: (req) => resolveRequest(req),

    get: (url, options) =>
      resolveRequest(applyRequestOptions(makeGet(url), options)),

    post: (url, options) =>
      resolveRequest(applyRequestOptionsWithBody(makePost(url), options)),

    put: (url, options) =>
      resolveRequest(applyRequestOptionsWithBody(makePut(url), options)),

    patch: (url, options) =>
      resolveRequest(applyRequestOptionsWithBody(makePatch(url), options)),

    del: (url, options) =>
      resolveRequest(applyRequestOptions(makeDel(url), options)),

    head: (url, options) =>
      resolveRequest(applyRequestOptions(makeHead(url), options)),
  };
}
