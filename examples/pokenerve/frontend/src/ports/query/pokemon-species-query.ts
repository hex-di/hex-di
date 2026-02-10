/**
 * Pokemon species query port.
 *
 * Fetches species data (used for evolution chain lookups).
 *
 * @packageDocumentation
 */

import { createQueryPort } from "@hex-di/query";
import type { PokemonSpecies, PokemonApiError } from "@pokenerve/shared/types/pokemon";

const PokemonSpeciesQueryPort = createQueryPort<PokemonSpecies, number, PokemonApiError>()({
  name: "PokemonSpeciesQuery",
  defaults: { staleTime: 300_000 },
});

export { PokemonSpeciesQueryPort };
