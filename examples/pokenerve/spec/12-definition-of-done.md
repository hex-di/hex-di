# PokeNerve -- Definition of Done

This document defines the criteria that must be satisfied for PokeNerve to be considered complete. It covers overall success criteria, per-feature checklists, technical quality gates, infrastructure verification, and a step-by-step demo script.

---

## 1. Overall Success Criteria

These eight criteria are derived from the PRODUCT.md success criteria, expanded with specific technical verification steps.

### 1.1 Every HexDI Package Exercised in at Least 2 Features

| Package                  | Feature 1                      | Feature 2                   | Feature 3+                | Verification                                                                   |
| ------------------------ | ------------------------------ | --------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `@hex-di/core`           | Discovery (ports, adapters)    | Battle (ports, error types) | All 7 features            | `grep -r "@hex-di/core" frontend/src/` shows imports in 7+ directories         |
| `@hex-di/graph`          | Discovery (graph build)        | Type Graph (graph analysis) | Brain (graph inspection)  | `inspectGraph()` called in Type Graph and Brain View                           |
| `@hex-di/runtime`        | Discovery (container, scope)   | Battle (battle scope)       | All 7 features            | `createContainer()` in `main.tsx`, `createScope()` in battle/trading providers |
| `@hex-di/result`         | Discovery (API errors)         | Battle (damage calc)        | Trading (saga steps)      | All API calls return `ResultAsync<T, E>`                                       |
| `@hex-di/tracing`        | Discovery (API spans)          | Battle (move spans)         | Brain (trace waterfall)   | `instrumentContainer()` in `main.tsx`, `MemoryTracer` in Brain View            |
| `@hex-di/tracing-jaeger` | Discovery (OTLP export)        | Battle (flame graph)        | Brain (Jaeger links)      | Jaeger exporter configured in `tracing-graph.ts`                               |
| `@hex-di/flow`           | Evolution (chain machines)     | Battle (turn machine)       | Brain (machine inspector) | `defineMachine()` in `machines/evolution.ts` and `machines/battle.ts`          |
| `@hex-di/flow-react`     | Evolution (useMachine)         | Battle (useMachine)         |                           | `useMachine()` in `EvolutionLabPage.tsx` and `BattlePage.tsx`                  |
| `@hex-di/store`          | Battle (battle state)          | Research (trainer profile)  | Brain (store inspector)   | Store atoms in `store/` directory                                              |
| `@hex-di/saga`           | Trading (trade saga)           | Brain (saga inspector)      |                           | Saga definition in `sagas/trading-saga.ts`                                     |
| `@hex-di/react`          | Discovery (usePort, providers) | All UI features             |                           | `createTypedHooks()` in `providers/container-provider.tsx`                     |
| `@hex-di/hono`           | Discovery (API routes)         | Battle (API routes)         | Trading (API routes)      | Hono middleware in `api/src/middleware/`                                       |

### 1.2 Cross-Service Traces Visible in Jaeger

**Trace structure to verify:**

```
Trace: "GET /api/pokemon?offset=0&limit=20"
+-- frontend: fetch /api/pokemon                    [200ms]
    +-- backend: handle GET /api/pokemon             [150ms]
        +-- backend: resolve:PokemonCachePort        [2ms]
        +-- backend: proxy PokeAPI /pokemon          [120ms]
            +-- external: GET pokeapi.co/api/v2/pokemon [110ms]
```

**Verification steps:**

1. Open `http://localhost:16686` (Jaeger UI)
2. Select service "pokenerve-frontend" from dropdown
3. Search for traces in the last 15 minutes
4. Click any trace -- verify it spans frontend -> backend -> PokeAPI
5. Verify the `traceparent` header is present in backend span attributes
6. Verify the trace ID is consistent across all three services

### 1.3 Brain View Displays All 5 Panels with Live Data

