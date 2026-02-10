/**
 * Confirm Trade step port.
 *
 * Final step in the trade saga: confirms that both parties
 * have received their Pokemon and the trade is complete.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type { TradingError } from "@pokenerve/shared/types/trading";

interface ConfirmInput {
  readonly swapId: string;
  readonly offeredPokemonId: number;
  readonly requestedPokemonId: number;
}

interface Confirmation {
  readonly tradeId: string;
  readonly confirmedAt: number;
}

interface ConfirmTradeService {
  execute(input: ConfirmInput): Promise<Result<Confirmation, TradingError>>;
}

const ConfirmTradePort = port<ConfirmTradeService>()({
  name: "ConfirmTrade",
  category: "domain",
  description: "Confirms trade completion after swap",
});

export { ConfirmTradePort };
export type { ConfirmTradeService, ConfirmInput, Confirmation };
