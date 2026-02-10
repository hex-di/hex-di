# Feature 4 -- Battle Simulator

The showcase centerpiece. A full turn-based Pokemon battle powered by `@hex-di/flow` state machines, reactive state via `@hex-di/store`, and comprehensive distributed tracing to Jaeger. This feature exercises 9 HexDI packages simultaneously -- the most of any feature in PokeNerve.

**HexDI packages:** `@hex-di/core`, `@hex-di/graph`, `@hex-di/runtime`, `@hex-di/result`, `@hex-di/tracing`, `@hex-di/flow`, `@hex-di/store`, `@hex-di/react`, `@hex-di/hono`

---

## 1. Battle State Model

### Core Domain Types

```typescript
type Weather = "sun" | "rain" | "sandstorm" | "hail";
type Terrain = "electric" | "grassy" | "misty" | "psychic";
type StatusCondition = "burn" | "freeze" | "paralysis" | "poison" | "bad-poison" | "sleep";
type VolatileStatus = "confusion" | "flinch" | "leech-seed" | "substitute" | "protect";
type StatName = "attack" | "defense" | "special-attack" | "special-defense" | "speed";

interface BattleMove {
  readonly id: number;
  readonly name: string;
  readonly type: string;
  readonly category: "physical" | "special" | "status";
  readonly power: number | null;
  readonly accuracy: number | null;
  readonly pp: number;
}

interface BattlePokemon {
  readonly pokemon: Pokemon;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly statStages: Record<StatName, number>; // -6 to +6
  readonly status: StatusCondition | null;
  readonly volatileStatuses: readonly VolatileStatus[];
  readonly moves: readonly BattleMove[];
  readonly ppRemaining: Record<string, number>;
}

interface BattleLogEntry {
  readonly turn: number;
  readonly message: string;
  readonly timestamp: number;
  readonly type: "move" | "damage" | "status" | "faint" | "switch" | "weather" | "info";
}

interface BattleContext {
  readonly turn: number;
  readonly playerTeam: readonly BattlePokemon[];
  readonly opponentTeam: readonly BattlePokemon[];
  readonly activePlayerIndex: number;
  readonly activeOpponentIndex: number;
  readonly weather: Weather | null;
  readonly weatherTurnsRemaining: number;
  readonly terrain: Terrain | null;
  readonly terrainTurnsRemaining: number;
  readonly battleLog: readonly BattleLogEntry[];
  readonly playerSelectedMove: number | null;
  readonly opponentSelectedMove: number | null;
}
```

### Result Types for Damage Calculation

```typescript
interface DamageResult {
  readonly baseDamage: number;
  readonly stab: boolean;
  readonly effectiveness: 0 | 0.25 | 0.5 | 1 | 2 | 4;
  readonly critical: boolean;
  readonly randomFactor: number;
  readonly finalDamage: number;
  readonly effectivenessLabel: "immune" | "not-very-effective" | "neutral" | "super-effective";
}

type DamageCalcError =
  | { readonly _tag: "MoveHasNoPower"; readonly moveName: string }
  | { readonly _tag: "MoveMissed"; readonly moveName: string; readonly accuracy: number }
  | {
      readonly _tag: "StatusPrevents";
      readonly status: StatusCondition;
      readonly moveName: string;
    };
```

The `calculateDamage` function returns `Result<DamageResult, DamageCalcError>` using `ok()` and `err()` from `@hex-di/result`. No exceptions are thrown.

---

## 2. Battle Flow Machine Definition

The battle machine uses `defineMachine()` from `@hex-di/flow` with compound and parallel state support.

### Top-level Machine

