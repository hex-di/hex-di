/**
 * Mutation adapters bridging query mutations to store state.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import {
  ToggleFavoriteMutationPort,
  AddToTeamMutationPort,
  RemoveFromTeamMutationPort,
} from "../../ports/query/mutations.js";
import { FavoritesPort } from "../../store/ports/favorites.js";
import { TeamPort } from "../../store/ports/team.js";

const toggleFavoriteMutationAdapter = createAdapter({
  provides: ToggleFavoriteMutationPort,
  requires: [FavoritesPort],
  factory: ({ Favorites }) => {
    return (pokemonId: number) => {
      const current = Favorites.value;
      const next = new Set(current);
      const isFavorite = !current.has(pokemonId);
      if (isFavorite) {
        next.add(pokemonId);
      } else {
        next.delete(pokemonId);
      }
      Favorites.set(next);
      return ResultAsync.ok({ pokemonId, isFavorite });
    };
  },
});

const addToTeamMutationAdapter = createAdapter({
  provides: AddToTeamMutationPort,
  requires: [TeamPort],
  factory: ({ Team }) => {
    return (pokemonId: number) => {
      const before = Team.state.members.length;
      Team.actions.add(pokemonId);
      const added = Team.state.members.length > before;
      return ResultAsync.ok({ pokemonId, added });
    };
  },
});

const removeFromTeamMutationAdapter = createAdapter({
  provides: RemoveFromTeamMutationPort,
  requires: [TeamPort],
  factory: ({ Team }) => {
    return (pokemonId: number) => {
      const before = Team.state.members.length;
      Team.actions.remove(pokemonId);
      const removed = Team.state.members.length < before;
      return ResultAsync.ok({ pokemonId, removed });
    };
  },
});

export { toggleFavoriteMutationAdapter, addToTeamMutationAdapter, removeFromTeamMutationAdapter };
