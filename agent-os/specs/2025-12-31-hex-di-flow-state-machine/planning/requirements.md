# Requirements: @hex-di/flow State Machine

## Overview

Two packages implementing a typed state machine runtime for HexDI:

1. **@hex-di/flow** - Core state machine with branded types, effects, activities
2. **@hex-di/flow-react** - React hooks integration

## Core Principles

- **Maximum type safety** - Like Rust, zero runtime type errors possible
- **Maximum type inference** - Minimal explicit annotations required
- **Zero type casts** - No `as X` anywhere in implementation
- **Zero `any`/`unknown`** - Except branded type internals
- **Hexagonal architecture** - Effects as ports, executors as adapters

---

## Type System Requirements

### R1: Branded State Types

```typescript
// State with discriminator and context
type State<TName extends string, TContext = void> = {
  readonly [__stateBrand]: [TName, TContext];
  readonly name: TName;
} & (TContext extends void ? {} : { readonly context: DeepReadonly<TContext> });
```

### R2: Branded Event Types

```typescript
// Event with conditional payload (void = no payload property)
type Event<TName extends string, TPayload = void> = {
  readonly [__eventBrand]: [TName, TPayload];
  readonly type: TName;
} & (TPayload extends void ? {} : { readonly payload: TPayload });
```

### R3: Deep Immutability

```typescript
// All context must be deeply readonly at type level
type DeepReadonly<T> = T extends readonly (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
```

### R4: Typed Port Tokens for Effects

```typescript
// Effects reference ports via typed tokens, not strings
type InvokeEffect<
  TPort extends Port<unknown, string>,
  TMethod extends MethodNames<InferService<TPort>>,
  TArgs extends MethodParams<InferService<TPort>, TMethod>,
> = {
  readonly _tag: "Invoke";
  readonly port: TPort;
  readonly method: TMethod;
  readonly args: TArgs;
  readonly __resultType: MethodReturn<InferService<TPort>, TMethod>;
};
```

---

## Effect System Requirements

### R5: Effect Descriptors as Data

Effects are pure data structures (commands), not side effects:

- `InvokeEffect` - Call a port method
- `SpawnEffect` - Start an activity
- `StopEffect` - Stop an activity
- `EmitEffect` - Emit an event back to machine
- `DelayEffect` - Wait for duration
- `ParallelEffect` - Run effects concurrently
- `SequenceEffect` - Run effects in order
- `NoneEffect` - No-op

### R6: Effect Constructors with Full Inference

```typescript
// Must infer all types from port token
Effect.invoke(UserServicePort, "getUser", [userId]);
// Infers: InvokeEffect<typeof UserServicePort, 'getUser', [string]>
```

### R7: DIEffectExecutor with ScopePort

- Executor receives scope at creation via ScopePort pattern
- Resolves ports from container scope
- Handles effect result routing back to machine

---

## Activity System Requirements

### R8: Full Activity Interface

```typescript
interface Activity<TInput, TOutput> {
  execute(input: TInput, sink: EventSink, signal: AbortSignal): Promise<TOutput>;
}

interface EventSink {
  emit<E extends Event<string, unknown>>(event: E): void;
}
```

### R9: Activity Cleanup via AbortSignal

- Activities receive AbortSignal for cancellation
- Must clean up resources when signal aborts
- EventSink for emitting events during execution

---

## Machine Definition Requirements

### R10: Flat States Only (v1)

- No nested or parallel states in v1
- For complex state management, recommend Zustand/Jotai
- States can declare entry/exit effects

### R11: Type-Safe Transitions

- Invalid target states produce compile-time errors
- Guards must return boolean
- Actions receive typed context and event

### R12: Compile-Time Validation

Machine definition must fail at compile time for:

- Invalid initial state
- Invalid transition targets
- Event payload mismatches
- Context type mismatches
- Guard return type errors

---

## Machine Runner Requirements

### R13: Runner Interface

