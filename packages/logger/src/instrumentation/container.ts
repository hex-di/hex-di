/**
 * Container instrumentation for automatic resolution logging.
 *
 * Provides a way to instrument a DI container to automatically log
 * resolution events without coupling to a specific container implementation.
 *
 * @packageDocumentation
 */

import type { LogLevel } from "../types/log-level.js";
import type { Logger } from "../ports/logger.js";
import { createLoggingHook } from "./hook.js";

/**
 * Options for automatic container resolution logging.
 */
export interface AutoLogOptions {
  /** Log level for successful resolutions (default: "debug"). */
  readonly resolutionLevel?: LogLevel;
  /** Log level for resolution errors (default: "error"). */
  readonly errorLevel?: LogLevel;
  /** Filter which ports to log. Returns true to include (default: skips Logger and LogHandler). */
  readonly portFilter?: (portName: string) => boolean;
  /** Whether to include timing information for resolutions. */
  readonly includeTiming?: boolean;
  /** Minimum resolution duration in ms before logging (only when includeTiming is true). */
  readonly minDurationMs?: number;
  /** Whether to log scope lifecycle events (creation/disposal). */
  readonly logScopeLifecycle?: boolean;
}

/**
 * Minimal container interface for instrumentation.
 *
 * Uses structural typing so the logger package does not depend on @hex-di/runtime.
 */
interface InstrumentableContainer {
  readonly resolve: (port: unknown) => unknown;
  readonly onResolve?: (hook: (portName: string, instance: unknown) => void) => () => void;
  readonly onResolveError?: (hook: (portName: string, error: Error) => void) => () => void;
  readonly onScopeCreate?: (hook: (scopeId: string) => void) => () => void;
  readonly onScopeDispose?: (hook: (scopeId: string, resolvedCount: number) => void) => () => void;
}

/**
 * Instruments a container to automatically log resolution events.
 *
 * The logger instance is captured at instrumentation time, not resolved per-event.
 * Returns a cleanup function that removes all hooks when called.
 *
 * @param container - Container with hook support
 * @param logger - Logger instance to use for logging
 * @param options - Configuration options
 * @returns A cleanup function that removes all installed hooks
 */
export function instrumentContainer(
  container: InstrumentableContainer,
  logger: Logger,
  options?: AutoLogOptions
): () => void {
  const hook = createLoggingHook(logger, options);
  const cleanups: Array<() => void> = [];

  if (container.onResolve && hook.afterResolve) {
    const afterResolve = hook.afterResolve;
    const beforeResolve = hook.beforeResolve;
    const cleanup = container.onResolve((portName, instance) => {
      if (beforeResolve) {
        beforeResolve(portName);
      }
      afterResolve(portName, instance);
    });
    cleanups.push(cleanup);
  }

  if (container.onResolveError && hook.onError) {
    const onError = hook.onError;
    const cleanup = container.onResolveError((portName, error) => {
      onError(portName, error);
    });
    cleanups.push(cleanup);
  }

  if (options?.logScopeLifecycle) {
    const resolutionLevel = options.resolutionLevel ?? "debug";

    if (container.onScopeCreate) {
      let isLogging = false;
      const cleanup = container.onScopeCreate(scopeId => {
        if (isLogging) return;
        isLogging = true;
        try {
          logger[resolutionLevel](`Scope created: ${scopeId}`, { scopeId });
        } finally {
          isLogging = false;
        }
      });
      cleanups.push(cleanup);
    }

    if (container.onScopeDispose) {
      let isLogging = false;
      const cleanup = container.onScopeDispose((scopeId, resolvedCount) => {
        if (isLogging) return;
        isLogging = true;
        try {
          logger[resolutionLevel](`Scope disposed: ${scopeId}`, { scopeId, resolvedCount });
        } finally {
          isLogging = false;
        }
      });
      cleanups.push(cleanup);
    }
  }

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
