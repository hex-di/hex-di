# 02 - Core DI Infrastructure & Tracing Setup

## 1. Port Definitions

Every port in PokéNerve follows the HexDI `port<Service>()({ name })` builder pattern. Ports define contracts; adapters provide implementations. All ports live in `frontend/src/ports/`.

### 1.1 Pokemon API Ports

```typescript
// frontend/src/ports/pokemon-api.ts
import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type {
  Pokemon,
  PaginatedResponse,
  NamedAPIResource,
  PokemonSpecies,
  PokemonApiError,
} from "@pokenerve/shared/types/pokemon";

// ---------------------------------------------------------------------------
// Service interfaces
// ---------------------------------------------------------------------------

interface PokemonListService {
  list(params: {
    offset: number;
    limit: number;
    type?: string;
    habitat?: string;
    color?: string;
    shape?: string;
  }): Promise<Result<PaginatedResponse<NamedAPIResource>, PokemonApiError>>;
}

interface PokemonDetailService {
  getById(id: number): Promise<Result<Pokemon, PokemonApiError>>;
  getByName(name: string): Promise<Result<Pokemon, PokemonApiError>>;
  getSpecies(id: number): Promise<Result<PokemonSpecies, PokemonApiError>>;
}

// ---------------------------------------------------------------------------
// Port definitions
// ---------------------------------------------------------------------------

const PokemonListPort = port<PokemonListService>()({
  name: "PokemonList",
  category: "data",
  description: "Fetches paginated Pokemon lists with optional filters",
});

const PokemonDetailPort = port<PokemonDetailService>()({
  name: "PokemonDetail",
  category: "data",
  description: "Fetches full Pokemon data by ID or name",
});
```

### 1.2 Evolution Port

```typescript
// frontend/src/ports/evolution.ts
import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type { EvolutionChain, PokemonApiError } from "@pokenerve/shared/types/pokemon";

interface EvolutionChainService {
  getChain(pokemonId: number): Promise<Result<EvolutionChain, PokemonApiError>>;
  getChainByUrl(url: string): Promise<Result<EvolutionChain, PokemonApiError>>;
}

const EvolutionChainPort = port<EvolutionChainService>()({
  name: "EvolutionChain",
  category: "data",
  description: "Fetches evolution chain data for a Pokemon species",
});
```

### 1.3 Type Effectiveness Port

```typescript
// frontend/src/ports/type-chart.ts
import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type { TypeData, TypeRelations, PokemonApiError } from "@pokenerve/shared/types/pokemon";

interface TypeEffectivenessService {
  getAllTypes(): Promise<Result<readonly TypeData[], PokemonApiError>>;
  getTypeRelations(typeName: string): Promise<Result<TypeRelations, PokemonApiError>>;
  getEffectiveness(attackType: string, defendTypes: readonly string[]): number;
}

const TypeEffectivenessPort = port<TypeEffectivenessService>()({
  name: "TypeEffectiveness",
  category: "data",
  description: "Fetches type damage relations and calculates effectiveness multipliers",
});
```

### 1.4 Battle Ports

```typescript
// frontend/src/ports/battle.ts
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
```

### 1.5 Trading Port

```typescript
// frontend/src/ports/trading.ts
import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";
import type { TradeOffer, TradeSagaState, TradingError } from "@pokenerve/shared/types/trading";
import type { Pokemon } from "@pokenerve/shared/types/pokemon";

interface TradingService {
  initiateTrade(
    offeredPokemon: Pokemon,
    requestedPokemon: Pokemon
  ): Promise<Result<TradeOffer, TradingError>>;
  advanceStep(tradeId: string): Promise<Result<TradeSagaState, TradingError>>;
  cancelTrade(tradeId: string): Promise<Result<TradeSagaState, TradingError>>;
  getTradeState(tradeId: string): Result<TradeSagaState, TradingError>;
}

const TradingPort = port<TradingService>()({
  name: "Trading",
  category: "domain",
  description: "Multi-step trade lifecycle with saga pattern and compensation",
});
```

### 1.6 Storage Port

