/**
 * Battle system port definitions.
 *
 * Defines contracts for the battle engine, damage calculation,
 * and AI move selection strategy. All battle-scoped services
 * get fresh instances per battle via HexDI scoped lifetime.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type {
  BattleState,
  DamageCalcInput,
  DamageResult,
  DamageCalcError,
  AiMoveInput,
  AiAction,
  BattlePokemon,
} from "@pokenerve/shared/types/battle";

// ---------------------------------------------------------------------------
// Battle engine service
// ---------------------------------------------------------------------------

interface BattleEngineService {
  createBattle(
    playerTeam: readonly BattlePokemon[],
    opponentTeam: readonly BattlePokemon[]
  ): BattleState;
  executeMove(state: BattleState, moveIndex: number): Result<BattleState, DamageCalcError>;
  switchPokemon(state: BattleState, pokemonIndex: number): Result<BattleState, string>;
  checkFainted(state: BattleState): BattleState;
  endTurn(state: BattleState): BattleState;
}

const BattleEnginePort = port<BattleEngineService>()({
  name: "BattleEngine",
  category: "domain",
  description: "Core battle logic: move execution, switching, faint checks, turn lifecycle",
});

// ---------------------------------------------------------------------------
// Damage calculation service
// ---------------------------------------------------------------------------

interface DamageCalcService {
  calculate(input: DamageCalcInput): Result<DamageResult, DamageCalcError>;
}

const DamageCalcPort = port<DamageCalcService>()({
  name: "DamageCalc",
  category: "domain",
  description: "Pokemon damage formula implementation with type effectiveness",
});

// ---------------------------------------------------------------------------
// AI strategy service
// ---------------------------------------------------------------------------

interface AiStrategyService {
  selectAction(input: AiMoveInput): AiAction;
}

const AiStrategyPort = port<AiStrategyService>()({
  name: "AiStrategy",
  category: "domain",
  description: "AI opponent move selection strategy (swappable: random vs smart)",
});

export { BattleEnginePort, DamageCalcPort, AiStrategyPort };
export type { BattleEngineService, DamageCalcService, AiStrategyService };
