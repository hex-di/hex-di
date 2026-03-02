/**
 * Clock Module
 *
 * @packageDocumentation
 */

export type { Clock } from "./types.js";

// =============================================================================
// SystemClock — Default Production Clock
// =============================================================================

/**
 * Default clock implementation that delegates to Date.now().
 */
export const SystemClock: { now(): number } = Object.freeze({
  now(): number {
    return Date.now();
  },
});
