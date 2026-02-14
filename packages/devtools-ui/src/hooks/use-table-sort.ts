/**
 * useTableSort hook for column sort state management.
 *
 * Manages active column, direction, and provides a comparator function.
 *
 * @packageDocumentation
 */

import { useCallback, useState } from "react";

type SortDirection = "asc" | "desc";

interface TableSortState<T> {
  readonly sortColumn: keyof T;
  readonly sortDirection: SortDirection;
  setSortColumn(column: keyof T): void;
  toggleDirection(): void;
  comparator(a: T, b: T): number;
}

/**
 * Manages column sort state for tables.
 *
 * When `setSortColumn` is called with the same column, it toggles direction.
 * When called with a different column, it resets direction to the default.
 *
 * @param defaultColumn - The column to sort by initially
 * @param defaultDirection - Initial sort direction (default: "asc")
 */
export function useTableSort<T>(
  defaultColumn: keyof T,
  defaultDirection: SortDirection = "asc"
): TableSortState<T> {
  const [sortColumn, setSortColumnState] = useState<keyof T>(defaultColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const setSortColumn = useCallback(
    (column: keyof T) => {
      if (column === sortColumn) {
        setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortColumnState(column);
        setSortDirection(defaultDirection);
      }
    },
    [sortColumn, defaultDirection]
  );

  const toggleDirection = useCallback(() => {
    setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const comparator = useCallback(
    (a: T, b: T): number => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const multiplier = sortDirection === "asc" ? 1 : -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * multiplier;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * multiplier;
      }

      // Fallback: stringify comparison
      const aStr = String(aVal);
      const bStr = String(bVal);
      return aStr.localeCompare(bStr) * multiplier;
    },
    [sortColumn, sortDirection]
  );

  return {
    sortColumn,
    sortDirection,
    setSortColumn,
    toggleDirection,
    comparator,
  };
}
