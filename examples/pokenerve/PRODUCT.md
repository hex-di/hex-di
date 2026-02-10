# PokeNerve -- The Self-Aware Pokedex

> _"What if your Pokedex wasn't just a tool -- but a living digital organism that understands itself?"_

---

## Mission

PokeNerve exists to prove that HexDI transforms applications from blind software into self-aware organisms. It does this by building a Pokedex that uses every major HexDI package in meaningful ways, makes its own internal architecture visible and interactive, sends distributed traces to Jaeger for real-time observability, and tells a compelling narrative: Professor Oak's Porygon Pokedex knows what it's made of.

This is not a contrived demo. Every HexDI package maps to a natural Pokemon domain concept. The architecture serves the product. The product reveals the architecture.

---

## Vision

PokeNerve has two layers:

1. **Skin** -- A beautiful, fully functional Pokemon exploration experience. Users browse Pokemon, explore evolution chains, analyze type matchups, battle opponents, trade with other trainers, and track their research. It works as a standalone product.

2. **Skeleton** -- Toggle a single switch and the application peels back its own skin to reveal its nervous system. The dependency graph pulses with live resolution activity. Trace spans fire like synaptic impulses. Container scopes appear and disappear as memory banks. State machines tick through their thought processes. Health metrics display vital signs.

The narrative wrapper: this Pokedex is powered by Porygon, the Digital Pokemon made entirely of code. When you activate "Brain View," you are looking inside Porygon's digital mind. The dependency graph is its neural network. Traces are its synaptic impulses. Scopes are its memory banks. State machines are its thought processes.

This makes the technical showcase feel organic rather than clinical. It is not "here is our DI container's internals." It is "look inside a digital organism's mind."

---

## Target Audience

### Developers Evaluating HexDI

Engineers considering HexDI for their projects. They want to see what the ecosystem can actually do in a real application, not just read API docs. PokeNerve gives them a running system where every package is exercised meaningfully, with source code they can study and adapt.

### Conference Demo Viewers

Technical audiences at meetups, conferences, and video presentations. They need something visually impressive and narratively compelling that communicates the "self-aware application" vision in minutes. PokeNerve's Brain View toggle is the single most powerful demo moment: flip a switch and watch the app reveal its own anatomy.

### Architecture Enthusiasts

Senior engineers and architects interested in hexagonal architecture, dependency injection patterns, and distributed tracing. PokeNerve has deep technical substance behind the polish -- real state machines, real saga compensations, real cross-service traces, real graph analysis.

---

## The Core Insight

Pokemon game concepts naturally map to software architecture patterns. This is not a forced metaphor. The domain genuinely fits.

| Pokemon Concept           | HexDI Concept            | How PokeNerve Showcases It                                                              |
| ------------------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| Type effectiveness chart  | Dependency graph         | Type matchups rendered as a HexDI-style dependency graph with graph analysis algorithms |
| Evolution chains          | State machines (Flow)    | Each evolution chain is a Flow machine with guards, effects, and activities             |
| Pokemon battles           | State machines + tracing | Turn-based battles are Flow machines; every action traced to Jaeger                     |
| Trading Pokemon           | Saga pattern             | Multi-step trades with automatic compensation on failure                                |
| Pokedex entries           | Result type + Query      | API fetches wrapped in `Result<T,E>`; cached with the query pattern                     |
| Pokemon team building     | Graph analysis           | Team type coverage analyzed with graph traversal algorithms                             |
| Porygon (Digital Pokemon) | The app itself           | The app IS Porygon -- toggle Brain View to see its nervous system                       |

---

## Core Features

### Feature 1: Pokemon Discovery Hub

**Packages exercised:** core, graph, runtime, result, tracing, query, react, hono

The entry point to PokeNerve. Browse, search, and filter Pokemon across all regions.

#### What Makes It Special

