# Specification: States, Transitions & Guards

## Goal

Extend the HexDI Flow state machine with hierarchical (compound), parallel, final, and history state types, plus guarded/eventless transitions and composable guard logic -- enabling complex real-world workflows while preserving the existing pure-transition architecture.

## User Stories

- As a developer, I want to define compound states with nested child states so that I can model hierarchical workflows (e.g., a "payment" state that internally moves through "authorizing", "capturing", "settled").
- As a developer, I want to define parallel states with concurrent regions so that I can model independent aspects of a process running simultaneously (e.g., form validation + autosave).
- As a developer, I want guards that read pre-resolved data from context so that conditional transitions can depend on service results (e.g., feature flags, permissions) without requiring DI access in the pure interpreter.

## Specific Requirements

**State Type Discriminator**

- Add a `type` property to `StateNode` config: `'atomic' | 'compound' | 'parallel' | 'final' | 'history'`
- Default to `'atomic'` when `type` is omitted (backward compatible inference)
- `'final'` states must have an empty `on` record and no `states` children
- `'history'` states must specify `history: 'shallow' | 'deep'` and have no `on` or `entry`/`exit`
- The `type` discriminator should be enforced at the type level so invalid combinations produce compile errors

**Compound (Hierarchical) States**

- A compound state has `states: Record<string, StateNode>` and `initial: string` pointing to one of its children
- Entering a compound state enters `initial` child; exiting exits the active child first (bottom-up)
- Events bubble from deepest active child upward; the first state with a matching handler consumes the event
- Transition targets use dot-delimited paths: `'payment.authorizing'`
- The interpreter must resolve nested active-state paths and collect entry/exit effects in correct leaf-to-root / root-to-leaf order

```
                       +----- payment (compound) -----+
                       | initial: 'authorizing'        |
                       |                               |
                       |  +-------------+              |
                ENTER  |  | authorizing |--AUTHORIZED->|
                ------>|  +-------------+              |
                       |        |                      |
                       |  +-------------+              |
                       |  |  capturing  |--CAPTURED--->|
                       |  +-------------+              |
                       |        |                      |
                       |  +-------------+              |
                       |  |   settled   | (final)      |
                       |  +-------------+              |
                       +-------------------------------+
```

**Parallel States**

- A parallel state has `type: 'parallel'` and `states` containing two or more regions (no `initial` needed)
- All regions are active simultaneously; each region is an independent compound state
- An event is delivered to every active region; each may transition independently
- The parallel state is only exited when an explicit transition targets a state outside it
- The `MachineSnapshot` must represent the active state of each region (e.g., `{ state: 'editing', regions: { form: 'dirty', autosave: 'saving' } }`)

```
         +========== editing (parallel) ==========+
         ‖                    ‖                    ‖
         ‖  +-- form ---+    ‖  +- autosave -+    ‖
         ‖  | pristine  |    ‖  |   idle     |    ‖
         ‖  |   dirty   |    ‖  |  saving    |    ‖
         ‖  | validated |    ‖  |   saved    |    ‖
         ‖  +-----------+    ‖  +-----------+     ‖
         ‖                    ‖                    ‖
         +================================================+
```

**Final States**

- A `'final'` state signals that its parent compound region is complete
- When all regions of a parallel state reach a final child, emit a `done.state.<parentId>` event
- Final states accept `entry` effects but no `exit`, no `on`, and no `states`

**History States**

- A `'history'` pseudo-state remembers the last active child of its parent compound state
- `'shallow'` remembers only the immediate child; `'deep'` remembers the full nested path
- Transitioning to a history state re-enters the remembered child (or `initial` on first entry)
- History state config: `{ type: 'history', history: 'shallow' | 'deep' }`

```
     +-------- editor (compound) --------+
     | initial: 'source'                 |
     |                                   |
     |  [H] hist  <-- history: 'shallow' |
     |                                   |
     |  +--------+     +---------+       |
     |  | source |     | preview |       |
     |  +--------+     +---------+       |
     +-----------------------------------+

     Transition to 'editor.hist' re-enters
     whichever child was last active.
```

**Transition Types**

