/**
 * Evolution context type and defaults.
 *
 * Represents the environmental conditions that determine whether a
 * Pokemon can evolve. Used as the context type for evolution state machines.
 *
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Evolution Context
// ---------------------------------------------------------------------------

interface EvolutionContext {
  readonly speciesName: string;
  readonly level: number;
  readonly friendship: number;
  readonly beauty: number;
  readonly affection: number;
  readonly heldItem: string | null;
  readonly knownMoves: readonly string[];
  readonly location: string | null;
  readonly isTrading: boolean;
  readonly tradeSpecies: string | null;
  readonly timeOfDay: "day" | "night";
  readonly hasOverworldRain: boolean;
  readonly partySpecies: readonly string[];
  readonly partyTypes: readonly string[];
  readonly gender: "male" | "female" | null;
  readonly isTurnedUpsideDown: boolean;
}

// ---------------------------------------------------------------------------
// Default Factory
// ---------------------------------------------------------------------------

function createDefaultContext(speciesName: string): EvolutionContext {
  return {
    speciesName,
    level: 1,
    friendship: 0,
    beauty: 0,
    affection: 0,
    heldItem: null,
    knownMoves: [],
    location: null,
    isTrading: false,
    tradeSpecies: null,
    timeOfDay: "day",
    hasOverworldRain: false,
    partySpecies: [],
    partyTypes: [],
    gender: null,
    isTurnedUpsideDown: false,
  };
}

export { createDefaultContext };
export type { EvolutionContext };
