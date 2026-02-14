/**
 * GraphFilterPanel — filter drawer with all filter dimensions.
 *
 * @packageDocumentation
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { GraphFilterState } from "../types.js";
import { SEARCH_DEBOUNCE_MS } from "../constants.js";

interface GraphFilterPanelProps {
  readonly filter: GraphFilterState;
  readonly isOpen: boolean;
  readonly totalNodes: number;
  readonly matchingNodes: number;
  readonly availableCategories: readonly string[];
  readonly availableTags: readonly string[];
  readonly onFilterChange: (filter: Partial<GraphFilterState>) => void;
  readonly onReset: () => void;
  readonly onClose: () => void;
}

const sectionStyle: React.CSSProperties = {
  marginBottom: "var(--hex-space-md)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "var(--hex-font-size-xs)",
  color: "var(--hex-text-muted)",
  marginBottom: 4,
  fontWeight: "var(--hex-font-weight-medium)" as string,
  display: "block",
};

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 0",
  fontSize: "var(--hex-font-size-sm)",
  color: "var(--hex-text-primary)",
  cursor: "pointer",
};

function GraphFilterPanel({
  filter,
  isOpen,
  totalNodes,
  matchingNodes,
  availableCategories,
  availableTags,
  onFilterChange,
  onReset,
  onClose,
}: GraphFilterPanelProps): React.ReactElement | null {
  if (!isOpen) return null;

  const [searchInput, setSearchInput] = useState(filter.searchText);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      onFilterChange({ searchText: searchInput });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current !== undefined) clearTimeout(debounceRef.current);
    };
  }, [searchInput, onFilterChange]);

  const toggleSetItem = useCallback(
    <T extends string>(current: ReadonlySet<T>, item: T, key: keyof GraphFilterState) => {
      const next = new Set(current);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      onFilterChange({ [key]: next } as Partial<GraphFilterState>);
    },
    [onFilterChange]
  );

  return (
    <div
      data-testid="graph-filter-panel"
      style={{
        width: 280,
        height: "100%",
        overflow: "auto",
        backgroundColor: "var(--hex-bg-secondary)",
        borderRight: "1px solid var(--hex-border)",
        padding: "var(--hex-space-sm)",
        fontFamily: "var(--hex-font-sans)",
      }}
      role="complementary"
      aria-label="Graph filters"
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--hex-space-md)",
        }}
      >
        <span
          style={{
            fontWeight: "var(--hex-font-weight-medium)",
            color: "var(--hex-text-primary)",
          }}
        >
          Filters
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onReset}
            style={{
              border: "none",
              background: "none",
              color: "var(--hex-accent)",
              cursor: "pointer",
              fontSize: "var(--hex-font-size-sm)",
            }}
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              color: "var(--hex-text-muted)",
              cursor: "pointer",
              fontSize: "var(--hex-font-size-sm)",
            }}
            aria-label="Close filter panel"
          >
            {"\u2715"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Search</label>
        <input
          data-testid="filter-search"
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search port names..."
          style={{
            width: "100%",
            padding: "var(--hex-space-xs)",
            border: "1px solid var(--hex-border)",
            borderRadius: "var(--hex-radius-sm)",
            backgroundColor: "var(--hex-bg-primary)",
            color: "var(--hex-text-primary)",
            fontFamily: "var(--hex-font-mono)",
            fontSize: "var(--hex-font-size-sm)",
          }}
        />
      </div>

      {/* Lifetime */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Lifetime</label>
        {(["singleton", "scoped", "transient"] as const).map(lt => (
          <label key={lt} style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={filter.lifetimes.has(lt)}
              onChange={() => toggleSetItem(filter.lifetimes, lt, "lifetimes")}
              role="checkbox"
              aria-checked={filter.lifetimes.has(lt)}
            />
            {lt}
          </label>
        ))}
      </div>

      {/* Origin */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Origin</label>
        {(["own", "inherited", "overridden"] as const).map(origin => (
          <label key={origin} style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={filter.origins.has(origin)}
              onChange={() => toggleSetItem(filter.origins, origin, "origins")}
              role="checkbox"
              aria-checked={filter.origins.has(origin)}
            />
            {origin}
          </label>
        ))}
      </div>

      {/* Direction */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Direction</label>
        <div role="radiogroup" aria-label="Direction filter">
          {(["all", "inbound", "outbound"] as const).map(dir => (
            <label key={dir} style={checkboxRowStyle}>
              <input
                type="radio"
                name="direction"
                checked={filter.direction === dir}
                onChange={() => onFilterChange({ direction: dir })}
              />
              {dir}
            </label>
          ))}
        </div>
      </div>

      {/* Inheritance Mode */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Inheritance Mode</label>
        {(["shared", "forked", "isolated"] as const).map(mode => (
          <label key={mode} style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={filter.inheritanceModes.has(mode)}
              onChange={() => toggleSetItem(filter.inheritanceModes, mode, "inheritanceModes")}
              role="checkbox"
              aria-checked={filter.inheritanceModes.has(mode)}
            />
            {mode}
          </label>
        ))}
      </div>

      {/* Resolution Status */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Resolution Status</label>
        <div role="radiogroup" aria-label="Resolution status filter">
          {(["all", "resolved", "unresolved"] as const).map(status => (
            <label key={status} style={checkboxRowStyle}>
              <input
                type="radio"
                name="resolutionStatus"
                checked={filter.resolutionStatus === status}
                onChange={() => onFilterChange({ resolutionStatus: status })}
              />
              {status}
            </label>
          ))}
        </div>
      </div>

      {/* Category */}
      {availableCategories.length > 0 && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Category</label>
          <select
            value={filter.category}
            onChange={e => onFilterChange({ category: e.target.value })}
            style={{
              width: "100%",
              padding: "var(--hex-space-xs)",
              border: "1px solid var(--hex-border)",
              borderRadius: "var(--hex-radius-sm)",
              backgroundColor: "var(--hex-bg-primary)",
              color: "var(--hex-text-primary)",
              fontSize: "var(--hex-font-size-sm)",
            }}
          >
            <option value="">All categories</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tags */}
      {availableTags.length > 0 && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Tags</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {availableTags.map(tag => {
              const active = filter.tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => {
                    const next = active
                      ? filter.tags.filter(t => t !== tag)
                      : [...filter.tags, tag];
                    onFilterChange({ tags: next });
                  }}
                  style={{
                    padding: "1px 6px",
                    borderRadius: 10,
                    border: "1px solid var(--hex-border)",
                    backgroundColor: active ? "var(--hex-accent)" : "var(--hex-bg-primary)",
                    color: active ? "var(--hex-text-inverse)" : "var(--hex-text-primary)",
                    fontSize: "var(--hex-font-size-xs)",
                    cursor: "pointer",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Compound Mode */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Compound Mode</label>
        <div role="radiogroup" aria-label="Compound mode">
          {(["and", "or"] as const).map(mode => (
            <label key={mode} style={checkboxRowStyle}>
              <input
                type="radio"
                name="compoundMode"
                checked={filter.compoundMode === mode}
                onChange={() => onFilterChange({ compoundMode: mode })}
              />
              {mode.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      {/* Error Rate */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Min Error Rate</label>
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round(filter.minErrorRate * 100)}
          onChange={e => {
            const pct = Number(e.target.value);
            onFilterChange({ minErrorRate: pct / 100 });
          }}
          style={{
            width: 60,
            padding: "var(--hex-space-xs)",
            border: "1px solid var(--hex-border)",
            borderRadius: "var(--hex-radius-sm)",
            backgroundColor: "var(--hex-bg-primary)",
            color: "var(--hex-text-primary)",
            fontSize: "var(--hex-font-size-sm)",
          }}
        />
        <span
          style={{
            fontSize: "var(--hex-font-size-xs)",
            color: "var(--hex-text-muted)",
            marginLeft: 4,
          }}
        >
          %
        </span>
      </div>

      {/* Footer */}
      <div
        data-testid="filter-footer"
        style={{
          borderTop: "1px solid var(--hex-border)",
          paddingTop: "var(--hex-space-xs)",
          fontSize: "var(--hex-font-size-xs)",
          color: "var(--hex-text-muted)",
        }}
      >
        Showing {matchingNodes} of {totalNodes}
      </div>
    </div>
  );
}

export { GraphFilterPanel };
export type { GraphFilterPanelProps };