```typescript
import { defineMachine, Effect, guard } from "@hex-di/flow";
import { createPort } from "@hex-di/core";

// --- Ports ---

interface DamageCalcService {
  calculate(
    attacker: BattlePokemon,
    defender: BattlePokemon,
    move: BattleMove,
    weather: Weather | null,
    terrain: Terrain | null
  ): Result<DamageResult, DamageCalcError>;
}

interface AiStrategy {
  selectMove(
    aiTeam: readonly BattlePokemon[],
    activeIndex: number,
    playerTeam: readonly BattlePokemon[],
    playerActiveIndex: number
  ): number;
}

const DamageCalcPort = createPort<DamageCalcService>("DamageCalc");
const AiStrategyPort = createPort<AiStrategy>("AiStrategy");

// --- Guards ---

const canUseMove = guard("canUseMove", (ctx: BattleContext) => {
  if (ctx.playerSelectedMove === null) return false;
  const active = ctx.playerTeam[ctx.activePlayerIndex];
  const move = active.moves[ctx.playerSelectedMove];
  return active.ppRemaining[move.name] > 0;
});

const isAlive = guard("isAlive", (ctx: BattleContext) => {
  const player = ctx.playerTeam[ctx.activePlayerIndex];
  const opponent = ctx.opponentTeam[ctx.activeOpponentIndex];
  return player.currentHp > 0 && opponent.currentHp > 0;
});

const hasRemainingPokemon = guard(
  "hasRemainingPokemon",
  (ctx: BattleContext, event: { readonly type: string }) => {
    const team = event.type === "PLAYER_FAINTED" ? ctx.playerTeam : ctx.opponentTeam;
    return team.some(p => p.currentHp > 0);
  }
);

const isFasterThan = guard("isFasterThan", (ctx: BattleContext) => {
  const playerPoke = ctx.playerTeam[ctx.activePlayerIndex];
  const opponentPoke = ctx.opponentTeam[ctx.activeOpponentIndex];
  const playerSpeed =
    playerPoke.pokemon.stats.speed * getStatMultiplier(playerPoke.statStages.speed);
  const opponentSpeed =
    opponentPoke.pokemon.stats.speed * getStatMultiplier(opponentPoke.statStages.speed);
  return playerSpeed >= opponentSpeed;
});

// --- Machine Definition ---

const battleMachine = defineMachine({
  id: "battle",
  context: {
    turn: 0,
    playerTeam: [],
    opponentTeam: [],
    activePlayerIndex: 0,
    activeOpponentIndex: 0,
    weather: null,
    weatherTurnsRemaining: 0,
    terrain: null,
    terrainTurnsRemaining: 0,
    battleLog: [],
    playerSelectedMove: null,
    opponentSelectedMove: null,
  } satisfies BattleContext,
  states: {
    idle: {
      on: {
        START_BATTLE: {
          target: "team_preview",
          actions: [
            (ctx, evt) => ({
              ...ctx,
              playerTeam: evt.payload.playerTeam,
              opponentTeam: evt.payload.opponentTeam,
            }),
          ],
        },
      },
    },
    team_preview: {
      on: {
        CONFIRM_TEAM: "battle_start",
      },
    },
    battle_start: {
      entry: [Effect.log("Battle started!")],
      always: "turn_start",
    },
    turn_start: {
      entry: [Effect.invoke(AiStrategyPort, "selectMove", [])],
      on: {
        AI_MOVE_SELECTED: {
          target: "move_select",
          actions: [
            (ctx, evt) => ({
              ...ctx,
              turn: ctx.turn + 1,
              opponentSelectedMove: evt.payload.moveIndex,
            }),
          ],
        },
      },
    },
    move_select: {
      on: {
        SELECT_MOVE: {
          target: "priority_calc",
          guard: canUseMove,
          actions: [
            (ctx, evt) => ({
              ...ctx,
              playerSelectedMove: evt.payload.moveIndex,
            }),
          ],
        },
      },
    },
    priority_calc: {
      always: [
        { target: "player_move_first", guard: isFasterThan },
        { target: "opponent_move_first" },
      ],
    },
    player_move_first: {
      type: "compound",
      states: {
        player_attacks: {
          entry: [Effect.invoke(DamageCalcPort, "calculate", [])],
          on: {
            DAMAGE_APPLIED: "opponent_attacks",
            DEFENDER_FAINTED: "faint_check",
          },
        },
        opponent_attacks: {
          entry: [Effect.invoke(DamageCalcPort, "calculate", [])],
          on: {
            DAMAGE_APPLIED: { type: "final" },
            DEFENDER_FAINTED: "faint_check",
          },
        },
        faint_check: { type: "final" },
      },
      onDone: "faint_check",
    },
    opponent_move_first: {
      type: "compound",
      states: {
        opponent_attacks: {
          entry: [Effect.invoke(DamageCalcPort, "calculate", [])],
          on: {
            DAMAGE_APPLIED: "player_attacks",
            DEFENDER_FAINTED: "faint_check",
          },
        },
        player_attacks: {
          entry: [Effect.invoke(DamageCalcPort, "calculate", [])],
          on: {
            DAMAGE_APPLIED: { type: "final" },
            DEFENDER_FAINTED: "faint_check",
          },
        },
        faint_check: { type: "final" },
      },
      onDone: "faint_check",
    },
    faint_check: {
      always: [
        {
          target: "switch_prompt",
          guard: guard(
            "playerFainted",
            ctx =>
              ctx.playerTeam[ctx.activePlayerIndex].currentHp <= 0 &&
              ctx.playerTeam.some(p => p.currentHp > 0)
          ),
        },
        {
          target: "battle_end",
          guard: guard(
            "noRemainingPokemon",
            ctx =>
              ctx.playerTeam.every(p => p.currentHp <= 0) ||
              ctx.opponentTeam.every(p => p.currentHp <= 0)
          ),
        },
        { target: "turn_end" },
      ],
    },
    switch_prompt: {
      on: {
        SWITCH_POKEMON: {
          target: "turn_end",
          actions: [
            (ctx, evt) => ({
              ...ctx,
              activePlayerIndex: evt.payload.newIndex,
            }),
          ],
        },
      },
    },
    turn_end: {
      entry: [
        Effect.invoke(DamageCalcPort, "calculate", []), // weather/status damage
      ],
      on: {
        TURN_EFFECTS_APPLIED: {
          target: "turn_start",
          actions: [
            ctx => ({
              ...ctx,
              playerSelectedMove: null,
              opponentSelectedMove: null,
            }),
          ],
        },
      },
    },
    battle_end: {
      type: "final",
      entry: [Effect.log("Battle ended!")],
    },
  },
});
```

