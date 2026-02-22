import type { ClockDriftWarning } from "../errors/types.js";
import { ACL016 } from "../errors/codes.js";

/** Default threshold in ms above which drift is considered a warning. */
const DEFAULT_DRIFT_THRESHOLD_MS = 1000;

/**
 * Detects clock drift between the system clock and an external reference time.
 *
 * @param systemTimeMs - Current system time in milliseconds (Date.now())
 * @param externalTimeMs - External reference time in milliseconds
 * @returns The absolute drift in milliseconds
 */
export function detectClockDrift(systemTimeMs: number, externalTimeMs: number): number {
  return Math.abs(systemTimeMs - externalTimeMs);
}

/**
 * Checks for clock drift and returns a ClockDriftWarning if the drift exceeds the threshold.
 *
 * @param systemTimeMs - Current system time in milliseconds
 * @param externalTimeMs - External reference time in milliseconds
 * @param thresholdMs - Drift threshold in milliseconds (default: 1000ms)
 * @returns A ClockDriftWarning if drift exceeds threshold, undefined otherwise
 */
export function checkClockDrift(
  systemTimeMs: number,
  externalTimeMs: number,
  thresholdMs: number = DEFAULT_DRIFT_THRESHOLD_MS,
): ClockDriftWarning | undefined {
  const driftMs = detectClockDrift(systemTimeMs, externalTimeMs);
  if (driftMs > thresholdMs) {
    return Object.freeze({
      code: ACL016,
      message: `Clock drift of ${driftMs}ms exceeds threshold of ${thresholdMs}ms`,
      driftMs,
    });
  }
  return undefined;
}
