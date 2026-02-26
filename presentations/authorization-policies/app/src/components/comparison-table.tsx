import type { ReactNode } from "react";

type CellLevel = "high" | "medium" | "low" | "none";

interface ComparisonTableProps {
  readonly headers: readonly string[];
  readonly rows: readonly {
    readonly label: string;
    readonly cells: readonly { readonly value: string; readonly level: CellLevel }[];
  }[];
}

const cellClass: Record<CellLevel, string> = {
  high: "cell-high",
  medium: "cell-medium",
  low: "cell-low",
  none: "text-auth-muted",
};

export function ComparisonTable({ headers, rows }: ComparisonTableProps): ReactNode {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="border-b border-auth-primary/20">
            <th className="text-left py-3 px-3 text-auth-primary font-semibold tracking-wider uppercase text-xs">
              Model
            </th>
            {headers.map(h => (
              <th
                key={h}
                className="text-center py-3 px-3 text-auth-muted font-medium tracking-wider uppercase text-xs"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className="border-b border-auth-primary/5 hover:bg-auth-primary/3">
              <td className="py-2.5 px-3 text-auth-text font-medium">{row.label}</td>
              {row.cells.map((cell, i) => (
                <td
                  key={i}
                  className={`py-2.5 px-3 text-center text-xs font-medium rounded-sm ${cellClass[cell.level]}`}
                >
                  {cell.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
