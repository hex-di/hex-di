/**
 * Notifications feature port definitions.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import type { NotificationService } from "../types.js";

/**
 * Port for the notification service.
 *
 * Provides notification display functionality.
 * Uses request lifetime for unique instances per resolution.
 */
export const NotificationServicePort = createPort<"NotificationService", NotificationService>(
  "NotificationService"
);

/**
 * Union of all ports in the notifications feature.
 */
export type NotificationsPorts = typeof NotificationServicePort;
