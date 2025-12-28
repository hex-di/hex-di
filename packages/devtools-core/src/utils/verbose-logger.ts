/**
 * Shared verbose logging utility for DevTools components.
 *
 * Provides a consistent logging pattern across network, server, and client
 * components. Uses console.warn for debug output since eslint disallows
 * console.log in library code.
 *
 * @packageDocumentation
 */

// =============================================================================
// Platform-Independent Console Declaration
// =============================================================================

/**
 * Minimal console interface for platform independence.
 * Works in both Node.js and browser environments without requiring
 * DOM or Node types in the lib configuration.
 */
declare const console: {
  warn(message: string): void;
};

// =============================================================================
// Types
// =============================================================================

/**
 * Verbose logger interface for debug output.
 *
 * Use this interface when accepting a logger as a parameter
 * to enable dependency injection for testing.
 */
export interface VerboseLogger {
  /**
   * Log a debug message when verbose mode is enabled.
   *
   * @param message - The message to log
   */
  readonly log: (message: string) => void;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a verbose logger with a prefix.
 *
 * The returned logger only outputs when `verbose` is true.
 * Uses console.warn since eslint disallows console.log in library code.
 *
 * @param prefix - Prefix for log messages (e.g., "DevToolsServer", "ConnectionManager")
 * @param verbose - Whether verbose logging is enabled
 * @returns A VerboseLogger instance
 *
 * @example Basic usage
 * ```typescript
 * const logger = createVerboseLogger("MyService", options.verbose);
 * logger.log("Connection established"); // [MyService] Connection established
 * ```
 *
 * @example With options object
 * ```typescript
 * interface ServiceOptions {
 *   verbose?: boolean;
 * }
 *
 * class MyService {
 *   private readonly logger: VerboseLogger;
 *
 *   constructor(options: ServiceOptions = {}) {
 *     this.logger = createVerboseLogger("MyService", options.verbose ?? false);
 *   }
 *
 *   connect(): void {
 *     this.logger.log("Connecting...");
 *   }
 * }
 * ```
 */
export function createVerboseLogger(prefix: string, verbose: boolean): VerboseLogger {
  return {
    log(message: string): void {
      if (verbose) {
        // Using console.warn for debug logs since console.log is disallowed by eslint
        // eslint-disable-next-line no-console
        console.warn(`[${prefix}] ${message}`);
      }
    },
  };
}

/**
 * No-op logger that discards all messages.
 *
 * Useful for testing or when logging is explicitly disabled.
 */
export const noopLogger: VerboseLogger = {
  log(): void {
    // Intentionally empty - discards all messages
  },
};