### Events Summary

| Event                  | Payload                           | Trigger                      |
| ---------------------- | --------------------------------- | ---------------------------- |
| `START_BATTLE`         | `{ playerTeam, opponentTeam }`    | User starts a battle         |
| `CONFIRM_TEAM`         | none                              | User confirms team preview   |
| `AI_MOVE_SELECTED`     | `{ moveIndex }`                   | AI adapter selects a move    |
| `SELECT_MOVE`          | `{ moveIndex }`                   | User selects a move          |
| `DAMAGE_APPLIED`       | `{ damage: DamageResult }`        | Damage calculation completes |
| `DEFENDER_FAINTED`     | `{ who: 'player' \| 'opponent' }` | A Pokemon's HP reaches 0     |
| `SWITCH_POKEMON`       | `{ newIndex }`                    | User selects replacement     |
| `TURN_EFFECTS_APPLIED` | none                              | End-of-turn effects complete |
| `FORFEIT`              | none                              | User forfeits the battle     |

### State Diagram

```
idle --> team_preview --> battle_start --> turn_start --> move_select
                                              ^              |
                                              |         priority_calc
                                              |          /       \
                                          turn_end  player_move  opponent_move
                                              ^    _first        _first
                                              |       \          /
                                              +--- faint_check --+
                                                       |
                                                  switch_prompt
                                                       |
                                                  battle_end (final)
```

---

## 3. Damage Calculation Formula

Implements the Gen V damage formula. This is a pure function returning `Result<DamageResult, DamageCalcError>`.

