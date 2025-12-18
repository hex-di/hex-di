/**
 * DevToolsContext - React context for DevTools state and data.
 *
 * Provides shared state management and data source access to all
 * DevTools components through React context.
 *
 * @packageDocumentation
 */

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Port } from "@hex-di/ports";
import type { Graph } from "@hex-di/graph";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import {
  type DevToolsState,
  type DevToolsAction,
  initialState,
  devToolsReducer,
  actions,
  type TabId,
  type PanelPosition,
  type PanelSize,
  type LayoutDirection,
  GraphPresenter,
  TimelinePresenter,
  StatsPresenter,
  InspectorPresenter,
  PanelPresenter,
  type PresenterDataSourceContract,
  type GraphViewModel,
  type TimelineViewModel,
  type StatsViewModel,
  type InspectorViewModel,
  type PanelViewModel,
} from "@hex-di/devtools-ui";

// =============================================================================
// Context Types
// =============================================================================

/**
 * DevTools context value type.
 */
export interface DevToolsContextValue {
  /**
   * Current DevTools state.
   */
  readonly state: DevToolsState;

  /**
   * Dispatch an action to update state.
   */
  readonly dispatch: (action: DevToolsAction) => void;

  /**
   * Data source for accessing graph and tracing data.
   */
  readonly dataSource: PresenterDataSourceContract | null;

  /**
   * Presenters for computing view models.
   */
  readonly presenters: {
    readonly graph: GraphPresenter | null;
    readonly timeline: TimelinePresenter | null;
    readonly stats: StatsPresenter | null;
    readonly inspector: InspectorPresenter | null;
    readonly panel: PanelPresenter | null;
  };

  /**
   * Pre-computed view models (updated on data changes).
   */
  readonly viewModels: {
    readonly graph: GraphViewModel | null;
    readonly timeline: TimelineViewModel | null;
    readonly stats: StatsViewModel | null;
    readonly inspector: InspectorViewModel | null;
    readonly panel: PanelViewModel | null;
  };

  // ==========================================================================
  // Action Helpers
  // ==========================================================================

  /**
   * Set the active tab.
   */
  setActiveTab(tabId: TabId): void;

  /**
   * Toggle panel open/closed state.
   */
  togglePanel(): void;

  /**
   * Set panel open state.
   */
  setPanelOpen(isOpen: boolean): void;

  /**
   * Toggle fullscreen mode.
   */
  toggleFullscreen(): void;

  /**
   * Set panel position.
   */
  setPanelPosition(position: PanelPosition): void;

  /**
   * Set panel size.
   */
  setPanelSize(size: PanelSize): void;

  /**
   * Select a node in the graph.
   */
  selectNode(nodeId: string | null): void;

  /**
   * Highlight nodes in the graph.
   */
  highlightNodes(nodeIds: readonly string[]): void;

  /**
   * Set graph zoom level.
   */
  setZoom(zoom: number): void;

  /**
   * Set graph direction (TB/LR).
   */
  setGraphDirection(direction: LayoutDirection): void;

  /**
   * Select a trace entry.
   */
  selectTrace(traceId: string | null): void;

  /**
   * Toggle trace expansion.
   */
  toggleTraceExpansion(traceId: string): void;

  /**
   * Set timeline filter.
   */
  setTimelineFilter(filter: string): void;

  /**
   * Toggle tracing pause state.
   */
  toggleTracingPause(): void;

  /**
   * Clear all traces.
   */
  clearTraces(): void;

  /**
   * Select a service for inspection.
   */
  selectService(portName: string | null): void;

  /**
   * Select a scope for inspection.
   */
  selectScope(scopeId: string | null): void;

  /**
   * Toggle scope expansion.
   */
  toggleScopeExpansion(scopeId: string): void;

  /**
   * Set inspector filter.
   */
  setInspectorFilter(filter: string): void;
}

// =============================================================================
// Context
// =============================================================================

/**
 * DevTools React context.
 */
const DevToolsContext = createContext<DevToolsContextValue | null>(null);

// =============================================================================
// Provider Props
// =============================================================================

/**
 * Props for DevToolsProvider.
 */
export interface DevToolsProviderProps {
  /**
   * Child components to wrap.
   */
  readonly children: ReactNode;

