/**
 * Battle field component showing the active battle arena.
 *
 * Displays the opposing Pokemon at the top and the player's Pokemon at the
 * bottom, with sprites, names, HP bars, and status indicators. Shows
 * weather/terrain indicators if active.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import type { BattlePokemon, Weather, Terrain } from "@pokenerve/shared/types/battle";
import { HpBar } from "./HpBar.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BattleFieldProps {
  readonly playerPokemon: BattlePokemon;
  readonly opponentPokemon: BattlePokemon;
  readonly weather: Weather;
  readonly terrain: Terrain;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatName(name: string): string {
  return name
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSpriteUrl(pokemonId: number, back: boolean): string {
  const variant = back ? "back/" : "";
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${variant}${String(pokemonId)}.png`;
}

function getWeatherLabel(weather: Weather): string | null {
  switch (weather) {
    case "sun":
      return "Harsh Sunlight";
    case "rain":
      return "Heavy Rain";
    case "sandstorm":
      return "Sandstorm";
    case "hail":
      return "Hail";
    case "none":
      return null;
  }
}

function getTerrainLabel(terrain: Terrain): string | null {
  switch (terrain) {
    case "electric":
      return "Electric Terrain";
    case "grassy":
      return "Grassy Terrain";
    case "misty":
      return "Misty Terrain";
    case "psychic":
      return "Psychic Terrain";
    case "none":
      return null;
  }
}

function getStatusBadge(status: BattlePokemon["status"]): ReactNode {
  if (status === null) return null;

  const labels: Record<string, string> = {
    burn: "BRN",
    freeze: "FRZ",
    paralysis: "PAR",
    poison: "PSN",
    "bad-poison": "TOX",
    sleep: "SLP",
  };

  const colors: Record<string, string> = {
    burn: "bg-red-600",
    freeze: "bg-cyan-600",
    paralysis: "bg-yellow-600",
    poison: "bg-purple-600",
    "bad-poison": "bg-purple-700",
    sleep: "bg-gray-500",
  };

  return (
    <span
      className={`ml-2 rounded px-1.5 py-0.5 text-xs font-bold text-white ${colors[status] ?? "bg-gray-600"}`}
    >
      {labels[status] ?? status.toUpperCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Pokemon Display
// ---------------------------------------------------------------------------

function PokemonDisplay({
  pokemon,
  isPlayer,
}: {
  readonly pokemon: BattlePokemon;
  readonly isPlayer: boolean;
}): ReactNode {
  const spriteUrl = getSpriteUrl(pokemon.pokemon.id, isPlayer);
  const fainted = pokemon.currentHp <= 0;

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900/80 p-4 ${
        fainted ? "opacity-50" : ""
      }`}
    >
      <img
        src={spriteUrl}
        alt={pokemon.pokemon.name}
        className={`h-24 w-24 object-contain ${fainted ? "grayscale" : ""}`}
        loading="lazy"
      />
      <div className="flex-1">
        <div className="flex items-center">
          <span className="text-lg font-bold text-white">{formatName(pokemon.pokemon.name)}</span>
          {getStatusBadge(pokemon.status)}
        </div>
        <div className="mt-1 flex gap-1">
          {pokemon.pokemon.types.map(t => (
            <span
              key={t.type.name}
              className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
            >
              {t.type.name}
            </span>
          ))}
        </div>
        <div className="mt-2">
          <HpBar currentHp={pokemon.currentHp} maxHp={pokemon.maxHp} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function BattleField({
  playerPokemon,
  opponentPokemon,
  weather,
  terrain,
}: BattleFieldProps): ReactNode {
  const weatherLabel = getWeatherLabel(weather);
  const terrainLabel = getTerrainLabel(terrain);

  return (
    <div className="space-y-4">
      {/* Weather/Terrain indicators */}
      {(weatherLabel !== null || terrainLabel !== null) && (
        <div className="flex justify-center gap-3">
          {weatherLabel !== null && (
            <span className="rounded-full bg-cyan-900/50 px-3 py-1 text-xs text-cyan-300">
              {weatherLabel}
            </span>
          )}
          {terrainLabel !== null && (
            <span className="rounded-full bg-green-900/50 px-3 py-1 text-xs text-green-300">
              {terrainLabel}
            </span>
          )}
        </div>
      )}

      {/* Opponent Pokemon (top) */}
      <div>
        <p className="mb-1 text-xs font-medium text-gray-500">OPPONENT</p>
        <PokemonDisplay pokemon={opponentPokemon} isPlayer={false} />
      </div>

      {/* VS divider */}
      <div className="flex items-center justify-center">
        <div className="h-px flex-1 bg-gray-800" />
        <span className="mx-4 text-sm font-bold text-gray-600">VS</span>
        <div className="h-px flex-1 bg-gray-800" />
      </div>

      {/* Player Pokemon (bottom) */}
      <div>
        <p className="mb-1 text-xs font-medium text-gray-500">YOUR POKEMON</p>
        <PokemonDisplay pokemon={playerPokemon} isPlayer />
      </div>
    </div>
  );
}

export { BattleField };
export type { BattleFieldProps };