Multiple data source adapters -- REST, cached, and offline fallback -- can be swapped live while the user watches the dependency graph reconfigure in Brain View. Every PokeAPI fetch is wrapped in `Result<PokemonData, ApiError>` with no exceptions, only typed errors. Every API call generates a trace span sent to Jaeger via OTLP. Query caching is visualized: cache hit/miss rates, stale data indicators, request deduplication. Rich filtering goes beyond the usual type filter to include habitat, shape, color, egg group, and growth rate using PokeAPI's underutilized endpoints.

#### User Stories

- As a user, I can browse Pokemon by region and filter by type, habitat, color, and shape
- As a user, I see a loading state with proper error recovery when the API is slow or down
- As a developer, I can toggle Brain View and see every API call as a trace span
- As a developer, I can swap the data source adapter (REST to cached to offline) and see the dependency graph reconfigure live

---

### Feature 2: Evolution Lab

**Packages exercised:** core, runtime, flow, tracing, react

Every evolution chain in Pokemon is modeled as an interactive Flow state machine.

#### What Makes It Special

Eevee's branching evolution -- eight or more branches -- becomes a visual parallel state machine. Guards represent real evolution conditions: level >= 16, friendship >= 220, hold Fire Stone, trade while holding Metal Coat, know the move Rollout, level up near Moss Rock. Effects represent the consequences: stat changes, type changes, ability unlocks. Activities represent the evolution animation sequence. The user can pick any Pokemon, see its evolution machine rendered as an interactive diagram, and trigger transitions by fulfilling guard conditions.

#### User Stories

- As a user, I can select any Pokemon and see its evolution chain as an interactive state machine diagram
- As a user, I can "evolve" a Pokemon by satisfying guard conditions (simulated)
- As a developer, I can see the Flow machine definition, current state, valid transitions, and guard conditions in Brain View
- As a developer, I can see each state transition as a trace span in Jaeger

---

### Feature 3: Type Synergy Graph

**Packages exercised:** core, graph, runtime, react

The 18 Pokemon types and their effectiveness relations, visualized as a dependency graph using HexDI's graph package algorithms.

#### What Makes It Special

18 type nodes connected by 190+ damage relation edges form a rich graph. HexDI's graph analysis algorithms are applied to game data: topological layers, complexity scores, cycle detection. "Build Your Team" mode lets users drag Pokemon onto a team of six and see their type coverage rendered as a graph. The graph package's suggestion system recommends improvements: "Your team is weak to Ground -- consider adding a Flying type." Type matchup calculations use the graph traversal APIs.

#### User Stories

- As a user, I can see all 18 types as an interactive force-directed graph with damage relation edges
- As a user, I can build a team of 6 Pokemon and see my type coverage visualized as a dependency graph
- As a user, I get suggestions for improving my team composition, powered by graph analysis
- As a developer, I can see the graph metrics in Brain View: node count, edge count, complexity score, path analysis

---

### Feature 4: Battle Simulator

**Packages exercised:** core, graph, runtime, result, tracing, flow, store, react, hono

The showcase centerpiece. A full turn-based Pokemon battle powered by Flow state machines with every action traced to Jaeger.

#### What Makes It Special

The battle flow machine models the complete turn lifecycle:

```
States: idle, team_preview, battle, turn, move_execution, faint_check, battle_end

Events: START_BATTLE, SELECT_MOVE, EXECUTE_MOVE, POKEMON_FAINTED,
        SWITCH_POKEMON, TURN_END, BATTLE_END

Guards: canUseMove, isAlive, hasRemainingPokemon, isTypeEffective

Effects: calculateDamage, applyStatusEffect, modifyStat, checkWeather

Activities: animateMove, showDamageNumber, playFaintAnimation
```

