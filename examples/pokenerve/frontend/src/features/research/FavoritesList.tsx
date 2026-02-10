/**
 * Favorites manager component.
 *
 * Shows a list of favorited Pokemon with the ability to toggle favorites,
 * sort by name/id/type, and view completion percentage against the full
 * 151 Gen 1 Pokedex.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useMemo, useCallback } from "react";
import { getPokemonById, getTypeColor } from "./PokemonPicker.js";
import type { PokemonEntry } from "./PokemonPicker.js";
import { PokemonPicker } from "./PokemonPicker.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_GEN1 = 151;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortMode = "id" | "name" | "type";

interface FavoritesListProps {
  readonly favorites: ReadonlySet<number>;
  readonly onToggleFavorite: (id: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortPokemon(entries: readonly PokemonEntry[], mode: SortMode): readonly PokemonEntry[] {
  const sorted = [...entries];
  switch (mode) {
    case "id":
      sorted.sort((a, b) => a.id - b.id);
      break;
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "type":
      sorted.sort((a, b) => {
        const typeA = a.types[0] ?? "";
        const typeB = b.types[0] ?? "";
        const cmp = typeA.localeCompare(typeB);
        return cmp !== 0 ? cmp : a.id - b.id;
      });
      break;
  }
  return sorted;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function FavoritesList({ favorites, onToggleFavorite }: FavoritesListProps): ReactNode {
  const [sortMode, setSortMode] = useState<SortMode>("id");
  const [showPicker, setShowPicker] = useState(false);

  const favoriteEntries = useMemo(() => {
    const entries: PokemonEntry[] = [];
    for (const id of favorites) {
      const entry = getPokemonById(id);
      if (entry !== undefined) {
        entries.push(entry);
      }
    }
    return sortPokemon(entries, sortMode);
  }, [favorites, sortMode]);

  const completionPct = useMemo(
    () => Math.round((favorites.size / TOTAL_GEN1) * 100),
    [favorites.size]
  );

  const handlePickerSelect = useCallback(
    (id: number) => {
      onToggleFavorite(id);
      setShowPicker(false);
    },
    [onToggleFavorite]
  );

  // Exclude already-favorited Pokemon from picker
  const excludeIds = favorites;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-pink-400">Favorites</h3>
        <span className="text-xs text-gray-500">
          {String(favorites.size)}/{String(TOTAL_GEN1)} ({String(completionPct)}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-pink-500 transition-all"
          style={{ width: `${String(completionPct)}%` }}
        />
      </div>

      {/* Sort controls */}
      <div className="mb-3 flex gap-1">
        {(["id", "name", "type"] satisfies readonly SortMode[]).map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setSortMode(mode)}
            className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
              sortMode === mode
                ? "bg-pink-500/20 text-pink-300"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {mode === "id" ? "#" : mode}
          </button>
        ))}
      </div>

      {/* Favorites list */}
      <div className="max-h-80 space-y-1.5 overflow-y-auto">
        {favoriteEntries.map(pokemon => (
          <div
            key={pokemon.id}
            className="flex items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-1.5"
          >
            <img src={pokemon.spriteUrl} alt={pokemon.name} className="h-8 w-8" loading="lazy" />
            <div className="flex-1">
              <span className="text-sm capitalize text-gray-200">{pokemon.name}</span>
              <div className="flex gap-1">
                {pokemon.types.map(t => (
                  <span
                    key={t}
                    className="rounded-full px-1.5 py-0 text-[9px] font-medium text-white"
                    style={{ backgroundColor: getTypeColor(t) }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(pokemon.id)}
              className="text-pink-400 transition-colors hover:text-pink-300"
              aria-label={`Remove ${pokemon.name} from favorites`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add favorite */}
      <div className="mt-3">
        {showPicker ? (
          <div className="space-y-2">
            <PokemonPicker
              onSelect={handlePickerSelect}
              placeholder="Search to add favorite..."
              excludeIds={excludeIds}
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
            className="w-full rounded-lg border border-dashed border-gray-700 py-2 text-sm text-gray-500 transition-colors hover:border-pink-500 hover:text-pink-400"
          >
            + Add Favorite
          </button>
        )}
      </div>

      {/* Empty state */}
      {favorites.size === 0 && !showPicker && (
        <p className="mt-2 text-center text-xs text-gray-600">
          Add your favorite Pokemon to track them
        </p>
      )}
    </div>
  );
}

export { FavoritesList };
