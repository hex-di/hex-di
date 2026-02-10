/**
 * Confirm Trade step adapter.
 *
 * Client-side simulation of trade confirmation.
 * Final step -- does not apply chaos failures.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ok } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { TradingError } from "@pokenerve/shared/types/trading";
import { ConfirmTradePort } from "../../ports/trade-steps/confirm-trade-port.js";
import type { ConfirmInput, Confirmation } from "../../ports/trade-steps/confirm-trade-port.js";

const confirmTradeAdapter = createAdapter({
  provides: ConfirmTradePort,
  lifetime: "scoped",
  factory: () => ({
    async execute(input: ConfirmInput): Promise<Result<Confirmation, TradingError>> {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 200);
      });

      void input;
      return ok({
        tradeId: `trd-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        confirmedAt: Date.now(),
      });
    },
  }),
});

export { confirmTradeAdapter };
