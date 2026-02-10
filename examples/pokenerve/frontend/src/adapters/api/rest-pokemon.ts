/**
 * REST adapters for Pokemon list and detail ports.
 *
 * Fetches data from the backend API proxy (/api/...) which forwards
 * requests to the PokeAPI. All responses are wrapped in Result types
 * for exhaustive error handling.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type {
  Pokemon,
  PaginatedResponse,
  NamedAPIResource,
  PokemonSpecies,
  PokemonApiError,
} from "@pokenerve/shared/types/pokemon";
import { NotFoundError, RateLimitError, NetworkError } from "@pokenerve/shared/types/pokemon";
import { PokemonListPort, PokemonDetailPort } from "../../ports/pokemon-api.js";

// ---------------------------------------------------------------------------
// Shared fetch helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string): Promise<Result<T, PokemonApiError>> {
  try {
    const response = await fetch(`/api${path}`);
    if (response.status === 404) {
      return err(NotFoundError({ pokemonId: path }));
    }
    if (response.status === 429) {
      return err(RateLimitError({ retryAfterMs: 1000 }));
    }
    if (!response.ok) {
      return err(NetworkError({ message: `HTTP ${response.status}` }));
    }
    const data: T = await response.json();
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    return err(NetworkError({ message }));
  }
}

// ---------------------------------------------------------------------------
// List adapter
// ---------------------------------------------------------------------------

const restPokemonListAdapter = createAdapter({
  provides: PokemonListPort,
  lifetime: "singleton",
  factory: () => ({
    async list(params: {
      offset: number;
      limit: number;
      type?: string;
      habitat?: string;
      color?: string;
      shape?: string;
    }) {
      const query = new URLSearchParams({
        offset: String(params.offset),
        limit: String(params.limit),
      });
      if (params.type) query.set("type", params.type);
      if (params.habitat) query.set("habitat", params.habitat);
      if (params.color) query.set("color", params.color);
      if (params.shape) query.set("shape", params.shape);
      return apiFetch<PaginatedResponse<NamedAPIResource>>(`/pokemon?${query}`);
    },
  }),
});

// ---------------------------------------------------------------------------
// Detail adapter
// ---------------------------------------------------------------------------

const restPokemonDetailAdapter = createAdapter({
  provides: PokemonDetailPort,
  lifetime: "singleton",
  factory: () => ({
    async getById(id: number) {
      return apiFetch<Pokemon>(`/pokemon/${id}`);
    },
    async getByName(name: string) {
      return apiFetch<Pokemon>(`/pokemon/${name}`);
    },
    async getSpecies(id: number) {
      return apiFetch<PokemonSpecies>(`/pokemon/${id}/species`);
    },
  }),
});

export { restPokemonListAdapter, restPokemonDetailAdapter };