Parallel states run concurrently: weather effects, status conditions, and field effects each in their own region. Store manages battle state reactively -- HP bars, stat stages, status conditions all update through reactive subscriptions. Every move creates a trace span with structured attributes: `move.name`, `move.type`, `damage.amount`, `effectiveness`, `critical_hit`. Damage calculation uses Result types: `Result<DamageResult, DamageCalcError>`. The AI opponent is a swappable adapter -- random strategy and type-aware strategy ship out of the box.

A completed battle produces a detailed flame graph in Jaeger showing every turn, every move, and every damage calculation as nested trace spans.

#### User Stories

- As a user, I can battle an AI opponent with my team of 6 Pokemon
- As a user, I see real-time HP changes, status effects, and weather conditions
- As a developer, I can see the battle Flow machine's current state and valid transitions in Brain View
- As a developer, I can open Jaeger and see the entire battle as a trace waterfall/flame graph
- As a developer, I can see parallel state regions for weather, terrain, and status conditions

---

### Feature 5: Trading Post

**Packages exercised:** core, runtime, result, tracing, saga, react, hono

Multi-step Pokemon trades between "trainers" using the saga pattern with automatic compensation.

#### What Makes It Special

The trading saga models the full exchange lifecycle:

```
Steps:       initiate_trade -> select_pokemon -> verify_ownership ->
             lock_pokemon -> execute_swap -> confirm_receipt -> complete

Compensation: unlock_pokemon <- return_pokemon <- notify_cancellation
```

Failures are deliberately injectable. A random chance of "communication error" at any step demonstrates the compensation chain in action. A visual saga timeline shows completed steps, the current step, and compensation arrows flowing backward on failure. Each saga step is a trace span in Jaeger, so a failed trade produces a trace showing the forward steps, the failure point, and the compensation steps rolling backward.

#### User Stories

- As a user, I can initiate a trade, select a Pokemon, and complete the multi-step exchange
- As a user, I can see a visual timeline of the trade saga's progress
- As a user, when a trade fails I see the automatic compensation roll back my Pokemon
- As a developer, I can inject failures at any saga step and watch compensation execute
- As a developer, I can see the full saga execution as nested trace spans in Jaeger

---

### Feature 6: Research Notes

**Packages exercised:** core, runtime, store, query, react

A personal research journal where trainers track discoveries with reactive state management.

#### What Makes It Special

Store atoms manage discrete pieces of trainer state: favorite Pokemon list, trainer profile, research tags. Derived values compute automatically: team power score (sum of base stats), type coverage percentage, Pokedex completion percentage. Async derived values pull from external data: Pokemon rarity index computed from encounter rate data. Effects handle persistence: auto-save to localStorage, preference syncing. Query integration means PokeAPI data is cached and deduplicated across the application.

#### User Stories

- As a user, I can favorite Pokemon and see my favorites list update reactively
- As a user, I see derived statistics (team power, type coverage percentage) update automatically when I change my team
- As a developer, I can inspect the store's reactive dependency graph in Brain View
- As a developer, I can see cache statistics: hit rates, stale entries, active fetches

---

### Feature 7: Porygon's Brain

**Packages exercised:** ALL packages -- core, graph, runtime, result, tracing, flow, store, saga, query, react, hono

A toggleable overlay that reveals the application's nervous system. This is the HexDI "Self-Aware Application" vision made visible. This is the killer feature.

#### Five Panels

**Neural Map -- Live Dependency Graph**

The application's complete dependency graph rendered as an interactive visualization. Nodes pulse when their port is resolved. Edges light up during dependency traversal. Color coding by lifetime: singleton nodes in gold, scoped in blue, transient in green. Real-time graph metrics displayed: complexity score, depth, node count. Click any node to see its port definition, bound adapter, and full resolution history.

**Synapse Activity -- Live Trace Waterfall**

Real-time trace spans rendered as a waterfall diagram as the user interacts with the app. Direct link to Jaeger UI for full exploration. Cross-service traces visible: frontend to API to PokeAPI. Error traces highlighted in red. Resolution timing breakdown per port.

