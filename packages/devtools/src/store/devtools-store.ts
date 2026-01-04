/**
 * DevTools Zustand Store
 *
 * Facade layer between React components and the DevToolsFlowRuntime FSM.
 * Uses Zustand vanilla store for framework-agnostic state management,
 * with React hooks provided separately.
 *
 * Architecture:
 * - React Components -> Zustand Store (this file) -> DevToolsFlowRuntime -> FSM Machines
 * - State flows: FSM -> Zustand -> React (via subscription)
 * - Events flow: React -> Zustand actions -> FSM dispatch
 *
 * @packageDocumentation
 */

import { createStore, type StoreApi } from "zustand/vanilla";
import type { InspectorWithSubscription } from "@hex-di/runtime";
import type {
  ContainerTreeEntry,
  DevToolsUIState,
  TracingState as FSMTracingState,
  ContainerTreeState as FSMContainerTreeState,
  ContainerEntryMinimal,
} from "@hex-di/devtools-core";
import {
  DevToolsFlowRuntime,
  createDevToolsFlowRuntime,
} from "../runtime/devtools-flow-runtime.js";
import type { DevToolsSnapshot } from "../runtime/devtools-snapshot.js";

// =============================================================================
// Store State Types
// =============================================================================

/**
 * UI-related state derived from FSM.
 */
export interface UIState {
  /** Whether the DevTools panel is open */
  readonly isOpen: boolean;
  /** FSM state for UI machine */
  readonly fsmState: DevToolsUIState;
  /** Currently active tab */
  readonly activeTab: string;
  /** Set of selected container IDs */
  readonly selectedIds: ReadonlySet<string>;
  /** Set of expanded container IDs in tree view */
  readonly expandedContainers: ReadonlySet<string>;
  /** Registered containers for UI (minimal data for selection) */
  readonly registeredContainers: readonly ContainerEntryMinimal[];
}

/**
 * Container tree state derived from FSM.
 */
export interface ContainerTreeState {
  /** FSM state for container tree machine */
  readonly fsmState: FSMContainerTreeState;
  /** Discovered containers */
  readonly containers: readonly ContainerTreeEntry[];
  /** Discovery error if any */
  readonly error: Error | null;
}

/**
 * Tracing state derived from FSM.
 */
export interface TracingState {
  /** FSM state for tracing machine */
  readonly fsmState: FSMTracingState;
  /** Whether tracing is enabled */
  readonly isEnabled: boolean;
  /** Whether actively tracing */
  readonly isTracing: boolean;
  /** Collected traces */
  readonly traces: readonly unknown[];
}

/**
 * Complete DevTools store state.
 */
export interface DevToolsStoreState {
  /** UI-related state */
  readonly ui: UIState;
  /** Container tree state */
  readonly containerTree: ContainerTreeState;
  /** Tracing state */
  readonly tracing: TracingState;

  /** Whether the store has been initialized */
  readonly isInitialized: boolean;
  /** Whether the store has been disposed */
  readonly isDisposed: boolean;
}

/**
 * Store actions for dispatching events to FSM.
 */
export interface DevToolsStoreActions {
  // -------------------------------------------------------------------------
  // UI Actions
  // -------------------------------------------------------------------------
  /** Open the DevTools panel */
  open: () => void;
  /** Close the DevTools panel */
  close: () => void;
  /** Toggle the DevTools panel */
  toggle: () => void;
  /** Select a tab */
  selectTab: (tab: string) => void;
  /** Select a container by ID */
  selectContainer: (id: string) => void;
  /** Toggle container selection */
  toggleContainer: (id: string) => void;
  /** Expand a container in tree view */
  expandContainer: (id: string) => void;
  /** Collapse a container in tree view */
  collapseContainer: (id: string) => void;

  // -------------------------------------------------------------------------
  // Container Tree Actions
  // -------------------------------------------------------------------------
  /** Start container discovery */
  discover: () => void;

  // -------------------------------------------------------------------------
  // Tracing Actions
  // -------------------------------------------------------------------------
  /** Enable tracing */
  enableTracing: () => void;
  /** Disable tracing */
  disableTracing: () => void;
  /** Start trace recording */
  startTracing: () => void;
  /** Pause trace recording */
  pauseTracing: () => void;
  /** Resume trace recording */
  resumeTracing: () => void;
  /** Stop trace recording */
  stopTracing: () => void;
  /** Clear all traces */
  clearTraces: () => void;

  // -------------------------------------------------------------------------
  // Lifecycle Actions
  // -------------------------------------------------------------------------
  /** Dispose the store and underlying runtime */
  dispose: () => Promise<void>;
}

/**
 * Combined store type with state and actions.
 */
