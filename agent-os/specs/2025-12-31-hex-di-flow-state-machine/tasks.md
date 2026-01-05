# Task Breakdown: @hex-di/flow State Machine

## Overview

Total Tasks: 11 Task Groups (approximately 60+ sub-tasks)

This tasks list implements two packages:

- **@hex-di/flow** - Core state machine with branded types, effects, activities
- **@hex-di/flow-react** - React hooks integration

---

## Task List

### Phase 1: Package Setup

#### Task Group 1: Package Infrastructure

**Dependencies:** None

- [x] 1.0 Complete package infrastructure
  - [x] 1.1 Create `packages/flow/` directory structure
    - Create directories: `src/machine/`, `src/runner/`, `src/effects/`, `src/activities/`, `src/integration/`, `src/tracing/`, `src/errors/`
    - Create `tests/` directory
  - [x] 1.2 Create `packages/flow/package.json`
    - Name: `@hex-di/flow`
    - Dependencies: `@hex-di/ports`, `@hex-di/graph`, `@hex-di/runtime`
    - Peer dependencies: TypeScript >=5.0
    - Follow existing package.json patterns from `@hex-di/runtime`
  - [x] 1.3 Create `packages/flow/tsconfig.json` and `tsconfig.build.json`
    - Extend root `tsconfig.json`
    - Configure paths for workspace packages
  - [x] 1.4 Create `packages/flow/vitest.config.ts`
    - Configure test environment
    - Enable type testing
  - [x] 1.5 Create `packages/flow/eslint.config.js`
    - Extend shared ESLint config
  - [x] 1.6 Create `packages/flow-react/` directory structure
    - Create directories: `src/hooks/`, `src/context/`
    - Create `tests/` directory
  - [x] 1.7 Create `packages/flow-react/package.json`
    - Name: `@hex-di/flow-react`
    - Dependencies: `@hex-di/flow`, `@hex-di/react`, `@hex-di/ports`
    - Peer dependencies: React >=19.0.0, TypeScript >=5.0
  - [x] 1.8 Create `packages/flow-react/tsconfig.json` and `tsconfig.build.json`
  - [x] 1.9 Create `packages/flow-react/vitest.config.ts`
  - [x] 1.10 Create `packages/flow-react/eslint.config.js`
  - [x] 1.11 Verify pnpm workspace picks up new packages
    - Run `pnpm install` to link workspace packages

**Files to Create:**

- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/package.json`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/tsconfig.json`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/tsconfig.build.json`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/vitest.config.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/eslint.config.js`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/index.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/package.json`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/tsconfig.json`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/tsconfig.build.json`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/vitest.config.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/eslint.config.js`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/src/index.ts`

**Acceptance Criteria:**

- Both packages appear in pnpm workspace
- `pnpm build` succeeds for both packages (empty exports)
- `pnpm typecheck` passes
- `pnpm lint` passes

---

### Phase 2: Core Types

#### Task Group 2: Branded Types and Type Utilities

**Dependencies:** Task Group 1

- [x] 2.0 Complete core type system
  - [x] 2.1 Write 4-6 type-level tests for State, Event, Machine brands
    - Test State brand encodes name and context
    - Test Event brand encodes name and payload
    - Test conditional context/payload inclusion
    - Test DeepReadonly enforcement
    - Test type narrowing via discriminated union
  - [x] 2.2 Create brand symbols in `src/machine/brands.ts`
    - `declare const __stateBrand: unique symbol`
    - `declare const __eventBrand: unique symbol`
    - `declare const __machineBrand: unique symbol`
    - Export brand symbols for type-level use only
  - [x] 2.3 Create `State<TName, TContext>` type in `src/machine/types.ts`
    - Brand with `[__stateBrand]: [TName, TContext]`
    - `readonly name: TName` property
    - Conditional context: `TContext extends void ? {} : { readonly context: DeepReadonly<TContext> }`
    - Use intersection type for conditional property
  - [x] 2.4 Create `Event<TName, TPayload>` type in `src/machine/types.ts`
    - Brand with `[__eventBrand]: [TName, TPayload]`
    - `readonly type: TName` property
    - Conditional payload: `TPayload extends void ? {} : { readonly payload: TPayload }`
  - [x] 2.5 Create `DeepReadonly<T>` utility type in `src/machine/types.ts`
    - Handle arrays: `ReadonlyArray<DeepReadonly<U>>`
    - Handle objects: `{ readonly [K in keyof T]: DeepReadonly<T[K]> }`
    - Handle primitives: pass through
  - [x] 2.6 Create type inference utilities in `src/machine/types.ts`
    - `InferStateName<S>`: Extract state name from State type
    - `InferStateContext<S>`: Extract context from State type
    - `InferEventName<E>`: Extract event name from Event type
    - `InferEventPayload<E>`: Extract payload from Event type
    - `StateUnion<TStates>`: Union of all state types
    - `EventUnion<TEvents>`: Union of all event types
  - [x] 2.7 Create state factory function `state<TName, TContext>()` in `src/machine/factories.ts`
    - Curried factory: `state<TName>(name) => (context?) => State<TName, TContext>`
    - Use `Object.freeze()` for runtime immutability
  - [x] 2.8 Create event factory function `event<TName, TPayload>()` in `src/machine/factories.ts`
    - Curried factory: `event<TName>(type) => (payload?) => Event<TName, TPayload>`
    - Use `Object.freeze()` for runtime immutability
  - [x] 2.9 Ensure type-level tests pass
    - Run `pnpm test:types` for the flow package
    - Verify all type assertions are correct

**Files to Create:**

- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/machine/brands.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/machine/types.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/machine/factories.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/machine/index.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/tests/types.test-d.ts`

