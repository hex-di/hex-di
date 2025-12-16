/**
 * Console logger adapter implementation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/graph";
import { LoggerPort } from "../ports.js";
import type { Logger } from "../../../types.js";

/**
 * Console-based logger adapter.
 *
 * Variant: "console"
 * Use case: Development, debugging
 *
 * Creates a logger that prefixes all messages with "[ChatApp]".
 *
 * @remarks
 * - Lifetime: singleton - one instance for the entire application
 * - Dependencies: none
 */
export const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: (): Logger => ({
    log: (message: string): void => {
      console.log(`[ChatApp] ${message}`);
    },
    warn: (message: string): void => {
      console.warn(`[ChatApp] ${message}`);
    },
    error: (message: string): void => {
      console.error(`[ChatApp] ${message}`);
    },
  }),
});
