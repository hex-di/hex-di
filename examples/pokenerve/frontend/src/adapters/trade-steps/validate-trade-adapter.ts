/**
 * Validate Trade step adapter.
 *
 * Client-side simulation of trade validation with chaos support.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ok } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { TradingError } from "@pokenerve/shared/types/trading";
import { ValidateTradePort } from "../../ports/trade-steps/validate-trade-port.js";
import type {
  ValidateTradeInput,
  TradeValidation,
} from "../../ports/trade-steps/validate-trade-port.js";
import { maybeFail } from "./chaos.js";

const validateTradeAdapter = createAdapter({
  provides: ValidateTradePort,
  lifetime: "scoped",
  factory: () => ({
    async execute(input: ValidateTradeInput): Promise<Result<TradeValidation, TradingError>> {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 200);
      });

      const failure = maybeFail<TradeValidation>("verify_ownership");
      if (failure !== null) return failure;

      return ok({
        offeredPokemon: input.offeredPokemon,
        requestedPokemon: input.requestedPokemon,
        validatedAt: Date.now(),
      });
    },
  }),
});

export { validateTradeAdapter };
