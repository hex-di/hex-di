/**
 * Evolution chain query adapter.
 *
 * Wraps EvolutionChainPort.getChain() into a QueryFetcher.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { EvolutionChainQueryPort } from "../../ports/query/evolution-chain-query.js";
import { EvolutionChainPort } from "../../ports/evolution.js";

const evolutionChainQueryAdapter = createAdapter({
  provides: EvolutionChainQueryPort,
  requires: [EvolutionChainPort],
  factory: ({ EvolutionChain }) => {
    return (pokemonId: number) => ResultAsync.fromResult(EvolutionChain.getChain(pokemonId));
  },
});

export { evolutionChainQueryAdapter };
