/**
 * Notifications feature public API.
 *
 * @packageDocumentation
 */

// Types
export type { NotificationService } from "./types.js";

// Ports
export { NotificationServicePort, type NotificationsPorts } from "./di/ports.js";

// Adapters
export { NotificationServiceAdapter } from "./di/adapters/index.js";

// Feature bundle
export { notificationFeature } from "./di/bundle.js";