```typescript
// frontend/src/ports/storage.ts
import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";

interface PersistenceService {
  get<T>(key: string): Result<T | null, PersistenceError>;
  set<T>(key: string, value: T): Result<void, PersistenceError>;
  remove(key: string): Result<void, PersistenceError>;
  clear(): Result<void, PersistenceError>;
}

type PersistenceError =
  | { readonly _tag: "QuotaExceeded"; readonly key: string }
  | { readonly _tag: "SerializationError"; readonly message: string }
  | { readonly _tag: "StorageUnavailable" };

const PersistencePort = port<PersistenceService>()({
  name: "Persistence",
  category: "infrastructure",
  description: "Key-value persistence for trainer data, favorites, and preferences",
});
```

### 1.7 Analytics Port

```typescript
// frontend/src/ports/analytics.ts
import { port } from "@hex-di/core";

interface AnalyticsService {
  track(event: string, properties?: Record<string, string | number | boolean>): void;
  page(name: string): void;
  identify(trainerId: string): void;
}

const AnalyticsPort = port<AnalyticsService>()({
  name: "Analytics",
  category: "infrastructure",
  description: "User interaction tracking for feature usage telemetry",
});
```

---

## 2. Adapter Implementations

All adapters live in `frontend/src/adapters/` and use the HexDI `createAdapter()` factory.

### 2.1 RestPokemonAdapter

Direct PokeAPI REST calls via the backend proxy. All responses are wrapped in `Result<T, PokemonApiError>`.

```typescript
// frontend/src/adapters/api/rest-pokemon.ts
import { createAdapter } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type {
  Pokemon,
  PaginatedResponse,
  NamedAPIResource,
  PokemonSpecies,
  PokemonApiError,
} from "@pokenerve/shared/types/pokemon";
import { PokemonListPort } from "../../ports/pokemon-api";
import { PokemonDetailPort } from "../../ports/pokemon-api";

// ---------------------------------------------------------------------------
// Shared fetch helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string): Promise<Result<T, PokemonApiError>> {
  try {
    const response = await fetch(`/api${path}`);
    if (response.status === 404) {
      return err({ _tag: "NotFoundError", pokemonId: path });
    }
    if (response.status === 429) {
      return err({ _tag: "RateLimitError", retryAfterMs: 1000 });
    }
    if (!response.ok) {
      return err({ _tag: "NetworkError", message: `HTTP ${response.status}` });
    }
    const data: unknown = await response.json();
    return ok(data as T);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    return err({ _tag: "NetworkError", message });
  }
}

// ---------------------------------------------------------------------------
// List adapter
// ---------------------------------------------------------------------------

const restPokemonListAdapter = createAdapter({
  provides: PokemonListPort,
  lifetime: "singleton",
  factory: () => ({
    async list(params) {
      const query = new URLSearchParams({
        offset: String(params.offset),
        limit: String(params.limit),
      });
      if (params.type) query.set("type", params.type);
      if (params.habitat) query.set("habitat", params.habitat);
      if (params.color) query.set("color", params.color);
      if (params.shape) query.set("shape", params.shape);
      return apiFetch<PaginatedResponse<NamedAPIResource>>(`/pokemon?${query}`);
    },
  }),
});

// ---------------------------------------------------------------------------
// Detail adapter
// ---------------------------------------------------------------------------

const restPokemonDetailAdapter = createAdapter({
  provides: PokemonDetailPort,
  lifetime: "singleton",
  factory: () => ({
    async getById(id) {
      return apiFetch<Pokemon>(`/pokemon/${id}`);
    },
    async getByName(name) {
      return apiFetch<Pokemon>(`/pokemon/${name}`);
    },
    async getSpecies(id) {
      return apiFetch<PokemonSpecies>(`/pokemon/${id}/species`);
    },
  }),
});
```

### 2.2 CachedPokemonAdapter

Decorator pattern. Wraps an existing `PokemonDetailPort` adapter with an in-memory LRU cache. Demonstrates adapter composition via the `requires` dependency.