**Memory Banks -- Container Scope Tree**

The container hierarchy rendered as a tree. Root container at the top. Session scope holding user preferences. Battle scope created per battle and destroyed after. Request scopes created per API call. Scopes appear and disappear in real-time as the user navigates between features.

**Thought Process -- Flow State Machine Inspector**

The currently active state highlighted on the machine diagram. Valid transitions listed with their guard conditions. Running activities shown with progress indicators. State history timeline with the events that triggered each transition. Works across all machines: evolution machines, battle machines, navigation machine.

**Vital Signs -- Health Metrics Dashboard**

Resolution performance percentiles: p50, p95, p99. Cache hit rate over time rendered as a sparkline. Error rate per port. Active scope count. Trace export health: spans successfully exported to Jaeger. Saga completion and failure rates.

#### User Stories

- As a developer, I can toggle Brain View and see the app's dependency graph, traces, scopes, and state machines in one overlay
- As a developer, I can click any node in the dependency graph and see its full resolution history
- As a developer, I can watch scopes appear and disappear as I navigate between features
- As a developer, I can see the battle state machine's current state update in real-time during battles
- As a developer, I can link from Synapse Activity directly to Jaeger's UI for deep trace analysis

---

## HexDI Package Coverage Matrix

Every package is exercised in at least two features. The Battle Simulator alone touches 10 packages.

| Package                | Discovery | Evolution | Type Graph | Battle | Trading | Research | Brain |
| ---------------------- | --------- | --------- | ---------- | ------ | ------- | -------- | ----- |
| @hex-di/core           | x         | x         | x          | x      | x       | x        | x     |
| @hex-di/graph          | x         |           | x          | x      |         |          | x     |
| @hex-di/runtime        | x         | x         | x          | x      | x       | x        | x     |
| @hex-di/result         | x         |           |            | x      | x       |          |       |
| @hex-di/tracing        | x         | x         |            | x      | x       |          | x     |
| @hex-di/tracing-jaeger | x         | x         |            | x      | x       |          | x     |
| @hex-di/flow           |           | x         |            | x      |         |          | x     |
| @hex-di/store          |           |           |            | x      |         | x        | x     |
| @hex-di/saga           |           |           |            |        | x       |          | x     |
| @hex-di/query          | x         |           |            |        |         | x        | x     |
| @hex-di/react          | x         | x         | x          | x      | x       | x        | x     |
| @hex-di/hono           | x         |           |            | x      | x       |          | x     |

---

## Technical Architecture

### Frontend

- React 19 with Vite
- TailwindCSS for styling
- React Router for navigation
- HexDI React integration via `createTypedHooks()`
- OpenTelemetry Web SDK for browser traces exported to Jaeger via OTLP HTTP

### Backend

- Hono (lightweight, edge-native HTTP framework)
- HexDI Hono integration: per-request scopes, tracing middleware, diagnostic routes
- PokeAPI proxy with in-memory caching layer
- OpenTelemetry Node SDK for server traces exported to Jaeger via OTLP HTTP

### Infrastructure

Docker Compose orchestrates three services:

- **jaeger** -- All-in-one Jaeger instance. UI on port 16686, OTLP HTTP collector on port 4318.
- **api** -- Hono backend. Receives requests from the frontend, proxies to PokeAPI, manages battle and trading state.
- **frontend** -- Vite dev server in development, static build served by the API in production.

### Cross-Service Tracing

W3C Trace Context propagation links the entire request chain. The frontend injects a `traceparent` header on every API call. The backend continues the trace, adding its own spans. PokeAPI calls become children of the same trace. The result: a single distributed trace in Jaeger spanning frontend interaction to backend processing to external API call.

---

## Project Structure

