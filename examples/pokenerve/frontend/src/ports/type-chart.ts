/**
 * Type effectiveness port definition.
 *
 * Defines the contract for fetching Pokemon type relations
 * and calculating type effectiveness multipliers.
 * Used by the Type Synergy Graph and Battle Simulator features.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type { TypeData, TypeRelations, PokemonApiError } from "@pokenerve/shared/types/pokemon";

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

interface TypeEffectivenessService {
  getAllTypes(): Promise<Result<readonly TypeData[], PokemonApiError>>;
  getTypeRelations(typeName: string): Promise<Result<TypeRelations, PokemonApiError>>;
  getEffectiveness(attackType: string, defendTypes: readonly string[]): number;
}

// ---------------------------------------------------------------------------
// Port definition
// ---------------------------------------------------------------------------

const TypeEffectivenessPort = port<TypeEffectivenessService>()({
  name: "TypeEffectiveness",
  category: "data",
  description: "Fetches type damage relations and calculates effectiveness multipliers",
});

export { TypeEffectivenessPort };
export type { TypeEffectivenessService };
