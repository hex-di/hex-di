import type { ReactNode } from "react";

interface PermissionMatrixProps {
  readonly columns: readonly string[];
  readonly rows: readonly {
    readonly label: string;
    readonly values: readonly boolean[];
  }[];
}

export function PermissionMatrix({ columns, rows }: PermissionMatrixProps): ReactNode {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-sm">
        <thead>
          <tr className="border-b border-hex-primary/15">
            <th className="text-left py-2 px-3 text-hex-muted font-normal tracking-wider uppercase text-xs">
              Subject
            </th>
            {columns.map(col => (
              <th
                key={col}
                className="text-center py-2 px-2 text-hex-muted font-normal tracking-wider uppercase text-xs"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className="border-b border-hex-primary/5">
              <td className="py-2 px-3 text-hex-text">{row.label}</td>
              {row.values.map((allowed, i) => (
                <td key={i} className="text-center py-2 px-2">
                  {allowed ? (
                    <span className="text-hex-green">ALLOW</span>
                  ) : (
                    <span className="text-red-500/70">DENY</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
