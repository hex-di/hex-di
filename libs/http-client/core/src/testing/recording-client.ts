/**
 * Recording HTTP client that wraps any `HttpClient` and records all
 * request/response pairs for later assertion in tests.
 *
 * @packageDocumentation
 */

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
import type { HttpClient, RequestOptions, RequestOptionsWithBody } from "../ports/http-client-port.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import type { HttpClientError } from "../errors/index.js";
import type { ResultAsync } from "@hex-di/result";
import type { HttpBody } from "../types/body.js";

// =============================================================================
// Public Types
// =============================================================================

/**
 * A recorded outgoing request with timestamp.
 */
export interface RecordedRequest {
  /** The full request that was sent. */
  readonly request: HttpRequest;
  /** Unix timestamp (ms) when the request was initiated. */
  readonly timestamp: number;
}

/**
 * A recorded request/response pair with timing information.
 */
export interface RecordedResponse {
  /** The originating request. */
  readonly request: HttpRequest;
  /** The successful response, if any. */
  readonly response: HttpResponse | undefined;
  /** The error, if the request failed. */
  readonly error: HttpClientError | undefined;
  /** Total time from request initiation to response (or error) in milliseconds. */
  readonly durationMs: number;
  /** Unix timestamp (ms) when the request was initiated. */
  readonly timestamp: number;
}

/**
 * The object returned by `createRecordingClient`.
 *
 * The `client` property is the wrapped `HttpClient` that records all calls.
 * Use `getRequests()` and `getResponses()` to inspect recorded traffic.
 * Call `clear()` to reset the recordings between test cases.
 */
export interface RecordingResult {
  /** The recording HTTP client — use this instead of the inner client in tests. */
  readonly client: HttpClient;
  /** Returns a snapshot of all recorded requests (in order). */
  readonly getRequests: () => readonly RecordedRequest[];
  /** Returns a snapshot of all recorded request/response pairs (in order). */
  readonly getResponses: () => readonly RecordedResponse[];
  /** Clears all recorded requests and responses. */
  readonly clear: () => void;
}

// =============================================================================
// Internal — Request Building
// =============================================================================

function applyOptions(req: HttpRequest, options: RequestOptions | undefined): HttpRequest {
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

function buildGetRequest(
  url: string | URL,
  options: RequestOptions | undefined,
  method: "GET" | "DELETE" | "HEAD" = "GET",
): HttpRequest {
  const base =
    method === "DELETE"
      ? makeDel(url)
      : method === "HEAD"
        ? makeHead(url)
        : makeGet(url);
  return applyOptions(base, options);
}

function buildBodyRequest(
  method: "POST" | "PUT" | "PATCH",
  url: string | URL,
  options: RequestOptionsWithBody | undefined,
): HttpRequest {
  const base =
    method === "POST"
      ? makePost(url)
      : method === "PUT"
        ? makePut(url)
        : makePatch(url);

  let result = applyOptions(base, options);

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
// createRecordingClient
// =============================================================================

/**
 * Wrap any `HttpClient` to record all requests and responses for later assertion.
 *
 * All calls — including those made via convenience methods (`get`, `post`, etc.) —
 * are recorded. The recording intercepts at the level of individual `HttpRequest`
 * objects: each convenience method builds a full `HttpRequest` and then calls
 * `recordedExecute`, which records the request before delegating to the inner
 * client's `execute`.
 *
 * @example
 * ```typescript
 * const mock = createMockHttpClient({
 *   "GET /api/users": mockJsonResponse(200, []),
 *   "POST /api/users": mockJsonResponse(201, { id: 1 }),
 * });
 *
 * const { client, getRequests, getResponses, clear } = createRecordingClient(mock);
 *
 * await client.get("/api/users");
 * await client.post("/api/users", { json: { name: "Alice" } });
 *
 * expect(getRequests()).toHaveLength(2);
 * expect(getRequests()[0].request.method).toBe("GET");
 * expect(getResponses()[0].response?.status).toBe(200);
 * ```
 */
export function createRecordingClient(inner: HttpClient): RecordingResult {
  const recordedRequests: RecordedRequest[] = [];
  const recordedResponses: RecordedResponse[] = [];

  /**
   * Intercept a single execute call: record the request immediately and
   * the response (or error) once the result settles.
   */
  function recordedExecute(
    req: HttpRequest,
  ): ResultAsync<HttpResponse, HttpRequestError> {
    const timestamp = Date.now();

    recordedRequests.push({ request: req, timestamp });

    const start = timestamp;

    return inner.execute(req).mapBoth(
      (response) => {
        recordedResponses.push({
          request: req,
          response,
          error: undefined,
          durationMs: Date.now() - start,
          timestamp: start,
        });
        return response;
      },
      (error) => {
        recordedResponses.push({
          request: req,
          response: undefined,
          error,
          durationMs: Date.now() - start,
          timestamp: start,
        });
        return error;
      },
    );
  }

  const client: HttpClient = {
    execute: recordedExecute,

    get: (url, options) =>
      recordedExecute(buildGetRequest(url, options)),

    post: (url, options) =>
      recordedExecute(buildBodyRequest("POST", url, options)),

    put: (url, options) =>
      recordedExecute(buildBodyRequest("PUT", url, options)),

    patch: (url, options) =>
      recordedExecute(buildBodyRequest("PATCH", url, options)),

    del: (url, options) =>
      recordedExecute(buildGetRequest(url, options, "DELETE")),

    head: (url, options) =>
      recordedExecute(buildGetRequest(url, options, "HEAD")),
  };

  return {
    client,
    getRequests: () => [...recordedRequests],
    getResponses: () => [...recordedResponses],
    clear: () => {
      recordedRequests.length = 0;
      recordedResponses.length = 0;
    },
  };
}
