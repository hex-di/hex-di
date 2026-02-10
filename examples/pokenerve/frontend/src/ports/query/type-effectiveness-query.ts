/**
 * Type effectiveness query port.
 *
 * Fetches all Pokemon type data. Static data with infinite stale time.
 *
 * @packageDocumentation
 */

import { createQueryPort } from "@hex-di/query";
import type { TypeData, PokemonApiError } from "@pokenerve/shared/types/pokemon";

const TypeEffectivenessQueryPort = createQueryPort<readonly TypeData[], void, PokemonApiError>()({
  name: "TypeEffectivenessQuery",
  defaults: { staleTime: Infinity },
});

export { TypeEffectivenessQueryPort };
export type { TypeData };
