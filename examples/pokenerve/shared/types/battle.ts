import { createError } from "@hex-di/result";
import type { Pokemon, Move } from "./pokemon.js";

/** Complete battle state for a single battle instance */
export interface BattleState {
  readonly id: string;
  readonly turn: number;
  readonly playerTeam: readonly BattlePokemon[];
  readonly opponentTeam: readonly BattlePokemon[];
  readonly weather: Weather;
  readonly terrain: Terrain;
  readonly activePlayerIndex: number;
  readonly activeOpponentIndex: number;
  readonly log: readonly BattleLogEntry[];
  readonly status: BattleStatus;
}

export type BattleStatus = "team_preview" | "active" | "player_win" | "opponent_win" | "draw";

/** A Pokemon in battle with mutable combat state */
export interface BattlePokemon {
  readonly pokemon: Pokemon;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly statStages: StatStages;
  readonly status: StatusCondition | null;
  readonly moves: readonly BattleMove[];
  readonly isActive: boolean;
}

/** Stat stage modifiers (-6 to +6) */
export interface StatStages {
  readonly attack: number;
  readonly defense: number;
  readonly specialAttack: number;
  readonly specialDefense: number;
  readonly speed: number;
  readonly accuracy: number;
  readonly evasion: number;
}

/** A move in battle context with remaining PP */
export interface BattleMove {
  readonly move: Move;
  readonly currentPp: number;
  readonly maxPp: number;
}

/** Status conditions */
export type StatusCondition = "burn" | "freeze" | "paralysis" | "poison" | "bad-poison" | "sleep";

/** Weather conditions */
export type Weather = "none" | "sun" | "rain" | "sandstorm" | "hail";

/** Terrain conditions */
export type Terrain = "none" | "electric" | "grassy" | "misty" | "psychic";

/** Input for damage calculation */
export interface DamageCalcInput {
  readonly attacker: BattlePokemon;
  readonly defender: BattlePokemon;
  readonly move: Move;
  readonly weather: Weather;
  readonly terrain: Terrain;
  readonly isCritical: boolean;
}

/** Output of damage calculation */
export interface DamageResult {
  readonly baseDamage: number;
  readonly stab: boolean;
  readonly effectiveness: Effectiveness;
  readonly criticalHit: boolean;
  readonly finalDamage: number;
  readonly typeModifier: number;
}

export type Effectiveness = 0 | 0.25 | 0.5 | 1 | 2 | 4;

/** Errors that can occur during damage calculation */
export const InvalidMove = createError("InvalidMove");
export type InvalidMove = Readonly<{ _tag: "InvalidMove"; reason: string }>;

export const FaintedAttacker = createError("FaintedAttacker");
export type FaintedAttacker = Readonly<{ _tag: "FaintedAttacker" }>;

export const FaintedDefender = createError("FaintedDefender");
export type FaintedDefender = Readonly<{ _tag: "FaintedDefender" }>;

export const NoPpRemaining = createError("NoPpRemaining");
export type NoPpRemaining = Readonly<{ _tag: "NoPpRemaining"; moveName: string }>;

export type DamageCalcError = InvalidMove | FaintedAttacker | FaintedDefender | NoPpRemaining;

export interface BattleLogEntry {
  readonly turn: number;
  readonly timestamp: number;
  readonly message: string;
  readonly type: "move" | "damage" | "status" | "weather" | "switch" | "faint" | "system";
}

/** Input provided to AI for move selection */
export interface AiMoveInput {
  readonly ownTeam: readonly BattlePokemon[];
  readonly opponentTeam: readonly BattlePokemon[];
  readonly activeOwn: BattlePokemon;
  readonly activeOpponent: BattlePokemon;
  readonly weather: Weather;
  readonly terrain: Terrain;
  readonly turn: number;
}

/** AI's chosen action */
export type AiAction =
  | { readonly _tag: "UseMove"; readonly moveIndex: number }
  | { readonly _tag: "SwitchPokemon"; readonly pokemonIndex: number };

/** Battle trace attributes (for Jaeger spans) */
export interface BattleTraceAttributes {
  readonly "pokemon.attacker": string;
  readonly "pokemon.defender": string;
  readonly "move.name": string;
  readonly "move.type": string;
  readonly "move.category": string;
  readonly "damage.base": number;
  readonly "damage.stab": boolean;
  readonly "damage.effectiveness": Effectiveness;
  readonly "damage.critical": boolean;
  readonly "damage.final": number;
  readonly "hp.before": number;
  readonly "hp.after": number;
}
