# PokeNerve -- Testing Strategy

Comprehensive testing strategy for the PokeNerve showcase application. Covers unit tests for pure logic, integration tests for DI graph composition, component tests for React UI, Flow machine tests using HexDI testing utilities, and trace assertion tests for verifying distributed tracing correctness.

---

## 1. Testing Philosophy

PokeNerve is a showcase application. Its tests serve two purposes: ensuring the app works correctly, and demonstrating how to test HexDI-powered applications. Every test file doubles as a usage example for the HexDI testing patterns it exercises.

**What we test and why:**

| Test Category         | What It Validates                                                     | HexDI Patterns Demonstrated                                                                       |
| --------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Unit tests            | Pure domain logic (damage calc, type effectiveness, guard conditions) | None -- pure functions, no DI                                                                     |
| Integration tests     | DI graph composition, container resolution, scope lifecycle           | `GraphBuilder.build()`, `createContainer()`, `container.createScope()`, `inspectGraph()`          |
| Component tests       | React components render correctly with mocked DI services             | `createTypedHooks()`, `HexDiContainerProvider`, `usePort()`, mock adapters                        |
| Flow machine tests    | State transitions, guard evaluation, effect execution                 | `testMachine()`, `testGuard()`, `testTransition()`, `testEffect()` from `@hex-di/flow-testing`    |
| Trace assertion tests | Correct span hierarchy, attributes, and cross-service correlation     | `MemoryTracer`, `assertSpanExists()`, `hasAttribute()`, `buildTraceTree()` from `@hex-di/tracing` |
| Type tests            | Port/adapter type safety, Result type narrowing                       | `*.test-d.ts` files with `expectTypeOf()` from vitest                                             |

---

## 2. Test Infrastructure

### 2.1 Test Runner

Vitest is the test runner for all test categories. Configuration at `frontend/vitest.config.ts` and `api/vitest.config.ts`.

### 2.2 Component Testing

`@testing-library/react` for React component tests. Components are wrapped in `HexDiContainerProvider` with a test container built from mock adapters.

### 2.3 HexDI Testing Utilities

**From `@hex-di/flow-testing`:**

- `testMachine(machine, options)` -- creates a test runner with mocked dependencies and synchronous test controls (`snapshot()`, `send()`, `waitForState()`, `waitForEvent()`)
- `testGuard(guardFn, { context, event })` -- evaluates a guard in isolation, returns boolean
- `testTransition(machine, state, event)` -- computes transition result without executing effects, returns `Result<{ target, effects, context }, TransitionError>`
- `testEffect(effect, { mocks })` -- executes a single effect descriptor against mocked dependencies

**From `@hex-di/tracing`:**

- `MemoryTracer` / `createMemoryTracer()` -- in-memory tracer that captures spans for assertions
- `assertSpanExists(spans, matcher)` -- asserts that a span matching the criteria exists
- `hasAttribute(key, value)` -- span matcher for attribute checks
- `hasEvent(name)` -- span matcher for event checks
- `hasStatus(status)` -- span matcher for status checks
- `buildTraceTree(traceId)` -- builds hierarchical tree from flat span list
- `computePercentiles(durations, [50, 95, 99])` -- computes latency percentiles

**From `@hex-di/graph/advanced`:**

- `inspectGraph(graph)` -- full graph inspection with metrics
- `buildDependencyMap(graph)` -- adjacency map for traversal
- `topologicalSort(graph)` -- initialization order

**Mock adapter pattern:**

```typescript
import { createAdapter, SINGLETON } from "@hex-di/core";

const mockPokemonListAdapter = createAdapter({
  provides: PokemonListPort,
  requires: [],
  lifetime: SINGLETON,
  factory: () => ({
    getList: vi.fn().mockReturnValue(okAsync({ results: mockPokemon, count: 3, next: null })),
  }),
});
```

### 2.4 Test Container Builder

A shared utility for building test containers with mock adapters:

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

