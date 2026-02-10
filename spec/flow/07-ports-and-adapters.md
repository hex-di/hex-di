# Specification: Flow Ports & Adapters

## Goal

Integrate state machines and their activities into the HexDI dependency injection graph through FlowPorts and FlowAdapters, providing compile-time dependency validation, scoped lifecycle management, and automatic disposal.

## User Stories

- As a developer, I want to register a state machine as a standard adapter in the DI graph so that its dependencies are resolved automatically and it participates in graph validation.
- As a developer, I want compile-time errors when an activity requires a port not available in its FlowAdapter so that missing dependencies are caught before runtime.

## Specific Requirements

**Flow Port Definition**

- `createFlowPort<TState, TEvent, TContext>('Name')` creates a `Port<FlowService<TState, TEvent, TContext>, TName>` using the core `port()` factory
- `FlowPort<TState, TEvent, TContext, TName>` is a type alias; the port token is interchangeable with any standard `Port` in the container
- `InferFlowServiceState`, `InferFlowServiceEvent`, `InferFlowServiceContext` utility types extract type parameters from a `FlowService` via conditional inference

**Flow Port Direction**

- Flow ports intentionally omit direction (they are bidirectional). Events flow inward via `send(event)` / `sendAndExecute(event)`, while state flows outward via `snapshot()`, `state()`, `context()`, and `subscribe(callback)`. This dual data flow means neither `"inbound"` nor `"outbound"` accurately describes the port, so `FlowPort` extends the base undirected `Port` rather than `DirectedPort`.

**FlowService Interface**

- `FlowService<TState, TEvent, TContext>` wraps a `MachineRunner` and exposes: `snapshot()`, `state()`, `context()`, `send(event)`, `sendAndExecute(event)`, `subscribe(callback)`, `getActivityStatus(id)`, `dispose()`, `isDisposed`
- `send(event)` returns `Result<readonly EffectAny[], TransitionError>` — performs a pure transition without executing effects
- `sendAndExecute(event)` returns `ResultAsync<void, TransitionError | EffectExecutionError>` — transitions and executes all effects via the `DIEffectExecutor`
- `dispose()` returns `ResultAsync<void, DisposeError>` — stops all activities and cleans up resources
- `subscribe(callback)` invokes the callback synchronously after each successful transition with a `MachineSnapshot<TState, TContext>`
- `FlowServiceAny` provides a universal constraint using widened types for collections
- Note: `@hex-di/result` is a peer/workspace dependency of `@hex-di/flow`

**Flow Adapter Configuration**

- `createFlowAdapter(config)` accepts `FlowAdapterConfig` with `provides` (FlowPort), `requires` (port tuple), `machine`, optional `activities` (ConfiguredActivity tuple), optional `lifetime` (defaults to `'scoped'`), and optional `defaultActivityTimeout`
- The `const` modifier on `TRequires`, `TActivities`, and `TLifetime` preserves literal and tuple types for full inference
- The returned `FlowAdapter` type is a standard HexDI `Adapter` parameterized with the FlowPort, a union of required ports, the lifetime, sync factory kind, and non-clonable flag

**Adapter Factory Behavior**

- The factory function receives `ResolvedDeps` and builds a port-name-to-service map from the requires array for the `ScopeResolver`
- Creates an `ActivityManager` with `defaultActivityTimeout`, an activity registry (Map from port name to ConfiguredActivity), an `ActivityDepsResolver`, and a `DIEffectExecutor`
- Creates a `MachineRunner` with the executor and activity manager, then wraps it in a `FlowService` object
- Creates a `FlowEventBus` first, passes it to the executor at construction (for `EmitEffect` routing), and passes it to the runner at construction (for event subscription). The bus decouples executor and runner: the executor emits to the bus, the runner subscribes to the bus, neither references the other directly
- Computes and attaches `FlowAdapterMetadata` to the adapter's `metadata` property via `computeFlowMetadata(machine, activities)` (see Graph Metadata Enrichment below)
- Registers the created `FlowService` instance with the scope's own `FlowRegistry` (resolved from the scope, `scoped` lifetime) after creation, passing scope metadata (`scopeId`, `scopeName`) for local tracking within this scope
- The adapter includes a `finalizer` that (1) unregisters the service from the scope's local FlowRegistry and (2) calls `service.dispose()` when the container scope is disposed

