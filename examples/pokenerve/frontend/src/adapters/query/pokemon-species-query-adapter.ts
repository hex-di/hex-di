/**
 * Pokemon species query adapter.
 *
 * Wraps PokemonDetailPort.getSpecies() into a QueryFetcher.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { PokemonSpeciesQueryPort } from "../../ports/query/pokemon-species-query.js";
import { PokemonDetailPort } from "../../ports/pokemon-api.js";
import type { PokemonDetailService } from "../../ports/pokemon-api.js";

const pokemonSpeciesQueryAdapter = createAdapter({
  provides: PokemonSpeciesQueryPort,
  requires: [PokemonDetailPort],
  factory: (deps: { readonly PokemonDetail: PokemonDetailService }) => {
    const detailService = deps.PokemonDetail;
    return (pokemonId: number) => ResultAsync.fromResult(detailService.getSpecies(pokemonId));
  },
});

export { pokemonSpeciesQueryAdapter };
