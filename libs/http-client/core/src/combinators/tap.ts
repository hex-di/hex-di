/**
 * Side-effect (tap) combinators.
 *
 * Taps run side effects (logging, metrics, tracing) without altering the
 * request, response, or error flowing through the pipeline.
 *
 * @packageDocumentation
 */

import type { HttpClient } from "../ports/http-client-port.js";
import { createHttpClient } from "../ports/http-client-factory.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import type { HttpClientError } from "../errors/index.js";

/**
 * Run a side effect on every outgoing request before it is sent.
 *
 * Errors thrown by `fn` are silently swallowed to preserve the pipeline.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   tapRequest(req => console.log(`→ ${req.method} ${req.url}`))
 * );
 * ```
 */
export function tapRequest(
  fn: (request: HttpRequest) => void,
): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient((req) => {
      try {
        fn(req);
      } catch {
        // Side effects must not break the pipeline.
      }
      return client.execute(req);
    });
}

/**
 * Run a side effect on every successful response.
 *
 * Errors thrown by `fn` are silently swallowed to preserve the pipeline.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   tapResponse((res, req) => console.log(`← ${res.status} ${req.method} ${req.url}`))
 * );
 * ```
 */
export function tapResponse(
  fn: (response: HttpResponse, request: HttpRequest) => void,
): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient((req) =>
      client.execute(req).map((res) => {
        try {
          fn(res, req);
        } catch {
          // Side effects must not break the pipeline.
        }
        return res;
      }),
    );
}

/**
 * Invoke a side-effect callback with the error, treating `HttpRequestError`
 * as the wider `HttpClientError` union (sound upcasting).
 */
function callErrorFn(
  fn: (error: HttpClientError, request: HttpRequest) => void,
  err: HttpRequestError,
  req: HttpRequest,
): void {
  // HttpRequestError is a member of HttpClientError, so this is a sound upcast.
  const clientError: HttpClientError = err;
  fn(clientError, req);
}

/**
 * Run a side effect on every error.
 *
 * The callback receives the full `HttpClientError` union so it can inspect
 * `HttpResponseError` (set by `filterStatusOk`) or `HttpBodyError` alongside
 * plain transport errors.
 *
 * Errors thrown by `fn` are silently swallowed to preserve the pipeline.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   tapError((err, req) =>
 *     metrics.increment("http.errors", { method: req.method, tag: err._tag })
 *   )
 * );
 * ```
 */
export function tapError(
  fn: (error: HttpClientError, request: HttpRequest) => void,
): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient((req) =>
      client.execute(req).mapErr((err) => {
        try {
          callErrorFn(fn, err, req);
        } catch {
          // Side effects must not break the pipeline.
        }
        return err;
      }),
    );
}
