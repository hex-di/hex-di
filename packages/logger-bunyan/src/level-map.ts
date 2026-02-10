/**
 * Level mapping between @hex-di/logger and Bunyan log levels.
 *
 * @packageDocumentation
 */

import type { LogLevel } from "@hex-di/logger";

/**
 * Bunyan log method names.
 */
export type BunyanLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Map hex-di log levels to bunyan method names.
 * Since the level names are identical, this is a direct mapping.
 */
export function mapLevel(level: LogLevel): BunyanLevel {
  return level;
}
