/**
 * Type guards and helper functions for type-safe container access.
 *
 * These utilities allow accessing TracingAPI from containers without unsafe casts.
 *
 * @packageDocumentation
 */

import type { Container, ContainerPhase } from "../../types.js";
import type { Port } from "@hex-di/ports";
import type { TracingAPI } from "@hex-di/plugin";
import { TRACING } from "./plugin.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Container type with TracingPlugin registered.
 *
 * Use this type when you need to explicitly type a container that is known
 * to have TracingPlugin at compile time.
 *
 * @example
 * ```typescript
 * function processTraces(container: ContainerWithTracing) {
 *   // container[TRACING] is fully typed as TracingAPI
 *   const traces = container[TRACING].getTraces();
 * }
 * ```
 */
export type ContainerWithTracing<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
> = Container<TProvides, TExtends, TAsyncPorts, TPhase> & {
  readonly [TRACING]: TracingAPI;
};

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard that narrows a container to one with TracingAPI.
 *
 * Use this to get type-safe access to container[TRACING] without unsafe casts.
 * After the check, TypeScript knows the container has the TRACING symbol.
 *
 * @param container - Any container (with or without TracingPlugin)
 * @returns True if the container has TracingPlugin registered
 *
 * @example
 * ```typescript
 * function useTracing(container: Container<...>) {
 *   if (hasTracing(container)) {
 *     // container[TRACING] is now TracingAPI (fully typed)
 *     const traces = container[TRACING].getTraces();
 *     const stats = container[TRACING].getStats();
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
  return TRACING in container;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely extract TracingAPI from a container if TracingPlugin is registered.
 *
 * This function provides type-safe access to the tracing API without requiring
 * the caller to know the container's plugin configuration at compile time.
 *
 * @param container - Any container (with or without TracingPlugin)
 * @returns TracingAPI if TracingPlugin is registered, undefined otherwise
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
    return container[TRACING];
  }
  return undefined;
}
