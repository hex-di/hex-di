/**
 * Evolution chain port definition.
 *
 * Defines the contract for fetching Pokemon evolution chain data.
 * Used by the Evolution Lab feature to build interactive state machines.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type { EvolutionChain, PokemonApiError } from "@pokenerve/shared/types/pokemon";

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

interface EvolutionChainService {
  getChain(pokemonId: number): Promise<Result<EvolutionChain, PokemonApiError>>;
  getChainByUrl(url: string): Promise<Result<EvolutionChain, PokemonApiError>>;
}

// ---------------------------------------------------------------------------
// Port definition
// ---------------------------------------------------------------------------

const EvolutionChainPort = port<EvolutionChainService>()({
  name: "EvolutionChain",
  category: "data",
  description: "Fetches evolution chain data for a Pokemon species",
});

export { EvolutionChainPort };
export type { EvolutionChainService };
