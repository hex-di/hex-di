/**
 * Trade saga definition.
 *
 * Four-step saga orchestrating a Pokemon trade:
 *   1. ValidateTrade - verify both Pokemon are eligible
 *   2. ReservePokemon - lock Pokemon to prevent concurrent trades
 *   3. ExecuteSwap - perform the actual ownership transfer
 *   4. ConfirmTrade - finalize and confirm the trade
 *
 * Steps 2 and 3 have compensation handlers for rollback on failure.
 *
 * @packageDocumentation
 */

import { defineStep, defineSaga } from "@hex-di/saga";
import type { StepContext } from "@hex-di/saga";
import type { Pokemon } from "@pokenerve/shared/types/pokemon";
import type { TradingError } from "@pokenerve/shared/types/trading";
import { ValidateTradePort } from "../ports/trade-steps/validate-trade-port.js";
import type { TradeValidation } from "../ports/trade-steps/validate-trade-port.js";
import { ReservePokemonPort } from "../ports/trade-steps/reserve-pokemon-port.js";
import type { Reservation } from "../ports/trade-steps/reserve-pokemon-port.js";
import { ExecuteSwapPort } from "../ports/trade-steps/execute-swap-port.js";
import type { SwapResult } from "../ports/trade-steps/execute-swap-port.js";
import { ConfirmTradePort } from "../ports/trade-steps/confirm-trade-port.js";
import type { Confirmation } from "../ports/trade-steps/confirm-trade-port.js";

// ---------------------------------------------------------------------------
// Saga Input / Output
// ---------------------------------------------------------------------------

interface TradeInput {
  readonly offeredPokemon: Pokemon;
  readonly requestedPokemon: Pokemon;
}

interface TradeOutput {
  readonly tradeId: string;
  readonly confirmedAt: number;
}

// ---------------------------------------------------------------------------
// Accumulated results accessor
// ---------------------------------------------------------------------------

/**
 * Type guard: narrows unknown to Record<string, unknown>.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/**
 * Reads a named step result from the saga context's accumulated results.
 * At runtime, the saga runner populates `ctx.results` as a Record<StepName, StepOutput>.
 * The step builder erases this to `unknown` because steps are defined independently.
 *
 * Note: The return cast is a framework boundary — ctx.results is typed as unknown
 * by the saga step builder, but at runtime it's always Record<StepName, StepOutput>.
 */
function getStepResult<T>(ctx: StepContext<unknown, unknown>, stepName: string): T {
  const results = ctx.results;
  if (isRecord(results) && stepName in results) {
    return results[stepName] as T;
  }
  throw new Error(`Step result "${stepName}" not found in accumulated results`);
}

// ---------------------------------------------------------------------------
// Step Definitions
// ---------------------------------------------------------------------------

const ValidateTradeStep = defineStep("ValidateTrade")
  .io<TradeInput, TradeValidation, TradingError>()
  .invoke(ValidateTradePort, ctx => ({
    offeredPokemon: ctx.input.offeredPokemon,
    requestedPokemon: ctx.input.requestedPokemon,
  }))
  .skipCompensation()
  .build();

const ReservePokemonStep = defineStep("ReservePokemon")
  .io<TradeInput, Reservation, TradingError>()
  .invoke(ReservePokemonPort, ctx => ({
    offeredPokemonId: ctx.input.offeredPokemon.id,
    requestedPokemonId: ctx.input.requestedPokemon.id,
  }))
  .compensate(ctx => ({
    action: "release",
    reservationId: ctx.stepResult.reservationId,
  }))
  .build();

const ExecuteSwapStep = defineStep("ExecuteSwap")
  .io<TradeInput, SwapResult, TradingError>()
  .invoke(ExecuteSwapPort, ctx => {
    const reservation = getStepResult<Reservation>(ctx, "ReservePokemon");
    return {
      reservationId: reservation.reservationId,
      offeredPokemonId: ctx.input.offeredPokemon.id,
      requestedPokemonId: ctx.input.requestedPokemon.id,
    };
  })
  .compensate(ctx => ({
    action: "revert",
    swapId: ctx.stepResult.swapId,
  }))
  .build();

const ConfirmTradeStep = defineStep("ConfirmTrade")
  .io<TradeInput, Confirmation, TradingError>()
  .invoke(ConfirmTradePort, ctx => {
    const swap = getStepResult<SwapResult>(ctx, "ExecuteSwap");
    return {
      swapId: swap.swapId,
      offeredPokemonId: ctx.input.offeredPokemon.id,
      requestedPokemonId: ctx.input.requestedPokemon.id,
    };
  })
  .skipCompensation()
  .build();

// ---------------------------------------------------------------------------
// Saga Definition
// ---------------------------------------------------------------------------

const TradeSaga = defineSaga("PokemonTrade")
  .input<TradeInput>()
  .step(ValidateTradeStep)
  .step(ReservePokemonStep)
  .step(ExecuteSwapStep)
  .step(ConfirmTradeStep)
  .output(results => ({
    tradeId: results.ConfirmTrade.tradeId,
    confirmedAt: results.ConfirmTrade.confirmedAt,
  }))
  .build();

export { TradeSaga };
export type { TradeInput, TradeOutput };