**DIEffectExecutor**

- `createDIEffectExecutor(config)` handles all effect tags: `Invoke` (resolve port, call method), `Spawn` (lookup activity in registry, resolve deps, spawn via manager), `Stop` (abort via manager), `Emit` (route to event sink), `Delay` (setTimeout promise), `Parallel` (ResultAsync.all), `Sequence` (serial ResultAsync.andThen chain), `None` (no-op), `Choose` (evaluate guards and execute matched branch), `Log` (emit structured log via tracing pipeline)
- The executor receives a `FlowEventBus` at construction time via the config. The bus interface is `{ emit(event: EventAny): void; subscribe(callback: (event: EventAny) => void): Unsubscribe }`. The adapter creates the bus first via `createFlowEventBus()`, passes it to the executor config, and passes it to the runner options. This eliminates the circular dependency between executor and runner -- the executor emits to the bus, the runner subscribes to the bus, neither references the other
- For `Spawn`, the executor creates a `TypedEventSink` bridge that routes both emission patterns (object and string+payload) back through the machine's `EventSink`
- For `Invoke`, the executor uses `container.resolveResult(port)` (spec/result §53) instead of `scope.resolve(port)`, getting `Result<T, ResolutionError>` instead of catching thrown exceptions. It chains resolution with method invocation using `andThen`:
  ```
  resolveResult(scope, effect.port)
    .mapErr(toResolutionError)
    .andThen(service => tryCatch(() => callMethod(service, method, args), toInvokeError))
  ```
  For async method results, uses `fromPromise(result, toInvokeError)` to wrap the awaited value
- Accepts an optional `tracingHook: FlowTracingHook` in the config; when present, the executor creates child spans around each `Invoke` and `Spawn` effect execution (see spec 12 for span naming and attribute details)

**createFlowAdapter Result Integration**

- `createFlowAdapter(config)` returns `Result<FlowAdapter, FlowAdapterError>` instead of returning a plain `FlowAdapter` or throwing exceptions
- Uses `safeTry(function*() { ... })` (spec/result §45) to compose the multi-step factory:
  ```
  createFlowAdapter(config): Result<FlowAdapter, FlowAdapterError>
    safeTry(function*() {
      yield* validateActivitiesResult(config.activities)  // checks duplicates + frozen
      yield* computeFlowMetadata(machine, activities)     // validates machine structure
      // ... build registry, create executor, create runner, wrap in service
      return ok(adapter)
    })
  ```
- Each `yield*` short-circuits on `Err`, propagating the first `FlowAdapterError` to the caller
- Error type accumulates: `FlowAdapterError` covers all factory failure modes (metadata validation, duplicate ports, non-frozen activities)
- Cross-reference: `safeTry` from spec/result/10-generators.md

**Type-Safe Port Resolution**

- The `ScopeResolver` interface must provide type-safe resolution without requiring `as` casts at any call site
- `ScopeResolver.resolve<P extends Port<unknown, string>>(port: P): InferService<P>` -- the return type is inferred from the port's type parameter via `InferService<P>`, preserving full type information through the resolution chain
- Inside `executeInvoke`, the resolved service must be accessed through a narrowing pattern rather than `as Record<string, ...>` casts. The implementation must use a `callMethod(service: unknown, method: string, args: readonly unknown[]): unknown` utility that performs a runtime `typeof` check on the property and calls it, keeping the `unknown` type honest without casts
- Inside `executeSpawn`, activity deps resolution must flow through the typed `ActivityDepsResolver` interface which maps port names to their resolved service types. The resolver must return `Record<string, unknown>` (the honest runtime type) rather than casting to a specific shape
- The `buildPortServiceMap` function in `createFlowAdapter` must construct the service map as `Map<string, unknown>` (matching the actual runtime type) with a typed accessor function `getService<P extends Port<unknown, string>>(port: P): InferService<P>` that narrows via the port's type parameter
- **Zero `as` casts rule**: The DI bridge code (`di-executor.ts`, `adapter.ts`) must contain zero `as` type assertions. Where runtime type narrowing is needed, use `typeof` checks, `in` operator guards, or dedicated narrowing utility functions. This aligns with the project's CLAUDE.md rule: "Never use type casting (`as X`)"