**Acceptance Criteria:**

- All 4-6 type-level tests pass
- State and Event brands provide nominal typing
- Conditional context/payload works correctly
- DeepReadonly enforces immutability at type level
- Type utilities correctly infer nested types

---

### Phase 3: Effect System

#### Task Group 3: Effect Descriptors and Constructors

**Dependencies:** Task Group 2

- [x] 3.0 Complete effect system
  - [x] 3.1 Write 4-6 type-level tests for effect inference
    - Test `Effect.invoke()` infers port method signature
    - Test `Effect.spawn()` infers activity input type
    - Test `Effect.emit()` validates against event union
    - Test `Effect.parallel()` and `Effect.sequence()` compose correctly
  - [x] 3.2 Create base effect types in `src/effects/types.ts`
    - `BaseEffect<TKind>` interface with `_tag: TKind`
    - `InvokeEffect<TPort, TMethod, TArgs>` with port reference, method name, args
    - `SpawnEffect<TActivityId, TInput>` with activity ID and input
    - `StopEffect<TActivityId>` with activity ID
    - `EmitEffect<TEvent>` with typed event
    - `DelayEffect` with milliseconds
    - `ParallelEffect<TEffects>` with effect array
    - `SequenceEffect<TEffects>` with effect array
    - `NoneEffect` as empty effect
  - [x] 3.3 Create `Effect` union type
    - Union of all 8 effect types
    - `EffectAny` type for universal constraint (following AdapterAny pattern)
  - [x] 3.4 Create effect constructors in `src/effects/constructors.ts`
    - `Effect.invoke<TPort>(port, method, args)`: Infer all types from port token
    - `Effect.spawn(activityId, activityPort, input?)`: Typed activity spawning
    - `Effect.stop(activityId)`: Stop running activity
    - `Effect.emit(event)`: Emit event back to machine
    - `Effect.delay(ms)`: Wait for duration
    - `Effect.parallel(effects)`: Run effects concurrently
    - `Effect.sequence(effects)`: Run effects in order
    - `Effect.none()`: No-op singleton
  - [x] 3.5 Add port method type extraction utilities
    - `MethodNames<TService>`: Extract method names from service interface
    - `MethodParams<TService, TMethod>`: Extract method parameters
    - `MethodReturn<TService, TMethod>`: Extract method return type
  - [x] 3.6 Ensure effect type-level tests pass
    - Run `pnpm test:types` for the flow package
    - Verify effect inference works correctly

**Files to Create:**

- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/effects/types.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/effects/constructors.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/effects/index.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/tests/effects.test-d.ts`

**Acceptance Criteria:**

- All 4-6 effect type-level tests pass
- `Effect.invoke()` infers port method signature correctly
- Effect constructors return immutable descriptors
- All 8 effect types properly discriminated by `_tag`

---

### Phase 4: Activity System

#### Task Group 4: Activity Types and Manager

**Dependencies:** Task Group 3

- [x] 4.0 Complete activity system
  - [x] 4.1 Write 4-6 tests for activity lifecycle
    - Test activity starts with correct input
    - Test activity receives AbortSignal
    - Test activity can emit events via EventSink
    - Test ActivityManager tracks running activities
    - Test stop effect cancels activity via AbortSignal
  - [x] 4.2 Create activity types in `src/activities/types.ts`
    - `Activity<TInput, TOutput>` interface with `execute(input, sink, signal)`
    - `EventSink` interface with `emit<E>(event: E): void`
    - `ActivityStatus`: `'pending' | 'running' | 'completed' | 'failed' | 'cancelled'`
    - `ActivityInstance` type with id, status, startTime, endTime
  - [x] 4.3 Create ActivityManager in `src/activities/manager.ts`
    - Track running activities by ID
    - `spawn(id, activity, input, eventSink)`: Start activity with AbortController
    - `stop(id)`: Abort activity via AbortController.abort()
    - `getStatus(id)`: Return current activity status
    - `getAll()`: Return all activity instances
    - `dispose()`: Stop all running activities
  - [x] 4.4 Create activity port pattern in `src/activities/port.ts`
    - Use same Port pattern as services for activity definitions
    - `createActivityPort<TInput, TOutput>(name)` factory
  - [x] 4.5 Ensure activity tests pass
    - Run `pnpm test` for activity-related tests
    - Verify lifecycle management works correctly

**Files to Create:**

- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/activities/types.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/activities/manager.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/activities/port.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/activities/index.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/tests/activities.test.ts`

**Acceptance Criteria:**

- All 4-6 activity tests pass
- Activities receive AbortSignal for cancellation
- EventSink allows emitting events during execution
- ActivityManager properly tracks and cleans up activities

---

### Phase 5: Machine Definition

#### Task Group 5: Machine Configuration and Factory

**Dependencies:** Task Group 4

- [x] 5.0 Complete machine definition
  - [x] 5.1 Write 4-6 compile-time validation tests
    - Test invalid initial state produces compile error
    - Test invalid transition target produces compile error
    - Test event payload mismatch produces compile error
    - Test guard return type must be boolean
    - Test action must return matching context shape
  - [x] 5.2 Create StateNode configuration type in `src/machine/state-node.ts`
    - `entry?: readonly Effect[]` - Effects run on state entry
    - `exit?: readonly Effect[]` - Effects run on state exit
    - `on: Record<TEventName, TransitionConfig | readonly TransitionConfig[]>`
  - [x] 5.3 Create TransitionConfig type in `src/machine/transition.ts`
    - `target: TStateName` - Must be valid state name (compile-time check)
    - `guard?: (context: TContext, event: TEvent) => boolean`
    - `actions?: readonly ((context: TContext, event: TEvent) => TContext)[]`
    - `effects?: readonly Effect[]`
  - [x] 5.4 Create MachineConfig type in `src/machine/config.ts`
    - `id: string` - Machine identifier
    - `initial: TStateName` - Must exist in states (compile-time check)
    - `states: Record<TStateName, StateNode>`
    - `context?: TContext` - Initial context value
  - [x] 5.5 Create `createMachine(config)` factory in `src/machine/create-machine.ts`
    - Return branded `Machine<TState, TEvent, TContext>` type
    - Validate initial state exists at compile time
    - Encode state union, event union, and context in Machine brand
    - Use `Object.freeze()` for immutable machine config
  - [x] 5.6 Create MachineAny type for universal constraint
    - Follow AdapterAny pattern from `@hex-di/graph`
    - Avoid using `any` type
  - [x] 5.7 Ensure compile-time validation tests pass
    - Run `pnpm test:types` for machine tests
    - Verify all expected compile errors occur

**Files to Create:**

- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/machine/state-node.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/machine/transition.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/machine/config.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/machine/create-machine.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/tests/machine.test-d.ts`

**Acceptance Criteria:**

- All 4-6 compile-time validation tests pass
- Invalid transitions produce clear TypeScript errors
- Machine type encodes full state/event/context information
- Guards must return boolean (compile-time enforced)

---

### Phase 6: Machine Runner

#### Task Group 6: Runner Implementation

**Dependencies:** Task Group 5

- [x] 6.0 Complete machine runner
  - [x] 6.1 Write 5-8 tests for runner behavior
    - Test initial state is set correctly
    - Test `send()` returns effects without executing
    - Test `sendAndExecute()` executes effects
    - Test subscription receives snapshot updates
    - Test guards are evaluated in order
    - Test actions update context immutably
    - Test dispose stops all activities
  - [x] 6.2 Create MachineSnapshot type in `src/runner/types.ts`
    - `readonly state: TState` - Current state
    - `readonly context: TContext` - Current context
    - `readonly activities: readonly ActivityInstance[]` - Running activities
  - [x] 6.3 Create MachineRunner interface in `src/runner/types.ts`
    - `snapshot(): MachineSnapshot<TState, TContext>`
    - `state(): TState`
    - `context(): TContext`
    - `send(event: TEvent): readonly Effect[]` - Pure transition
    - `sendAndExecute(event: TEvent): Promise<void>` - Transition + execute effects
    - `subscribe(callback): () => void` - Subscribe to changes
    - `getActivityStatus(id): ActivityStatus | undefined`
    - `dispose(): Promise<void>`
    - `readonly isDisposed: boolean`
  - [x] 6.4 Create Interpreter (pure transition logic) in `src/runner/interpreter.ts`
    - `transition(state, context, event, machineConfig)`: Returns new state, context, effects
    - Pure function with no side effects
    - Evaluates guards in definition order
    - Applies actions to produce new context
    - Collects entry/exit/transition effects
  - [x] 6.5 Create EffectExecutor interface in `src/runner/executor.ts`
    - `execute(effect: Effect): Promise<void>`
    - Implemented by DIEffectExecutor for HexDI integration
  - [x] 6.6 Create `createMachineRunner(machine, options)` factory in `src/runner/create-runner.ts`
    - Options: `executor`, `activityManager`, `collector`
    - Manage subscriptions
    - Integrate with ActivityManager
    - Handle effect execution
  - [x] 6.7 Ensure runner tests pass
    - Run `pnpm test` for runner tests
    - Verify all state transitions work correctly

**Files to Create:**

- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/runner/types.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/runner/interpreter.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/runner/executor.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/runner/create-runner.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/runner/index.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/tests/runner.test.ts`

**Acceptance Criteria:**

- All 5-8 runner tests pass
- `send()` is pure (returns effects without side effects)
- `sendAndExecute()` executes effects
- Subscriptions receive updates on state changes
- Disposal properly cleans up resources

---

### Phase 7: HexDI Integration

#### Task Group 7: Flow Adapter and DI Executor

**Dependencies:** Task Group 6

- [x] 7.0 Complete HexDI integration
  - [x] 7.1 Write 4-6 integration tests with real containers
    - Test FlowService resolves from container
    - Test Effect.invoke resolves port from scope
    - Test scoped lifetime creates new machine per scope
    - Test effects execute with correct dependencies
  - [x] 7.2 Create FlowService type in `src/integration/types.ts`
    - Wrapper interface for MachineRunner
    - Exposes same API as MachineRunner
    - Type parameters: `FlowService<TState, TEvent, TContext>`
  - [x] 7.3 Create DIEffectExecutor in `src/integration/di-executor.ts`
    - Receives scope via ScopePort pattern
    - `execute(effect)`: Resolve ports from container scope
    - Handle InvokeEffect: Resolve port, call method with args
    - Handle SpawnEffect: Resolve activity port, start activity
    - Handle EmitEffect: Route event back to runner
    - Handle DelayEffect: Promise-based delay
    - Handle ParallelEffect: Promise.all
    - Handle SequenceEffect: Sequential await
  - [x] 7.4 Create `createFlowAdapter(config)` factory in `src/integration/adapter.ts`
    - Config: `provides`, `requires`, `lifetime`, `machine`
    - Follow Adapter pattern from `@hex-di/graph`
    - Default lifetime: 'scoped'
    - Create DIEffectExecutor with scope
    - Instantiate MachineRunner with executor
  - [x] 7.5 Create FlowService port factory in `src/integration/port.ts`
    - `createFlowPort<TState, TEvent, TContext>(name)` helper
    - Produces Port token for FlowService
  - [x] 7.6 Ensure integration tests pass
    - Run `pnpm test` for integration tests
    - Verify container resolution works correctly

**Files to Create:**

- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/integration/types.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/integration/di-executor.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/integration/adapter.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/integration/port.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/integration/index.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/tests/integration.test.ts`

**Acceptance Criteria:**

- All 4-6 integration tests pass
- FlowService can be resolved from HexDI container
- Effects correctly resolve ports from container scope
- Scoped lifetime creates isolated machines per scope

**Note:** The `createFlowAdapter` and `createFlowPort` functions are implemented but have a type-level issue with the GraphBuilder's circular dependency detection when used with adapters that have dependencies. Users should use `createPort` directly with `FlowService<TState, TEvent, TContext>` and `createAdapter` for adapters with dependencies until this is resolved.

---

### Phase 8: DevTools Integration

#### Task Group 8: Tracing and Flow Collector

**Dependencies:** Task Group 7

- [x] 8.0 Complete DevTools integration
  - [x] 8.1 Write 4-6 tests for tracing
    - Test NoOpFlowCollector has zero overhead
    - Test FlowMemoryCollector records transitions
    - Test configurable history limit
    - Test subscription receives transition events
    - Test circular buffer evicts oldest entries
  - [x] 8.2 Create FlowTransitionEvent type in `src/tracing/types.ts`
    - `id: string` - Unique transition ID
    - `machineId: string` - Machine identifier
    - `prevState: TState` - Previous state
    - `event: TEvent` - Triggering event
    - `nextState: TState` - Resulting state
    - `effects: readonly Effect[]` - Produced effects
    - `timestamp: number` - When transition occurred
    - `duration: number` - Transition execution time
  - [x] 8.3 Create FlowCollector interface in `src/tracing/collector.ts`
    - `collect(event: FlowTransitionEvent): void`
    - `getTransitions(filter?): readonly FlowTransitionEvent[]`
    - `getStats(): FlowStats`
    - `clear(): void`
    - `subscribe(callback): () => void`
  - [x] 8.4 Create NoOpFlowCollector in `src/tracing/noop-collector.ts`
    - Zero-cost implementation
    - All methods are no-ops
    - Used in production when DevTools disabled
  - [x] 8.5 Create FlowMemoryCollector in `src/tracing/memory-collector.ts`
    - Configurable history limit (default 1000)
    - Circular buffer with FIFO eviction
    - Optional pinning support
    - Filtering by machine ID, state, event type
  - [x] 8.6 Create tracing runner factory in `src/tracing/tracing-runner.ts`
    - Wraps MachineRunner with tracing
    - Records transitions via FlowCollector
    - Minimal overhead when disabled
  - [x] 8.7 Ensure tracing tests pass
    - Run `pnpm test` for tracing tests
    - Verify collector functionality

**Files Created:**

- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/tracing/types.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/tracing/collector.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/tracing/noop-collector.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/tracing/memory-collector.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/tracing/tracing-runner.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/tracing/index.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/tests/tracing.test.ts`

**Acceptance Criteria:**

- All 34 tracing tests pass (5 for NoOpFlowCollector, 24 for FlowMemoryCollector, 5 for Tracing Runner Integration)
- NoOpFlowCollector has zero runtime overhead (uses singleton frozen objects)
- FlowMemoryCollector respects history limits with FIFO eviction
- Subscribers receive transition events in real-time
- Auto-pinning of slow transitions (duration >= slowThresholdMs)
- Manual pin/unpin support
- Filtering by machineId, prevState, nextState, eventType, duration range, isPinned

---

### Phase 9: Error System

#### Task Group 9: Error Hierarchy

**Dependencies:** Task Group 6

- [x] 9.0 Complete error system
  - [x] 9.1 Write 3-4 tests for error handling
    - Test InvalidTransitionError provides helpful message
    - Test errors include machine and state context
    - Test error hierarchy enables type narrowing
  - [x] 9.2 Create FlowError base class in `src/errors/base.ts`
    - Extends Error
    - `readonly code: string` - Error code for programmatic handling
    - `readonly machineId?: string` - Associated machine
  - [x] 9.3 Create specific error types in `src/errors/errors.ts`
    - `InvalidTransitionError` - No valid transition for event in current state
    - `InvalidStateError` - Referenced state does not exist
    - `InvalidEventError` - Event type not defined in machine
    - `ActivityError` - Activity execution failed
    - `EffectExecutionError` - Effect executor failed
    - `DisposedMachineError` - Operation on disposed machine
  - [x] 9.4 Export error types from `src/errors/index.ts`
  - [x] 9.5 Ensure error tests pass
    - Run `pnpm test` for error tests

**Files Created:**

- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/errors/base.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/errors/errors.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/errors/index.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/tests/errors.test.ts`

**Acceptance Criteria:**

- All 27 error tests pass
- Errors include helpful context (machine ID, state, event)
- Error codes enable programmatic error handling
- Error hierarchy supports type narrowing

---

### Phase 10: React Hooks

#### Task Group 10: React Integration Hooks

**Dependencies:** Task Groups 7, 8

- [x] 10.0 Complete React hooks
  - [x] 10.1 Write 5-7 tests for React hooks
    - Test useMachine returns current state and send function
    - Test useMachine updates on state change
    - Test useSelector derives value from state/context
    - Test useSelector uses shallow equality by default
    - Test useSend returns stable send function
    - Test unmount unsubscribes from runner
  - [x] 10.2 Create useMachine hook in `src/hooks/use-machine.ts`
    - Resolves FlowService from container via usePort
    - Uses `useSyncExternalStore` for React 18 compatibility
    - Returns `{ state, context, send, activities }`
    - Subscribes to runner on mount
    - Unsubscribes on unmount
  - [x] 10.3 Create useSelector hook in `src/hooks/use-selector.ts`
    - Takes port and selector function
    - Optional equality function (default: shallow equality)
    - Uses `useSyncExternalStore` with selector
    - Memoizes selected value
  - [x] 10.4 Create useSend hook in `src/hooks/use-send.ts`
    - Returns only the send function
    - Stable reference (doesn't change on re-render)
    - Useful for passing to child components
  - [x] 10.5 Create FlowProvider (optional) in `src/context/flow-provider.tsx`
    - Optional context provider for advanced use cases
    - Provides FlowCollector to descendants
    - DevTools integration point
  - [x] 10.6 Export all hooks from `src/index.ts`
  - [x] 10.7 Ensure React hook tests pass
    - Run `pnpm test` for React tests
    - Use @testing-library/react

**Files Created:**

- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/src/hooks/use-machine.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/src/hooks/use-selector.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/src/hooks/use-send.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/src/hooks/index.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/src/hooks/shallow-equal.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/src/context/flow-provider.tsx`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/src/context/index.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/src/index.ts`
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow-react/tests/hooks.test.tsx`

**Acceptance Criteria:**

- All 10 React hook tests pass
- Hooks use useSyncExternalStore for concurrent mode safety
- Proper cleanup on unmount
- Shallow equality prevents unnecessary re-renders

---

### Phase 11: Examples

#### Task Group 11: Reference Implementations

**Dependencies:** Task Groups 1-10

- [x] 11.0 Complete example implementations
  - [x] 11.1 Create Modal flow example
    - States: closed, opening, open, closing
    - Events: OPEN, CLOSE, ANIMATION_END
    - Effects: Animation spawning/stopping
    - File: `examples/modal-flow/`
  - [x] 11.2 Create Form submission flow example
    - States: idle, validating, submitting, success, error
    - Events: SUBMIT, VALIDATION_SUCCESS/ERROR, SUBMIT_SUCCESS/ERROR, RESET
    - Effects: Invoke validation service, submit to API
    - File: `examples/form-flow/`
  - [x] 11.3 Create Wizard flow example
    - States: step1, step2, step3, submitting, complete
    - Events: NEXT, BACK, SUBMIT_SUCCESS/ERROR
    - Guards for step validation
    - File: `examples/wizard-flow/`
  - [x] 11.4 Create Zustand integration example
    - Flow machine that syncs with Zustand store
    - Demonstrates Effect.invoke with Zustand port
    - File: `examples/zustand-integration/`
  - [x] 11.5 Create React Query integration example
    - Flow machine that invalidates React Query cache
    - Demonstrates cache coordination
    - File: `examples/react-query-integration/`
  - [ ] 11.6 Add examples to react-showcase app
    - Integrate flow examples into existing showcase
    - Add DevTools view for flow transitions

**Files Created:**

- `/Users/mohammadalmechkor/Projects/hex-di/examples/modal-flow/` (package.json, tsconfig.json, src/machine.ts, src/ports.ts, src/adapters.ts, src/ModalComponent.tsx, src/index.ts)
- `/Users/mohammadalmechkor/Projects/hex-di/examples/form-flow/` (package.json, tsconfig.json, src/machine.ts, src/ports.ts, src/adapters.ts, src/FormComponent.tsx, src/index.ts)
- `/Users/mohammadalmechkor/Projects/hex-di/examples/wizard-flow/` (package.json, tsconfig.json, src/machine.ts, src/ports.ts, src/adapters.ts, src/WizardComponent.tsx, src/index.ts)
- `/Users/mohammadalmechkor/Projects/hex-di/examples/zustand-integration/` (package.json, tsconfig.json, src/machine.ts, src/ports.ts, src/adapters.ts, src/store.ts, src/CounterComponent.tsx, src/index.ts)
- `/Users/mohammadalmechkor/Projects/hex-di/examples/react-query-integration/` (package.json, tsconfig.json, src/machine.ts, src/ports.ts, src/adapters.ts, src/types.ts, src/TodoComponent.tsx, src/index.ts)

