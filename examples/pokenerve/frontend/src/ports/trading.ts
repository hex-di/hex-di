/**
 * Trading port definition.
 *
 * Defines the contract for the multi-step Pokemon trade lifecycle
 * with saga pattern support and compensation handling.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type { TradeOffer, TradeSagaState, TradingError } from "@pokenerve/shared/types/trading";
import type { Pokemon } from "@pokenerve/shared/types/pokemon";

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

interface TradingService {
  initiateTrade(
    offeredPokemon: Pokemon,
    requestedPokemon: Pokemon
  ): Promise<Result<TradeOffer, TradingError>>;
  advanceStep(tradeId: string): Promise<Result<TradeSagaState, TradingError>>;
  cancelTrade(tradeId: string): Promise<Result<TradeSagaState, TradingError>>;
  getTradeState(tradeId: string): Result<TradeSagaState, TradingError>;
  setChaosSettings(
    tradeId: string,
    chaosMode: boolean,
    failureProbability: number
  ): Result<TradeSagaState, TradingError>;
}

// ---------------------------------------------------------------------------
// Port definition
// ---------------------------------------------------------------------------

const TradingPort = port<TradingService>()({
  name: "Trading",
  category: "domain",
  description: "Multi-step trade lifecycle with saga pattern and compensation",
});

export { TradingPort };
export type { TradingService };