function createTestContainer(...adapters: readonly AdapterConstraint[]) {
  const graph = GraphBuilder.create().provideMany(adapters).build();
  return createContainer(graph, { name: "test" });
}
```

---

## 3. Unit Test Specs

### 3.1 Damage Calculation

**File:** `frontend/tests/unit/damage-calc.test.ts`

| #   | Test                                                            | Notes                                                                |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Base damage formula produces correct value for known inputs     | Gen V+ formula: `((2 * level / 5 + 2) * power * atk / def) / 50 + 2` |
| 2   | STAB modifier applies 1.5x when move type matches attacker type | Same-Type Attack Bonus                                               |
| 3   | Super effective (2x) applies for fire vs grass                  | Type effectiveness lookup                                            |
| 4   | Not very effective (0.5x) applies for fire vs water             |                                                                      |
| 5   | Immune (0x) applies for normal vs ghost                         |                                                                      |
| 6   | Double super effective (4x) for fire vs grass/steel             | Dual-type multiplication                                             |
| 7   | Critical hit applies 1.5x multiplier                            |                                                                      |
| 8   | Weather modifier: sun boosts fire 1.5x, weakens water 0.5x      |                                                                      |
| 9   | Weather modifier: rain boosts water 1.5x, weakens fire 0.5x     |                                                                      |
| 10  | Random factor between 85% and 100% applied                      | Verify range bounds                                                  |
| 11  | Returns `Ok(DamageResult)` with all breakdown fields            | Result type verification                                             |
| 12  | Returns `Err({ _tag: "InvalidMove" })` for unknown move         | Error variant check                                                  |

### 3.2 Type Effectiveness

**File:** `frontend/tests/unit/type-effectiveness.test.ts`

| #   | Test                                                                 | Notes                    |
| --- | -------------------------------------------------------------------- | ------------------------ |
| 1   | All 18 types exist in the type chart                                 |                          |
| 2   | Fire is super effective against grass, bug, steel, ice               |                          |
| 3   | Water is super effective against fire, ground, rock                  |                          |
| 4   | Electric is immune against ground                                    |                          |
| 5   | Normal is immune against ghost                                       |                          |
| 6   | Dual-type effectiveness multiplies correctly                         | grass/steel vs fire = 4x |
| 7   | Type coverage calculation for a team of 6 returns correct percentage |                          |
| 8   | Weakness detection identifies unresisted types                       |                          |
| 9   | Suggestion engine recommends a type to cover team weaknesses         |                          |

### 3.3 Evolution Guards

**File:** `frontend/tests/unit/evolution-guards.test.ts`

| #   | Test                                                                      | Notes                                  |
| --- | ------------------------------------------------------------------------- | -------------------------------------- |
| 1   | `levelGuard` returns true when `context.level >= threshold`               | Charmander -> Charmeleon at 16         |
| 2   | `levelGuard` returns false when `context.level < threshold`               |                                        |
| 3   | `friendshipGuard` returns true when `context.friendship >= 220`           | Chansey -> Blissey                     |
| 4   | `itemGuard` returns true when `context.heldItem === 'thunder-stone'`      | Pikachu -> Raichu                      |
| 5   | `tradeGuard` returns true when `context.isTrading === true`               | Haunter -> Gengar                      |
| 6   | `tradeItemGuard` requires both trading and held item                      | Onix -> Steelix                        |
| 7   | `moveGuard` checks `context.knownMoves.includes('rollout')`               | Lickitung -> Lickilicky                |
| 8   | `locationGuard` checks `context.location === 'moss-rock'`                 | Eevee -> Leafeon                       |
| 9   | `timeGuard` checks both time of day and friendship                        | Eevee -> Espeon                        |
| 10  | Composed guard `and(levelGuard(36), not(tradeGuard))` evaluates correctly | Using `and`, `not` from `@hex-di/flow` |

### 3.4 AI Strategy

**File:** `frontend/tests/unit/ai-strategy.test.ts`

| #   | Test                                                                         | Notes |
| --- | ---------------------------------------------------------------------------- | ----- |
| 1   | Random strategy selects a move from the available move list                  |       |
| 2   | Random strategy never selects a move with 0 PP                               |       |
| 3   | Smart strategy prefers super-effective moves                                 |       |
| 4   | Smart strategy avoids immune matchups                                        |       |
| 5   | Smart strategy selects highest damage move when multiple are effective       |       |
| 6   | Fallback: smart strategy uses random selection when no type advantage exists |       |

### 3.5 Store Derived Values

**File:** `frontend/tests/unit/store-derived.test.ts`

| #   | Test                                                                         | Notes |
| --- | ---------------------------------------------------------------------------- | ----- |
| 1   | Team power computes sum of base stats for all 6 team members                 |       |
| 2   | Team power updates when a team member is swapped                             |       |
| 3   | Type coverage returns percentage of types the team can hit super-effectively |       |
| 4   | Pokedex completion returns `favorites.length / totalPokemon`                 |       |
| 5   | Empty team returns 0 power and 0% coverage                                   |       |

---

## 4. Integration Test Specs

### 4.1 Core Graph

**File:** `frontend/tests/integration/core-graph.test.ts`

| #   | Test                                                                                   | Notes                            |
| --- | -------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | Core graph builds successfully with `GraphBuilder.create().provideMany([...]).build()` | No thrown errors                 |
| 2   | `inspectGraph(graph).isComplete` returns `true`                                        | All dependencies satisfied       |
| 3   | `inspectGraph(graph).unsatisfiedRequirements` is empty                                 |                                  |
| 4   | All port names are present in `inspectGraph(graph).provides`                           | PokemonList, PokemonDetail, etc. |
| 5   | `createContainer(graph)` creates a container without errors                            |                                  |
| 6   | Resolving each singleton port returns a service instance                               |                                  |
| 7   | Resolving the same singleton port twice returns the same instance                      |                                  |

### 4.2 Battle Graph

**File:** `frontend/tests/integration/battle-graph.test.ts`

| #   | Test                                                                | Notes                     |
| --- | ------------------------------------------------------------------- | ------------------------- |
| 1   | Battle graph builds with scoped services for battle state           |                           |
| 2   | Creating a scope returns battle-scoped service instances            | `container.createScope()` |
| 3   | Resolving `DamageCalcPort` in scope returns a `DamageCalcService`   |                           |
| 4   | Resolving `AiStrategyPort` in scope returns the configured strategy |                           |
| 5   | Disposing scope cleans up battle-scoped services                    |                           |
| 6   | Two battle scopes have independent state                            |                           |

### 4.3 Trading Graph

**File:** `frontend/tests/integration/trading-graph.test.ts`

| #   | Test                                                       | Notes |
| --- | ---------------------------------------------------------- | ----- |
| 1   | Trading graph builds with saga-related ports               |       |
| 2   | Trading scope resolves `TradingPort` with saga integration |       |
| 3   | Scope disposal triggers saga compensation cleanup          |       |

### 4.4 Adapter Switching

**File:** `frontend/tests/integration/adapter-switching.test.ts`

| #   | Test                                                                             | Notes |
| --- | -------------------------------------------------------------------------------- | ----- |
| 1   | Switching from `RestPokemonAdapter` to `CachedPokemonAdapter` reconfigures graph |       |
| 2   | After switch, resolving `PokemonListPort` uses the new adapter                   |       |
| 3   | `inspectGraph(newGraph)` shows updated adapter binding                           |       |
| 4   | `container.inspector.getGraphData()` reflects the new adapter                    |       |
| 5   | Inspector emits `"snapshot-changed"` event on reconfiguration                    |       |

### 4.5 Tracing Hooks

**File:** `frontend/tests/integration/tracing-hooks.test.ts`

| #   | Test                                                                | Notes |
| --- | ------------------------------------------------------------------- | ----- |
| 1   | `instrumentContainer(container, tracer)` installs resolution hooks  |       |
| 2   | Resolving a port creates a span named `resolve:{portName}`          |       |
| 3   | Span has `hex-di.port.name` attribute matching the port name        |       |
| 4   | Span has `hex-di.port.lifetime` attribute                           |       |
| 5   | Nested resolution creates parent-child span relationship            |       |
| 6   | Cache hit resolution has `hex-di.resolution.cached: true` attribute |       |

---

## 5. Component Test Specs

### 5.1 DiscoveryPage

**File:** `frontend/tests/components/discovery-page.test.tsx`

| #   | Test                                                          | Notes |
| --- | ------------------------------------------------------------- | ----- |
| 1   | Renders a list of Pokemon cards from mocked `PokemonListPort` |       |
| 2   | Shows loading skeleton while data is being fetched            |       |
| 3   | Shows error message when adapter returns `Err(NetworkError)`  |       |
| 4   | Displays empty state when no Pokemon match filters            |       |
| 5   | Pokemon card shows name, sprite, and type badges              |       |

### 5.2 FilterBar

**File:** `frontend/tests/components/filter-bar.test.tsx`

| #   | Test                                                       | Notes |
| --- | ---------------------------------------------------------- | ----- |
| 1   | Renders type, habitat, color, and shape filter dropdowns   |       |
| 2   | Selecting a type filter triggers `onFilterChange` callback |       |
| 3   | Active filters are visually indicated                      |       |
| 4   | Clear all filters button resets to defaults                |       |

### 5.3 BattleField

**File:** `frontend/tests/components/battle-field.test.tsx`

| #   | Test                                                             | Notes |
| --- | ---------------------------------------------------------------- | ----- |
| 1   | Renders attacker and defender Pokemon with names and sprites     |       |
| 2   | HP bars display correct percentage based on current/max HP       |       |
| 3   | Status effects are shown as badges (paralyzed, burned, etc.)     |       |
| 4   | Move selector shows four moves with type and PP                  |       |
| 5   | Selecting a move calls `send(SELECT_MOVE)` on the battle machine |       |
| 6   | Battle log displays the last N actions in chronological order    |       |

### 5.4 TradeTimeline

**File:** `frontend/tests/components/trade-timeline.test.tsx`

| #   | Test                                                    | Notes |
| --- | ------------------------------------------------------- | ----- |
| 1   | Renders all 7 saga steps as timeline nodes              |       |
| 2   | Completed steps show green check indicator              |       |
| 3   | Current step shows pulsing blue indicator               |       |
| 4   | Failed step shows red X indicator                       |       |
| 5   | Compensation arrows render backward from failure point  |       |
| 6   | Compensation steps show blue indicator as they complete |       |

### 5.5 BrainOverlay

**File:** `frontend/tests/components/brain-overlay.test.tsx`

| #   | Test                                                                                             | Notes |
| --- | ------------------------------------------------------------------------------------------------ | ----- |
| 1   | Overlay renders when `isOpen` is true                                                            |       |
| 2   | Overlay does not render when `isOpen` is false                                                   |       |
| 3   | Clicking a panel tab switches the active panel                                                   |       |
| 4   | Five tabs are rendered: Neural Map, Synapse Activity, Memory Banks, Thought Process, Vital Signs |       |
| 5   | Close button sets `isOpen` to false                                                              |       |
| 6   | Only the active panel content is mounted                                                         |       |

### 5.6 NeuralMap

**File:** `frontend/tests/components/neural-map.test.tsx`

| #   | Test                                                                       | Notes |
| --- | -------------------------------------------------------------------------- | ----- |
| 1   | Renders a canvas element                                                   |       |
| 2   | Displays graph metrics overlay (node count, edge count, depth, complexity) |       |
| 3   | Clicking a node opens the detail sidebar                                   |       |
| 4   | Detail sidebar shows port name, lifetime, and dependencies                 |       |

---

## 6. Flow Machine Test Specs

All Flow machine tests use utilities from `@hex-di/flow-testing`.

### 6.1 Battle Machine

**File:** `frontend/tests/machines/battle-machine.test.ts`

| #   | Test                                                                                            | Notes                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Machine starts in `idle` state                                                                  | `testMachine(battleMachine)` -> `snapshot().state === 'idle'`                                                              |
| 2   | `START_BATTLE` transitions from `idle` to `team_preview`                                        | `send(startBattle())` -> `waitForState('team_preview')`                                                                    |
| 3   | `CONFIRM_TEAM` transitions from `team_preview` to `turn_start`                                  |                                                                                                                            |
| 4   | Full turn cycle: `turn_start` -> `move_select` -> `move_execute` -> `faint_check` -> `turn_end` | Send events in sequence, verify each state                                                                                 |
| 5   | `POKEMON_FAINTED` from `faint_check` transitions to `switch_prompt` when team has remaining     | Guard: `hasRemainingPokemon` returns true                                                                                  |
| 6   | `POKEMON_FAINTED` from `faint_check` transitions to `battle_end` when no remaining              | Guard: `hasRemainingPokemon` returns false                                                                                 |
| 7   | `SWITCH_POKEMON` from `switch_prompt` transitions back to `turn_end`                            |                                                                                                                            |
| 8   | `BATTLE_END` transitions to final state `battle_end`                                            |                                                                                                                            |
| 9   | Damage calculation effect is collected during `move_execute`                                    | `testTransition(machine, 'move_execute', executeMove())` -> verify `effects` contains `Effect.invoke(DamageCalcPort, ...)` |
| 10  | Full 3-turn battle produces expected state sequence                                             | Snapshot sequence test                                                                                                     |

### 6.2 Evolution Machine

**File:** `frontend/tests/machines/evolution-machine.test.ts`

| #   | Test                                                          | Notes                                                                          |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | Machine starts in the base Pokemon state                      | e.g., `charmander`                                                             |
| 2   | Level guard blocks transition when level < threshold          | `testGuard(levelGuard(16), { context: { level: 10 }, event })` returns `false` |
| 3   | Level guard allows transition when level >= threshold         | `testGuard(levelGuard(16), { context: { level: 16 }, event })` returns `true`  |
| 4   | Successful evolution transitions to evolved state             | `send(EVOLVE)` with satisfied guards -> `waitForState('charmeleon')`           |
| 5   | Eevee branching: stone item guard routes to correct evolution | `context.heldItem === 'fire-stone'` -> `flareon`                               |
| 6   | Eevee branching: friendship + time guard routes correctly     | Espeon (day), Umbreon (night)                                                  |
| 7   | Eevee branching: location guard routes correctly              | Leafeon (moss-rock), Glaceon (ice-rock)                                        |
| 8   | Blocked evolution stays in current state                      | Send EVOLVE with unsatisfied guards -> state unchanged                         |

### 6.3 Trading Machine

**File:** `frontend/tests/machines/trading-machine.test.ts`

| #   | Test                                                                                | Notes                                                                                  |
| --- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Machine starts in `initiating` state                                                |                                                                                        |
| 2   | Complete trade flow transitions through all 7 forward steps                         | initiating -> selecting -> verifying -> locking -> swapping -> confirming -> completed |
| 3   | Failure at `verifying` step triggers compensation                                   | -> notify_cancel                                                                       |
| 4   | Failure at `locking` step triggers unlock compensation                              | -> unlock -> notify_cancel                                                             |
| 5   | Failure at `swapping` step triggers return + unlock compensation                    | -> return -> unlock -> notify_cancel                                                   |
| 6   | Compensation completes in `trade_cancelled` final state                             |                                                                                        |
| 7   | Chaos mode: injected failure at random step triggers appropriate compensation chain |                                                                                        |

---

## 7. Trace Assertion Specs

### 7.1 Battle Traces

**File:** `frontend/tests/traces/battle-traces.test.ts`

Uses `createMemoryTracer()` from `@hex-di/tracing` and `instrumentContainer()` to capture all spans during a battle.

| #   | Test                                                                           | Notes                                              |
| --- | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1   | A complete turn generates a parent span `flow:battle/turn_start->move_execute` | `assertSpanExists(spans, { name: /flow:battle/ })` |
| 2   | Damage calculation generates a child span with `move.name` attribute           | `hasAttribute('move.name', 'thunderbolt')`         |
| 3   | Damage span has `damage.effectiveness` attribute                               |                                                    |
| 4   | Damage span has `damage.final` attribute as a number                           |                                                    |
| 5   | Error spans (miss, immune) have `error` status                                 | `hasStatus('error')`                               |
| 6   | A 5-turn battle generates at least 25 spans                                    |                                                    |
| 7   | Span tree built with `buildTraceTree(traceId)` has correct nesting depth       | Battle -> Turn -> Move -> Damage                   |
| 8   | Each turn span has `battle.turn` attribute with incrementing number            |                                                    |

### 7.2 Cross-Service Traces

**File:** `frontend/tests/traces/cross-service.test.ts`

| #   | Test                                                                     | Notes                         |
| --- | ------------------------------------------------------------------------ | ----------------------------- |
| 1   | Frontend API call span has `traceparent` header injected                 | W3C Trace Context propagation |
| 2   | Backend span continues the trace (same `traceId`, different `spanId`)    |                               |
| 3   | PokeAPI proxy span is a child of the backend span                        |                               |
| 4   | Full trace tree: frontend -> backend -> pokeapi has 3 levels             |                               |
| 5   | Adapter switch event generates a span with `adapter.switched` attribute  |                               |
| 6   | Error in backend produces an error span visible from frontend trace tree |                               |

---

## 8. Test File Organization

```
frontend/tests/
+-- unit/
|   +-- damage-calc.test.ts              # 12 tests: damage formula, modifiers, Result types
|   +-- type-effectiveness.test.ts       # 9 tests: type chart, coverage, suggestions
|   +-- evolution-guards.test.ts         # 10 tests: all guard types and composition
|   +-- ai-strategy.test.ts             # 6 tests: random and smart strategies
|   +-- store-derived.test.ts           # 5 tests: team power, coverage, completion
|
+-- integration/
|   +-- core-graph.test.ts              # 7 tests: graph build, inspect, container creation
|   +-- battle-graph.test.ts            # 6 tests: scoped services, scope isolation
|   +-- trading-graph.test.ts           # 3 tests: saga integration
|   +-- adapter-switching.test.ts       # 5 tests: live reconfiguration, inspector events
|   +-- tracing-hooks.test.ts           # 6 tests: instrumentation, span attributes
|
+-- components/
|   +-- discovery-page.test.tsx          # 5 tests: list, loading, error, empty
|   +-- filter-bar.test.tsx             # 4 tests: filter rendering and callbacks
|   +-- battle-field.test.tsx           # 6 tests: HP bars, status, moves, battle log
|   +-- trade-timeline.test.tsx          # 6 tests: timeline visualization, compensation
|   +-- brain-overlay.test.tsx          # 6 tests: toggle, tabs, panel mounting
|   +-- neural-map.test.tsx             # 4 tests: canvas, metrics, node detail
|
+-- machines/
|   +-- battle-machine.test.ts          # 10 tests: full turn cycle, faint, damage effects
|   +-- evolution-machine.test.ts       # 8 tests: guards, branching, blocked evolution
|   +-- trading-machine.test.ts         # 7 tests: forward flow, compensation chains
|
+-- traces/
    +-- battle-traces.test.ts           # 8 tests: span hierarchy, attributes, count
    +-- cross-service.test.ts           # 6 tests: W3C propagation, trace tree depth