  /**
   * Data source for accessing DevTools data.
   */
  readonly dataSource: PresenterDataSourceContract;

  /**
   * Initial state overrides.
   */
  readonly initialState?: Partial<DevToolsState>;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * DevToolsProvider component.
 *
 * Provides DevTools state and data source to all child components.
 *
 * @example
 * ```tsx
 * import { DevToolsProvider, LocalDataSource } from '@hex-di/devtools-react';
 *
 * function App() {
 *   const dataSource = useMemo(
 *     () => new LocalDataSource(graph, container),
 *     [graph, container]
 *   );
 *
 *   return (
 *     <DevToolsProvider dataSource={dataSource}>
 *       <DevToolsPanel />
 *     </DevToolsProvider>
 *   );
 * }
 * ```
 */
export function DevToolsProvider({
  children,
  dataSource,
  initialState: initialStateOverrides,
}: DevToolsProviderProps): JSX.Element {
  // Merge initial state with overrides
  const mergedInitialState = useMemo(
    () => ({
      ...initialState,
      ...initialStateOverrides,
    }),
    [initialStateOverrides]
  );

  // State management
  const [state, dispatch] = useReducer(devToolsReducer, mergedInitialState);

  // View model state (updated when data source changes)
  const [graphViewModel, setGraphViewModel] = useState<GraphViewModel | null>(null);
  const [timelineViewModel, setTimelineViewModel] = useState<TimelineViewModel | null>(null);
  const [statsViewModel, setStatsViewModel] = useState<StatsViewModel | null>(null);
  const [inspectorViewModel, setInspectorViewModel] = useState<InspectorViewModel | null>(null);
  const [panelViewModel, setPanelViewModel] = useState<PanelViewModel | null>(null);

  // Create presenters
  const presenters = useMemo(() => {
    return {
      graph: new GraphPresenter(dataSource),
      timeline: new TimelinePresenter(dataSource),
      stats: new StatsPresenter(dataSource),
      inspector: new InspectorPresenter(dataSource),
      panel: new PanelPresenter(dataSource),
    };
  }, [dataSource]);

  // Update view models when data source changes
  const updateViewModels = useCallback(() => {
    if (presenters.graph) {
      const vm = presenters.graph.getViewModel();
      setGraphViewModel(vm);
    }
    if (presenters.timeline) {
      const vm = presenters.timeline.getViewModel();
      setTimelineViewModel(vm);
    }
    if (presenters.stats) {
      const vm = presenters.stats.getViewModel();
      setStatsViewModel(vm);
    }
    if (presenters.inspector) {
      const vm = presenters.inspector.getViewModel();
      setInspectorViewModel(vm);
    }
    if (presenters.panel) {
      const vm = presenters.panel.getViewModel();
      setPanelViewModel(vm);
    }
  }, [presenters]);

  // Initial update
  useEffect(() => {
    updateViewModels();
  }, [updateViewModels]);

  // Subscribe to data source changes
  // Use debouncing to batch rapid trace notifications and prevent re-render loops.
  // Without debouncing, each usePort() call triggers tracing → notification →
  // state update → re-render → usePort() → loop.
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingUpdate = false;

    const unsubscribe = dataSource.subscribe(() => {
      // Mark that we have a pending update
      pendingUpdate = true;

      // If we already have a timer scheduled, let it handle the update
      if (debounceTimer !== null) {
        return;
      }

      // Schedule a debounced update
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (pendingUpdate) {
          pendingUpdate = false;
          updateViewModels();
          dispatch(actions.dataUpdated());
        }
      }, 16); // ~1 frame at 60fps - batches rapid notifications
    });

    return () => {
      unsubscribe();
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
    };
  }, [dataSource, updateViewModels]);

  // Action helpers
  const setActiveTab = useCallback((tabId: TabId) => {
    dispatch(actions.setActiveTab(tabId));
  }, []);

  const togglePanel = useCallback(() => {
    dispatch(actions.togglePanel());
  }, []);

  const setPanelOpen = useCallback((isOpen: boolean) => {
    dispatch(actions.setPanelOpen(isOpen));
  }, []);

  const toggleFullscreen = useCallback(() => {
    dispatch(actions.setFullscreen(!state.panel.isFullscreen));
  }, [state.panel.isFullscreen]);

  const setPanelPosition = useCallback((position: PanelPosition) => {
    dispatch(actions.setPanelPosition(position));
  }, []);

  const setPanelSize = useCallback((size: PanelSize) => {
    dispatch(actions.setPanelSize(size));
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    dispatch(actions.selectNode(nodeId));
  }, []);

  const highlightNodes = useCallback((nodeIds: readonly string[]) => {
    dispatch(actions.highlightNodes(nodeIds));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    dispatch(actions.setZoom(zoom));
  }, []);

  const setGraphDirection = useCallback((_direction: LayoutDirection) => {
    // Graph direction is managed by the presenter, not the reducer
    // For now, this is a no-op until we add the action
  }, []);

  const selectTrace = useCallback((traceId: string | null) => {
    dispatch(actions.selectTrace(traceId));
  }, []);

  const toggleTraceExpansion = useCallback((traceId: string) => {
    dispatch(actions.toggleTraceExpand(traceId));
  }, []);

  const setTimelineFilter = useCallback((filter: string) => {
    dispatch(actions.setTimelineFilter(filter));
  }, []);

  const toggleTracingPause = useCallback(() => {
    dispatch({ type: "TOGGLE_TRACING_PAUSE" });
    if (state.timeline.isPaused) {
      dataSource.resume();
    } else {
      dataSource.pause();
    }
  }, [dataSource, state.timeline.isPaused]);

  const clearTraces = useCallback(() => {
    dataSource.clearTraces();
    dispatch({ type: "CLEAR_TRACES" });
  }, [dataSource]);

  const selectService = useCallback((portName: string | null) => {
    dispatch(actions.selectService(portName));
  }, []);

  const selectScope = useCallback((scopeId: string | null) => {
    dispatch(actions.selectScope(scopeId));
  }, []);

  const toggleScopeExpansion = useCallback((scopeId: string) => {
    dispatch({ type: "TOGGLE_SCOPE_EXPAND", payload: scopeId });
  }, []);

  const setInspectorFilter = useCallback((filter: string) => {
    dispatch({ type: "SET_INSPECTOR_FILTER", payload: filter });
  }, []);

  // Build context value
  const contextValue = useMemo<DevToolsContextValue>(
    () => ({
      state,
      dispatch,
      dataSource,
      presenters,
      viewModels: {
        graph: graphViewModel,
        timeline: timelineViewModel,
        stats: statsViewModel,
        inspector: inspectorViewModel,
        panel: panelViewModel,
      },
      // Action helpers
      setActiveTab,
      togglePanel,
      setPanelOpen,
      toggleFullscreen,
      setPanelPosition,
      setPanelSize,
      selectNode,
      highlightNodes,
      setZoom,
      setGraphDirection,
      selectTrace,
      toggleTraceExpansion,
      setTimelineFilter,
      toggleTracingPause,
      clearTraces,
      selectService,
      selectScope,
      toggleScopeExpansion,
      setInspectorFilter,
    }),
    [
      state,
      dataSource,
      presenters,
      graphViewModel,
      timelineViewModel,
      statsViewModel,
      inspectorViewModel,
      panelViewModel,
      setActiveTab,
      togglePanel,
      setPanelOpen,
      toggleFullscreen,
      setPanelPosition,
      setPanelSize,
      selectNode,
      highlightNodes,
      setZoom,
      setGraphDirection,
      selectTrace,
      toggleTraceExpansion,
      setTimelineFilter,
      toggleTracingPause,
      clearTraces,
      selectService,
      selectScope,
      toggleScopeExpansion,
      setInspectorFilter,
    ]
  );

  return (
    <DevToolsContext.Provider value={contextValue}>
      {children}
    </DevToolsContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access DevTools context.
 *
 * @throws Error if used outside DevToolsProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, setActiveTab } = useDevToolsContext();
 *   return (
 *     <button onClick={() => setActiveTab('graph')}>
 *       Go to Graph
 *     </button>
 *   );
 * }
 * ```
 */
export function useDevToolsContext(): DevToolsContextValue {
  const context = useContext(DevToolsContext);
  if (context === null) {
    throw new Error("useDevToolsContext must be used within a DevToolsProvider");
  }
  return context;
}
