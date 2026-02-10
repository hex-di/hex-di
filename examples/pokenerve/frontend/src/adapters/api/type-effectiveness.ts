/**
 * Type effectiveness adapter with offline type-chart.json fallback.
 *
 * Provides type effectiveness calculations for the Battle Simulator
 * and Type Synergy Graph features. Uses the bundled type-chart.json
 * for offline effectiveness lookups while fetching full TypeData
 * from the API when available.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { TypeData, TypeRelations, PokemonApiError } from "@pokenerve/shared/types/pokemon";
import { NotFoundError, RateLimitError, NetworkError } from "@pokenerve/shared/types/pokemon";
import { TypeEffectivenessPort } from "../../ports/type-chart.js";
import typeChartJson from "../../data/type-chart.json";

// ---------------------------------------------------------------------------
// Type chart data from bundled JSON
// ---------------------------------------------------------------------------

interface TypeChartData {
  readonly types: readonly string[];
  readonly chart: Record<string, readonly number[]>;
  readonly colors: Record<string, string>;
}

const typeChart: TypeChartData = typeChartJson;

// ---------------------------------------------------------------------------
// Shared fetch helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string): Promise<Result<T, PokemonApiError>> {
  try {
    const response = await fetch(`/api${path}`);
    if (response.status === 404) {
      return err(NotFoundError({ pokemonId: path }));
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
// Type effectiveness adapter
// ---------------------------------------------------------------------------

const typeEffectivenessAdapter = createAdapter({
  provides: TypeEffectivenessPort,
  lifetime: "singleton",
  factory: () => ({
    async getAllTypes(): Promise<Result<readonly TypeData[], PokemonApiError>> {
      return apiFetch<readonly TypeData[]>("/types");
    },

    async getTypeRelations(typeName: string): Promise<Result<TypeRelations, PokemonApiError>> {
      return apiFetch<TypeRelations>(`/types/${typeName}`);
    },

    getEffectiveness(attackType: string, defendTypes: readonly string[]): number {
      const attackRow = typeChart.chart[attackType];
      if (!attackRow) return 1;

      let multiplier = 1;
      for (const defendType of defendTypes) {
        const defendIndex = typeChart.types.indexOf(defendType);
        if (defendIndex >= 0 && defendIndex < attackRow.length) {
          multiplier *= attackRow[defendIndex];
        }
      }
      return multiplier;
    },
  }),
});

export { typeEffectivenessAdapter };