| Panel            | Data Source                                                    | Verification                                                           |
| ---------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Neural Map       | `InspectorAPI.getGraphData()` -> `ContainerGraphData.adapters` | At least 10 nodes visible, edges connecting them                       |
| Synapse Activity | `useTracingSummary()` -> `TracingSummary` + span buffer        | Spans appear as user interacts with the app                            |
| Memory Banks     | `useScopeTree()` -> `ScopeTree`                                | Root container visible, battle/trading scopes appear on navigation     |
| Thought Process  | `FlowRegistry.getAllPortNames()` -> machine list               | Battle machine visible during battle, evolution machine visible in lab |
| Vital Signs      | `computePercentiles()`, `getAllResultStatistics()`             | p50/p95/p99 display numeric values, sparklines update every second     |

### 1.4 Adapter Swapping Reconfigures the Graph

**Step-by-step verification:**

1. Open Brain View, select Neural Map panel
2. Note the edge from `PokemonListPort` to `RestPokemonAdapter`
3. Use the adapter switcher dropdown to select "Cached"
4. Observe the graph: the edge now points to `CachedPokemonAdapter`
5. Verify the `InspectorAPI` emits a `"snapshot-changed"` event
6. Verify the `ContainerGraphData.adapters` array reflects the new adapter
7. Verify the Pokemon list data refreshes using the new adapter
8. Switch to "Offline" adapter, verify graph updates again

### 1.5 Battle Generates 50+ Trace Spans

**Span naming convention:**

| Operation          | Span Name Pattern                         | Attributes                                                           |
| ------------------ | ----------------------------------------- | -------------------------------------------------------------------- |
| Turn start         | `flow:battle/idle->turn_start`            | `flow.machine_id`, `flow.from_state`, `flow.to_state`                |
| Move selection     | `flow:battle/turn_start->move_select`     | `flow.event_type: SELECT_MOVE`                                       |
| Move execution     | `flow:battle/move_select->move_execute`   | `move.name`, `move.type`                                             |
| Damage calculation | `flow:effect:invoke:DamageCalc.calculate` | `damage.base`, `damage.stab`, `damage.effectiveness`, `damage.final` |
| Status effect      | `flow:effect:invoke:StatusEffect.apply`   | `status.type`, `status.target`                                       |
| Faint check        | `flow:battle/move_execute->faint_check`   | `pokemon.hp_remaining`                                               |
| Switch prompt      | `flow:battle/faint_check->switch_prompt`  | `pokemon.switched_to`                                                |
| Turn end           | `flow:battle/faint_check->turn_end`       | `battle.turn_number`                                                 |
| Battle end         | `flow:battle/turn_end->battle_end`        | `battle.winner`, `battle.total_turns`                                |

**Expected span hierarchy for one turn:**

```
battle_turn (parent)
+-- transition: turn_start -> move_select
+-- transition: move_select -> move_execute
|   +-- effect:invoke: DamageCalc.calculate
|   +-- effect:invoke: StatusEffect.apply (if applicable)
+-- transition: move_execute -> faint_check
+-- transition: faint_check -> turn_end
```

A 10-turn battle produces approximately 50-100 spans. Verification: open Jaeger, find the battle trace, verify the span count in the trace summary exceeds 50.

### 1.6 Trading Saga Demonstrates Compensation

**Failure injection and verification:**

1. Navigate to Trading Post
2. Enable "Chaos Mode" toggle
3. Set failure probability to 100% at step "lock_pokemon"
4. Initiate a trade
5. Observe forward steps complete: initiate -> select -> verify -> lock (FAILS)
6. Observe compensation chain: unlock -> notify_cancel
7. Verify the TradeTimeline visualization shows:
   - Steps 1-3 in green (completed)
   - Step 4 in red (failed)
   - Compensation steps flowing backward in blue
8. Open Jaeger, find the trade trace
9. Verify the trace shows forward spans, error span at `lock_pokemon`, and compensation spans
10. Verify the user's Pokemon is returned to their inventory

### 1.7 App Loads in Under 3 Seconds

**Performance budget breakdown:**

