/**
 * Slide-out Pokemon detail panel.
 *
 * Fetches full Pokemon data via useQuery(PokemonDetailQueryPort) and
 * displays name, sprite, stats as horizontal bars, abilities list,
 * and truncated moves table. Handles loading and error states.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import { useQuery } from "@hex-di/query-react";
import { PokemonDetailQueryPort } from "../../ports/query/pokemon-detail-query.js";
import type { Pokemon, PokemonApiError } from "@pokenerve/shared/types/pokemon";
import typeChart from "../../data/type-chart.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PokemonDetailProps {
  readonly pokemonId: number;
  readonly onClose: () => void;
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

const STAT_MAX = 255;

const statLabels: Record<string, string> = {
  hp: "HP",
  attack: "ATK",
  defense: "DEF",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "SPD",
};

function statColor(value: number): string {
  if (value >= 120) return "bg-emerald-500";
  if (value >= 90) return "bg-green-500";
  if (value >= 60) return "bg-yellow-500";
  if (value >= 30) return "bg-orange-500";
  return "bg-red-500";
}

function formatErrorMessage(error: PokemonApiError): string {
  switch (error._tag) {
    case "NetworkError":
      return `Network error: ${error.message}`;
    case "NotFoundError":
      return `Pokemon #${String(error.pokemonId)} not found`;
    case "RateLimitError":
      return `Rate limited. Retry in ${String(Math.ceil(error.retryAfterMs / 1000))}s`;
    case "ParseError":
      return `Parse error: ${error.message}`;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatBar({ name, value }: { readonly name: string; readonly value: number }): ReactNode {
  const label = statLabels[name] ?? name.toUpperCase();
  const pct = Math.min((value / STAT_MAX) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right text-xs font-medium text-gray-400">{label}</span>
      <span className="w-8 text-right text-xs font-semibold text-white">{value}</span>
      <div className="h-2 flex-1 rounded-full bg-gray-800">
        <div
          className={`h-2 rounded-full transition-all ${statColor(value)}`}
          style={{ width: `${String(pct)}%` }}
        />
      </div>
    </div>
  );
}

function DetailLoading(): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-emerald-500" />
      <p className="mt-4 text-sm text-gray-400">Loading Pokemon data...</p>
    </div>
  );
}

function DetailError({
  error,
  onRetry,
}: {
  readonly error: PokemonApiError;
  readonly onRetry: () => void;
}): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <svg
        className="mb-4 h-12 w-12 text-red-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <p className="text-sm">{formatErrorMessage(error)}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
      >
        Retry
      </button>
    </div>
  );
}

function DetailLoaded({ pokemon }: { readonly pokemon: Pokemon }): ReactNode {
  const spriteUrl =
    pokemon.sprites.other?.["official-artwork"]?.front_default ??
    pokemon.sprites.front_default ??
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${String(pokemon.id)}.png`;

  const movesToShow = pokemon.moves.slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center">
        <img src={spriteUrl} alt={pokemon.name} className="h-40 w-40 object-contain" />
        <h3 className="mt-2 text-xl font-bold text-white">{formatName(pokemon.name)}</h3>
        <span className="text-sm text-gray-500">#{String(pokemon.id).padStart(3, "0")}</span>
        <div className="mt-2 flex gap-2">
          {pokemon.types.map(t => (
            <span
              key={t.type.name}
              className="rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: getTypeColor(t.type.name) }}
            >
              {t.type.name}
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span>Height: {(pokemon.height / 10).toFixed(1)}m</span>
          <span>Weight: {(pokemon.weight / 10).toFixed(1)}kg</span>
          <span>XP: {pokemon.base_experience}</span>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Base Stats
        </h4>
        <div className="flex flex-col gap-2">
          {pokemon.stats.map(s => (
            <StatBar key={s.stat.name} name={s.stat.name} value={s.base_stat} />
          ))}
        </div>
      </div>

      {/* Abilities */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Abilities
        </h4>
        <div className="flex flex-wrap gap-2">
          {pokemon.abilities.map(a => (
            <span
              key={a.ability.name}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                a.is_hidden
                  ? "border-purple-700 bg-purple-900/30 text-purple-300"
                  : "border-gray-700 bg-gray-800 text-gray-300"
              }`}
            >
              {formatName(a.ability.name)}
              {a.is_hidden && <span className="ml-1 text-purple-500">(Hidden)</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Moves (truncated) */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Moves ({pokemon.moves.length} total)
        </h4>
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-800 bg-gray-900">
              <tr>
                <th className="px-3 py-2 font-medium text-gray-400">Move</th>
              </tr>
            </thead>
            <tbody>
              {movesToShow.map(m => (
                <tr key={m.move.name} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-3 py-2 text-gray-300">{formatName(m.move.name)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pokemon.moves.length > 10 && (
            <div className="border-t border-gray-800 px-3 py-2 text-center text-xs text-gray-500">
              +{pokemon.moves.length - 10} more moves
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function PokemonDetail({ pokemonId, onClose }: PokemonDetailProps): ReactNode {
  const queryState = useQuery(PokemonDetailQueryPort, pokemonId);

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-800 bg-gray-950 shadow-2xl">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Pokemon Detail
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {queryState.isPending && <DetailLoading />}
        {queryState.isError && queryState.error !== null && "_tag" in queryState.error && (
          <DetailError
            error={queryState.error as PokemonApiError}
            onRetry={() => {
              void queryState.refetch();
            }}
          />
        )}
        {queryState.isSuccess && queryState.data !== undefined && (
          <DetailLoaded pokemon={queryState.data} />
        )}
      </div>
    </div>
  );
}

export { PokemonDetail };
