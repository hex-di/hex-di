# Specification: @hex-di/flow State Machine

## Goal

Create a typed state machine runtime for HexDI that provides maximum type safety (like Rust), full type inference, zero type casts, and seamless integration with the existing @hex-di ecosystem for managing complex UI state transitions.

## User Stories

- As a developer, I want to define state machines with compile-time validation of transitions so that invalid state changes produce type errors rather than runtime bugs
- As a developer, I want to integrate state machines with HexDI containers so that effects can invoke port methods and activities can emit events with full type safety

## Specific Requirements

**R1: Branded State Types**

- State type must use unique symbol brand for nominal typing following Port pattern in `@hex-di/ports`
- State has `name: TName` property (string literal type)
- Context is conditionally included only when `TContext` is not `void`
- Context must be `DeepReadonly<TContext>` at type level to enforce immutability
- Provide `State<TName, TContext>` generic type
- Provide factory function `state<TName, TContext>()` for creating state values
- State brand encodes both name and context type for type-safe narrowing

**R2: Branded Event Types**

- Event type must use unique symbol brand for nominal typing
- Event has `type: TName` property (string literal type)
- Payload is conditionally included only when `TPayload` is not `void`
- Provide `Event<TName, TPayload>` generic type
- Provide factory function `event<TName, TPayload>()` for creating event values
- Event brand encodes both name and payload type for type-safe send() calls

**R3: Effect Descriptors as Pure Data**

- Effects are data structures (commands) not side effects
- `InvokeEffect`: Call a port method with typed args and return
- `SpawnEffect`: Start an activity by ID and port reference
- `StopEffect`: Stop a running activity by ID
- `EmitEffect`: Emit an event back to the machine
- `DelayEffect`: Wait for specified milliseconds
- `ParallelEffect`: Run multiple effects concurrently
- `SequenceEffect`: Run multiple effects in order
- `NoneEffect`: No-op effect for conditional branching

**R4: Effect Constructors with Full Inference**

- `Effect.invoke(port, method, args)` must infer all types from port token
- `Effect.spawn(activityId, activityPort, input)` must infer input type
- `Effect.stop(activityId)` takes activity ID string
- `Effect.emit(event)` must type-check event against machine's event union
- `Effect.delay(ms)` takes number of milliseconds
- `Effect.parallel(effects)` takes readonly array of effects
- `Effect.sequence(effects)` takes readonly array of effects
- `Effect.none()` returns NoneEffect singleton

**R5: Activity System with EventSink + AbortSignal**

- `Activity<TInput, TOutput>` interface with `execute(input, sink, signal)` method
- `EventSink` interface with `emit(event)` method for sending events to machine
- Activities receive `AbortSignal` for cancellation/cleanup
- `ActivityStatus` type: `'pending' | 'running' | 'completed' | 'failed' | 'cancelled'`
- ActivityManager tracks running activities and handles cleanup
- Activity port tokens use same Port pattern as services

**R6: Flat States Only (v1)**

- No nested states or parallel state regions in v1
- Each state can declare `entry` and `exit` effects arrays
- States define `on` object mapping event types to transitions
- For complex nested state needs, recommend Zustand/Jotai alongside @hex-di/flow
- Design allows future extension to hierarchical states

**R7: Type-Safe Transitions**

- TransitionConfig has `target`, optional `guard`, optional `actions`, optional `effects`
- Invalid target state names produce compile-time errors
- Guards receive `(context, event)` and must return `boolean`
- Actions receive `(context, event)` and return new context (pure function)
- Effects array is executed after state transition completes
- Multiple transitions for same event are matched by guard evaluation order

**R8: Machine Definition Factory**

- `createMachine(config)` returns branded Machine type
- Config has `id`, `initial`, `states` object, optional `context` initial value
- Initial state must exist in states object (compile-time check)
- Machine type encodes all states, events, and context for full inference
- States object keys must match state name string literals
- Export `Machine<TState, TEvent, TContext>` type for explicit typing

## Visual Design

No visual assets provided for this specification.

## Existing Code to Leverage

**Port and Brand Pattern (`@hex-di/ports`)**

- Use same `declare const __brand: unique symbol` pattern for State and Event brands
- Follow `createPort<TName, TService>(name)` curried factory pattern for state/event creation
- Leverage `InferService`, `InferPortName` patterns for `InferStateName`, `InferStateContext`, `InferEventName`, `InferEventPayload` utilities
- Use `Object.freeze()` for immutable runtime values

**Adapter and Graph Pattern (`@hex-di/graph`)**

- Follow `Adapter<TProvides, TRequires, TLifetime>` pattern for FlowAdapter
- Use `AdapterAny` approach for `MachineAny` universal constraint (no `any` types)
- Apply `ResolvedDeps<TRequires>` pattern for dependency injection in machine factories
- Leverage `Lifetime` type and factory patterns

**Plugin System (`@hex-di/runtime`)**

- Follow `Plugin<TSymbol, TApi>` pattern for FlowPlugin if needed
- Use `PluginApiMap` pattern for type-safe symbol access
- Apply `PluginHooks` pattern for FlowCollector lifecycle hooks
- Leverage `ScopeEventEmitter` pattern for machine lifecycle events

**TraceCollector Pattern (`@hex-di/tracing`)**

- Follow `TraceCollector` interface for `FlowCollector` design
- Use `MemoryCollector` / `NoOpCollector` dual implementation pattern
- Apply `TraceEntry`, `TraceStats`, `TraceFilter` patterns for flow types
- Leverage circular buffer with FIFO eviction and pinning support

**Resolver and React Hooks (`@hex-di/react`)**

- Follow `Resolver<TProvides>` interface pattern for MachineRunner
- Use `usePort` hook pattern for `useMachine`, `useSelector`, `useSend`
- Apply `ResolverContext` pattern if FlowProvider needed
- Leverage `useSyncExternalStore` for React 18 compatibility

## Out of Scope

- Nested/parallel/hierarchical states (use external libraries like XState for complex state charts)
- Visual state chart editor or designer tool
- State persistence, serialization, or hydration
- Time-travel debugging (defer to v2)
- Actor model with spawning child machines
- State machine visualization in DevTools (defer to v2)
- Automatic state machine code generation from diagrams
- Async guards (guards must be synchronous boolean functions)
- Built-in retry or timeout policies for effects
- Machine composition or machine references
