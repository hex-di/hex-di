/**
 * Silent logger adapter implementation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/graph";
import { LoggerPort } from "../ports.js";
import type { Logger } from "../../../types.js";

/**
 * Silent logger adapter - no-op implementation.
 *
 * Variant: "silent"
 * Use case: Tests, production (where logs go elsewhere)
 *
 * All log methods are no-ops. Useful for:
 * - Fast unit tests without console noise
 * - Environments where logging is handled differently
 *
 * @remarks
 * - Lifetime: singleton - one instance for the entire application
 * - Dependencies: none
 */
export const SilentLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: (): Logger => ({
    log: (): void => {
      // Silent - no output
    },
    warn: (): void => {
      // Silent - no output
    },
    error: (): void => {
      // Silent - no output
    },
  }),
});