```typescript
// frontend/src/adapters/api/cached-pokemon.ts
import { createAdapter } from "@hex-di/core";
import { PokemonDetailPort } from "../../ports/pokemon-api";
import { PokemonListPort } from "../../ports/pokemon-api";

// ---------------------------------------------------------------------------
// Simple LRU cache
// ---------------------------------------------------------------------------

class LruCache<K, V> {
  private readonly cache = new Map<K, V>();
  constructor(private readonly maxSize: number) {}

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      // Delete oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  get size(): number {
    return this.cache.size;
  }

  get hits(): number {
    return this._hits;
  }

  get misses(): number {
    return this._misses;
  }

  private _hits = 0;
  private _misses = 0;

  trackHit(): void {
    this._hits++;
  }
  trackMiss(): void {
    this._misses++;
  }
}

// ---------------------------------------------------------------------------
// Cached detail adapter (wraps the underlying detail port)
// ---------------------------------------------------------------------------

const cachedPokemonDetailAdapter = createAdapter({
  provides: PokemonDetailPort,
  requires: [PokemonDetailPort],
  lifetime: "singleton",
  factory: deps => {
    const inner = deps.PokemonDetail;
    const cache = new LruCache<string, unknown>(200);

    return {
      async getById(id) {
        const key = `pokemon:${id}`;
        const cached = cache.get(key);
        if (cached !== undefined) {
          cache.trackHit();
          return ok(cached);
        }
        cache.trackMiss();
        const result = await inner.getById(id);
        if (result.isOk()) {
          cache.set(key, result.value);
        }
        return result;
      },
      async getByName(name) {
        const key = `pokemon:name:${name}`;
        const cached = cache.get(key);
        if (cached !== undefined) {
          cache.trackHit();
          return ok(cached);
        }
        cache.trackMiss();
        const result = await inner.getByName(name);
        if (result.isOk()) {
          cache.set(key, result.value);
        }
        return result;
      },
      async getSpecies(id) {
        const key = `species:${id}`;
        const cached = cache.get(key);
        if (cached !== undefined) {
          cache.trackHit();
          return ok(cached);
        }
        cache.trackMiss();
        const result = await inner.getSpecies(id);
        if (result.isOk()) {
          cache.set(key, result.value);
        }
        return result;
      },
    };
  },
});
```

### 2.3 OfflinePokemonAdapter

Returns bundled static data. Works with zero network. Used as a fallback adapter and for demonstrating live adapter swapping in the Discovery Hub.

```typescript
// frontend/src/adapters/api/offline-pokemon.ts
import { createAdapter } from "@hex-di/core";
import { ok } from "@hex-di/result";
import { PokemonListPort } from "../../ports/pokemon-api";
import { PokemonDetailPort } from "../../ports/pokemon-api";
// Static JSON bundled at build time (first 151 Pokemon)
import pokemonData from "../../data/gen1-pokemon.json";

const offlinePokemonListAdapter = createAdapter({
  provides: PokemonListPort,
  lifetime: "singleton",
  factory: () => ({
    async list(params) {
      const filtered = pokemonData.filter(p => {
        if (params.type && !p.types.some(t => t.type.name === params.type)) return false;
        return true;
      });
      const slice = filtered.slice(params.offset, params.offset + params.limit);
      return ok({
        count: filtered.length,
        next: params.offset + params.limit < filtered.length ? "has-more" : null,
        previous: params.offset > 0 ? "has-prev" : null,
        results: slice.map(p => ({ name: p.name, url: `/pokemon/${p.id}` })),
      });
    },
  }),
});

const offlinePokemonDetailAdapter = createAdapter({
  provides: PokemonDetailPort,
  lifetime: "singleton",
  factory: () => ({
    async getById(id) {
      const found = pokemonData.find(p => p.id === id);
      if (!found) return err({ _tag: "NotFoundError", pokemonId: id });
      return ok(found);
    },
    async getByName(name) {
      const found = pokemonData.find(p => p.name === name);
      if (!found) return err({ _tag: "NotFoundError", pokemonId: name });
      return ok(found);
    },
    async getSpecies(id) {
      return err({ _tag: "NotFoundError", pokemonId: id });
    },
  }),
});
```

### 2.4 DamageCalcAdapter

Implements the Pokemon damage formula: `((2*Level/5+2) * Power * A/D) / 50 + 2) * Modifier`.

