/**
 * Battle page - main container for the Pokemon battle simulator.
 *
 * Manages two phases:
 * 1. Team selection: pick 3 Pokemon from the Gen 1 roster
 * 2. Active battle: execute moves, switch Pokemon, view battle log
 *
 * Uses BattleEnginePort for core battle logic. The page is rendered
 * inside a BattleScopeProvider, giving it access to scoped battle services.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useCallback } from "react";
import { usePort } from "@hex-di/react";
import type { BattleState, BattlePokemon } from "@pokenerve/shared/types/battle";
import { BattleEnginePort } from "../../ports/battle.js";
import { TeamSelector } from "./TeamSelector.js";
import { BattleField } from "./BattleField.js";
import { MoveSelector } from "./MoveSelector.js";
import { BattleLog } from "./BattleLog.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "team_select" | "battle";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function BattlePage(): ReactNode {
  const battleEngine = usePort(BattleEnginePort);

  const [phase, setPhase] = useState<Phase>("team_select");
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle battle start from team selection
  const handleStartBattle = useCallback(
    (playerTeam: readonly BattlePokemon[], opponentTeam: readonly BattlePokemon[]) => {
      const state = battleEngine.createBattle(playerTeam, opponentTeam);
      setBattleState(state);
      setPhase("battle");
      setErrorMessage(null);
    },
    [battleEngine]
  );

  // Handle player selecting a move
  const handleSelectMove = useCallback(
    (moveIndex: number) => {
      if (battleState === null) return;
      if (battleState.status !== "active") return;

      setErrorMessage(null);

      // Execute the player's move (AI responds within executeMove)
      const moveResult = battleEngine.executeMove(battleState, moveIndex);

      if (moveResult.isErr()) {
        const error = moveResult.error;
        switch (error._tag) {
          case "InvalidMove":
            setErrorMessage(error.reason);
            return;
          case "FaintedAttacker":
            setErrorMessage("Your Pokemon has fainted!");
            return;
          case "FaintedDefender":
            setErrorMessage("The opposing Pokemon has already fainted!");
            return;
          case "NoPpRemaining":
            setErrorMessage(`${error.moveName} has no PP remaining!`);
            return;
        }
      }

      // Check for fainted Pokemon
      let nextState = battleEngine.checkFainted(moveResult.value);

      // End turn if battle is still active
      if (nextState.status === "active") {
        nextState = battleEngine.endTurn(nextState);

        // Re-check fainted after status damage
        nextState = battleEngine.checkFainted(nextState);
      }

      setBattleState(nextState);
    },
    [battleState, battleEngine]
  );

  // Handle switching Pokemon
  const handleSwitchPokemon = useCallback(
    (pokemonIndex: number) => {
      if (battleState === null) return;
      if (battleState.status !== "active") return;

      const switchResult = battleEngine.switchPokemon(battleState, pokemonIndex);
      if (switchResult.isErr()) {
        setErrorMessage(switchResult.error);
        return;
      }

      setBattleState(switchResult.value);
      setErrorMessage(null);
    },
    [battleState, battleEngine]
  );

  // Handle returning to team select
  const handleNewBattle = useCallback(() => {
    setBattleState(null);
    setPhase("team_select");
    setErrorMessage(null);
  }, []);

  // -----------------------------------------------------------------------
  // Render: Team Selection Phase
  // -----------------------------------------------------------------------

  if (phase === "team_select") {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="mb-1 text-2xl font-bold text-red-400">Battle Simulator</h2>
          <p className="text-sm text-gray-500">
            Simulate Pokemon battles with real-time damage calculations.
          </p>
        </div>
        <TeamSelector onStartBattle={handleStartBattle} />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Active Battle Phase
  // -----------------------------------------------------------------------

  if (battleState === null) {
    return null;
  }

  const activePlayer = battleState.playerTeam[battleState.activePlayerIndex];
  const activeOpponent = battleState.opponentTeam[battleState.activeOpponentIndex];

  if (!activePlayer || !activeOpponent) {
    return null;
  }

  const battleOver = battleState.status !== "active";

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="mb-1 text-2xl font-bold text-red-400">Battle Simulator</h2>
          <p className="text-sm text-gray-500">
            Turn {battleState.turn}
            {battleOver && (
              <span className="ml-2 font-semibold text-yellow-400">
                {battleState.status === "player_win" && "Victory!"}
                {battleState.status === "opponent_win" && "Defeat!"}
                {battleState.status === "draw" && "Draw!"}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewBattle}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
        >
          New Battle
        </button>
      </div>

      {/* Error banner */}
      {errorMessage !== null && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Battle field + Controls */}
        <div className="space-y-4">
          <BattleField
            playerPokemon={activePlayer}
            opponentPokemon={activeOpponent}
            weather={battleState.weather}
            terrain={battleState.terrain}
          />

          {/* Move selector */}
          {!battleOver && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-400">Choose a Move</h3>
              <MoveSelector
                moves={activePlayer.moves}
                onSelectMove={handleSelectMove}
                disabled={battleOver}
              />
            </div>
          )}

          {/* Pokemon switch buttons */}
          {!battleOver && battleState.playerTeam.length > 1 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-400">Switch Pokemon</h3>
              <div className="flex flex-wrap gap-2">
                {battleState.playerTeam.map((pokemon, index) => {
                  const isCurrent = index === battleState.activePlayerIndex;
                  const isFainted = pokemon.currentHp <= 0;
                  const canSwitch = !isCurrent && !isFainted;

                  return (
                    <button
                      key={pokemon.pokemon.id}
                      type="button"
                      onClick={() => handleSwitchPokemon(index)}
                      disabled={!canSwitch}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        isCurrent
                          ? "border-red-600 bg-red-900/30 text-red-300"
                          : isFainted
                            ? "cursor-not-allowed border-gray-800 bg-gray-800/30 text-gray-600 opacity-50"
                            : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${String(pokemon.pokemon.id)}.png`}
                        alt={pokemon.pokemon.name}
                        className={`h-8 w-8 ${isFainted ? "grayscale" : ""}`}
                        loading="lazy"
                      />
                      <span className="capitalize">{pokemon.pokemon.name}</span>
                      <span className="text-xs text-gray-500">
                        {pokemon.currentHp}/{pokemon.maxHp}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Battle over actions */}
          {battleOver && (
            <div className="rounded-xl border border-yellow-800/50 bg-yellow-900/20 p-6 text-center">
              <p className="mb-4 text-lg font-bold text-yellow-300">
                {battleState.status === "player_win" && "Congratulations, you won!"}
                {battleState.status === "opponent_win" && "Better luck next time..."}
                {battleState.status === "draw" && "It's a draw!"}
              </p>
              <button
                type="button"
                onClick={handleNewBattle}
                className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Battle Again
              </button>
            </div>
          )}
        </div>

        {/* Right: Battle log */}
        <div>
          <BattleLog entries={battleState.log} />

          {/* Team overview */}
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-400">Your Team</h3>
              {battleState.playerTeam.map((pokemon, index) => (
                <div
                  key={pokemon.pokemon.id}
                  className={`flex items-center gap-2 rounded py-1 text-sm ${
                    index === battleState.activePlayerIndex ? "text-white" : "text-gray-500"
                  }`}
                >
                  <span className={pokemon.currentHp <= 0 ? "line-through" : ""}>
                    {pokemon.pokemon.name}
                  </span>
                  <span className="ml-auto text-xs">
                    {pokemon.currentHp}/{pokemon.maxHp}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-400">Opponent Team</h3>
              {battleState.opponentTeam.map((pokemon, index) => (
                <div
                  key={pokemon.pokemon.id}
                  className={`flex items-center gap-2 rounded py-1 text-sm ${
                    index === battleState.activeOpponentIndex ? "text-white" : "text-gray-500"
                  }`}
                >
                  <span className={pokemon.currentHp <= 0 ? "line-through" : ""}>
                    {pokemon.pokemon.name}
                  </span>
                  <span className="ml-auto text-xs">
                    {pokemon.currentHp}/{pokemon.maxHp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { BattlePage };
