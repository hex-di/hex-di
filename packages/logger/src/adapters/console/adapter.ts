/**
 * ConsoleLoggerAdapter - DI adapter for the console logger.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { LoggerPort } from "../../ports/logger.js";
import { createConsoleLogger } from "./logger.js";

/**
 * ConsoleLoggerAdapter - DI adapter for the console logger.
 *
 * Provides LoggerPort implementation with console output for development.
 */
export const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createConsoleLogger(),
});