```typescript
// frontend/src/adapters/battle/damage-calc.ts
import { createAdapter } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import { DamageCalcPort } from "../../ports/battle";
import { TypeEffectivenessPort } from "../../ports/type-chart";

const damageCalcAdapter = createAdapter({
  provides: DamageCalcPort,
  requires: [TypeEffectivenessPort],
  lifetime: "scoped",
  factory: deps => {
    const typeService = deps.TypeEffectiveness;

    return {
      calculate(input) {
        if (input.attacker.currentHp <= 0) return err({ _tag: "FaintedAttacker" });
        if (input.defender.currentHp <= 0) return err({ _tag: "FaintedDefender" });
        if (input.move.power === null)
          return err({ _tag: "InvalidMove", reason: "Status moves deal no damage" });

        const level = 50; // Flat level 50 for simplicity
        const power = input.move.power;
        const isPhysical = input.move.damage_class.name === "physical";

        const attackStat = isPhysical
          ? getEffectiveStat(input.attacker, "attack")
          : getEffectiveStat(input.attacker, "specialAttack");
        const defenseStat = isPhysical
          ? getEffectiveStat(input.defender, "defense")
          : getEffectiveStat(input.defender, "specialDefense");

        const baseDamage = Math.floor(
          (((2 * level) / 5 + 2) * power * attackStat) / defenseStat / 50 + 2
        );

        // STAB (Same Type Attack Bonus)
        const attackerTypes = input.attacker.pokemon.types.map(t => t.type.name);
        const stab = attackerTypes.includes(input.move.type.name);
        const stabModifier = stab ? 1.5 : 1;

        // Type effectiveness
        const defenderTypes = input.defender.pokemon.types.map(t => t.type.name);
        const typeModifier = typeService.getEffectiveness(input.move.type.name, defenderTypes);

        // Critical hit
        const critModifier = input.isCritical ? 1.5 : 1;

        // Random factor (0.85 - 1.0)
        const random = 0.85 + Math.random() * 0.15;

        const finalDamage = Math.max(
          1,
          Math.floor(baseDamage * stabModifier * typeModifier * critModifier * random)
        );

        return ok({
          baseDamage,
          stab,
          effectiveness: typeModifier as Effectiveness,
          criticalHit: input.isCritical,
          finalDamage,
          typeModifier,
        });
      },
    };
  },
});
```

### 2.5 AI Strategy Adapters

Two swappable AI strategies that implement the same `AiStrategyPort`.

```typescript
// frontend/src/adapters/battle/random-ai.ts
import { createAdapter } from "@hex-di/core";
import { AiStrategyPort } from "../../ports/battle";

const randomAiAdapter = createAdapter({
  provides: AiStrategyPort,
  lifetime: "scoped",
  factory: () => ({
    selectAction(input) {
      const availableMoves = input.activeOwn.moves
        .map((m, i) => ({ move: m, index: i }))
        .filter(m => m.move.currentPp > 0);

      if (availableMoves.length === 0) {
        // Struggle: no moves left, just pick index 0
        return { _tag: "UseMove", moveIndex: 0 };
      }

      const chosen = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      return { _tag: "UseMove", moveIndex: chosen.index };
    },
  }),
});

// frontend/src/adapters/battle/smart-ai.ts
import { createAdapter } from "@hex-di/core";
import { AiStrategyPort } from "../../ports/battle";
import { TypeEffectivenessPort } from "../../ports/type-chart";

const smartAiAdapter = createAdapter({
  provides: AiStrategyPort,
  requires: [TypeEffectivenessPort],
  lifetime: "scoped",
  factory: deps => {
    const typeService = deps.TypeEffectiveness;

    return {
      selectAction(input) {
        const opponentTypes = input.activeOpponent.pokemon.types.map(t => t.type.name);
        const availableMoves = input.activeOwn.moves
          .map((m, i) => ({ move: m, index: i }))
          .filter(m => m.move.currentPp > 0 && m.move.move.power !== null);

        if (availableMoves.length === 0) {
          return { _tag: "UseMove", moveIndex: 0 };
        }

        // Score each move by type effectiveness * base power
        const scored = availableMoves.map(m => {
          const effectiveness = typeService.getEffectiveness(m.move.move.type.name, opponentTypes);
          const power = m.move.move.power ?? 0;
          return { ...m, score: effectiveness * power };
        });

        // Pick highest scoring move
        scored.sort((a, b) => b.score - a.score);
        return { _tag: "UseMove", moveIndex: scored[0].index };
      },
    };
  },
});
```

