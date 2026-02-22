/**
 * Authentication combinators.
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../ports/http-client-port.js";
import { createHttpClient } from "../ports/http-client-factory.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import { bearerToken, basicAuth as makeBasicAuth, setRequestHeader } from "../request/http-request.js";
import { mapRequest } from "./request.js";

/**
 * Add a static `Authorization: Bearer <token>` header to every request.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   baseUrl("https://api.example.com"),
 *   bearerAuth("tok_abc123")
 * );
 * ```
 */
export function bearerAuth(token: string): (client: HttpClient) => HttpClient {
  return mapRequest(bearerToken(token));
}

/**
 * Add a static `Authorization: Basic <base64>` header to every request.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   basicAuth("user", "s3cr3t")
 * );
 * ```
 */
export function basicAuth(username: string, password: string): (client: HttpClient) => HttpClient {
  return mapRequest(makeBasicAuth(username, password));
}

/**
 * Add a dynamic `Authorization` header to every request.
 *
 * The `getToken` function receives the current request and must return a
 * `ResultAsync<string, HttpRequestError>`. The full header value (including
 * the scheme, e.g. `"Bearer tok_xyz"`) is the caller's responsibility.
 *
 * If token retrieval fails, the error is propagated and the request is not sent.
 *
 * @example
 * ```typescript
 * // Refresh a token on demand
 * const client = pipe(
 *   baseClient,
 *   dynamicAuth(req =>
 *     ResultAsync.fromPromise(
 *       tokenStore.getValidToken(),
 *       fetchErr => httpRequestError("Transport", req, "Token fetch failed", fetchErr)
 *     ).map(token => `Bearer ${token}`)
 *   )
 * );
 * ```
 */
export function dynamicAuth(
  getToken: (request: HttpRequest) => ResultAsync<string, HttpRequestError>,
): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient((req) => {
      // Map the token string into a request with the authorization header,
      // then delegate to client.execute. The explicit type parameter on
      // andThen helps TypeScript infer the correct return type.
      const withAuth: ResultAsync<HttpRequest, HttpRequestError> = getToken(req).map((token) =>
        setRequestHeader("authorization", token)(req),
      );
      return withAuth.andThen<HttpResponse, HttpRequestError>((authReq) =>
        client.execute(authReq),
      );
    });
}
