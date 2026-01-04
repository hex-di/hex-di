/**
 * React Hooks for DevTools Zustand Store
 *
 * Provides React integration for the DevTools Zustand store.
 * Uses useStore from zustand for optimal re-render behavior.
 *
 * Architecture:
 * - DevToolsStoreProvider wraps app with store context
 * - useDevToolsStore hook provides selector-based access
 * - Plugins are provided via a separate immutable context
 * - Specialized hooks for common use cases
 *
 * @packageDocumentation
 */

import React, {
  createContext,
  useContext,
  useRef,
  useMemo,
  type ReactNode,
  type ReactElement,
} from "react";
import {
  DevToolsContext,
  type DevToolsFlowRuntimeLike,
} from "../react/context/devtools-context.js";
import { useStore, type StoreApi } from "zustand";
import type { InspectorWithSubscription } from "@hex-di/runtime";
import type { DevToolsFlowRuntime } from "../runtime/devtools-flow-runtime.js";
import type { DevToolsPlugin } from "../runtime/plugin-types.js";
import {
  createDevToolsStoreWithRuntime,
  type DevToolsStore,
  type DevToolsStoreState,
  type DevToolsStoreWithRuntime,
  selectFirstSelectedId,
} from "./devtools-store.js";
import { defaultPlugins } from "../plugins/presets.js";

// =============================================================================
// Store Context
// =============================================================================

/**
 * React context for the DevTools store.
 * Holds the Zustand store API, not the state itself.
 */
const DevToolsStoreContext = createContext<DevToolsStoreWithRuntime | null>(null);

// =============================================================================
// Plugins Context
// =============================================================================

/**
 * React context for DevTools plugins.
 * Plugins are immutable and provided separately from the store.
 * This enables components to access plugins without triggering
 * re-renders on store state changes.
 */
const DevToolsPluginsContext = createContext<readonly DevToolsPlugin[]>([]);

// =============================================================================
// Provider
// =============================================================================

/**
 * Props for DevToolsStoreProvider.
 */