export type DevToolsStore = DevToolsStoreState & DevToolsStoreActions;

// =============================================================================
// Store Context (Runtime Reference)
// =============================================================================

/**
 * Internal context holding the runtime reference.
 * Not exposed in the store state to keep it serializable.
 */
interface StoreContext {
  runtime: DevToolsFlowRuntime | null;
  unsubscribe: (() => void) | null;
}

// =============================================================================
// State Derivation
// =============================================================================

/**
 * Derives store state from FSM snapshot.
 * Pure function - no side effects.
 */
function deriveStateFromSnapshot(
  snapshot: DevToolsSnapshot
): Omit<DevToolsStoreState, "isInitialized" | "isDisposed"> {
  return {
    ui: {
      isOpen:
        snapshot.ui.state === "open" ||
        snapshot.ui.state === "opening" ||
        snapshot.ui.state === "selecting",
      fsmState: snapshot.ui.state,
      activeTab: snapshot.ui.context.activeTab,
      selectedIds: snapshot.ui.context.selectedIds,
      expandedContainers: snapshot.ui.context.expandedContainers,
      registeredContainers: snapshot.ui.context.registeredContainers,
    },
    containerTree: {
      fsmState: snapshot.containerTree.state,
      containers: snapshot.containerTree.context.containers,
      error: snapshot.containerTree.context.error,
    },
    tracing: {
      fsmState: snapshot.tracing.state,
      isEnabled: snapshot.tracing.state !== "disabled",
      isTracing: snapshot.tracing.state === "tracing",
      traces: snapshot.tracing.context.traces,
    },
  };
}

/**
 * Initial state before runtime is connected.
 */
function getInitialState(): DevToolsStoreState {
  return {
    ui: {
      isOpen: false,
      fsmState: "closed",
      activeTab: "graph",
      selectedIds: new Set(),
      expandedContainers: new Set(),
      registeredContainers: [],
    },
    containerTree: {
      fsmState: "idle",
      containers: [],
      error: null,
    },
    tracing: {
      fsmState: "disabled",
      isEnabled: false,
      isTracing: false,
      traces: [],
    },
    isInitialized: false,
    isDisposed: false,
  };
}

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Configuration for creating a DevTools store.
 */
export interface CreateDevToolsStoreConfig {
  /**
   * The root inspector for the container hierarchy.
   * Used to create the underlying DevToolsFlowRuntime.
   */
  readonly inspector: InspectorWithSubscription;
}

/**
 * Creates a DevTools Zustand store.
 *
 * The store acts as a facade between React and the DevToolsFlowRuntime:
 * - Subscribes to FSM state changes and updates Zustand state
 * - Provides actions that delegate to FSM dispatch
 * - Handles lifecycle (initialization, disposal)
 *
 * @param config - Store configuration
 * @returns Zustand store API
 *
 * @example
 * ```typescript
 * // Create store with inspector
 * const store = createDevToolsStore({ inspector });
 *
 * // Subscribe to state changes (vanilla)
 * const unsubscribe = store.subscribe((state) => {
 *   console.log('UI open:', state.ui.isOpen);
 * });
 *
 * // Dispatch actions
 * store.getState().open();
 * store.getState().selectContainer('MyContainer');
 *
 * // Cleanup
 * await store.getState().dispose();
 * ```
 */
