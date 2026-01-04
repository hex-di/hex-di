/**
 * React Hooks for DevTools Zustand Store
 *
 * Provides React integration for the DevTools Zustand store.
 * Uses useStore from zustand for optimal re-render behavior.
 *
 * Architecture:
 * - DevToolsStoreProvider wraps app with store context
 * - useDevToolsStore hook provides selector-based access
 * - Specialized hooks for common use cases
 *
 * @packageDocumentation
 */

import { createContext, useContext, useRef, type ReactNode, type ReactElement } from "react";
import { useStore, type StoreApi } from "zustand";
import type { InspectorWithSubscription } from "@hex-di/runtime";
import type { DevToolsFlowRuntime } from "../runtime/devtools-flow-runtime.js";
import {
  createDevToolsStoreWithRuntime,
  type DevToolsStore,
  type DevToolsStoreState,
  type DevToolsStoreWithRuntime,
  selectFirstSelectedId,
} from "./devtools-store.js";
import { DevToolsContext } from "../react/context/devtools-context.js";

// =============================================================================
// Store Context
// =============================================================================

/**
 * React context for the DevTools store.
 * Holds the Zustand store API, not the state itself.
 */
const DevToolsStoreContext = createContext<DevToolsStoreWithRuntime | null>(null);

// =============================================================================
// Provider
// =============================================================================

/**
 * Props for DevToolsStoreProvider.
 */
export interface DevToolsStoreProviderProps {
  /** The root inspector for the container hierarchy */
  readonly inspector: InspectorWithSubscription;
  /** Child components */
  readonly children: ReactNode;
}

/**
 * Provider component that creates and provides the DevTools store.
 *
 * Creates the Zustand store with FSM runtime on mount and provides it
 * to child components via context. The store is stable across re-renders
 * and survives React Strict Mode double-render cycles.
 *
 * @param props - Provider props
 * @returns Provider element wrapping children
 *
 * @example
 * ```tsx
 * function App() {
 *   // Get inspector from container enhanced with InspectorPlugin
 *   const inspector = container[INSPECTOR];
 *
 *   return (
 *     <DevToolsStoreProvider inspector={inspector}>
 *       <HexDiDevTools />
 *     </DevToolsStoreProvider>
 *   );
 * }
 * ```
 */
export function DevToolsStoreProvider({
  inspector,
  children,
}: DevToolsStoreProviderProps): ReactElement {
  // Use ref to keep store stable across re-renders and Strict Mode cycles
  const storeRef = useRef<DevToolsStoreWithRuntime | null>(null);
  const inspectorRef = useRef(inspector);

  // Recreate store if inspector changed (rare, but handle it)
  if (inspectorRef.current !== inspector) {
    if (storeRef.current !== null) {
      // Dispose old store asynchronously
      const oldStore = storeRef.current;
      void oldStore.getState().dispose();
    }
    storeRef.current = null;
    inspectorRef.current = inspector;
  }

  // Create store if not exists
  if (storeRef.current === null) {
    storeRef.current = createDevToolsStoreWithRuntime({ inspector });
  }

  // Get the underlying FSM runtime from the store
  // This is needed for hooks like useContainerScopeTreeOptional that use DevToolsContext
  const fsmRuntime = storeRef.current.getRuntime();

  return (
    <DevToolsStoreContext.Provider value={storeRef.current}>
      <DevToolsContext.Provider value={fsmRuntime}>{children}</DevToolsContext.Provider>
    </DevToolsStoreContext.Provider>
  );
}

// =============================================================================
// Store Hook
// =============================================================================

/**
 * Hook to access the DevTools Zustand store with a selector.
 *
 * Uses Zustand's useStore for optimal re-render behavior - components
 * only re-render when the selected slice of state changes.
 *
 * @param selector - Function to select state slice
 * @returns Selected state slice
 * @throws Error if used outside DevToolsStoreProvider
 *
 * @example
 * ```tsx
 * function ContainerList() {
 *   // Only re-renders when containers change
 *   const containers = useDevToolsStore((state) => state.containerTree.containers);
 *
 *   return (
 *     <ul>
 *       {containers.map((c) => (
 *         <li key={c.id}>{c.label}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function DevToolsToggle() {
 *   // Select both state and action
 *   const isOpen = useDevToolsStore((state) => state.ui.isOpen);
 *   const toggle = useDevToolsStore((state) => state.toggle);
 *
 *   return (
 *     <button onClick={toggle}>
 *       {isOpen ? 'Close' : 'Open'} DevTools
 *     </button>
 *   );
 * }
 * ```
 */
export function useDevToolsStore<T>(selector: (state: DevToolsStore) => T): T {
  const store = useContext(DevToolsStoreContext);

  if (store === null) {
    throw new Error(
      "useDevToolsStore must be used within a DevToolsStoreProvider. " +
        "Wrap your component tree with <DevToolsStoreProvider inspector={inspector}>."
    );
  }

  return useStore(store, selector);
}

// =============================================================================
// Store API Hook
// =============================================================================

/**
 * Hook to access the raw Zustand store API.
 *
 * Use this for advanced scenarios where you need direct store access,
 * such as subscribing outside of React components.
 *
 * @returns The Zustand store API
 * @throws Error if used outside DevToolsStoreProvider
 */
