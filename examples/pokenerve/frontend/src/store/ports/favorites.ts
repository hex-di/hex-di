/**
 * Favorites atom port.
 *
 * Holds the set of favorited Pokemon IDs as a reactive atom.
 *
 * @packageDocumentation
 */

import { createAtomPort } from "@hex-di/store";

const FavoritesPort = createAtomPort<ReadonlySet<number>>()({
  name: "Favorites",
  description: "Favorited Pokemon IDs",
  category: "store",
});

export { FavoritesPort };
