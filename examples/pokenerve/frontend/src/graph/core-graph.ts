/**
 * Core dependency graph for shared application services.
 *
 * Contains singleton adapters for Pokemon API, persistence, analytics,
 * evolution chain, and type effectiveness. These services are shared
 * across the entire application via the root container.
 *
 * @packageDocumentation
 */

import { GraphBuilder } from "@hex-di/graph";
import { restPokemonListAdapter, restPokemonDetailAdapter } from "../adapters/api/rest-pokemon.js";
import { localStorageAdapter } from "../adapters/storage/local-storage.js";
import { consoleAnalyticsAdapter } from "../adapters/analytics/console-analytics.js";
import { evolutionChainAdapter } from "../adapters/api/evolution-chain.js";
import { typeEffectivenessAdapter } from "../adapters/api/type-effectiveness.js";

const coreGraphBuilder = GraphBuilder.create()
  .provide(restPokemonListAdapter)
  .provide(restPokemonDetailAdapter)
  .provide(evolutionChainAdapter)
  .provide(typeEffectivenessAdapter)
  .provide(localStorageAdapter)
  .provide(consoleAnalyticsAdapter);

export { coreGraphBuilder };
