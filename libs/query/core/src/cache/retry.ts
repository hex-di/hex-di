/**
 * Retry and backoff logic for query fetching.
 *
 * @packageDocumentation
 */

import { ResultAsync, ok, err, fromPromise } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import { queryFetchFailed, type QueryFetchFailed } from "../types/errors.js";

// =============================================================================
// Retry Configuration
// =============================================================================

export interface RetryConfig {
  readonly retry: number | boolean | ((failureCount: number, error: unknown) => boolean);
  readonly retryDelay: number | ((attempt: number, error: unknown) => number);
}

// =============================================================================
// Helpers
// =============================================================================

function shouldRetry(config: RetryConfig, attempt: number, error: unknown): boolean {
  const { retry } = config;
  if (typeof retry === "boolean") return retry;
  if (typeof retry === "number") return attempt < retry;
  return retry(attempt, error);
}

function getRetryDelay(config: RetryConfig, attempt: number, error: unknown): number {
  const { retryDelay } = config;
  if (typeof retryDelay === "number") return retryDelay;
  return retryDelay(attempt, error);
}

// =============================================================================
// Fetch with Retry
// =============================================================================

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = (): void => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      if (signal.aborted) {
        clearTimeout(timer);
        reject(signal.reason);
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

/**
 * Execute a fetch function with retry logic.
 *
 * Returns the first successful result, or a QueryFetchFailed error after
 * all retries are exhausted.
 */
export function fetchWithRetry<TData, TError>(
  portName: string,
  params: unknown,
  fetcher: () => ResultAsync<TData, TError>,
  config: RetryConfig,
  signal?: AbortSignal,
  onRetry?: (attempt: number) => void
): ResultAsync<TData, TError | QueryFetchFailed> {
  const execute = async (): Promise<Result<TData, TError | QueryFetchFailed>> => {
    let attempt = 0;
    for (;;) {
      const result = await fetcher();
      if (result.isOk()) {
        return ok(result.value);
      }
      if (!shouldRetry(config, attempt, result.error)) {
        return err(queryFetchFailed(portName, params, attempt, result.error));
      }
      // Check abort before retry delay — delay() rejects on abort, and
      // fromResult() does not catch rejections. Short-circuit here.
      // Use signal.reason as cause so isAbortError() can detect the DOMException.
      if (signal?.aborted) {
        return err(queryFetchFailed(portName, params, attempt, signal.reason));
      }
      const delayMs = getRetryDelay(config, attempt, result.error);
      if (delayMs > 0) {
        const delayResult = await fromPromise(delay(delayMs, signal), () =>
          queryFetchFailed(portName, params, attempt, signal?.reason ?? result.error)
        );
        if (delayResult.isErr()) return err(delayResult.error);
      }
      attempt++;
      onRetry?.(attempt);
    }
  };

  return ResultAsync.fromResult(execute());
}
