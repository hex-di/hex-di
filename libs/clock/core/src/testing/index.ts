/**
 * @hex-di/clock/testing — test utilities for @hex-di/clock.
 *
 * All virtual adapters, factories, and assertion helpers.
 * DO NOT import from @hex-di/clock main entry point.
 *
 * @packageDocumentation
 */

// =============================================================================
// Shared error types
// =============================================================================

export { createClockRangeError } from "../clock-range-error.js";
export type { ClockRangeError } from "../clock-range-error.js";

// =============================================================================
// VirtualClock
// =============================================================================

export {
  createVirtualClock,
  VirtualClockTestAdapter as VirtualClockAdapter,
} from "./virtual-clock.js";
export type {
  VirtualClockAdapterInterface,
  VirtualClockOptions,
  VirtualClockValues,
} from "./virtual-clock.js";

// =============================================================================
// VirtualSequenceGenerator
// =============================================================================

export {
  createVirtualSequenceGenerator,
  VirtualSequenceGeneratorAdapter,
  createSequenceValidationError,
} from "./virtual-sequence.js";
export type {
  VirtualSequenceGenerator,
  VirtualSequenceOptions,
  SequenceValidationError,
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
  createClockAssertionError,
} from "./assertions.js";
export type { ClockAssertionError } from "./assertions.js";