### 2.6 LocalStorageAdapter

Browser localStorage-based persistence with Result-wrapped error handling.

```typescript
// frontend/src/adapters/storage/local-storage.ts
import { createAdapter } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import { PersistencePort } from "../../ports/storage";

const localStorageAdapter = createAdapter({
  provides: PersistencePort,
  lifetime: "singleton",
  factory: () => ({
    get(key) {
      try {
        const raw = localStorage.getItem(`pokenerve:${key}`);
        if (raw === null) return ok(null);
        return ok(JSON.parse(raw));
      } catch {
        return err({ _tag: "SerializationError", message: `Failed to parse ${key}` });
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`pokenerve:${key}`, JSON.stringify(value));
        return ok(undefined);
      } catch {
        return err({ _tag: "QuotaExceeded", key });
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(`pokenerve:${key}`);
        return ok(undefined);
      } catch {
        return err({ _tag: "StorageUnavailable" });
      }
    },
    clear() {
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith("pokenerve:"));
        keys.forEach(k => localStorage.removeItem(k));
        return ok(undefined);
      } catch {
        return err({ _tag: "StorageUnavailable" });
      }
    },
  }),
});
```

### 2.7 Console Analytics Adapter

```typescript
// frontend/src/adapters/analytics/console-analytics.ts
import { createAdapter } from "@hex-di/core";
import { AnalyticsPort } from "../../ports/analytics";

const consoleAnalyticsAdapter = createAdapter({
  provides: AnalyticsPort,
  lifetime: "singleton",
  factory: () => ({
    track(event, properties) {
      console.log("[Analytics] track:", event, properties);
    },
    page(name) {
      console.log("[Analytics] page:", name);
    },
    identify(trainerId) {
      console.log("[Analytics] identify:", trainerId);
    },
  }),
});
```

---

## 3. Graph Composition

DI graphs are composed using `GraphBuilder.create().provide()` from `@hex-di/graph`. Each graph targets a specific domain area and lifetime scope.

### 3.1 Core Graph

```typescript
// frontend/src/graph/core-graph.ts
import { GraphBuilder } from "@hex-di/graph";
import { restPokemonListAdapter, restPokemonDetailAdapter } from "../adapters/api/rest-pokemon";
import { localStorageAdapter } from "../adapters/storage/local-storage";
import { consoleAnalyticsAdapter } from "../adapters/analytics/console-analytics";
import { evolutionChainAdapter } from "../adapters/api/evolution-chain";
import { typeEffectivenessAdapter } from "../adapters/api/type-effectiveness";

const coreGraph = GraphBuilder.create()
  .provide(restPokemonListAdapter)
  .provide(restPokemonDetailAdapter)
  .provide(evolutionChainAdapter)
  .provide(typeEffectivenessAdapter)
  .provide(localStorageAdapter)
  .provide(consoleAnalyticsAdapter)
  .build();
```

### 3.2 Battle Graph

Battle services are scoped -- one instance per battle. The `DamageCalcPort` and `AiStrategyPort` are scoped so each battle gets its own fresh instances.

```typescript
// frontend/src/graph/battle-graph.ts
import { GraphBuilder } from "@hex-di/graph";
import { battleEngineAdapter } from "../adapters/battle/battle-engine";
import { damageCalcAdapter } from "../adapters/battle/damage-calc";
import { smartAiAdapter } from "../adapters/battle/smart-ai";

const battleGraph = GraphBuilder.create()
  .provide(battleEngineAdapter)
  .provide(damageCalcAdapter)
  .provide(smartAiAdapter)
  .build();
```

### 3.3 Trading Graph

```typescript
// frontend/src/graph/trading-graph.ts
import { GraphBuilder } from "@hex-di/graph";
import { tradingAdapter } from "../adapters/trading/trading-adapter";

const tradingGraph = GraphBuilder.create().provide(tradingAdapter).build();
```

### 3.4 Tracing Graph

Tracing is configured as a singleton graph. The tracer and exporter are singletons shared across the entire application.

