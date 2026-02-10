/**
 * ScopedLoggerAdapter - DI adapter for handler-backed scoped logger.
 *
 * Provides a Logger implementation that delegates to a LogHandler,
 * with scoped lifetime for request-level isolation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { LoggerPort } from "../../ports/logger.js";
import { LogHandlerPort } from "../../ports/log-handler.js";
import { createHandlerLogger } from "./logger.js";

/**
 * ScopedLoggerAdapter - DI adapter for handler-backed scoped logger.
 *
 * Provides LoggerPort implementation backed by a LogHandler.
 * Uses scoped lifetime for request-level isolation.
 */
export const ScopedLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [LogHandlerPort],
  lifetime: "scoped",
  factory: deps => createHandlerLogger(deps.LogHandler),
});
