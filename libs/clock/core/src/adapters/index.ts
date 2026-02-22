/**
 * Adapters barrel — re-exports all adapter constants, factories, and option types.
 *
 * @packageDocumentation
 */

export {
  SystemClockAdapter,
  SystemSequenceGeneratorAdapter,
  SystemClockDiagnosticsAdapter,
  createSystemClock,
  createSystemSequenceGenerator,
  createSystemClockAdapter,
  createSystemClockStartupError,
  getPerformance,
  createClampedFallback,
} from "./system-clock.js";
export type {
  SystemClockStartupError,
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
  createEdgeRuntimeClockStartupError,
} from "./edge-runtime-clock.js";
export type { EdgeRuntimeClockStartupError, EdgeRuntimeClockOptions } from "./edge-runtime-clock.js";

export {
  createHostBridgeClock,
  createHostBridgeClockAdapter,
  createHostBridgeClockStartupError,
} from "./host-bridge-clock.js";
export type { HostBridgeClockStartupError, HostClockBridge, HostBridgeClockOptions } from "./host-bridge-clock.js";

export type {
  HardwareClockAdapter,
  HardwareClockAdapterOptions,
  HardwareClockStatus,
} from "./hardware-clock.js";
