/**
 * Notifications feature type definitions.
 *
 * @packageDocumentation
 */

/**
 * Notification service interface.
 */
export interface NotificationService {
  /** Unique instance ID (for demonstrating transient lifetime) */
  readonly instanceId: number;
  /** When this instance was created */
  readonly createdAt: Date;
  /** Show a notification message */
  notify(message: string): void;
}