export interface DevToolsStoreProviderProps {
  /** The root inspector for the container hierarchy */
  readonly inspector: InspectorWithSubscription;
  /** DevTools plugins to use. Defaults to defaultPlugins() */
  readonly plugins?: readonly DevToolsPlugin[];
  /** Initial active tab. Defaults to "graph" */
  readonly initialTab?: string;
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
  plugins,
  initialTab,
  children,
}: DevToolsStoreProviderProps): ReactElement {
  // Use ref to keep store stable across re-renders and Strict Mode cycles
  const storeRef = useRef<DevToolsStoreWithRuntime | null>(null);
  const inspectorRef = useRef(inspector);
  const initialTabAppliedRef = useRef(false);

  // Memoize plugins - use defaultPlugins() if not provided
  // Plugins are immutable after creation
  const pluginsToUse = useMemo(() => plugins ?? defaultPlugins(), [plugins]);

  // Recreate store if inspector changed (rare, but handle it)
  if (inspectorRef.current !== inspector) {
    if (storeRef.current !== null) {
      // Dispose old store asynchronously
      const oldStore = storeRef.current;
      void oldStore.getState().dispose();
    }
    storeRef.current = null;
    inspectorRef.current = inspector;
    initialTabAppliedRef.current = false;
  }

  // Create store if not exists
  if (storeRef.current === null) {
    storeRef.current = createDevToolsStoreWithRuntime({ inspector });
  }

  // Apply initialTab if specified and not yet applied
  if (initialTab !== undefined && !initialTabAppliedRef.current) {
    initialTabAppliedRef.current = true;
    storeRef.current.getState().selectTab(initialTab);
  }

  // Provider hierarchy:
  // - DevToolsStoreContext: The Zustand store with FSM runtime access via store.getRuntime()
  // - DevToolsPluginsContext: Immutable plugins array for tab configuration
  //
  // Note: DevToolsContext is NOT provided here. Hooks that need FSM runtime access
  // should use useDevToolsFlowRuntime() which gets the runtime from the store context.
  // This consolidates all context access through the store.
  return (
    <DevToolsStoreContext.Provider value={storeRef.current}>
      <DevToolsPluginsContext.Provider value={pluginsToUse}>
        {children}
      </DevToolsPluginsContext.Provider>
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
// Runtime Access Hooks
// =============================================================================

/**
 * Internal hook to get the FSM runtime from the store context.
 *
 * This hook is used internally by other hooks that need to subscribe to the
 * FSM runtime using useSyncExternalStore. It provides the runtime's subscribe
 * and getSnapshot methods for React 18 compatibility.
 *
 * For backward compatibility, this hook also checks the legacy DevToolsContext
 * if no store context is found. This allows existing code using DevToolsProvider
 * to continue working.
 *
 * @internal
 * @throws Error if used outside DevToolsStoreProvider or DevToolsProvider
 */
export function useRuntimeFromStoreContext(): DevToolsFlowRuntimeLike {
  const store = useContext(DevToolsStoreContext);
  const legacyRuntime = useContext(DevToolsContext);

  // Primary path: use store context
  if (store !== null) {
    const runtime = store.getRuntime();

    if (runtime === null) {
      throw new Error("DevTools runtime has been disposed.");
    }

    return runtime;
  }

  // Fallback: use legacy DevToolsContext for backward compatibility
  if (legacyRuntime !== null) {
    return legacyRuntime;
  }

  // No context found
  throw new Error(
    "This hook must be used within a DevToolsStoreProvider. " +
      "Wrap your component tree with <DevToolsStoreProvider inspector={inspector}>."
  );
}

/**
 * Hook to access the underlying DevToolsFlowRuntime.
 *
 * This is an escape hatch for advanced use cases that need direct runtime access,
 * such as building merged graphs via getAncestorChain() or getInspector().
 *
 * For backward compatibility, this hook also checks the legacy DevToolsContext
 * if no store context is found.
 *
 * @returns The DevToolsFlowRuntimeLike, or null if disposed/not available
 * @throws Error if used outside DevToolsStoreProvider or DevToolsProvider
 *
 * @example
 * ```tsx
 * function GraphBuilder() {
 *   const runtime = useDevToolsFlowRuntime();
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
export function useDevToolsFlowRuntime(): DevToolsFlowRuntimeLike | null {
  const store = useContext(DevToolsStoreContext);
  const legacyRuntime = useContext(DevToolsContext);

  // Primary path: use store context
  if (store !== null) {
    return store.getRuntime();
  }

  // Fallback: use legacy DevToolsContext for backward compatibility
  if (legacyRuntime !== null) {
    return legacyRuntime;
  }

  // No context found
  throw new Error("useDevToolsFlowRuntime must be used within a DevToolsStoreProvider.");
}

/**
 * Optional version of useDevToolsFlowRuntime that returns null when no provider is available.
 *
 * Use this hook when the component should gracefully handle being outside a provider context.
 * This is useful for optional UI components that may or may not have DevTools available.
 *
 * @returns The DevToolsFlowRuntimeLike, or null if no provider/disposed
 *
 * @example
 * ```tsx
 * function OptionalDevToolsInfo() {
 *   const runtime = useDevToolsFlowRuntimeOptional();
 *
 *   if (!runtime) {
 *     return null; // No DevTools available
 *   }
 *
 *   return <DevToolsPanel runtime={runtime} />;
 * }
 * ```
 */
export function useDevToolsFlowRuntimeOptional(): DevToolsFlowRuntimeLike | null {
  const store = useContext(DevToolsStoreContext);
  const legacyRuntime = useContext(DevToolsContext);

  // Primary path: use store context
  if (store !== null) {
    return store.getRuntime();
  }

  // Fallback: use legacy DevToolsContext for backward compatibility
  if (legacyRuntime !== null) {
    return legacyRuntime;
  }

  // No context found - return null instead of throwing
  return null;
}

/**
 * @deprecated Use `useDevToolsFlowRuntime()` instead.
 * This alias exists for backward compatibility but will be removed in a future version.
 *
 * Note: This hook returns `DevToolsFlowRuntime | null`, NOT `DevToolsSnapshot`.
 * For the FSM snapshot, use `useDevToolsSnapshot()` from `@hex-di/devtools/react`.
 */
export const useDevToolsRuntime = useDevToolsFlowRuntime;

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
// Plugin Hooks
// =============================================================================

/**
 * Tab configuration for navigation.
 */
export interface TabConfig {
  /** Unique tab identifier */
  readonly id: string;
  /** Tab display label */
  readonly label: string;
  /** Optional tab icon */
  readonly icon?: React.ReactElement;
}

/**
 * Hook to get the DevTools plugins array.
 *
 * Plugins are immutable and provided via DevToolsStoreProvider.
 * This hook does not cause re-renders on store state changes.
 *
 * @returns Array of registered plugins
 */
export function usePlugins(): readonly DevToolsPlugin[] {
  return useContext(DevToolsPluginsContext);
}

/**
 * Hook to get the active plugin based on activeTab.
 *
 * Combines plugins from context with activeTab from store.
 *
 * @returns The active plugin, or undefined if not found
 */
export function useActivePlugin(): DevToolsPlugin | undefined {
  const plugins = usePlugins();
  const activeTab = useActiveTab();
  return plugins.find(p => p.id === activeTab);
}

/**
 * Hook to get tab configuration for navigation.
 *
 * @returns Array of tab configs
 */
export function useTabList(): readonly TabConfig[] {
  const plugins = usePlugins();
  return useMemo(
    () =>
      plugins.map(p => ({
        id: p.id,
        label: p.label,
        icon: p.icon,
      })),
    [plugins]
  );
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
