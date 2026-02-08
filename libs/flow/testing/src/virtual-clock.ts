/**
 * Virtual Clock
 *
 * Wraps Vitest's fake timer API with a flow-specific interface.
 *
 * @packageDocumentation
 */

import { vi } from "vitest";

// =============================================================================
// Types
// =============================================================================

/** Virtual clock for controlling time in tests */
export interface VirtualClock {
  /** Install fake timers */
  install(): void;
  /** Advance the clock by the specified milliseconds */
  advance(ms: number): Promise<void>;
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
    async advance(ms: number): Promise<void> {
      if (!installed) {
        throw new Error("Virtual clock not installed. Call install() first.");
      }
      await vi.advanceTimersByTimeAsync(ms);
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
