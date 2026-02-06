/**
 * Container instrumentation for automatic distributed tracing.
 *
 * Installs resolution hooks on a container to create spans for every
 * dependency resolution, with proper parent-child relationships via
 * the module-level span stack.
 *
 * @packageDocumentation
 */

import type {
  ResolutionHookContext,
  ResolutionResultContext,
  HookType,
  HookHandler,
} from "@hex-di/runtime";
import type { Tracer } from "../ports/tracer.js";
import type { Span } from "../types/index.js";
import { pushSpan, popSpan, getActiveSpan } from "./span-stack.js";
import type { AutoInstrumentOptions } from "./types.js";
import { evaluatePortFilter } from "./types.js";

/**
 * Minimal interface for a container that supports hook installation.
 *
 * This allows instrumentContainer to work with any container type
 * (root, child, scope) without requiring generic type parameters.
 */
interface HookableContainer {
  addHook<T extends HookType>(type: T, handler: HookHandler<T>): void;
  removeHook<T extends HookType>(type: T, handler: HookHandler<T>): void;
}

/**
 * WeakMap tracking installed cleanup functions per container.
 *
 * Used to handle double-instrumentation: if a container is instrumented
 * twice, we automatically clean up the old hooks before installing new ones.
 *
 * Key: Container instance (any container with addHook/removeHook)
 * Value: Cleanup function to remove hooks
 */
const installedCleanups = new WeakMap<HookableContainer, () => void>();

/**
 * Instruments a container with distributed tracing hooks.
 *
 * Installs beforeResolve and afterResolve hooks that:
 * 1. Create spans for every dependency resolution
 * 2. Establish parent-child relationships via span stack
 * 3. Record resolution metadata (port name, lifetime, cached status)
 * 4. Handle errors and duration tracking
 *
 * @param container - The container to instrument (must have addHook/removeHook methods)
 * @param tracer - The tracer to use for creating spans
 * @param options - Optional configuration for filtering and attributes
 * @returns Cleanup function to remove the hooks (idempotent)
 *
 * @remarks
 * **Double-instrumentation handling:**
 * If the same container is instrumented twice, the old hooks are automatically
 * cleaned up before installing new ones. This prevents duplicate spans.
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
 * @example Basic instrumentation
 * ```typescript
 * const cleanup = instrumentContainer(container, tracer);
 *
 * // Container resolutions now create spans
 * const logger = container.resolve(LoggerPort);
 *
 * // Later, remove instrumentation
 * cleanup();
 * ```
 *
 * @example Production-optimized
 * ```typescript
 * instrumentContainer(container, tracer, {
 *   traceCachedResolutions: false, // Skip cache hits
 *   minDurationMs: 5,               // Only trace slow resolutions
 *   portFilter: { include: ['ApiService', 'DatabasePool'] },
 *   additionalAttributes: {
 *     'service.name': 'user-api',
 *     'deployment.environment': 'production',
 *   },
 * });
 * ```
 */
export function instrumentContainer(
  container: HookableContainer,
  tracer: Tracer,
  options?: AutoInstrumentOptions
): () => void {
  // Check for existing instrumentation
  const existingCleanup = installedCleanups.get(container);
  if (existingCleanup) {
    // Auto-cleanup old hooks before installing new ones
    existingCleanup();
  }

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

  // Map to track spans for each resolution (by resolution ID)
  // We use a Map instead of the stack directly because afterResolve might
  // not always be called in LIFO order for nested async resolutions
  const spanMap = new Map<string, Span>();

  /**
   * beforeResolve hook: Create and start span
   */
  function beforeResolve(ctx: ResolutionHookContext): void {
    // Filter by port name
    if (!evaluatePortFilter(opts.portFilter, ctx.portName)) {
      return;
    }

    // Filter by cache status
    if (ctx.isCacheHit && !opts.traceCachedResolutions) {
      return;
    }

    // Get parent span from stack for parent-child relationship
    const parentSpan = getActiveSpan();

    // Create span with concise name format
    const spanName = `resolve:${ctx.portName}`;

    // Start span with parent context if available
    const span = tracer.startSpan(spanName, {
      kind: "internal",
      attributes: {
        // Standard hex-di attributes per INST-06
        "hex-di.port.name": ctx.portName,
        "hex-di.port.lifetime": ctx.lifetime,
        "hex-di.resolution.cached": ctx.isCacheHit,
        "hex-di.container.name": ctx.containerId,
        "hex-di.container.kind": ctx.containerKind,
        "hex-di.resolution.depth": ctx.depth,

        // Add parent port if available
        ...(ctx.parentPort && { "hex-di.parent.port": ctx.parentPort.__portName }),

        // Add scope ID if in scope
        ...(ctx.scopeId && { "hex-di.scope.id": ctx.scopeId }),

        // Add inheritance mode if applicable
        ...(ctx.inheritanceMode && { "hex-di.inheritance.mode": ctx.inheritanceMode }),

        // Merge additional attributes
        ...opts.additionalAttributes,
      },
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

    // Store span in map for retrieval in afterResolve
    // Use a unique key combining container ID, port name, and depth
    const resolutionKey = `${ctx.containerId}:${ctx.portName}:${ctx.depth}:${Date.now()}`;
    spanMap.set(resolutionKey, span);

    // Store resolution key in context for afterResolve retrieval
    // We'll use a property that won't collide with runtime internals
    (ctx as { __tracingKey?: string }).__tracingKey = resolutionKey;
  }

  /**
   * afterResolve hook: Complete span with result/error
   */
  function afterResolve(ctx: ResolutionResultContext): void {
    // Retrieve resolution key from context
    const resolutionKey = (ctx as { __tracingKey?: string }).__tracingKey;
    if (!resolutionKey) {
      // This resolution wasn't traced (filtered out in beforeResolve)
      return;
    }

    // Retrieve span from map
    const span = spanMap.get(resolutionKey);
    if (!span) {
      // Span not found (shouldn't happen, but handle gracefully)
      return;
    }

    // Clean up map entry
    spanMap.delete(resolutionKey);

    // Pop span from stack
    popSpan();

    try {
      // Add duration attribute
      span.setAttribute("hex-di.resolution.duration", ctx.duration);

      // Filter by minimum duration
      if (opts.minDurationMs > 0 && ctx.duration < opts.minDurationMs) {
        // Duration below threshold - don't record this span
        // We still need to end it to maintain proper span lifecycle
        span.setStatus("ok");
        span.end();
        return;
      }

      // Set status based on error
      if (ctx.error !== null) {
        // Resolution failed
        span.recordException(ctx.error);
        span.setStatus("error");
      } else {
        // Resolution succeeded
        span.setStatus("ok");
      }
    } finally {
      // Always end the span, even if status setting fails
      span.end();
    }
  }

  // Install hooks on the container
  container.addHook("beforeResolve", beforeResolve);
  container.addHook("afterResolve", afterResolve);

  // Create cleanup function
  const cleanup = (): void => {
    // Remove hooks
    container.removeHook("beforeResolve", beforeResolve);
    container.removeHook("afterResolve", afterResolve);

    // Clear span map (in case of incomplete resolutions)
    spanMap.clear();

    // Remove from tracking map
    installedCleanups.delete(container);
  };

  // Track cleanup function for double-instrumentation handling
  installedCleanups.set(container, cleanup);

  // Return idempotent cleanup function
  let cleanupCalled = false;
  return () => {
    if (!cleanupCalled) {
      cleanup();
      cleanupCalled = true;
    }
  };
}
