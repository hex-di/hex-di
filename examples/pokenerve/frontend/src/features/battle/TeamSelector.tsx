/**
 * Team selection component for pre-battle Pokemon team building.
 *
 * Displays a scrollable grid of Gen 1 Pokemon to choose from. The player
 * selects 3 Pokemon for their team. The AI team is randomly generated
 * when the player clicks "Start Battle".
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useMemo, useCallback } from "react";
import type { Pokemon, Move } from "@pokenerve/shared/types/pokemon";
import type { BattlePokemon, StatStages } from "@pokenerve/shared/types/battle";
import gen1Data from "../../data/gen1-pokemon.json";
import typeChartJson from "../../data/type-chart.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamSelectorProps {
  readonly onStartBattle: (
    playerTeam: readonly BattlePokemon[],
    opponentTeam: readonly BattlePokemon[]
  ) => void;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const allPokemon: readonly Pokemon[] = gen1Data;
const typeColors: Record<string, string> = typeChartJson.colors;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultStatStages(): StatStages {
  return {
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
    accuracy: 0,
    evasion: 0,
  };
}

function toBattlePokemon(pokemon: Pokemon): BattlePokemon {
  const hpStat = pokemon.stats.find(s => s.stat.name === "hp");
  const hp = hpStat ? hpStat.base_stat * 2 + 110 : 200;

  const moves = pokemon.moves.slice(0, 4).map(
    (
      pm
    ): {
      readonly move: Move;
      readonly currentPp: number;
      readonly maxPp: number;
    } => ({
      move: {
        id: 0,
        name: pm.move.name,
        type: { name: pokemon.types[0]?.type.name ?? "normal", url: "" },
        power: 50,
        pp: 15,
        accuracy: 100,
        damage_class: { name: "physical", url: "" },
        effect_entries: [],
        priority: 0,
      },
      currentPp: 15,
      maxPp: 15,
    })
  );

  return {
    pokemon,
    currentHp: hp,
    maxHp: hp,
    statStages: defaultStatStages(),
    status: null,
    moves,
    isActive: true,
  };
}

function getRandomTeam(size: number, exclude: ReadonlySet<number>): readonly BattlePokemon[] {
  const available = allPokemon.filter(p => !exclude.has(p.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, size).map(toBattlePokemon);
}

function formatName(name: string): string {
  return name
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTypeColor(typeName: string): string {
  return typeColors[typeName] ?? "#A8A77A";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TeamSelector({ onStartBattle }: TeamSelectorProps): ReactNode {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPokemon = useMemo(() => {
    if (searchQuery.length === 0) return allPokemon;
    const lower = searchQuery.toLowerCase();
    return allPokemon.filter(p => p.name.includes(lower));
  }, [searchQuery]);

  const togglePokemon = useCallback((pokemonId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(pokemonId)) {
        next.delete(pokemonId);
      } else if (next.size < 3) {
        next.add(pokemonId);
      }
      return next;
    });
  }, []);

  const handleStartBattle = useCallback(() => {
    const playerTeam = allPokemon.filter(p => selectedIds.has(p.id)).map(toBattlePokemon);

    const opponentTeam = getRandomTeam(3, selectedIds);
    onStartBattle(playerTeam, opponentTeam);
  }, [selectedIds, onStartBattle]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-xl font-bold text-red-400">Choose Your Team</h3>
        <p className="mt-1 text-sm text-gray-400">
          Select 3 Pokemon for your battle team. Your opponent's team will be randomly generated.
        </p>
        <div className="mt-3 flex items-center gap-4">
          <span className="text-sm text-gray-500">Selected: {selectedIds.size} / 3</span>
          <button
            type="button"
            onClick={handleStartBattle}
            disabled={selectedIds.size !== 3}
            className={`rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${
              selectedIds.size === 3
                ? "bg-red-600 text-white hover:bg-red-500"
                : "cursor-not-allowed bg-gray-700 text-gray-500"
            }`}
          >
            Start Battle
          </button>
        </div>
      </div>

      {/* Selected team preview */}
      {selectedIds.size > 0 && (
        <div className="flex gap-3">
          {allPokemon
            .filter(p => selectedIds.has(p.id))
            .map(p => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-900/20 px-3 py-2"
              >
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${String(p.id)}.png`}
                  alt={p.name}
                  className="h-10 w-10"
                  loading="lazy"
                />
                <span className="text-sm font-medium capitalize text-red-300">{p.name}</span>
                <button
                  type="button"
                  onClick={() => togglePokemon(p.id)}
                  className="ml-1 text-xs text-red-500 hover:text-red-300"
                >
                  x
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Search bar */}
      <input
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search Pokemon..."
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-red-500 focus:outline-none"
      />

      {/* Pokemon grid */}
      <div className="grid max-h-96 grid-cols-3 gap-2 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 p-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {filteredPokemon.map(pokemon => {
          const isSelected = selectedIds.has(pokemon.id);
          const canSelect = selectedIds.size < 3 || isSelected;

          return (
            <button
              key={pokemon.id}
              type="button"
              onClick={() => togglePokemon(pokemon.id)}
              disabled={!canSelect}
              className={`flex flex-col items-center rounded-lg border-2 p-2 transition-all ${
                isSelected
                  ? "border-red-500 bg-red-900/30"
                  : canSelect
                    ? "border-gray-800 bg-gray-800/50 hover:border-gray-600"
                    : "cursor-not-allowed border-gray-800 bg-gray-800/30 opacity-40"
              }`}
            >
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${String(pokemon.id)}.png`}
                alt={pokemon.name}
                className="h-16 w-16 object-contain"
                loading="lazy"
              />
              <span className="mt-1 text-xs font-medium text-white">
                {formatName(pokemon.name)}
              </span>
              <div className="mt-1 flex gap-0.5">
                {pokemon.types.map(t => (
                  <span
                    key={t.type.name}
                    className="rounded-full px-1.5 py-0.5 text-[10px] text-white"
                    style={{ backgroundColor: getTypeColor(t.type.name) }}
                  >
                    {t.type.name}
                  </span>
                ))}
              </div>
              {isSelected && (
                <span className="mt-1 text-[10px] font-bold text-red-400">SELECTED</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { TeamSelector, toBattlePokemon };
export type { TeamSelectorProps };
