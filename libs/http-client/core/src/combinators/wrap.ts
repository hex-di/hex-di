/**
 * Helper to create a wrapped HttpClient from an execute function wrapper.
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import { createHttpClient } from "../ports/http-client-factory.js";
import type { HttpClient } from "../ports/http-client-port.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";

/**
 * Create a new `HttpClient` that wraps an existing client's `execute` method.
 *
 * The wrapper receives the original execute function and the request, and is
 * responsible for returning a `ResultAsync`. This is the primitive used by
 * all other combinators.
 */
export function wrapClient(
  client: HttpClient,
  wrapper: (
    execute: (req: HttpRequest) => ResultAsync<HttpResponse, HttpRequestError>,
    req: HttpRequest,
  ) => ResultAsync<HttpResponse, HttpRequestError>,
): HttpClient {
  return createHttpClient((req) => wrapper(client.execute, req));
}
