/**
 * Pokemon detail query adapter.
 *
 * Wraps PokemonDetailPort.getById() into a QueryFetcher.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { PokemonDetailQueryPort } from "../../ports/query/pokemon-detail-query.js";
import { PokemonDetailPort } from "../../ports/pokemon-api.js";
import type { PokemonDetailService } from "../../ports/pokemon-api.js";

const pokemonDetailQueryAdapter = createAdapter({
  provides: PokemonDetailQueryPort,
  requires: [PokemonDetailPort],
  factory: (deps: { readonly PokemonDetail: PokemonDetailService }) => {
    const detailService = deps.PokemonDetail;
    return (pokemonId: number) => ResultAsync.fromResult(detailService.getById(pokemonId));
  },
});

export { pokemonDetailQueryAdapter };