```typescript
// frontend/src/graph/tracing-graph.ts
import { GraphBuilder } from "@hex-di/graph";
import { createAdapter } from "@hex-di/core";
import {
  TracerPort,
  SpanExporterPort,
  SpanProcessorPort,
  MemoryTracerAdapter,
  createMemoryTracer,
} from "@hex-di/tracing";
import { otlpBrowserExporterAdapter } from "../adapters/tracing/otlp-browser";

// The tracing graph provides the tracer, exporter, and processor.
// The MemoryTracer collects spans in-memory for the Brain View panels
// while the OTLP exporter sends them to Jaeger.

const tracerAdapter = createAdapter({
  provides: TracerPort,
  lifetime: "singleton",
  factory: () => createMemoryTracer({ serviceName: "pokenerve-frontend" }),
});

const tracingGraph = GraphBuilder.create()
  .provide(tracerAdapter)
  .provide(otlpBrowserExporterAdapter)
  .build();
```

### 3.5 Composite Root Graph

All graphs are composed into a single root graph for the container.

```typescript
// frontend/src/graph/root-graph.ts
import { GraphBuilder } from "@hex-di/graph";
import { coreGraph } from "./core-graph";
import { battleGraph } from "./battle-graph";
import { tradingGraph } from "./trading-graph";
import { tracingGraph } from "./tracing-graph";

// The root graph merges all sub-graphs.
// Singleton adapters live in the root container.
// Scoped adapters (battle, trading) are resolved from child scopes.

const rootGraph = GraphBuilder.create()
  .provide(coreGraph)
  .provide(battleGraph)
  .provide(tradingGraph)
  .provide(tracingGraph)
  .build();
```

---

## 4. Container Hierarchy

### 4.1 Container Architecture

```
+-------------------------------------------------------------------+
|                     ROOT CONTAINER (singleton)                     |
|                                                                    |
|  PokemonListPort ------> RestPokemonListAdapter                   |
|  PokemonDetailPort ----> RestPokemonDetailAdapter                 |
|  EvolutionChainPort ---> EvolutionChainAdapter                    |
|  TypeEffectivenessPort > TypeEffectivenessAdapter                 |
|  PersistencePort ------> LocalStorageAdapter                      |
|  AnalyticsPort --------> ConsoleAnalyticsAdapter                  |
|  TracerPort -----------> MemoryTracer                             |
|                                                                    |
|  +------------------------------+  +---------------------------+  |
|  |    BATTLE SCOPE (scoped)     |  |  TRADING SCOPE (scoped)   |  |
|  |    Created per-battle        |  |  Created per-trade        |  |
|  |    Disposed on battle end    |  |  Disposed on trade end    |  |
|  |                              |  |                           |  |
|  |  BattleEnginePort -> Engine  |  |  TradingPort -> Trading   |  |
|  |  DamageCalcPort -> DamageCalc|  |                           |  |
|  |  AiStrategyPort -> SmartAI   |  |                           |  |
|  +------------------------------+  +---------------------------+  |
|                                                                    |
+-------------------------------------------------------------------+
```

### 4.2 Container Creation

```typescript
// frontend/src/main.tsx
import { createContainer } from "@hex-di/runtime";
import { instrumentContainer } from "@hex-di/tracing";
import { rootGraph } from "./graph/root-graph";
import { TracerPort } from "@hex-di/tracing";

// Create the root container from the validated graph
const container = createContainer(rootGraph);

// Instrument the container for automatic tracing of all port resolutions
const tracer = container.resolve(TracerPort);
instrumentContainer(container, tracer, {
  attributes: portName => ({
    "hexdi.port.name": portName,
    "hexdi.app": "pokenerve",
  }),
});
```

### 4.3 Scope Lifecycle

Scopes are created and destroyed in response to user navigation:

- **Battle scope**: Created when user enters `/battle` and starts a battle. Disposed when the battle ends or the user navigates away.
- **Trading scope**: Created when user initiates a trade at `/trading`. Disposed when the trade completes, fails, or is cancelled.

```typescript
// When a battle starts, a new scope is created:
const battleScope = container.createScope();
const engine = battleScope.resolve(BattleEnginePort); // Scoped: new per battle
const ai = battleScope.resolve(AiStrategyPort); // Scoped: new per battle
const tracer = battleScope.resolve(TracerPort); // Singleton: from root

// When the battle ends:
await battleScope.dispose(); // Runs finalizers, releases scoped instances
```

