/**
 * Instrumentation types for container resolution logging.
 *
 * Shared type definitions used by both container.ts and hook.ts,
 * extracted to break circular dependencies.
 *
 * @packageDocumentation
 */

import type { LogLevel } from "../types/log-level.js";

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
 * Hook object for container resolution lifecycle events.
 */
export interface LoggingHook {
  readonly beforeResolve?: (portName: string) => void;
  readonly afterResolve?: (portName: string, instance: unknown) => void;
  readonly onError?: (portName: string, error: Error) => void;
}