| Phase                          | Budget     | Measurement                                    |
| ------------------------------ | ---------- | ---------------------------------------------- |
| HTML + CSS load                | 200ms      | Lighthouse FCP                                 |
| JavaScript parse + execute     | 800ms      | Lighthouse TBT                                 |
| React hydration + first render | 500ms      | React profiler mount time                      |
| Initial API data fetch         | 1000ms     | Network waterfall (PokeAPI response)           |
| Container initialization       | 200ms      | `console.time('container-init')` in `main.tsx` |
| Tracing setup                  | 100ms      | `console.time('tracing-setup')`                |
| **Total budget**               | **2800ms** | Lighthouse Time to Interactive                 |
| **Buffer**                     | **200ms**  |                                                |

**Measurement approach:**

- Lighthouse audit in Chrome DevTools (mobile simulation, throttled 4G)
- First Contentful Paint < 2 seconds
- Time to Interactive < 3 seconds

### 1.8 Source Code is Readable Reference

- All port files include JSDoc comments explaining the domain concept
- All adapter files include JSDoc explaining the implementation strategy
- All machine definitions include ASCII state diagrams in comments
- All saga definitions include forward/compensation flow diagrams in comments
- File organization follows the structure defined in PRODUCT.md
- No deeply nested code (max 3 levels of nesting)
- Functions are small (< 50 lines) and single-purpose

---

## 2. Per-Feature Done Checklist

### 2.1 Feature 1: Pokemon Discovery Hub

- [ ] Pokemon list renders from PokeAPI data via backend proxy
- [ ] Pagination works (load more / infinite scroll)
- [ ] Type filter narrows the Pokemon list
- [ ] Habitat, color, and shape filters work
- [ ] Adapter switcher dropdown is visible and functional
- [ ] Switching adapter refreshes the data using the new source
- [ ] Brain View Neural Map shows graph edge change on adapter switch
- [ ] Loading state shows skeleton placeholders
- [ ] Error state shows retry button on network failure
- [ ] All API calls return `ResultAsync<T, PokemonApiError>` (no thrown exceptions)
- [ ] Every API call produces a trace span visible in Jaeger
- [ ] Pokemon detail modal shows stats, abilities, and moves

### 2.2 Feature 2: Evolution Lab

- [ ] Evolution chain renders as an interactive state machine diagram
- [ ] Guard conditions are displayed as interactive toggles/inputs
- [ ] Satisfying all guards enables the "Evolve" button
- [ ] Clicking "Evolve" triggers a state transition with animation
- [ ] Eevee branching shows all 8+ evolution paths
- [ ] Eevee evolution selects the correct branch based on satisfied guards
- [ ] Brain View Thought Process panel shows the evolution machine's current state
- [ ] Each state transition produces a trace span
- [ ] Blocked evolution shows which guards are not satisfied

### 2.3 Feature 3: Type Synergy Graph

- [ ] All 18 types render as nodes in a force-directed graph
- [ ] Damage relation edges connect types (super effective, not very effective, immune)
- [ ] Team builder allows dragging 6 Pokemon onto a team
- [ ] Type coverage visualization shows which types the team covers
- [ ] Graph analysis produces suggestions ("Your team is weak to Ground")
- [ ] Graph metrics (node count, edge count, complexity) display in Brain View
- [ ] Graph is interactive (click, drag, zoom)

### 2.4 Feature 4: Battle Simulator

- [ ] Full battle is playable from start to end (team preview -> battle -> result)
- [ ] Damage calculation is correct for known inputs (verified against unit tests)
- [ ] AI opponent selects moves (random or smart strategy, selectable)
- [ ] HP bars update reactively on damage
- [ ] Status effects (paralysis, burn, etc.) display and apply correctly
- [ ] Weather effects (sun, rain, sandstorm, hail) modify damage correctly
- [ ] Fainting triggers switch prompt or battle end
- [ ] Battle state updates are reactive (store subscriptions, not polling)
- [ ] Complete battle trace is visible in Jaeger as a flame graph
- [ ] Battle trace contains 50+ spans for a 10-turn battle
- [ ] Parallel state regions (weather, field effects) run concurrently

### 2.5 Feature 5: Trading Post

