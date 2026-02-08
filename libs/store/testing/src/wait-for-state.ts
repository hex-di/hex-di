/**
 * Wait For State
 *
 * Utility for waiting until a state service satisfies a predicate.
 *
 * @packageDocumentation
 */

import type { StateService, ActionMap, DeepReadonly } from "@hex-di/store";

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
 * await waitForState(stateService, s => s.status === 'loaded', 5000);
 * ```
 */
export function waitForState<TState, TActions extends ActionMap<TState>>(
  service: StateService<TState, TActions>,
  predicate: (state: DeepReadonly<TState>) => boolean,
  timeout = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check current state first
    if (predicate(service.state)) {
      resolve();
      return;
    }

    const timer = { id: undefined as ReturnType<typeof setTimeout> | undefined };

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
      reject(new Error(`waitForState timed out after ${timeout}ms`));
    }, timeout);
  });
}
