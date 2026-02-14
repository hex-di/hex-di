/**
 * ResultPanel — top-level panel component for the Result Panel.
 *
 * Spec: 03-views-and-wireframes.md (3.1, 3.2), 14-integration.md (14.1, 14.8)
 *
 * @packageDocumentation
 */

import { Component, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getStabilityZoneColor } from "./visual-encoding.js";
import type {
  ResultChainDescriptor,
  ResultDataEvent,
  ResultDataSource,
  ResultFilterState,
  ResultPanelNavigation,
  ResultPanelState,
  ResultPortStatistics,
  ResultViewId,
} from "./types.js";

// ── View Registry ───────────────────────────────────────────────────────────

interface ViewDef {
  readonly id: ResultViewId;
  readonly label: string;
}

const VIEWS: readonly ViewDef[] = [
  { id: "railway", label: "Railway" },
  { id: "log", label: "Log" },
  { id: "cases", label: "Cases" },
  { id: "sankey", label: "Sankey" },
  { id: "waterfall", label: "Waterfall" },
  { id: "combinator", label: "Combinator" },
  { id: "overview", label: "Overview" },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface ResultPanelProps {
  readonly dataSource: ResultDataSource;
  readonly theme: "light" | "dark";
  readonly navigateTo: (panel: string, context: Record<string, unknown>) => void;
  readonly initialState?: ResultPanelNavigation;
}

// ── Default filter ──────────────────────────────────────────────────────────

const DEFAULT_FILTER: ResultFilterState = {
  chainSearch: "",
  portName: undefined,
  status: "all",
  errorType: undefined,
  timeRange: "all",
};

// ── Error Boundary (panel-level) ────────────────────────────────────────────

interface PanelErrorBoundaryProps {
  readonly children: React.ReactNode;
}

interface PanelErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: unknown;
}

class ResultPanelErrorBoundary extends Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  constructor(props: PanelErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: unknown): PanelErrorBoundaryState {
    return { hasError: true, error };
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      const msg =
        this.state.error instanceof Error
          ? this.state.error.message
          : "An unexpected error occurred";
      return (
        <div data-testid="result-error-fallback" role="alert">
          <strong>Something went wrong</strong>
          <p>{msg}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Status Bar ──────────────────────────────────────────────────────────────

interface StatusBarProps {
  readonly chain: ResultChainDescriptor | undefined;
  readonly portStats: ResultPortStatistics | undefined;
}

function ResultPanelStatusBar({ chain, portStats }: StatusBarProps): React.ReactElement | null {
  if (!chain || !portStats) {
    return null;
  }

  const zone = getStabilityZoneColor(portStats.stabilityScore);
  const pct = Math.round(portStats.stabilityScore * 100);

  return (
    <div data-testid="result-status-bar" role="status" aria-live="polite">
      <span>{chain.label}</span>
      <span> | Ok: {portStats.okCount}</span>
      <span> | Err: {portStats.errCount}</span>
      <span> | </span>
      <span data-testid="stability-badge" data-zone={zone}>
        {pct}%
      </span>
    </div>
  );
}

// ── View Placeholder ────────────────────────────────────────────────────────

function ViewPlaceholder({ viewId }: { readonly viewId: ResultViewId }): React.ReactElement {
  return (
    <div data-testid={`result-view-${viewId}`} role="tabpanel">
      {viewId} view
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

function ResultPanelInner({
  dataSource,
  theme,
  navigateTo: _navigateTo,
  initialState,
}: ResultPanelProps): React.ReactElement {
  // ── State ───────────────────────────────────────────────────────────────

  const [state, setState] = useState<ResultPanelState>(() => ({
    selectedChainId: initialState?.chainId,
    selectedExecutionId: initialState?.executionId,
    selectedStepIndex: initialState?.stepIndex,
    activeView: initialState?.view ?? "overview",
    filter: DEFAULT_FILTER,
    educationalSidebarOpen: false,
    connectionStatus: "connected",
  }));

  // ── Subscription ────────────────────────────────────────────────────────

  // Force re-render on data events
  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsub = dataSource.subscribe((event: ResultDataEvent) => {
      if (event.type === "connection-lost") {
        setState(prev => ({ ...prev, connectionStatus: "disconnected" }));
      } else if (event.type === "connection-restored") {
        setState(prev => ({ ...prev, connectionStatus: "connected" }));
      }
      setVersion(v => v + 1);
    });
    return unsub;
  }, [dataSource]);

  // ── Derived data ────────────────────────────────────────────────────────

  const chains = dataSource.getChains();
  const portStatistics = dataSource.getPortStatistics();

  const selectedChain =
    state.selectedChainId !== undefined ? chains.get(state.selectedChainId) : undefined;

  const selectedPortStats =
    selectedChain?.portName !== undefined ? portStatistics.get(selectedChain.portName) : undefined;

  // ── Handlers ────────────────────────────────────────────────────────────

  const setActiveView = useCallback((viewId: ResultViewId) => {
    setState(prev => ({ ...prev, activeView: viewId }));
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────────

  if (chains.size === 0) {
    return (
      <div
        data-testid="result-panel"
        data-theme={theme}
        data-connection-status={state.connectionStatus}
      >
        <div role="tablist" aria-label="Result Panel views">
          {VIEWS.map(v => (
            <button
              key={v.id}
              role="tab"
              aria-selected={v.id === state.activeView}
              onClick={() => setActiveView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div data-testid="result-empty-state">
          <span>No Result chains detected</span>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div data-testid="result-panel" data-theme={theme}>
      {/* Toolbar */}
      <div role="tablist" aria-label="Result Panel views">
        {VIEWS.map(v => (
          <button
            key={v.id}
            role="tab"
            aria-selected={v.id === state.activeView}
            onClick={() => setActiveView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Chain context */}
      {selectedChain && <span>{selectedChain.label}</span>}

      {/* Active view */}
      <ViewPlaceholder viewId={state.activeView} />

      {/* Status bar */}
      <ResultPanelStatusBar chain={selectedChain} portStats={selectedPortStats} />
    </div>
  );
}

/** Top-level ResultPanel wrapped in an error boundary. */
function ResultPanel(props: ResultPanelProps): React.ReactElement {
  return (
    <ResultPanelErrorBoundary>
      <ResultPanelInner {...props} />
    </ResultPanelErrorBoundary>
  );
}

export { ResultPanel };
export type { ResultPanelProps };
