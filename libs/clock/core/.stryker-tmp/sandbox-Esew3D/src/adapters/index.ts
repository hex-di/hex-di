/**
 * Adapters barrel — re-exports all adapter constants, factories, and option types.
 *
 * @packageDocumentation
 */
// @ts-nocheck


export {
  SystemClockAdapter,
  SystemSequenceGeneratorAdapter,
  SystemClockDiagnosticsAdapter,
  createSystemClock,
  createSystemSequenceGenerator,
  createSystemClockAdapter,
  createClockStartupError,
  getPerformance,
  createClampedFallback,
} from "./system-clock.js";
export type {
  ClockStartupError,
  PerformanceLike,
  SystemClockOptions,
} from "./system-clock.js";

export { SystemTimerSchedulerAdapter, createSystemTimerScheduler } from "./system-timer.js";

export {
  SystemCachedClockAdapter,
  createCachedClock,
} from "./cached-clock.js";
export type { CachedClockOptions } from "./cached-clock.js";

export {
  EdgeRuntimeClockAdapter,
  createEdgeRuntimeClock,
  createEdgeRuntimeClockAdapter,
} from "./edge-runtime-clock.js";
export type { EdgeRuntimeClockOptions } from "./edge-runtime-clock.js";

export {
  createHostBridgeClock,
  createHostBridgeClockAdapter,
} from "./host-bridge-clock.js";
export type { HostClockBridge, HostBridgeClockOptions } from "./host-bridge-clock.js";

export type {
  HardwareClockAdapter,
  HardwareClockAdapterOptions,
  HardwareClockStatus,
} from "./hardware-clock.js";
