/**
 * Retry combinators.
 *
 * Retry failed requests with configurable policies. `retry` is the general
 * combinator; `retryTransient` is a convenience wrapper that applies sensible
 * defaults for transient errors.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { HttpClient } from "../ports/http-client-port.js";
import { createHttpClient } from "../ports/http-client-factory.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import type { HttpClientError } from "../errors/index.js";
import { isTransientError } from "../errors/guards.js";

/**
 * Options for the `retry` combinator.
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (not counting the initial attempt). */
  readonly times: number;

  /**
   * Only retry if this predicate returns `true`.
   * Default: retry on all errors.
   */
  readonly while?: (error: HttpClientError) => boolean;

  /**
   * Delay before each retry attempt in milliseconds.
   * Receives the attempt index (0-based: 0 = first retry, 1 = second, …)
   * and the error that triggered the retry.
   * Default: no delay.
   */
  readonly delay?: (attempt: number, error: HttpClientError) => number;
}

/**
 * Sleep for `ms` milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A widened execute function that accepts any `HttpClientError`.
 * Used internally so retry predicates can inspect `HttpResponseError` status
 * codes (set by `filterStatusOk` / `filterStatus`) in addition to transport errors.
 */
type WidenedExecute = (req: HttpRequest) => ResultAsync<HttpResponse, HttpClientError>;

/**
 * Execute the request and retry on failure according to the given options.
 *
 * The loop is implemented iteratively (not recursively) to avoid stack growth.
 */
async function executeWithRetry(
  execute: WidenedExecute,
  req: HttpRequest,
  options: RetryOptions,
): Promise<Result<HttpResponse, HttpClientError>> {
  const shouldRetry = options.while ?? ((_err: HttpClientError) => true);
  const getDelay = options.delay;

  let lastResult = await execute(req);

  for (let attempt = 0; attempt < options.times; attempt++) {
    if (lastResult._tag === "Ok") {
      return lastResult;
    }

    const { error } = lastResult;

    if (!shouldRetry(error)) {
      return lastResult;
    }

    if (getDelay !== undefined) {
      const ms = getDelay(attempt, error);
      if (ms > 0) {
        await sleep(ms);
      }
    }

    lastResult = await execute(req);
  }

  return lastResult;
}

/**
 * Widen a `ResultAsync<T, HttpRequestError>` to `ResultAsync<T, HttpClientError>`.
 *
 * `HttpRequestError` is a member of `HttpClientError`, so this widening is safe.
 * We implement it as an explicit `mapErr(e => e)` (identity on the error) rather
 * than a type cast, which preserves the no-cast rule.
 */
function widenError(
  result: ResultAsync<HttpResponse, HttpRequestError>,
): ResultAsync<HttpResponse, HttpClientError> {
  return result.mapErr<HttpClientError>((e) => e);
}

/**
 * Retry failed requests with a configurable policy.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   retry({
 *     times: 3,
 *     while: isTransientError,
 *     delay: attempt => Math.min(1000 * Math.pow(2, attempt), 10_000),
 *   })
 * );
 * ```
 */
export function retry(options: RetryOptions): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient((req) => {
      // Widen the execute function's error type to HttpClientError so the
      // retry predicate can inspect the full error union (e.g., HttpResponseError
      // set by filterStatusOk).
      const wideExecute: WidenedExecute = (r) => widenError(client.execute(r));

      // After retrying, narrow back to HttpRequestError for the HttpClient contract.
      // The result is a Result<HttpResponse, HttpClientError>; we use mapErr with
      // an identity function to narrow since HttpClientError ⊇ HttpRequestError.
      return ResultAsync.fromResult(executeWithRetry(wideExecute, req, options)).mapErr(
        (e): HttpRequestError => {
          if (e._tag === "HttpRequestError") return e;
          // For HttpResponseError / HttpBodyError flowing out of the retry loop,
          // we wrap them in the error. This is safe: filterStatusOk sits *before*
          // retry in the typical chain, so its HttpResponseError IS the error.
          // Transport adapters that produce HttpResponseError (rare) go through here too.
          return {
            _tag: "HttpRequestError",
            reason: "Transport",
            request: req,
            message: `Unexpected error after retry: ${e._tag}`,
            cause: e,
          };
        },
      );
    });
}

/**
 * Options for the `retryTransient` combinator.
 */
export interface RetryTransientOptions {
  /**
   * Maximum retry attempts. Default: 3.
   */
  readonly times?: number;

  /**
   * Delay function. Default: exponential backoff with jitter.
   * Base delay: 500 ms, max delay: 10 s.
   */
  readonly delay?: (attempt: number, error: HttpClientError) => number;

  /**
   * Additional predicate ANDed with the built-in transient check.
   */
  readonly while?: (error: HttpClientError) => boolean;
}

/**
 * Default exponential backoff with jitter.
 * - Base delay: 500 ms
 * - Max delay: 10 s
 * - Jitter: ±20% of computed delay
 */
function defaultBackoff(attempt: number): number {
  const base = Math.min(500 * Math.pow(2, attempt), 10_000);
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.round(base + jitter);
}

/**
 * Retry only transient errors with exponential backoff.
 *
 * Built-in transient check retries:
 * - `HttpRequestError` with `reason` `"Transport"` or `"Timeout"`
 * - `HttpResponseError` with `reason` `"StatusCode"` and `status` `429` or `5xx`
 *   (except `501` and `505`)
 *
 * Place this combinator **after** `filterStatusOk` so that status-code errors
 * are already converted to `HttpResponseError` before the predicate evaluates them.
 *
 * @example
 * ```typescript
 * // Default: 3 retries with exponential backoff + jitter
 * const client = pipe(baseClient, filterStatusOk, retryTransient());
 *
 * // Custom: 5 retries, fixed 1 s delay
 * const client2 = pipe(
 *   baseClient,
 *   filterStatusOk,
 *   retryTransient({ times: 5, delay: () => 1_000 })
 * );
 * ```
 */
export function retryTransient(options?: RetryTransientOptions): (client: HttpClient) => HttpClient {
  const times = options?.times ?? 3;
  const userDelay = options?.delay;
  const userWhile = options?.while;

  const shouldRetry = (error: HttpClientError): boolean => {
    if (!isTransientError(error)) return false;
    if (userWhile !== undefined) return userWhile(error);
    return true;
  };

  const delayFn = (attempt: number, error: HttpClientError): number => {
    if (userDelay !== undefined) return userDelay(attempt, error);
    return defaultBackoff(attempt);
  };

  return retry({ times, while: shouldRetry, delay: delayFn });
}