- [ ] Trade initiation creates a new trade offer
- [ ] Pokemon selection step shows available Pokemon
- [ ] All 7 forward saga steps execute in sequence on success
- [ ] Trade completion transfers Pokemon between trainers
- [ ] Timeline visualization shows completed, current, and pending steps
- [ ] Chaos mode toggle is accessible in the UI
- [ ] Enabling chaos mode causes random step failures
- [ ] Failed step triggers compensation chain flowing backward
- [ ] Compensation arrows are visible in the timeline visualization
- [ ] Compensation restores Pokemon to original owners
- [ ] Failed trade trace in Jaeger shows forward spans + error span + compensation spans
- [ ] User notification explains what happened on failure

### 2.6 Feature 6: Research Notes

- [ ] Favoriting a Pokemon adds it to the favorites list
- [ ] Favorites list updates reactively (store atom subscription)
- [ ] Team power (sum of base stats) computes and displays automatically
- [ ] Type coverage percentage updates when team composition changes
- [ ] Pokedex completion percentage updates when favorites change
- [ ] Data persists to `localStorage` across page refreshes
- [ ] Cache viewer shows query cache statistics (hit rate, stale entries)
- [ ] Brain View shows the store's reactive dependency graph

### 2.7 Feature 7: Porygon's Brain

- [ ] `Ctrl+Shift+B` toggles Brain View overlay
- [ ] Header button toggles Brain View overlay
- [ ] Overlay renders at bottom 40% of viewport
- [ ] Overlay is resizable via drag handle
- [ ] Panel selection persists across navigation
- [ ] **Neural Map:** Graph renders all ports as nodes with lifetime coloring
- [ ] **Neural Map:** Edges show dependency relationships
- [ ] **Neural Map:** Nodes pulse on resolution events
- [ ] **Neural Map:** Click node opens detail sidebar
- [ ] **Neural Map:** Graph metrics overlay displays correct values
- [ ] **Synapse Activity:** Trace spans appear as waterfall bars
- [ ] **Synapse Activity:** Color coding by service (frontend/backend/pokeapi)
- [ ] **Synapse Activity:** Error spans render in red
- [ ] **Synapse Activity:** Click span shows detail with "Open in Jaeger" link
- [ ] **Synapse Activity:** Filters (port name, status, min duration) work
- [ ] **Memory Banks:** Scope tree renders with indentation
- [ ] **Memory Banks:** Active scopes have green indicator, disposed have gray
- [ ] **Memory Banks:** Scopes appear/disappear on navigation
- [ ] **Memory Banks:** Click scope shows detail panel
- [ ] **Thought Process:** Active machines are listed
- [ ] **Thought Process:** State diagram renders for selected machine
- [ ] **Thought Process:** Current state has glow highlight
- [ ] **Thought Process:** Valid transitions listed with guard status
- [ ] **Thought Process:** State history timeline shows past transitions
- [ ] **Vital Signs:** p50, p95, p99 resolution latencies display
- [ ] **Vital Signs:** Cache hit rate displays as percentage
- [ ] **Vital Signs:** Error rate displays correctly
- [ ] **Vital Signs:** Sparkline charts update every second
- [ ] **Vital Signs:** Color thresholds (green/yellow/red) work correctly

---

## 3. Technical Quality Gates

### 3.1 TypeScript Strict Mode

- [ ] `frontend/tsconfig.json` has `"strict": true`
- [ ] `api/tsconfig.json` has `"strict": true`
- [ ] `pnpm --filter pokenerve-frontend typecheck` passes with 0 errors
- [ ] `pnpm --filter pokenerve-api typecheck` passes with 0 errors
- [ ] No `any` types in source code (per CLAUDE.md rules)
- [ ] No type casts (`as X`) in source code (per CLAUDE.md rules)
- [ ] No `eslint-disable` comments in source code (per CLAUDE.md rules)
- [ ] No non-null assertions (`!`) in source code (per CLAUDE.md rules)

### 3.2 Test Coverage

