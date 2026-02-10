/**
 * Context variables for log context propagation.
 *
 * These variables enable passing log context through the DI container
 * without explicitly threading it through every service.
 *
 * @packageDocumentation
 */

import { createContextVariable, type ContextVariable } from "@hex-di/core";
import type { LogContext } from "../types/log-entry.js";

/**
 * Context variable for log context propagation.
 *
 * Carries the current log context (correlationId, requestId, etc.)
 * through DI resolution.
 */
export const LogContextVar: ContextVariable<LogContext> = createContextVariable(
  "hex-di/log-context",
  {}
);

/**
 * Context variable for log annotations propagation.
 *
 * Carries persistent annotations that should be included
 * in all log entries within a scope.
 */
export const LogAnnotationsVar: ContextVariable<Record<string, unknown>> = createContextVariable(
  "hex-di/log-annotations",
  {}
);
