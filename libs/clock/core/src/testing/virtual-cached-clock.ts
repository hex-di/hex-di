/**
 * VirtualCachedClock — test-only cached clock that reads from a VirtualClockAdapter directly.
 *
 * No background updater. start()/stop() are no-ops. isRunning() always true.
 *
 * @packageDocumentation
 */

import type { CachedClockAdapter } from "../ports/cached-clock.js";
import type { VirtualClockAdapterInterface } from "./virtual-clock.js";

/**
 * Creates a virtual cached clock that reads from a VirtualClockAdapter directly.
 *
 * Returns a frozen CachedClockAdapter — no background timer.
 * isRunning() always returns true.
 */
export function createVirtualCachedClock(
  clock: VirtualClockAdapterInterface
): CachedClockAdapter {
  return Object.freeze({
    recentMonotonicNow: () => clock.monotonicNow(),
    recentWallClockNow: () => clock.wallClockNow(),
    start: () => {
      // no-op
    },
    stop: () => {
      // no-op
    },
    isRunning: () => true,
  });
}