- **Target transition**: `{ target: 'nextState' }` -- changes state, runs exit/entry effects
- **Self-transition**: `{ target: 'currentState' }` -- re-runs exit and entry effects for current state
- **Internal transition**: `{ internal: true }` -- stays in same state, runs only transition actions/effects, no exit/entry
- **Eventless (always) transition**: `{ always: [{ target: 'next', guard: ... }] }` on a state node -- evaluated immediately after entry, before processing queued events
- **Delayed (after) transition**: `{ after: { 3000: { target: 'timeout' } } }` -- syntactic sugar for `entry: [Effect.delay(ms, event)]` plus a handler for that event

**Guard System**

- Guards are pure predicates: `(context, event) => boolean`
- Named guards via `guard(name, predicate)` factory for DevTools / tracing visibility
- Guard composition: `and(g1, g2)`, `or(g1, g2)`, `not(g)` returning new guard functions
- Guard arrays on a transition are evaluated in order; first passing guard wins
- **Context-based service data for guards**: when a guard needs data from a DI service (e.g., feature flags, permissions), the correct pattern is to resolve the service via `Effect.invoke` in a prior state's entry effects and store the result in context. The guard then reads from context, preserving the pure interpreter invariant. DI-resolved guards (guards that reference a Port directly) are intentionally NOT supported because they would require the interpreter to access the container, breaking purity of `transition()`

**Action System**

- Actions are pure context transformers: `(context, event) => newContext`
- Actions can appear in three positions: `entry` on state, `exit` on state, `actions` on transition
- Execution order: exit actions -> transition actions -> entry actions
- Actions and effects are kept separate: actions transform context synchronously, effects are async descriptors
- `Effect.assign((ctx, event) => newCtx)` is the effect-based alternative to inline actions; both must coexist

## Visual Design

No visual mockups provided.

## Existing Code to Leverage

**`libs/flow/core/src/machine/state-node.ts` -- StateNode interface**

- Currently defines `entry`, `exit`, and `on` properties for flat atomic states
- Extend with optional `type`, `states`, `initial`, and `history` properties
- Keep `StateNodeAny` universal constraint updated to match the new shape
- The `StateNodeTransitions` mapped type already handles partial event-to-transition mapping

**`libs/flow/core/src/machine/transition.ts` -- TransitionConfig interface**

- Already supports `target`, `guard`, `actions`, and `effects`
- Add `internal: boolean` flag for internal transitions
- The `TransitionConfigOrArray` union already handles guard-ordered arrays
- Add `always` and `after` to `StateNode` (not `TransitionConfig`) since they are state-level concepts

**`libs/flow/core/src/runner/interpreter.ts` -- transition() function**

- Pure function that computes `TransitionResult` (newState, newContext, effects)
- Must be extended to walk nested state hierarchies, resolve dot-path targets, and bubble events
- `collectEffects` must be updated for bottom-up exit / top-down entry ordering through state nesting
- `findMatchingTransition` evaluates only pure `(context, event) => boolean` guards; no DI resolver argument is needed since guards read from context

**`libs/flow/core/src/machine/config.ts` -- MachineConfig / MachineStatesRecord**

- `MachineStatesRecord` maps `TStateNames -> StateNode`; needs to support nested state name paths
- Consider a recursive type for nested states or flatten dot-paths into `TStateNames` union at the type level

**`libs/flow/core/src/runner/types.ts` -- MachineSnapshot**

- Currently has `state: TState` as a single string; needs to represent hierarchical active-state path and parallel region states
- Consider `statePath: readonly string[]` or a nested record for parallel regions

## Out of Scope

- Invoke states (XState-style `invoke` on state config) -- use `Effect.invoke` in entry effects instead
- History across machine restarts (persistence / rehydration)
- Dynamic state creation at runtime (states are always statically defined)
- State metadata or tags (e.g., XState's `meta` and `tags`)
- Wildcard transitions (e.g., `on: { '*': ... }`)
- Inter-machine communication (handled by a separate actor/agent spec)
- Visual state chart editor tooling
- Undo/redo of state transitions
- State entry/exit ordering customization beyond the standard hierarchical model
- Transition priority beyond definition order (no explicit priority numbers)
