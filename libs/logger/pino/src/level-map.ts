/**
 * Level mapping between @hex-di/logger and Pino log levels.
 *
 * @packageDocumentation
 */

import type { LogLevel } from "@hex-di/logger";

/**
 * Pino log method names.
 */
export type PinoLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Map hex-di log levels to pino method names.
 * Since the level names are identical, this is a direct mapping.
 */
export function mapLevel(level: LogLevel): PinoLevel {
  return level;
}
