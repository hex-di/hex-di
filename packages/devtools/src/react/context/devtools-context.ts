/**
 * DevTools Context
 *
 * React context holding the DevToolsFlowRuntime reference.
 * Provides type-safe context with proper null handling.
 *
 * @packageDocumentation
 */

import { createContext } from "react";
import type { DevToolsFlowRuntime } from "../../runtime/devtools-flow-runtime.js";
import type { DevToolsSnapshot, DevToolsFlowEvent } from "../../runtime/devtools-snapshot.js";
import type { InspectorWithSubscription } from "@hex-di/runtime";

// =============================================================================
// Context Definition
// =============================================================================

/**
 * Interface representing the minimal runtime API needed by the provider.
 *
 * This interface matches the public API of DevToolsFlowRuntime to enable
 * type-safe context usage without requiring the full class import.
 */
export interface DevToolsFlowRuntimeLike {
  /**
   * Subscribes to state changes.
   * Compatible with React 18's useSyncExternalStore.
   */
  subscribe(callback: () => void): () => void;

  /**
   * Returns the current combined snapshot of all machine states.
   * Compatible with React 18's useSyncExternalStore.
   */
  getSnapshot(): DevToolsSnapshot;

  /**
   * Dispatches an event to the appropriate machine.
   */
  dispatch(event: DevToolsFlowEvent): void;

  /**
   * Whether the runtime has been disposed.
   */
  readonly isDisposed: boolean;

  /**
   * Gets the root inspector for the container hierarchy.
   */
  getRootInspector(): InspectorWithSubscription;

  /**
   * Finds an inspector by container ID by traversing the container tree.
   *
   * @param containerId - The ID of the container to find
   * @returns The inspector for the container, or null if not found
   */
  getInspector(containerId: string): InspectorWithSubscription | null;

  /**
   * Gets the ancestor chain of inspectors from root to the specified container.
   *
   * @param containerId - The ID of the target container
   * @returns Array of inspectors from root to target, or empty array if not found
   */
  getAncestorChain(containerId: string): readonly InspectorWithSubscription[];
}

/**
 * React context holding the DevToolsFlowRuntime reference.
 *
 * The context value is `null` when no provider is present.
 * Hooks that consume this context must check for `null` and
 * throw an appropriate error if used outside the provider.
 *
 * @remarks
 * This context follows Inversion of Control - the runtime is created
 * at the composition root and passed to the provider. The provider
 * is a thin adapter layer with no state management logic.
 */
export const DevToolsContext = createContext<DevToolsFlowRuntimeLike | null>(null);

DevToolsContext.displayName = "DevToolsContext";

/**
 * Type alias for the full runtime type.
 * Used by hooks that need the complete runtime interface.
 */
export type { DevToolsFlowRuntime };
