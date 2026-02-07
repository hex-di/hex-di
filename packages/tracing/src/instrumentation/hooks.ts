/**
 * Standalone hook factory for manual tracing hook registration.
 *
 * Provides a factory function that returns ResolutionHooks objects
 * which can be manually passed to container options. This is an alternative
 * to instrumentContainer for users who prefer explicit hook registration.
 *
 * @packageDocumentation
 */

import type {
  ResolutionHookContext,
  ResolutionResultContext,
  ResolutionHooks,
} from "@hex-di/runtime";
import type { Tracer } from "../ports/tracer.js";
import { pushSpan, popSpan } from "./span-stack.js";
import type { Attributes, AttributeValue } from "../types/index.js";
import type { AutoInstrumentOptions } from "./types.js";
import { evaluatePortFilter } from "./types.js";

/**
 * Span name prefix constant for inline optimization.
 * Pre-computed to avoid string concatenation overhead.
 */
const RESOLVE_PREFIX = "resolve:";

/**
 * Creates a tracing hook for manual registration.
 *
 * Returns a ResolutionHooks object that can be passed to container options:
 *
 * ```typescript
 * const hooks = createTracingHook(tracer, options);
 * const container = createContainer(graph, { hooks });
 * ```
 *
 * This is equivalent to using `instrumentContainer()` but gives you more
 * control over when and how hooks are registered.
 *
 * @param tracer - The tracer to use for creating spans
 * @param options - Optional configuration for filtering and attributes
 * @returns ResolutionHooks object for manual registration
 *
 * @remarks
 * **Comparison with instrumentContainer:**
 * - `createTracingHook()`: Returns hooks object, you install it manually
 * - `instrumentContainer()`: Installs hooks automatically, returns cleanup function
 *
 * **Use createTracingHook when:**
 * - You want to compose multiple hook sources
 * - You're creating containers with predefined hook configuration
 * - You need to share the same hooks across multiple containers
 *
 * **Use instrumentContainer when:**
 * - You want to instrument an existing container
 * - You need automatic cleanup handling
 * - You're instrumenting a container tree (use instrumentContainerTree)
 *
 * **Span lifecycle:**
 * - beforeResolve: Create span, set attributes, push to stack
 * - Resolution happens (may trigger nested resolutions)
 * - afterResolve: Pop span, set final attributes/status, end span
 *
 * **Parent-child relationships:**
 * Nested resolutions automatically create child spans because the parent
 * span is on the stack when the child resolution begins.
 *
 * **Error handling:**
 * If resolution throws, the span is still ended with error status.
 * The error is not caught - it propagates normally.
 *
 * **Performance filtering:**
 * Duration filtering happens at span-end (afterResolve). Spans below
 * minDurationMs are ended but not exported (tracer implementation detail).
 *
 * @example Basic usage
 * ```typescript
 * const hooks = createTracingHook(tracer);
 * const container = createContainer(graph, { hooks });
 * ```
 *
 * @example Production-optimized
 * ```typescript
 * const hooks = createTracingHook(tracer, {
 *   traceCachedResolutions: false, // Skip cache hits
 *   minDurationMs: 5,               // Only trace slow resolutions
 *   portFilter: { include: ['ApiService', 'DatabasePool'] },
 *   additionalAttributes: {
 *     'service.name': 'user-api',
 *     'deployment.environment': 'production',
 *   },
 * });
 * ```
 *
 * @example Sharing hooks across containers
 * ```typescript
 * const hooks = createTracingHook(tracer, options);
 * const container1 = createContainer(graph1, { hooks });
 * const container2 = createContainer(graph2, { hooks });
 * // Both containers share the same tracing configuration
 * ```
 */
