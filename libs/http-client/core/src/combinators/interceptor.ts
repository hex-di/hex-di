/**
 * Interceptor chain combinator.
 *
 * Provides ordered request/response/error interceptors that run before and
 * after the HTTP transport. Unlike combinators (which are composed at
 * construction time), interceptors are configured as an ordered list and
 * execute sequentially at call time.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../ports/http-client-port.js";
import { createHttpClient } from "../ports/http-client-factory.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import { httpRequestError } from "../errors/http-request-error.js";

// =============================================================================
// Types
// =============================================================================

export interface InterceptorConfig {
  /** Transform or inspect the request before it is sent. */
  readonly onRequest?: (request: HttpRequest) => HttpRequest;

  /** Transform or inspect the response after it is received. */
  readonly onResponse?: (response: HttpResponse) => HttpResponse;

  /** Handle an error. Return a modified error or rethrow. */
  readonly onError?: (error: HttpRequestError, request: HttpRequest) => HttpRequestError;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Apply an ordered list of interceptors to an `HttpClient`.
 *
 * Interceptors run in order:
 * 1. `onRequest` — each interceptor transforms the request in sequence.
 * 2. The request is sent.
 * 3. `onResponse` — each interceptor transforms the response in sequence.
 * 4. On error, `onError` interceptors run in sequence.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   interceptor({
 *     onRequest: (req) => ({ ...req, headers: { ...req.headers, "X-Custom": "value" } }),
 *     onResponse: (res) => res,
 *   }),
 * );
 * ```
 */
export function interceptor(
  config: InterceptorConfig,
): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        let transformedReq = req;

        // Apply request interceptor
        if (config.onRequest !== undefined) {
          try {
            transformedReq = config.onRequest(transformedReq);
          } catch (cause) {
            return ResultAsync.err(
              httpRequestError(
                "Transport",
                req,
                `Request interceptor failed: ${cause instanceof Error ? cause.message : String(cause)}`,
                cause,
              ),
            );
          }
        }

        // Execute the request
        return client.execute(transformedReq)
          .map((response) => {
            if (config.onResponse !== undefined) {
              return config.onResponse(response);
            }
            return response;
          })
          .mapErr((error) => {
            if (config.onError !== undefined) {
              return config.onError(error, req);
            }
            return error;
          });
      },
    );
}

/**
 * Compose multiple interceptors into a single combinator.
 *
 * Interceptors execute in the provided order for requests and responses.
 * Error interceptors also execute in order.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   composeInterceptors(loggingInterceptor, authInterceptor, metricsInterceptor),
 * );
 * ```
 */
export function composeInterceptors(
  ...interceptors: readonly InterceptorConfig[]
): (client: HttpClient) => HttpClient {
  return (client) => {
    let wrapped = client;
    for (const config of interceptors) {
      wrapped = interceptor(config)(wrapped);
    }
    return wrapped;
  };
}
