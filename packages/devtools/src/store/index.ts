/**
 * DevTools Store Module
 *
 * Exports the Zustand store and React hooks for DevTools state management.
 *
 * @packageDocumentation
 */

// Store factory and types
export {
  createDevToolsStore,
  createDevToolsStoreWithRuntime,
  selectFirstSelectedId,
  selectIsContainerSelected,
  selectIsContainerExpanded,
  selectContainerById,
  selectIsContainerTreeReady,
  type CreateDevToolsStoreConfig,
  type DevToolsStore,
  type DevToolsStoreState,
  type DevToolsStoreActions,
  type DevToolsStoreWithRuntime,
  type UIState,
  type ContainerTreeState,
  type TracingState,
} from "./devtools-store.js";

// React hooks and provider
export {
  DevToolsStoreProvider,
  useDevToolsStore,
  useDevToolsStoreApi,
  // Internal hook for getting runtime from store context
  // Used by hooks that need FSM runtime access (useDevToolsSnapshot, useDevToolsSelector, etc.)
  useRuntimeFromStoreContext,
  // Primary runtime hook (renamed from useDevToolsRuntime to avoid conflict)
  useDevToolsFlowRuntime,
  // Optional version that returns null instead of throwing
  useDevToolsFlowRuntimeOptional,
  // Deprecated alias for backward compatibility
  useDevToolsRuntime,
  useDevToolsUI,
  useContainerTree,
  useTracingState,
  useSelectedContainerId,
  useContainers,
  useIsDevToolsOpen,
  useActiveTab,
  useDevToolsActions,
  useTracingActions,
  // Plugin hooks (new - consolidation from plugin-based runtime)
  usePlugins,
  useActivePlugin,
  useTabList,
  type DevToolsStoreProviderProps,
  type TabConfig,
} from "./use-devtools-store.js";