api/tests/
+-- routes/
|   +-- pokemon.test.ts                 # Hono route tests: /api/pokemon, pagination, caching
|   +-- battle.test.ts                  # Hono route tests: /api/battle, state management
|   +-- trading.test.ts                # Hono route tests: /api/trading, saga endpoints
|
+-- middleware/
    +-- scope.test.ts                   # Per-request scope creation and disposal
    +-- tracing.test.ts                # Trace context extraction, span creation
```

### 8.1 Test Count Summary

| Category             | File Count | Approx. Test Count |
| -------------------- | ---------- | ------------------ |
| Unit tests           | 5          | ~42                |
| Integration tests    | 5          | ~27                |
| Component tests      | 6          | ~31                |
| Machine tests        | 3          | ~25                |
| Trace tests          | 2          | ~14                |
| API route tests      | 3          | ~15                |
| API middleware tests | 2          | ~8                 |
| **Total**            | **26**     | **~162**           |

---

## 9. Acceptance Criteria for Testing

### 9.1 Coverage Gates

- [ ] Unit test coverage for pure logic modules (damage calc, type effectiveness, guards, AI strategy): > 80% line coverage
- [ ] Component test coverage: > 60% line coverage
- [ ] All Flow machine tests pass using `@hex-di/flow-testing` utilities
- [ ] All trace assertion tests pass with `MemoryTracer`

### 9.2 Quality Gates

- [ ] All tests pass: `pnpm --filter pokenerve-frontend test` exits 0
- [ ] All tests pass: `pnpm --filter pokenerve-api test` exits 0
- [ ] No `any` types in test utility files (mock adapters, test container builder)
- [ ] No type casts (`as`) in test files except where explicitly required for mocking
- [ ] Each test file is self-contained and can run independently

### 9.3 Documentation Value

- [ ] Each test file has a comment block explaining which HexDI pattern it demonstrates
- [ ] Mock adapter creation follows the `createAdapter()` pattern from `@hex-di/core`
- [ ] Test container creation follows the `GraphBuilder.create().provideMany([...]).build()` pattern
- [ ] Flow machine tests demonstrate all `@hex-di/flow-testing` utilities: `testMachine`, `testGuard`, `testTransition`, `testEffect`
- [ ] Trace tests demonstrate `MemoryTracer`, `assertSpanExists`, `hasAttribute`, `buildTraceTree`

---

_End of Testing Strategy specification._
