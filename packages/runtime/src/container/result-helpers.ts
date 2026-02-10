/**
 * Helper functions for mapping caught errors to ContainerError/DisposalError.
 *
 * Used by tryResolve, tryResolveAsync, and tryDispose wrapper methods.
 *
 * @packageDocumentation
 * @internal
 */

import { ContainerError, DisposalError, FactoryError } from "../errors/index.js";
import { isResolutionError, FactoryError as CoreFactoryError } from "@hex-di/core";
import type { ResolutionError } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import { tryCatch } from "@hex-di/result";
import type { InspectorAPI, InspectorEvent } from "../inspection/types.js";

/**
 * Maps an unknown caught error to a ContainerError.
 *
 * If the error is already a ContainerError, returns it directly.
 * Otherwise, wraps it in a FactoryError with port name "unknown"
 * so the Result error channel always receives a ContainerError.
 *
 * @internal
 */
export function mapToContainerError(err: unknown): ContainerError {
  if (err instanceof ContainerError) {
    return err;
  }
  // Wrap unexpected non-ContainerError as FactoryError
  return new FactoryError("unknown", err);
}

/**
 * Maps an unknown caught error to a DisposalError.
 *
 * Delegates to DisposalError.fromUnknown which handles both
 * AggregateError (multiple finalizer failures) and single errors.
 *
 * @internal
 */
export function mapToDisposalError(err: unknown): DisposalError {
  return DisposalError.fromUnknown(err);
}

/**
 * Maps an unknown caught error to a ResolutionError.
 *
 * If the error is already a ResolutionError, returns it directly.
 * Otherwise, wraps it in a FactoryError with port name "unknown".
 *
 * @internal
 */
function mapToResolutionError(err: unknown): ResolutionError {
  if (isResolutionError(err)) {
    return err;
  }
  return new CoreFactoryError("unknown", err);
}

/**
 * Emits a result event to the inspector if available.
 *
 * Used internally by try* wrappers to track resolution outcomes.
 *
 * @internal
 */
export function emitResultEvent(
  inspector: InspectorAPI | undefined,
  portName: string,
  result: Result<unknown, ContainerError>
): void {
  if (inspector?.emit) {
    if (result.isOk()) {
      inspector.emit({ type: "result:ok", portName, timestamp: Date.now() });
    } else {
      inspector.emit({
        type: "result:err",
        portName,
        errorCode: result.error.code,
        timestamp: Date.now(),
      });
    }
  }
}

/**
 * Executes a resolution function and returns a Result with a narrower ResolutionError type.
 *
 * Unlike `tryResolve` (which returns `Result<T, ContainerError>`), this returns
 * `Result<T, ResolutionError>` where `ResolutionError` is the union of all concrete
 * ContainerError subclasses. This enables exhaustive `switch(error.code)` pattern matching.
 *
 * @param resolve - A function that performs the resolution (e.g., `() => container.resolve(port)`)
 * @param mapErr - Optional custom error mapper. Defaults to `mapToResolutionError`.
 * @returns A Result containing either the resolved value or a ResolutionError
 *
 * @example
 * ```typescript
 * const result = resolveResult(() => container.resolve(LoggerPort));
 * if (result.isErr()) {
 *   switch (result.error.code) {
 *     case "FACTORY_FAILED": // handle
 *     case "CIRCULAR_DEPENDENCY": // handle
 *     // ... exhaustive matching
 *   }
 * }
 * ```
 */
export function resolveResult<T>(
  resolve: () => T,
  mapErr?: (err: unknown) => ResolutionError
): Result<T, ResolutionError> {
  return tryCatch(resolve, mapErr ?? mapToResolutionError);
}

/**
 * Records a Result outcome to an inspector for tracking result statistics.
 *
 * Emits `result:ok` or `result:err` events to the inspector, then returns the
 * result unchanged (pass-through). Usable in adapter factories and user code.
 *
 * @param inspector - The InspectorAPI to record to
 * @param portName - The port name to associate with the result
 * @param result - The Result to record
 * @returns The same result, unchanged
 *
 * @example
 * ```typescript
 * const result = container.tryResolve(LoggerPort);
 * recordResult(container.inspector, "Logger", result);
 * ```
 */
export function recordResult<T, E extends { readonly code: string }>(
  inspector: InspectorAPI,
  portName: string,
  result: Result<T, E>
): Result<T, E> {
  if (inspector.emit) {
    if (result.isOk()) {
      const event: InspectorEvent = { type: "result:ok", portName, timestamp: Date.now() };
      inspector.emit(event);
    } else {
      const event: InspectorEvent = {
        type: "result:err",
        portName,
        errorCode: result.error.code,
        timestamp: Date.now(),
      };
      inspector.emit(event);
    }
  }
  return result;
}
