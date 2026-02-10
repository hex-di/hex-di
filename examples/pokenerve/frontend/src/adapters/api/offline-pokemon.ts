/**
 * Offline Pokemon adapters using bundled static data.
 *
 * Returns data from a pre-bundled dataset. Works with zero network.
 * Used as a fallback adapter and for demonstrating live adapter
 * swapping in the Discovery Hub.
 *
 * The static data (gen1-pokemon.json) will be created in Task Group 12.
 * Until then, this adapter returns empty results or NotFoundError.
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
import { NotFoundError } from "@pokenerve/shared/types/pokemon";
import { PokemonListPort, PokemonDetailPort } from "../../ports/pokemon-api.js";

// ---------------------------------------------------------------------------
// Static offline data
// ---------------------------------------------------------------------------

/**
 * Offline Pokemon data store. When gen1-pokemon.json is created (Task Group 12),
 * this will be populated via a Vite JSON import. For now it starts empty.
 */
const pokemonData: readonly Pokemon[] = [];

// ---------------------------------------------------------------------------
// Offline list adapter
// ---------------------------------------------------------------------------

const offlinePokemonListAdapter = createAdapter({
  provides: PokemonListPort,
  lifetime: "singleton",
  factory: () => ({
    async list(params: {
      offset: number;
      limit: number;
      type?: string;
    }): Promise<Result<PaginatedResponse<NamedAPIResource>, PokemonApiError>> {
      const filtered = pokemonData.filter(p => {
        if (params.type && !p.types.some(t => t.type.name === params.type)) return false;
        return true;
      });
      const slice = filtered.slice(params.offset, params.offset + params.limit);
      return ok({
        count: filtered.length,
        next: params.offset + params.limit < filtered.length ? "has-more" : null,
        previous: params.offset > 0 ? "has-prev" : null,
        results: slice.map(p => ({ name: p.name, url: `/pokemon/${p.id}` })),
      });
    },
  }),
});

// ---------------------------------------------------------------------------
// Offline detail adapter
// ---------------------------------------------------------------------------

const offlinePokemonDetailAdapter = createAdapter({
  provides: PokemonDetailPort,
  lifetime: "singleton",
  factory: () => ({
    async getById(id: number): Promise<Result<Pokemon, PokemonApiError>> {
      const found = pokemonData.find(p => p.id === id);
      if (!found) return err(NotFoundError({ pokemonId: id }));
      return ok(found);
    },
    async getByName(name: string): Promise<Result<Pokemon, PokemonApiError>> {
      const found = pokemonData.find(p => p.name === name);
      if (!found) return err(NotFoundError({ pokemonId: name }));
      return ok(found);
    },
    async getSpecies(id: number): Promise<Result<PokemonSpecies, PokemonApiError>> {
      return err(NotFoundError({ pokemonId: id }));
    },
  }),
});

export { offlinePokemonListAdapter, offlinePokemonDetailAdapter };
