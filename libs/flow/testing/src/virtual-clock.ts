/**
 * Virtual Clock
 *
 * Wraps Vitest's fake timer API with a flow-specific interface.
 *
 * @packageDocumentation
 */

import { vi } from "vitest";
import { type ResultAsync, ResultAsync as RA } from "@hex-di/result";

// =============================================================================
// Types
// =============================================================================

/** Virtual clock for controlling time in tests */
export interface VirtualClock {
  /** Install fake timers */
  install(): void;
  /** Advance the clock by the specified milliseconds. Returns Err when clock is not installed. */
  advance(ms: number): ResultAsync<void, Error>;
  /** Get the current virtual time */
  now(): number;
  /** Uninstall fake timers and restore originals */
  uninstall(): void;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a virtual clock wrapping Vitest's fake timer API.
 *
 * @example
 * ```typescript
 * const clock = createVirtualClock();
 * clock.install();
 *
 * const promise = harness.send({ type: 'FETCH' });
 * await clock.advance(1000);
 * await promise;
 *
 * clock.uninstall();
 * ```
 */
export function createVirtualClock(): VirtualClock {
  let installed = false;

  return {
    install(): void {
      vi.useFakeTimers();
      installed = true;
    },
    advance(ms: number): ResultAsync<void, Error> {
      if (!installed) {
        return RA.err(new Error("Virtual clock not installed. Call install() first."));
      }
      return RA.fromPromise(
        vi.advanceTimersByTimeAsync(ms).then(() => undefined),
        e => (e instanceof Error ? e : new Error(String(e)))
      );
    },
    now(): number {
      return Date.now();
    },
    uninstall(): void {
      if (installed) {
        vi.useRealTimers();
        installed = false;
      }
    },
  };
}
