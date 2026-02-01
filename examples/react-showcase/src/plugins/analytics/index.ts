/**
 * Analytics plugin - Example plugin demonstrating the plugin system.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { createPlugin } from "../types.js";
import { LoggerPort } from "../../features/core/di/ports.js";
import type { AnalyticsService, AnalyticsEvent } from "./types.js";

// =============================================================================
// Port
// =============================================================================

/**
 * Port for the analytics service.
 */
export const AnalyticsPort = createPort<"Analytics", AnalyticsService>("Analytics");

// =============================================================================
// Adapter
// =============================================================================

/**
 * Adapter for the analytics service.
 *
 * Tracks events in memory and logs them via the Logger.
 *
 * @remarks
 * - Lifetime: singleton - one analytics instance for the app
 * - Dependencies: LoggerPort
 */
export const AnalyticsAdapter = createAdapter({
  provides: AnalyticsPort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: (deps): AnalyticsService => {
    const events: AnalyticsEvent[] = [];

    deps.Logger.log("AnalyticsService initialized");

    return {
      trackEvent: (name: string, properties?: Record<string, unknown>): void => {
        const event: AnalyticsEvent = {
          name,
          timestamp: new Date(),
        };
        // Only add properties if defined (exactOptionalPropertyTypes)
        if (properties !== undefined) {
          (event as { properties?: Record<string, unknown> }).properties = properties;
        }
        events.push(event);
        deps.Logger.log(`[Analytics] Event tracked: ${name}`);
      },

      trackMessageSent: (userId: string, messageLength: number): void => {
        const event: AnalyticsEvent = {
          name: "message_sent",
          properties: { userId, messageLength },
          timestamp: new Date(),
        };
        events.push(event);
        deps.Logger.log(`[Analytics] Message sent by ${userId} (${messageLength} chars)`);
      },

      getEvents: (): readonly AnalyticsEvent[] => {
        return Object.freeze([...events]);
      },
    };
  },
});

// =============================================================================
// Plugin
// =============================================================================

/**
 * Analytics Plugin
 *
 * Provides: AnalyticsPort
 * Requires: LoggerPort (must be provided by host)
 *
 * @example
 * ```typescript
 * import { AnalyticsPlugin, AnalyticsPort } from "./plugins/analytics";
 *
 * const graph = withFeature(GraphBuilder.create(), coreFeature)
 *   .installPlugin(AnalyticsPlugin)
 *   .build();
 *
 * // Use in React components
 * const analytics = usePort(AnalyticsPort);
 * analytics.trackEvent("button_click");
 * ```
 */
export const AnalyticsPlugin = createPlugin({
  id: "analytics",
  displayName: "Analytics Plugin",
  version: "1.0.0",
  adapters: [AnalyticsAdapter] as const,
});

// Re-export types
export type { AnalyticsService, AnalyticsEvent } from "./types.js";
