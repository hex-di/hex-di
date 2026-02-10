/**
 * Query dependency graph for data fetching.
 *
 * Composes all query and mutation adapters into a GraphBuilder.
 * Query adapters delegate to existing DI service ports for actual
 * data fetching, wrapping them in the @hex-di/query cache layer.
 *
 * @packageDocumentation
 */

import { GraphBuilder } from "@hex-di/graph";
import { pokemonListQueryAdapter } from "../adapters/query/pokemon-list-query-adapter.js";
import { pokemonDetailQueryAdapter } from "../adapters/query/pokemon-detail-query-adapter.js";
import { evolutionChainQueryAdapter } from "../adapters/query/evolution-chain-query-adapter.js";
import { typeEffectivenessQueryAdapter } from "../adapters/query/type-effectiveness-query-adapter.js";
import { pokemonSpeciesQueryAdapter } from "../adapters/query/pokemon-species-query-adapter.js";
import {
  toggleFavoriteMutationAdapter,
  addToTeamMutationAdapter,
  removeFromTeamMutationAdapter,
} from "../adapters/query/mutation-adapters.js";

const queryGraphBuilder = GraphBuilder.create()
  .provide(pokemonListQueryAdapter)
  .provide(pokemonDetailQueryAdapter)
  .provide(evolutionChainQueryAdapter)
  .provide(typeEffectivenessQueryAdapter)
  .provide(pokemonSpeciesQueryAdapter)
  .provide(toggleFavoriteMutationAdapter)
  .provide(addToTeamMutationAdapter)
  .provide(removeFromTeamMutationAdapter);

export { queryGraphBuilder };
