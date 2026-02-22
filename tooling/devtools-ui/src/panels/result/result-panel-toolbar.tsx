/**
 * ResultPanelToolbar — toolbar component for the Result Panel.
 *
 * Includes view switcher, chain selector, execution selector,
 * educational toggle, export dropdown, and live indicator.
 *
 * Spec: 03-views-and-wireframes.md (3.1, 3.2), 14-integration.md (14.1)
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useState } from "react";
import type { ResultDataSource, ResultViewId } from "./types.js";

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

// ── Export formats ──────────────────────────────────────────────────────────

interface ExportFormat {
  readonly id: string;
  readonly label: string;
}

const EXPORT_FORMATS: readonly ExportFormat[] = [
  { id: "json", label: "JSON" },
  { id: "mermaid", label: "Mermaid" },
  { id: "dot", label: "DOT" },
  { id: "csv", label: "CSV" },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface ResultPanelToolbarProps {
  readonly dataSource: ResultDataSource;
  readonly activeView: ResultViewId;
  readonly onViewChange: (viewId: ResultViewId) => void;
  readonly selectedChainId: string | undefined;
  readonly onChainSelect: (chainId: string) => void;
  readonly selectedExecutionId: string | undefined;
  readonly onExecutionSelect: (executionId: string) => void;
  readonly onPrevExecution: () => void;
  readonly onNextExecution: () => void;
  readonly educationalSidebarOpen: boolean;
  readonly onToggleEducational: () => void;
  readonly connectionStatus: "connected" | "disconnected";
}

// ── Component ───────────────────────────────────────────────────────────────

function ResultPanelToolbar({
  dataSource,
  activeView,
  onViewChange,
  selectedChainId,
  onChainSelect,
  selectedExecutionId: _selectedExecutionId,
  onExecutionSelect: _onExecutionSelect,
  onPrevExecution,
  onNextExecution,
  educationalSidebarOpen: _educationalSidebarOpen,
  onToggleEducational,
  connectionStatus,
}: ResultPanelToolbarProps): React.ReactElement {
  const [chainSearch, setChainSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // ── Chain data ──────────────────────────────────────────────────────────

  const chains = dataSource.getChains();
  const portStatistics = dataSource.getPortStatistics();

  const filteredChains = useMemo(() => {
    const result: { chainId: string; label: string; okRate: number }[] = [];
    for (const chain of chains.values()) {
      if (debouncedSearch && !chain.label.toLowerCase().includes(debouncedSearch.toLowerCase())) {
        continue;
      }
      const stats = chain.portName !== undefined ? portStatistics.get(chain.portName) : undefined;
      const okRate = stats ? Math.round((stats.okCount / stats.totalCalls) * 100) : 0;
      result.push({ chainId: chain.chainId, label: chain.label, okRate });
    }
    return result;
  }, [chains, portStatistics, debouncedSearch]);

  // ── Execution data ────────────────────────────────────────────────────

  const executions = useMemo(() => {
    if (!selectedChainId) return [];
    return dataSource.getExecutions(selectedChainId);
  }, [dataSource, selectedChainId]);

  // ── Search handler with debounce ──────────────────────────────────────

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setChainSearch(value);
      if (debounceTimer !== undefined) {
        clearTimeout(debounceTimer);
      }
      const timer = setTimeout(() => {
        setDebouncedSearch(value);
      }, 150);
      setDebounceTimer(timer);
    },
    [debounceTimer]
  );

  return (
    <div data-testid="result-toolbar" role="toolbar" aria-label="Result Panel toolbar">
      {/* View Switcher */}
      <div role="tablist" aria-label="Result Panel views">
        {VIEWS.map(v => (
          <button
            key={v.id}
            role="tab"
            aria-selected={v.id === activeView}
            data-active={v.id === activeView ? "true" : undefined}
            onClick={() => onViewChange(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Chain Selector */}
      <div data-testid="chain-selector">
        <input
          data-testid="chain-search"
          type="text"
          placeholder="Search chains..."
          value={chainSearch}
          onChange={handleSearchChange}
        />
        <div data-testid="chain-list">
          {filteredChains.map(c => (
            <button
              key={c.chainId}
              data-testid="chain-option"
              onClick={() => onChainSelect(c.chainId)}
            >
              {c.label} — {c.okRate}%
            </button>
          ))}
        </div>
      </div>

      {/* Execution Selector */}
      {selectedChainId && (
        <div data-testid="execution-selector">
          <button
            data-testid="exec-prev-btn"
            onClick={onPrevExecution}
            aria-label="Previous execution"
          >
            ←
          </button>
          <div data-testid="execution-list">
            {executions.map(exec => (
              <div
                key={exec.executionId}
                data-testid="execution-entry"
                data-final-track={exec.finalTrack}
              >
                {exec.executionId}
              </div>
            ))}
          </div>
          <button data-testid="exec-next-btn" onClick={onNextExecution} aria-label="Next execution">
            →
          </button>
        </div>
      )}

      {/* Educational Toggle */}
      <button
        data-testid="educational-toggle"
        onClick={onToggleEducational}
        aria-label="Toggle educational sidebar"
      >
        [?]
      </button>

      {/* Export Dropdown */}
      {selectedChainId && (
        <div data-testid="export-dropdown">
          {EXPORT_FORMATS.map(f => (
            <button key={f.id} data-testid="export-option">
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Live Indicator */}
      <span data-testid="live-indicator" data-status={connectionStatus}>
        {connectionStatus === "connected" ? "Live" : "Disconnected"}
      </span>
    </div>
  );
}

export { ResultPanelToolbar };
export type { ResultPanelToolbarProps };
