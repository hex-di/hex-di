/**
 * Team composition manager component.
 *
 * Displays the current team of up to 6 Pokemon with add/remove functionality.
 * Computes team power (sum of base stats), type coverage analysis (types the
 * team is super-effective against), and type weakness analysis (types the team
 * takes super-effective damage from) using the type-chart.json data.
 *
 * @packageDocumentation
 */

import { type ReactNode, useMemo, useState, useCallback } from "react";
import typeChartJson from "../../data/type-chart.json";
import gen1Data from "../../data/gen1-pokemon.json";
import { PokemonPicker, getPokemonById, getTypeColor } from "./PokemonPicker.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TEAM_SIZE = 6;
const SUPER_EFFECTIVE_THRESHOLD = 2;

const allTypes = typeChartJson.types;

/**
 * Pre-compute a Map from type name to its multiplier array.
 * This avoids needing type casts when indexing the JSON chart object.
 */
const typeMultipliersMap = new Map(
  Object.entries(typeChartJson.chart).map(([typeName, multipliers]) => [typeName, multipliers])
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TeamStatsProps {
  readonly team: readonly number[];
  readonly onAddPokemon: (id: number) => void;
  readonly onRemovePokemon: (id: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBaseStatTotal(pokemonId: number): number {
  const entry = gen1Data.find(p => p.id === pokemonId);
  if (entry === undefined) return 0;
  return entry.stats.reduce((sum, s) => sum + s.base_stat, 0);
}

function getPokemonTypes(pokemonId: number): readonly string[] {
  const entry = gen1Data.find(p => p.id === pokemonId);
  if (entry === undefined) return [];
  return entry.types.map(t => t.type.name);
}

/**
 * Compute which types the team can deal super-effective damage to.
 * A type is "covered" if at least one team member has an attacking type
 * that is super-effective (2x) against it.
 */
function computeTypeCoverage(teamIds: readonly number[]): readonly string[] {
  const covered = new Set<string>();

  for (const id of teamIds) {
    const types = getPokemonTypes(id);
    for (const attackType of types) {
      const multipliers = typeMultipliersMap.get(attackType);
      if (multipliers === undefined) continue;
      for (let i = 0; i < allTypes.length; i++) {
        if (multipliers[i] >= SUPER_EFFECTIVE_THRESHOLD) {
          covered.add(allTypes[i]);
        }
      }
    }
  }

  return [...covered].sort();
}

/**
 * Compute which types the team is weak to.
 * A type is a "weakness" if at least one team member takes super-effective
 * damage (2x) from it. We check all attacking types against each team member's
 * defensive types.
 */
function computeTypeWeaknesses(teamIds: readonly number[]): readonly string[] {
  const weakTo = new Set<string>();

  for (const id of teamIds) {
    const defenseTypes = getPokemonTypes(id);
    for (const attackingType of allTypes) {
      const multipliers = typeMultipliersMap.get(attackingType);
      if (multipliers === undefined) continue;
      for (const defType of defenseTypes) {
        const defIndex = allTypes.indexOf(defType);
        if (defIndex >= 0 && multipliers[defIndex] >= SUPER_EFFECTIVE_THRESHOLD) {
          weakTo.add(attackingType);
        }
      }
    }
  }

  return [...weakTo].sort();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypeBadge({ typeName }: { readonly typeName: string }): ReactNode {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
      style={{ backgroundColor: getTypeColor(typeName) }}
    >
      {typeName}
    </span>
  );
}

function TeamMemberCard({
  pokemonId,
  onRemove,
}: {
  readonly pokemonId: number;
  readonly onRemove: () => void;
}): ReactNode {
  const pokemon = getPokemonById(pokemonId);
  if (pokemon === undefined) return null;

  const bst = getBaseStatTotal(pokemonId);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
      <img src={pokemon.spriteUrl} alt={pokemon.name} className="h-10 w-10" loading="lazy" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize text-gray-200">{pokemon.name}</span>
          <span className="text-xs text-gray-500">#{String(pokemon.id)}</span>
        </div>
        <div className="mt-0.5 flex gap-1">
          {pokemon.types.map(t => (
            <TypeBadge key={t} typeName={t} />
          ))}
          <span className="ml-2 text-[10px] text-gray-500">BST {String(bst)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-1 text-gray-500 transition-colors hover:bg-red-900/30 hover:text-red-400"
        aria-label={`Remove ${pokemon.name} from team`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TeamStats({ team, onAddPokemon, onRemovePokemon }: TeamStatsProps): ReactNode {
  const [showPicker, setShowPicker] = useState(false);

  const teamPower = useMemo(() => team.reduce((sum, id) => sum + getBaseStatTotal(id), 0), [team]);

  const coverage = useMemo(() => computeTypeCoverage(team), [team]);
  const weaknesses = useMemo(() => computeTypeWeaknesses(team), [team]);

  const teamIdsSet = useMemo(() => new Set(team), [team]);

  const handleAdd = useCallback(
    (id: number) => {
      onAddPokemon(id);
      setShowPicker(false);
    },
    [onAddPokemon]
  );

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-blue-400">Team</h3>
        <span className="text-xs text-gray-500">
          {String(team.length)}/{String(MAX_TEAM_SIZE)}
        </span>
      </div>

      {/* Team members */}
      <div className="space-y-2">
        {team.map(id => (
          <TeamMemberCard key={id} pokemonId={id} onRemove={() => onRemovePokemon(id)} />
        ))}
      </div>

      {/* Add button */}
      {team.length < MAX_TEAM_SIZE && (
        <div className="mt-3">
          {showPicker ? (
            <div className="space-y-2">
              <PokemonPicker
                onSelect={handleAdd}
                placeholder="Add Pokemon to team..."
                excludeIds={teamIdsSet}
              />
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full rounded-lg border border-dashed border-gray-700 py-2 text-sm text-gray-500 transition-colors hover:border-blue-500 hover:text-blue-400"
            >
              + Add Pokemon
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {team.length === 0 && !showPicker && (
        <p className="mt-2 text-center text-xs text-gray-600">Add Pokemon to build your team</p>
      )}

      {/* Team power */}
      {team.length > 0 && (
        <div className="mt-4 rounded-lg bg-gray-800/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Team Power</span>
            <span className="text-sm font-bold text-blue-300">{String(teamPower)}</span>
          </div>

          {/* Type Coverage */}
          <div className="mt-3">
            <span className="text-xs font-medium text-emerald-400">
              Coverage ({String(coverage.length)}/{String(allTypes.length)} types)
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {coverage.length > 0 ? (
                coverage.map(t => <TypeBadge key={t} typeName={t} />)
              ) : (
                <span className="text-[10px] text-gray-600">None</span>
              )}
            </div>
          </div>

          {/* Type Weaknesses */}
          <div className="mt-3">
            <span className="text-xs font-medium text-red-400">
              Weaknesses ({String(weaknesses.length)} types)
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {weaknesses.length > 0 ? (
                weaknesses.map(t => <TypeBadge key={t} typeName={t} />)
              ) : (
                <span className="text-[10px] text-gray-600">None</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { TeamStats };
