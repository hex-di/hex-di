/**
 * Pokemon list query port.
 *
 * Paginated Pokemon browsing with optional type/habitat/color/shape filters.
 *
 * @packageDocumentation
 */

import { createQueryPort } from "@hex-di/query";
import type {
  PaginatedResponse,
  NamedAPIResource,
  PokemonApiError,
} from "@pokenerve/shared/types/pokemon";

interface ListParams {
  readonly offset: number;
  readonly limit: number;
  readonly type?: string;
  readonly habitat?: string;
  readonly color?: string;
  readonly shape?: string;
}

const PokemonListQueryPort = createQueryPort<
  PaginatedResponse<NamedAPIResource>,
  ListParams,
  PokemonApiError
>()({
  name: "PokemonListQuery",
  defaults: { staleTime: 60_000 },
});

export { PokemonListQueryPort };
export type { ListParams };
