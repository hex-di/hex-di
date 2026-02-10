/**
 * @hex-di/logger-react - React Integration for Structured Logging
 *
 * Provides context-based logger propagation through the React component tree
 * with support for nested providers and lifecycle logging.
 *
 * @packageDocumentation
 */

export { LoggingProvider, useLogger, useChildLogger, useLifecycleLogger } from "./react.js";
export type { LoggingProviderProps } from "./react.js";