```
examples/pokenerve/
|-- docker-compose.yml
|-- PRODUCT.md
|
|-- frontend/
|   |-- package.json
|   |-- vite.config.ts
|   |-- src/
|   |   |-- ports/                         # Port definitions (contracts)
|   |   |   |-- pokemon-api.ts             # PokemonListPort, PokemonDetailPort
|   |   |   |-- evolution.ts               # EvolutionChainPort
|   |   |   |-- type-chart.ts              # TypeEffectivenessPort
|   |   |   |-- battle.ts                  # BattleEnginePort, DamageCalcPort, AiStrategyPort
|   |   |   |-- trading.ts                 # TradingPort, VerificationPort
|   |   |   |-- storage.ts                 # PersistencePort
|   |   |   |-- analytics.ts              # AnalyticsPort
|   |   |
|   |   |-- adapters/                      # Adapter implementations
|   |   |   |-- api/
|   |   |   |   |-- rest-pokemon.ts        # REST PokeAPI adapter
|   |   |   |   |-- cached-pokemon.ts      # Caching decorator adapter
|   |   |   |   |-- offline-pokemon.ts     # Offline/mock data fallback
|   |   |   |-- battle/
|   |   |   |   |-- damage-calc.ts         # Damage calculation adapter
|   |   |   |   |-- random-ai.ts          # Random move AI strategy
|   |   |   |   |-- smart-ai.ts           # Type-aware AI strategy (swappable)
|   |   |   |-- storage/
|   |   |   |   |-- local-storage.ts       # localStorage persistence adapter
|   |   |   |-- tracing/
|   |   |       |-- otlp-browser.ts        # OTLP HTTP exporter for browser
|   |   |
|   |   |-- machines/                      # Flow state machine definitions
|   |   |   |-- evolution.ts               # Evolution chain machine
|   |   |   |-- battle.ts                  # Battle turn machine
|   |   |   |-- trading.ts                 # Trading saga machine
|   |   |   |-- app-navigation.ts          # App navigation machine
|   |   |
|   |   |-- sagas/                         # Saga definitions
|   |   |   |-- trading-saga.ts            # Trade saga with compensation chain
|   |   |
|   |   |-- store/                         # Store atom definitions
|   |   |   |-- trainer-profile.ts         # Trainer state atom
|   |   |   |-- team.ts                    # Team composition atom
|   |   |   |-- favorites.ts              # Favorites atom
|   |   |   |-- derived/
|   |   |       |-- team-power.ts          # Derived: total team base stat sum
|   |   |       |-- type-coverage.ts       # Derived: type coverage percentage
|   |   |       |-- pokedex-completion.ts  # Derived: Pokedex completion percentage
|   |   |
|   |   |-- queries/                       # Query port definitions
|   |   |   |-- pokemon-list.ts            # List query with pagination
|   |   |   |-- pokemon-detail.ts          # Detail query with caching
|   |   |   |-- evolution-chain.ts         # Evolution data query
|   |   |   |-- type-chart.ts              # Type effectiveness query
|   |   |
|   |   |-- graph/                         # DI graph composition
|   |   |   |-- core-graph.ts              # Core application services
|   |   |   |-- battle-graph.ts            # Battle-scoped services
|   |   |   |-- trading-graph.ts           # Trading-scoped services
|   |   |   |-- tracing-graph.ts           # Tracing configuration
|   |   |
|   |   |-- features/                      # React feature modules
|   |   |   |-- discovery/
|   |   |   |   |-- DiscoveryPage.tsx
|   |   |   |   |-- PokemonCard.tsx
|   |   |   |   |-- PokemonDetail.tsx
|   |   |   |   |-- FilterBar.tsx
|   |   |   |   |-- AdapterSwitcher.tsx    # Live adapter switching demo
|   |   |   |
|   |   |   |-- evolution-lab/
|   |   |   |   |-- EvolutionLabPage.tsx
|   |   |   |   |-- EvolutionTree.tsx      # State machine visualization
|   |   |   |   |-- EvolutionControls.tsx
|   |   |   |   |-- GuardConditions.tsx
|   |   |   |
|   |   |   |-- type-graph/
|   |   |   |   |-- TypeGraphPage.tsx
|   |   |   |   |-- TypeForceGraph.tsx     # Force-directed type graph
|   |   |   |   |-- TeamBuilder.tsx
|   |   |   |   |-- TypeSuggestions.tsx
|   |   |   |
|   |   |   |-- battle/
|   |   |   |   |-- BattlePage.tsx
|   |   |   |   |-- BattleField.tsx
|   |   |   |   |-- MoveSelector.tsx
|   |   |   |   |-- HpBar.tsx
|   |   |   |   |-- StatusEffects.tsx
|   |   |   |   |-- BattleLog.tsx
|   |   |   |
|   |   |   |-- trading/
|   |   |   |   |-- TradingPage.tsx
|   |   |   |   |-- TradeTimeline.tsx      # Saga step visualization
|   |   |   |   |-- PokemonSelector.tsx
|   |   |   |   |-- CompensationView.tsx
|   |   |   |
|   |   |   |-- research/
|   |   |   |   |-- ResearchPage.tsx
|   |   |   |   |-- FavoritesList.tsx
|   |   |   |   |-- TeamStats.tsx
|   |   |   |   |-- CacheViewer.tsx
|   |   |   |
|   |   |   |-- brain/                     # Porygon's Brain overlay
|   |   |       |-- BrainOverlay.tsx        # Toggleable overlay shell
|   |   |       |-- NeuralMap.tsx           # Live dependency graph
|   |   |       |-- SynapseActivity.tsx     # Live trace waterfall
|   |   |       |-- MemoryBanks.tsx         # Container scope tree
|   |   |       |-- ThoughtProcess.tsx      # State machine inspector
|   |   |       |-- VitalSigns.tsx          # Health metrics dashboard
|   |   |
|   |   |-- providers/
|   |   |   |-- container-provider.tsx      # Root DI provider
|   |   |   |-- battle-scope.tsx            # Battle-scoped DI provider
|   |   |   |-- trading-scope.tsx           # Trading-scoped DI provider
|   |   |
|   |   |-- App.tsx
|   |   |-- main.tsx
|
|-- api/
|   |-- package.json
|   |-- src/
|       |-- ports/
|       |   |-- pokemon-cache.ts            # Cache port
|       |   |-- rate-limiter.ts             # Rate limit port
|       |-- adapters/
|       |   |-- memory-cache.ts             # In-memory cache adapter
|       |   |-- pokeapi-proxy.ts            # PokeAPI proxy adapter
|       |-- middleware/
|       |   |-- scope.ts                    # Per-request scope middleware
|       |   |-- tracing.ts                  # OTLP trace context propagation
|       |   |-- cors.ts                     # CORS (allows traceparent header)
|       |-- routes/
|       |   |-- pokemon.ts                  # /api/pokemon endpoints
|       |   |-- battle.ts                   # /api/battle endpoints
|       |   |-- trading.ts                  # /api/trading endpoints
|       |   |-- diagnostics.ts              # HexDI diagnostic routes
|       |-- graph/
|       |   |-- api-graph.ts                # API DI graph
|       |-- server.ts
|
|-- shared/
    |-- types/                              # Shared TypeScript types
        |-- pokemon.ts
        |-- battle.ts
        |-- trading.ts
```

