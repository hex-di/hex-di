/**
 * Adapter selection dropdown.
 *
 * Allows the user to switch between REST (direct), Cached (fast),
 * and Offline (bundled) adapter modes. Currently a visual demo that
 * tracks the selected adapter in state.
 *
 * @packageDocumentation
 */

import { type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdapterChoice = "rest" | "cached" | "offline";

interface AdapterSwitcherProps {
  readonly current: AdapterChoice;
  readonly onChange: (choice: AdapterChoice) => void;
}

// ---------------------------------------------------------------------------
// Adapter metadata
// ---------------------------------------------------------------------------

const adapterMeta: ReadonlyArray<{
  readonly value: AdapterChoice;
  readonly label: string;
  readonly description: string;
  readonly color: string;
}> = [
  {
    value: "rest",
    label: "REST",
    description: "Direct API calls",
    color: "bg-blue-500",
  },
  {
    value: "cached",
    label: "Cached",
    description: "LRU cache layer",
    color: "bg-amber-500",
  },
  {
    value: "offline",
    label: "Offline",
    description: "Bundled data",
    color: "bg-emerald-500",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AdapterSwitcher({ current, onChange }: AdapterSwitcherProps): ReactNode {
  const currentMeta = adapterMeta.find(m => m.value === current);
  const indicatorColor = currentMeta?.color ?? "bg-gray-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${indicatorColor}`} />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Adapter</span>
      </div>
      <select
        value={current}
        onChange={e => {
          const value = e.target.value;
          if (value === "rest" || value === "cached" || value === "offline") {
            onChange(value);
          }
        }}
        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        {adapterMeta.map(m => (
          <option key={m.value} value={m.value}>
            {m.label} - {m.description}
          </option>
        ))}
      </select>
    </div>
  );
}

export { AdapterSwitcher };
export type { AdapterChoice };
