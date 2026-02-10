/**
 * Structured log entry types.
 *
 * Defines the shape of log entries that flow through the logging system.
 *
 * @packageDocumentation
 */

import type { LogLevel } from "./log-level.js";

/**
 * Log context carrying request-scoped data.
 */
export interface LogContext {
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly scopeId?: string;
  readonly service?: string;
  readonly environment?: string;
  readonly [key: string]: unknown;
}

/**
 * Structured log entry.
 */
export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: number;
  readonly context: LogContext;
  readonly annotations: Readonly<Record<string, unknown>>;
  readonly error?: Error;
  readonly spans?: ReadonlyArray<{
    readonly traceId: string;
    readonly spanId: string;
  }>;
}
