/**
 * Core feature type definitions.
 *
 * @packageDocumentation
 */

/**
 * Application configuration.
 */
export interface Config {
  /** Duration for notifications in milliseconds */
  readonly notificationDuration: number;
  /** Maximum number of messages to keep */
  readonly maxMessages: number;
}

/**
 * Logger service interface.
 */
export interface Logger {
  /** Log an informational message */
  log(message: string): void;
  /** Log a warning message */
  warn(message: string): void;
  /** Log an error message */
  error(message: string): void;
}