export function createTracingHook(
  tracer: Tracer,
  options?: AutoInstrumentOptions
): ResolutionHooks {
  // Merge with defaults
  const opts = {
    traceSyncResolutions: options?.traceSyncResolutions ?? true,
    traceAsyncResolutions: options?.traceAsyncResolutions ?? true,
    traceCachedResolutions: options?.traceCachedResolutions ?? true,
    portFilter: options?.portFilter,
    additionalAttributes: options?.additionalAttributes ?? {},
    minDurationMs: options?.minDurationMs ?? 0,
    includeStackTrace: options?.includeStackTrace ?? false,
  };

  // Precompute: skip filter evaluation when no filtering is configured
  const alwaysTrace = opts.portFilter === undefined && opts.traceCachedResolutions;

  // Precompute: whether additional attributes need merging
  const hasAdditionalAttributes = Object.keys(opts.additionalAttributes).length > 0;

  /**
   * Builds span attributes from resolution context.
   * Separated to enable early bailout optimization - only called when tracing is active.
   */
  function buildAttributes(ctx: ResolutionHookContext): Attributes {
    const attributes: Record<string, AttributeValue> = {
      // Standard hex-di attributes per INST-06
      "hex-di.port.name": ctx.portName,
      "hex-di.port.lifetime": ctx.lifetime,
      "hex-di.resolution.cached": ctx.isCacheHit,
      "hex-di.container.name": ctx.containerId,
      "hex-di.container.kind": ctx.containerKind,
      "hex-di.resolution.depth": ctx.depth,
    };

    // Add parent port if available
    if (ctx.parentPort) {
      attributes["hex-di.parent.port"] = ctx.parentPort.__portName;
    }

    // Add scope ID if in scope
    if (ctx.scopeId) {
      attributes["hex-di.scope.id"] = ctx.scopeId;
    }

    // Add inheritance mode if applicable
    if (ctx.inheritanceMode) {
      attributes["hex-di.inheritance.mode"] = ctx.inheritanceMode;
    }

    // Merge additional attributes (skip when empty)
    if (hasAdditionalAttributes) {
      Object.assign(attributes, opts.additionalAttributes);
    }

    return attributes;
  }

  /**
   * beforeResolve hook: Create and start span
   */
  function beforeResolve(ctx: ResolutionHookContext): void {
    // Fast path: skip filter evaluation when no filtering is configured
    if (!alwaysTrace) {
      if (!evaluatePortFilter(opts.portFilter, ctx.portName)) {
        return;
      }
      if (ctx.isCacheHit && !opts.traceCachedResolutions) {
        return;
      }
    }

    // Build attributes only after bailout check passes
    const attributes = buildAttributes(ctx);

    // Create span with pre-computed name prefix
    const spanName = RESOLVE_PREFIX + ctx.portName;

    // Start span (parent-child relationship is implicit via stack -
    // the tracer implementation can check getActiveSpan() if needed)
    const span = tracer.startSpan(spanName, {
      kind: "internal",
      attributes,
    });

    // Add stack trace if requested
    if (opts.includeStackTrace) {
      const stack = new Error().stack;
      if (stack) {
        span.setAttribute("stackTrace", stack);
      }
    }

    // Push span to stack for nested resolutions to use as parent
    pushSpan(span);
  }

  /**
   * afterResolve hook: Complete span with result/error
   *
   * Re-evaluates the same filter as beforeResolve to determine
   * whether this resolution was traced. This is necessary because
   * the runtime creates a new context object for afterResolve
   * (via spread), so we cannot use object identity to correlate.
   * The filter is deterministic for the same port/cache state,
   * so re-evaluation is correct.
   */
  function afterResolve(ctx: ResolutionResultContext): void {
    // Fast path: skip filter evaluation when no filtering is configured
    if (!alwaysTrace) {
      if (!evaluatePortFilter(opts.portFilter, ctx.portName)) {
        return;
      }
      if (ctx.isCacheHit && !opts.traceCachedResolutions) {
        return;
      }
    }

    // Pop the span that the matching beforeResolve pushed.
    // The stack is LIFO and hooks fire symmetrically, so this
    // always returns the correct span.
    const span = popSpan();
    if (!span) {
      return;
    }

    try {
      // Add duration attribute
      span.setAttribute("hex-di.resolution.duration", ctx.duration);

      // Filter by minimum duration
      if (opts.minDurationMs > 0 && ctx.duration < opts.minDurationMs) {
        // Duration below threshold - end span without meaningful status
        span.setStatus("ok");
        span.end();
        return;
      }

      // Set status based on error
      if (ctx.error !== null) {
        span.recordException(ctx.error);
        span.setStatus("error");
      } else {
        span.setStatus("ok");
      }
    } finally {
      // Always end the span, even if status setting fails
      span.end();
    }
  }

  // Return the hooks object for manual registration
  return {
    beforeResolve,
    afterResolve,
  };
}
