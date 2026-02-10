/**
 * Console logging analytics adapter.
 *
 * Implements the AnalyticsPort by logging all events to the browser
 * console. In production this would be replaced with a real analytics
 * service (e.g., Mixpanel, Amplitude, PostHog).
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { AnalyticsPort } from "../../ports/analytics.js";

const consoleAnalyticsAdapter = createAdapter({
  provides: AnalyticsPort,
  lifetime: "singleton",
  factory: () => ({
    track(event: string, properties?: Record<string, string | number | boolean>) {
      console.log("[Analytics] track:", event, properties);
    },
    page(name: string) {
      console.log("[Analytics] page:", name);
    },
    identify(trainerId: string) {
      console.log("[Analytics] identify:", trainerId);
    },
  }),
});

export { consoleAnalyticsAdapter };
