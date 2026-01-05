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

import { definePlugin } from "../../plugin/define.js";
import { getEnhancedWrapper } from "../../plugin/wrapper.js";
import type { PluginContext, PluginHooks } from "../../plugin/types.js";
import type { InternalAccessible } from "../../inspector/creation.js";
import type { EnhanceableContainer } from "../../plugin/wrapper.js";
import type { ScopeEventInfo } from "../../plugin/types.js";
import { INTERNAL_ACCESS } from "../../inspector/symbols.js";
import type {
  InspectorWithSubscription,
  InspectorEvent,
  InspectorListener,
  ContainerGraphData,
  VisualizableAdapter,
} from "./types.js";
import type { ServiceOrigin } from "@hex-di/plugin";
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
  /** IDs of child containers */
  readonly childIds: Set<string>;
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
 * Registry mapping containerId to InspectorAPI.
 * Enables getChildContainers() to return APIs for child containers.
 * @internal
 */
const apiRegistry = new Map<string, InspectorWithSubscription>();

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
      childIds: new Set(),
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

    getChildContainers(): readonly InspectorWithSubscription[] {
      // Get child containers from the container's internal state
      // This dynamically discovers children that have been wrapped with InspectorPlugin
      const internalState = container[INTERNAL_ACCESS]();
      const children: InspectorWithSubscription[] = [];

      for (const childState of internalState.childContainers) {
        // First try to get API from registry (faster lookup)
        let childApi = apiRegistry.get(childState.containerId);

        // If not in registry, try to access INSPECTOR from the enhanced wrapper.
        // The parent's childContainers array stores the original (raw) wrapper,
        // but createChild() auto-inherits plugins and creates a NEW enhanced wrapper with INSPECTOR.
        // Use getEnhancedWrapper() to find the enhanced wrapper from the original.
        if (childApi === undefined && childState.wrapper !== undefined) {
          // Get the enhanced wrapper (or original if not enhanced)
          const wrapper = getEnhancedWrapper(childState.wrapper as EnhanceableContainer);

          if (wrapper !== null && typeof wrapper === "object" && INSPECTOR in wrapper) {
            childApi = (wrapper as { [INSPECTOR]: InspectorWithSubscription })[INSPECTOR];
            // Register for future lookups
            if (childApi !== undefined) {
              apiRegistry.set(childState.containerId, childApi);
            }
          }
        }

        if (childApi !== undefined && !childApi.isDisposed) {
          children.push(childApi);
        }
      }
      return Object.freeze(children);
    },

    getAdapterInfo() {
      // Extract adapter information for graph visualization
      const internalState = container[INTERNAL_ACCESS]();
      const result: Array<{
        readonly portName: string;
        readonly lifetime: "singleton" | "scoped" | "transient";
        readonly factoryKind: "sync" | "async";
        readonly dependencyNames: readonly string[];
      }> = [];

      for (const [, info] of internalState.adapterMap) {
        result.push({
          portName: info.portName,
          lifetime: info.lifetime,
          factoryKind: info.factoryKind,
          dependencyNames: Object.freeze([...info.dependencyNames]),
        });
      }

      return Object.freeze(result);
    },

    getGraphData(): ContainerGraphData {
      const internalState = container[INTERNAL_ACCESS]();
      const snapshot = coreInspector.getSnapshot();

      // Determine container kind
      const kind = snapshot.kind === "scope" ? "root" : snapshot.kind;

      // Build visualizable adapters with origin information
      const adapters: VisualizableAdapter[] = [];

      // Get inheritance modes if this is a child container
      const inheritanceModes = internalState.inheritanceModes;

      // Build a set of parent port names for inheritance detection
      const parentPortNames = new Set<string>();
      if (internalState.parentState !== undefined) {
        for (const [, parentInfo] of internalState.parentState.adapterMap) {
          parentPortNames.add(parentInfo.portName);
        }
      }

      for (const [, info] of internalState.adapterMap) {
        // Check if this port is an override using the isOverride method
        const isOverride = internalState.isOverride(info.portName);

        // Determine origin:
        // - If isOverride is true, origin is "overridden"
        // - If port exists in parent and not overridden, it's "inherited"
        // - Otherwise, it's "own" (new port in this container)
        let origin: ServiceOrigin;
        if (isOverride) {
          origin = "overridden";
        } else if (internalState.parentState !== undefined && parentPortNames.has(info.portName)) {
          origin = "inherited";
        } else {
          origin = "own";
        }

        const adapter: VisualizableAdapter = {
          portName: info.portName,
          lifetime: info.lifetime,
          factoryKind: info.factoryKind,
          dependencyNames: Object.freeze([...info.dependencyNames]),
          origin,
          inheritanceMode:
            origin === "inherited" && inheritanceModes !== undefined
              ? inheritanceModes.get(info.portName)
              : undefined,
          isOverride: isOverride ? true : undefined,
        };

        adapters.push(adapter);
      }

      // Get parent name from snapshot if available
      let parentName: string | null = null;
      if (snapshot.kind === "child") {
        // For child containers, try to get parent's name from parent state
        if (internalState.parentState !== undefined) {
          parentName = internalState.parentState.containerName;
        }
      }

      return Object.freeze({
        adapters: Object.freeze(adapters),
        containerName: internalState.containerName,
        kind,
        parentName,
      });
    },
  };

  // Register API for child container discovery
  apiRegistry.set(containerId, api);

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
 * import { createContainer, InspectorPlugin, INSPECTOR } from '@hex-di/runtime';
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
      state.childIds.clear();
      containerRegistry.delete(containerId);
      apiRegistry.delete(containerId);
    });

    return createInspectorAPI(container, containerId);
  },

  createApiForChild(
    childContainer: InternalAccessible,
    _parentApi: InspectorWithSubscription,
    parentContainer: InternalAccessible
  ): InspectorWithSubscription {
    const childId = childContainer[INTERNAL_ACCESS]().containerId;
    const _parentId = parentContainer[INTERNAL_ACCESS]().containerId;

    // Track parent-child relationship
    const parentState = containerStates.get(parentContainer);
    if (parentState !== undefined) {
      parentState.childIds.add(childId);
    }

    return createInspectorAPI(childContainer, childId);
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

    onChildCreated(info) {
      // Emit child-created event to the parent container's listeners
      emitToContainer(info.parentId, {
        type: "child-created",
        childId: info.id,
        childKind: info.kind,
      });
      emitToContainer(info.parentId, { type: "snapshot-changed" });
    },

    onContainerDisposed(info) {
      // Emit child-disposed event to parent if this is a child container
      if (info.parentId !== null) {
        emitToContainer(info.parentId, {
          type: "child-disposed",
          childId: info.id,
        });
        emitToContainer(info.parentId, { type: "snapshot-changed" });

        // Clean up parent's child tracking
        const parentRef = containerRegistry.get(info.parentId);
        if (parentRef !== undefined) {
          const parent = parentRef.deref();
          if (parent !== undefined) {
            const parentState = containerStates.get(parent);
            if (parentState !== undefined) {
              parentState.childIds.delete(info.id);
            }
          }
        }
      }

      // Clean up this container's registries
      apiRegistry.delete(info.id);
    },
  } satisfies PluginHooks,
});
