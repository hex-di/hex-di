/**
 * CSRF protection combinator.
 *
 * Automatically attaches CSRF tokens to state-changing requests.
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

// =============================================================================
// Types
// =============================================================================

export interface CsrfConfig {
  /** The header name for the CSRF token. Default: "X-CSRF-Token". */
  readonly headerName?: string;

  /** Function to retrieve the current CSRF token. */
  readonly getToken: () => string | undefined;

  /** HTTP methods that should include the CSRF token. Default: POST, PUT, PATCH, DELETE. */
  readonly methods?: ReadonlyArray<string>;
}

// =============================================================================
// Implementation
// =============================================================================

const DEFAULT_CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Attach CSRF tokens to state-changing HTTP requests.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   withCsrfProtection({
 *     getToken: () => document.querySelector('meta[name="csrf-token"]')?.content,
 *   }),
 * );
 * ```
 */
export function withCsrfProtection(
  config: CsrfConfig,
): (client: HttpClient) => HttpClient {
  const headerName = config.headerName ?? "X-CSRF-Token";
  const methods = config.methods !== undefined
    ? new Set(config.methods)
    : DEFAULT_CSRF_METHODS;

  return (client) =>
    createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        if (!methods.has(req.method)) {
          return client.execute(req);
        }

        const token = config.getToken();
        if (token === undefined) {
          return client.execute(req);
        }

        const updatedReq = setRequestHeader(headerName.toLowerCase(), token)(req);

        return client.execute(updatedReq);
      },
    );
}
