/**
 * Compact Pokemon card component.
 *
 * Displays a Pokemon's sprite, name, and type badges in a card format.
 * Features a colored border based on the primary type and hover animation.
 *
 * @packageDocumentation
 */

import { type ReactNode, useCallback } from "react";
import { useQueryClient } from "@hex-di/query-react";
import { PokemonDetailQueryPort } from "../../ports/query/pokemon-detail-query.js";
import typeChart from "../../data/type-chart.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PokemonSummary {
  readonly id: number;
  readonly name: string;
  readonly spriteUrl: string;
  readonly types: readonly string[];
}

interface PokemonCardProps {
  readonly pokemon: PokemonSummary;
  readonly onClick: () => void;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PokemonCard({ pokemon, onClick }: PokemonCardProps): ReactNode {
  const primaryType = pokemon.types[0] ?? "normal";
  const borderColor = getTypeColor(primaryType);
  const queryClient = useQueryClient();

  const handlePointerEnter = useCallback(() => {
    void queryClient.prefetchQuery(PokemonDetailQueryPort, pokemon.id);
  }, [queryClient, pokemon.id]);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      className="group flex flex-col items-center rounded-xl border-2 bg-gray-900 p-4 shadow-md transition-transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
      style={{ borderColor }}
    >
      <img
        src={pokemon.spriteUrl}
        alt={pokemon.name}
        className="h-24 w-24 object-contain transition-transform group-hover:scale-110"
        loading="lazy"
      />
      <span className="mt-2 text-sm font-semibold text-white">{formatName(pokemon.name)}</span>
      <span className="text-xs text-gray-500">#{String(pokemon.id).padStart(3, "0")}</span>
      <div className="mt-2 flex gap-1">
        {pokemon.types.map(t => (
          <span
            key={t}
            className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: getTypeColor(t) }}
          >
            {t}
          </span>
        ))}
      </div>
    </button>
  );
}

export { PokemonCard };
export type { PokemonSummary };
