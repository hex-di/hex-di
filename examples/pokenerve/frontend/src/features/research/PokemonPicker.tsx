/**
 * Shared Pokemon selector component.
 *
 * Provides a searchable dropdown backed by gen1 static data.
 * Shows sprite, name, and types for each result.
 * Used by TeamStats and FavoritesList to select Pokemon.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useMemo, useCallback, useRef, useEffect } from "react";
import gen1Data from "../../data/gen1-pokemon.json";
import typeChartJson from "../../data/type-chart.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PokemonPickerProps {
  readonly onSelect: (pokemonId: number) => void;
  readonly placeholder?: string;
  readonly excludeIds?: ReadonlySet<number>;
}

interface PokemonEntry {
  readonly id: number;
  readonly name: string;
  readonly types: readonly string[];
  readonly spriteUrl: string;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const allPokemon: readonly PokemonEntry[] = gen1Data.map(entry => ({
  id: entry.id,
  name: entry.name,
  types: entry.types.map(t => t.type.name),
  spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${String(entry.id)}.png`,
}));

/**
 * Pre-compute a Map from type name to its color hex string.
 * This avoids needing type casts when indexing the JSON colors object.
 */
const typeColorMap = new Map(Object.entries(typeChartJson.colors));

function getTypeColor(typeName: string): string {
  return typeColorMap.get(typeName) ?? "#888888";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PokemonPicker({ onSelect, placeholder, excludeIds }: PokemonPickerProps): ReactNode {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (query.length === 0) return [];
    const lower = query.toLowerCase();
    return allPokemon
      .filter(p => {
        if (excludeIds !== undefined && excludeIds.has(p.id)) return false;
        return p.name.includes(lower) || String(p.id).includes(lower);
      })
      .slice(0, 10);
  }, [query, excludeIds]);

  const handleSelect = useCallback(
    (pokemonId: number) => {
      setQuery("");
      setIsOpen(false);
      onSelect(pokemonId);
    },
    [onSelect]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      const target = event.target;
      if (
        containerRef.current !== null &&
        target instanceof Node &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder ?? "Search Pokemon by name or ID..."}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
          {filtered.map(pokemon => (
            <button
              key={pokemon.id}
              type="button"
              onClick={() => handleSelect(pokemon.id)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
            >
              <img src={pokemon.spriteUrl} alt={pokemon.name} className="h-8 w-8" loading="lazy" />
              <span className="font-medium capitalize">{pokemon.name}</span>
              <span className="ml-1 flex gap-1">
                {pokemon.types.map(t => (
                  <span
                    key={t}
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: getTypeColor(t) }}
                  >
                    {t}
                  </span>
                ))}
              </span>
              <span className="ml-auto text-xs text-gray-600">#{String(pokemon.id)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lookup helper (exported for other components)
// ---------------------------------------------------------------------------

function getPokemonById(id: number): PokemonEntry | undefined {
  return allPokemon.find(p => p.id === id);
}

export { PokemonPicker, getPokemonById, getTypeColor, allPokemon };
export type { PokemonEntry };
