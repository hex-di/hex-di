/** @packageDocumentation */
import { createAdapter } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type {
  BattleState,
  BattlePokemon,
  BattleLogEntry,
  DamageCalcError,
} from "@pokenerve/shared/types/battle";
import { InvalidMove, NoPpRemaining } from "@pokenerve/shared/types/battle";
import { BattleEnginePort, DamageCalcPort, AiStrategyPort } from "../../ports/battle.js";
import type { DamageCalcService, AiStrategyService } from "../../ports/battle.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createLogEntry(
  turn: number,
  message: string,
  type: BattleLogEntry["type"]
): BattleLogEntry {
  return { turn, timestamp: Date.now(), message, type };
}

function generateBattleId(): string {
  return `battle-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function replaceTeamMember(
  team: readonly BattlePokemon[],
  index: number,
  updater: (member: BattlePokemon) => BattlePokemon
): readonly BattlePokemon[] {
  return team.map((member, i) => (i === index ? updater(member) : member));
}

function effectivenessLabel(modifier: number): string {
  if (modifier === 0) return "It had no effect...";
  if (modifier < 1) return "It's not very effective...";
  if (modifier > 1) return "It's super effective!";
  return "";
}

function appendDamageLogs(
  log: BattleLogEntry[],
  dmg: { finalDamage: number; typeModifier: number; criticalHit: boolean },
  ctx: { turn: number; attackerName: string; defenderName: string; moveName: string }
): void {
  log.push(createLogEntry(ctx.turn, `${ctx.attackerName} used ${ctx.moveName}!`, "move"));
  const effLabel = effectivenessLabel(dmg.typeModifier);
  if (effLabel) log.push(createLogEntry(ctx.turn, effLabel, "damage"));
  if (dmg.criticalHit) log.push(createLogEntry(ctx.turn, "A critical hit!", "damage"));
  log.push(
    createLogEntry(ctx.turn, `${ctx.defenderName} took ${dmg.finalDamage} damage!`, "damage")
  );
}

function applyStatusDamage(
  team: readonly BattlePokemon[],
  activeIndex: number,
  statusName: string,
  divisor: number,
  logMsg: string,
  turn: number,
  log: BattleLogEntry[]
): readonly BattlePokemon[] {
  const pokemon = team[activeIndex];
  if (!pokemon || pokemon.status !== statusName) return team;
  const damage = Math.max(1, Math.floor(pokemon.maxHp / divisor));
  const newHp = Math.max(0, pokemon.currentHp - damage);
  log.push(createLogEntry(turn, `${pokemon.pokemon.name} ${logMsg}`, "status"));
  return replaceTeamMember(team, activeIndex, p => ({ ...p, currentHp: newHp }));
}

interface AiAttackResult {
  readonly opponentTeam: readonly BattlePokemon[];
  readonly playerTeam: readonly BattlePokemon[];
}

function executeAiAttack(
  state: BattleState,
  updatedOpponentTeam: readonly BattlePokemon[],
  updatedPlayerTeam: readonly BattlePokemon[],
  newLog: BattleLogEntry[],
  aiStrategy: AiStrategyService,
  damageCalc: DamageCalcService
): AiAttackResult {
  const currentOpponent = updatedOpponentTeam[state.activeOpponentIndex];
  if (!currentOpponent || currentOpponent.currentHp <= 0) {
    return { opponentTeam: updatedOpponentTeam, playerTeam: updatedPlayerTeam };
  }
  const currentPlayer = updatedPlayerTeam[state.activePlayerIndex];
  if (!currentPlayer || currentPlayer.currentHp <= 0) {
    return { opponentTeam: updatedOpponentTeam, playerTeam: updatedPlayerTeam };
  }
  const aiAction = aiStrategy.selectAction({
    ownTeam: updatedOpponentTeam,
    opponentTeam: updatedPlayerTeam,
    activeOwn: currentOpponent,
    activeOpponent: currentPlayer,
    weather: state.weather,
    terrain: state.terrain,
    turn: state.turn,
  });
  if (aiAction._tag !== "UseMove") {
    return { opponentTeam: updatedOpponentTeam, playerTeam: updatedPlayerTeam };
  }
  const aiMove = currentOpponent.moves[aiAction.moveIndex];
  if (!aiMove || aiMove.currentPp <= 0) {
    return { opponentTeam: updatedOpponentTeam, playerTeam: updatedPlayerTeam };
  }
  const aiDamageResult = damageCalc.calculate({
    attacker: currentOpponent,
    defender: currentPlayer,
    move: aiMove.move,
    weather: state.weather,
    terrain: state.terrain,
    isCritical: Math.random() < 0.0625,
  });
  // Deduct AI PP
  const nextOpponentTeam = replaceTeamMember(updatedOpponentTeam, state.activeOpponentIndex, p => ({
    ...p,
    moves: p.moves.map((m, i) =>
      i === aiAction.moveIndex ? { ...m, currentPp: Math.max(0, m.currentPp - 1) } : m
    ),
  }));
  let nextPlayerTeam = updatedPlayerTeam;
  if (aiDamageResult.isOk()) {
    const aiDmg = aiDamageResult.value;
    const newPlayerHp = Math.max(0, currentPlayer.currentHp - aiDmg.finalDamage);
    appendDamageLogs(newLog, aiDmg, {
      turn: state.turn,
      attackerName: currentOpponent.pokemon.name,
      defenderName: currentPlayer.pokemon.name,
      moveName: aiMove.move.name,
    });
    nextPlayerTeam = replaceTeamMember(nextPlayerTeam, state.activePlayerIndex, p => ({
      ...p,
      currentHp: newPlayerHp,
    }));
    if (newPlayerHp <= 0) {
      newLog.push(createLogEntry(state.turn, `${currentPlayer.pokemon.name} fainted!`, "faint"));
    }
  }
  return { opponentTeam: nextOpponentTeam, playerTeam: nextPlayerTeam };
}

// ---------------------------------------------------------------------------
// Battle engine adapter
// ---------------------------------------------------------------------------

const battleEngineAdapter = createAdapter({
  provides: BattleEnginePort,
  requires: [DamageCalcPort, AiStrategyPort],
  lifetime: "scoped",
  factory: deps => {
    const damageCalc = deps.DamageCalc;
    const aiStrategy = deps.AiStrategy;

    return {
      createBattle(
        playerTeam: readonly BattlePokemon[],
        opponentTeam: readonly BattlePokemon[]
      ): BattleState {
        return {
          id: generateBattleId(),
          turn: 1,
          playerTeam,
          opponentTeam,
          weather: "none",
          terrain: "none",
          activePlayerIndex: 0,
          activeOpponentIndex: 0,
          log: [createLogEntry(1, "Battle started!", "system")],
          status: "active",
        };
      },

      executeMove(state: BattleState, moveIndex: number): Result<BattleState, DamageCalcError> {
        const playerPokemon = state.playerTeam[state.activePlayerIndex];
        const opponentPokemon = state.opponentTeam[state.activeOpponentIndex];

        if (!playerPokemon || !opponentPokemon) {
          return err(InvalidMove({ reason: "No active Pokemon found" }));
        }

        const selectedMove = playerPokemon.moves[moveIndex];
        if (!selectedMove) {
          return err(InvalidMove({ reason: "Invalid move index" }));
        }

        if (selectedMove.currentPp <= 0) {
          return err(NoPpRemaining({ moveName: selectedMove.move.name }));
        }

        // --- Player attacks ---
        const playerDamageResult = damageCalc.calculate({
          attacker: playerPokemon,
          defender: opponentPokemon,
          move: selectedMove.move,
          weather: state.weather,
          terrain: state.terrain,
          isCritical: Math.random() < 0.0625,
        });

        const newLog: BattleLogEntry[] = [...state.log];
        let updatedOpponentTeam = state.opponentTeam;
        let updatedPlayerTeam = state.playerTeam;

        // Deduct PP from the selected move
        updatedPlayerTeam = replaceTeamMember(updatedPlayerTeam, state.activePlayerIndex, p => ({
          ...p,
          moves: p.moves.map((m, i) =>
            i === moveIndex ? { ...m, currentPp: Math.max(0, m.currentPp - 1) } : m
          ),
        }));

        if (!playerDamageResult.isOk()) {
          return err(playerDamageResult.error);
        }

        const dmg = playerDamageResult.value;
        const newHp = Math.max(0, opponentPokemon.currentHp - dmg.finalDamage);

        appendDamageLogs(newLog, dmg, {
          turn: state.turn,
          attackerName: playerPokemon.pokemon.name,
          defenderName: opponentPokemon.pokemon.name,
          moveName: selectedMove.move.name,
        });

        updatedOpponentTeam = replaceTeamMember(
          updatedOpponentTeam,
          state.activeOpponentIndex,
          p => ({ ...p, currentHp: newHp })
        );

        if (newHp <= 0) {
          newLog.push(
            createLogEntry(state.turn, `${opponentPokemon.pokemon.name} fainted!`, "faint")
          );
        }

        // --- Opponent AI attacks (if still alive) ---
        const aiResult = executeAiAttack(
          state,
          updatedOpponentTeam,
          updatedPlayerTeam,
          newLog,
          aiStrategy,
          damageCalc
        );

        return ok({
          ...state,
          playerTeam: aiResult.playerTeam,
          opponentTeam: aiResult.opponentTeam,
          log: newLog,
        });
      },

      switchPokemon(state: BattleState, pokemonIndex: number): Result<BattleState, string> {
        if (pokemonIndex < 0 || pokemonIndex >= state.playerTeam.length) {
          return err("Invalid Pokemon index");
        }
        if (pokemonIndex === state.activePlayerIndex) {
          return err("Pokemon is already active");
        }
        const target = state.playerTeam[pokemonIndex];
        if (!target || target.currentHp <= 0) {
          return err("Cannot switch to a fainted Pokemon");
        }

        const newLog = [
          ...state.log,
          createLogEntry(state.turn, `Go, ${target.pokemon.name}!`, "switch"),
        ];

        return ok({
          ...state,
          activePlayerIndex: pokemonIndex,
          log: newLog,
        });
      },

      checkFainted(state: BattleState): BattleState {
        const newLog = [...state.log];

        // Check if opponent's active Pokemon fainted
        const opponentActive = state.opponentTeam[state.activeOpponentIndex];
        let newActiveOpponentIndex = state.activeOpponentIndex;
        let newStatus = state.status;

        if (opponentActive && opponentActive.currentHp <= 0) {
          // Find next alive opponent Pokemon
          const nextOpponentIndex = state.opponentTeam.findIndex(
            (p, i) => i !== state.activeOpponentIndex && p.currentHp > 0
          );

          if (nextOpponentIndex === -1) {
            newStatus = "player_win";
            newLog.push(createLogEntry(state.turn, "You won the battle!", "system"));
          } else {
            newActiveOpponentIndex = nextOpponentIndex;
            const nextOpponent = state.opponentTeam[nextOpponentIndex];
            if (nextOpponent) {
              newLog.push(
                createLogEntry(
                  state.turn,
                  `Opponent sent out ${nextOpponent.pokemon.name}!`,
                  "switch"
                )
              );
            }
          }
        }

        // Check if player's active Pokemon fainted
        const playerActive = state.playerTeam[state.activePlayerIndex];
        let newActivePlayerIndex = state.activePlayerIndex;

        if (playerActive && playerActive.currentHp <= 0 && newStatus === state.status) {
          // Find next alive player Pokemon
          const nextPlayerIndex = state.playerTeam.findIndex(
            (p, i) => i !== state.activePlayerIndex && p.currentHp > 0
          );

          if (nextPlayerIndex === -1) {
            newStatus = "opponent_win";
            newLog.push(createLogEntry(state.turn, "You lost the battle...", "system"));
          } else {
            newActivePlayerIndex = nextPlayerIndex;
            // Auto-switch to next available Pokemon
            const nextPlayer = state.playerTeam[nextPlayerIndex];
            if (nextPlayer) {
              newLog.push(createLogEntry(state.turn, `Go, ${nextPlayer.pokemon.name}!`, "switch"));
            }
          }
        }

        return {
          ...state,
          activePlayerIndex: newActivePlayerIndex,
          activeOpponentIndex: newActiveOpponentIndex,
          status: newStatus,
          log: newLog,
        };
      },

      endTurn(state: BattleState): BattleState {
        const newLog = [...state.log];
        const pi = state.activePlayerIndex;
        const oi = state.activeOpponentIndex;
        const t = state.turn;

        let pTeam = applyStatusDamage(
          state.playerTeam,
          pi,
          "burn",
          16,
          "is hurt by its burn!",
          t,
          newLog
        );
        let oTeam = applyStatusDamage(
          state.opponentTeam,
          oi,
          "burn",
          16,
          "is hurt by its burn!",
          t,
          newLog
        );
        pTeam = applyStatusDamage(pTeam, pi, "poison", 8, "is hurt by poison!", t, newLog);
        oTeam = applyStatusDamage(oTeam, oi, "poison", 8, "is hurt by poison!", t, newLog);

        return { ...state, turn: t + 1, playerTeam: pTeam, opponentTeam: oTeam, log: newLog };
      },
    };
  },
});

export { battleEngineAdapter };
