/**
 * Flow Tracing Bridge
 *
 * Adapts a @hex-di/tracing-compatible tracer to Flow's FlowTracingHook.
 * This bridges the distributed tracing system with Flow state machine tracing
 * without @hex-di/flow depending directly on @hex-di/tracing.
 *
 * @packageDocumentation
 */

import type { TracerLike, FlowTracingHookOptions } from "../introspection/types.js";

// =============================================================================
// Tracing Bridge Configuration
// =============================================================================

/**
 * Configuration for the Flow tracing bridge.
 */
export interface FlowTracingBridgeConfig {
  /**
   * A TracerLike implementation (from @hex-di/tracing or any compatible adapter).
   */
  readonly tracer: TracerLike;

  /**
   * Optional filter to control which machines are traced.
   * Return true to trace the machine, false to skip.
   */
  readonly filter?: (machineId: string) => boolean;

  /**
   * Whether to create spans for individual effect executions.
   * Defaults to true.
   */
  readonly traceEffects?: boolean;

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
 * Creates FlowTracingHookOptions from a TracerLike implementation.
 *
 * This bridge adapts the @hex-di/tracing `TracerLike` interface
 * (`pushSpan`/`popSpan`) to the `FlowTracingHookOptions` expected
 * by `createFlowTracingHook`.
 *
 * @param config - The bridge configuration
 * @returns FlowTracingHookOptions ready to pass to `createFlowTracingHook`
 *
 * @example
 * ```typescript
 * import { createFlowTracingBridge } from '@hex-di/flow';
 * import { createFlowTracingHook } from '@hex-di/flow';
 *
 * // Create the bridge from your tracer
 * const hookOptions = createFlowTracingBridge({
 *   tracer: myTracerImplementation,
 *   filter: (machineId) => machineId !== 'internal',
 *   traceEffects: true,
 * });
 *
 * // Create the hook
 * const tracingHook = createFlowTracingHook(hookOptions);
 *
 * // Use with FlowAdapter
 * const adapter = createFlowAdapter({
 *   provides: MyFlowPort,
 *   requires: [],
 *   machine: myMachine,
 *   tracingHook,
 * });
 * ```
 */
export function createFlowTracingBridge(config: FlowTracingBridgeConfig): FlowTracingHookOptions {
  return {
    tracer: config.tracer,
    filter: config.filter,
    traceEffects: config.traceEffects,
    scopeId: config.scopeId,
    traceContext: config.traceContext,
  };
}
