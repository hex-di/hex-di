/**
 * Error recovery combinators.
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { HttpClient } from "../ports/http-client-port.js";
import { createHttpClient } from "../ports/http-client-factory.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import type { HttpClientError } from "../errors/index.js";

/**
 * Widen `HttpRequestError` to `HttpClientError`.
 * `HttpRequestError` is a member of the `HttpClientError` union — sound upcast.
 */
function asClientError(e: HttpRequestError): HttpClientError {
  return e;
}

/** Type guard that narrows HttpClientError by its _tag discriminant. */
function hasTag<T extends HttpClientError["_tag"]>(
  error: HttpClientError,
  tag: T,
): error is Extract<HttpClientError, { _tag: T }> {
  return error._tag === tag;
}

/**
 * Narrow `HttpClientError` back to `HttpRequestError`.
 * Non-`HttpRequestError` variants from a handler are wrapped in a transport error
 * so they satisfy the `HttpClient` contract; callers can inspect via `cause`.
 */
function toRequestError(e: HttpClientError, req: HttpRequest): HttpRequestError {
  if (e._tag === "HttpRequestError") return e;
  return Object.freeze({
    _tag: "HttpRequestError" as const,
    reason: "Transport" as const,
    request: req,
    message: `Error recovery produced: ${e._tag}`,
    cause: e,
  });
}

/**
 * Catch and recover from a specific error tag.
 *
 * The handler receives the narrowed error and must return a new
 * `ResultAsync<HttpResponse, HttpClientError>`. Returning `ResultAsync.err(error)`
 * re-raises the error.
 *
 * @example
 * ```typescript
 * // Fall back to a cached response on transport failure
 * const client = pipe(
 *   baseClient,
 *   catchError("HttpRequestError", error => {
 *     if (error.reason === "Transport") {
 *       return cache.getResponse(error.request.url);
 *     }
 *     return ResultAsync.err(error);
 *   })
 * );
 * ```
 */
export function catchError<E extends HttpClientError["_tag"]>(
  tag: E,
  handler: (
    error: Extract<HttpClientError, { _tag: E }>,
  ) => ResultAsync<HttpResponse, HttpClientError>,
): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient((req) => {
      async function run(): Promise<Result<HttpResponse, HttpRequestError>> {
        const result = await client.execute(req);

        if (result._tag === "Ok") {
          return ok(result.value);
        }

        const clientErr = asClientError(result.error);

        if (!hasTag(clientErr, tag)) {
          return err(result.error);
        }

        const recovered = await handler(clientErr);

        if (recovered._tag === "Ok") {
          return ok(recovered.value);
        }

        return err(toRequestError(recovered.error, req));
      }

      return ResultAsync.fromResult(run());
    });
}

/**
 * Catch all errors and attempt recovery.
 *
 * The handler receives the full `HttpClientError` union and must return a new
 * `ResultAsync<HttpResponse, HttpClientError>`. Returning `ResultAsync.err(error)`
 * re-raises the error.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   catchAll(error => {
 *     logger.error("HTTP request failed", { error });
 *     return ResultAsync.err(error);
 *   })
 * );
 * ```
 */
export function catchAll(
  handler: (error: HttpClientError) => ResultAsync<HttpResponse, HttpClientError>,
): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient((req) => {
      async function run(): Promise<Result<HttpResponse, HttpRequestError>> {
        const result = await client.execute(req);

        if (result._tag === "Ok") {
          return ok(result.value);
        }

        const recovered = await handler(asClientError(result.error));

        if (recovered._tag === "Ok") {
          return ok(recovered.value);
        }

        return err(toRequestError(recovered.error, req));
      }

      return ResultAsync.fromResult(run());
    });
}
