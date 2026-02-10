/**
 * Pokemon detail query port.
 *
 * Fetches full Pokemon data by ID.
 *
 * @packageDocumentation
 */

import { createQueryPort } from "@hex-di/query";
import type { Pokemon, PokemonApiError } from "@pokenerve/shared/types/pokemon";

const PokemonDetailQueryPort = createQueryPort<Pokemon, number, PokemonApiError>()({
  name: "PokemonDetailQuery",
  defaults: { staleTime: 300_000 },
});

export { PokemonDetailQueryPort };
