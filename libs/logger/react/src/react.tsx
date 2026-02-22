/**
 * React framework integration for structured logging.
 *
 * Provides context-based logger propagation through the component tree
 * with support for nested providers and lifecycle logging.
 *
 * @packageDocumentation
 */

import { createContext, useContext, useMemo, useEffect, type ReactNode } from "react";
import type { Logger, LogContext } from "@hex-di/logger";

/**
 * React context for the logger instance.
 */
const LoggerContext = createContext<Logger | null>(null);

/**
 * Props for the LoggingProvider component.
 */
export interface LoggingProviderProps {
  /** The logger instance to provide. */
  readonly logger: Logger;
  /** Additional context to apply to the logger. */
  readonly context?: Partial<LogContext>;
  /** Child components. */
  readonly children: ReactNode;
}

/**
 * Provides a logger instance to the React component tree.
 *
 * Supports nesting: a child LoggingProvider creates a child logger
 * from the parent's logger, maintaining the context chain.
 */
export function LoggingProvider({ logger, context, children }: LoggingProviderProps): ReactNode {
  const parentLogger = useContext(LoggerContext);

  const effectiveLogger = useMemo(() => {
    // If there's a parent logger, create a child from parent with merged context
    const base = parentLogger ?? logger;
    // If this is a nested provider, use the parent and add context
    const target = parentLogger ? base.child({}) : logger;
    if (context) {
      return target.child(context);
    }
    return target;
  }, [parentLogger, logger, context]);

  return <LoggerContext.Provider value={effectiveLogger}>{children}</LoggerContext.Provider>;
}

/**
 * Hook to access the logger from the nearest LoggingProvider.
 *
 * @throws Error if no LoggingProvider is found in the component tree
 * @returns The Logger instance from context
 */
export function useLogger(): Logger {
  const logger = useContext(LoggerContext);
  if (logger === null) {
    throw new Error("useLogger must be used within a LoggingProvider");
  }
  return logger;
}

/**
 * Hook to create a memoized child logger with additional context.
 *
 * @param context - Additional context to apply to the child logger
 * @returns A child Logger with the merged context
 */
export function useChildLogger(context: Partial<LogContext>): Logger {
  const logger = useLogger();
  return useMemo(() => logger.child(context), [logger, context]);
}

/**
 * Hook to log component mount and unmount at debug level.
 *
 * @param componentName - Name of the component for log messages
 */
export function useLifecycleLogger(componentName: string): void {
  const logger = useLogger();

  useEffect(() => {
    logger.debug(`${componentName} mounted`);
    return () => {
      logger.debug(`${componentName} unmounted`);
    };
  }, [logger, componentName]);
}
