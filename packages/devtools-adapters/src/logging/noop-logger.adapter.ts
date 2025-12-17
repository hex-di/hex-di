/**
 * Noop Logger Adapter - Silent logging for production.
 *
 * Discards all log messages. Useful for:
 * - Production builds where logging is disabled
 * - Tests where log output is not needed
 * - Performance-critical paths
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/graph";
import { LoggerPort, type Logger } from "@hex-di/devtools-core";

/**
 * No-operation logger that discards all messages.
 */
const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Noop logger adapter for silent operation.
 *
 * Singleton lifetime ensures consistent behavior throughout the app.
 *
 * @example
 * ```typescript
 * import { NoopLoggerAdapter } from '@hex-di/devtools-adapters';
 *
 * // Disable all logging in production
 * const graph = createGraph()
 *   .provide(NoopLoggerAdapter);
 * ```
 */
export const NoopLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => noopLogger,
});