---

## 5. Tracing Setup

### 5.1 Browser OTLP HTTP Exporter

The browser sends trace spans to Jaeger via OTLP HTTP (port 4318). This is a custom adapter that bridges HexDI's `SpanExporter` interface with the browser `fetch()` API.

```typescript
// frontend/src/adapters/tracing/otlp-browser.ts
import { createAdapter } from "@hex-di/core";
import { SpanExporterPort } from "@hex-di/tracing";
import type { SpanData } from "@hex-di/tracing";

const OTLP_ENDPOINT = import.meta.env.VITE_OTLP_ENDPOINT ?? "http://localhost:4318";

const otlpBrowserExporterAdapter = createAdapter({
  provides: SpanExporterPort,
  lifetime: "singleton",
  factory: () => ({
    async export(spans: readonly SpanData[]): Promise<void> {
      if (spans.length === 0) return;

      const otlpPayload = convertToOtlpFormat(spans, "pokenerve-frontend");

      try {
        await fetch(`${OTLP_ENDPOINT}/v1/traces`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(otlpPayload),
          keepalive: true, // Survive page navigation
        });
      } catch {
        // Telemetry failures never break the application
        console.warn("[PokéNerve Tracing] Failed to export spans to Jaeger");
      }
    },

    async shutdown(): Promise<void> {
      // No-op for browser exporter
    },
  }),
});

function convertToOtlpFormat(spans: readonly SpanData[], serviceName: string): OtlpExportRequest {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: serviceName } },
            { key: "deployment.environment", value: { stringValue: "development" } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: "@hex-di/tracing", version: "1.0.0" },
            spans: spans.map(convertSpan),
          },
        ],
      },
    ],
  };
}
```

### 5.2 HexDI Container Instrumentation

`instrumentContainer()` from `@hex-di/tracing` installs resolution hooks that create a trace span for every port resolution. Nested resolutions produce child spans automatically via the span stack.

```typescript
// frontend/src/main.tsx
import { instrumentContainer } from "@hex-di/tracing";

// After container creation:
instrumentContainer(container, tracer, {
  // Custom attributes added to every resolution span
  attributes: (portName, lifetime) => ({
    "hexdi.port.name": portName,
    "hexdi.resolution.lifetime": lifetime,
    "hexdi.app": "pokenerve",
    "hexdi.layer": "frontend",
  }),
  // Optionally filter which ports are traced
  filter: {
    include: ["*"], // Trace all ports
    exclude: ["Analytics"], // Skip noisy analytics resolutions
  },
});
```

### 5.3 Custom Span Attributes

PokéNerve defines a consistent attribute schema for all trace spans:

| Attribute                   | Description           | Example           |
| --------------------------- | --------------------- | ----------------- |
| `hexdi.port.name`           | Port being resolved   | `"PokemonDetail"` |
| `hexdi.resolution.lifetime` | Adapter lifetime      | `"singleton"`     |
| `hexdi.app`                 | Application name      | `"pokenerve"`     |
| `hexdi.layer`               | Frontend or backend   | `"frontend"`      |
| `pokemon.id`                | Pokemon being fetched | `1`               |
| `pokemon.name`              | Pokemon name          | `"bulbasaur"`     |
| `move.name`                 | Battle move used      | `"thunderbolt"`   |
| `move.type`                 | Move type             | `"electric"`      |
| `damage.final`              | Final damage dealt    | `85`              |
| `damage.effectiveness`      | Type multiplier       | `2`               |
| `trade.id`                  | Trade identifier      | `"trade-abc123"`  |
| `trade.step`                | Current saga step     | `"lock_pokemon"`  |

---

## 6. React Provider Tree

The React provider tree establishes the DI context for the entire component hierarchy. The nesting order matters: outer providers are accessible to inner providers and all their children.

