/**
 * Pokemon list query adapter.
 *
 * Wraps the existing PokemonListPort.list() into a QueryFetcher
 * that returns ResultAsync.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { PokemonListQueryPort } from "../../ports/query/pokemon-list-query.js";
import { PokemonListPort } from "../../ports/pokemon-api.js";
import type { PokemonListService } from "../../ports/pokemon-api.js";

const pokemonListQueryAdapter = createAdapter({
  provides: PokemonListQueryPort,
  requires: [PokemonListPort],
  factory: (deps: { readonly PokemonList: PokemonListService }) => {
    const listService = deps.PokemonList;
    return (params: {
      readonly offset: number;
      readonly limit: number;
      readonly type?: string;
      readonly habitat?: string;
      readonly color?: string;
      readonly shape?: string;
    }) => ResultAsync.fromResult(listService.list(params));
  },
});

export { pokemonListQueryAdapter };
