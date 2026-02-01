/**
 * Type guards and helper functions for type-safe container access.
 *
 * These utilities allow accessing TracingAPI from containers.
 * Since tracer is now a built-in property, these mainly exist for
 * backwards compatibility and consistency with the inspector API.
 *
 * @packageDocumentation
 */

import type { Container, ContainerPhase } from "../types.js";
import type { Port } from "@hex-di/core";
import type { TracingAPI } from "@hex-di/core";

// =============================================================================
// Types
// =============================================================================

/**
 * Container type that has tracer available.
 *
 * Since tracer is now a built-in property, all containers have it.
 * This type exists for API consistency with the inspector module.
 *
 * @example
 * ```typescript
 * function processTraces(container: ContainerWithTracing) {
 *   const traces = container.tracer.getTraces();
 * }
 * ```
 */
export type ContainerWithTracing<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
> = Container<TProvides, TExtends, TAsyncPorts, TPhase>;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard that checks if a container has tracing available.
 *
 * Since tracer is now a built-in property, this always returns true
 * for valid containers. Kept for API consistency.
 *
 * @param container - Any container
 * @returns True if the container has tracer (always true for valid containers)
 *
 * @example
 * ```typescript
 * function useTracing(container: Container<...>) {
 *   if (hasTracing(container)) {
 *     const traces = container.tracer.getTraces();
 *     const stats = container.tracer.getStats();
 *   }
 * }
 * ```
 */
export function hasTracing<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>
): container is ContainerWithTracing<TProvides, TExtends, TAsyncPorts, TPhase> {
  return "tracer" in container;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely extract TracingAPI from a container.
 *
 * Since tracer is now a built-in property, this will always return
 * the tracing API for valid containers. Kept for API consistency.
 *
 * @param container - Any container
 * @returns TracingAPI from the container's built-in tracer property
 *
 * @example
 * ```typescript
 * const tracingAPI = getTracingAPI(container);
 * if (tracingAPI) {
 *   const traces = tracingAPI.getTraces();
 *   const stats = tracingAPI.getStats();
 * }
 * ```
 *
 * @example Using with optional chaining
 * ```typescript
 * const traces = getTracingAPI(container)?.getTraces() ?? [];
 * ```
 */
export function getTracingAPI<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): TracingAPI | undefined {
  if (hasTracing(container)) {
    return container.tracer;
  }
  return undefined;
}