```typescript
// frontend/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createContainer, createInspector } from "@hex-di/runtime";
import { instrumentContainer, MemoryTracer } from "@hex-di/tracing";
import { createTypedHooks } from "@hex-di/react";
import { rootGraph } from "./graph/root-graph";
import { TracerPort } from "@hex-di/tracing";
import { App } from "./App";

// 1. Create container
const container = createContainer(rootGraph, { devTools: true });

// 2. Create inspector for Brain View
const inspector = createInspector(container);

// 3. Resolve tracer and instrument container
const tracer = container.resolve(TracerPort);
instrumentContainer(container, tracer);

// 4. Create typed React hooks bound to our graph's port types
const {
  HexDiContainerProvider,
  HexDiAutoScopeProvider,
  usePort,
} = createTypedHooks<typeof rootGraph>();

// 5. Render with provider tree
const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <HexDiContainerProvider container={container}>
      <TracingProvider tracer={tracer}>
        <InspectorProvider inspector={inspector}>
          <App />
        </InspectorProvider>
      </TracingProvider>
    </HexDiContainerProvider>
  </StrictMode>
);
```

### Provider Nesting Order

```
<StrictMode>
  <HexDiContainerProvider container={container}>        -- Root DI context
    <TracingProvider tracer={tracer}>                    -- Tracing context
      <InspectorProvider inspector={inspector}>          -- Inspector for Brain View
        <BrowserRouter>                                 -- React Router
          <Routes>
            <Route element={<AppLayout />}>
              ...feature routes...

              <Route path="battle" element={
                <HexDiAutoScopeProvider>                -- Battle scope
                  <BattlePage />                        -- (auto-created/destroyed)
                </HexDiAutoScopeProvider>
              } />

              <Route path="trading" element={
                <HexDiAutoScopeProvider>                -- Trading scope
                  <TradingPage />                       -- (auto-created/destroyed)
                </HexDiAutoScopeProvider>
              } />
            </Route>
          </Routes>
          <BrainOverlay />                              -- Always mounted overlay
        </BrowserRouter>
      </InspectorProvider>
    </TracingProvider>
  </HexDiContainerProvider>
</StrictMode>
```

### Scope Providers for Battle and Trading

`HexDiAutoScopeProvider` from `@hex-di/react` automatically creates a scope when the component mounts and disposes it when the component unmounts. This ties the DI scope lifecycle to the React component lifecycle.

```typescript
// frontend/src/providers/battle-scope.tsx
import { HexDiAutoScopeProvider } from "@hex-di/react";

function BattleScopeProvider({ children }: { children: React.ReactNode }) {
  return (
    <HexDiAutoScopeProvider>
      {children}
    </HexDiAutoScopeProvider>
  );
}
```

When the user navigates to `/battle`, React mounts `BattleScopeProvider`. A new DI scope is created. `BattleEnginePort`, `DamageCalcPort`, and `AiStrategyPort` resolve to fresh scoped instances within that scope. When the user navigates away, React unmounts the provider, the scope disposes, and all scoped instances are finalized.

This lifecycle is visible in Brain View's Memory Banks panel as scopes appearing and disappearing in real-time.

---

## Acceptance Criteria

1. All 10 ports compile with correct service type inference -- resolving a port returns the exact service interface type
2. Each adapter's `provides`, `requires`, and `lifetime` are correctly typed and the graph builds without compile-time errors
3. The `CachedPokemonAdapter` correctly wraps `RestPokemonDetailAdapter` via the `requires: [PokemonDetailPort]` dependency
4. `GraphBuilder.create().provide(...)` chain for all four sub-graphs (`core`, `battle`, `trading`, `tracing`) compiles and validates at build time
5. The root container resolves singleton adapters (API, persistence, analytics, tracer) from the root and scoped adapters (battle engine, AI, damage calc) from child scopes
6. `instrumentContainer()` produces trace spans for every port resolution with the defined custom attributes
7. The OTLP browser exporter successfully sends spans to Jaeger at port 4318 in OTLP JSON format
8. `HexDiAutoScopeProvider` creates a new scope on mount and disposes it on unmount, verified by scope count in Brain View
9. The `TracingProvider` and `InspectorProvider` are accessible from all components via `useTracer()`, `useInspector()`, `useSnapshot()`, and `useScopeTree()` hooks
10. Live adapter swapping in the Discovery Hub reconfigures the dependency graph and triggers a re-render of the Neural Map visualization

---

_Previous: [01 - Architecture Overview](./01-overview.md)_
_Next: [10 - Hono Backend API](./10-backend-api.md)_
