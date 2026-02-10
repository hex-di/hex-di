/**
 * Validate Trade step port.
 *
 * Checks that both offered and requested Pokemon exist and are eligible
 * for trading. First step in the trade saga.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type { TradingError } from "@pokenerve/shared/types/trading";
import type { Pokemon } from "@pokenerve/shared/types/pokemon";

interface ValidateTradeInput {
  readonly offeredPokemon: Pokemon;
  readonly requestedPokemon: Pokemon;
}

interface TradeValidation {
  readonly offeredPokemon: Pokemon;
  readonly requestedPokemon: Pokemon;
  readonly validatedAt: number;
}

interface ValidateTradeService {
  execute(input: ValidateTradeInput): Promise<Result<TradeValidation, TradingError>>;
}

const ValidateTradePort = port<ValidateTradeService>()({
  name: "ValidateTrade",
  category: "domain",
  description: "Validates a trade request before execution",
});

export { ValidateTradePort };
export type { ValidateTradeService, ValidateTradeInput, TradeValidation };
