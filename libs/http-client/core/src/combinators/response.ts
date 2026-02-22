/**
 * Response transformation combinators.
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../ports/http-client-port.js";
import { createHttpClient } from "../ports/http-client-factory.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";

/**
 * Transform every successful response synchronously.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   mapResponse(res => ({
 *     ...res,
 *     headers: pipe(res.headers, setHeader("x-received-at", String(Date.now()))),
 *   }))
 * );
 * ```
 */
export function mapResponse(
  transform: (res: HttpResponse) => HttpResponse,
): (client: HttpClient) => HttpClient {
  return (client) => createHttpClient((req) => client.execute(req).map(transform));
}

/**
 * Transform every successful response with a fallible async operation.
 *
 * If the transform returns an Err, the error is propagated as the client result.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   mapResponseResult(res => validateResponseSchema(res))
 * );
 * ```
 */
export function mapResponseResult<E extends HttpRequestError>(
  transform: (res: HttpResponse) => ResultAsync<HttpResponse, E>,
): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient(
      (req): ResultAsync<HttpResponse, HttpRequestError> =>
        client.execute(req).andThen<HttpResponse, E>(transform),
    );
}
