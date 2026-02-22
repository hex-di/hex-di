/**
 * Token lifecycle combinator.
 *
 * Manages OAuth2/JWT token refresh automatically. When a request receives
 * a 401, the combinator triggers a token refresh and retries the request
 * with the new token. Concurrent requests share a single in-flight refresh.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../../ports/http-client-port.js";
import { createHttpClient } from "../../ports/http-client-factory.js";
import type { HttpRequest } from "../../request/http-request.js";
import { setRequestHeader } from "../../request/http-request.js";
import type { HttpResponse } from "../../response/http-response.js";
import type { HttpRequestError } from "../../errors/http-request-error.js";
import { httpRequestError } from "../../errors/http-request-error.js";

// =============================================================================
// Types
// =============================================================================

export interface TokenLifecycleConfig {
  /** Get the current token. */
  readonly getToken: () => string | undefined;

  /** Refresh the token. Returns the new token or throws. */
  readonly refreshToken: () => Promise<string>;

  /** Header name for the token. Default: "Authorization". */
  readonly headerName?: string;

  /** Format the token for the header. Default: `Bearer ${token}`. */
  readonly formatToken?: (token: string) => string;

  /** HTTP status code that triggers refresh. Default: 401. */
  readonly triggerStatus?: number;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Automatically refresh tokens on 401 responses.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   withTokenLifecycle({
 *     getToken: () => tokenStore.accessToken,
 *     refreshToken: async () => {
 *       const newToken = await oauth.refresh();
 *       tokenStore.accessToken = newToken;
 *       return newToken;
 *     },
 *   }),
 * );
 * ```
 */
export function withTokenLifecycle(
  config: TokenLifecycleConfig,
): (client: HttpClient) => HttpClient {
  const headerName = (config.headerName ?? "authorization").toLowerCase();
  const formatToken = config.formatToken ?? ((t: string) => `Bearer ${t}`);
  const triggerStatus = config.triggerStatus ?? 401;

  let refreshPromise: Promise<string> | undefined;

  function attachToken(req: HttpRequest, token: string): HttpRequest {
    return setRequestHeader(headerName, formatToken(token))(req);
  }

  function doRefresh(): Promise<string> {
    if (refreshPromise === undefined) {
      refreshPromise = config.refreshToken().finally(() => {
        refreshPromise = undefined;
      });
    }
    return refreshPromise;
  }

  return (client) =>
    createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        // Attach current token
        const currentToken = config.getToken();
        const tokenizedReq =
          currentToken !== undefined ? attachToken(req, currentToken) : req;

        // Explicit type parameters on andThen help TypeScript infer the
        // correct return type through nested ResultAsync chains.
        return client.execute(tokenizedReq).andThen<HttpResponse, HttpRequestError>(
          (response) => {
            if (response.status !== triggerStatus) {
              return ResultAsync.ok(response);
            }

            // Token expired -- refresh and retry
            return ResultAsync.fromPromise(
              doRefresh(),
              (error): HttpRequestError =>
                httpRequestError(
                  "Transport",
                  req,
                  `Token refresh failed: ${error instanceof Error ? error.message : String(error)}`,
                  error,
                ),
            ).andThen<HttpResponse, HttpRequestError>((newToken) => {
              const retryReq = attachToken(req, newToken);
              return client.execute(retryReq);
            });
          },
        );
      },
    );
}
