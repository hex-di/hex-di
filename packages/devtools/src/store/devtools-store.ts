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
import type { InspectorAPI } from "@hex-di/core";
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
import type { DevToolsSnapshot, DevToolsFlowEvent } from "../runtime/devtools-snapshot.js";

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
 *
 * Note: `isEnabled` and `isTracing` are derived from `fsmState` at subscription time.
 * There may be a brief timing gap (one microtask) between FSM state transition
 * and store update where these derived booleans could be stale. For critical
 * logic that requires precise state, use `fsmState` directly.
 */
export interface TracingState {
  /** FSM state for tracing machine */
  readonly fsmState: FSMTracingState;
  /** Whether tracing is enabled (derived: fsmState !== "disabled") */
  readonly isEnabled: boolean;
  /** Whether actively tracing (derived: fsmState === "tracing") */
  readonly isTracing: boolean;
  /** Collected traces */
  readonly traces: readonly unknown[];
  /**
   * Threshold in milliseconds for marking resolutions as "slow".
   * This is UI configuration stored in the Zustand layer, not in the FSM.
   * Resolutions taking longer than this threshold are highlighted in the UI.
   * @default 100
   */
  readonly slowThreshold: number;
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
  /** Select multiple containers by IDs */
  selectContainers: (ids: ReadonlySet<string>) => void;
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
  /**
   * Set the slow resolution threshold in milliseconds.
   * Resolutions taking longer than this are highlighted in the UI.
   * @param threshold - Threshold in milliseconds (must be > 0)
   */
  setSlowThreshold: (threshold: number) => void;

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
 * State fields managed by the store, not derived from FSM.
 * These are preserved during FSM-derived state updates.
 */
interface StoreOnlyState {
  /** Slow resolution threshold in milliseconds */
  readonly slowThreshold: number;
}

/**
 * Derives store state from FSM snapshot, preserving store-only state.
 *
 * @param snapshot - FSM snapshot
 * @param storeOnly - Store-only state to preserve
 * @returns Derived state (excluding isInitialized and isDisposed)
 */
function deriveStateFromSnapshot(
  snapshot: DevToolsSnapshot,
  storeOnly: StoreOnlyState
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
      slowThreshold: storeOnly.slowThreshold,
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
      slowThreshold: 100,
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
 *
 * The runtime is now injected rather than created internally.
 * This enables proper runtime access via getRuntime() and follows
 * the Inversion of Control principle.
 */
export interface CreateDevToolsStoreConfig {
  /**
   * The DevToolsFlowRuntime to use for this store.
   * Create it first using createDevToolsFlowRuntime({ inspector }).
   */
  readonly runtime: DevToolsFlowRuntime;
}

/**
 * Creates a DevTools Zustand store.
 *
 * The store acts as a facade between React and the DevToolsFlowRuntime:
 * - Subscribes to FSM state changes and updates Zustand state
 * - Provides actions that delegate to FSM dispatch
 * - Handles lifecycle (initialization, disposal)
 *
 * @param config - Store configuration with injected runtime
 * @returns Zustand store API
 *
 * @example
 * ```typescript
 * // Create runtime first, then store
 * const runtime = createDevToolsFlowRuntime({ inspector });
 * const store = createDevToolsStore({ runtime });
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
  // Runtime is now injected via config
  const context: StoreContext = {
    runtime: config.runtime,
    unsubscribe: null,
  };

  const store = createStore<DevToolsStore>((set, get) => {
    // -------------------------------------------------------------------------
    // Subscribe to Injected Runtime
    // -------------------------------------------------------------------------
    const initializeSubscription = (): void => {
      if (context.runtime === null) {
        console.warn("[DevToolsStore] No runtime provided - store will not receive updates");
        return;
      }

      if (context.unsubscribe !== null) {
        return; // Already subscribed
      }

      // Subscribe to FSM state changes
      context.unsubscribe = context.runtime.subscribe(() => {
        if (context.runtime === null || context.runtime.isDisposed) {
          return;
        }

        // Defer state update to avoid React anti-pattern:
        // "Cannot update a component while rendering a different component"
        // The synchronous chain from usePort() → InspectorPlugin hooks →
        // FSM → this callback can trigger during another component's render.
        //
        // TIMING NOTE: This creates a one-microtask gap between when FSM state
        // changes and when Zustand store state updates. During this gap:
        // - FSM has the new state (accessible via runtime.getSnapshot())
        // - Store still has the previous state
        // Components reading from both sources may see temporarily inconsistent
        // views. This is acceptable for DevTools UI but should be documented
        // for plugin authors who need strict consistency.
        queueMicrotask(() => {
          if (context.runtime === null || context.runtime.isDisposed) {
            return; // Re-check after deferral
          }

          // Get latest FSM snapshot and derive store state
          // Preserve store-only state (not from FSM)
          const snapshot = context.runtime.getSnapshot();
          const currentState = get();
          const storeOnly: StoreOnlyState = {
            slowThreshold: currentState.tracing.slowThreshold,
          };
          const derivedState = deriveStateFromSnapshot(snapshot, storeOnly);

          set({
            ...derivedState,
            isInitialized: true,
            isDisposed: false,
          });
        });
      });

      // Set initial state from FSM
      // Use default slowThreshold for initial state
      const initialSnapshot = context.runtime.getSnapshot();
      const initialStoreOnly: StoreOnlyState = {
        slowThreshold: 100, // Default threshold
      };
      const initialDerivedState = deriveStateFromSnapshot(initialSnapshot, initialStoreOnly);

      set({
        ...initialDerivedState,
        isInitialized: true,
        isDisposed: false,
      });
    };

    // Initialize subscription immediately
    initializeSubscription();

    // -------------------------------------------------------------------------
    // Action Implementations
    // -------------------------------------------------------------------------

    /**
     * Safely dispatch to runtime with warning if runtime is unavailable.
     * Prevents silent failures when runtime is disposed or not yet initialized.
     */
    const safeDispatch = (action: string, event: DevToolsFlowEvent): void => {
      if (context.runtime === null) {
        console.warn(
          `[DevToolsStore] Cannot dispatch "${action}" - runtime is not available. ` +
            "This may happen if the store was disposed or not yet initialized."
        );
        return;
      }
      if (context.runtime.isDisposed) {
        console.warn(`[DevToolsStore] Cannot dispatch "${action}" - runtime has been disposed.`);
        return;
      }
      context.runtime.dispatch(event);
    };

    return {
      // Initial state
      ...getInitialState(),

      // UI Actions
      open: () => {
        safeDispatch("open", { type: "UI.OPEN" });
      },

      close: () => {
        safeDispatch("close", { type: "UI.CLOSE" });
      },

      toggle: () => {
        safeDispatch("toggle", { type: "UI.TOGGLE" });
      },

      selectTab: (tab: string) => {
        safeDispatch("selectTab", { type: "UI.SELECT_TAB", payload: { tab } });
      },

      selectContainer: (id: string) => {
        safeDispatch("selectContainer", { type: "UI.SELECT_CONTAINER", payload: { id } });
      },

      toggleContainer: (id: string) => {
        safeDispatch("toggleContainer", { type: "UI.TOGGLE_CONTAINER", payload: { id } });
      },

      selectContainers: (ids: ReadonlySet<string>) => {
        safeDispatch("selectContainers", { type: "UI.SELECTION_COMPLETE", payload: { ids } });
      },

      expandContainer: (id: string) => {
        safeDispatch("expandContainer", { type: "UI.EXPAND_CONTAINER", payload: { id } });
      },

      collapseContainer: (id: string) => {
        safeDispatch("collapseContainer", { type: "UI.COLLAPSE_CONTAINER", payload: { id } });
      },

      // Container Tree Actions
      discover: () => {
        safeDispatch("discover", { type: "CONTAINER_TREE.DISCOVER" });
      },

      // Tracing Actions
      enableTracing: () => {
        safeDispatch("enableTracing", { type: "TRACING.ENABLE" });
      },

      disableTracing: () => {
        safeDispatch("disableTracing", { type: "TRACING.DISABLE" });
      },

      startTracing: () => {
        safeDispatch("startTracing", { type: "TRACING.START" });
      },

      pauseTracing: () => {
        safeDispatch("pauseTracing", { type: "TRACING.PAUSE" });
      },

      resumeTracing: () => {
        safeDispatch("resumeTracing", { type: "TRACING.RESUME" });
      },

      stopTracing: () => {
        safeDispatch("stopTracing", { type: "TRACING.STOP" });
      },

      clearTraces: () => {
        safeDispatch("clearTraces", { type: "TRACING.CLEAR" });
      },

      setSlowThreshold: (threshold: number) => {
        // Validate threshold
        if (threshold <= 0) {
          console.warn(`[DevToolsStore] Invalid threshold ${threshold}ms - must be > 0. Ignoring.`);
          return;
        }

        // Store-only state - not dispatched to FSM
        set(state => ({
          ...state,
          tracing: {
            ...state.tracing,
            slowThreshold: threshold,
          },
        }));
      },

      // Lifecycle
      dispose: async () => {
        // IMPORTANT: Set isDisposed and nullify runtime SYNCHRONOUSLY first.
        // This ensures React StrictMode's immediate remount sees the disposed
        // state and creates a new store, rather than reusing the disposing store.
        //
        // Without this synchronous update, there's a race condition:
        // 1. StrictMode cleanup calls dispose()
        // 2. dispose() starts awaiting runtime.dispose()
        // 3. StrictMode remounts immediately (doesn't wait for async cleanup)
        // 4. storeRef.current !== null && !isDisposed, so old store is reused
        // 5. But context.runtime is about to become null, causing dispatch failures

        // Capture runtime reference before nullifying
        const runtimeToDispose = context.runtime;

        // Unsubscribe from FSM
        if (context.unsubscribe !== null) {
          context.unsubscribe();
          context.unsubscribe = null;
        }

        // Nullify runtime SYNCHRONOUSLY to prevent any new dispatches
        context.runtime = null;

        // Update state SYNCHRONOUSLY so isDisposed check works immediately
        set({
          ...getInitialState(),
          isInitialized: false,
          isDisposed: true,
        });

        // Now dispose the runtime asynchronously (cleanup resources)
        if (runtimeToDispose !== null) {
          await runtimeToDispose.dispose();
        }
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
 * NOTE: Only works with stores created via createDevToolsStoreWithRuntime().
 * Stores created via createDevToolsStore() do not expose runtime access.
 *
 * @param store - The DevTools store (must be DevToolsStoreWithRuntime)
 * @returns The underlying runtime, or null if not available or disposed
 *
 * @example
 * ```typescript
 * const store = createDevToolsStoreWithRuntime({ inspector });
 * const runtime = getStoreRuntime(store);
 * if (runtime) {
 *   const chain = runtime.getAncestorChain(containerId);
 *   // Build merged graph...
 * }
 * ```
 */
export function getStoreRuntime(store: StoreApi<DevToolsStore>): DevToolsFlowRuntime | null {
  // Check if store has getRuntime method (i.e., is DevToolsStoreWithRuntime)
  if ("getRuntime" in store && typeof store.getRuntime === "function") {
    return (store as DevToolsStoreWithRuntime).getRuntime();
  }
  // Store was created via createDevToolsStore() without runtime access
  return null;
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
 * Configuration for creating a DevTools store with runtime access.
 * Uses inspector to create the runtime internally.
 */
export interface CreateDevToolsStoreWithRuntimeConfig {
  /**
   * The root inspector for the container hierarchy.
   * Used to create the underlying DevToolsFlowRuntime.
   */
  readonly inspector: InspectorAPI;
}

/**
 * Creates a DevTools store with runtime access.
 *
 * This factory creates the DevToolsFlowRuntime internally and exposes it
 * via getRuntime() for advanced use cases like building merged graphs.
 *
 * Use this instead of createDevToolsStore() when you need runtime access.
 *
 * @param config - Store configuration with inspector
 * @returns Extended store with runtime access
 *
 * @example
 * ```typescript
 * const store = createDevToolsStoreWithRuntime({ inspector });
 *
 * // Access runtime for advanced operations
 * const runtime = store.getRuntime();
 * if (runtime) {
 *   const chain = runtime.getAncestorChain(containerId);
 * }
 *
 * // Cleanup
 * await store.getState().dispose();
 * ```
 */
export function createDevToolsStoreWithRuntime(
  config: CreateDevToolsStoreWithRuntimeConfig
): DevToolsStoreWithRuntime {
  // Create the runtime first (Inversion of Control)
  const runtime = createDevToolsFlowRuntime({ inspector: config.inspector });

  // Create the store with injected runtime
  const store = createDevToolsStore({ runtime });

  // Extend store with getRuntime() - now correctly returns the runtime
  const extendedStore: DevToolsStoreWithRuntime = Object.assign(store, {
    getRuntime: (): DevToolsFlowRuntime | null => {
      // Return null if disposed, otherwise return the captured runtime
      if (store.getState().isDisposed) {
        return null;
      }
      return runtime;
    },
  });

  return extendedStore;
}
