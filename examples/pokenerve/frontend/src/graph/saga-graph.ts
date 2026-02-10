/**
 * Saga dependency graph.
 *
 * Composes trade step adapters, saga adapters, and persistence
 * into a GraphBuilder for the saga subsystem.
 *
 * @packageDocumentation
 */

import { GraphBuilder } from "@hex-di/graph";
import { validateTradeAdapter } from "../adapters/trade-steps/validate-trade-adapter.js";
import { reservePokemonAdapter } from "../adapters/trade-steps/reserve-pokemon-adapter.js";
import { executeSwapAdapter } from "../adapters/trade-steps/execute-swap-adapter.js";
import { confirmTradeAdapter } from "../adapters/trade-steps/confirm-trade-adapter.js";
import { tradeSagaAdapter } from "../adapters/saga/trade-saga-adapter.js";
import { persisterAdapter } from "../adapters/saga/persister-adapter.js";

const sagaGraphBuilder = GraphBuilder.create()
  // Persistence (required by saga adapter)
  .provide(persisterAdapter)
  // Trade step adapters (invoked by saga steps)
  .provide(validateTradeAdapter)
  .provide(reservePokemonAdapter)
  .provide(executeSwapAdapter)
  .provide(confirmTradeAdapter)
  // Saga adapter (wires TradeSagaPort → TradeSaga via SagaRunner)
  .provide(tradeSagaAdapter);

export { sagaGraphBuilder };