```typescript
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";

function getStatMultiplier(stage: number): number {
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

function calculateDamage(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: BattleMove,
  weather: Weather | null,
  typeEffectivenessMap: Map<string, Map<string, number>>
): Result<DamageResult, DamageCalcError> {
  // Status moves have no damage
  if (move.power === null) {
    return err({ _tag: "MoveHasNoPower", moveName: move.name });
  }

  // Accuracy check
  if (move.accuracy !== null) {
    const roll = Math.random() * 100;
    if (roll > move.accuracy) {
      return err({ _tag: "MoveMissed", moveName: move.name, accuracy: move.accuracy });
    }
  }

  // Status prevention checks
  if (attacker.status === "freeze" && move.type !== "fire") {
    return err({ _tag: "StatusPrevents", status: "freeze", moveName: move.name });
  }
  if (attacker.status === "paralysis" && Math.random() < 0.25) {
    return err({ _tag: "StatusPrevents", status: "paralysis", moveName: move.name });
  }

  const level = 50; // All Pokemon are level 50

  // Attack/Defense selection based on category
  const attackStat = move.category === "physical" ? "attack" : "special-attack";
  const defenseStat = move.category === "physical" ? "defense" : "special-defense";

  const A = attacker.pokemon.stats[attackStat] * getStatMultiplier(attacker.statStages[attackStat]);
  const D =
    defender.pokemon.stats[defenseStat] * getStatMultiplier(defender.statStages[defenseStat]);

  // Base damage: ((2 * Level / 5 + 2) * Power * A / D) / 50 + 2
  const baseDamage = Math.floor((((2 * level) / 5 + 2) * move.power * A) / D / 50 + 2);

  // STAB (Same Type Attack Bonus)
  const stab = attacker.pokemon.types.includes(move.type);
  const stabMultiplier = stab ? 1.5 : 1.0;

  // Type effectiveness (from the type graph)
  let effectiveness: number = 1;
  for (const defenderType of defender.pokemon.types) {
    const typeRow = typeEffectivenessMap.get(move.type);
    const multiplier = typeRow?.get(defenderType) ?? 1;
    effectiveness *= multiplier;
  }

  // Critical hit (1/16 chance)
  const critical = Math.random() < 1 / 16;
  const criticalMultiplier = critical ? 1.5 : 1.0;

  // Random factor (0.85 to 1.00)
  const randomFactor = 0.85 + Math.random() * 0.15;

  // Weather modifier
  let weatherMultiplier = 1.0;
  if (weather === "sun" && move.type === "fire") weatherMultiplier = 1.5;
  if (weather === "sun" && move.type === "water") weatherMultiplier = 0.5;
  if (weather === "rain" && move.type === "water") weatherMultiplier = 1.5;
  if (weather === "rain" && move.type === "fire") weatherMultiplier = 0.5;

  // Burn penalty for physical moves
  const burnPenalty = attacker.status === "burn" && move.category === "physical" ? 0.5 : 1.0;

  // Final damage
  const modifier =
    stabMultiplier *
    effectiveness *
    criticalMultiplier *
    randomFactor *
    weatherMultiplier *
    burnPenalty;
  const finalDamage = Math.max(1, Math.floor(baseDamage * modifier));

  // Effectiveness label
  const effectivenessLabel: DamageResult["effectivenessLabel"] =
    effectiveness === 0
      ? "immune"
      : effectiveness < 1
        ? "not-very-effective"
        : effectiveness > 1
          ? "super-effective"
          : "neutral";

  return ok({
    baseDamage,
    stab,
    effectiveness: effectiveness as DamageResult["effectiveness"],
    critical,
    randomFactor,
    finalDamage,
    effectivenessLabel,
  });
}
```

---

## 4. AI Strategy Adapters

Two implementations of `AiStrategyPort`, swappable at runtime via the DI container.

### Port Definition

```typescript
import { createPort } from "@hex-di/core";

interface AiStrategy {
  selectMove(
    aiTeam: readonly BattlePokemon[],
    activeIndex: number,
    playerTeam: readonly BattlePokemon[],
    playerActiveIndex: number
  ): number;
}

const AiStrategyPort = createPort<AiStrategy>("AiStrategy");
```

### RandomAiAdapter

Picks a random valid move (one with PP remaining). Falls back to index 0 if no moves have PP (struggle equivalent).

