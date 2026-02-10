/**
 * Health bar component with animated width and color transitions.
 *
 * Displays a horizontal bar representing current HP as a fraction of max HP.
 * The bar color transitions through green, yellow, and red as health decreases.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HpBarProps {
  readonly currentHp: number;
  readonly maxHp: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBarColor(ratio: number): string {
  if (ratio > 0.5) return "bg-green-500";
  if (ratio > 0.2) return "bg-yellow-500";
  return "bg-red-500";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function HpBar({ currentHp, maxHp }: HpBarProps): ReactNode {
  const safeMax = maxHp > 0 ? maxHp : 1;
  const ratio = Math.max(0, Math.min(1, currentHp / safeMax));
  const percentage = ratio * 100;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-gray-400">HP</span>
        <span className="text-gray-300">
          {currentHp} / {maxHp}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor(ratio)}`}
          style={{ width: `${String(percentage)}%` }}
        />
      </div>
    </div>
  );
}

export { HpBar };
export type { HpBarProps };
