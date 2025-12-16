/**
 * Analytics plugin type definitions.
 *
 * @packageDocumentation
 */

/**
 * Analytics event for tracking.
 */
export interface AnalyticsEvent {
  readonly name: string;
  readonly properties?: Record<string, unknown>;
  readonly timestamp: Date;
}

/**
 * Analytics service interface.
 */
export interface AnalyticsService {
  /** Track a custom event */
  trackEvent(name: string, properties?: Record<string, unknown>): void;
  /** Track a message send event */
  trackMessageSent(userId: string, messageLength: number): void;
  /** Get all tracked events */
  getEvents(): readonly AnalyticsEvent[];
}
