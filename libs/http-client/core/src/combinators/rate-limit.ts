/**
 * Rate limiter combinator.
 *
 * Limits the rate of outgoing HTTP requests using a sliding window algorithm.
 * When the limit is exceeded, the client returns an `HttpRequestError` with
 * a `"Transport"` reason and a descriptive message.
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

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window. */
  readonly maxRequests: number;

  /** Duration of the sliding window in milliseconds. */
  readonly windowMs: number;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create a rate limiter combinator using a sliding window algorithm.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   rateLimit({ maxRequests: 100, windowMs: 60_000 }),
 * );
 * ```
 */
export function rateLimit(
  config: RateLimitConfig,
): (client: HttpClient) => HttpClient {
  const { maxRequests, windowMs } = config;
  const timestamps: number[] = [];

  function pruneExpired(now: number): void {
    const cutoff = now - windowMs;
    while (timestamps.length > 0 && timestamps[0] !== undefined && timestamps[0] < cutoff) {
      timestamps.shift();
    }
  }

  return (client) =>
    createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        const now = Date.now();
        pruneExpired(now);

        if (timestamps.length >= maxRequests) {
          return ResultAsync.err(
            httpRequestError(
              "Transport",
              req,
              `Rate limit exceeded: ${maxRequests} requests per ${windowMs}ms`,
            ),
          );
        }

        timestamps.push(now);
        return client.execute(req);
      },
    );
}
