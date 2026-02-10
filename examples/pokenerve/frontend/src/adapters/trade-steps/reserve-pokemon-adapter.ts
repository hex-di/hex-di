/**
 * Reserve Pokemon step adapter.
 *
 * Client-side simulation of Pokemon reservation with chaos support.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ok } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { TradingError } from "@pokenerve/shared/types/trading";
import { ReservePokemonPort } from "../../ports/trade-steps/reserve-pokemon-port.js";
import type { ReserveInput, Reservation } from "../../ports/trade-steps/reserve-pokemon-port.js";
import { maybeFail } from "./chaos.js";

const reservePokemonAdapter = createAdapter({
  provides: ReservePokemonPort,
  lifetime: "scoped",
  factory: () => ({
    async execute(input: ReserveInput): Promise<Result<Reservation, TradingError>> {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 300);
      });

      const failure = maybeFail<Reservation>("lock_pokemon");
      if (failure !== null) return failure;

      return ok({
        reservationId: `rsv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        offeredPokemonId: input.offeredPokemonId,
        requestedPokemonId: input.requestedPokemonId,
        reservedAt: Date.now(),
      });
    },

    async release(reservationId: string): Promise<Result<void, TradingError>> {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 150);
      });
      void reservationId;
      return ok(undefined);
    },
  }),
});

export { reservePokemonAdapter };
