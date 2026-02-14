/**
 * ResultPanelIntegration — Integration test harness component.
 *
 * Consolidates chain selection, execution selection, filtering, cross-view
 * navigation, playground mode, and walkthrough flow into a single component
 * for integration testing.
 *
 * Spec: 14-integration.md
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface ChainEntry {
  readonly id: string;
  readonly label: string;
  readonly operationCount?: number;
  readonly port?: string;
}

interface ExecutionEntry {
  readonly id: string;
  readonly chainId: string;
  readonly stepCount: number;
}

interface TopErrorEntry {
  readonly errorType: string;
  readonly count: number;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface ResultPanelIntegrationProps {
  readonly chains: readonly ChainEntry[];
  readonly executions?: readonly ExecutionEntry[];
  readonly activeView: string;
  readonly subscribe?: (listener: (event: { readonly type: string }) => void) => () => void;
  readonly onExecutionUpdate?: () => void;
  readonly onStatsRefresh?: () => void;
  readonly onFilterApply?: (filter: Record<string, string>) => void;
  readonly onCrossViewNavigate?: (view: string, context: Record<string, unknown>) => void;
  readonly selectedChainId?: string;
  readonly selectedExecutionId?: string;
  readonly selectedStepIndex?: number;
  readonly topErrors?: readonly TopErrorEntry[];
  readonly playgroundMode?: boolean;
  readonly walkthroughId?: string;
  readonly walkthroughStep?: number;
  readonly walkthroughTargetView?: string;
  readonly onWalkthroughHighlight?: () => void;
  readonly onWalkthroughNavigate?: (view: string) => void;
  readonly selectedMethod?: string;
  readonly onSidebarContentUpdate?: (context: { readonly method: string }) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

function ResultPanelIntegration({
  chains,
  executions,
  activeView,
  subscribe,
  onExecutionUpdate,
  onStatsRefresh,
  onFilterApply,
  onCrossViewNavigate,
  selectedChainId: initialChainId,
  selectedExecutionId: initialExecutionId,
  selectedStepIndex,
  topErrors,
  playgroundMode,
  walkthroughId,
  walkthroughStep,
  walkthroughTargetView,
  onWalkthroughHighlight,
  onWalkthroughNavigate,
  selectedMethod,
  onSidebarContentUpdate,
}: ResultPanelIntegrationProps): React.ReactElement {
  const [selectedChainId, setSelectedChainId] = useState<string | undefined>(initialChainId);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | undefined>(
    initialExecutionId
  );
  const [portFilter, setPortFilter] = useState<string | undefined>(undefined);
  const [showPortFilter, setShowPortFilter] = useState(false);
  const [showErrorTypeFilter, setShowErrorTypeFilter] = useState(false);
  const [showTimeRangeFilter, setShowTimeRangeFilter] = useState(false);

  // Subscribe to data events
  useEffect(() => {
    if (!subscribe) return undefined;
    return subscribe(event => {
      if (event.type === "execution-added") {
        onExecutionUpdate?.();
      }
      if (event.type === "statistics-updated") {
        onStatsRefresh?.();
      }
    });
  }, [subscribe, onExecutionUpdate, onStatsRefresh]);

  // Walkthrough highlight effect
  useEffect(() => {
    if (walkthroughId !== undefined && walkthroughStep !== undefined) {
      onWalkthroughHighlight?.();
    }
  }, [walkthroughId, walkthroughStep, onWalkthroughHighlight]);

  // Sidebar context effect
  useEffect(() => {
    if (selectedMethod) {
      onSidebarContentUpdate?.({ method: selectedMethod });
    }
  }, [selectedMethod, onSidebarContentUpdate]);

  const handleChainSelect = useCallback((chainId: string) => {
    setSelectedChainId(chainId);
  }, []);

  const handleExecutionSelect = useCallback((executionId: string) => {
    setSelectedExecutionId(executionId);
  }, []);

  // Filter visible chains
  const visibleChains = portFilter ? chains.filter(c => c.port === portFilter) : chains;

  const handleCrossViewNavigate = useCallback(
    (targetView: string) => {
      const context: Record<string, unknown> = {};
      if (selectedChainId) context["chainId"] = selectedChainId;
      if (selectedExecutionId) context["executionId"] = selectedExecutionId;
      if (selectedStepIndex !== undefined) context["stepIndex"] = selectedStepIndex;
      onCrossViewNavigate?.(targetView, context);
    },
    [onCrossViewNavigate, selectedChainId, selectedExecutionId, selectedStepIndex]
  );

  return (
    <div data-testid="result-panel-integration">
      {/* Chain selector */}
      <div data-testid="chain-selector">
        {visibleChains.map(c => (
          <button key={c.id} data-testid="chain-option" onClick={() => handleChainSelect(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Execution selector */}
      {executions && (
        <div data-testid="execution-selector">
          {executions.map(e => (
            <button
              key={e.id}
              data-testid="execution-option"
              onClick={() => handleExecutionSelect(e.id)}
            >
              Execution #{e.id}
            </button>
          ))}
        </div>
      )}

      {/* Port filter */}
      <button data-testid="port-filter" onClick={() => setShowPortFilter(!showPortFilter)}>
        Port Filter
      </button>
      {showPortFilter && (
        <div>
          {Array.from(new Set(chains.map(c => c.port).filter(Boolean))).map(port => (
            <button
              key={port}
              data-testid={`port-option-${port}`}
              onClick={() => setPortFilter(port)}
            >
              {port}
            </button>
          ))}
        </div>
      )}

      {/* Error type filter */}
      <button
        data-testid="error-type-filter"
        onClick={() => setShowErrorTypeFilter(!showErrorTypeFilter)}
      >
        Error Type
      </button>
      {showErrorTypeFilter && (
        <div>
          <button
            data-testid="error-type-option-validation"
            onClick={() => onFilterApply?.({ errorType: "validation" })}
          >
            Validation
          </button>
        </div>
      )}

      {/* Time range filter */}
      <button
        data-testid="time-range-filter"
        onClick={() => setShowTimeRangeFilter(!showTimeRangeFilter)}
      >
        Time Range
      </button>
      {showTimeRangeFilter && (
        <div>
          <button
            data-testid="time-range-option-1h"
            onClick={() => onFilterApply?.({ timeRange: "1h" })}
          >
            Last 1h
          </button>
        </div>
      )}

      {/* View content */}
      <div
        data-testid="view-content"
        data-view={activeView}
        data-chain-id={selectedChainId}
        data-execution-id={selectedExecutionId}
      >
        {/* Cross-view navigation */}
        {activeView === "railway" && (
          <button data-testid="cross-view-to-log" onClick={() => handleCrossViewNavigate("log")}>
            View in Log
          </button>
        )}
        {(activeView === "log" || activeView === "cases") && (
          <button
            data-testid="cross-view-to-railway"
            onClick={() => handleCrossViewNavigate("railway")}
          >
            View in Pipeline
          </button>
        )}

        {/* Top errors */}
        {activeView === "overview" &&
          topErrors?.map((err, i) => (
            <button
              key={i}
              data-testid={`top-error-row-${i}`}
              onClick={() => onCrossViewNavigate?.("log", { errorType: err.errorType })}
            >
              {err.errorType}: {err.count}
            </button>
          ))}
      </div>

      {/* Playground indicators */}
      {playgroundMode && (
        <>
          <div data-testid="auto-trace-indicator" data-active="true" />
          <div data-testid="tracing-level-indicator" data-level="1" />
        </>
      )}

      {/* Walkthrough elements */}
      {walkthroughId !== undefined && (
        <>
          <div data-testid="walkthrough-highlight" />
          <button
            data-testid="walkthrough-next"
            onClick={() => {
              if (walkthroughTargetView) {
                onWalkthroughNavigate?.(walkthroughTargetView);
              }
            }}
          >
            Next
          </button>
        </>
      )}
    </div>
  );
}

export { ResultPanelIntegration };
export type { ResultPanelIntegrationProps };