---

## Detailed Feature Specifications

### Discovery Hub: Adapter Swapping

The Discovery Hub's most distinctive interaction is live adapter swapping. Three adapters implement the same `PokemonListPort`:

1. **RestPokemonAdapter** -- Fetches directly from PokeAPI on every request. Slow but always fresh.
2. **CachedPokemonAdapter** -- Wraps the REST adapter with an in-memory cache. Fast after first load, shows cache hit/miss in Brain View.
3. **OfflinePokemonAdapter** -- Returns bundled static data. Works with no network. Demonstrates offline fallback.

A dropdown in the UI lets the user switch adapters at runtime. When they do:

- The DI graph reconfigures to bind the new adapter to the port
- Brain View's Neural Map shows the graph edge change in real-time
- The data refreshes using the new adapter
- Trace spans show the adapter switch as a named event

This is the most direct demonstration of hexagonal architecture's core benefit: implementation swapping without changing consumers.

### Evolution Lab: Guard System

Evolution guards map real Pokemon evolution conditions to Flow machine guard functions:

| Guard             | Pokemon Example          | Condition                                                  |
| ----------------- | ------------------------ | ---------------------------------------------------------- |
| `levelGuard`      | Charmander -> Charmeleon | `context.level >= 16`                                      |
| `friendshipGuard` | Chansey -> Blissey       | `context.friendship >= 220`                                |
| `itemGuard`       | Pikachu -> Raichu        | `context.heldItem === 'thunder-stone'`                     |
| `tradeGuard`      | Haunter -> Gengar        | `context.isTrading === true`                               |
| `tradeItemGuard`  | Onix -> Steelix          | `context.isTrading && context.heldItem === 'metal-coat'`   |
| `moveGuard`       | Lickitung -> Lickilicky  | `context.knownMoves.includes('rollout')`                   |
| `locationGuard`   | Eevee -> Leafeon         | `context.location === 'moss-rock'`                         |
| `timeGuard`       | Eevee -> Espeon          | `context.timeOfDay === 'day' && context.friendship >= 160` |

