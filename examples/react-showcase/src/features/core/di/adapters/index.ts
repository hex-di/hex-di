/**
 * Core feature adapter exports.
 *
 * This module provides profile-aware adapter selection.
 *
 * @packageDocumentation
 */

import { loadAdapterConfig } from "../../../../profiles/index.js";
import { ConsoleLoggerAdapter } from "./console-logger.js";
import { SilentLoggerAdapter } from "./silent-logger.js";

// Re-export all adapter variants for direct access
export { ConfigAdapter } from "./config.js";
export { ConsoleLoggerAdapter } from "./console-logger.js";
export { SilentLoggerAdapter } from "./silent-logger.js";

/**
 * Logger adapter registry mapping variant names to implementations.
 */
export const loggerAdapters = {
  console: ConsoleLoggerAdapter,
  silent: SilentLoggerAdapter,
} as const;

/**
 * Gets the logger adapter based on current configuration.
 *
 * @returns The logger adapter for the current profile
 */
export function getLoggerAdapter() {
  const config = loadAdapterConfig();
  return loggerAdapters[config.logger];
}
