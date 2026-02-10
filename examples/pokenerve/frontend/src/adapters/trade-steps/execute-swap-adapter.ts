/**
 * Execute Swap step adapter.
 *
 * Client-side simulation of Pokemon ownership swap with chaos support.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ok } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { TradingError } from "@pokenerve/shared/types/trading";
import { ExecuteSwapPort } from "../../ports/trade-steps/execute-swap-port.js";
import type { SwapInput, SwapResult } from "../../ports/trade-steps/execute-swap-port.js";
import { maybeFail } from "./chaos.js";

const executeSwapAdapter = createAdapter({
  provides: ExecuteSwapPort,
  lifetime: "scoped",
  factory: () => ({
    async execute(input: SwapInput): Promise<Result<SwapResult, TradingError>> {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 400);
      });

      const failure = maybeFail<SwapResult>("execute_swap");
      if (failure !== null) return failure;

      return ok({
        swapId: `swp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        offeredPokemonId: input.offeredPokemonId,
        requestedPokemonId: input.requestedPokemonId,
        swappedAt: Date.now(),
      });
    },

    async revert(swapId: string): Promise<Result<void, TradingError>> {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 200);
      });
      void swapId;
      return ok(undefined);
    },
  }),
});

export { executeSwapAdapter };
