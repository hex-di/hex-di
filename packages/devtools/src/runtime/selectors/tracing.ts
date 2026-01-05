/**
 * Tracing Selectors
 *
 * Selectors for deriving tracing-related state from the runtime.
 * These selectors support the tracing plugin and tracing controls.
 *
 * @packageDocumentation
 */

import type { DevToolsRuntimeState } from "../types.js";
import { createSelector } from "./utils.js";

/**
 * Consolidated tracing state for UI rendering.
 *
 * Combines the tracing-related properties from runtime state
 * into a single object for convenient consumption.
 */
export interface TracingStateSnapshot {
  /** Whether tracing is globally enabled */
  readonly enabled: boolean;
  /** Whether tracing collection is paused */
  readonly paused: boolean;
  /** Threshold in ms for marking resolutions as slow */
  readonly threshold: number;
}

/**
 * Selects the consolidated tracing state.
 *
 * Returns an object containing all tracing-related properties.
 * This is memoized to prevent unnecessary re-renders of tracing UI.
 *
 * @example
 * ```typescript
 * const tracing = selectTracingState(state);
 * console.log(`Tracing: enabled=${tracing.enabled}, paused=${tracing.paused}`);
 * console.log(`Slow threshold: ${tracing.threshold}ms`);
 * ```
 *
 * @param state - Current runtime state
 * @returns Consolidated tracing state
 */
export const selectTracingState = createSelector(
  (state: DevToolsRuntimeState): TracingStateSnapshot => ({
    enabled: state.tracingEnabled,
    paused: state.tracingPaused,
    threshold: state.tracingThreshold,
  })
);

/**
 * Selects whether tracing is currently active.
 *
 * Tracing is active when it is enabled AND not paused.
 * This is the effective state for determining if new traces
 * should be collected.
 *
 * @example
 * ```typescript
 * if (selectIsTracingActive(state)) {
 *   // Collect traces
 * }
 * ```
 *
 * @param state - Current runtime state
 * @returns true if tracing is enabled and not paused
 */
export function selectIsTracingActive(state: DevToolsRuntimeState): boolean {
  return state.tracingEnabled && !state.tracingPaused;
}

/**
 * Selects whether tracing is enabled.
 *
 * Note: This does not account for paused state.
 * Use selectIsTracingActive for the effective state.
 *
 * @example
 * ```typescript
 * const enabled = selectTracingEnabled(state);
 * ```
 *
 * @param state - Current runtime state
 * @returns true if tracing is enabled
 */
export function selectTracingEnabled(state: DevToolsRuntimeState): boolean {
  return state.tracingEnabled;
}

/**
 * Selects whether tracing is paused.
 *
 * @example
 * ```typescript
 * const paused = selectTracingPaused(state);
 * if (paused) {
 *   showPausedIndicator();
 * }
 * ```
 *
 * @param state - Current runtime state
 * @returns true if tracing is paused
 */
export function selectTracingPaused(state: DevToolsRuntimeState): boolean {
  return state.tracingPaused;
}

/**
 * Selects the slow resolution threshold.
 *
 * Resolutions taking longer than this threshold are marked as slow.
 *
 * @example
 * ```typescript
 * const threshold = selectTracingThreshold(state);
 * if (resolutionTime > threshold) {
 *   highlightAsSlow();
 * }
 * ```
 *
 * @param state - Current runtime state
 * @returns Threshold in milliseconds
 */
export function selectTracingThreshold(state: DevToolsRuntimeState): number {
  return state.tracingThreshold;
}
