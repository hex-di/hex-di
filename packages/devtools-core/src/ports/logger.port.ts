/**
 * Logger Port - Platform-agnostic logging abstraction.
 *
 * Essential for cross-runtime DevTools:
 * - TUI: stderr or file logging (stdout reserved for output)
 * - MCP: stderr only (stdout is JSON-RPC protocol)
 * - React: console logging
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";

/**
 * Log level for filtering messages.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Logger service contract.
 *
 * Minimal interface for structured logging across different runtimes.
 *
 * @example
 * ```typescript
 * // In MCP server (must use stderr)
 * const logger: Logger = {
 *   debug: (msg) => console.error(`[DEBUG] ${msg}`),
 *   info: (msg) => console.error(`[INFO] ${msg}`),
 *   warn: (msg) => console.error(`[WARN] ${msg}`),
 *   error: (msg) => console.error(`[ERROR] ${msg}`),
 * };
 * ```
 */
export interface Logger {
  /** Log debug-level message (verbose, development only) */
  debug(message: string): void;
  /** Log info-level message (normal operations) */
  info(message: string): void;
  /** Log warning-level message (potential issues) */
  warn(message: string): void;
  /** Log error-level message (failures) */
  error(message: string): void;
}

/**
 * Logger port definition.
 *
 * Use this port to inject logging capabilities into DevTools components.
 */
export const LoggerPort = createPort<"Logger", Logger>("Logger");