**Activity Dependency Validation**

- `ValidateActivityRequirements<TActivity, TAvailablePortNames>` checks at the type level that every port name in `activity.requires` is present in the FlowAdapter's available port names union
- `ActivityRequiresUnavailablePortError<TActivityName, TMissingPort>` produces a descriptive error type with `__error`, `__message`, `__activityName`, and `__missingPorts` properties
- `AssertUniqueActivityPorts<TActivities>` recursively checks that no two activities in the array share the same port name, producing `DuplicateActivityPortError<TName>` on violation
- `ValidateActivities<TActivities, TAvailablePortNames>` composes uniqueness and requirements checks; returns the validated tuple on success or the first error type on failure
- Runtime validation in `createFlowAdapter` mirrors the type-level checks: returns `Err({ _tag: 'DuplicateActivityPort', portName })` on duplicate port names and `Err({ _tag: 'ActivityNotFrozen', portName })` on non-frozen activities

**GraphBuilder Integration**

- `FlowAdapter` is a standard `Adapter` type and registers with `GraphBuilder.provide()` like any other adapter
- The graph validates that all ports in the FlowAdapter's `requires` are satisfied by other adapters in the graph
- Activity dependencies are a subset of the FlowAdapter's requires, so satisfying the adapter's requires transitively satisfies all activity dependencies

**Graph Metadata Enrichment (REQUIRED)**

- `createFlowAdapter` MUST compute and attach `FlowAdapterMetadata` to the adapter's `metadata` property before returning the adapter. This is not optional -- it is the foundation of the VISION's Layer 1 (Structure) self-knowledge
- The computation is performed by a pure function `computeFlowMetadata(machine, activities)` at `libs/flow/core/src/integration/metadata.ts` that extracts structural data from the frozen machine definition
- The metadata is a `FlowAdapterMetadata` object containing:
  - `machineId: string` -- the machine's `id` property
  - `stateNames: readonly string[]` -- all state name strings extracted from `Object.keys(machine.states)`
  - `eventNames: readonly string[]` -- deduplicated event type strings extracted from all state `on` records
  - `initialState: string` -- the machine's `initial` property
  - `finalStates: readonly string[]` -- state names where the state config has `type: 'final'`
  - `transitionsPerState: Record<string, readonly { event: string; target: string; hasGuard: boolean; hasEffects: boolean }[]>` -- summary of transitions per state, derived by iterating each state's `on` record
  - `activityPortNames: readonly string[]` -- port names from the adapter's configured activities (extracted via `activity.port.__portName`)
  - `stateCount: number` -- total number of states (for quick queries)
  - `eventCount: number` -- total number of unique events (for quick queries)
- This metadata is computed once at adapter creation time from the frozen machine definition (zero runtime cost at resolution time)

**Computation Algorithm**

The `computeFlowMetadata(machine, activities)` function at `libs/flow/core/src/integration/metadata.ts` implements the following algorithm:

