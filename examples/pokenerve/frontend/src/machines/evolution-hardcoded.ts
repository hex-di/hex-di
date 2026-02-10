/**
 * Hardcoded fallback evolution chains.
 *
 * Provides pre-built EvolutionChain data for common Gen 1 lines
 * when the PokeAPI is unavailable. Includes the Charmander linear
 * chain and the Eevee branching chain.
 *
 * @packageDocumentation
 */

import type {
  EvolutionChain,
  EvolutionDetail,
  NamedAPIResource,
} from "@pokenerve/shared/types/pokemon";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resource(name: string, url = ""): NamedAPIResource {
  return { name, url };
}

function emptyDetail(overrides: Partial<EvolutionDetail> = {}): EvolutionDetail {
  return {
    trigger: resource("level-up"),
    min_level: null,
    item: null,
    held_item: null,
    known_move: null,
    min_happiness: null,
    location: null,
    time_of_day: "",
    min_affection: null,
    needs_overworld_rain: false,
    turn_upside_down: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Charmander line (linear: charmander -> charmeleon -> charizard)
// ---------------------------------------------------------------------------

const charmanderChain: EvolutionChain = {
  id: 2,
  chain: {
    species: resource("charmander"),
    evolution_details: [],
    evolves_to: [
      {
        species: resource("charmeleon"),
        evolution_details: [emptyDetail({ min_level: 16 })],
        evolves_to: [
          {
            species: resource("charizard"),
            evolution_details: [emptyDetail({ min_level: 36 })],
            evolves_to: [],
          },
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Eevee line (branching: eevee -> 8 eeveelutions)
// ---------------------------------------------------------------------------

const eeveeChain: EvolutionChain = {
  id: 67,
  chain: {
    species: resource("eevee"),
    evolution_details: [],
    evolves_to: [
      {
        species: resource("vaporeon"),
        evolution_details: [
          emptyDetail({
            trigger: resource("use-item"),
            item: resource("water-stone"),
          }),
        ],
        evolves_to: [],
      },
      {
        species: resource("jolteon"),
        evolution_details: [
          emptyDetail({
            trigger: resource("use-item"),
            item: resource("thunder-stone"),
          }),
        ],
        evolves_to: [],
      },
      {
        species: resource("flareon"),
        evolution_details: [
          emptyDetail({
            trigger: resource("use-item"),
            item: resource("fire-stone"),
          }),
        ],
        evolves_to: [],
      },
      {
        species: resource("espeon"),
        evolution_details: [
          emptyDetail({
            min_happiness: 160,
            time_of_day: "day",
          }),
        ],
        evolves_to: [],
      },
      {
        species: resource("umbreon"),
        evolution_details: [
          emptyDetail({
            min_happiness: 160,
            time_of_day: "night",
          }),
        ],
        evolves_to: [],
      },
      {
        species: resource("leafeon"),
        evolution_details: [
          emptyDetail({
            trigger: resource("use-item"),
            item: resource("leaf-stone"),
          }),
        ],
        evolves_to: [],
      },
      {
        species: resource("glaceon"),
        evolution_details: [
          emptyDetail({
            trigger: resource("use-item"),
            item: resource("ice-stone"),
          }),
        ],
        evolves_to: [],
      },
      {
        species: resource("sylveon"),
        evolution_details: [
          emptyDetail({
            min_affection: 2,
            known_move: resource("baby-doll-eyes"),
          }),
        ],
        evolves_to: [],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Bulbasaur line (linear: bulbasaur -> ivysaur -> venusaur)
// ---------------------------------------------------------------------------

const bulbasaurChain: EvolutionChain = {
  id: 1,
  chain: {
    species: resource("bulbasaur"),
    evolution_details: [],
    evolves_to: [
      {
        species: resource("ivysaur"),
        evolution_details: [emptyDetail({ min_level: 16 })],
        evolves_to: [
          {
            species: resource("venusaur"),
            evolution_details: [emptyDetail({ min_level: 32 })],
            evolves_to: [],
          },
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Lookup map for hardcoded chains
// ---------------------------------------------------------------------------

/**
 * Map of Pokemon names to their hardcoded evolution chain data.
 * Used as a fallback when the API is unavailable.
 */
const hardcodedChains: ReadonlyMap<string, EvolutionChain> = new Map([
  // Charmander line
  ["charmander", charmanderChain],
  ["charmeleon", charmanderChain],
  ["charizard", charmanderChain],
  // Eevee line
  ["eevee", eeveeChain],
  ["vaporeon", eeveeChain],
  ["jolteon", eeveeChain],
  ["flareon", eeveeChain],
  ["espeon", eeveeChain],
  ["umbreon", eeveeChain],
  ["leafeon", eeveeChain],
  ["glaceon", eeveeChain],
  ["sylveon", eeveeChain],
  // Bulbasaur line
  ["bulbasaur", bulbasaurChain],
  ["ivysaur", bulbasaurChain],
  ["venusaur", bulbasaurChain],
]);

/**
 * Returns a hardcoded EvolutionChain for the given Pokemon name,
 * or undefined if no hardcoded data is available.
 */
function getHardcodedChain(pokemonName: string): EvolutionChain | undefined {
  return hardcodedChains.get(pokemonName.toLowerCase());
}

export { getHardcodedChain, charmanderChain, eeveeChain, bulbasaurChain };
