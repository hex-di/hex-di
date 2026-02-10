/**
 * Pokemon API port definitions.
 *
 * Defines contracts for fetching Pokemon list and detail data.
 * All responses are wrapped in Result<T, PokemonApiError> for
 * exhaustive error handling.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type {
  Pokemon,
  PaginatedResponse,
  NamedAPIResource,
  PokemonSpecies,
  PokemonApiError,
} from "@pokenerve/shared/types/pokemon";

// ---------------------------------------------------------------------------
// Service interfaces
// ---------------------------------------------------------------------------

interface PokemonListService {
  list(params: {
    offset: number;
    limit: number;
    type?: string;
    habitat?: string;
    color?: string;
    shape?: string;
  }): Promise<Result<PaginatedResponse<NamedAPIResource>, PokemonApiError>>;
}

interface PokemonDetailService {
  getById(id: number): Promise<Result<Pokemon, PokemonApiError>>;
  getByName(name: string): Promise<Result<Pokemon, PokemonApiError>>;
  getSpecies(id: number): Promise<Result<PokemonSpecies, PokemonApiError>>;
}

// ---------------------------------------------------------------------------
// Port definitions
// ---------------------------------------------------------------------------

const PokemonListPort = port<PokemonListService>()({
  name: "PokemonList",
  category: "data",
  description: "Fetches paginated Pokemon lists with optional filters",
});

const PokemonDetailPort = port<PokemonDetailService>()({
  name: "PokemonDetail",
  category: "data",
  description: "Fetches full Pokemon data by ID or name",
});

export { PokemonListPort, PokemonDetailPort };
export type { PokemonListService, PokemonDetailService };
