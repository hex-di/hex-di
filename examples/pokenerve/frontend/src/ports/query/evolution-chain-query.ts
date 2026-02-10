/**
 * Evolution chain query port.
 *
 * Fetches evolution chain data by Pokemon ID.
 *
 * @packageDocumentation
 */

import { createQueryPort } from "@hex-di/query";
import type { EvolutionChain, PokemonApiError } from "@pokenerve/shared/types/pokemon";

const EvolutionChainQueryPort = createQueryPort<EvolutionChain, number, PokemonApiError>()({
  name: "EvolutionChainQuery",
  defaults: { staleTime: 600_000 },
});

export { EvolutionChainQueryPort };
