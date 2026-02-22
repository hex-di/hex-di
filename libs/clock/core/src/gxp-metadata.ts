/**
 * GxP metadata for @hex-di/clock — version and compliance tracking.
 *
 * @packageDocumentation
 */

/** GxP metadata for the clock library. */
export interface ClockGxPMetadata {
  readonly clockVersion: string;
  readonly specRevision: string;
  readonly requiredMonitoringVersion: string | undefined;
}

/**
 * Returns frozen GxP metadata for the current clock library version.
 * Used for automated compliance tracking and monitoring co-deployment checks.
 */
export function getClockGxPMetadata(): ClockGxPMetadata {
  return Object.freeze({
    clockVersion: "0.1.0",
    specRevision: "2.9",
    requiredMonitoringVersion: undefined,
  });
}
