/**
 * Move selector component displaying available battle moves as buttons.
 *
 * Shows each move with its name, type badge, and remaining PP.
 * Moves with 0 PP are disabled. Each button is colored based on
 * the move's elemental type using the bundled type chart colors.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import type { BattleMove } from "@pokenerve/shared/types/battle";
import typeChartJson from "../../data/type-chart.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MoveSelectorProps {
  readonly moves: readonly BattleMove[];
  readonly onSelectMove: (moveIndex: number) => void;
  readonly disabled: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeColors: Record<string, string> = typeChartJson.colors;

function getTypeColor(typeName: string): string {
  return typeColors[typeName] ?? "#A8A77A";
}

function formatMoveName(name: string): string {
  return name
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function MoveSelector({ moves, onSelectMove, disabled }: MoveSelectorProps): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-2">
      {moves.map((battleMove, index) => {
        const typeName = battleMove.move.type.name;
        const color = getTypeColor(typeName);
        const noPp = battleMove.currentPp <= 0;
        const isDisabled = disabled || noPp;

        return (
          <button
            key={`${battleMove.move.name}-${String(index)}`}
            type="button"
            onClick={() => onSelectMove(index)}
            disabled={isDisabled}
            className={`rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
              isDisabled
                ? "cursor-not-allowed border-gray-700 bg-gray-800/50 opacity-50"
                : "border-gray-600 bg-gray-800 hover:brightness-110"
            }`}
            style={isDisabled ? undefined : { borderColor: color }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                {formatMoveName(battleMove.move.name)}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {typeName}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-400">
              PP: {battleMove.currentPp}/{battleMove.maxPp}
              {battleMove.move.power !== null && battleMove.move.power > 0 && (
                <span className="ml-2">Pwr: {battleMove.move.power}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export { MoveSelector };
export type { MoveSelectorProps };
