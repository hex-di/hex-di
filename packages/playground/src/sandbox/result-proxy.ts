/**
 * Proxy wrapper for resolved services to detect Result return values.
 *
 * When a service method returns a Result object, the proxy emits
 * inspector events for the Result panel data pipeline.
 *
 * @packageDocumentation
 * @internal
 */

import type { InspectorEvent } from "@hex-di/core";
import { isResult } from "@hex-di/result";

/**
 * Minimal inspector interface for emitting events.
 * Avoids importing the full InspectorAPI type.
 */
interface EmitCapable {
  emit?: (event: InspectorEvent) => void;
}

/**
 * Wraps a service object in a Proxy that detects when methods return Result objects
 * and emits inspector events. Non-object/null services pass through unchanged.
 *
 * @param service - The resolved service value
 * @param portName - The port name for event attribution
 * @param getInspector - Accessor for the current inspector
 * @returns The proxied service (or the original value if not proxyable)
 */
export function proxyWrapService(
  service: unknown,
  portName: string,
  getInspector: () => EmitCapable | undefined
): unknown {
  if (service === null || service === undefined || typeof service !== "object") {
    return service;
  }
  return new Proxy(service, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...fnArgs: unknown[]) => {
        const fnResult: unknown = (value as (...a: unknown[]) => unknown).apply(target, fnArgs);
        if (isResult(fnResult)) {
          const inspector = getInspector();
          if (inspector?.emit) {
            if (fnResult.isOk()) {
              inspector.emit({ type: "result:ok", portName, timestamp: Date.now() });
            } else {
              inspector.emit({
                type: "result:err",
                portName,
                errorCode: "USER_ERROR",
                timestamp: Date.now(),
              });
            }
          }
        }
        return fnResult;
      };
    },
  });
}
