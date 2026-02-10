/**
 * Team suggestions component.
 *
 * Renders async-derived team suggestions based on type coverage gaps.
 * Shows loading, success (suggestion cards), and error states.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import { useAsyncDerived } from "@hex-di/store-react";
import { TeamSuggestionsPort } from "../../store/ports/team-suggestions.js";
import { getPokemonById, getTypeColor } from "./PokemonPicker.js";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TeamSuggestions({
  onAddToTeam,
}: {
  readonly onAddToTeam: (id: number) => void;
}): ReactNode {
  const { snapshot } = useAsyncDerived(TeamSuggestionsPort);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-3 text-lg font-bold text-indigo-400">Suggestions</h3>

      {snapshot.status === "loading" && (
        <div className="flex items-center gap-2 py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500" />
          <span className="text-sm text-gray-500">Analyzing type gaps...</span>
        </div>
      )}

      {snapshot.status === "error" && (
        <p className="py-4 text-sm text-red-400">Failed to compute suggestions</p>
      )}

      {snapshot.status === "success" && snapshot.data.length === 0 && (
        <p className="py-4 text-center text-xs text-gray-600">Your team has full type coverage!</p>
      )}

      {snapshot.status === "success" && snapshot.data.length > 0 && (
        <div className="space-y-2">
          {snapshot.data.map(suggestion => {
            const pokemon = getPokemonById(suggestion.pokemonId);
            return (
              <div
                key={suggestion.pokemonId}
                className="flex items-center gap-3 rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2"
              >
                {pokemon !== undefined && (
                  <img
                    src={pokemon.spriteUrl}
                    alt={suggestion.pokemonName}
                    className="h-8 w-8"
                    loading="lazy"
                  />
                )}
                <div className="flex-1">
                  <span className="text-sm capitalize text-gray-200">{suggestion.pokemonName}</span>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {suggestion.coversTypes.map(t => (
                      <span
                        key={t}
                        className="rounded-full px-1.5 py-0 text-[9px] font-medium text-white"
                        style={{ backgroundColor: getTypeColor(t) }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500">{suggestion.reason}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onAddToTeam(suggestion.pokemonId)}
                  className="rounded px-2 py-1 text-xs text-indigo-400 transition-colors hover:bg-indigo-500/20"
                >
                  + Add
                </button>
              </div>
            );
          })}
        </div>
      )}

      {snapshot.status === "idle" && (
        <p className="py-4 text-center text-xs text-gray-600">
          Add Pokemon to your team to see suggestions
        </p>
      )}
    </div>
  );
}

export { TeamSuggestions };
