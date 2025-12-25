/**
 * InspectorPlugin - Plugin for container state inspection.
 *
 * Provides runtime state inspection via a hybrid push/pull API:
 * - Pull-based: getSnapshot(), getScopeTree(), listPorts(), isResolved()
 * - Push-based: subscribe() for real-time UI updates
 *
 * @packageDocumentation
 */

import {
  definePlugin,
  createInspector,
  type PluginContext,
  type PluginHooks,
} from "@hex-di/runtime";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import type { Port } from "@hex-di/ports";
import type { ContainerKind, ContainerPhase as TypedPhase, ScopeInfo } from "@hex-di/devtools-core";
import type { InspectorAPI, InspectorEvent, InspectorListener } from "./types.js";
import { INSPECTOR } from "./symbols.js";
import { detectContainerKind, detectPhase, buildTypedSnapshot } from "./helpers.js";

// =============================================================================
// Plugin State Types
// =============================================================================

/**
 * Internal state for the inspector plugin.
 * @internal
 */
interface InspectorState {
  /** Set of event listeners */
  readonly listeners: Set<InspectorListener>;
  /** Whether the container is disposed */
  isDisposed: boolean;
  /** Current container phase */
  phase: TypedPhase;
  /** Container kind (cached after first detection) */
  containerKind: ContainerKind | null;
  /** Bound container reference - uses minimal type for storage */
  containerRef: Container<
    Port<unknown, string>,
    Port<unknown, string>,
    Port<unknown, string>,
    ContainerPhase
  > | null;
}

// =============================================================================
// Plugin Factory
// =============================================================================

/**
 * Creates an InspectorPlugin instance.
 *
 * The plugin requires late-binding to the container after creation.
 * This is necessary because plugins are initialized before the container
 * is fully constructed.
 *
 * @returns An object containing the plugin and a bind function
 *
 * @example
 * ```typescript
 * import { createContainer } from '@hex-di/runtime';
 * import { createInspectorPlugin, INSPECTOR } from '@hex-di/inspector';
 *
 * // Create the inspector plugin
 * const { plugin: InspectorPlugin, bindContainer } = createInspectorPlugin();
 *
 * // Create container with the plugin
 * const container = createContainer(graph, {
 *   plugins: [InspectorPlugin],
 * });
 *
 * // Bind the container to enable inspection
 * bindContainer(container);
 *
 * // Now you can use the inspector API
 * const snapshot = container[INSPECTOR].getSnapshot();
 * ```
 */
export function createInspectorPlugin<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
>(): {
  readonly plugin: ReturnType<
    typeof definePlugin<typeof INSPECTOR, InspectorAPI, readonly [], readonly []>
  >;
  readonly bindContainer: (container: Container<TProvides, TExtends, TAsyncPorts, TPhase>) => void;
} {
  // Shared state across createApi and hooks
  const state: InspectorState = {
    listeners: new Set(),
    isDisposed: false,
    phase: "uninitialized",
    containerKind: null,
    containerRef: null,
  };

  /**
   * Emits an event to all listeners.
   */
  const emit = (event: InspectorEvent): void => {
    for (const listener of state.listeners) {
      try {
        listener(event);
      } catch {
        // Swallow listener errors to prevent affecting other listeners
      }
    }
  };

  /**
   * Ensures the container is bound before use.
   * Returns the container with the minimal type needed for inspection.
   */
  const ensureBound = (): Container<
    Port<unknown, string>,
    Port<unknown, string>,
    Port<unknown, string>,
    ContainerPhase
  > => {
    if (state.containerRef === null) {
      throw new Error(
        "InspectorPlugin not bound to container. " +
          "Call bindContainer(container) after createContainer()."
      );
    }
    return state.containerRef;
  };

  /**
   * Gets or detects the container kind.
   */
  const getContainerKind = (): ContainerKind => {
    if (state.containerKind === null) {
      state.containerKind = detectContainerKind(ensureBound());
    }
    return state.containerKind;
  };

  // Define the plugin hooks
  const hooks: PluginHooks = {
    afterResolve(ctx) {
      emit({
        type: "resolution",
        portName: ctx.portName,
        duration: ctx.duration,
        isCacheHit: ctx.isCacheHit,
      });
      emit({ type: "snapshot-changed" });
    },

    onScopeCreated(scope: ScopeInfo) {
      emit({ type: "scope-created", scope });
      emit({ type: "snapshot-changed" });
    },

    onScopeDisposed(scope: ScopeInfo) {
      emit({ type: "scope-disposed", scopeId: scope.id });
      emit({ type: "snapshot-changed" });
    },
  };

  // Create the plugin
  const plugin = definePlugin({
    name: "inspector",
    symbol: INSPECTOR,
    requires: [] as const,
    enhancedBy: [] as const,

    createApi(_context: PluginContext): InspectorAPI {
      // Create the InspectorAPI with lazy container access
      const api: InspectorAPI = {
        // Pull-based queries
        getSnapshot() {
          const container = ensureBound();
          const inspector = createInspector(container);
          const kind = getContainerKind();
          return buildTypedSnapshot(inspector.snapshot(), kind, container);
        },

        getScopeTree() {
          const container = ensureBound();
          const inspector = createInspector(container);
          return inspector.getScopeTree();
        },

        listPorts() {
          const container = ensureBound();
          const inspector = createInspector(container);
          return inspector.listPorts();
        },

        isResolved(portName: string) {
          const container = ensureBound();
          const inspector = createInspector(container);
          return inspector.isResolved(portName);
        },

        // Push-based subscriptions
        subscribe(listener: InspectorListener) {
          state.listeners.add(listener);
          return () => {
            state.listeners.delete(listener);
          };
        },

        // Container metadata
        getContainerKind() {
          return getContainerKind();
        },

        getPhase() {
          const container = ensureBound();
          const inspector = createInspector(container);
          const kind = getContainerKind();
          return detectPhase(container, inspector.snapshot(), kind);
        },

        get isDisposed() {
          return state.isDisposed;
        },
      };

      return Object.freeze(api);
    },

    hooks,

    dispose() {
      state.isDisposed = true;
      state.phase = "disposed";
      emit({ type: "phase-changed", phase: "disposed" });
      emit({ type: "snapshot-changed" });
      state.listeners.clear();
    },
  });

  // Bind function to be called after container creation
  const bindContainer = (container: Container<TProvides, TExtends, TAsyncPorts, TPhase>): void => {
    if (state.containerRef !== null) {
      throw new Error("InspectorPlugin already bound to a container.");
    }
    // Store with wider type - Container is covariant in TProvides
    state.containerRef = container as unknown as Container<
      Port<unknown, string>,
      Port<unknown, string>,
      Port<unknown, string>,
      ContainerPhase
    >;
    state.containerKind = detectContainerKind(container);
    state.phase = "initialized";
  };

  return {
    plugin,
    bindContainer,
  };
}
