/**
 * Analytics port definition.
 *
 * Defines the contract for user interaction tracking and
 * feature usage telemetry. The console adapter logs events
 * to the browser console; production would use a real analytics service.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

interface AnalyticsService {
  track(event: string, properties?: Record<string, string | number | boolean>): void;
  page(name: string): void;
  identify(trainerId: string): void;
}

// ---------------------------------------------------------------------------
// Port definition
// ---------------------------------------------------------------------------

const AnalyticsPort = port<AnalyticsService>()({
  name: "Analytics",
  category: "infrastructure",
  description: "User interaction tracking for feature usage telemetry",
});

export { AnalyticsPort };
export type { AnalyticsService };
