/**
 * Mutation port definitions for bridging query mutations to store state.
 *
 * @packageDocumentation
 */

import { createMutationPort } from "@hex-di/query";
import type { PokemonApiError } from "@pokenerve/shared/types/pokemon";

/**
 * Toggle a Pokemon as favorite. Bridges to the FavoritesPort atom.
 */
const ToggleFavoriteMutationPort = createMutationPort<
  { readonly pokemonId: number; readonly isFavorite: boolean },
  number,
  PokemonApiError
>()({
  name: "ToggleFavoriteMutation",
});

/**
 * Add a Pokemon to the team. Bridges to the TeamPort state.
 */
const AddToTeamMutationPort = createMutationPort<
  { readonly pokemonId: number; readonly added: boolean },
  number,
  PokemonApiError
>()({
  name: "AddToTeamMutation",
});

/**
 * Remove a Pokemon from the team. Bridges to the TeamPort state.
 */
const RemoveFromTeamMutationPort = createMutationPort<
  { readonly pokemonId: number; readonly removed: boolean },
  number,
  PokemonApiError
>()({
  name: "RemoveFromTeamMutation",
});

export { ToggleFavoriteMutationPort, AddToTeamMutationPort, RemoveFromTeamMutationPort };
