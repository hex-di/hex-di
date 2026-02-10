/**
 * Helper functions for mapping caught errors to ContainerError/DisposalError.
 *
 * Used by tryResolve, tryResolveAsync, and tryDispose wrapper methods.
 *
 * @packageDocumentation
 * @internal
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g =
    (typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
    new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (
    ns.activeMutant === undefined &&
    g.process &&
    g.process.env &&
    g.process.env.__STRYKER_ACTIVE_MUTANT__
  ) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov =
    ns.mutantCoverage ||
    (ns.mutantCoverage = {
      static: {},
      perTest: {},
    });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")");
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
  if (stryMutAct_9fa48("848")) {
    {
    }
  } else {
    stryCov_9fa48("848");
    if (
      stryMutAct_9fa48("850")
        ? false
        : stryMutAct_9fa48("849")
          ? true
          : (stryCov_9fa48("849", "850"), err instanceof ContainerError)
    ) {
      if (stryMutAct_9fa48("851")) {
        {
        }
      } else {
        stryCov_9fa48("851");
        return err;
      }
    }
    // Wrap unexpected non-ContainerError as FactoryError
    return new FactoryError(stryMutAct_9fa48("852") ? "" : (stryCov_9fa48("852"), "unknown"), err);
  }
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
  if (stryMutAct_9fa48("853")) {
    {
    }
  } else {
    stryCov_9fa48("853");
    return DisposalError.fromUnknown(err);
  }
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
  if (stryMutAct_9fa48("854")) {
    {
    }
  } else {
    stryCov_9fa48("854");
    if (
      stryMutAct_9fa48("856")
        ? false
        : stryMutAct_9fa48("855")
          ? true
          : (stryCov_9fa48("855", "856"), isResolutionError(err))
    ) {
      if (stryMutAct_9fa48("857")) {
        {
        }
      } else {
        stryCov_9fa48("857");
        return err;
      }
    }
    return new CoreFactoryError(
      stryMutAct_9fa48("858") ? "" : (stryCov_9fa48("858"), "unknown"),
      err
    );
  }
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
  if (stryMutAct_9fa48("859")) {
    {
    }
  } else {
    stryCov_9fa48("859");
    if (
      stryMutAct_9fa48("862")
        ? inspector.emit
        : stryMutAct_9fa48("861")
          ? false
          : stryMutAct_9fa48("860")
            ? true
            : (stryCov_9fa48("860", "861", "862"), inspector?.emit)
    ) {
      if (stryMutAct_9fa48("863")) {
        {
        }
      } else {
        stryCov_9fa48("863");
        if (
          stryMutAct_9fa48("865")
            ? false
            : stryMutAct_9fa48("864")
              ? true
              : (stryCov_9fa48("864", "865"), result.isOk())
        ) {
          if (stryMutAct_9fa48("866")) {
            {
            }
          } else {
            stryCov_9fa48("866");
            inspector.emit(
              stryMutAct_9fa48("867")
                ? {}
                : (stryCov_9fa48("867"),
                  {
                    type: stryMutAct_9fa48("868") ? "" : (stryCov_9fa48("868"), "result:ok"),
                    portName,
                    timestamp: Date.now(),
                  })
            );
          }
        } else {
          if (stryMutAct_9fa48("869")) {
            {
            }
          } else {
            stryCov_9fa48("869");
            inspector.emit(
              stryMutAct_9fa48("870")
                ? {}
                : (stryCov_9fa48("870"),
                  {
                    type: stryMutAct_9fa48("871") ? "" : (stryCov_9fa48("871"), "result:err"),
                    portName,
                    errorCode: result.error.code,
                    timestamp: Date.now(),
                  })
            );
          }
        }
      }
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
  if (stryMutAct_9fa48("872")) {
    {
    }
  } else {
    stryCov_9fa48("872");
    return tryCatch(
      resolve,
      stryMutAct_9fa48("873")
        ? mapErr && mapToResolutionError
        : (stryCov_9fa48("873"), mapErr ?? mapToResolutionError)
    );
  }
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
export function recordResult<
  T,
  E extends {
    readonly code: string;
  },
>(inspector: InspectorAPI, portName: string, result: Result<T, E>): Result<T, E> {
  if (stryMutAct_9fa48("874")) {
    {
    }
  } else {
    stryCov_9fa48("874");
    if (
      stryMutAct_9fa48("876")
        ? false
        : stryMutAct_9fa48("875")
          ? true
          : (stryCov_9fa48("875", "876"), inspector.emit)
    ) {
      if (stryMutAct_9fa48("877")) {
        {
        }
      } else {
        stryCov_9fa48("877");
        if (
          stryMutAct_9fa48("879")
            ? false
            : stryMutAct_9fa48("878")
              ? true
              : (stryCov_9fa48("878", "879"), result.isOk())
        ) {
          if (stryMutAct_9fa48("880")) {
            {
            }
          } else {
            stryCov_9fa48("880");
            const event: InspectorEvent = stryMutAct_9fa48("881")
              ? {}
              : (stryCov_9fa48("881"),
                {
                  type: stryMutAct_9fa48("882") ? "" : (stryCov_9fa48("882"), "result:ok"),
                  portName,
                  timestamp: Date.now(),
                });
            inspector.emit(event);
          }
        } else {
          if (stryMutAct_9fa48("883")) {
            {
            }
          } else {
            stryCov_9fa48("883");
            const event: InspectorEvent = stryMutAct_9fa48("884")
              ? {}
              : (stryCov_9fa48("884"),
                {
                  type: stryMutAct_9fa48("885") ? "" : (stryCov_9fa48("885"), "result:err"),
                  portName,
                  errorCode: result.error.code,
                  timestamp: Date.now(),
                });
            inspector.emit(event);
          }
        }
      }
    }
    return result;
  }
}