```typescript
import { createAdapter, SCOPED, SYNC } from "@hex-di/core";

const RandomAiAdapter = createAdapter({
  provides: AiStrategyPort,
  lifetime: SCOPED,
  factory: () => ({
    selectMove(aiTeam, activeIndex) {
      const active = aiTeam[activeIndex];
      const validMoves = active.moves
        .map((m, i) => ({ move: m, index: i }))
        .filter(({ move }) => active.ppRemaining[move.name] > 0);
      if (validMoves.length === 0) return 0;
      return validMoves[Math.floor(Math.random() * validMoves.length)].index;
    },
  }),
});
```

### SmartAiAdapter

Selects the move with the highest expected damage. Considers type effectiveness, STAB bonus, and base power. Requires the type effectiveness map from the Type Synergy Graph feature.

```typescript
import { createPort, createAdapter, SCOPED, SYNC } from "@hex-di/core";

interface TypeChartService {
  getEffectiveness(attackType: string, defenseTypes: readonly string[]): number;
}

const TypeChartPort = createPort<TypeChartService>("TypeChart");

const SmartAiAdapter = createAdapter({
  provides: AiStrategyPort,
  requires: [TypeChartPort] as const,
  lifetime: SCOPED,
  factory: deps => ({
    selectMove(aiTeam, activeIndex, playerTeam, playerActiveIndex) {
      const active = aiTeam[activeIndex];
      const target = playerTeam[playerActiveIndex];
      const typeChart = deps[TypeChartPort.__portName];

      let bestIndex = 0;
      let bestScore = -1;

      for (let i = 0; i < active.moves.length; i++) {
        const move = active.moves[i];
        if (active.ppRemaining[move.name] <= 0) continue;
        if (move.power === null) continue;

        const effectiveness = typeChart.getEffectiveness(move.type, target.pokemon.types);
        const stab = active.pokemon.types.includes(move.type) ? 1.5 : 1.0;
        const score = move.power * effectiveness * stab;

        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      return bestIndex;
    },
  }),
});
```

The user can switch between `RandomAiAdapter` and `SmartAiAdapter` from the UI. Brain View shows the `AiStrategy` node in the dependency graph change its bound adapter in real-time.

---

## 5. Store Integration

Reactive battle state using `@hex-di/store` atoms and derived values.

### Atom Definitions

```typescript
import {
  createAtomPort,
  createDerivedPort,
  createAtomAdapter,
  createDerivedAdapter,
} from "@hex-di/store";

// Active Pokemon references (derived from the full battle context)
const ActivePlayerPokemonPort = createDerivedPort<BattlePokemon>()({
  name: "ActivePlayerPokemon",
});

const ActiveOpponentPokemonPort = createDerivedPort<BattlePokemon>()({
  name: "ActiveOpponentPokemon",
});

// Available moves (filters out PP-depleted moves)
const AvailableMovesPort = createDerivedPort<readonly BattleMove[]>()({
  name: "AvailableMoves",
});

// Can switch (checks if player has remaining non-fainted Pokemon)
const CanSwitchPort = createDerivedPort<boolean>()({
  name: "CanSwitch",
});
```

### Derived Value Computations

The `ActivePlayerPokemonPort` adapter selects from the battle context. The `AvailableMovesPort` filters moves where `ppRemaining > 0`. The `CanSwitchPort` checks whether any non-active, non-fainted Pokemon exist in the team.

These derived values recompute automatically when the Flow machine's context updates after each transition. The React components subscribe to the derived values through `@hex-di/store` hooks, receiving granular re-renders only when the specific derived value changes.

---

## 6. Trace Span Architecture

Every battle action produces structured trace spans using `@hex-di/tracing`. The `instrumentContainer` function instruments the battle container scope, and the `createFlowTracingBridge` from `@hex-di/flow` connects Flow transitions to trace spans.

### Span Hierarchy

A single battle generates approximately 50--100 spans. Viewed in Jaeger as a flame graph, each turn is a parent span with child spans for each action.

