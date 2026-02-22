/**
 * SortHeader component for sortable table columns.
 *
 * Renders a clickable column header that indicates sort direction
 * and fires onSort callbacks.
 *
 * @packageDocumentation
 */

import { useState } from "react";

type SortDirection = "asc" | "desc";

interface SortHeaderProps {
  readonly label: string;
  readonly column: string;
  readonly activeColumn: string;
  readonly direction: SortDirection;
  readonly onSort: (column: string, direction: SortDirection) => void;
}

/**
 * SortHeader renders a table column header with sort indicators.
 */
function SortHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: SortHeaderProps): React.ReactElement {
  const isActive = column === activeColumn;
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (): void => {
    if (isActive) {
      onSort(column, direction === "asc" ? "desc" : "asc");
    } else {
      onSort(column, "asc");
    }
  };

  const arrowChar = isActive ? (direction === "asc" ? " \u2191" : " \u2193") : "";

  return (
    <th
      scope="col"
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        cursor: "pointer",
        userSelect: "none",
        padding: "var(--hex-space-xs) var(--hex-space-sm)",
        fontFamily: "var(--hex-font-sans)",
        fontSize: "var(--hex-font-size-sm)",
        fontWeight: "var(--hex-font-weight-medium)",
        color: isActive ? "var(--hex-text-primary)" : "var(--hex-text-secondary)",
        textAlign: "left",
        whiteSpace: "nowrap",
        borderBottom: "1px solid var(--hex-border)",
        backgroundColor: isHovered ? "var(--hex-bg-hover)" : "transparent",
        transition: "background-color var(--hex-transition-fast)",
      }}
    >
      {label}
      {arrowChar}
    </th>
  );
}

export { SortHeader };
export type { SortHeaderProps, SortDirection };
