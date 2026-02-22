/**
 * Log level types and utilities.
 *
 * Defines the severity levels for log entries and provides
 * comparison utilities for level filtering.
 *
 * @packageDocumentation
 */

/**
 * Log level severity.
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Numeric values for log levels, enabling comparison.
 */
export const LogLevelValue: Readonly<Record<LogLevel, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

/**
 * Check if a level should be logged given a minimum level.
 *
 * @param level - The level of the log entry
 * @param minLevel - The minimum level threshold
 * @returns true if the entry level meets or exceeds the minimum
 */
export function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LogLevelValue[level] >= LogLevelValue[minLevel];
}
