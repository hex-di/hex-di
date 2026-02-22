/**
 * HTTPS-only combinator — rejects HTTP requests.
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../../ports/http-client-port.js";
import { createHttpClient } from "../../ports/http-client-factory.js";
import type { HttpRequest } from "../../request/http-request.js";
import type { HttpResponse } from "../../response/http-response.js";
import type { HttpRequestError } from "../../errors/http-request-error.js";
import { httpRequestError } from "../../errors/http-request-error.js";

/**
 * Reject any request that targets a non-HTTPS URL.
 *
 * @example
 * ```typescript
 * const client = pipe(baseClient, requireHttps());
 * ```
 */
export function requireHttps(): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        try {
          const parsed = new URL(req.url);
          if (parsed.protocol !== "https:") {
            return ResultAsync.err(
              httpRequestError(
                "Transport",
                req,
                `HTTPS required but got ${parsed.protocol} for ${req.url}`,
              ),
            );
          }
        } catch {
          // URL parsing failure — let the transport handle it
        }
        return client.execute(req);
      },
    );
}
