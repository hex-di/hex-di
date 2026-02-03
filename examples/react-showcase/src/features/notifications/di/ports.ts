/**
 * Notifications feature port definitions.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { NotificationService } from "../types.js";

/**
 * Port for the notification service.
 *
 * Provides notification display functionality.
 * Uses transient lifetime for unique instances per resolution.
 */
export const NotificationServicePort = port<NotificationService>()({
  name: "NotificationService",
});

/**
 * Union of all ports in the notifications feature.
 */
export type NotificationsPorts = typeof NotificationServicePort;
