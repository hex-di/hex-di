/**
 * Execute Swap step port.
 *
 * Performs the actual ownership swap between trainers.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type { TradingError } from "@pokenerve/shared/types/trading";

interface SwapInput {
  readonly reservationId: string;
  readonly offeredPokemonId: number;
  readonly requestedPokemonId: number;
}

interface SwapResult {
  readonly swapId: string;
  readonly offeredPokemonId: number;
  readonly requestedPokemonId: number;
  readonly swappedAt: number;
}

interface ExecuteSwapService {
  execute(input: SwapInput): Promise<Result<SwapResult, TradingError>>;
  revert(swapId: string): Promise<Result<void, TradingError>>;
}

const ExecuteSwapPort = port<ExecuteSwapService>()({
  name: "ExecuteSwap",
  category: "domain",
  description: "Executes the actual Pokemon ownership swap",
});

export { ExecuteSwapPort };
export type { ExecuteSwapService, SwapInput, SwapResult };
