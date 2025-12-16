/**
 * Notification service adapter implementation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/graph";
import { NotificationServicePort } from "../ports.js";
import { LoggerPort, ConfigPort } from "../../../core/di/ports.js";
import type { NotificationService } from "../../types.js";

// =============================================================================
// Instance Counter
// =============================================================================

/**
 * Counter for generating unique instance IDs for NotificationService.
 * Each resolution increments this counter.
 */
let notificationInstanceCounter = 0;

// =============================================================================
// Adapter
// =============================================================================

/**
 * Adapter for the notification service.
 *
 * Creates a new instance with a unique ID each time it is resolved.
 * This demonstrates the request lifetime where every resolution
 * gets a fresh instance.
 *
 * This is a sync adapter that depends on ConfigPort (async).
 * This works because all async adapters are initialized before
 * the container is used, making their instances available synchronously.
 *
 * @remarks
 * - Lifetime: request - new instance for every resolution
 * - Dependencies: LoggerPort, ConfigPort (async - requires container.initialize())
 */
export const NotificationServiceAdapter = createAdapter({
  provides: NotificationServicePort,
  requires: [LoggerPort, ConfigPort],
  lifetime: "request",
  factory: (deps): NotificationService => {
    notificationInstanceCounter += 1;
    const instanceId = notificationInstanceCounter;
    const createdAt = new Date();

    deps.Logger.log(
      `NotificationService instance #${instanceId} created at ${createdAt.toLocaleTimeString()}`
    );

    return {
      instanceId,
      createdAt,
      notify: (message: string): void => {
        deps.Logger.log(
          `[Notification #${instanceId}] ${message} (duration: ${deps.Config.notificationDuration}ms)`
        );
      },
    };
  },
});
