/**
 * InspectorPlugin - Singleton plugin for container state inspection.
 *
 * Uses WeakMap-based external state to track multiple containers:
 * - Each container gets isolated state via WeakMap
 * - Automatic GC cleanup when containers are collected
 * - Event routing via containerId for proper isolation
 *
 * @packageDocumentation
 */

import {
  definePlugin,
  type PluginContext,
  type PluginHooks,
  type InternalAccessible,
  type ScopeEventInfo,
  INTERNAL_ACCESS,
} from "@hex-di/runtime";
import type { InspectorWithSubscription, InspectorEvent, InspectorListener } from "./types.js";
import { INSPECTOR } from "./symbols.js";
import { createInspector } from "./inspector.js";

// =============================================================================
// State Store (Module-Level)
// =============================================================================

/**
 * Per-container inspector state.
 * @internal
 */
interface InspectorState {
  /** Set of event listeners for this container */
  readonly listeners: Set<InspectorListener>;
  /** Whether the container is disposed */
  isDisposed: boolean;
}

/**
 * WeakMap storing per-container state.
 * State is automatically cleaned up when container is garbage collected.
 * @internal
 */
const containerStates = new WeakMap<InternalAccessible, InspectorState>();

/**
 * Registry mapping containerId to container via WeakRef.
 * Enables hook event routing to correct container listeners.
 * @internal
 */
const containerRegistry = new Map<string, WeakRef<InternalAccessible>>();

/**
 * Gets or creates state for a container.
 * @internal
 */
function getOrCreateState(container: InternalAccessible): InspectorState {
  let state = containerStates.get(container);
  if (state === undefined) {
    state = {
      listeners: new Set(),
      isDisposed: false,
    };
    containerStates.set(container, state);
  }
  return state;
}

/**
 * Emits an event to all listeners registered for a specific container.
 * Routes events via containerId lookup.
 * @internal
 */
function emitToContainer(containerId: string, event: InspectorEvent): void {
  const containerRef = containerRegistry.get(containerId);
  if (containerRef === undefined) return;

  const container = containerRef.deref();
  if (container === undefined) {
    // Container was garbage collected, clean up registry
    containerRegistry.delete(containerId);
    return;
  }

  const state = containerStates.get(container);
  if (state === undefined) return;

  for (const listener of state.listeners) {
    try {
      listener(event);
    } catch {
      // Swallow listener errors to prevent affecting other listeners
    }
  }
}

// =============================================================================
// API Factory (Shared by createApi and createApiForChild)
// =============================================================================

/**
 * Creates an InspectorWithSubscription API for a container.
 * Used by both root and child container API creation.
 * @internal
 */
function createInspectorAPI(
  container: InternalAccessible,
  containerId: string
): InspectorWithSubscription {
  const state = getOrCreateState(container);

  // Register container for event routing
  containerRegistry.set(containerId, new WeakRef(container));

  // Create core inspector (uses WeakMap caching internally)
  const coreInspector = createInspector(container);

  const api: InspectorWithSubscription = {
    getSnapshot() {
      return coreInspector.getSnapshot();
    },

    getScopeTree() {
      return coreInspector.getScopeTree();
    },

    listPorts() {
      return coreInspector.listPorts();
    },

    isResolved(portName: string) {
      return coreInspector.isResolved(portName);
    },

    getContainerKind() {
      return coreInspector.getContainerKind();
    },

    getPhase() {
      return coreInspector.getPhase();
    },

    get isDisposed() {
      return state.isDisposed;
    },

    subscribe(listener: InspectorListener) {
      state.listeners.add(listener);
      return () => {
        state.listeners.delete(listener);
      };
    },
  };

  return Object.freeze(api);
}

// =============================================================================
// Plugin Definition (Singleton)
// =============================================================================

/**
 * Singleton InspectorPlugin for container state inspection.
 *
 * Uses WeakMap-based external state to track multiple containers:
 * - Single plugin instance works across all containers
 * - Each container gets isolated listener sets via WeakMap
 * - Events route to correct container via containerId
 * - Automatic cleanup when containers are garbage collected
 *
 * @example
 * ```typescript
 * import { createContainer } from '@hex-di/runtime';
 * import { InspectorPlugin, INSPECTOR } from '@hex-di/inspector';
 *
 * // Use the singleton plugin directly
 * const container = createContainer(graph, {
 *   plugins: [InspectorPlugin],
 * });
 *
 * // Inspector is immediately ready
 * const snapshot = container[INSPECTOR].getSnapshot();
 * console.log(`Container kind: ${snapshot.kind}`);
 *
 * // Subscribe to events
 * const unsubscribe = container[INSPECTOR].subscribe((event) => {
 *   if (event.type === 'resolution') {
 *     console.log(`Resolved ${event.portName} in ${event.duration}ms`);
 *   }
 * });
 * ```
 */
export const InspectorPlugin = definePlugin({
  name: "inspector",
  symbol: INSPECTOR,
  requires: [] as const,
  enhancedBy: [] as const,

  createApi(context: PluginContext): InspectorWithSubscription {
    const container = context.getContainer();
    const containerId = container[INTERNAL_ACCESS]().containerId;
    const state = getOrCreateState(container);

    // Register disposal callback
    context.onDispose(() => {
      state.isDisposed = true;
      emitToContainer(containerId, { type: "phase-changed", phase: "disposed" });
      emitToContainer(containerId, { type: "snapshot-changed" });
      state.listeners.clear();
      containerRegistry.delete(containerId);
    });

    return createInspectorAPI(container, containerId);
  },

  createApiForChild(childContainer: InternalAccessible): InspectorWithSubscription {
    const containerId = childContainer[INTERNAL_ACCESS]().containerId;
    return createInspectorAPI(childContainer, containerId);
  },

  hooks: {
    afterResolve(ctx) {
      emitToContainer(ctx.containerId, {
        type: "resolution",
        portName: ctx.portName,
        duration: ctx.duration,
        isCacheHit: ctx.isCacheHit,
      });
      emitToContainer(ctx.containerId, { type: "snapshot-changed" });
    },

    onScopeCreated(scope: ScopeEventInfo) {
      emitToContainer(scope.containerId, { type: "scope-created", scope });
      emitToContainer(scope.containerId, { type: "snapshot-changed" });
    },

    onScopeDisposed(scope: ScopeEventInfo) {
      emitToContainer(scope.containerId, { type: "scope-disposed", scopeId: scope.id });
      emitToContainer(scope.containerId, { type: "snapshot-changed" });
    },
  } satisfies PluginHooks,
});
