/**
 * Notifications feature bundle definition.
 *
 * @packageDocumentation
 */

import { createFeature } from "../../../plugins/types.js";
import { LoggerPort, ConfigPort } from "../../core/di/ports.js";
import { NotificationServiceAdapter } from "./adapters/index.js";

/**
 * Notifications feature bundle.
 *
 * Provides: NotificationServicePort
 * Requires: LoggerPort, ConfigPort
 *
 * This feature provides notification display functionality.
 * Each resolution gets a unique instance (transient lifetime).
 *
 * @example
 * ```typescript
 * const graph = withFeature(
 *   withFeature(GraphBuilder.create(), coreFeature),
 *   notificationFeature
 * ).build();
 * ```
 */
export const notificationFeature = createFeature({
  name: "notifications",
  description: "Notification display with unique instances per resolution",
  adapters: [NotificationServiceAdapter],
  asyncAdapters: [],
  requires: [LoggerPort, ConfigPort],
});
