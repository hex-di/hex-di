# Task Breakdown: PokeNerve Showcase Application

## Overview

Total Tasks: 14 Task Groups, ~120 sub-tasks

This task list builds the PokeNerve showcase application from foundations up through features to integration. Each group references the spec files it implements. Tasks are ordered so that each group's dependencies are satisfied by earlier groups.

---

## Task List

### Foundation Layer

#### Task Group 1: Project Scaffolding & Shared Types

**Dependencies:** None
**Spec:** `01-overview.md` (Sections 2-9)

- [ ] 1.0 Complete project scaffolding
  - [ ] 1.1 Create the monorepo directory structure
    - `examples/pokenerve/frontend/` with `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
    - `examples/pokenerve/api/` with `package.json`, `tsconfig.json`, `Dockerfile`
    - `examples/pokenerve/shared/types/`
    - Configure pnpm workspace entries for `@pokenerve/frontend`, `@pokenerve/api`
    - Add HexDI workspace dependencies per spec Section 4
  - [ ] 1.2 Configure TypeScript path aliases
    - `@pokenerve/shared/*` alias in both `frontend/tsconfig.json` and `api/tsconfig.json`
    - `"strict": true` in both configs
  - [ ] 1.3 Configure Vite
    - React plugin, TailwindCSS 4, dev server on port 5173
    - API proxy: `/api` -> `http://localhost:3001`
    - Resolve alias for `@pokenerve/shared`
  - [ ] 1.4 Create shared type definitions
    - `shared/types/pokemon.ts`: `Pokemon`, `PokemonType`, `Stat`, `Ability`, `Sprites`, `PokemonMove`, `EvolutionChain`, `ChainLink`, `EvolutionDetail`, `TypeData`, `TypeRelations`, `Move`, `PokemonSpecies`, `NamedAPIResource`, `PaginatedResponse`, `PokemonApiError`
    - `shared/types/battle.ts`: `BattleState`, `BattlePokemon`, `StatStages`, `BattleMove`, `StatusCondition`, `Weather`, `Terrain`, `DamageCalcInput`, `DamageResult`, `DamageCalcError`, `AiMoveInput`, `AiAction`, `BattleLogEntry`, `BattleTraceAttributes`
    - `shared/types/trading.ts`: `TradeOffer`, `TradeSagaState`, `TradeSagaStep`, `TradeSagaStepName`, `TradeCompensationStepName`, `TradingError`
  - [ ] 1.5 Create `docker-compose.yml`
    - Three services: `jaeger` (all-in-one:1.62), `api`, `frontend`
    - Ports: 16686, 4318, 14268 for Jaeger; 3001 for API; 5173 for frontend
    - Network: `pokenerve` bridge
  - [ ] 1.6 Create API `Dockerfile`
    - Multi-stage build (node:22-alpine)
    - Copy workspace files, install deps, build, runtime stage
  - [ ] 1.7 Verify the scaffolding compiles
    - `pnpm install` succeeds
    - `pnpm --filter @pokenerve/frontend typecheck` passes
    - `pnpm --filter @pokenerve/api typecheck` passes

**Acceptance Criteria:**

- Both frontend and API workspaces compile with zero TypeScript errors
- Shared types are importable from both workspaces via `@pokenerve/shared/*`
- `docker-compose.yml` is syntactically valid
- Vite dev server starts and serves the index page

---

#### Task Group 2: Core DI Infrastructure & Tracing

**Dependencies:** Task Group 1
**Spec:** `02-core-infrastructure.md` (Sections 1-6)

- [ ] 2.0 Complete core DI infrastructure
  - [ ] 2.1 Write 6 focused tests for core infrastructure
    - Test: Core graph builds successfully with all adapters
    - Test: `inspectGraph(graph)` reports no unsatisfied dependencies
    - Test: Container resolves singleton ports returning same instance
    - Test: `instrumentContainer()` produces spans with correct attributes
    - Test: Scope creation and disposal works via `container.createScope()`
    - Test: Adapter switching reconfigures the graph
  - [x] 2.2 Create frontend port definitions
    - `frontend/src/ports/pokemon-api.ts`: `PokemonListPort`, `PokemonDetailPort`
    - `frontend/src/ports/evolution.ts`: `EvolutionChainPort`
    - `frontend/src/ports/type-chart.ts`: `TypeEffectivenessPort`
    - `frontend/src/ports/battle.ts`: `BattleEnginePort`, `DamageCalcPort`, `AiStrategyPort`
    - `frontend/src/ports/trading.ts`: `TradingPort`
    - `frontend/src/ports/storage.ts`: `PersistencePort`
    - `frontend/src/ports/analytics.ts`: `AnalyticsPort`
  - [x] 2.3 Create frontend adapter implementations
    - `adapters/api/rest-pokemon.ts`: REST adapters for List and Detail ports
    - `adapters/api/cached-pokemon.ts`: Decorator pattern with LRU cache
    - `adapters/api/offline-pokemon.ts`: Static bundled Gen 1 data fallback
    - `adapters/storage/local-storage.ts`: Result-wrapped localStorage adapter
    - `adapters/analytics/console-analytics.ts`: Console logging analytics
  - [x] 2.4 Create DI graph composition
    - `graph/core-graph.ts`: Core app services (API, persistence, analytics, evolution, type effectiveness)
    - `graph/battle-graph.ts`: Battle-scoped services (engine, damage calc, AI)
    - `graph/trading-graph.ts`: Trading-scoped services
    - `graph/tracing-graph.ts`: Tracer + OTLP browser exporter adapters
    - `graph/root-graph.ts`: Composite root merging all sub-graphs
  - [x] 2.5 Create browser OTLP exporter adapter
    - `adapters/tracing/otlp-browser.ts`: Converts HexDI spans to OTLP JSON, posts to Jaeger port 4318
    - `keepalive: true` for page navigation survival
  - [x] 2.6 Set up container bootstrap in `main.tsx`
    - `createContainer(rootGraph, { devTools: true })`
    - `createInspector(container)` for Brain View
    - `instrumentContainer(container, tracer)` with custom attribute schema
  - [x] 2.7 Create React provider tree
    - `providers/container-provider.tsx`: Root `HexDiContainerProvider`
    - `providers/battle-scope.tsx`: `HexDiAutoScopeProvider` for battle scope
    - `providers/trading-scope.tsx`: `HexDiAutoScopeProvider` for trading scope
    - Provider nesting: Container > Tracing > Inspector > Router > App
  - [ ] 2.8 Ensure core infrastructure tests pass
    - Run only the 6 tests from 2.1

**Acceptance Criteria:**

- All 10 ports compile with correct type inference
- Graph builds without compile-time errors
- Container resolves singletons from root and scoped services from child scopes
- `instrumentContainer()` produces trace spans with `hexdi.port.name` and `hexdi.app` attributes
- OTLP exporter adapter compiles and exports spans

---

#### Task Group 3: Backend API Server

**Dependencies:** Task Group 1
**Spec:** `10-backend-api.md` (Sections 1-8)

- [ ] 3.0 Complete backend API server
  - [ ] 3.1 Write 6 focused tests for API routes
    - Test: `GET /api/pokemon?offset=0&limit=20` returns paginated list
    - Test: `GET /api/pokemon/1` returns Bulbasaur data
    - Test: `POST /api/battle/start` creates battle with unique ID
    - Test: `POST /api/trading/initiate` creates trade with unique ID
    - Test: `GET /api/diagnostics/health` returns healthy container status
    - Test: Rate limiter returns 429 when exhausted
  - [ ] 3.2 Create backend port definitions
    - `api/src/ports/pokemon-cache.ts`: `PokemonCachePort` with LRU cache interface
    - `api/src/ports/rate-limiter.ts`: `RateLimiterPort` with token bucket interface
  - [ ] 3.3 Create backend adapter implementations
    - `api/src/adapters/memory-cache.ts`: In-memory LRU cache (1000 entries, 5min TTL)
    - `api/src/adapters/rate-limiter.ts`: Token bucket (100 req/min)
    - `api/src/adapters/pokeapi-proxy.ts`: `PokeApiProxyPort` with cache check, rate limit, trace context injection
  - [ ] 3.4 Create backend DI graph
    - `api/src/graph/api-graph.ts`: Tracer, cache, rate limiter, proxy adapters
  - [ ] 3.5 Create middleware stack
    - `api/src/middleware/cors.ts`: Allow `traceparent`, `tracestate`, `X-Request-ID` headers
    - Tracing middleware: `tracingMiddleware({ tracer })` with W3C trace context extraction
    - Scope middleware: `createScopeMiddleware(container)` for per-request scopes
  - [ ] 3.6 Create route handlers
    - `api/src/routes/pokemon.ts`: 6 endpoints (list, detail, species, evolution, types, type effectiveness)
    - `api/src/routes/battle.ts`: 3 endpoints (start, move, get state)
    - `api/src/routes/trading.ts`: 3 endpoints (initiate, step, get state) with compensation logic
    - Mount `createDiagnosticRoutes()` at `/api/diagnostics`
  - [ ] 3.7 Create server entry point
    - `api/src/server.ts`: Container creation, instrumentation, middleware stack, route mounting, `serve()` on port 3001
  - [ ] 3.8 Implement `mapErrorToStatus` helper
    - NotFound -> 404, RateLimit -> 429, Network -> 502, Parse -> 500
  - [ ] 3.9 Ensure backend tests pass
    - Run only the 6 tests from 3.1

**Acceptance Criteria:**

- All 16 API routes respond correctly
- PokeAPI proxy caches responses (second request is instant)
- Rate limiter returns 429 with `retryAfterMs` when exhausted
- Diagnostic routes return valid container data
- Trace context propagation works (traceparent header flows through)

---

#### Task Group 4: App Shell, Routing & Navigation

**Dependencies:** Task Groups 2, 3
**Spec:** `01-overview.md` (Section 10), `09-porygons-brain.md` (Section 2)

- [ ] 4.0 Complete app shell and routing
  - [ ] 4.1 Write 4 focused tests for app shell
    - Test: All 7 routes render their corresponding page components
    - Test: Navigation links update the URL
    - Test: Brain View toggle opens/closes the overlay
    - Test: Brain View state persists to localStorage
  - [x] 4.2 Create `App.tsx` with React Router 7
    - 8 routes: `/`, `/pokemon/:id`, `/evolution`, `/evolution/:pokemonId`, `/types`, `/battle`, `/trading`, `/research`
    - `AppLayout` with header navigation
    - Battle and Trading routes wrapped in `HexDiAutoScopeProvider`
  - [x] 4.3 Create `AppLayout` component
    - Header with navigation links for all 7 features
    - Porygon Brain View toggle button in header
    - `Outlet` for route content
  - [x] 4.4 Create `BrainViewContext` and provider
    - State: `isOpen`, `activePanel`, `panelHeight`
    - Persist to localStorage
    - `Ctrl+Shift+B` / `Cmd+Shift+B` global keyboard shortcut
  - [ ] 4.5 Install and configure TailwindCSS 4
    - Base styles, responsive breakpoints
    - Pokemon type color utilities
  - [x] 4.6 Create placeholder page components for all 7 features
    - Stub components that render the feature name
    - Verify routing works end-to-end
  - [ ] 4.7 Ensure app shell tests pass
    - Run only the 4 tests from 4.1

**Acceptance Criteria:**

- All routes render correctly
- Header navigation works across all pages
- Brain View toggle is accessible via keyboard shortcut and header button
- Brain View state persists across page refresh

---

### Feature Layer -- Tier 1 (No feature dependencies)

#### Task Group 5: Pokemon Discovery Hub

**Dependencies:** Task Groups 2, 3, 4
**Spec:** `03-discovery-hub.md` (Sections 1-10)

- [ ] 5.0 Complete Discovery Hub feature
  - [ ] 5.1 Write 6 focused tests for Discovery Hub
    - Test: Pokemon list renders cards from mocked `PokemonListPort`
    - Test: Type filter narrows the list via query parameters
    - Test: Adapter switcher dropdown changes the active adapter
    - Test: Error banner renders for `NetworkError` result
    - Test: Loading skeleton shows while data fetches
    - Test: Pokemon detail panel opens on card click
  - [ ] 5.2 Create `DiscoveryPage.tsx` container component
    - Read filter state from URL query params
    - Fetch Pokemon list from `PokemonListPort` with `ResultAsync`
    - Manage selected Pokemon state for detail panel
  - [ ] 5.3 Create `FilterBar.tsx`
    - 4 dropdowns: type, habitat, color, shape
    - Load options from PokeAPI metadata endpoints
    - AND composition of filters
    - URL query parameter sync
  - [ ] 5.4 Create `PokemonCard.tsx` and `PokemonGrid`
    - Card: sprite, name, type badges with colored borders
    - Grid: responsive 4-column layout
    - Hover: `scale-105` interaction feedback
  - [ ] 5.5 Create `PokemonDetail.tsx` (slide-out panel)
    - Fetch full data from `PokemonDetailPort`
    - Radar chart for 6 base stats (HP, Atk, Def, SpA, SpD, Spe)
    - Abilities list, truncated moves table
  - [ ] 5.6 Create `AdapterSwitcher.tsx`
    - Dropdown: REST, Cached, Offline
    - On change: rebuild graph with `buildAdapterGraph(choice)`
    - Child container with overrides replaces active container
    - Green dot indicator for connected, gray for offline
  - [ ] 5.7 Implement adapter switching mechanism
    - `buildAdapterGraph(choice)` function per spec Section 4.3
    - `DiscoveryContainerProvider` with `useMemo` container creation
    - Trace span: `adapter.switch` with `{ from, to }` attributes
  - [ ] 5.8 Create `Pagination.tsx` component
    - Page navigation with current page / total display
  - [ ] 5.9 Implement error handling with `Result.match()`
    - Map each `PokemonApiError._tag` to appropriate error banner
    - Retry button for `NetworkError` and `RateLimitError`
  - [ ] 5.10 Ensure Discovery Hub tests pass
    - Run only the 6 tests from 5.1

**Acceptance Criteria:**

- Pokemon list renders with pagination
- All 4 filters work independently and in combination
- Adapter switching refreshes data using the new source
- Error states show typed error banners with retry
- Every API call generates trace spans visible in Jaeger

---

#### Task Group 6: Evolution Lab

**Dependencies:** Task Groups 2, 4
**Spec:** `04-evolution-lab.md` (Sections 1-10)

- [ ] 6.0 Complete Evolution Lab feature
  - [ ] 6.1 Write 6 focused tests for Evolution Lab
    - Test: Level guard returns true when level >= threshold
    - Test: Level guard returns false when level < threshold
    - Test: Eevee machine transitions to Flareon with `fire-stone` held item
    - Test: Blocked evolution stays in current state
    - Test: `buildEvolutionMachine` generates machine from PokeAPI chain data
    - Test: Dynamic machine has correct state count for Charmander line (3 states)
  - [ ] 6.2 Implement evolution context type and default factory
    - `EvolutionContext` interface with all 15+ fields
    - `createDefaultContext(speciesName)` factory function
  - [ ] 6.3 Implement guard builder
    - `buildGuard(details)` composing PokeAPI evolution detail fields
    - 12 guard types: level, friendship, item, held item, known move, location, time of day, trade, affection, rain, gender, upside down
    - AND within a single detail, OR across multiple details
  - [ ] 6.4 Implement dynamic machine generation
    - `buildEvolutionMachine(chain)` recursive tree walker
    - Each species becomes a state; leaf nodes are final states
    - `EVOLVE` and `SET_CONTEXT` events on every non-final state
    - Branching transitions for Eevee-style chains
  - [ ] 6.5 Create hardcoded showcase machines
    - Charmander line (linear 3-stage)
    - Eevee (8-branch fan)
    - Used as fallback when API is unavailable
  - [ ] 6.6 Create `EvolutionLabPage.tsx`
    - Pokemon search bar to load any evolution chain
    - `useMachine()` hook from `@hex-di/flow-react`
    - Compute visible controls based on chain guard types
  - [ ] 6.7 Create `EvolutionTree.tsx` (SVG diagram)
    - Nodes: rounded rectangles with species sprite + name
    - Edges: directed arrows with guard condition labels
    - Current state: glow highlight
    - Final states: double border
    - Eevee: fan/radial layout from center
  - [ ] 6.8 Create `EvolutionControls.tsx`
    - Level slider (1-100), Friendship slider (0-255), Beauty/Affection sliders
    - Item dropdown, Location dropdown, Time of Day toggle
    - Trading toggle, Gender toggle, Rain toggle, Upside Down toggle
    - "Evolve" button (disabled when no guard is satisfied)
    - Controls send `SET_CONTEXT` events for real-time feedback
  - [ ] 6.9 Create `GuardConditions.tsx`
    - List each possible evolution target with guard status
    - Satisfied: green indicator, current vs required values
    - Unsatisfied: gray with gap description
  - [ ] 6.10 Ensure Evolution Lab tests pass
    - Run only the 6 tests from 6.1

**Acceptance Criteria:**

- Any Pokemon's evolution chain loads and renders as an interactive state machine
- Eevee's 8 branches render as a fan layout with correct guard labels
- Guard feedback updates in real-time as controls change
- Clicking "Evolve" transitions the machine when guards are satisfied
- Each transition generates a trace span with guard evaluation details

---

### Feature Layer -- Tier 2 (Depend on Tier 1 features)

#### Task Group 7: Type Synergy Graph

**Dependencies:** Task Groups 2, 4, 5 (uses TypeEffectivenessPort)
**Spec:** `05-type-synergy-graph.md` (Sections 1-9)

- [ ] 7.0 Complete Type Synergy Graph feature
  - [ ] 7.1 Write 5 focused tests for Type Synergy Graph
    - Test: All 18 types exist in the type chart with correct colors
    - Test: Fire is super effective against Grass (2x multiplier)
    - Test: `analyzeTeam` returns correct coverage percentage
    - Test: Suggestion engine recommends a type to cover team weaknesses
    - Test: Cycle detection finds Fire > Grass > Water > Fire
  - [ ] 7.2 Create type data model and constants
    - `POKEMON_TYPES` array of 18 types
    - `TYPE_COLORS` mapping to official hex colors
    - `TypeData`, `TypeRelations` interfaces
  - [ ] 7.3 Build the type graph with HexDI graph APIs
    - `buildTypeGraph(types)`: Create virtual ports/adapters for graph analysis
    - Apply `inspectGraph`, `computeTypeComplexity`, `computeDependencyLayers`, `buildDependencyMap`
  - [ ] 7.4 Implement graph analysis functions
    - `analyzeTypeGraph()`: node count, edge count, complexity, connectivity
    - `detectTypeCycles()`: Find 3-node effectiveness cycles
    - `findCounterPath()`: Direct and one-hop counter type lookup
  - [ ] 7.5 Create `TypeForceGraph.tsx` (Canvas-based)
    - Force simulation: repulsion, link distance, center gravity, damping
    - Nodes: colored circles with type name labels, size by connectivity
    - Edges: red (2x), blue (0.5x), gray dashed (0x) with directional arrows
    - Interactions: hover highlight, click detail, drag, zoom, pan
  - [ ] 7.6 Create `TeamBuilder.tsx` (side panel)
    - 6 team slots with drag-and-drop or click-to-add
    - `PokemonSearch` for finding Pokemon to add
    - `CoverageBar` for attack and defense percentages
  - [ ] 7.7 Implement `analyzeTeam()` function
    - Compute attack coverage, defense coverage, weaknesses, immunities
    - Coverage and defense scores as percentages
  - [ ] 7.8 Create `TypeSuggestions.tsx`
    - `generateSuggestions()` using graph traversal
    - Prioritized cards: weakness (high), coverage gap (medium), redundancy (low)
    - Suggested types as colored badges with example Pokemon
  - [ ] 7.9 Create `GraphMetrics.tsx` panel
    - Display: nodes, edges, super effective count, resisted count, immunities
    - Average connectivity, hub type, most isolated, complexity score, layers, cycles
  - [ ] 7.10 Ensure Type Synergy Graph tests pass
    - Run only the 5 tests from 7.1

**Acceptance Criteria:**

- 18 type nodes render as a force-directed graph with official colors
- Edge colors and thickness correctly represent damage multipliers
- Team builder computes and displays coverage percentages
- Suggestion system generates actionable recommendations
- Graph metrics display values from HexDI graph analysis APIs

---

#### Task Group 8: Battle Simulator

**Dependencies:** Task Groups 2, 4, 7 (uses TypeEffectivenessPort for damage calc)
**Spec:** `06-battle-simulator.md` (Sections 1-10)

- [ ] 8.0 Complete Battle Simulator feature
  - [ ] 8.1 Write 8 focused tests for Battle Simulator
    - Test: Machine starts in `idle` state
    - Test: `START_BATTLE` transitions to `team_preview`
    - Test: Full turn cycle: `turn_start` -> `move_select` -> `priority_calc` -> move execution -> `faint_check` -> `turn_end`
    - Test: Gen V damage formula produces correct base damage for known inputs
    - Test: STAB applies 1.5x when move type matches attacker type
    - Test: Super effective (2x) applies for fire vs grass
    - Test: Random AI selects a move with PP > 0
    - Test: Smart AI prefers super-effective moves
  - [ ] 8.2 Implement damage calculation function
    - Gen V formula: `((2 * level / 5 + 2) * power * A / D) / 50 + 2`
    - STAB (1.5x), type effectiveness, critical hit (1/16, 1.5x)
    - Weather modifiers: sun/fire, rain/water
    - Status prevention: freeze blocks non-fire, paralysis 25% chance
    - Random factor (0.85-1.0)
    - Returns `Result<DamageResult, DamageCalcError>`
  - [ ] 8.3 Create `DamageCalcAdapter` (requires `TypeEffectivenessPort`)
    - Scoped lifetime, uses type service for effectiveness lookup
  - [ ] 8.4 Create AI strategy adapters
    - `RandomAiAdapter`: Random valid move (PP > 0)
    - `SmartAiAdapter`: Highest effectiveness _ power _ STAB score
    - Both scoped lifetime, swappable at runtime
  - [ ] 8.5 Define the battle Flow machine
    - 13 states: idle, team_preview, battle_start, turn_start, move_select, priority_calc, player_move_first, opponent_move_first, faint_check, switch_prompt, turn_end, battle_end
    - Guards: `canUseMove`, `isAlive`, `hasRemainingPokemon`, `isFasterThan`
    - Effects: `Effect.invoke(DamageCalcPort, ...)`, `Effect.invoke(AiStrategyPort, ...)`
    - Compound states for move ordering (player_move_first / opponent_move_first)
  - [ ] 8.6 Create `BattlePage.tsx`
    - `useMachine(BattleFlowPort)` for state/context/send
    - Team selection -> battle flow -> result display
  - [ ] 8.7 Create `BattleField.tsx`
    - Player and opponent sides with sprites, HP bars, status effects
    - Weather overlay visual indicator
  - [ ] 8.8 Create `HpBar.tsx` (animated)
    - Smooth transition (300ms) from current to new HP
    - Color: green (>50%), yellow (25-50%), red (<25%)
  - [ ] 8.9 Create `MoveSelector.tsx`
    - 4-move grid with type colors and PP display
    - Disabled when not in `move_select` state
    - Sends `SELECT_MOVE` event on click
  - [ ] 8.10 Create `StatusEffects.tsx` and `BattleLog.tsx`
    - Status icons: burn, freeze, paralysis, poison, sleep
    - Battle log: scrolling last 8 entries with auto-scroll
  - [ ] 8.11 Set up battle tracing bridge
    - Connect Flow transitions to trace spans via `createFlowTracingBridge`
    - Span attributes: move name, type, damage, effectiveness, critical
    - Instrument battle scope container for port resolution tracing
  - [ ] 8.12 Ensure Battle Simulator tests pass
    - Run only the 8 tests from 8.1

**Acceptance Criteria:**

- Full battle plays from start to end with winner determination
- Damage formula is accurate for known inputs (unit tested)
- AI adapters are swappable from the UI mid-battle
- HP bars animate smoothly with color transitions
- A 10-turn battle generates 50+ trace spans in Jaeger

---

#### Task Group 9: Trading Post

**Dependencies:** Task Groups 2, 3, 4
**Spec:** `07-trading-post.md` (Sections 1-9)

- [ ] 9.0 Complete Trading Post feature
  - [ ] 9.1 Write 6 focused tests for Trading Post
    - Test: Complete trade flow transitions through all 7 forward steps
    - Test: Failure at `lock_pokemon` triggers unlock + notify compensation
    - Test: Failure at `execute_swap` triggers return + unlock + notify compensation
    - Test: Chaos mode injects failures at configured probability
    - Test: Compensation completes in `trade_cancelled` final state
    - Test: Timeline entries update phase correctly for each saga event
  - [ ] 9.2 Create saga step port definitions
    - 7 forward step ports: `TradeSessionPort`, `PokemonSelectionPort`, `OwnershipVerificationPort`, `PokemonLockPort`, `PokemonSwapPort`, `TradeConfirmationPort`, `TradeCompletionPort`
    - 3 compensation ports: `PokemonUnlockPort`, `PokemonReturnPort`, `CancellationNotifierPort`
  - [ ] 9.3 Create saga step adapter implementations
    - Each forward step adapter calls the corresponding API endpoint
    - Each compensation adapter reverses the effect of its paired forward step
    - `ChaosConfigPort` with `maybeInjectChaos()` check in each step
  - [ ] 9.4 Define the trading saga
    - `TradeSagaPort` with `@hex-di/saga` API
    - 7 forward steps in sequence
    - Compensation chain: return -> unlock -> notify (backward from failure)
  - [ ] 9.5 Create `TradingPage.tsx`
    - Pokemon selection for offered and requested Pokemon
    - Execute trade via `TradeSagaPort`
    - `Result.match()` for success/error handling
  - [ ] 9.6 Create `TradeTimeline.tsx`
    - 7 forward step nodes in horizontal row with directional arrows
    - Compensation arrows flowing backward below the timeline
    - Node states: pending (gray), running (yellow pulse), completed (green), failed (red), compensating (blue pulse), compensated (blue)
  - [ ] 9.7 Create `ChaosControls.tsx`
    - Toggle for enabling/disabling chaos mode
    - Slider for failure probability (0%-100%, default 15%)
    - Display of which steps can fail
  - [ ] 9.8 Create `CompensationView.tsx`
    - Shows backward compensation chain in progress
    - Displays error tag and human-readable message
  - [ ] 9.9 Set up saga tracing
    - `createSagaTracingListener(tracer)` connecting saga events to trace spans
    - Root span `trade.saga`, child spans per step, compensation spans
    - Error spans with `error.code` and `compensation.triggered` attributes
  - [ ] 9.10 Ensure Trading Post tests pass
    - Run only the 6 tests from 9.1

**Acceptance Criteria:**

- Happy path trade completes through all 7 steps with green timeline
- Chaos mode causes random failures with visible compensation chain
- Compensation restores Pokemon to original owners
- Timeline animates step transitions in real-time
- Trade traces show forward, error, and compensation spans in Jaeger

---

#### Task Group 10: Research Notes

**Dependencies:** Task Groups 2, 4, 5 (uses Pokemon data)
**Spec:** `08-research-notes.md` (Sections 1-8)

- [ ] 10.0 Complete Research Notes feature
  - [ ] 10.1 Write 5 focused tests for Research Notes
    - Test: Team power computes sum of base stats for all team members
    - Test: Type coverage returns correct percentage
    - Test: Pokedex completion returns `favorites.size / 1025 * 100`
    - Test: Auto-save effect writes to localStorage within 500ms
    - Test: Hydration loads saved state from localStorage on startup
  - [ ] 10.2 Create store atom definitions
    - `TrainerProfileAtomPort` with default profile (name, avatar, region)
    - `TeamAtomPort` with empty array initial
    - `FavoritesAtomPort` with empty Set initial
    - `ResearchTagsAtomPort` with empty Map initial
  - [ ] 10.3 Create derived value definitions
    - `TeamPowerDerived`: Sum of all 6 base stats for all team members
    - `TypeCoverageDerived`: Unique types on team / 18 \* 100
    - `PokedexCompletionDerived`: favorites.size / 1025 \* 100
    - `TeamWeaknessesDerived`: Types where team has more weaknesses than resistances
  - [ ] 10.4 Create effects
    - `AutoSaveEffect`: Debounced (500ms) write of all atoms to localStorage
    - `SyncPreferencesEffect`: Apply region-specific theme on profile change
  - [ ] 10.5 Implement localStorage hydration
    - `ResearchHydrationAdapter`: Load, parse, validate version, hydrate atoms
    - `migrateResearchData()` for future schema migrations
  - [x] 10.6 Create `ResearchPage.tsx`
    - `usePort(PersistencePort)` for localStorage persistence
    - Three-column layout: Team, Favorites, Research Notes
    - Trainer profile header with editable name
    - State persisted via PersistencePort on every change
    - State restored from localStorage on mount with type guard validation
    - Also created `PokemonPicker.tsx` shared searchable dropdown component
    - Also created `ResearchNotes.tsx` for Pokemon tagging system
  - [x] 10.7 Create `TeamStats.tsx`
    - Team composition manager with up to 6 Pokemon
    - Power score display (sum of base stats)
    - Type coverage analysis using type-chart.json (super-effective types)
    - Type weakness analysis (types team takes super-effective damage from)
    - Add/remove Pokemon via PokemonPicker
  - [x] 10.8 Create `FavoritesList.tsx`
    - List of favorited Pokemon with search via PokemonPicker
    - Toggle favorite via heart icon
    - Sort by: id, name, type
    - Completion percentage (favorites / 151)
    - Progress bar visualization
  - [ ] 10.9 Create `CacheViewer.tsx`
    - Display query cache entries with names, staleness, hit count
    - Cache hit rate percentage
    - Active in-flight fetches indicator
  - [ ] 10.10 Ensure Research Notes tests pass
    - Run only the 5 tests from 10.1

**Acceptance Criteria:**

- Favorites persist across page refresh via localStorage
- Derived values update reactively when atoms change
- Team power, type coverage, and weaknesses compute correctly
- Cache viewer shows real query cache statistics
- Brain View shows the reactive dependency graph

---

### Feature Layer -- Tier 3 (Depends on core infra + inspection APIs)

#### Task Group 11: Porygon's Brain (Brain View Overlay)

**Dependencies:** Task Groups 2, 4, and at least one feature (5 or 8) to have live data
**Spec:** `09-porygons-brain.md` (Sections 1-9)

- [ ] 11.0 Complete Brain View overlay
  - [ ] 11.1 Write 6 focused tests for Brain View
    - Test: Overlay renders when `isOpen` is true, does not render when false
    - Test: Only the active panel is mounted (other 4 render null)
    - Test: Clicking a panel tab switches the active panel
    - Test: Neural Map renders canvas with graph metrics overlay
    - Test: Vital Signs metric cards display numeric values
    - Test: Close button sets `isOpen` to false
  - [ ] 11.2 Create `BrainOverlay.tsx`
    - Toggleable overlay at bottom 40% of viewport
    - Resizable via drag handle (min 200px, max 80%)
    - 5 tab buttons with Porygon-themed icons and metaphor names
    - Minimize and close buttons
    - Lazy mounting: only active panel is mounted
    - Single `InspectorAPI.subscribe()` call, events dispatched to panels via context
  - [ ] 11.3 Create Panel 1: `NeuralMap.tsx` (Live Dependency Graph)
    - Data: `useSnapshot()`, `useInspector()`, `inspectGraph()`
    - Canvas-based force-directed graph at 30fps
    - Nodes: gold (singleton), blue (scoped), green (transient)
    - Edges: directed dependency arrows
    - Hover: tooltip with port name, lifetime, origin
    - Click: sidebar detail panel with full port info, resolution count, avg time
    - Live animation: node pulse on resolution events, edge highlight on traversal
    - Graph metrics overlay: node count, edge count, max depth, complexity score
  - [ ] 11.4 Create Panel 2: `SynapseActivity.tsx` (Trace Waterfall)
    - Data: `useTracingSummary()`, circular span buffer (500 entries)
    - Waterfall rendering: horizontal bars, X=time, Y=nesting depth
    - Color by service: frontend (blue), backend (green), pokeapi (orange), error (red)
    - Collapsible tree nodes for parent-child span nesting
    - Click: detail panel with operation name, duration, attributes, events, Jaeger link
    - Filters: port name, status (All/OK/Error), min duration
    - Auto-scroll toggle, clear buffer button
  - [ ] 11.5 Create Panel 3: `MemoryBanks.tsx` (Scope Tree)
    - Data: `useScopeTree()`, `useInspector()` for scope events
    - Indented tree with connecting lines
    - Active: green dot, full opacity; Disposed: gray dot, 50% opacity, strikethrough
    - Animations: fade-in for new scopes (200ms), fade-out for disposed (500ms)
    - Click: detail panel with scope ID, name, service count, resolved ports
    - Debounced at 100ms for rapid scope operations
  - [ ] 11.6 Create Panel 4: `ThoughtProcess.tsx` (State Machine Inspector)
    - Data: `FlowInspector`, `FlowRegistry`, `computeFlowMetadata()`
    - Machine list: all active machines with current state and status badge
    - State diagram: connected rounded rectangles with current state glow
    - Transition edges with event name and `[guardName]` labels
    - Valid transitions table with guard status (Ready/Blocked)
    - Running activities list with status indicators
    - State history timeline with timestamps
  - [ ] 11.7 Create Panel 5: `VitalSigns.tsx` (Health Metrics)
    - Data: `useTracingSummary()`, `useSnapshot()`, `useScopeTree()`, `computePercentiles()`
    - 6 metric cards: Resolution Performance (p50/p95/p99), Cache Hit Rate, Error Rate, Active Scopes, Trace Export, Uptime
    - Sparkline SVGs: 120x30px, 60 samples, 1-second interval circular buffer
    - Color thresholds: green/yellow/red per metric
    - Uptime counter incrementing continuously
  - [ ] 11.8 Create shared utilities
    - Ring buffer class for span buffer (500 entries) and sparkline data (60 entries)
    - Force simulation utilities shared with Neural Map and Type Graph
    - Relative time formatting ("2s ago", "5m ago")
  - [ ] 11.9 Ensure Brain View tests pass
    - Run only the 6 tests from 11.1

**Acceptance Criteria:**

- Brain View opens/closes via `Ctrl+Shift+B` and header button
- All 5 panels render with live data from HexDI inspection hooks
- Neural Map shows dependency graph with lifetime coloring and pulse animations
- Synapse Activity shows trace spans as a waterfall with service color coding
- Memory Banks shows scope tree with real-time appear/disappear animations
- Thought Process shows active machines with state diagrams and guard status
- Vital Signs shows 6 metrics with sparkline charts updating every second
- Only the active panel is mounted; overlay has zero overhead when closed

---

### Static Data & Polish

#### Task Group 12: Static Data & Offline Assets

**Dependencies:** Task Group 1
**Spec:** `02-core-infrastructure.md` (Section 2.3 -- Offline adapter), `03-discovery-hub.md`

- [ ] 12.0 Complete static data and offline assets
  - [ ] 12.1 Create Gen 1 Pokemon data bundle
    - `frontend/src/data/gen1-pokemon.json`: 151 Pokemon with id, name, types, sprites, stats
    - Sourced from PokeAPI, pre-formatted to match `Pokemon` type
  - [ ] 12.2 Create offline filter options
    - Pre-bundled type, habitat, color, shape options for offline mode
  - [ ] 12.3 Create type effectiveness data bundle
    - Static 18x18 type chart JSON for offline type analysis
    - Damage multiplier matrix

**Acceptance Criteria:**

- Offline adapter serves 151 Pokemon from bundled data
- Type chart data is available for offline type analysis
- Filter options are available without API calls

---

### Testing & Integration

#### Task Group 13: Test Review & Gap Analysis

**Dependencies:** Task Groups 1-11
**Spec:** `11-testing.md` (Sections 1-9)

- [ ] 13.0 Review existing tests and fill critical gaps
  - [ ] 13.1 Review all tests written by previous task groups
    - Review infrastructure tests from 2.1 (6 tests)
    - Review API tests from 3.1 (6 tests)
    - Review app shell tests from 4.1 (4 tests)
    - Review Discovery Hub tests from 5.1 (6 tests)
    - Review Evolution Lab tests from 6.1 (6 tests)
    - Review Type Graph tests from 7.1 (5 tests)
    - Review Battle Simulator tests from 8.1 (8 tests)
    - Review Trading Post tests from 9.1 (6 tests)
    - Review Research Notes tests from 10.1 (5 tests)
    - Review Brain View tests from 11.1 (6 tests)
    - Total existing: ~62 tests
  - [ ] 13.2 Analyze test coverage gaps for PokeNerve feature requirements
    - Identify critical user workflows lacking coverage
    - Focus on integration points between features
    - Prioritize end-to-end workflows over unit test gaps
  - [ ] 13.3 Write up to 10 additional strategic tests
    - Test: Cross-service trace propagation (frontend -> backend -> PokeAPI)
    - Test: Battle machine full 3-turn scenario with state sequence verification
    - Test: Trading saga compensation chain reverses ownership correctly
    - Test: Adapter switching updates `inspectGraph()` graph data
    - Test: Battle trace contains `battle.damage.calc` spans with correct attributes
    - Test: Evolution machine Eevee branching selects correct branch per guard
    - Test: Team analysis produces correct suggestions for weak team compositions
    - Test: Brain View NeuralMap renders node count matching adapter count
    - Test: Store derived values batch-recompute on atom updates
    - Test: API middleware creates and disposes per-request scopes
  - [ ] 13.4 Run all feature-specific tests
    - Run only tests related to PokeNerve (tests from 2.1 through 11.1 + 13.3)
    - Expected total: ~72 tests
    - Do NOT run the entire HexDI monorepo test suite

**Acceptance Criteria:**

- All ~72 feature-specific tests pass
- Critical user workflows for all 7 features are covered
- Cross-service tracing is verified
- No more than 10 additional tests were added
- Testing focused exclusively on PokeNerve feature requirements

---

#### Task Group 14: Integration, Polish & Demo Readiness

**Dependencies:** Task Groups 1-13
**Spec:** `12-definition-of-done.md` (Sections 1-5)

- [ ] 14.0 Complete integration and demo readiness
  - [x] 14.1 Verify Docker Compose stack
    - `docker compose up` starts all 3 services
    - Frontend accessible at `http://localhost:5173`
    - API accessible at `http://localhost:3001`
    - Jaeger UI accessible at `http://localhost:16686`
    - Cross-service traces appear in Jaeger
  - [x] 14.2 Verify HexDI package coverage matrix
    - Every package (`core`, `graph`, `runtime`, `result`, `tracing`, `tracing-jaeger`, `flow`, `flow-react`, `store`, `saga`, `react`, `hono`) used in at least 2 features
    - Verify with import analysis
  - [ ] 14.3 Verify cross-service tracing end-to-end
    - Browser click produces distributed trace: frontend -> backend -> PokeAPI
    - `traceparent` header propagates correctly
    - Same `traceId` across all services in Jaeger
  - [ ] 14.4 Verify Brain View live data
    - Neural Map: 10+ nodes, edges connecting them
    - Synapse Activity: spans appear during user interaction
    - Memory Banks: scopes appear/disappear on navigation
    - Thought Process: battle/evolution machines visible
    - Vital Signs: p50/p95/p99 display, sparklines update
  - [ ] 14.5 Verify battle trace depth
    - A 10-turn battle generates 50+ spans
    - Jaeger flame graph shows `battle > turn > move > damage` nesting
  - [ ] 14.6 Verify trading saga compensation
    - Chaos mode causes random failures
    - Compensation chain executes visually backward
    - Pokemon restored to original owners
    - Jaeger trace shows forward + error + compensation spans
  - [ ] 14.7 Verify adapter swapping
    - Switch from REST to Cached to Offline in Discovery Hub
    - Neural Map shows graph edge change animation
    - Data refreshes with new adapter
  - [ ] 14.8 Performance check
    - App loads in under 3 seconds (Lighthouse TTI)
    - Brain View open/close < 50ms
    - Graph visualization >= 30fps
  - [x] 14.9 Verify TypeScript strict mode compliance
    - `pnpm --filter @pokenerve/frontend typecheck` passes with 0 errors
    - `pnpm --filter @pokenerve/api typecheck` passes with 0 errors
    - No `any` types, no type casts, no `eslint-disable`, no non-null assertions
  - [x] 14.10 Add JSDoc documentation to key files
    - All port files: JSDoc explaining the domain concept
    - All adapter files: JSDoc explaining the implementation strategy
    - Machine definitions: ASCII state diagrams in comments
    - Saga definition: forward/compensation flow diagram in comments

**Acceptance Criteria:**

- `docker compose up` brings up the full stack without manual intervention
- Every HexDI package is exercised in at least 2 features
- Cross-service traces are visible in Jaeger
- Brain View displays all 5 panels with live data
- 10-turn battle generates 50+ trace spans
- Trading saga demonstrates compensation on injected failure
- Adapter swapping reconfigures the dependency graph visually
- TypeScript strict mode passes with zero errors
- Source code is readable and serves as a reference

---

## Execution Order

Recommended implementation sequence:

```
Phase 1: Foundation (parallel)
  |-- Task Group 1: Project Scaffolding & Shared Types
  |-- Task Group 12: Static Data & Offline Assets

Phase 2: Infrastructure (parallel after Phase 1)
  |-- Task Group 2: Core DI Infrastructure & Tracing
  |-- Task Group 3: Backend API Server

Phase 3: App Shell (after Phase 2)
  |-- Task Group 4: App Shell, Routing & Navigation

Phase 4: Tier 1 Features (parallel after Phase 3)
  |-- Task Group 5: Pokemon Discovery Hub
  |-- Task Group 6: Evolution Lab

Phase 5: Tier 2 Features (parallel after Phase 4)
  |-- Task Group 7: Type Synergy Graph
  |-- Task Group 8: Battle Simulator
  |-- Task Group 9: Trading Post
  |-- Task Group 10: Research Notes

Phase 6: Brain View (after Phase 5, needs live data from features)
  |-- Task Group 11: Porygon's Brain

Phase 7: Testing & Integration (after Phase 6)
  |-- Task Group 13: Test Review & Gap Analysis
  |-- Task Group 14: Integration, Polish & Demo Readiness
```

### Dependency Graph

```
TG1 ──┬──> TG2 ──┬──> TG4 ──┬──> TG5 ──┬──> TG7 ──┐
      |          |          |          |          |
TG12 ─┘   TG3 ──┘          ├──> TG6   ├──> TG8  ├──> TG11 ──> TG13 ──> TG14
                            |          |          |
                            ├──> TG9   ├──> TG10 ─┘
                            |          |
                            └──────────┘
```

---

## Notes

- **Task Groups 1 and 12** can be done in parallel since static data has no code dependencies.
- **Task Groups 2 and 3** can be done in parallel since frontend infrastructure and backend API are independent.
- **Task Groups 5 and 6** can be done in parallel since Discovery Hub and Evolution Lab have no mutual dependencies.
- **Task Groups 7, 8, 9, and 10** can largely be done in parallel, though 7 and 8 share the `TypeEffectivenessPort`.
- **Task Group 11** (Brain View) should be done after at least 2-3 features are complete so there is live data to display.
- **Task Group 14** is the final integration check against the Definition of Done (`12-definition-of-done.md`).
