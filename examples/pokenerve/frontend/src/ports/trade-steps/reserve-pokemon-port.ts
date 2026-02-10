/**
 * Reserve Pokemon step port.
 *
 * Locks both Pokemon so they cannot be traded elsewhere while
 * the swap is in progress.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type { TradingError } from "@pokenerve/shared/types/trading";

interface ReserveInput {
  readonly offeredPokemonId: number;
  readonly requestedPokemonId: number;
}

interface Reservation {
  readonly reservationId: string;
  readonly offeredPokemonId: number;
  readonly requestedPokemonId: number;
  readonly reservedAt: number;
}

interface ReservePokemonService {
  execute(input: ReserveInput): Promise<Result<Reservation, TradingError>>;
  release(reservationId: string): Promise<Result<void, TradingError>>;
}

const ReservePokemonPort = port<ReservePokemonService>()({
  name: "ReservePokemon",
  category: "domain",
  description: "Reserves (locks) Pokemon during trade execution",
});

export { ReservePokemonPort };
export type { ReservePokemonService, ReserveInput, Reservation };
