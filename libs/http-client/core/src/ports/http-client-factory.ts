/**
 * Factory for creating `HttpClient` implementations from a raw execute function.
 *
 * `createHttpClient` wires up the convenience methods (`get`, `post`, …) so that
 * transport adapter authors only need to provide a single `execute` function.
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import type { HttpClient, RequestOptions, RequestOptionsWithBody } from "./http-client-port.js";
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
} from "../request/http-request.js";
// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * The minimal signature transport adapters must implement.
 * All other HttpClient methods are derived from this one.
 */
type ExecuteFn = (request: HttpRequest) => ResultAsync<HttpResponse, HttpRequestError>;

/**
 * Apply `RequestOptions` transformations to a request using the combinator pipeline.
 */
function applyOptions(req: HttpRequest, opts: RequestOptions): HttpRequest {
  let r = req;
  if (opts.headers !== undefined) r = setRequestHeaders(opts.headers)(r);
  if (opts.urlParams !== undefined) r = setUrlParams(opts.urlParams)(r);
  if (opts.signal !== undefined) r = withSignal(opts.signal)(r);
  if (opts.timeout !== undefined) r = withTimeout(opts.timeout)(r);
  return r;
}

/**
 * Apply `RequestOptionsWithBody` transformations to a request.
 *
 * Precedence: `json` > `body` (when both are provided, `json` wins per §27).
 *
 * If JSON serialization fails, the request is sent without a body.
 * For precise error handling over serialization failures, use `execute` with
 * the `bodyJson` combinator directly — `bodyJson` returns `Result<HttpRequest, HttpBodyError>`.
 */
function applyBodyOptions(req: HttpRequest, opts: RequestOptionsWithBody): HttpRequest {
  let r = applyOptions(req, opts);

  if (opts.json !== undefined) {
    // bodyJson returns Result<HttpRequest, HttpBodyError>. If serialization
    // succeeds we use the resulting request; if it fails we fall back to the
    // request without a body (the caller used the convenience API, so strict
    // error handling via the Result chain was not requested).
    r = bodyJson(opts.json)(r).match(
      (withBody) => withBody,
      (_bodyErr) => r,
    );
  } else if (opts.body !== undefined) {
    // Directly set the body field. We rely on the fact that HttpRequest fields
    // are plain own-enumerable properties, so spread + override works at
    // runtime even though the brand symbol key is opaque to TypeScript.
    r = Object.freeze({ ...r, body: opts.body });
  }

  return r;
}

// =============================================================================
// Public Factory
// =============================================================================

/**
 * Create a fully-featured `HttpClient` from a single `execute` function.
 *
 * Transport adapter authors implement one function; this factory wires up all
 * convenience methods (`get`, `post`, `put`, `patch`, `del`, `head`) by
 * constructing the appropriate `HttpRequest` and delegating to `executeFn`.
 *
 * @example
 * ```typescript
 * import { createHttpClient } from "@hex-di/http-client/ports";
 *
 * function myExecute(req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> {
 *   // … transport-specific logic …
 * }
 *
 * const client = createHttpClient(myExecute);
 * ```
 *
 * @param executeFn - The transport-level execute function.
 * @returns A complete `HttpClient` implementation.
 */
export function createHttpClient(executeFn: ExecuteFn): HttpClient {
  return {
    execute: (request) => executeFn(request),

    get: (url, opts) =>
      executeFn(opts !== undefined ? applyOptions(makeGet(url), opts) : makeGet(url)),

    post: (url, opts) =>
      executeFn(
        opts !== undefined ? applyBodyOptions(makePost(url), opts) : makePost(url),
      ),

    put: (url, opts) =>
      executeFn(
        opts !== undefined ? applyBodyOptions(makePut(url), opts) : makePut(url),
      ),

    patch: (url, opts) =>
      executeFn(
        opts !== undefined ? applyBodyOptions(makePatch(url), opts) : makePatch(url),
      ),

    del: (url, opts) =>
      executeFn(opts !== undefined ? applyOptions(makeDel(url), opts) : makeDel(url)),

    head: (url, opts) =>
      executeFn(opts !== undefined ? applyOptions(makeHead(url), opts) : makeHead(url)),
  };
}
