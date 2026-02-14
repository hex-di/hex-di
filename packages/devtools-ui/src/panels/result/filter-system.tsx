/**
 * ResultFilterSystem — Global and view-specific filter controls.
 *
 * Spec: 13-filter-and-search.md (13.1-13.7)
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface FilterState {
  readonly chainSearch: string;
  readonly portName: string | undefined;
  readonly status: "all" | "ok" | "err" | "mixed";
  readonly errorType: string | undefined;
  readonly timeRange: string;
}

type ViewSpecificFilter =
  | "collapse-non-switch"
  | "switch-only"
  | "method-filter"
  | "path-classification"
  | "observed-only"
  | "min-flow";

// ── Props ───────────────────────────────────────────────────────────────────

interface ResultFilterSystemProps {
  readonly ports: readonly string[];
  readonly errorTypes: readonly string[];
  readonly onFilterChange: (state: FilterState) => void;
  readonly viewSpecificFilters?: readonly ViewSpecificFilter[];
  readonly activeView?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

function ResultFilterSystem({
  ports,
  errorTypes,
  onFilterChange,
  viewSpecificFilters = [],
  activeView,
}: ResultFilterSystemProps): React.ReactElement {
  const [filter, setFilter] = useState<FilterState>({
    chainSearch: "",
    portName: undefined,
    status: "all",
    errorType: undefined,
    timeRange: "all",
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Active count ───────────────────────────────────────────────────────

  const activeCount = useMemo(() => {
    let count = 0;
    if (filter.portName) count++;
    if (filter.status !== "all") count++;
    if (filter.errorType) count++;
    if (filter.timeRange !== "all") count++;
    if (filter.chainSearch) count++;
    return count;
  }, [filter]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const updateFilter = useCallback(
    (partial: Partial<FilterState>) => {
      setFilter(prev => {
        const next = { ...prev, ...partial };
        onFilterChange(next);
        return next;
      });
    },
    [onFilterChange]
  );

  const handleChainSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFilter(prev => ({ ...prev, chainSearch: value }));

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setFilter(prev => {
          onFilterChange({ ...prev, chainSearch: value });
          return prev;
        });
      }, 150);
    },
    [onFilterChange]
  );

  const handleClearAll = useCallback(() => {
    const cleared: FilterState = {
      chainSearch: "",
      portName: undefined,
      status: "all",
      errorType: undefined,
      timeRange: "all",
    };
    setFilter(cleared);
    onFilterChange(cleared);
  }, [onFilterChange]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div data-testid="result-filter-system">
      {/* Chain search */}
      <input
        data-testid="filter-chain-search"
        type="text"
        placeholder="Search chains..."
        value={filter.chainSearch}
        onChange={handleChainSearch}
      />

      {/* Port filter */}
      <select
        data-testid="filter-port"
        value={filter.portName ?? ""}
        onChange={e => updateFilter({ portName: e.target.value || undefined })}
      >
        <option value="">All ports</option>
        {ports.map(p => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      {/* Status filter */}
      <select
        data-testid="filter-status"
        value={filter.status}
        onChange={e =>
          updateFilter({
            status: e.target.value as FilterState["status"],
          })
        }
      >
        <option value="all">All</option>
        <option value="ok">Ok</option>
        <option value="err">Err</option>
        <option value="mixed">Mixed</option>
      </select>

      {/* Error type filter */}
      <select
        data-testid="filter-error-type"
        value={filter.errorType ?? ""}
        onChange={e => updateFilter({ errorType: e.target.value || undefined })}
      >
        <option value="">All errors</option>
        {errorTypes.map(e => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>

      {/* Time range filter */}
      <select
        data-testid="filter-time-range"
        value={filter.timeRange}
        onChange={e => updateFilter({ timeRange: e.target.value })}
      >
        <option value="5m">5 minutes</option>
        <option value="1h">1 hour</option>
        <option value="24h">24 hours</option>
        <option value="all">All time</option>
      </select>

      {/* Active filter count */}
      <span data-testid="filter-active-count">{activeCount}</span>

      {/* Clear all */}
      <button data-testid="filter-clear-all" onClick={handleClearAll}>
        Clear All
      </button>

      {/* View-specific filters */}
      {viewSpecificFilters.includes("collapse-non-switch") && (
        <div data-testid="filter-collapse-non-switch">Collapse non-switch</div>
      )}
      {viewSpecificFilters.includes("switch-only") && (
        <div data-testid="filter-switch-only">Switch only</div>
      )}
      {viewSpecificFilters.includes("method-filter") && (
        <div data-testid="filter-method-filter">Method filter</div>
      )}
      {viewSpecificFilters.includes("path-classification") && (
        <div data-testid="filter-path-classification">Path classification</div>
      )}
      {viewSpecificFilters.includes("observed-only") && (
        <div data-testid="filter-observed-only">Observed only</div>
      )}
      {viewSpecificFilters.includes("min-flow") && (
        <div data-testid="filter-min-flow">Min flow</div>
      )}
    </div>
  );
}

export { ResultFilterSystem };
export type { ResultFilterSystemProps, FilterState };
