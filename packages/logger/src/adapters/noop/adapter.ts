/**
 * NoOpLoggerAdapter - Zero-overhead logger adapter for disabled logging.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { LoggerPort } from "../../ports/logger.js";
import { NOOP_LOGGER } from "./logger.js";

/**
 * Adapter that provides a zero-overhead NoOp logger implementation.
 *
 * All logging operations are no-ops, ensuring zero performance impact
 * when logging is disabled.
 */
export const NoOpLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => NOOP_LOGGER,
});