```
computeFlowMetadata(machine, activities): Result<FlowAdapterMetadata, FlowAdapterError>
  1. VALIDATE:
     - if Object.keys(machine.states).length === 0:
         return Err({ _tag: 'MetadataInvalid', reason: 'NoStates', detail: 'Machine has no states' })
     - if machine.initial is undefined OR machine.states[machine.initial] is undefined:
         return Err({ _tag: 'MetadataInvalid', reason: 'InvalidInitialState', detail: 'Invalid or missing initial state' })
     - if machine.id is undefined OR machine.id === '':
         return Err({ _tag: 'MetadataInvalid', reason: 'EmptyMachineId', detail: 'Machine id is empty or undefined' })

  2. EXTRACT stateNames:
     stateNames = Object.keys(machine.states)

  3. EXTRACT eventNames (deduplicated, sorted):
     eventSet = new Set<string>()
     for each stateName in stateNames:
       stateNode = machine.states[stateName]
       if stateNode.on is defined:
         for each eventType in Object.keys(stateNode.on):
           eventSet.add(eventType)
     eventNames = Array.from(eventSet).sort()

  4. EXTRACT finalStates:
     finalStates = stateNames.filter(name => machine.states[name].type === 'final')

  5. BUILD transitionsPerState:
     transitionsPerState = {}
     for each stateName in stateNames:
       stateNode = machine.states[stateName]
       transitions = []
       if stateNode.on is defined:
         for each [eventType, config] in Object.entries(stateNode.on):
           for each candidate in normalizeTransitions(config):
             transitions.push({
               event: eventType,
               target: candidate.target,
               hasGuard: candidate.guard !== undefined,
               hasEffects: (candidate.effects?.length ?? 0) > 0,
             })
       transitionsPerState[stateName] = transitions

  6. EXTRACT activityPortNames:
     activityPortNames = activities.map(a => a.port.__portName)

  7. RETURN Ok(FlowAdapterMetadata {
       machineId: machine.id,
       stateNames, eventNames, initialState: machine.initial,
       finalStates, transitionsPerState, activityPortNames,
       stateCount: stateNames.length,
       eventCount: eventNames.length,
     })
```

**Validation Requirements**

- `FlowAdapterError` is a tagged union (spec 05 "Flow Error Types") that replaces the previous `FlowMetadataError` exception class
- Three validation rules are enforced, each returning `Err(FlowAdapterError)`:
  1. Machine has no states → `Err({ _tag: 'MetadataInvalid', reason: 'NoStates', detail: '...' })`
  2. Machine has no valid initial state → `Err({ _tag: 'MetadataInvalid', reason: 'InvalidInitialState', detail: '...' })`
  3. Machine id is empty or undefined → `Err({ _tag: 'MetadataInvalid', reason: 'EmptyMachineId', detail: '...' })`
- Validation runs at adapter creation time (eager, in `createFlowAdapter`), not at resolution time -- this ensures invalid machines are caught during graph construction, not when a consumer resolves the port

**VisualizableAdapter Typing**

- The existing `VisualizableAdapter` interface in `packages/core/src/inspection/` must be extended to support an optional `metadata?: Record<string, unknown>` property (generic to avoid coupling `@hex-di/core` to `@hex-di/flow`)
- Flow adapters populate `metadata` with the `FlowAdapterMetadata` object, but the `VisualizableAdapter` type only sees `Record<string, unknown>` -- this preserves the core package's independence from flow-specific types
- A type guard `isFlowMetadata(metadata: Record<string, unknown>): metadata is FlowAdapterMetadata` is exported from `@hex-di/flow` to narrow the generic metadata to the flow-specific shape
- When `graph.inspect()` is called, flow adapters include this metadata in their `VisualizableAdapter` entry, enabling structural queries like "what states does OrderFlowPort have?" and "what events does it handle?" directly from the dependency graph without needing a running FlowInspector

**FlowInspector Structural Query Connection**

- `FlowInspector.getStructuralMetadata(portName)` reads machine structural metadata from the graph's `VisualizableAdapter.metadata` (Layer 1 -- structure)
- Query path: `FlowInspector` → `graph.inspect()` → find adapter by port name → read `metadata` property → narrow via `isFlowMetadata()` type guard → return typed `FlowAdapterMetadata`
- This enables structural queries (state names, event names, transition maps, final states) without running machine instances -- purely from the dependency graph's compile-time data
- Returns `undefined` if the port has no flow metadata (i.e., it is not a flow adapter)

**Graph Visualization Integration**

- `@hex-di/graph-viz` consumes metadata passively from `VisualizableAdapter.metadata` -- no special flow-awareness code is needed in graph-viz
- Visualization can render state diagrams, transitions, and final states as node annotations when flow metadata is present
- The generic `Record<string, unknown>` type on `VisualizableAdapter.metadata` means graph-viz can display metadata from any adapter type, not just flow adapters
- Flow-specific rendering logic (e.g., state diagram layout) lives in an optional `@hex-di/graph-viz` plugin or consumer code, not in the core visualization package

