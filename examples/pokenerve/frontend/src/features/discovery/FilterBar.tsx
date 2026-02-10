/**
 * Filter bar for Pokemon discovery.
 *
 * Renders dropdowns for filtering Pokemon by type, habitat, color, and shape.
 * Shows an active filter count badge when filters are applied.
 *
 * @packageDocumentation
 */

import { type ReactNode } from "react";
import filterOptions from "../../data/filter-options.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Filters {
  readonly type: string;
  readonly habitat: string;
  readonly color: string;
  readonly shape: string;
}

interface FilterBarProps {
  readonly filters: Filters;
  readonly onFilterChange: (key: keyof Filters, value: string) => void;
}

interface FilterDropdownProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly string[];
  readonly onChange: (value: string) => void;
}

// ---------------------------------------------------------------------------
// Filter Dropdown
// ---------------------------------------------------------------------------

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <option value="">All</option>
        {options.map(opt => (
          <option key={opt} value={opt}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function FilterBar({ filters, onFilterChange }: FilterBarProps): ReactNode {
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-end gap-4">
      <FilterDropdown
        label="Type"
        value={filters.type}
        options={filterOptions.types}
        onChange={v => onFilterChange("type", v)}
      />
      <FilterDropdown
        label="Habitat"
        value={filters.habitat}
        options={filterOptions.habitats}
        onChange={v => onFilterChange("habitat", v)}
      />
      <FilterDropdown
        label="Color"
        value={filters.color}
        options={filterOptions.colors}
        onChange={v => onFilterChange("color", v)}
      />
      <FilterDropdown
        label="Shape"
        value={filters.shape}
        options={filterOptions.shapes}
        onChange={v => onFilterChange("shape", v)}
      />
      {activeCount > 0 && (
        <span className="mb-2 inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
          {activeCount} active
        </span>
      )}
    </div>
  );
}

export { FilterBar };
export type { Filters };
