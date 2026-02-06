/**
 * Tracing Context for @hex-di/react.
 *
 * Provides the React context for storing the tracer reference.
 *
 * @packageDocumentation
 * @internal
 */

import { createContext } from "react";
import type { Tracer } from "@hex-di/tracing";

// =============================================================================
// Tracing Context Value Types
// =============================================================================

/**
 * Internal context value structure for the tracing context.
 *
 * This stores the tracer reference, which is needed for:
 * - Accessing tracer via useTracer hook
 * - Getting active span via useSpan hook
 * - Creating traced callbacks via useTracedCallback hook
 *
 * @internal
 */
export interface TracingContextValue {
  /**
   * The tracer provided by TracingProvider.
   */
  readonly tracer: Tracer;
}

// =============================================================================
// Tracing Context
// =============================================================================

/**
 * React Context for the tracer.
 *
 * This context stores the tracer and is used to:
 * - Access the tracer via useTracer hook
 * - Detect usage outside TracingProvider
 *
 * @remarks
 * The context value is null when outside a TracingProvider.
 * Hooks should check for null and throw MissingProviderError.
 *
 * @internal
 */
export const TracingContext = createContext<TracingContextValue | null>(null);
TracingContext.displayName = "HexDI.TracingContext";
