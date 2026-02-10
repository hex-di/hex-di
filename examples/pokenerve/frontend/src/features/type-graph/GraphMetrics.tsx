/**
 * Type analysis metrics panel.
 *
 * Shows offensive coverage, defensive profile, and a power ranking
 * for the currently selected type based on its matchup totals.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import {
  getTypeColor,
  getOffensiveRelations,
  getDefensiveProfile,
  ALL_TYPES,
} from "./type-data.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GraphMetricsProps {
  readonly selectedType: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute a simple power score: (SE wins) - (weaknesses) + 0.5*(resistances) + (immunities). */
function computePowerScore(typeName: string): number {
  const offense = getOffensiveRelations(typeName);
  const defense = getDefensiveProfile(typeName);

  return (
    offense.superEffective.length * 1.0 -
    defense.weakTo.length * 1.0 +
    defense.resists.length * 0.5 +
    defense.immuneTo.length * 1.5 +
    offense.immune.length * -0.5
  );
}

/** Compute power rankings for all types, sorted descending by score. */
function computeAllRankings(): readonly { readonly name: string; readonly score: number }[] {
  const rankings = ALL_TYPES.map(name => ({
    name,
    score: computePowerScore(name),
  }));
  rankings.sort((a, b) => b.score - a.score);
  return rankings;
}

const allRankings = computeAllRankings();

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypeBadge({ name }: { readonly name: string }): ReactNode {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: getTypeColor(name) }}
    >
      {name}
    </span>
  );
}

function MetricSection({
  title,
  count,
  types,
  emptyText,
}: {
  readonly title: string;
  readonly count: number;
  readonly types: readonly string[];
  readonly emptyText: string;
}): ReactNode {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-gray-400">{title}</span>
        <span className="text-xs text-gray-500">
          {count}/{ALL_TYPES.length}
        </span>
      </div>
      {types.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {types.map(t => (
            <TypeBadge key={t} name={t} />
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-gray-600">{emptyText}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function GraphMetrics({ selectedType }: GraphMetricsProps): ReactNode {
  const offense = getOffensiveRelations(selectedType);
  const defense = getDefensiveProfile(selectedType);
  const rank = allRankings.findIndex(r => r.name === selectedType);
  const score = allRankings[rank]?.score ?? 0;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: getTypeColor(selectedType) }}
        />
        <h3 className="text-sm font-bold capitalize text-white">{selectedType} Analysis</h3>
        <span className="ml-auto rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
          Rank #{rank + 1}/{ALL_TYPES.length}
        </span>
      </div>

      {/* Power score bar */}
      <div className="mb-4">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-xs text-gray-400">Power Score</span>
          <span className="text-xs font-mono text-cyan-400">{score.toFixed(1)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.max(0, Math.min(100, ((score + 5) / 15) * 100))}%`,
              backgroundColor: getTypeColor(selectedType),
            }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {/* Offensive section */}
        <div className="rounded-lg bg-gray-800/50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Offense
          </p>
          <div className="space-y-2">
            <MetricSection
              title="Super Effective Against"
              count={offense.superEffective.length}
              types={offense.superEffective}
              emptyText="No super-effective matchups"
            />
            <MetricSection
              title="Not Very Effective Against"
              count={offense.notVeryEffective.length}
              types={offense.notVeryEffective}
              emptyText="No resisted matchups"
            />
            <MetricSection
              title="No Effect On"
              count={offense.immune.length}
              types={offense.immune}
              emptyText="No immunities"
            />
          </div>
        </div>

        {/* Defensive section */}
        <div className="rounded-lg bg-gray-800/50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-400">
            Defense
          </p>
          <div className="space-y-2">
            <MetricSection
              title="Weak To"
              count={defense.weakTo.length}
              types={defense.weakTo}
              emptyText="No weaknesses"
            />
            <MetricSection
              title="Resists"
              count={defense.resists.length}
              types={defense.resists}
              emptyText="No resistances"
            />
            <MetricSection
              title="Immune To"
              count={defense.immuneTo.length}
              types={defense.immuneTo}
              emptyText="No immunities"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export { GraphMetrics };
export type { GraphMetricsProps };
