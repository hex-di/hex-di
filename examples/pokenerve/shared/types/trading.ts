import { createError } from "@hex-di/result";
import type { Pokemon } from "./pokemon.js";

/** A trade offer between two trainers */
export interface TradeOffer {
  readonly id: string;
  readonly offeredPokemon: Pokemon;
  readonly requestedPokemon: Pokemon;
  readonly status: TradeStatus;
  readonly trainerId: string;
  readonly partnerTrainerId: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Trade lifecycle status */
export type TradeStatus =
  | "pending"
  | "accepted"
  | "locked"
  | "swapping"
  | "confirming"
  | "completed"
  | "failed"
  | "compensating";

/** Individual step in the trading saga */
export interface TradeSagaStep {
  readonly name: TradeSagaStepName | TradeCompensationStepName;
  readonly status: "pending" | "executing" | "completed" | "failed" | "compensated";
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly error: string | null;
}

/** Names of forward saga steps */
export type TradeSagaStepName =
  | "initiate_trade"
  | "select_pokemon"
  | "verify_ownership"
  | "lock_pokemon"
  | "execute_swap"
  | "confirm_receipt"
  | "complete";

/** Names of compensation steps */
export type TradeCompensationStepName = "unlock_pokemon" | "return_pokemon" | "notify_cancellation";

/** Full saga execution state */
export interface TradeSagaState {
  readonly tradeId: string;
  readonly currentStep: TradeSagaStepName | TradeCompensationStepName | null;
  readonly forwardSteps: readonly TradeSagaStep[];
  readonly compensationSteps: readonly TradeSagaStep[];
  readonly isCompensating: boolean;
  readonly isComplete: boolean;
  readonly chaosMode: boolean;
  readonly failureProbability: number;
}

/** Trading API error types */
export const TradeNotFound = createError("TradeNotFound");
export type TradeNotFound = Readonly<{ _tag: "TradeNotFound"; tradeId: string }>;

export const PokemonLocked = createError("PokemonLocked");
export type PokemonLocked = Readonly<{ _tag: "PokemonLocked"; pokemonId: number }>;

export const VerificationFailed = createError("VerificationFailed");
export type VerificationFailed = Readonly<{ _tag: "VerificationFailed"; reason: string }>;

export const CommunicationError = createError("CommunicationError");
export type CommunicationError = Readonly<{ _tag: "CommunicationError"; step: TradeSagaStepName }>;

export const CompensationFailed = createError("CompensationFailed");
export type CompensationFailed = Readonly<{
  _tag: "CompensationFailed";
  step: TradeCompensationStepName;
  reason: string;
}>;

export type TradingError =
  | TradeNotFound
  | PokemonLocked
  | VerificationFailed
  | CommunicationError
  | CompensationFailed;
