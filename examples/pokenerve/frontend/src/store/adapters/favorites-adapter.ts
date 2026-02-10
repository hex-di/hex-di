/**
 * Favorites atom adapter.
 *
 * @packageDocumentation
 */

import { createAtomAdapter } from "@hex-di/store";
import { FavoritesPort } from "../ports/favorites.js";

const favoritesAdapter = createAtomAdapter({
  provides: FavoritesPort,
  lifetime: "singleton",
  initial: new Set<number>(),
});

export { favoritesAdapter };
