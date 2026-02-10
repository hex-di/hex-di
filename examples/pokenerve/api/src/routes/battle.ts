import { Hono } from "hono";
import type { BattleState, BattleLogEntry, BattleStatus } from "@pokenerve/shared/types/battle.js";

const battles = new Map<string, BattleState>();

let battleCounter = 0;

function generateBattleId(): string {
  battleCounter++;
  return `battle-${Date.now()}-${battleCounter}`;
}

const battleRoutes = new Hono();

// POST /battle/start - create a new battle
battleRoutes.post("/battle/start", async c => {
  const body = await c.req.json<{
    playerTeam?: string[];
    opponentTeam?: string[];
  }>();

  const battleId = generateBattleId();
  const now = Date.now();

  const initialLog: BattleLogEntry = {
    turn: 0,
    timestamp: now,
    message: "Battle started!",
    type: "system",
  };

  const initialState: BattleState = {
    id: battleId,
    turn: 0,
    playerTeam: [],
    opponentTeam: [],
    weather: "none",
    terrain: "none",
    activePlayerIndex: 0,
    activeOpponentIndex: 0,
    log: [initialLog],
    status: "team_preview" satisfies BattleStatus,
  };

  battles.set(battleId, initialState);

  return c.json(
    {
      id: battleId,
      status: initialState.status,
      message: "Battle created. Submit moves to advance.",
      playerTeamRequest: body.playerTeam ?? [],
      opponentTeamRequest: body.opponentTeam ?? [],
    },
    201
  );
});

// POST /battle/:id/move - execute a move
battleRoutes.post("/battle/:id/move", async c => {
  const id = c.req.param("id");
  const state = battles.get(id);

  if (state === undefined) {
    return c.json({ error: `Battle ${id} not found` }, 404);
  }

  if (state.status === "player_win" || state.status === "opponent_win" || state.status === "draw") {
    return c.json({ error: "Battle is already over", status: state.status }, 400);
  }

  const body = await c.req.json<{
    action: "move" | "switch";
    moveIndex?: number;
    pokemonIndex?: number;
  }>();

  const now = Date.now();
  const newTurn = state.turn + 1;

  const moveLog: BattleLogEntry = {
    turn: newTurn,
    timestamp: now,
    message: `Turn ${newTurn}: Player used action '${body.action}'${body.moveIndex !== undefined ? ` (move index: ${body.moveIndex})` : ""}`,
    type: body.action === "move" ? "move" : "switch",
  };

  // Simplified battle simulation - advance turns
  const newStatus: BattleStatus = newTurn >= 10 ? "player_win" : "active";

  const updatedState: BattleState = {
    ...state,
    turn: newTurn,
    status: newStatus,
    log: [...state.log, moveLog],
  };

  battles.set(id, updatedState);

  return c.json({
    id,
    turn: newTurn,
    status: updatedState.status,
    log: [moveLog],
  });
});

// GET /battle/:id - get battle state
battleRoutes.get("/battle/:id", c => {
  const id = c.req.param("id");
  const state = battles.get(id);

  if (state === undefined) {
    return c.json({ error: `Battle ${id} not found` }, 404);
  }

  return c.json(state);
});

export { battleRoutes };
