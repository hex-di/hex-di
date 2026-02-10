/**
 * Step Execution with Retry and Timeout
 *
 * Handles individual step invocation, retry loops,
 * timeout wrapping, and port invocation.
 *
 * @packageDocumentation
 */

import { fromPromise, ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { AnyStepDefinition, RetryConfig } from "../step/types.js";
import { hasExecuteMethod } from "./runner-bridges.js";

// =============================================================================
// Step Execution with Retry
// =============================================================================

export async function executeStepWithRetry(
  _step: AnyStepDefinition,
  params: unknown,
  portService: unknown,
  retryConfig: RetryConfig<unknown> | undefined,
  timeout: number | undefined,
  signal: AbortSignal
): Promise<Result<unknown, unknown>> {
  const maxAttempts = retryConfig ? retryConfig.maxAttempts + 1 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal.aborted) {
      return err(new Error("Saga cancelled"));
    }

    const invocationResult = invokePort(portService, params);

    if (invocationResult.isErr()) {
      return err(invocationResult.error);
    }

    const invocation = invocationResult.value;
    let attemptResult: Result<unknown, unknown>;

    if (timeout) {
      attemptResult = await withTimeout(invocation, timeout, signal);
    } else {
      attemptResult = await fromPromise(invocation, (error: unknown) => error);
    }

    if (attemptResult.isOk()) {
      return attemptResult;
    }

    lastError = attemptResult.error;

    // Check if we should retry
    if (attempt < maxAttempts - 1) {
      if (retryConfig?.retryIf && !retryConfig.retryIf(lastError)) {
        return err(lastError);
      }

      // Calculate delay
      const delay =
        typeof retryConfig?.delay === "function"
          ? retryConfig.delay(attempt + 1, lastError)
          : (retryConfig?.delay ?? 0);

      if (delay > 0) {
        const sleepResult = await sleep(delay, signal);
        if (sleepResult.isErr()) {
          return err(sleepResult.error);
        }
      }
    }
  }

  return err(lastError);
}

// =============================================================================
// Port Invocation
// =============================================================================

function isCallable(value: unknown): value is (params: unknown) => unknown {
  return typeof value === "function";
}

export function invokePort(service: unknown, params: unknown): Result<Promise<unknown>, Error> {
  if (isCallable(service)) {
    return ok(Promise.resolve().then(() => service(params)));
  }
  if (hasExecuteMethod(service)) {
    return ok(Promise.resolve().then(() => service.execute(params)));
  }
  return err(new Error("Port service does not have an executable interface"));
}

// =============================================================================
// Timeout Handling
// =============================================================================

export class TimeoutSignal {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    this.timeoutMs = timeoutMs;
  }
}

function withTimeout(
  promise: Promise<unknown>,
  timeoutMs: number,
  signal: AbortSignal
): Promise<Result<unknown, TimeoutSignal | Error>> {
  return new Promise<Result<unknown, TimeoutSignal | Error>>(resolve => {
    const timer = setTimeout(() => {
      resolve(err(new TimeoutSignal(timeoutMs)));
    }, timeoutMs);

    const onAbort = (): void => {
      clearTimeout(timer);
      resolve(err(new Error("Saga cancelled")));
    };

    signal.addEventListener("abort", onAbort, { once: true });

    promise
      .then(value => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        resolve(ok(value));
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        resolve(err(error instanceof Error ? error : new Error(String(error))));
      });
  });
}

// =============================================================================
// Sleep
// =============================================================================

function sleep(ms: number, signal: AbortSignal): Promise<Result<void, Error>> {
  return new Promise<Result<void, Error>>(resolve => {
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve(err(new Error("Saga cancelled during retry delay")));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve(ok(undefined));
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
