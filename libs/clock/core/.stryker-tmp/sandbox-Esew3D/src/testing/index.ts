/**
 * @hex-di/clock/testing — test utilities for @hex-di/clock.
 *
 * All virtual adapters, factories, and assertion helpers.
 * DO NOT import from @hex-di/clock main entry point.
 *
 * @packageDocumentation
 */
// @ts-nocheck


// =============================================================================
// VirtualClock
// =============================================================================

export {
  createVirtualClock,
  createClockRangeError,
  VirtualClockTestAdapter as VirtualClockAdapter,
} from "./virtual-clock.js";
export type {
  VirtualClockAdapterInterface,
  VirtualClockOptions,
  VirtualClockValues,
  ClockRangeError,
} from "./virtual-clock.js";

// =============================================================================
// VirtualSequenceGenerator
// =============================================================================

export {
  createVirtualSequenceGenerator,
  VirtualSequenceGeneratorAdapter,
} from "./virtual-sequence.js";
export type {
  VirtualSequenceGenerator,
  VirtualSequenceOptions,
} from "./virtual-sequence.js";

// =============================================================================
// VirtualTimerScheduler
// =============================================================================

export {
  createVirtualTimerScheduler,
  createClockTimeoutError,
} from "./virtual-timer.js";
export type {
  VirtualTimerScheduler,
  BlockUntilOptions,
  ClockTimeoutError,
} from "./virtual-timer.js";

// =============================================================================
// VirtualCachedClock
// =============================================================================

export { createVirtualCachedClock } from "./virtual-cached-clock.js";

// =============================================================================
// Assertion Helpers
// =============================================================================

export {
  assertMonotonic,
  assertTimeBetween,
  assertWallClockPlausible,
  assertSequenceOrdered,
} from "./assertions.js";
