/**
 * Timeout combinator.
 *
 * Applies a timeout to the entire operation (including retries if placed after
 * a retry combinator). When the timeout is exceeded, the request is aborted and
 * the client returns `HttpRequestError` with `reason: "Timeout"`.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import type { HttpClient } from "../ports/http-client-port.js";
import { createHttpClient } from "../ports/http-client-factory.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import { httpRequestError } from "../errors/http-request-error.js";

/**
 * Wrap the execute function with an AbortController-based deadline.
 *
 * The signal is attached to the request so that transport adapters can honour
 * it. If the timeout fires before execute resolves, a `Timeout` error is
 * returned.
 */
async function executeWithTimeout(
  execute: (req: HttpRequest) => ResultAsync<HttpResponse, HttpRequestError>,
  req: HttpRequest,
  ms: number,
): Promise<Result<HttpResponse, HttpRequestError>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  // Propagate any existing signal's abort into our controller.
  const existingSignal = req.signal;
  if (existingSignal !== undefined && !existingSignal.aborted) {
    existingSignal.addEventListener("abort", () => controller.abort(), { once: true });
  } else if (existingSignal?.aborted === true) {
    clearTimeout(timer);
    return err(
      httpRequestError("Aborted", req, `Request was aborted before timeout: ${req.method} ${req.url}`),
    );
  }

  const reqWithSignal = Object.freeze({ ...req, signal: controller.signal });

  try {
    const result = await execute(reqWithSignal);
    clearTimeout(timer);

    if (result._tag === "Ok") {
      return ok(result.value);
    }

    // If the controller was aborted by our timer, normalise to a Timeout error.
    if (controller.signal.aborted) {
      return err(
        httpRequestError(
          "Timeout",
          req,
          `Request timed out after ${ms}ms: ${req.method} ${req.url}`,
          result.error,
        ),
      );
    }

    return err(result.error);
  } catch (cause) {
    clearTimeout(timer);
    return err(
      httpRequestError(
        "Timeout",
        req,
        `Request timed out after ${ms}ms: ${req.method} ${req.url}`,
        cause,
      ),
    );
  }
}

/**
 * Apply a wall-clock timeout (in milliseconds) to every request.
 *
 * The timeout covers the entire operation, including any retry attempts if this
 * combinator is composed **after** a retry combinator:
 *
 * ```typescript
 * pipe(
 *   baseClient,
 *   retryTransient({ times: 3 }),
 *   timeout(30_000) // 30 s total including retries
 * );
 * ```
 *
 * When both a per-request `HttpRequest.withTimeout(ms)` and this combinator are
 * used, the shorter timeout wins because both signals feed into the transport.
 */
export function timeout(ms: number): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient((req) =>
      ResultAsync.fromResult(executeWithTimeout(client.execute, req, ms)),
    );
}
