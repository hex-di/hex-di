/**
 * Type guards and helper functions for type-safe container access.
 *
 * These utilities allow accessing InspectorAPI from containers without unsafe casts.
 *
 * @packageDocumentation
 */

import type { Container, ContainerPhase } from "../types.js";
import type { Port } from "@hex-di/core";
import type { InspectorAPI } from "./types.js";
import { INSPECTOR } from "./symbols.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Container type with InspectorPlugin registered.
 *
 * Use this type when you need to explicitly type a container that is known
 * to have InspectorPlugin at compile time.
 *
 * @example
 * ```typescript
 * function processSnapshot(container: ContainerWithInspector) {
 *   // container[INSPECTOR] is fully typed as InspectorAPI
 *   const snapshot = container[INSPECTOR].getSnapshot();
 * }
 * ```
 */
export type ContainerWithInspector<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
> = Container<TProvides, TExtends, TAsyncPorts, TPhase> & {
  readonly [INSPECTOR]: InspectorAPI;
};

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard that narrows a container to one with InspectorAPI.
 *
 * Use this to get type-safe access to container[INSPECTOR] without unsafe casts.
 * After the check, TypeScript knows the container has the INSPECTOR symbol.
 *
 * @param container - Any container (with or without InspectorPlugin)
 * @returns True if the container has InspectorPlugin registered
 *
 * @example
 * ```typescript
 * function useInspector(container: Container<...>) {
 *   if (hasInspector(container)) {
 *     // container[INSPECTOR] is now InspectorAPI (fully typed)
 *     const snapshot = container[INSPECTOR].getSnapshot();
 *     const phase = container[INSPECTOR].getPhase();
 *   }
 * }
 * ```
 */
export function hasInspector<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>
): container is ContainerWithInspector<TProvides, TExtends, TAsyncPorts, TPhase> {
  return INSPECTOR in container;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely extract InspectorAPI from a container if InspectorPlugin is registered.
 *
 * This function provides type-safe access to the inspector API without requiring
 * the caller to know the container's plugin configuration at compile time.
 *
 * @param container - Any container (with or without InspectorPlugin)
 * @returns InspectorAPI if InspectorPlugin is registered, undefined otherwise
 *
 * @example
 * ```typescript
 * const inspectorAPI = getInspectorAPI(container);
 * if (inspectorAPI) {
 *   const snapshot = inspectorAPI.getSnapshot();
 *   const phase = inspectorAPI.getPhase();
 * }
 * ```
 *
 * @example Using with optional chaining
 * ```typescript
 * const snapshot = getInspectorAPI(container)?.getSnapshot();
 * ```
 */
export function getInspectorAPI<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
>(container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): InspectorAPI | undefined {
  if (hasInspector(container)) {
    return container[INSPECTOR];
  }
  return undefined;
}
