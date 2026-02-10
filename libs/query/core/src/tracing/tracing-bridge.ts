/**
 * Query Tracing Bridge
 *
 * Adapts a @hex-di/tracing-compatible tracer to Query's QueryTracingHook.
 * This bridges the distributed tracing system with Query operation tracing
 * without @hex-di/query depending directly on @hex-di/tracing.
 *
 * @packageDocumentation
 */

import type { TracerLike, QueryTracingHookOptions } from "./types.js";

// =============================================================================
// Tracing Bridge Configuration
// =============================================================================

/**
 * Configuration for the Query tracing bridge.
 */
export interface QueryTracingBridgeConfig {
  /**
   * A TracerLike implementation (from @hex-di/tracing or any compatible adapter).
   */
  readonly tracer: TracerLike;

  /**
   * Optional filter to control which ports are traced.
   * Return true to trace the port, false to skip.
   */
  readonly filter?: (portName: string) => boolean;

  /**
   * Whether to create spans for mutation operations.
   * Defaults to true.
   */
  readonly traceMutations?: boolean;

  /**
   * Optional scope ID to include in span attributes.
   */
  readonly scopeId?: string;

  /**
   * Optional trace context entries to include in span attributes.
   */
  readonly traceContext?: Record<string, string>;
}

// =============================================================================
// Tracing Bridge Factory
// =============================================================================

/**
 * Creates QueryTracingHookOptions from a TracerLike implementation.
 *
 * This bridge adapts the @hex-di/tracing `TracerLike` interface
 * (`pushSpan`/`popSpan`) to the `QueryTracingHookOptions` expected
 * by `createQueryTracingHook`.
 *
 * @param config - The bridge configuration
 * @returns QueryTracingHookOptions ready to pass to `createQueryTracingHook`
 *
 * @example
 * ```typescript
 * import { createQueryTracingBridge, createQueryTracingHook } from '@hex-di/query';
 *
 * const hookOptions = createQueryTracingBridge({
 *   tracer: myTracerImplementation,
 *   filter: (portName) => portName !== 'internal',
 *   traceMutations: true,
 * });
 *
 * const tracingHook = createQueryTracingHook(hookOptions);
 *
 * const client = createQueryClient({
 *   container,
 *   tracingHook,
 * });
 * ```
 */
export function createQueryTracingBridge(
  config: QueryTracingBridgeConfig
): QueryTracingHookOptions {
  return {
    tracer: config.tracer,
    filter: config.filter,
    traceMutations: config.traceMutations,
    scopeId: config.scopeId,
    traceContext: config.traceContext,
  };
}