export function useDevToolsStoreApi(): StoreApi<DevToolsStore> {
  const store = useContext(DevToolsStoreContext);

  if (store === null) {
    throw new Error("useDevToolsStoreApi must be used within a DevToolsStoreProvider.");
  }

  return store;
}

// =============================================================================
// Runtime Access Hook
// =============================================================================

/**
 * Hook to access the underlying DevToolsFlowRuntime.
 *
 * This is an escape hatch for advanced use cases that need direct runtime access,
 * such as building merged graphs via getAncestorChain() or getInspector().
 *
 * @returns The DevToolsFlowRuntime, or null if disposed
 * @throws Error if used outside DevToolsStoreProvider
 *
 * @example
 * ```tsx
 * function GraphBuilder() {
 *   const runtime = useDevToolsRuntime();
 *   const selectedId = useDevToolsStore(selectFirstSelectedId);
 *
 *   const graph = useMemo(() => {
 *     if (!runtime || !selectedId) return null;
 *
 *     const chain = runtime.getAncestorChain(selectedId);
 *     // Build merged graph from chain...
 *   }, [runtime, selectedId]);
 *
 *   return <GraphVisualization graph={graph} />;
 * }
 * ```
 */
export function useDevToolsRuntime(): DevToolsFlowRuntime | null {
  const store = useContext(DevToolsStoreContext);

  if (store === null) {
    throw new Error("useDevToolsRuntime must be used within a DevToolsStoreProvider.");
  }

  // Access runtime via the extended store
  return store.getRuntime();
}

// =============================================================================
// Specialized Hooks
// =============================================================================

/**
 * Hook to get UI-related state.
 *
 * @returns UI state slice
 */
export function useDevToolsUI(): DevToolsStoreState["ui"] {
  return useDevToolsStore(state => state.ui);
}

/**
 * Hook to get container tree state.
 *
 * @returns Container tree state slice
 */
export function useContainerTree(): DevToolsStoreState["containerTree"] {
  return useDevToolsStore(state => state.containerTree);
}

/**
 * Hook to get tracing state.
 *
 * @returns Tracing state slice
 */
export function useTracingState(): DevToolsStoreState["tracing"] {
  return useDevToolsStore(state => state.tracing);
}

/**
 * Hook to get the first selected container ID.
 *
 * @returns First selected container ID, or null if none selected
 */
export function useSelectedContainerId(): string | null {
  return useDevToolsStore(selectFirstSelectedId);
}

/**
 * Hook to get discovered containers.
 *
 * @returns Array of discovered containers
 */
export function useContainers(): DevToolsStoreState["containerTree"]["containers"] {
  return useDevToolsStore(state => state.containerTree.containers);
}

/**
 * Hook to check if DevTools panel is open.
 *
 * @returns Whether panel is open
 */
export function useIsDevToolsOpen(): boolean {
  return useDevToolsStore(state => state.ui.isOpen);
}

/**
 * Hook to get the active tab.
 *
 * @returns Active tab name
 */
export function useActiveTab(): string {
  return useDevToolsStore(state => state.ui.activeTab);
}

// =============================================================================
// Action Hooks
// =============================================================================

/**
 * Hook to get UI action functions.
 *
 * Returns an object with all UI-related actions.
 * The returned object is referentially stable (actions don't change).
 *
 * @returns Object with UI actions
 *
 * @example
 * ```tsx
 * function DevToolsControls() {
 *   const { open, close, toggle, selectTab, selectContainer } = useDevToolsActions();
 *
 *   return (
 *     <div>
 *       <button onClick={toggle}>Toggle</button>
 *       <button onClick={() => selectTab('graph')}>Graph Tab</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDevToolsActions(): Pick<
  DevToolsStore,
  | "open"
  | "close"
  | "toggle"
  | "selectTab"
  | "selectContainer"
  | "toggleContainer"
  | "expandContainer"
  | "collapseContainer"
  | "discover"
> {
  return useDevToolsStore(state => ({
    open: state.open,
    close: state.close,
    toggle: state.toggle,
    selectTab: state.selectTab,
    selectContainer: state.selectContainer,
    toggleContainer: state.toggleContainer,
    expandContainer: state.expandContainer,
    collapseContainer: state.collapseContainer,
    discover: state.discover,
  }));
}

/**
 * Hook to get tracing action functions.
 *
 * @returns Object with tracing actions
 */
export function useTracingActions(): Pick<
  DevToolsStore,
  | "enableTracing"
  | "disableTracing"
  | "startTracing"
  | "pauseTracing"
  | "resumeTracing"
  | "stopTracing"
  | "clearTraces"
> {
  return useDevToolsStore(state => ({
    enableTracing: state.enableTracing,
    disableTracing: state.disableTracing,
    startTracing: state.startTracing,
    pauseTracing: state.pauseTracing,
    resumeTracing: state.resumeTracing,
    stopTracing: state.stopTracing,
    clearTraces: state.clearTraces,
  }));
}

// =============================================================================
// Re-exports
// =============================================================================

export { selectFirstSelectedId } from "./devtools-store.js";
export type {
  DevToolsStore,
  DevToolsStoreState,
  UIState,
  ContainerTreeState,
  TracingState,
} from "./devtools-store.js";
