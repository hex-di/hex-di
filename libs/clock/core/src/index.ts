/**
 * @hex-di/clock — injectable clock, sequence generation, and timer abstractions.
 *
 * GxP-compliant timing infrastructure for HexDI.
 *
 * @packageDocumentation
 */

// =============================================================================
// Ports
// =============================================================================

export { ClockPort } from "./ports/clock.js";
export type { ClockService } from "./ports/clock.js";

export { SequenceGeneratorPort } from "./ports/sequence.js";
export type { SequenceGeneratorService, SequenceOverflowError } from "./ports/sequence.js";

export { TimerSchedulerPort, createTimerHandle, createTimerValidationError } from "./ports/timer-scheduler.js";
export type { TimerSchedulerService, TimerHandle, TimerValidationError } from "./ports/timer-scheduler.js";

export { CachedClockPort } from "./ports/cached-clock.js";
export type { CachedClockService, CachedClockLifecycle, CachedClockAdapter } from "./ports/cached-clock.js";

export { ClockDiagnosticsPort } from "./ports/diagnostics.js";
export type {
  ClockDiagnostics,
  ClockCapabilities,
  ClockGxPSuitability,
  ClockDiagnosticsService,
} from "./ports/diagnostics.js";

export { ClockSourceChangedSinkPort } from "./ports/clock-source-changed.js";
export type {
  ClockSourceChangedEvent,
  ClockSourceChangedSinkService,
} from "./ports/clock-source-changed.js";

export { RetentionPolicyPort } from "./ports/retention-policy.js";
export type { RetentionPolicyService } from "./ports/retention-policy.js";

// =============================================================================
// Core Types
// =============================================================================

export type {
  MonotonicTimestamp,
  WallClockTimestamp,
  HighResTimestamp,
  MonotonicDuration,
  WallClockDuration,
  BrandingValidationError,
} from "./branded.js";

export type {
  TemporalContext,
  OverflowTemporalContext,
  SignableTemporalContext,
  TemporalContextFactory,
} from "./temporal-context.js";

export type { TemporalContextDigest } from "./record-integrity.js";

export type { ClockGxPMetadata } from "./gxp-metadata.js";

export type { SystemClockStartupError } from "./adapters/system-clock.js";

export type { EdgeRuntimeClockStartupError } from "./adapters/edge-runtime-clock.js";

export type { HostBridgeClockStartupError } from "./adapters/host-bridge-clock.js";

export { createClockRangeError } from "./clock-range-error.js";
export type { ClockRangeError } from "./clock-range-error.js";

export type {
  RetentionMetadata,
  RetentionValidationError,
} from "./retention.js";

export type { DeserializationError } from "./deserialization.js";

export type { SignatureValidationError } from "./signature-validation.js";

export type { RetryOptions, DelayValidationError, ClockTimeoutError } from "./async-combinators.js";

export type { PeriodicEvaluationConfig } from "./periodic-evaluation.js";

export type { ClockContext, ClockContextHandle, AsyncClockContextHandle } from "./clock-context.js";

export type { CachedClockOptions, SystemCachedClockAdapterOptions } from "./adapters/cached-clock.js";

export type {
  HardwareClockAdapter,
  HardwareClockAdapterOptions,
  HardwareClockStatus,
} from "./adapters/hardware-clock.js";

export type { HostClockBridge, HostBridgeClockOptions } from "./adapters/host-bridge-clock.js";

export type { EdgeRuntimeClockOptions } from "./adapters/edge-runtime-clock.js";

export type { SystemClockOptions, PerformanceLike } from "./adapters/system-clock.js";

// =============================================================================
// Adapters
// =============================================================================

export {
  SystemClockAdapter,
  SystemSequenceGeneratorAdapter,
  SystemClockDiagnosticsAdapter,
} from "./adapters/system-clock.js";

export { SystemTimerSchedulerAdapter } from "./adapters/system-timer.js";

export { SystemCachedClockAdapter } from "./adapters/cached-clock.js";

export { EdgeRuntimeClockAdapter } from "./adapters/edge-runtime-clock.js";

// =============================================================================
// Factories
// =============================================================================

export {
  createSystemClock,
  createSystemSequenceGenerator,
  createSystemClockAdapter,
} from "./adapters/system-clock.js";

export { createSystemTimerScheduler } from "./adapters/system-timer.js";

export { createCachedClock, createSystemCachedClockAdapter } from "./adapters/cached-clock.js";

export {
  createEdgeRuntimeClock,
  createEdgeRuntimeClockAdapter,
} from "./adapters/edge-runtime-clock.js";

export {
  createHostBridgeClock,
  createHostBridgeClockAdapter,
} from "./adapters/host-bridge-clock.js";

export { createTemporalContextFactory } from "./temporal-context.js";

export { createClockSourceBridge } from "./clock-source-bridge.js";
export type { ClockSource } from "./clock-source-bridge.js";

export { createClockContext } from "./clock-context.js";

export { createProcessInstanceId } from "./process-instance.js";

export { createClockSourceChangedEvent } from "./ports/clock-source-changed.js";

// =============================================================================
// Utilities
// =============================================================================

export {
  asMonotonic,
  asWallClock,
  asHighRes,
  asMonotonicDuration,
  asWallClockDuration,
  asMonotonicValidated,
  asWallClockValidated,
  asHighResValidated,
  elapsed,
  durationGt,
  durationLt,
  durationBetween,
} from "./branded.js";

export {
  toTemporalInstant,
  fromTemporalInstant,
  createTemporalUnavailableError,
} from "./temporal-interop.js";
export type { TemporalUnavailableError } from "./temporal-interop.js";

export { isOverflowTemporalContext } from "./temporal-context.js";

export { validateSignableTemporalContext } from "./signature-validation.js";

export {
  validateRetentionMetadata,
  calculateRetentionExpiryDate,
} from "./retention.js";

export {
  computeTemporalContextDigest,
  computeOverflowTemporalContextDigest,
  verifyTemporalContextDigest,
} from "./record-integrity.js";

export { getClockGxPMetadata } from "./gxp-metadata.js";

export { setupPeriodicClockEvaluation } from "./periodic-evaluation.js";

export {
  deserializeTemporalContext,
  deserializeOverflowTemporalContext,
  deserializeClockDiagnostics,
} from "./deserialization.js";

// =============================================================================
// Async Combinators
// =============================================================================

export { delay, timeout, measure, retry } from "./async-combinators.js";

// =============================================================================
// Error Types
// =============================================================================

export { createSequenceOverflowError } from "./ports/sequence.js";

export { createSystemClockStartupError } from "./adapters/system-clock.js";

export { createEdgeRuntimeClockStartupError } from "./adapters/edge-runtime-clock.js";

export { createHostBridgeClockStartupError } from "./adapters/host-bridge-clock.js";

export { createSignatureValidationError } from "./signature-validation.js";

export { createDeserializationError } from "./deserialization.js";

export { createRetentionValidationError } from "./retention.js";

export { createBrandingValidationError } from "./branded.js";