The UI presents these as interactive conditions. The user toggles switches and fills in values to satisfy guards, then triggers the evolution transition. Brain View shows the guard evaluation as trace spans.

### Battle Simulator: State Machine Detail

The battle machine is the most complex Flow machine in the application. It uses nested and parallel states:

```
battle (parallel)
  |-- turn_cycle (sequential)
  |     |-- turn_start
  |     |-- move_select
  |     |-- priority_calc
  |     |-- move_execute
  |     |     |-- damage_calc
  |     |     |-- effect_apply
  |     |-- faint_check
  |     |     |-- switch_prompt (conditional)
  |     |-- turn_end
  |
  |-- weather (parallel region)
  |     |-- none
  |     |-- sun
  |     |-- rain
  |     |-- sandstorm
  |     |-- hail
  |
  |-- field_effects (parallel region)
        |-- none
        |-- electric_terrain
        |-- grassy_terrain
        |-- misty_terrain
        |-- psychic_terrain
```

Each move execution generates trace spans with these attributes:

- `pokemon.attacker`: name of the attacking Pokemon
- `pokemon.defender`: name of the defending Pokemon
- `move.name`: the move used
- `move.type`: the move's type
- `move.category`: physical, special, or status
- `damage.base`: base damage before modifiers
- `damage.stab`: same-type attack bonus applied (boolean)
- `damage.effectiveness`: 0, 0.25, 0.5, 1, 2, or 4
- `damage.critical`: whether a critical hit occurred
- `damage.final`: final damage dealt
- `hp.before`: defender's HP before the move
- `hp.after`: defender's HP after the move

A 10-turn battle generates approximately 50-100 trace spans. Viewed in Jaeger as a flame graph, the battle's structure becomes immediately legible: each turn is a parent span, each move execution is a child, each damage calculation is a grandchild.

### Trading Post: Saga Compensation Detail

The trading saga has seven forward steps and a compensation chain that unwinds on failure:

```
Forward:      initiate -> select -> verify -> lock -> swap -> confirm -> complete
                                      |         |       |
Compensation:                    notify_cancel  unlock  return
                                      ^         ^       ^
                                      |---------|-------|
                                      (compensation flows backward)
```

The UI includes a "chaos mode" toggle. When enabled, each step has a configurable failure probability (default 15%). When a step fails:

