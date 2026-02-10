/**
 * Type coverage analysis and suggestions panel.
 *
 * Given the current team composition, analyzes:
 * - Types covered (team is super-effective against)
 * - Types uncovered (no team member is super-effective against)
 * - Team weaknesses (types the team is weak to)
 * - Type suggestions to improve coverage
 *
 * @packageDocumentation
 */

import { type ReactNode, useMemo } from "react";
import { ALL_TYPES, getEffectiveness, getTypeColor } from "./type-data.js";
import type { TeamMember } from "./TeamBuilder.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TypeSuggestionsProps {
  readonly team: readonly TeamMember[];
}

interface CoverageAnalysis {
  readonly coveredTypes: readonly string[];
  readonly uncoveredTypes: readonly string[];
  readonly teamWeaknesses: readonly string[];
  readonly teamResistances: readonly string[];
  readonly suggestedTypes: readonly string[];
}

// ---------------------------------------------------------------------------
// Analysis logic
// ---------------------------------------------------------------------------

function analyzeTeamCoverage(team: readonly TeamMember[]): CoverageAnalysis {
  if (team.length === 0) {
    return {
      coveredTypes: [],
      uncoveredTypes: [...ALL_TYPES],
      teamWeaknesses: [],
      teamResistances: [],
      suggestedTypes: [],
    };
  }

  // Collect all unique types on the team for offensive coverage
  const teamTypes = new Set<string>();
  for (const member of team) {
    for (const t of member.types) {
      teamTypes.add(t);
    }
  }

  // A defending type is "covered" if at least one team member's type
  // is super-effective (2x) against it
  const coveredTypes: string[] = [];
  const uncoveredTypes: string[] = [];

  for (const defendType of ALL_TYPES) {
    let isCovered = false;
    for (const attackType of teamTypes) {
      if (getEffectiveness(attackType, [defendType]) >= 2) {
        isCovered = true;
        break;
      }
    }
    if (isCovered) {
      coveredTypes.push(defendType);
    } else {
      uncoveredTypes.push(defendType);
    }
  }

  // Team weaknesses: types that are super-effective against at least one
  // team member (considering their dual typing)
  const weaknessCount = new Map<string, number>();
  const resistCount = new Map<string, number>();

  for (const member of team) {
    for (const attackType of ALL_TYPES) {
      const mult = getEffectiveness(attackType, member.types);
      if (mult >= 2) {
        weaknessCount.set(attackType, (weaknessCount.get(attackType) ?? 0) + 1);
      } else if (mult > 0 && mult < 1) {
        resistCount.set(attackType, (resistCount.get(attackType) ?? 0) + 1);
      }
    }
  }

  // Types that hit 2+ team members are notable weaknesses
  const teamWeaknesses: string[] = [];
  for (const [typeName, count] of weaknessCount) {
    if (count >= 2) {
      teamWeaknesses.push(typeName);
    }
  }
  // If no type hits 2+ members, fall back to any type that hits at least 1
  if (teamWeaknesses.length === 0) {
    for (const [typeName] of weaknessCount) {
      teamWeaknesses.push(typeName);
    }
  }

  const teamResistances: string[] = [];
  for (const [typeName, count] of resistCount) {
    if (count >= 2) {
      teamResistances.push(typeName);
    }
  }

  // Suggestions: find types that would cover the most uncovered types
  const suggestions: { name: string; coversCount: number }[] = [];
  for (const candidateType of ALL_TYPES) {
    if (teamTypes.has(candidateType)) continue;
    let coversCount = 0;
    for (const uncovered of uncoveredTypes) {
      if (getEffectiveness(candidateType, [uncovered]) >= 2) {
        coversCount++;
      }
    }
    if (coversCount > 0) {
      suggestions.push({ name: candidateType, coversCount });
    }
  }
  suggestions.sort((a, b) => b.coversCount - a.coversCount);

  return {
    coveredTypes,
    uncoveredTypes,
    teamWeaknesses,
    teamResistances,
    suggestedTypes: suggestions.slice(0, 5).map(s => s.name),
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypeBadge({ name }: { readonly name: string }): ReactNode {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
      style={{ backgroundColor: getTypeColor(name) }}
    >
      {name}
    </span>
  );
}

function CoverageBar({
  covered,
  total,
}: {
  readonly covered: number;
  readonly total: number;
}): ReactNode {
  const pct = total > 0 ? (covered / total) * 100 : 0;
  const hue = pct > 66 ? 142 : pct > 33 ? 45 : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${String(pct)}%`,
            backgroundColor: `hsl(${String(hue)}, 70%, 50%)`,
          }}
        />
      </div>
      <span className="text-xs font-mono text-gray-400">
        {covered}/{total}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function TypeSuggestions({ team }: TypeSuggestionsProps): ReactNode {
  const analysis = useMemo(() => analyzeTeamCoverage(team), [team]);

  if (team.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-300">Type Coverage</h3>
        <p className="text-xs text-gray-500">
          Add Pokemon to your team to see type coverage analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-300">Type Coverage</h3>

      {/* Coverage bar */}
      <div className="mb-4">
        <p className="mb-1 text-xs text-gray-400">Offensive Coverage</p>
        <CoverageBar covered={analysis.coveredTypes.length} total={ALL_TYPES.length} />
      </div>

      {/* Covered types */}
      <div className="mb-3">
        <p className="mb-1 text-xs font-medium text-emerald-400">
          Covered ({analysis.coveredTypes.length})
        </p>
        <div className="flex flex-wrap gap-1">
          {analysis.coveredTypes.map(t => (
            <TypeBadge key={t} name={t} />
          ))}
        </div>
      </div>

      {/* Uncovered types */}
      {analysis.uncoveredTypes.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-amber-400">
            Uncovered ({analysis.uncoveredTypes.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {analysis.uncoveredTypes.map(t => (
              <TypeBadge key={t} name={t} />
            ))}
          </div>
        </div>
      )}

      {/* Team weaknesses */}
      {analysis.teamWeaknesses.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-red-400">Team Weaknesses</p>
          <p className="mb-1 text-[10px] text-gray-500">
            Types super-effective against multiple team members
          </p>
          <div className="flex flex-wrap gap-1">
            {analysis.teamWeaknesses.map(t => (
              <TypeBadge key={t} name={t} />
            ))}
          </div>
        </div>
      )}

      {/* Team resistances */}
      {analysis.teamResistances.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-blue-400">Team Resistances</p>
          <div className="flex flex-wrap gap-1">
            {analysis.teamResistances.map(t => (
              <TypeBadge key={t} name={t} />
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestedTypes.length > 0 && (
        <div className="rounded-lg border border-cyan-900/40 bg-cyan-900/10 p-3">
          <p className="mb-1 text-xs font-medium text-cyan-400">Suggested Types</p>
          <p className="mb-2 text-[10px] text-gray-500">
            Adding a Pokemon with these types would improve coverage
          </p>
          <div className="flex flex-wrap gap-1">
            {analysis.suggestedTypes.map(t => (
              <TypeBadge key={t} name={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { TypeSuggestions };
export type { TypeSuggestionsProps };
