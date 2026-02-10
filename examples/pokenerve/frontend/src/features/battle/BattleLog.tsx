/**
 * Battle log component displaying a scrollable list of battle events.
 *
 * Shows recent log entries with different colors for different event types.
 * Auto-scrolls to the latest entry when new events are added.
 *
 * @packageDocumentation
 */

import { type ReactNode, useEffect, useRef } from "react";
import type { BattleLogEntry } from "@pokenerve/shared/types/battle";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BattleLogProps {
  readonly entries: readonly BattleLogEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEntryColor(type: BattleLogEntry["type"]): string {
  switch (type) {
    case "move":
      return "text-blue-300";
    case "damage":
      return "text-orange-300";
    case "status":
      return "text-purple-300";
    case "weather":
      return "text-cyan-300";
    case "switch":
      return "text-green-300";
    case "faint":
      return "text-red-400";
    case "system":
      return "text-yellow-300";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function BattleLog({ entries }: BattleLogProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-400">Battle Log</h3>
      <div ref={containerRef} className="h-48 overflow-y-auto rounded-lg bg-gray-950 p-3 text-sm">
        {entries.map((entry, index) => (
          <div
            key={`${String(entry.turn)}-${String(entry.timestamp)}-${String(index)}`}
            className={`py-0.5 ${getEntryColor(entry.type)}`}
          >
            <span className="mr-2 text-xs text-gray-600">T{entry.turn}</span>
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export { BattleLog };
export type { BattleLogProps };