```
battle (root span)
  |-- battle.turn [turn.number=1]
  |     |-- battle.move.select [move.name="Thunderbolt", player="user"]
  |     |-- battle.move.select [move.name="Flamethrower", player="ai"]
  |     |-- battle.move.execute [move.name="Thunderbolt", move.type="electric", move.category="special"]
  |     |     |-- battle.damage.calc [damage.base=85, damage.stab=true, damage.effectiveness=2, damage.critical=false, damage.final=148]
  |     |-- battle.effect.apply [effect.type="status_damage", effect.target="opponent"]
  |     |-- battle.move.execute [move.name="Flamethrower", move.type="fire", move.category="special"]
  |     |     |-- battle.damage.calc [damage.base=90, damage.stab=true, damage.effectiveness=1, damage.critical=false, damage.final=95]
  |-- battle.turn [turn.number=2]
  |     |-- ...
  |-- battle.faint [pokemon.name="Charizard"]
```

### Span Attribute Reference

| Span Name             | Attributes                                                                              |
| --------------------- | --------------------------------------------------------------------------------------- |
| `battle.turn`         | `turn.number`                                                                           |
| `battle.move.select`  | `move.name`, `player` (`"user"` or `"ai"`)                                              |
| `battle.move.execute` | `move.name`, `move.type`, `move.category`                                               |
| `battle.damage.calc`  | `damage.base`, `damage.stab`, `damage.effectiveness`, `damage.critical`, `damage.final` |
| `battle.effect.apply` | `effect.type` (`"weather"`, `"status_damage"`, `"stat_change"`), `effect.target`        |
| `battle.faint`        | `pokemon.name`                                                                          |

### Tracing Bridge Setup

```typescript
import { createFlowTracingBridge } from "@hex-di/flow";
import { TracerPort } from "@hex-di/tracing";
import { instrumentContainer } from "@hex-di/tracing";

// The FlowTracingBridge connects Flow machine transitions to trace spans
const tracingBridge = createFlowTracingBridge({
  tracer: container.resolve(TracerPort),
  spanPrefix: "battle",
});

// Instrument the battle scope container for automatic port resolution tracing
instrumentContainer(battleScope, {
  tracer: container.resolve(TracerPort),
  filter: { include: ["DamageCalc", "AiStrategy"] },
});
```

---

## 7. React Components

### Component Tree

```
BattlePage
  |-- BattleField
  |     |-- PlayerSide
  |     |     |-- PokemonSprite (player's active Pokemon)
  |     |     |-- HpBar (animated, green -> yellow -> red)
  |     |     |-- StatusEffects (status condition icons)
  |     |-- OpponentSide
  |     |     |-- PokemonSprite (opponent's active Pokemon)
  |     |     |-- HpBar
  |     |     |-- StatusEffects
  |     |-- WeatherOverlay (visual weather indicator)
  |-- MoveSelector (4-move grid with type colors and PP)
  |-- BattleLog (scrolling event log)
```

### Props Interfaces

```typescript
interface BattlePageProps {
  readonly playerTeam: readonly Pokemon[];
}

interface BattleFieldProps {
  readonly playerPokemon: BattlePokemon;
  readonly opponentPokemon: BattlePokemon;
  readonly weather: Weather | null;
}

interface PokemonSpriteProps {
  readonly pokemon: Pokemon;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly isOpponent: boolean;
  readonly isFainting: boolean;
}

interface HpBarProps {
  readonly current: number;
  readonly max: number;
  readonly animationDuration?: number; // default 300ms
}

interface MoveSelectorProps {
  readonly moves: readonly BattleMove[];
  readonly ppRemaining: Record<string, number>;
  readonly disabled: boolean;
  readonly onSelect: (moveIndex: number) => void;
}

interface StatusEffectsProps {
  readonly status: StatusCondition | null;
  readonly volatileStatuses: readonly VolatileStatus[];
}

interface BattleLogProps {
  readonly entries: readonly BattleLogEntry[];
  readonly maxVisible?: number; // default 8
}

interface WeatherOverlayProps {
  readonly weather: Weather | null;
  readonly turnsRemaining: number;
}
```

### Hook Usage in BattlePage