| Category                                                 | Threshold   | Measurement         |
| -------------------------------------------------------- | ----------- | ------------------- |
| Pure logic (damage calc, type effectiveness, guards, AI) | > 80% lines | `vitest --coverage` |
| React components                                         | > 60% lines | `vitest --coverage` |
| Overall frontend                                         | > 60% lines | `vitest --coverage` |
| API routes and middleware                                | > 70% lines | `vitest --coverage` |

### 3.3 Performance

| Metric                         | Threshold   | Measurement                       |
| ------------------------------ | ----------- | --------------------------------- |
| First Contentful Paint         | < 2 seconds | Lighthouse (mobile, throttled 4G) |
| Time to Interactive            | < 3 seconds | Lighthouse                        |
| Total Blocking Time            | < 300ms     | Lighthouse                        |
| Brain View open/close          | < 50ms      | Performance.now() measurement     |
| Graph visualization frame rate | >= 30fps    | requestAnimationFrame counter     |

### 3.4 Accessibility

- [ ] All interactive elements are keyboard-navigable (tab order)
- [ ] All buttons have accessible labels (`aria-label` or visible text)
- [ ] Brain View can be toggled via keyboard shortcut
- [ ] Color is not the only indicator of state (icons/text accompany colors)
- [ ] Focusable elements have visible focus indicators

### 3.5 Bundle Size

| Chunk                     | Budget              |
| ------------------------- | ------------------- |
| Main bundle (app + React) | < 200KB gzipped     |
| Brain View (lazy-loaded)  | < 150KB gzipped     |
| Vendor (HexDI + deps)     | < 150KB gzipped     |
| **Total**                 | **< 500KB gzipped** |

Brain View components are code-split via `React.lazy()` so they do not impact the initial bundle size for users who never open Brain View.

---

## 4. Infrastructure Done Checklist

- [ ] `docker-compose.yml` defines three services: `jaeger`, `api`, `frontend`
- [ ] `docker-compose up` starts all services without manual intervention
- [ ] Jaeger UI accessible at `http://localhost:16686`
- [ ] Frontend accessible at `http://localhost:3000`
- [ ] API accessible at `http://localhost:3001`
- [ ] Frontend proxies API calls to `http://localhost:3001/api/*`
- [ ] Jaeger receives traces from both frontend (OTLP HTTP) and backend (OTLP HTTP)
- [ ] Cross-service traces appear in Jaeger (same traceId across services)
- [ ] API diagnostic routes return valid data:
  - `GET /api/diagnostics/graph` returns serialized graph inspection JSON
  - `GET /api/diagnostics/snapshot` returns container snapshot JSON
  - `GET /api/diagnostics/scope-tree` returns scope tree JSON
  - `GET /api/diagnostics/health` returns health check response
- [ ] CORS middleware allows `traceparent` header from frontend
- [ ] Per-request scope middleware creates and disposes scopes per API call
- [ ] Hot reload works for both frontend (Vite HMR) and API (file watcher)

---

## 5. Demo Script

A step-by-step walkthrough for presenting PokeNerve at conferences, meetups, or video recordings. Each step demonstrates a specific HexDI capability. Total duration: approximately 8-10 minutes.

### Step 1: Open the App, Browse Pokemon (60 seconds)

**Show:** Discovery Hub, Result types, query caching

1. Navigate to `http://localhost:3000`
2. Point out the clean UI -- "This is a real Pokedex application, not a technical demo"
3. Scroll through the Pokemon list
4. Apply a type filter (e.g., "Fire")
5. Point out: "Every API call is wrapped in `ResultAsync<PokemonData, ApiError>` -- no exceptions, only typed errors"

### Step 2: Toggle Brain View (60 seconds)

**Show:** Self-aware application concept, Neural Map (dependency graph)

1. Press `Ctrl+Shift+B` or click the Porygon icon
2. Brain View slides up from the bottom
3. Point out: "This is the same application -- but now it's showing you its own internals"
4. Navigate to the Neural Map tab
5. Point out the graph: "Every node is a port. Every edge is a dependency. Gold nodes are singletons, blue are scoped, green are transient"
6. Click a node to show its detail: port name, lifetime, adapter, resolution history
7. Point out: "This data comes from `InspectorAPI.getGraphData()` -- not from parsing source code. The application knows its own architecture"

