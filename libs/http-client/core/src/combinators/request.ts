/**
 * Request transformation combinators.
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../ports/http-client-port.js";
import { createHttpClient } from "../ports/http-client-factory.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";

/**
 * Transform every outgoing request synchronously before execution.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   mapRequest(req => pipe(req, HttpRequest.setRequestHeader("x-app-version", "1.2.3")))
 * );
 * ```
 */
export function mapRequest(
  transform: (req: HttpRequest) => HttpRequest,
): (client: HttpClient) => HttpClient {
  return (client) => createHttpClient((req) => client.execute(transform(req)));
}

/**
 * Transform every outgoing request with a fallible async operation.
 *
 * If the transform returns an Err, the error is propagated and the request
 * is not executed.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   mapRequestResult(req => {
 *     if (!req.url.startsWith("https://")) {
 *       return ResultAsync.err(httpRequestError("InvalidUrl", req, "Only HTTPS allowed"));
 *     }
 *     return ResultAsync.ok(req);
 *   })
 * );
 * ```
 */
export function mapRequestResult(
  transform: (req: HttpRequest) => ResultAsync<HttpRequest, HttpRequestError>,
): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient(
      (req): ResultAsync<HttpResponse, HttpRequestError> =>
        transform(req).andThen<HttpResponse, HttpRequestError>((r) => client.execute(r)),
    );
}
