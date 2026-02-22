/**
 * Clock ports barrel — re-exports all port tokens and associated interfaces/types.
 *
 * @packageDocumentation
 */

export { ClockPort } from "./clock.js";
export type { ClockService } from "./clock.js";

export { SequenceGeneratorPort, createSequenceOverflowError } from "./sequence.js";
export type { SequenceGeneratorService, SequenceOverflowError } from "./sequence.js";

export { TimerSchedulerPort, createTimerHandle } from "./timer-scheduler.js";
export type { TimerSchedulerService, TimerHandle } from "./timer-scheduler.js";

export { CachedClockPort } from "./cached-clock.js";
export type { CachedClockService, CachedClockLifecycle, CachedClockAdapter } from "./cached-clock.js";

export { ClockDiagnosticsPort } from "./diagnostics.js";
export type {
  ClockDiagnostics,
  ClockCapabilities,
  ClockGxPSuitability,
  ClockDiagnosticsService,
} from "./diagnostics.js";

export { ClockSourceChangedSinkPort, createClockSourceChangedEvent } from "./clock-source-changed.js";
export type {
  ClockSourceChangedEvent,
  ClockSourceChangedSinkService,
} from "./clock-source-changed.js";

export { RetentionPolicyPort } from "./retention-policy.js";
export type { RetentionPolicyService } from "./retention-policy.js";
