import { createError } from "@hex-di/result";

/** Generic named resource reference from PokeAPI */
export interface NamedAPIResource {
  readonly name: string;
  readonly url: string;
}

/** Paginated list response from PokeAPI */
export interface PaginatedResponse<T> {
  readonly count: number;
  readonly next: string | null;
  readonly previous: string | null;
  readonly results: readonly T[];
}

/** Full Pokemon data from PokeAPI /pokemon/{id} */
export interface Pokemon {
  readonly id: number;
  readonly name: string;
  readonly types: readonly PokemonType[];
  readonly stats: readonly Stat[];
  readonly abilities: readonly Ability[];
  readonly sprites: Sprites;
  readonly species: NamedAPIResource;
  readonly height: number;
  readonly weight: number;
  readonly base_experience: number;
  readonly moves: readonly PokemonMove[];
}

/** Type slot on a Pokemon */
export interface PokemonType {
  readonly slot: number;
  readonly type: NamedAPIResource;
}

/** Base stat entry */
export interface Stat {
  readonly base_stat: number;
  readonly effort: number;
  readonly stat: NamedAPIResource;
}

/** Ability entry */
export interface Ability {
  readonly ability: NamedAPIResource;
  readonly is_hidden: boolean;
  readonly slot: number;
}

/** Pokemon sprite URLs */
export interface Sprites {
  readonly front_default: string | null;
  readonly front_shiny: string | null;
  readonly back_default: string | null;
  readonly back_shiny: string | null;
  readonly other?: {
    readonly "official-artwork"?: {
      readonly front_default: string | null;
      readonly front_shiny: string | null;
    };
  };
}

/** Move learned by a Pokemon */
export interface PokemonMove {
  readonly move: NamedAPIResource;
  readonly version_group_details: readonly MoveVersionDetail[];
}

/** Move version detail */
export interface MoveVersionDetail {
  readonly level_learned_at: number;
  readonly move_learn_method: NamedAPIResource;
  readonly version_group: NamedAPIResource;
}

/** Evolution chain data from PokeAPI /evolution-chain/{id} */
export interface EvolutionChain {
  readonly id: number;
  readonly chain: ChainLink;
}

/** Single link in an evolution chain (recursive) */
export interface ChainLink {
  readonly species: NamedAPIResource;
  readonly evolution_details: readonly EvolutionDetail[];
  readonly evolves_to: readonly ChainLink[];
}

/** Conditions required for a specific evolution */
export interface EvolutionDetail {
  readonly trigger: NamedAPIResource;
  readonly min_level: number | null;
  readonly item: NamedAPIResource | null;
  readonly held_item: NamedAPIResource | null;
  readonly known_move: NamedAPIResource | null;
  readonly min_happiness: number | null;
  readonly location: NamedAPIResource | null;
  readonly time_of_day: string;
  readonly min_affection: number | null;
  readonly needs_overworld_rain: boolean;
  readonly turn_upside_down: boolean;
}

/** Full type data from PokeAPI /type/{id} */
export interface TypeData {
  readonly id: number;
  readonly name: string;
  readonly damage_relations: TypeRelations;
  readonly pokemon: readonly TypePokemon[];
}

/** Type damage relations (attack/defense multipliers) */
export interface TypeRelations {
  readonly double_damage_to: readonly NamedAPIResource[];
  readonly double_damage_from: readonly NamedAPIResource[];
  readonly half_damage_to: readonly NamedAPIResource[];
  readonly half_damage_from: readonly NamedAPIResource[];
  readonly no_damage_to: readonly NamedAPIResource[];
  readonly no_damage_from: readonly NamedAPIResource[];
}

/** Pokemon associated with a type */
export interface TypePokemon {
  readonly slot: number;
  readonly pokemon: NamedAPIResource;
}

/** Full move data from PokeAPI /move/{id} */
export interface Move {
  readonly id: number;
  readonly name: string;
  readonly type: NamedAPIResource;
  readonly power: number | null;
  readonly pp: number;
  readonly accuracy: number | null;
  readonly damage_class: NamedAPIResource;
  readonly effect_entries: readonly EffectEntry[];
  readonly priority: number;
}

/** Localized effect text */
export interface EffectEntry {
  readonly effect: string;
  readonly short_effect: string;
  readonly language: NamedAPIResource;
}

/** Species data from PokeAPI /pokemon-species/{id} */
export interface PokemonSpecies {
  readonly id: number;
  readonly name: string;
  readonly color: NamedAPIResource;
  readonly shape: NamedAPIResource;
  readonly habitat: NamedAPIResource | null;
  readonly evolution_chain: { readonly url: string };
  readonly generation: NamedAPIResource;
  readonly is_legendary: boolean;
  readonly is_mythical: boolean;
}

/** Discriminated error union for Pokemon API calls */
export const NetworkError = createError("NetworkError");
export type NetworkError = Readonly<{ _tag: "NetworkError"; message: string }>;

export const NotFoundError = createError("NotFoundError");
export type NotFoundError = Readonly<{ _tag: "NotFoundError"; pokemonId: number | string }>;

export const RateLimitError = createError("RateLimitError");
export type RateLimitError = Readonly<{ _tag: "RateLimitError"; retryAfterMs: number }>;

export const ParseError = createError("ParseError");
export type ParseError = Readonly<{ _tag: "ParseError"; message: string }>;

export type PokemonApiError = NetworkError | NotFoundError | RateLimitError | ParseError;