```typescript
import { useMachine } from "@hex-di/flow-react";
import { usePort } from "@hex-di/react";

function BattlePage({ playerTeam }: BattlePageProps) {
  const { state, context, send } = useMachine(BattleFlowPort);

  // MoveSelector calls send({ type: 'SELECT_MOVE', payload: { moveIndex } })
  // BattleField reads from context for HP, status, weather
  // BattleLog reads context.battleLog
}
```

---

## 8. Battle Scope Lifecycle

The battle uses `@hex-di/runtime` scoped containers for isolation.

### Scope Creation

When the user navigates to the battle page, a new child scope is created from the root container. Battle-specific services (`DamageCalcPort`, `AiStrategyPort`, `BattleFlowPort`) are resolved within this scope.

```typescript
import { HexDiAutoScopeProvider } from '@hex-di/react';

function BattleRoute() {
  return (
    <HexDiAutoScopeProvider>
      <BattlePage playerTeam={selectedTeam} />
    </HexDiAutoScopeProvider>
  );
}
```

### Scope Disposal

When the battle ends or the user navigates away, the `HexDiAutoScopeProvider` unmounts, which disposes the scope. This triggers:

1. The `MachineRunner.dispose()` call, which stops all running activities.
2. All scoped singleton services within the battle scope are garbage collected.
3. Brain View's Memory Banks panel shows the scope node fading from the scope tree.

### Lifetime Configuration

| Port             | Lifetime    | Rationale                                      |
| ---------------- | ----------- | ---------------------------------------------- |
| `DamageCalcPort` | `SCOPED`    | Pure calculation, but scoped for easy disposal |
| `AiStrategyPort` | `SCOPED`    | Can be swapped mid-session                     |
| `BattleFlowPort` | `SCOPED`    | One battle machine per scope                   |
| `TypeChartPort`  | `SINGLETON` | Shared type chart data across all battles      |
| `TracerPort`     | `SINGLETON` | Single tracer instance for all scopes          |

---

## 9. Backend Integration

The Hono API server provides battle setup and state validation endpoints.

### Endpoints

| Method | Path                        | Purpose                                            |
| ------ | --------------------------- | -------------------------------------------------- |
| `POST` | `/api/battle/start`         | Validate team composition and return opponent team |
| `POST` | `/api/battle/validate-move` | Server-side move legality check                    |
| `GET`  | `/api/battle/leaderboard`   | Battle win/loss statistics                         |

Each endpoint runs within a per-request scope created by the Hono scope middleware from `@hex-di/hono`. Trace context is propagated from the frontend via the `traceparent` header, producing cross-service traces visible in Jaeger.

---

## 10. Acceptance Criteria

1. **Battle completes end-to-end**: A user can start a battle, select moves for each turn, and the battle reaches `battle_end` state with a winner determined.
2. **HP bars animate**: The `HpBar` component transitions smoothly from current to new HP value, with color changing from green (>50%) to yellow (25--50%) to red (<25%).
3. **Damage formula is accurate**: The Gen V formula produces correct base damage values for known move/stat combinations. STAB, type effectiveness, critical hits, and weather modifiers are all applied.
4. **AI adapters are swappable**: Switching between `RandomAiAdapter` and `SmartAiAdapter` from the UI changes the opponent behavior immediately without restarting the battle.
5. **Trace spans are produced**: A 10-turn battle generates at least 50 trace spans. The complete battle is visible in Jaeger as a flame graph with the `battle > battle.turn > battle.move.execute > battle.damage.calc` nesting structure.
6. **Status effects display**: Burn, paralysis, poison, freeze, and sleep icons render next to the affected Pokemon's sprite.
7. **Battle scope lifecycle**: The battle scope appears in Brain View's Memory Banks when entering battle and disappears when leaving. No memory leaks after scope disposal.
8. **Battle log scrolls**: The battle log shows the last 8 entries with auto-scroll. Older entries are accessible by scrolling up.
9. **Faint and switch flow**: When a Pokemon faints, the machine transitions through `faint_check` to `switch_prompt` if the player has remaining Pokemon, or to `battle_end` if not.
10. **Result types, no exceptions**: All damage calculations return `Result<DamageResult, DamageCalcError>`. Move misses and status prevention are modeled as `Err` variants, not thrown exceptions.