**Acceptance Criteria:**

- [x] All examples compile without errors
- [x] Modal, Form, and Wizard flows demonstrate key features
- [x] Integration examples show real-world usage patterns
- [ ] Examples appear in react-showcase with DevTools

**Implementation Notes:**

- All 5 example packages pass type-checking with zero type casts and zero `any` types
- Examples use simplified events without payloads due to FlowService type constraints
- Local component state is used for managing form data and tracking current operation items
- Examples demonstrate the `Effect.delay()` pattern; `Effect.invoke()` usage is commented as reference for real applications

---

## Test Gap Analysis

#### Task Group 12: Test Review and Gap Filling

**Dependencies:** Task Groups 2-10

- [x] 12.0 Review and fill critical test gaps
  - [x] 12.1 Review tests from all task groups
    - Task Group 2: 24 type-level tests (types.test-d.ts)
    - Task Group 3: 25 type-level tests (effects.test-d.ts)
    - Task Group 4: 10 runtime tests (activities.test.ts)
    - Task Group 5: 25 type-level tests (machine.test-d.ts)
    - Task Group 6: 21 runner tests (runner.test.ts)
    - Task Group 7: 9 integration tests (integration.test.ts)
    - Task Group 8: 34 tracing tests (tracing.test.ts)
    - Task Group 9: 27 error tests (errors.test.ts)
    - Task Group 10: 10 React tests (hooks.test.tsx)
    - Total existing: 185 tests (1 skipped)
  - [x] 12.2 Analyze test coverage gaps for flow feature
    - Identified gaps: end-to-end workflows, self-transitions, context-driven guards,
      Effect.invoke with port resolution, entry/exit effect ordering, tracing integration,
      multiple runner instances, rapid transitions
  - [x] 12.3 Write up to 10 additional strategic tests
    - Created `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/tests/e2e.test.ts`
    - 8 strategic tests added:
      1. End-to-end machine lifecycle (create -> transitions -> subscribe -> dispose)
      2. Self-transitions (same state, context updates)
      3. Context-driven guard chains
      4. Effect.invoke with real port resolution via DIEffectExecutor
      5. Entry/exit effects ordering verification
      6. Tracing integration with complex workflow
      7. Multiple runners with same machine definition
      8. Rapid sequential transitions stress test
  - [x] 12.4 Run all feature-specific tests
    - @hex-di/flow: 182 passed, 1 skipped (183 total)
    - @hex-di/flow-react: 10 passed
    - All type tests pass with no errors
    - Total: 192 tests passing

**Files Created:**

- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/tests/e2e.test.ts`

**Acceptance Criteria:**

- [x] All feature-specific tests pass (192 total, 1 skipped)
- [x] Critical end-to-end workflows covered (8 strategic tests)
- [x] No more than 10 additional tests added (8 added)
- [x] Type-level and runtime tests both pass

---

## Execution Order

Recommended implementation sequence:

1. **Package Infrastructure** (Task Group 1)
2. **Core Types** (Task Group 2)
3. **Effect System** (Task Group 3)
4. **Activity System** (Task Group 4)
5. **Machine Definition** (Task Group 5)
6. **Machine Runner** (Task Group 6)
7. **Error System** (Task Group 9) - Can run in parallel with 6
8. **HexDI Integration** (Task Group 7)
9. **DevTools Integration** (Task Group 8)
10. **React Hooks** (Task Group 10)
11. **Examples** (Task Group 11)
12. **Test Review** (Task Group 12)

---

## Success Criteria

At the completion of all task groups:

- [x] Full type inference for states, events, transitions
- [x] Invalid transitions produce compile-time errors
- [x] Zero runtime overhead when DevTools disabled
- [x] All reference examples working (Modal, Form, Wizard)
- [ ] Full DevTools integration with timeline view
- [x] All tests pass (runtime + type-level)
- [x] React hooks work with @hex-di/react
- [x] Integration examples with Zustand/React Query