1. The timeline visualization shows the forward steps in green, the failed step in red
2. Compensation arrows appear, flowing backward from the failure point
3. Each compensation step executes and turns blue as it completes
4. The user's Pokemon is returned to their inventory
5. A notification explains what happened

In Jaeger, a failed trade trace shows forward spans, the error span at the failure point, and compensation spans as siblings of the error span. This makes the saga pattern's value immediately visible: automatic, reliable rollback.

### Research Notes: Reactive State

Store atoms and their derived values form a reactive dependency graph:

```
trainer-profile (atom)
  |
  v
team (atom) -------> team-power (derived: sum of base stats)
  |                    |
  |                    v
  |              type-coverage (derived: percentage of types covered)
  |
  v
favorites (atom) --> pokedex-completion (derived: favorites.length / total)
  |
  v
research-tags (atom)
```

When the user adds a Pokemon to their team, `team-power` and `type-coverage` recompute automatically. When they favorite a Pokemon, `pokedex-completion` updates. Brain View shows this reactive graph with values updating in real-time.

Effects handle side concerns:

- `autoSave`: writes state changes to localStorage on a debounced schedule
- `syncPreferences`: synchronizes theme and display preferences

---

## Porygon Narrative Integration

The Porygon narrative is not decorative. It provides a conceptual framework that makes technical concepts accessible to non-expert audiences.

| Technical Concept | Porygon Metaphor  | Where It Appears                   |
| ----------------- | ----------------- | ---------------------------------- |
| Dependency graph  | Neural network    | Neural Map panel                   |
| Trace spans       | Synaptic impulses | Synapse Activity panel             |
| Container scopes  | Memory banks      | Memory Banks panel                 |
| State machines    | Thought processes | Thought Process panel              |
| Health metrics    | Vital signs       | Vital Signs panel                  |
| Port resolution   | Neural firing     | Node pulse animation in Neural Map |
| Adapter swapping  | Neural rewiring   | Graph edge animation during swap   |
| Scope creation    | Memory allocation | New node appearing in scope tree   |
| Scope disposal    | Memory release    | Node fading from scope tree        |
| Error trace       | Pain signal       | Red highlight in Synapse Activity  |

The app's header features a subtle Porygon silhouette. The Brain View toggle is labeled "Brain View" with a Porygon icon. Panel headers use the metaphor names (Neural Map, not Dependency Graph) but include the technical term in parentheses for clarity.

---

## Success Criteria

1. Every HexDI package is exercised in at least 2 features
2. Cross-service traces are visible in Jaeger spanning frontend to backend to PokeAPI
3. Brain View displays live dependency graph, trace waterfall, scope tree, state machines, and health metrics
4. Adapter swapping visually reconfigures the dependency graph in real-time
5. A full battle generates at least 50 trace spans viewable as a flame graph in Jaeger
6. The trading saga demonstrates successful compensation on injected failure
7. The application loads in under 3 seconds and runs smoothly on modern browsers
8. The source code is readable and serves as a reference for HexDI usage patterns

---

## Why This Works

**Natural metaphors.** Pokemon types map to ports. Evolution maps to state machines. Trading maps to sagas. The domain genuinely fits the architecture. Nothing is forced.

**Progressive disclosure.** Users see a beautiful Pokedex first. Developers toggle Brain View for depth. The same application serves both audiences without compromise.

**The vision made real.** This application embodies VISION.md's "Self-Aware Application" concept. It literally knows itself and shows you. It is the existence proof.

**Jaeger integration is visible.** Distributed tracing is not hidden in server logs. The trace waterfall is a first-class panel in Brain View, with direct links to Jaeger's full UI.

**Adapter swapping is interactive.** The user watches the architecture change in real-time. This is the single most compelling demonstration of hexagonal architecture's core promise, and no other DI framework makes it this tangible.

**Every package earns its place.** No gratuitous usage. Each HexDI package maps to a natural Pokemon domain concept. The architecture serves the product. The product reveals the architecture.
