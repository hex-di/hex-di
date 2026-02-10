/**
 * Barrel export for all query adapters.
 *
 * @packageDocumentation
 */

export { pokemonListQueryAdapter } from "./pokemon-list-query-adapter.js";
export { pokemonDetailQueryAdapter } from "./pokemon-detail-query-adapter.js";
export { evolutionChainQueryAdapter } from "./evolution-chain-query-adapter.js";
export { typeEffectivenessQueryAdapter } from "./type-effectiveness-query-adapter.js";
export { pokemonSpeciesQueryAdapter } from "./pokemon-species-query-adapter.js";
export {
  toggleFavoriteMutationAdapter,
  addToTeamMutationAdapter,
  removeFromTeamMutationAdapter,
} from "./mutation-adapters.js";
