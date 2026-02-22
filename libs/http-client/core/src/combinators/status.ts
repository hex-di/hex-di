/**
 * Status filtering combinators.
 *
 * These combinators convert non-matching HTTP status codes into
 * `HttpResponseError` values, which are wrapped in `HttpRequestError` to satisfy
 * the `HttpClient` contract. Callers can access the underlying `HttpResponseError`
 * via `err.cause` and the `isHttpResponseError` type guard.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { HttpClient } from "../ports/http-client-port.js";
import { createHttpClient } from "../ports/http-client-factory.js";
import { httpResponseError } from "../errors/http-response-error.js";
import type { HttpResponseError } from "../errors/http-response-error.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import { httpRequestError } from "../errors/http-request-error.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequest } from "../request/http-request.js";

/**
 * The error type produced by status filtering combinators.
 * Status filtering can yield either a transport error or a status-code error.
 */
export type StatusFilterError = HttpRequestError | HttpResponseError;

/**
 * Wrap an `HttpResponseError` in an `HttpRequestError` so it satisfies the
 * `HttpClient.execute` return type.
 *
 * The original `HttpResponseError` is preserved in the `cause` field.
 * Callers can recover it via:
 * ```typescript
 * isHttpResponseError(err.cause)
 * ```
 */
function wrapResponseError(
  responseErr: HttpResponseError,
): HttpRequestError {
  return httpRequestError(
    "Transport",
    responseErr.request,
    responseErr.message,
    responseErr,
  );
}

/**
 * Reject non-2xx responses as `HttpResponseError` with `reason: "StatusCode"`.
 *
 * Non-2xx status codes are converted to an `HttpRequestError` with:
 * - `reason: "Transport"`
 * - `cause`: the underlying `HttpResponseError` (inspectable via `isHttpResponseError`)
 *
 * This is a point-free combinator — pass the client directly (no currying):
 *
 * @example
 * ```typescript
 * const client = filterStatusOk(baseClient);
 *
 * const result = await client.get("/api/users");
 * // If status 200:  Ok(response)
 * // If status 404:  Err({ reason: "Transport", cause: { _tag: "HttpResponseError", status: 404, … } })
 * ```
 *
 * When used in a `pipe`, wrap it in a lambda:
 * ```typescript
 * const client = pipe(baseClient, (c) => filterStatusOk(c));
 * ```
 */
export function filterStatusOk(client: HttpClient): HttpClient {
  return filterStatus((s) => s >= 200 && s < 300)(client);
}

/**
 * Reject responses whose status does not satisfy the predicate.
 *
 * Non-matching responses are wrapped in an `HttpRequestError` (with the
 * original `HttpResponseError` in the `cause` field).
 *
 * @param predicate - Returns `true` for acceptable status codes.
 * @param buildMessage - Optional function to customize the error message.
 *
 * @example
 * ```typescript
 * // Accept 2xx and 3xx
 * const client = pipe(
 *   baseClient,
 *   filterStatus(s => s >= 200 && s < 400)
 * );
 * ```
 */
export function filterStatus(
  predicate: (status: number) => boolean,
  buildMessage?: (res: HttpResponse, req: HttpRequest) => string,
): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient((req) => {
      async function run(): Promise<Result<HttpResponse, HttpRequestError>> {
        const result = await client.execute(req);

        if (result._tag === "Err") {
          return err(result.error);
        }

        const res = result.value;

        if (predicate(res.status)) {
          return ok(res);
        }

        const message =
          buildMessage !== undefined
            ? buildMessage(res, req)
            : `HTTP ${res.status} ${res.statusText}: ${req.method} ${req.url}`;

        const responseErr = httpResponseError("StatusCode", req, res, message);
        return err(wrapResponseError(responseErr));
      }

      return ResultAsync.fromResult(run());
    });
}