export function createDevToolsStore(config: CreateDevToolsStoreConfig): StoreApi<DevToolsStore> {
  // Context for runtime reference (not in state to keep it serializable)
  const context: StoreContext = {
    runtime: null,
    unsubscribe: null,
  };

  const store = createStore<DevToolsStore>((set, _get) => {
    // -------------------------------------------------------------------------
    // Initialize Runtime and Subscribe
    // -------------------------------------------------------------------------
    const initializeRuntime = (): void => {
      if (context.runtime !== null) {
        return; // Already initialized
      }

      // Create the FSM runtime
      context.runtime = createDevToolsFlowRuntime({
        inspector: config.inspector,
      });

      // Subscribe to FSM state changes
      context.unsubscribe = context.runtime.subscribe(() => {
        if (context.runtime === null || context.runtime.isDisposed) {
          return;
        }

        // Defer state update to avoid React anti-pattern:
        // "Cannot update a component while rendering a different component"
        // The synchronous chain from usePort() → InspectorPlugin hooks →
        // FSM → this callback can trigger during another component's render.
        queueMicrotask(() => {
          if (context.runtime === null || context.runtime.isDisposed) {
            return; // Re-check after deferral
          }

          // Get latest FSM snapshot and derive store state
          const snapshot = context.runtime.getSnapshot();
          const derivedState = deriveStateFromSnapshot(snapshot);

          set({
            ...derivedState,
            isInitialized: true,
            isDisposed: false,
          });
        });
      });

      // Set initial state from FSM
      const initialSnapshot = context.runtime.getSnapshot();
      const initialDerivedState = deriveStateFromSnapshot(initialSnapshot);

      set({
        ...initialDerivedState,
        isInitialized: true,
        isDisposed: false,
      });
    };

    // Initialize runtime immediately
    initializeRuntime();

    // -------------------------------------------------------------------------
    // Action Implementations
    // -------------------------------------------------------------------------
    return {
      // Initial state
      ...getInitialState(),

      // UI Actions
      open: () => {
        context.runtime?.dispatch({ type: "UI.OPEN" });
      },

      close: () => {
        context.runtime?.dispatch({ type: "UI.CLOSE" });
      },

      toggle: () => {
        context.runtime?.dispatch({ type: "UI.TOGGLE" });
      },

      selectTab: (tab: string) => {
        context.runtime?.dispatch({ type: "UI.SELECT_TAB", payload: { tab } });
      },

      selectContainer: (id: string) => {
        context.runtime?.dispatch({ type: "UI.SELECT_CONTAINER", payload: { id } });
      },

      toggleContainer: (id: string) => {
        context.runtime?.dispatch({ type: "UI.TOGGLE_CONTAINER", payload: { id } });
      },

      expandContainer: (id: string) => {
        context.runtime?.dispatch({ type: "UI.EXPAND_CONTAINER", payload: { id } });
      },

      collapseContainer: (id: string) => {
        context.runtime?.dispatch({ type: "UI.COLLAPSE_CONTAINER", payload: { id } });
      },

      // Container Tree Actions
      discover: () => {
        context.runtime?.dispatch({ type: "CONTAINER_TREE.DISCOVER" });
      },

      // Tracing Actions
      enableTracing: () => {
        context.runtime?.dispatch({ type: "TRACING.ENABLE" });
      },

      disableTracing: () => {
        context.runtime?.dispatch({ type: "TRACING.DISABLE" });
      },

      startTracing: () => {
        context.runtime?.dispatch({ type: "TRACING.START" });
      },

      pauseTracing: () => {
        context.runtime?.dispatch({ type: "TRACING.PAUSE" });
      },

      resumeTracing: () => {
        context.runtime?.dispatch({ type: "TRACING.RESUME" });
      },

      stopTracing: () => {
        context.runtime?.dispatch({ type: "TRACING.STOP" });
      },

      clearTraces: () => {
        context.runtime?.dispatch({ type: "TRACING.CLEAR" });
      },

      // Lifecycle
      dispose: async () => {
        // Unsubscribe from FSM
        if (context.unsubscribe !== null) {
          context.unsubscribe();
          context.unsubscribe = null;
        }

        // Dispose runtime
        if (context.runtime !== null) {
          await context.runtime.dispose();
          context.runtime = null;
        }

        // Update state
        set({
          ...getInitialState(),
          isInitialized: false,
          isDisposed: true,
        });
      },
    };
  });

  return store;
}

// =============================================================================
// Selectors
// =============================================================================

/**
 * Selector to get the first selected container ID.
 * Returns null if no container is selected.
 */
export function selectFirstSelectedId(state: DevToolsStoreState): string | null {
  const ids = Array.from(state.ui.selectedIds);
  return ids.length > 0 ? (ids[0] ?? null) : null;
}

/**
 * Selector to check if a specific container is selected.
 */
export function selectIsContainerSelected(state: DevToolsStoreState, containerId: string): boolean {
  return state.ui.selectedIds.has(containerId);
}

/**
 * Selector to check if a specific container is expanded.
 */
export function selectIsContainerExpanded(state: DevToolsStoreState, containerId: string): boolean {
  return state.ui.expandedContainers.has(containerId);
}

/**
 * Selector to get container by ID from discovered containers.
 */
export function selectContainerById(
  state: DevToolsStoreState,
  containerId: string
): ContainerTreeEntry | undefined {
  return state.containerTree.containers.find(c => c.id === containerId);
}

/**
 * Selector to check if container tree is ready.
 */
export function selectIsContainerTreeReady(state: DevToolsStoreState): boolean {
  return state.containerTree.fsmState === "ready";
}

// =============================================================================
// Runtime Access (for advanced use cases)
// =============================================================================

/**
 * Gets the underlying DevToolsFlowRuntime from a store.
 *
 * This is an escape hatch for advanced use cases that need direct runtime access,
 * such as building merged graphs via getAncestorChain().
 *
 * @param store - The DevTools store
 * @returns The underlying runtime, or null if disposed
 *
 * @example
 * ```typescript
 * const runtime = getStoreRuntime(store);
 * if (runtime) {
 *   const chain = runtime.getAncestorChain(containerId);
 *   // Build merged graph...
 * }
 * ```
 */
