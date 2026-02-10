/**
 * Evolution chain adapter via REST API.
 *
 * Fetches evolution chain data through the backend proxy.
 * Used by the Evolution Lab feature to build interactive
 * state machines from real PokeAPI data.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { EvolutionChain, PokemonApiError } from "@pokenerve/shared/types/pokemon";
import { NotFoundError, RateLimitError, NetworkError } from "@pokenerve/shared/types/pokemon";
import { EvolutionChainPort } from "../../ports/evolution.js";

// ---------------------------------------------------------------------------
// Shared fetch helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string): Promise<Result<T, PokemonApiError>> {
  try {
    const response = await fetch(url);
    if (response.status === 404) {
      return err(NotFoundError({ pokemonId: url }));
    }
    if (response.status === 429) {
      return err(RateLimitError({ retryAfterMs: 1000 }));
    }
    if (!response.ok) {
      return err(NetworkError({ message: `HTTP ${response.status}` }));
    }
    const data: T = await response.json();
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    return err(NetworkError({ message }));
  }
}

// ---------------------------------------------------------------------------
// Evolution chain adapter
// ---------------------------------------------------------------------------

const evolutionChainAdapter = createAdapter({
  provides: EvolutionChainPort,
  lifetime: "singleton",
  factory: () => ({
    async getChain(pokemonId: number): Promise<Result<EvolutionChain, PokemonApiError>> {
      // First get the species to find the evolution chain URL
      const speciesResult = await apiFetch<{ evolution_chain: { url: string } }>(
        `/api/pokemon/${pokemonId}/species`
      );
      if (speciesResult.isErr()) return err(speciesResult.error);

      const chainUrl = speciesResult.value.evolution_chain.url;
      // Extract the chain ID from the URL and fetch via our proxy
      const chainId = chainUrl.split("/").filter(Boolean).pop();
      return apiFetch<EvolutionChain>(`/api/evolution-chain/${chainId}`);
    },
    async getChainByUrl(url: string): Promise<Result<EvolutionChain, PokemonApiError>> {
      const chainId = url.split("/").filter(Boolean).pop();
      return apiFetch<EvolutionChain>(`/api/evolution-chain/${chainId}`);
    },
  }),
});

export { evolutionChainAdapter };
