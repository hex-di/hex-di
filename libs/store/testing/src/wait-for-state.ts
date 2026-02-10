/**
 * Wait For State
 *
 * Utility for waiting until a state service satisfies a predicate.
 *
 * @packageDocumentation
 */

import type { StateService, ActionMap, DeepReadonly, WaitForStateTimeout } from "@hex-di/store";
import { WaitForStateTimeout as WaitForStateTimeoutCtor } from "@hex-di/store";
import { ResultAsync } from "@hex-di/result";

function isWaitForStateTimeout(value: unknown): value is WaitForStateTimeout {
  return (
    typeof value === "object" &&
    value !== null &&
    "_tag" in value &&
    value._tag === "WaitForStateTimeout"
  );
}

// =============================================================================
// waitForState
// =============================================================================

/**
 * Waits until a state service's state satisfies a predicate.
 *
 * Resolves immediately if the current state already satisfies the predicate.
 * Times out if the predicate is not satisfied within the timeout.
 *
 * @example
 * ```typescript
 * stateService.actions.startLoading();
 * // Somewhere async, the state will change to loaded
 * const result = await waitForState("MyPort", stateService, s => s.status === 'loaded', 5000);
 * ```
 */
export function waitForState<TState, TActions extends ActionMap<TState>>(
  portName: string,
  service: StateService<TState, TActions>,
  predicate: (state: DeepReadonly<TState>) => boolean,
  timeout = 5000
): ResultAsync<void, WaitForStateTimeout> {
  return ResultAsync.fromPromise(
    new Promise<void>((resolve, reject) => {
      // Check current state first
      if (predicate(service.state)) {
        resolve();
        return;
      }

      const timer: { id: ReturnType<typeof setTimeout> | undefined } = { id: undefined };

      const unsub = service.subscribe((state: DeepReadonly<TState>) => {
        if (predicate(state)) {
          if (timer.id !== undefined) {
            clearTimeout(timer.id);
          }
          unsub();
          resolve();
        }
      });

      timer.id = setTimeout(() => {
        unsub();
        reject(WaitForStateTimeoutCtor({ portName, timeoutMs: timeout }));
      }, timeout);
    }),
    (error): WaitForStateTimeout => {
      if (isWaitForStateTimeout(error)) {
        return error;
      }
      return WaitForStateTimeoutCtor({ portName, timeoutMs: timeout });
    }
  );
}
