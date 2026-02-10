/**
 * Pokemon selector component for trading.
 *
 * Provides a searchable dropdown to pick a Pokemon from the Gen 1 dataset.
 * Displays the selected Pokemon's sprite, name, and type badges.
 * Used in pairs: one for "offer" and one for "request".
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useMemo } from "react";
import gen1Data from "../../data/gen1-pokemon.json";
import typeChart from "../../data/type-chart.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Gen1Entry {
  readonly id: number;
  readonly name: string;
  readonly types: readonly { readonly type: { readonly name: string } }[];
  readonly sprites: { readonly front_default: string | null };
}

interface PokemonSelectorProps {
  readonly label: string;
  readonly selectedId: number | null;
  readonly onSelect: (id: number) => void;
  readonly disabledId?: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeColors: Record<string, string> = typeChart.colors;

function getTypeColor(typeName: string): string {
  return typeColors[typeName] ?? "#A8A77A";
}

function formatName(name: string): string {
  return name
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${String(id)}.png`;
}

const pokemonEntries: readonly Gen1Entry[] = gen1Data.map(entry => ({
  id: entry.id,
  name: entry.name,
  types: entry.types,
  sprites: entry.sprites,
}));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PokemonSelector({
  label,
  selectedId,
  onSelect,
  disabledId,
}: PokemonSelectorProps): ReactNode {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredPokemon = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (term === "") return pokemonEntries;
    return pokemonEntries.filter(p => p.name.includes(term) || String(p.id).includes(term));
  }, [search]);

  const selectedPokemon = useMemo(
    () => pokemonEntries.find(p => p.id === selectedId) ?? null,
    [selectedId]
  );

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold uppercase tracking-wider text-gray-400">{label}</span>

      {/* Selected Pokemon display */}
      {selectedPokemon !== null ? (
        <div className="flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
          <img
            src={getSpriteUrl(selectedPokemon.id)}
            alt={selectedPokemon.name}
            className="h-20 w-20 object-contain"
          />
          <div className="flex flex-col gap-1">
            <span className="text-lg font-bold text-white">{formatName(selectedPokemon.name)}</span>
            <span className="text-xs text-gray-500">
              #{String(selectedPokemon.id).padStart(3, "0")}
            </span>
            <div className="flex gap-1">
              {selectedPokemon.types.map(t => (
                <span
                  key={t.type.name}
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: getTypeColor(t.type.name) }}
                >
                  {t.type.name}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="ml-auto rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-amber-500 hover:text-amber-400"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/30 p-8 text-gray-500 transition-colors hover:border-amber-500/50 hover:text-amber-400"
        >
          Click to select a Pokemon
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
          {/* Search input */}
          <div className="border-b border-gray-800 p-3">
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500"
              autoFocus
            />
          </div>

          {/* Pokemon list */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredPokemon.map(pokemon => {
              const isDisabled = pokemon.id === disabledId;
              return (
                <button
                  key={pokemon.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onSelect(pokemon.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    isDisabled
                      ? "cursor-not-allowed opacity-40"
                      : pokemon.id === selectedId
                        ? "bg-amber-500/20 text-amber-300"
                        : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <img
                    src={getSpriteUrl(pokemon.id)}
                    alt={pokemon.name}
                    className="h-8 w-8 object-contain"
                    loading="lazy"
                  />
                  <span className="text-sm font-medium">{formatName(pokemon.name)}</span>
                  <span className="text-xs text-gray-600">
                    #{String(pokemon.id).padStart(3, "0")}
                  </span>
                  <div className="ml-auto flex gap-1">
                    {pokemon.types.map(t => (
                      <span
                        key={t.type.name}
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: getTypeColor(t.type.name) }}
                      >
                        {t.type.name}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
            {filteredPokemon.length === 0 && (
              <div className="py-4 text-center text-sm text-gray-500">No Pokemon found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { PokemonSelector };
export type { PokemonSelectorProps };