export function getStoreRuntime(_store: StoreApi<DevToolsStore>): DevToolsFlowRuntime | null {
  // Access runtime via closure - this is intentionally not in the public state
  // We need a way to expose it for graph building
  // The store factory sets this up in a closure, so we need to provide
  // an accessor mechanism
  return null; // Placeholder - will be implemented via store extension
}

// =============================================================================
// Store Extension for Runtime Access
// =============================================================================

/**
 * Extended store type that includes runtime access.
 */
export interface DevToolsStoreWithRuntime extends StoreApi<DevToolsStore> {
  /** Get the underlying DevToolsFlowRuntime */
  getRuntime: () => DevToolsFlowRuntime | null;
}

/**
 * Creates a DevTools store with runtime access.
 *
 * Same as createDevToolsStore but includes a getRuntime() method
 * for advanced use cases like building merged graphs.
 *
 * @param config - Store configuration
 * @returns Extended store with runtime access
 */
export function createDevToolsStoreWithRuntime(
  config: CreateDevToolsStoreConfig
): DevToolsStoreWithRuntime {
  // Context for runtime reference
  const context: StoreContext = {
    runtime: null,
    unsubscribe: null,
  };

  const store = createStore<DevToolsStore>(set => {
    // Initialize runtime
    context.runtime = createDevToolsFlowRuntime({
      inspector: config.inspector,
    });

    // Subscribe to FSM state changes
    context.unsubscribe = context.runtime.subscribe(() => {
      if (context.runtime === null || context.runtime.isDisposed) {
        return;
      }

      // Defer state update to avoid React anti-pattern:
      // "Cannot update a component while rendering a different component"
      queueMicrotask(() => {
        if (context.runtime === null || context.runtime.isDisposed) {
          return; // Re-check after deferral
        }

        const snapshot = context.runtime.getSnapshot();
        const derivedState = deriveStateFromSnapshot(snapshot);

        set({
          ...derivedState,
          isInitialized: true,
          isDisposed: false,
        });
      });
    });

    // Set initial state
    const initialSnapshot = context.runtime.getSnapshot();
    const initialDerivedState = deriveStateFromSnapshot(initialSnapshot);

    return {
      ...initialDerivedState,
      isInitialized: true,
      isDisposed: false,

      // Actions
      open: () => context.runtime?.dispatch({ type: "UI.OPEN" }),
      close: () => context.runtime?.dispatch({ type: "UI.CLOSE" }),
      toggle: () => context.runtime?.dispatch({ type: "UI.TOGGLE" }),
      selectTab: tab => context.runtime?.dispatch({ type: "UI.SELECT_TAB", payload: { tab } }),
      selectContainer: id =>
        context.runtime?.dispatch({ type: "UI.SELECT_CONTAINER", payload: { id } }),
      toggleContainer: id =>
        context.runtime?.dispatch({ type: "UI.TOGGLE_CONTAINER", payload: { id } }),
      expandContainer: id =>
        context.runtime?.dispatch({ type: "UI.EXPAND_CONTAINER", payload: { id } }),
      collapseContainer: id =>
        context.runtime?.dispatch({ type: "UI.COLLAPSE_CONTAINER", payload: { id } }),
      discover: () => context.runtime?.dispatch({ type: "CONTAINER_TREE.DISCOVER" }),
      enableTracing: () => context.runtime?.dispatch({ type: "TRACING.ENABLE" }),
      disableTracing: () => context.runtime?.dispatch({ type: "TRACING.DISABLE" }),
      startTracing: () => context.runtime?.dispatch({ type: "TRACING.START" }),
      pauseTracing: () => context.runtime?.dispatch({ type: "TRACING.PAUSE" }),
      resumeTracing: () => context.runtime?.dispatch({ type: "TRACING.RESUME" }),
      stopTracing: () => context.runtime?.dispatch({ type: "TRACING.STOP" }),
      clearTraces: () => context.runtime?.dispatch({ type: "TRACING.CLEAR" }),

      dispose: async () => {
        if (context.unsubscribe !== null) {
          context.unsubscribe();
          context.unsubscribe = null;
        }
        if (context.runtime !== null) {
          await context.runtime.dispose();
          context.runtime = null;
        }
        set({
          ...getInitialState(),
          isInitialized: false,
          isDisposed: true,
        });
      },
    };
  });

  // Extend store with runtime access
  return Object.assign(store, {
    getRuntime: () => context.runtime,
  });
}