### Step 3: Switch Adapter (60 seconds)

**Show:** Hexagonal architecture, live graph reconfiguration

1. Use the adapter switcher dropdown to select "Cached"
2. Point out the Neural Map: "Watch the graph -- the edge from PokemonList just changed from RestAdapter to CachedAdapter"
3. Switch to "Offline"
4. Point out: "The consumer components didn't change. Only the adapter binding changed. This is hexagonal architecture's core promise, made visible"
5. Switch back to "REST"

### Step 4: Evolution Lab -- Evolve Eevee (90 seconds)

**Show:** Flow state machines, guards, state transitions

1. Navigate to Evolution Lab
2. Select Eevee
3. Point out the state diagram: "Every evolution chain is a Flow state machine. Eevee has 8+ branches"
4. Toggle the "Hold Fire Stone" guard condition
5. Click "Evolve" -- watch the transition animation to Flareon
6. Switch to Brain View Thought Process tab
7. Point out: "The state machine inspector shows the current state, valid transitions, and guard conditions. This is the Flow library's introspection API in action"

### Step 5: Type Graph -- Build a Team (60 seconds)

**Show:** Graph analysis, team builder, suggestions

1. Navigate to Type Synergy Graph
2. Point out the force-directed graph of 18 types
3. Drag 3-4 Pokemon onto the team builder
4. Point out the type coverage visualization: "Graph analysis tells us our team can hit 12 of 18 types super-effectively"
5. Point out the suggestion: "The graph package recommends adding a Ground type to cover our Electric weakness"

### Step 6: Start a Battle (90 seconds)

**Show:** Complex Flow machine, tracing, store reactivity

1. Navigate to Battle Simulator
2. Select a team and start a battle
3. Execute 2-3 turns, pointing out: "Each move is a state transition in the battle machine. Damage is calculated with type effectiveness, STAB, weather, and critical hits"
4. Point out the HP bars updating reactively
5. Switch to Brain View Synapse Activity tab
6. Point out: "Every move, every damage calculation, every status effect is a trace span. Watch them fill up in real-time"

### Step 7: Open Jaeger (60 seconds)

**Show:** Distributed tracing, Jaeger flame graph

1. Click "Open in Jaeger" from Synapse Activity
2. Or navigate to `http://localhost:16686`
3. Find the battle trace
4. Point out the flame graph: "Here's the entire battle as a distributed trace. Each turn is a parent span. Each move is a child. Each damage calculation is a grandchild"
5. Point out the span count: "This 5-turn battle generated 60+ spans"
6. Click a damage calculation span, show the attributes: `move.name`, `damage.effectiveness`, `damage.final`

### Step 8: Trading Post -- Chaos Mode (90 seconds)

**Show:** Saga pattern, compensation, failure handling

1. Navigate to Trading Post
2. Enable "Chaos Mode"
3. Initiate a trade
4. Wait for a step to fail
5. Point out the timeline: "Green steps completed. Red step failed. Now watch -- the compensation chain flows backward automatically"
6. Point out the blue compensation steps completing
7. "The user's Pokemon is returned. No data corruption. That's the saga pattern with automatic compensation"
8. Switch to Brain View Synapse Activity, point out the trace showing forward + error + compensation spans
9. Open Jaeger, show the same trace with forward and compensation spans

### Step 9: Show All 5 Brain View Panels (60 seconds)

**Show:** Complete self-aware application vision

1. Open Brain View
2. Quickly flip through all 5 panels:
   - Neural Map: "The dependency graph -- what the app is made of"
   - Synapse Activity: "The trace waterfall -- what the app is doing"
   - Memory Banks: "The scope tree -- the app's memory"
   - Thought Process: "The state machines -- the app's thought processes"
   - Vital Signs: "The health metrics -- the app's vital signs"
3. Close with: "This application knows itself. Not because we instrumented it from the outside. Because self-knowledge is built into HexDI's architecture. The DI container is the nervous system. Every library reports what it knows. This is what a self-aware application looks like."

---

_End of Definition of Done specification._
