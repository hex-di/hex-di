/**
 * Responsive Pokemon grid layout.
 *
 * Displays a grid of PokemonCard components with responsive columns.
 * Handles loading skeleton state and empty results messaging.
 *
 * @packageDocumentation
 */

import { type ReactNode } from "react";
import { PokemonCard } from "./PokemonCard.js";
import type { PokemonSummary } from "./PokemonCard.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PokemonGridProps {
  readonly pokemon: readonly PokemonSummary[];
  readonly onPokemonClick: (id: number) => void;
  readonly isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCard(): ReactNode {
  return (
    <div className="flex animate-pulse flex-col items-center rounded-xl border-2 border-gray-800 bg-gray-900 p-4">
      <div className="h-24 w-24 rounded-full bg-gray-800" />
      <div className="mt-3 h-4 w-20 rounded bg-gray-800" />
      <div className="mt-2 h-3 w-12 rounded bg-gray-800" />
      <div className="mt-2 flex gap-1">
        <div className="h-5 w-12 rounded-full bg-gray-800" />
        <div className="h-5 w-12 rounded-full bg-gray-800" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PokemonGrid({ pokemon, onPokemonClick, isLoading }: PokemonGridProps): ReactNode {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 20 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (pokemon.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <svg className="mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-lg font-medium">No Pokemon found</p>
        <p className="mt-1 text-sm">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {pokemon.map(p => (
        <PokemonCard key={p.id} pokemon={p} onClick={() => onPokemonClick(p.id)} />
      ))}
    </div>
  );
}

export { PokemonGrid };