- This is the VISION's Layer 1 (Structure) -- the machine's DNA that is known at compile time and does not change at runtime
- The `FlowAdapterMetadata` type must be exported from `@hex-di/flow` for consumers to use in typed queries

**Scoping and Lifetime**

- Default lifetime is `'scoped'`, creating a new `FlowService` (and underlying `MachineRunner` + `ActivityManager`) per container scope
- `'singleton'` lifetime shares one machine instance across all scopes; `'transient'` creates a new instance on every resolution
- The factory is `'sync'` and `clonable: false`, meaning the service is created synchronously and cannot be cloned across scopes

**Disposal and Cleanup**

- The adapter's `finalizer` is called when the scope disposes, triggering `FlowService.dispose()`
- `dispose()` delegates to `MachineRunner.dispose()`, which calls `ActivityManager.dispose()`
- `ActivityManager.dispose()` aborts all running activities, then `Promise.all`s their execution promises to ensure all cleanup functions complete
- After disposal, `isDisposed` returns `true`; subsequent `send()` calls return `Err({ _tag: 'Disposed' })` and `sendAndExecute()` returns `Err({ _tag: 'Disposed' })`

## Existing Code to Leverage

**`libs/flow/core/src/integration/adapter.ts` - FlowAdapter Factory**

- `createFlowAdapter` builds the port-name-to-service map, activity registry, deps resolver, executor, runner, and FlowService wrapper
- Includes runtime validation via `validateActivitiesAtRuntime` (duplicate port names, frozen check)
- `buildActivityRegistry` creates a `Map<string, ConfiguredActivityAny>` for O(1) activity lookup by port name
- `createActivityDepsResolver` validates activity ports against available ports and extracts deps from the parent deps record

**`libs/flow/core/src/integration/di-executor.ts` - DI Effect Executor**

- `createDIEffectExecutor` implements the `EffectExecutor` interface with a switch on `effect._tag`
- Receives a `FlowEventBus` at construction for routing `EmitEffect` events (no deferred wiring needed)
- `SpawnEffect` execution bridges the activity's `TypedEventSink` to the machine's `EventSink` by normalizing both emission patterns
- `ParallelEffect` uses `Promise.all`; `SequenceEffect` uses a serial `for...of` loop

**`libs/flow/core/src/integration/activity-validation.ts` - Type-Level Validation**

- `ValidateActivityRequirements` uses `ActivityRequiredPortNames extends TAvailablePortNames` conditional to check subset relationship
- `AssertUniqueActivityPorts` uses recursive tuple traversal with `PortNameInRest` helper
- Error types carry structured metadata (`__error`, `__message`, `__activityName`, `__missingPorts`) for readable IDE error messages
- `ValidateActivities` composes both checks, returning the validated array type or the first error

**`libs/flow/core/src/integration/types.ts` - FlowService Type**

- `FlowService<TState, TEvent, TContext>` interface with full API surface including `send`, `sendAndExecute`, `subscribe`, `dispose`
- `FlowServiceAny` universal constraint type for typed collections
- `InferFlowServiceState`, `InferFlowServiceEvent`, `InferFlowServiceContext` conditional inference utilities

**`libs/flow/core/src/integration/port.ts` - FlowPort Factory**

- `createFlowPort` delegates to `port<FlowService<...>>()({ name })` from `@hex-di/core`
- `FlowPort` type alias wraps `Port<FlowService<TState, TEvent, TContext>, TName>`

## Out of Scope

- Hot-swapping machine definitions on a live FlowAdapter
- Cross-scope machine communication or shared event buses between FlowService instances
- Automatic machine state persistence or rehydration from storage
- FlowAdapter middleware or interceptor hooks for effect execution
- Machine composition (nested or parallel machines within a single FlowAdapter)
- Custom lifetime strategies beyond the standard `singleton`, `scoped`, `transient`
- FlowAdapter code generation or schema-driven machine definition
- Server-side rendering integration for FlowService state snapshots
- FlowAdapter metrics or observability hooks (tracing is handled by a separate package)
- Dynamic port resolution within effects (all ports must be declared in requires at definition time)