```typescript
interface MachineRunner<TState, TEvent, TContext> {
  snapshot(): MachineSnapshot<TState, TContext>;
  state(): TState;
  context(): TContext;
  send(event: TEvent): readonly Effect[]; // Pure - returns effects
  sendAndExecute(event: TEvent): Promise<void>; // Executes effects
  subscribe(callback: (snapshot: MachineSnapshot<TState, TContext>) => void): () => void;
  getActivityStatus(id: string): ActivityStatus | undefined;
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
}
```

### R14: Explicit Disposal

- Caller owns machine lifecycle
- `dispose()` stops activities and cleans up
- Final states don't auto-dispose

---

## HexDI Integration Requirements

### R15: FlowService as Scoped (Default)

- FlowService lifetime is scoped by default
- Matches React component lifecycle
- Can override to singleton if needed

### R16: FlowAdapter Pattern

```typescript
const modalFlowAdapter = createFlowAdapter({
  provides: ModalServicePort,
  requires: [AnimationPort] as const,
  lifetime: "scoped",
  machine: modalMachine,
});
```

---

## DevTools Integration Requirements

### R17: Zero-Cost Collector

- NoOpFlowCollector when DevTools disabled
- Zero overhead in production

### R18: FlowCollector Interface

```typescript
interface FlowCollector {
  collect(event: FlowTransitionEvent): void;
  getTransitions(filter?: FlowTransitionFilter): readonly FlowTransitionEvent[];
  getStats(): FlowStats;
  clear(): void;
  subscribe(callback: (event: FlowTransitionEvent) => void): () => void;
}
```

### R19: Configurable History Limits

- Default: 1000 transitions
- Configurable via FlowCollector options
- Circular buffer for memory efficiency

### R20: Timeline Integration

- Flow transitions appear in DI DevTools timeline
- Unified view of container resolutions + state transitions

---

## React Integration Requirements

### R21: useMachine Hook

```typescript
function useMachine<TState, TEvent, TContext>(
  port: Port<FlowService<TState, TEvent, TContext>, string>
): {
  state: TState;
  context: TContext;
  send: (event: TEvent) => Promise<void>;
  activities: readonly ActivityInstance[];
};
```

### R22: useSelector Hook

```typescript
function useSelector<TState, TContext, TSelected>(
  port: Port<FlowService<TState, unknown, TContext>, string>,
  selector: (state: TState, context: TContext) => TSelected,
  equals?: (a: TSelected, b: TSelected) => boolean // Default: shallow
): TSelected;
```

### R23: useSend Hook

```typescript
function useSend<TEvent>(
  port: Port<FlowService<unknown, TEvent, unknown>, string>
): (event: TEvent) => Promise<void>;
```

### R24: Unmount Behavior

- Unmount only unsubscribes from runner
- Scope owns machine lifecycle (not React)
- Clean separation of concerns

### R25: useSyncExternalStore

- Use React 18's useSyncExternalStore
- Concurrent mode compatible
- Proper tearing prevention

---

## Package Structure

```
packages/
├── flow/                    # @hex-di/flow
│   ├── src/
│   │   ├── machine/         # State, Event, Machine types
│   │   ├── runner/          # MachineRunner, Snapshot
│   │   ├── effects/         # Effect descriptors
│   │   ├── activities/      # Activity types and manager
│   │   ├── integration/     # HexDI adapter
│   │   ├── tracing/         # FlowCollector interface
│   │   └── errors/          # Error hierarchy
│   └── tests/
│
└── flow-react/              # @hex-di/flow-react
    ├── src/
    │   ├── hooks/           # useMachine, useSelector, useSend
    │   └── context/         # FlowProvider (optional)
    └── tests/
```

---

## Non-Goals (v1)

- Nested/parallel states (use external libraries)
- Visual state chart editor
- State persistence/hydration
- Time-travel debugging (defer to v2)
- Actor model (spawn child machines)

---

## Success Criteria

- [ ] Full type inference for states, events, transitions
- [ ] Invalid transitions produce compile-time errors
- [ ] Zero runtime overhead when DevTools disabled
- [ ] All reference examples working (Modal, Form, Wizard)
- [ ] Full DevTools integration with timeline view
- [ ] Tests pass (runtime + type-level)
- [ ] React hooks work with @hex-di/react
- [ ] Integration examples with Zustand/React Query/Jotai
