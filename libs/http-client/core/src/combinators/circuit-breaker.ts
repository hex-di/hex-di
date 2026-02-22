/**
 * Circuit breaker combinator.
 *
 * Wraps an `HttpClient` to prevent sending requests when the downstream
 * service is likely down. Implements a three-state machine:
 *
 * - **Closed** — requests flow normally. Failures are counted.
 * - **Open** — requests are rejected immediately with `CircuitOpen` reason.
 * - **Half-Open** — a limited number of probe requests are allowed through.
 *   If they succeed the circuit closes; otherwise it re-opens.
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

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit. */
  readonly failureThreshold: number;

  /** Time in ms to wait before transitioning from open → half-open. */
  readonly resetTimeout: number;

  /** Maximum number of probe requests allowed in half-open state. Default: 1. */
  readonly halfOpenMax?: number;
}

export interface CircuitBreakerState {
  readonly state: CircuitState;
  readonly failureCount: number;
  readonly halfOpenAttempts: number;
  readonly lastFailureTime: number | undefined;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create a circuit breaker combinator.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   circuitBreaker({ failureThreshold: 5, resetTimeout: 30_000 }),
 * );
 * ```
 */
export function circuitBreaker(
  config: CircuitBreakerConfig,
): (client: HttpClient) => HttpClient {
  const { failureThreshold, resetTimeout, halfOpenMax: halfOpenMaxOpt } = config;
  const halfOpenMax = halfOpenMaxOpt ?? 1;

  let state: CircuitState = "closed";
  let failureCount = 0;
  let halfOpenAttempts = 0;
  let lastFailureTime: number | undefined;

  function getState(): CircuitBreakerState {
    return Object.freeze({
      state,
      failureCount,
      halfOpenAttempts,
      lastFailureTime,
    });
  }

  function onSuccess(): void {
    failureCount = 0;
    halfOpenAttempts = 0;
    state = "closed";
  }

  function onFailure(): void {
    failureCount++;
    lastFailureTime = Date.now();
    if (state === "half-open" || failureCount >= failureThreshold) {
      state = "open";
      halfOpenAttempts = 0;
    }
  }

  function tryTransitionToHalfOpen(): void {
    if (
      state === "open" &&
      lastFailureTime !== undefined &&
      Date.now() - lastFailureTime >= resetTimeout
    ) {
      state = "half-open";
      halfOpenAttempts = 0;
    }
  }

  return (client) => {
    const wrapped = createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        tryTransitionToHalfOpen();

        if (state === "open") {
          return ResultAsync.err(
            httpRequestError(
              "Transport",
              req,
              `Circuit breaker is open — request rejected: ${req.method} ${req.url}`,
            ),
          );
        }

        if (state === "half-open" && halfOpenAttempts >= halfOpenMax) {
          return ResultAsync.err(
            httpRequestError(
              "Transport",
              req,
              `Circuit breaker half-open limit reached: ${req.method} ${req.url}`,
            ),
          );
        }

        if (state === "half-open") {
          halfOpenAttempts++;
        }

        return client.execute(req).map((response) => {
          onSuccess();
          return response;
        }).mapErr((error) => {
          onFailure();
          return error;
        });
      },
    );

    return Object.assign(wrapped, { getCircuitState: getState });
  };
}
