# 01 - Architecture Overview & Project Structure

## 1. Mission & Vision

PokeNerve is a self-aware Pokedex application that showcases every major HexDI package in a real product context. It has two layers: the **Skin** (a fully functional Pokemon exploration experience) and the **Skeleton** (a toggleable Brain View that reveals the application's internal architecture -- dependency graph, trace spans, container scopes, state machines, and health metrics). The narrative wrapper casts the application as Porygon, the Digital Pokemon, whose nervous system becomes visible when Brain View is activated.

PokeNerve is the existence proof of HexDI's "Self-Aware Application" vision. Every HexDI package maps to a natural Pokemon domain concept. The architecture serves the product. The product reveals the architecture.

---

## 2. Tech Stack

| Layer              | Technology           | Purpose                                                        |
| ------------------ | -------------------- | -------------------------------------------------------------- |
| Frontend Framework | React 19             | UI rendering and component model                               |
| Build Tool         | Vite                 | Fast development server and production bundling                |
| Styling            | TailwindCSS 4        | Utility-first CSS framework                                    |
| Routing            | React Router 7       | Client-side navigation for all 7 features                      |
| Backend Framework  | Hono                 | Lightweight HTTP server for API proxy and battle/trading state |
| External API       | PokeAPI v2           | Pokemon data source (REST)                                     |
| Tracing Backend    | Jaeger (all-in-one)  | Distributed trace collection and visualization                 |
| Orchestration      | Docker Compose       | Multi-service local development environment                    |
| DI Framework       | HexDI (all packages) | Dependency injection, tracing, state machines, sagas, stores   |

### HexDI Packages Used

| Package                  | Role in PokeNerve                                                       |
| ------------------------ | ----------------------------------------------------------------------- |
| `@hex-di/core`           | Port/adapter definitions, error types, inspection types                 |
| `@hex-di/graph`          | Dependency graph construction and compile-time validation               |
| `@hex-di/runtime`        | Container creation, scope lifecycle, service resolution                 |
| `@hex-di/result`         | Typed error handling for all API calls and domain operations            |
| `@hex-di/tracing`        | Distributed tracing core, W3C Trace Context, instrumentation            |
| `@hex-di/tracing-jaeger` | Jaeger exporter for backend traces                                      |
| `@hex-di/flow`           | State machines for evolution chains, battles, navigation                |
| `@hex-di/flow-react`     | React hooks for Flow machines (useMachine, useSelector, useSend)        |
| `@hex-di/react`          | React DI integration (createTypedHooks, providers, inspection hooks)    |
| `@hex-di/hono`           | Hono DI integration (scope middleware, tracing middleware, diagnostics) |

---

## 3. Monorepo Structure

```
examples/pokenerve/
|-- docker-compose.yml                    # Orchestrates jaeger, api, frontend services
|-- PRODUCT.md                            # Product vision document
|-- spec/                                 # Technical specification documents
|   |-- 01-overview.md                    # This document
|   |-- 02-core-infrastructure.md         # DI infrastructure and tracing setup
|   |-- 10-backend-api.md                 # Hono backend API specification
|
|-- shared/                               # Shared code between frontend and API
|   |-- types/
|       |-- pokemon.ts                    # Pokemon data types from PokeAPI
|       |-- battle.ts                     # Battle state, moves, damage types
|       |-- trading.ts                    # Trade offer, saga step types
|
|-- frontend/                             # React 19 + Vite application
|   |-- package.json                      # Dependencies: react, @hex-di/*, tailwindcss, etc.
|   |-- vite.config.ts                    # Vite config with API proxy to backend
|   |-- index.html                        # SPA entry point
|   |-- src/
|   |   |-- main.tsx                      # React root, container bootstrap, provider tree
|   |   |-- App.tsx                       # React Router layout with Brain View toggle
|   |   |
|   |   |-- ports/                        # Port definitions (contracts)
|   |   |   |-- pokemon-api.ts            # PokemonListPort, PokemonDetailPort
|   |   |   |-- evolution.ts              # EvolutionChainPort
|   |   |   |-- type-chart.ts             # TypeEffectivenessPort
|   |   |   |-- battle.ts                 # BattleEnginePort, DamageCalcPort, AiStrategyPort
|   |   |   |-- trading.ts               # TradingPort
|   |   |   |-- storage.ts               # PersistencePort
|   |   |   |-- analytics.ts             # AnalyticsPort
|   |   |
|   |   |-- adapters/                     # Adapter implementations
|   |   |   |-- api/
|   |   |   |   |-- rest-pokemon.ts       # Direct PokeAPI REST calls via backend proxy
|   |   |   |   |-- cached-pokemon.ts     # Caching decorator wrapping RestPokemonAdapter
|   |   |   |   |-- offline-pokemon.ts    # Static bundled data fallback
|   |   |   |-- battle/
|   |   |   |   |-- damage-calc.ts        # Pokemon damage formula implementation
|   |   |   |   |-- random-ai.ts          # Random move selection AI
|   |   |   |   |-- smart-ai.ts           # Type-advantage-aware AI
|   |   |   |-- storage/
|   |   |   |   |-- local-storage.ts      # Browser localStorage persistence
|   |   |   |-- tracing/
|   |   |       |-- otlp-browser.ts       # OTLP HTTP trace exporter for browser->Jaeger
|   |   |
|   |   |-- machines/                     # Flow state machine definitions
|   |   |   |-- evolution.ts              # Evolution chain machine (per-Pokemon)
|   |   |   |-- battle.ts                 # Battle turn cycle machine
|   |   |   |-- trading.ts               # Trading lifecycle machine
|   |   |   |-- app-navigation.ts         # App-level navigation machine
|   |   |
|   |   |-- graph/                        # DI graph composition
|   |   |   |-- core-graph.ts             # Core app services (API, persistence, analytics)
|   |   |   |-- battle-graph.ts           # Battle-scoped services (engine, AI, damage)
|   |   |   |-- trading-graph.ts          # Trading-scoped services
|   |   |   |-- tracing-graph.ts          # Tracing configuration (tracer, exporter)
|   |   |
|   |   |-- providers/                    # React DI provider components
|   |   |   |-- container-provider.tsx    # Root HexDiContainerProvider
|   |   |   |-- battle-scope.tsx          # HexDiAutoScopeProvider for battle scope
|   |   |   |-- trading-scope.tsx         # HexDiAutoScopeProvider for trading scope
|   |   |
|   |   |-- features/                     # React feature modules (pages + components)
|   |   |   |-- discovery/
|   |   |   |   |-- DiscoveryPage.tsx     # Pokemon browse/search/filter page
|   |   |   |   |-- PokemonCard.tsx       # Pokemon list card component
|   |   |   |   |-- PokemonDetail.tsx     # Full Pokemon detail view
|   |   |   |   |-- FilterBar.tsx         # Type, habitat, color, shape filters
|   |   |   |   |-- AdapterSwitcher.tsx   # Live adapter switching demo dropdown
|   |   |   |
|   |   |   |-- evolution-lab/
|   |   |   |   |-- EvolutionLabPage.tsx  # Evolution chain exploration page
|   |   |   |   |-- EvolutionTree.tsx     # State machine visualization of chain
|   |   |   |   |-- EvolutionControls.tsx # Guard condition toggles/inputs
|   |   |   |   |-- GuardConditions.tsx   # Visual guard condition display
|   |   |   |
|   |   |   |-- type-graph/
|   |   |   |   |-- TypeGraphPage.tsx     # Type synergy graph page
|   |   |   |   |-- TypeForceGraph.tsx    # Force-directed 18-type graph
|   |   |   |   |-- TeamBuilder.tsx       # Drag-to-build team of 6
|   |   |   |   |-- TypeSuggestions.tsx   # Graph-powered team suggestions
|   |   |   |
|   |   |   |-- battle/
|   |   |   |   |-- BattlePage.tsx        # Battle simulator page
|   |   |   |   |-- BattleField.tsx       # Active Pokemon display
|   |   |   |   |-- MoveSelector.tsx      # 4-move selection grid
|   |   |   |   |-- HpBar.tsx            # Animated HP bar component
|   |   |   |   |-- StatusEffects.tsx     # Status condition indicators
|   |   |   |   |-- BattleLog.tsx         # Turn-by-turn text log
|   |   |   |
|   |   |   |-- trading/
|   |   |   |   |-- TradingPage.tsx       # Trading post page
|   |   |   |   |-- TradeTimeline.tsx     # Saga step visualization
|   |   |   |   |-- PokemonSelector.tsx   # Pokemon selection for trade
|   |   |   |   |-- CompensationView.tsx  # Backward compensation visualization
|   |   |   |
|   |   |   |-- research/
|   |   |   |   |-- ResearchPage.tsx      # Research notes page
|   |   |   |   |-- FavoritesList.tsx     # Favorites list with reactive updates
|   |   |   |   |-- TeamStats.tsx         # Derived team power/coverage stats
|   |   |   |   |-- CacheViewer.tsx       # Cache hit/miss visualization
|   |   |   |
|   |   |   |-- brain/                    # Porygon's Brain overlay
|   |   |       |-- BrainOverlay.tsx      # Toggleable overlay shell with 5 panels
|   |   |       |-- NeuralMap.tsx         # Live dependency graph visualization
|   |   |       |-- SynapseActivity.tsx   # Live trace waterfall + Jaeger links
|   |   |       |-- MemoryBanks.tsx       # Container scope tree visualization
|   |   |       |-- ThoughtProcess.tsx    # Flow state machine inspector
|   |   |       |-- VitalSigns.tsx        # Health metrics dashboard
|
|-- api/                                  # Hono backend server
|   |-- package.json                      # Dependencies: hono, @hex-di/*, node-fetch
|   |-- Dockerfile                        # Docker image for API service
|   |-- src/
|       |-- server.ts                     # Hono app creation, middleware stack, route mounting
|       |-- ports/
|       |   |-- pokemon-cache.ts          # PokemonCachePort (in-memory cache contract)
|       |   |-- rate-limiter.ts           # RateLimiterPort (PokeAPI rate limiting contract)
|       |-- adapters/
|       |   |-- memory-cache.ts           # In-memory LRU cache adapter
|       |   |-- pokeapi-proxy.ts          # PokeAPI proxy with caching + rate limiting
|       |-- middleware/
|       |   |-- scope.ts                  # Per-request scope via createScopeMiddleware
|       |   |-- tracing.ts               # Tracing via tracingMiddleware + Jaeger exporter
|       |   |-- cors.ts                   # CORS allowing traceparent header
|       |-- routes/
|       |   |-- pokemon.ts               # /api/pokemon endpoints
|       |   |-- battle.ts                # /api/battle endpoints
|       |   |-- trading.ts              # /api/trading endpoints
|       |   |-- diagnostics.ts           # HexDI diagnostic routes (/api/diagnostics/*)
|       |-- graph/
|           |-- api-graph.ts             # Backend DI graph composition
```

---

## 4. Package Dependencies

### `frontend/package.json`

```json
{
  "name": "@pokenerve/frontend",
  "private": true,
  "type": "module",
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.0.0",
    "@hex-di/core": "workspace:*",
    "@hex-di/graph": "workspace:*",
    "@hex-di/runtime": "workspace:*",
    "@hex-di/result": "workspace:*",
    "@hex-di/tracing": "workspace:*",
    "@hex-di/flow": "workspace:*",
    "@hex-di/flow-react": "workspace:*",
    "@hex-di/react": "workspace:*"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

### `api/package.json`

```json
{
  "name": "@pokenerve/api",
  "private": true,
  "type": "module",
  "dependencies": {
    "hono": "^4.0.0",
    "@hex-di/core": "workspace:*",
    "@hex-di/graph": "workspace:*",
    "@hex-di/runtime": "workspace:*",
    "@hex-di/result": "workspace:*",
    "@hex-di/tracing": "workspace:*",
    "@hex-di/tracing-jaeger": "workspace:*",
    "@hex-di/hono": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

### `shared/` (referenced via tsconfig paths)

The `shared/` directory is not a separate package. Both `frontend/` and `api/` reference it via TypeScript path aliases in their respective `tsconfig.json` files:

```json
{
  "compilerOptions": {
    "paths": {
      "@pokenerve/shared/*": ["../shared/*"]
    }
  }
}
```

---

## 5. Application Architecture Diagram

```
+------------------------------------------------------------------+
|                         BROWSER                                   |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                   React 19 Frontend                         |  |
|  |                                                             |  |
|  |  Discovery | Evolution | TypeGraph | Battle | Trading |     |  |
|  |  Research  | Brain View                                     |  |
|  |                                                             |  |
|  |  [HexDI Container]  [Flow Machines]  [Store Atoms]          |  |
|  |  [Tracing: OTLP HTTP Exporter]                              |  |
|  +----------------------------|--------------------------------+  |
|                                |                                  |
|                    fetch() + traceparent header                   |
|                                |                                  |
+--------------------------------|----------------------------------+
                                 |
                                 v
+------------------------------------------------------------------+
|                       DOCKER NETWORK                              |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                    Hono API Server (:3001)                  |  |
|  |                                                             |  |
|  |  [CORS] -> [Tracing MW] -> [Scope MW] -> [Route Handlers]  |  |
|  |                                                             |  |
|  |  [HexDI Container]  [Per-Request Scopes]  [Cache Layer]    |  |
|  |  [Tracing: Jaeger Exporter via Thrift HTTP]                 |  |
|  +-------|-----------------------------------|----------------+  |
|          |                                   |                   |
|          | Jaeger Thrift HTTP                 | HTTP GET          |
|          | (port 14268)                       | (external)        |
|          v                                   v                   |
|  +----------------+              +-----------------------+       |
|  |  Jaeger        |              |  PokeAPI              |       |
|  |  All-in-One    |              |  pokeapi.co/api/v2/   |       |
|  |  (:16686 UI)   |              |  (external service)   |       |
|  |  (:4318 OTLP)  |              +-----------------------+       |
|  |  (:14268 HTTP)  |                                             |
|  +----------------+                                              |
|                                                                   |
+------------------------------------------------------------------+
```

### Data Flow Summary

1. **User interacts** with the React frontend in the browser
2. **Frontend** makes `fetch()` requests to the Hono API, injecting a `traceparent` header for W3C Trace Context propagation
3. **API server** extracts the trace context, creates child spans, proxies requests to PokeAPI with caching and rate limiting
4. **API server** exports trace spans to Jaeger via the Jaeger Thrift HTTP protocol (port 14268)
5. **Frontend** exports trace spans to Jaeger via OTLP HTTP (port 4318)
6. **Jaeger** correlates frontend and backend spans into a single distributed trace viewable at port 16686

---

## 6. Cross-Service Tracing Architecture

PokeNerve implements W3C Trace Context propagation (https://www.w3.org/TR/trace-context/) to link frontend and backend traces into a single distributed trace.

### Propagation Flow

```
BROWSER                          API SERVER                    POKEAPI
  |                                 |                            |
  | 1. User clicks "View Bulbasaur" |                            |
  |                                 |                            |
  | 2. Frontend creates root span   |                            |
  |    "fetch:pokemon:1"            |                            |
  |                                 |                            |
  | 3. fetch("/api/pokemon/1", {    |                            |
  |      headers: {                 |                            |
  |        "traceparent":           |                            |
  |        "00-<traceId>-           |                            |
  |         <spanId>-01"            |                            |
  |      }                          |                            |
  |    })                           |                            |
  |------------------------------->|                            |
  |                                 | 4. tracingMiddleware       |
  |                                 |    extracts traceparent    |
  |                                 |    creates child span      |
  |                                 |    "GET /api/pokemon/1"    |
  |                                 |                            |
  |                                 | 5. Handler resolves ports  |
  |                                 |    from request scope      |
  |                                 |    (each resolution is a   |
  |                                 |     child trace span)      |
  |                                 |                            |
  |                                 | 6. Proxy to PokeAPI with   |
  |                                 |    traceparent header      |
  |                                 |--------------------------->|
  |                                 |                            |
  |                                 |<---------------------------|
  |                                 | 7. Response cached,        |
  |                                 |    span ended              |
  |                                 |                            |
  |<-------------------------------|                            |
  | 8. Frontend span ended          |                            |
  |    Both spans exported          |                            |
  |    to Jaeger                    |                            |
  |                                 |                            |
```

### `traceparent` Header Format

```
traceparent: 00-<trace-id>-<parent-span-id>-<trace-flags>
             |   32 hex     16 hex           2 hex
             |   chars      chars            chars
             version

Example:
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

The frontend generates the `traceId` (shared across all spans in one user action). The API server continues the same `traceId` and parents its span under the frontend's `spanId`. The result: a single trace in Jaeger UI showing the full request chain from browser click to PokeAPI response.

---

## 7. Docker Compose Configuration

```yaml
# docker-compose.yml
version: "3.9"

services:
  jaeger:
    image: jaegertracing/all-in-one:1.62
    ports:
      - "16686:16686" # Jaeger UI
      - "4318:4318" # OTLP HTTP collector (browser traces)
      - "14268:14268" # Jaeger HTTP collector (API traces via Thrift)
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - pokenerve

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - POKEAPI_BASE_URL=https://pokeapi.co/api/v2
      - JAEGER_ENDPOINT=http://jaeger:14268/api/traces
      - JAEGER_SERVICE_NAME=pokenerve-api
      - NODE_ENV=development
    depends_on:
      - jaeger
    networks:
      - pokenerve

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3001
      - VITE_JAEGER_UI_URL=http://localhost:16686
      - VITE_OTLP_ENDPOINT=http://localhost:4318
    depends_on:
      - api
    networks:
      - pokenerve

networks:
  pokenerve:
    driver: bridge
```

### Service Details

| Service    | Image/Build                        | Ports              | Purpose               |
| ---------- | ---------------------------------- | ------------------ | --------------------- |
| `jaeger`   | `jaegertracing/all-in-one:1.62`    | 16686, 4318, 14268 | Trace collection + UI |
| `api`      | Built from `./api/Dockerfile`      | 3001               | Hono backend server   |
| `frontend` | Built from `./frontend/Dockerfile` | 5173               | Vite dev server       |

---

## 8. Development Workflow

### Quick Start (Docker Compose)

```bash
# From examples/pokenerve/
docker compose up

# Frontend:  http://localhost:5173
# API:       http://localhost:3001
# Jaeger UI: http://localhost:16686
```

### Local Development (without Docker)

```bash
# Terminal 1: Start Jaeger
docker run -d --name jaeger \
  -p 16686:16686 -p 4318:4318 -p 14268:14268 \
  -e COLLECTOR_OTLP_ENABLED=true \
  jaegertracing/all-in-one:1.62

# Terminal 2: Start API
cd examples/pokenerve/api
pnpm install
pnpm dev   # Starts Hono on port 3001

# Terminal 3: Start Frontend
cd examples/pokenerve/frontend
pnpm install
pnpm dev   # Starts Vite on port 5173 with API proxy
```

### Vite Proxy Configuration

In local development, the Vite dev server proxies `/api/*` requests to the Hono backend:

```typescript
// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@pokenerve/shared": "../shared",
    },
  },
});
```

---

## 9. Shared Types

All TypeScript interfaces shared between frontend and backend live in `shared/types/`. These are referenced by both workspaces via tsconfig path aliases.

### `shared/types/pokemon.ts`

```typescript
// ---------------------------------------------------------------------------
// PokeAPI base types
// ---------------------------------------------------------------------------

/** Generic named resource reference from PokeAPI */
interface NamedAPIResource {
  readonly name: string;
  readonly url: string;
}

/** Paginated list response from PokeAPI */
interface PaginatedResponse<T> {
  readonly count: number;
  readonly next: string | null;
  readonly previous: string | null;
  readonly results: readonly T[];
}

// ---------------------------------------------------------------------------
// Pokemon core types
// ---------------------------------------------------------------------------

/** Full Pokemon data from PokeAPI /pokemon/{id} */
interface Pokemon {
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
interface PokemonType {
  readonly slot: number;
  readonly type: NamedAPIResource;
}

/** Base stat entry */
interface Stat {
  readonly base_stat: number;
  readonly effort: number;
  readonly stat: NamedAPIResource;
}

/** Ability entry */
interface Ability {
  readonly ability: NamedAPIResource;
  readonly is_hidden: boolean;
  readonly slot: number;
}

/** Pokemon sprite URLs */
interface Sprites {
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
interface PokemonMove {
  readonly move: NamedAPIResource;
  readonly version_group_details: readonly MoveVersionDetail[];
}

/** Move version detail */
interface MoveVersionDetail {
  readonly level_learned_at: number;
  readonly move_learn_method: NamedAPIResource;
  readonly version_group: NamedAPIResource;
}

// ---------------------------------------------------------------------------
// Evolution types
// ---------------------------------------------------------------------------

/** Evolution chain data from PokeAPI /evolution-chain/{id} */
interface EvolutionChain {
  readonly id: number;
  readonly chain: ChainLink;
}

/** Single link in an evolution chain (recursive) */
interface ChainLink {
  readonly species: NamedAPIResource;
  readonly evolution_details: readonly EvolutionDetail[];
  readonly evolves_to: readonly ChainLink[];
}

/** Conditions required for a specific evolution */
interface EvolutionDetail {
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

// ---------------------------------------------------------------------------
// Type effectiveness types
// ---------------------------------------------------------------------------

/** Full type data from PokeAPI /type/{id} */
interface TypeData {
  readonly id: number;
  readonly name: string;
  readonly damage_relations: TypeRelations;
  readonly pokemon: readonly TypePokemon[];
}

/** Type damage relations (attack/defense multipliers) */
interface TypeRelations {
  readonly double_damage_to: readonly NamedAPIResource[];
  readonly double_damage_from: readonly NamedAPIResource[];
  readonly half_damage_to: readonly NamedAPIResource[];
  readonly half_damage_from: readonly NamedAPIResource[];
  readonly no_damage_to: readonly NamedAPIResource[];
  readonly no_damage_from: readonly NamedAPIResource[];
}

/** Pokemon associated with a type */
interface TypePokemon {
  readonly slot: number;
  readonly pokemon: NamedAPIResource;
}

// ---------------------------------------------------------------------------
// Move types
// ---------------------------------------------------------------------------

/** Full move data from PokeAPI /move/{id} */
interface Move {
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
interface EffectEntry {
  readonly effect: string;
  readonly short_effect: string;
  readonly language: NamedAPIResource;
}

// ---------------------------------------------------------------------------
// Pokemon species types (for habitat, color, shape filters)
// ---------------------------------------------------------------------------

/** Species data from PokeAPI /pokemon-species/{id} */
interface PokemonSpecies {
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

// ---------------------------------------------------------------------------
// API error types
// ---------------------------------------------------------------------------

/** Discriminated error union for Pokemon API calls */
type PokemonApiError =
  | { readonly _tag: "NetworkError"; readonly message: string }
  | { readonly _tag: "NotFoundError"; readonly pokemonId: number | string }
  | { readonly _tag: "RateLimitError"; readonly retryAfterMs: number }
  | { readonly _tag: "ParseError"; readonly message: string };
```

### `shared/types/battle.ts`

```typescript
import type { Pokemon, Move, NamedAPIResource } from "./pokemon.js";

// ---------------------------------------------------------------------------
// Battle state
// ---------------------------------------------------------------------------

/** Complete battle state for a single battle instance */
interface BattleState {
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

type BattleStatus = "team_preview" | "active" | "player_win" | "opponent_win" | "draw";

/** A Pokemon in battle with mutable combat state */
interface BattlePokemon {
  readonly pokemon: Pokemon;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly statStages: StatStages;
  readonly status: StatusCondition | null;
  readonly moves: readonly BattleMove[];
  readonly isActive: boolean;
}

/** Stat stage modifiers (-6 to +6) */
interface StatStages {
  readonly attack: number;
  readonly defense: number;
  readonly specialAttack: number;
  readonly specialDefense: number;
  readonly speed: number;
  readonly accuracy: number;
  readonly evasion: number;
}

/** A move in battle context with remaining PP */
interface BattleMove {
  readonly move: Move;
  readonly currentPp: number;
  readonly maxPp: number;
}

/** Status conditions */
type StatusCondition = "burn" | "freeze" | "paralysis" | "poison" | "bad-poison" | "sleep";

/** Weather conditions */
type Weather = "none" | "sun" | "rain" | "sandstorm" | "hail";

/** Terrain conditions */
type Terrain = "none" | "electric" | "grassy" | "misty" | "psychic";

// ---------------------------------------------------------------------------
// Damage calculation types
// ---------------------------------------------------------------------------

/** Input for damage calculation */
interface DamageCalcInput {
  readonly attacker: BattlePokemon;
  readonly defender: BattlePokemon;
  readonly move: Move;
  readonly weather: Weather;
  readonly terrain: Terrain;
  readonly isCritical: boolean;
}

/** Output of damage calculation */
interface DamageResult {
  readonly baseDamage: number;
  readonly stab: boolean;
  readonly effectiveness: Effectiveness;
  readonly criticalHit: boolean;
  readonly finalDamage: number;
  readonly typeModifier: number;
}

type Effectiveness = 0 | 0.25 | 0.5 | 1 | 2 | 4;

/** Errors that can occur during damage calculation */
type DamageCalcError =
  | { readonly _tag: "InvalidMove"; readonly reason: string }
  | { readonly _tag: "FaintedAttacker" }
  | { readonly _tag: "FaintedDefender" }
  | { readonly _tag: "NoPpRemaining"; readonly moveName: string };

// ---------------------------------------------------------------------------
// Battle log types
// ---------------------------------------------------------------------------

interface BattleLogEntry {
  readonly turn: number;
  readonly timestamp: number;
  readonly message: string;
  readonly type: "move" | "damage" | "status" | "weather" | "switch" | "faint" | "system";
}

// ---------------------------------------------------------------------------
// AI strategy types
// ---------------------------------------------------------------------------

/** Input provided to AI for move selection */
interface AiMoveInput {
  readonly ownTeam: readonly BattlePokemon[];
  readonly opponentTeam: readonly BattlePokemon[];
  readonly activeOwn: BattlePokemon;
  readonly activeOpponent: BattlePokemon;
  readonly weather: Weather;
  readonly terrain: Terrain;
  readonly turn: number;
}

/** AI's chosen action */
type AiAction =
  | { readonly _tag: "UseMove"; readonly moveIndex: number }
  | { readonly _tag: "SwitchPokemon"; readonly pokemonIndex: number };

// ---------------------------------------------------------------------------
// Battle trace attributes (for Jaeger spans)
// ---------------------------------------------------------------------------

interface BattleTraceAttributes {
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
```

### `shared/types/trading.ts`

```typescript
import type { Pokemon } from "./pokemon.js";

// ---------------------------------------------------------------------------
// Trade types
// ---------------------------------------------------------------------------

/** A trade offer between two trainers */
interface TradeOffer {
  readonly id: string;
  readonly offeredPokemon: Pokemon;
  readonly requestedPokemon: Pokemon;
  readonly status: TradeStatus;
  readonly trainerId: string;
  readonly partnerTrainerId: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Trade lifecycle status */
type TradeStatus =
  | "pending"
  | "accepted"
  | "locked"
  | "swapping"
  | "confirming"
  | "completed"
  | "failed"
  | "compensating";

/** Individual step in the trading saga */
interface TradeSagaStep {
  readonly name: TradeSagaStepName;
  readonly status: "pending" | "executing" | "completed" | "failed" | "compensated";
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly error: string | null;
}

/** Names of forward saga steps */
type TradeSagaStepName =
  | "initiate_trade"
  | "select_pokemon"
  | "verify_ownership"
  | "lock_pokemon"
  | "execute_swap"
  | "confirm_receipt"
  | "complete";

/** Names of compensation steps */
type TradeCompensationStepName = "unlock_pokemon" | "return_pokemon" | "notify_cancellation";

/** Full saga execution state */
interface TradeSagaState {
  readonly tradeId: string;
  readonly currentStep: TradeSagaStepName | TradeCompensationStepName | null;
  readonly forwardSteps: readonly TradeSagaStep[];
  readonly compensationSteps: readonly TradeSagaStep[];
  readonly isCompensating: boolean;
  readonly isComplete: boolean;
  readonly chaosMode: boolean;
  readonly failureProbability: number;
}

/** Trading API error types */
type TradingError =
  | { readonly _tag: "TradeNotFound"; readonly tradeId: string }
  | { readonly _tag: "PokemonLocked"; readonly pokemonId: number }
  | { readonly _tag: "VerificationFailed"; readonly reason: string }
  | { readonly _tag: "CommunicationError"; readonly step: TradeSagaStepName }
  | {
      readonly _tag: "CompensationFailed";
      readonly step: TradeCompensationStepName;
      readonly reason: string;
    };
```

---

## 10. Navigation & Routing

React Router 7 handles all client-side navigation with a flat route structure.

### Route Definitions

```typescript
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router";

import { DiscoveryPage } from "./features/discovery/DiscoveryPage";
import { PokemonDetail } from "./features/discovery/PokemonDetail";
import { EvolutionLabPage } from "./features/evolution-lab/EvolutionLabPage";
import { TypeGraphPage } from "./features/type-graph/TypeGraphPage";
import { BattlePage } from "./features/battle/BattlePage";
import { TradingPage } from "./features/trading/TradingPage";
import { ResearchPage } from "./features/research/ResearchPage";
import { BrainOverlay } from "./features/brain/BrainOverlay";
import { AppLayout } from "./AppLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DiscoveryPage />} />
          <Route path="pokemon/:id" element={<PokemonDetail />} />
          <Route path="evolution" element={<EvolutionLabPage />} />
          <Route path="evolution/:pokemonId" element={<EvolutionLabPage />} />
          <Route path="types" element={<TypeGraphPage />} />
          <Route path="battle" element={<BattlePage />} />
          <Route path="trading" element={<TradingPage />} />
          <Route path="research" element={<ResearchPage />} />
        </Route>
      </Routes>
      <BrainOverlay />
    </BrowserRouter>
  );
}
```

### Route Map

| Path                    | Component          | Feature            | Description                         |
| ----------------------- | ------------------ | ------------------ | ----------------------------------- |
| `/`                     | `DiscoveryPage`    | Discovery Hub      | Browse, search, filter Pokemon      |
| `/pokemon/:id`          | `PokemonDetail`    | Discovery Hub      | Full Pokemon detail view            |
| `/evolution`            | `EvolutionLabPage` | Evolution Lab      | Pokemon picker + evolution machine  |
| `/evolution/:pokemonId` | `EvolutionLabPage` | Evolution Lab      | Direct link to specific chain       |
| `/types`                | `TypeGraphPage`    | Type Synergy Graph | 18-type force graph + team builder  |
| `/battle`               | `BattlePage`       | Battle Simulator   | Team select + turn-based battle     |
| `/trading`              | `TradingPage`      | Trading Post       | Multi-step trade saga               |
| `/research`             | `ResearchPage`     | Research Notes     | Favorites, team stats, cache viewer |

The `BrainOverlay` component is rendered outside the route tree as a fixed-position overlay. It is toggled via a global state flag (Porygon icon in the header). When active, it renders five panels as tabs: Neural Map, Synapse Activity, Memory Banks, Thought Process, and Vital Signs.

---

## Acceptance Criteria

1. The project structure matches the file tree described in this document, with `frontend/`, `api/`, and `shared/` directories
2. All shared TypeScript types compile without errors and are importable from both frontend and API workspaces
3. `docker-compose up` starts Jaeger, API, and frontend services on ports 16686, 3001, and 5173 respectively
4. React Router renders all 7 feature pages at their specified paths
5. The Brain View overlay is accessible from every page via a toggle in the application header
6. The Vite proxy correctly forwards `/api/*` requests to the Hono backend in local development
7. Both frontend and API workspaces declare their HexDI package dependencies as workspace references
8. W3C Trace Context headers (`traceparent`) are propagated from frontend to API to PokeAPI, producing correlated distributed traces in Jaeger

---

_Next: [02 - Core DI Infrastructure & Tracing Setup](./02-core-infrastructure.md)_
