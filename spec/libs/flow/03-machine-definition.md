# 5. Machine Definition

This section specifies the API for defining state machines. `defineMachine()` is the entry point, offering an ergonomic builder experience with full type inference.

---

## 5.1 defineMachine()

`defineMachine()` is the primary API for creating state machines. It accepts a single configuration object and returns a branded, deeply frozen `Machine` instance with full type inference.

### Improved API

```typescript
const orderMachine = defineMachine({
  id: "order",
  context: { orderId: "", items: [] as Item[], total: 0 },
  states: {
    idle: {
      on: { START: "validating" },
    },
    validating: {
      entry: [Effect.invoke(ValidatePort, "validate", [])],
      on: {
        VALID: "processing",
        INVALID: "error",
      },
    },
    processing: {
      entry: [Effect.invoke(PaymentPort, "charge", [])],
      on: {
        CHARGED: {
          target: "completed",
          actions: [(ctx, evt) => ({ ...ctx, total: evt.payload.amount })],
        },
        CHARGE_FAILED: "error",
      },
    },
    completed: { type: "final" },
    error: { type: "final" },
  },
});
```

### Key improvements over current API

**Before (verbose style):**

```typescript
const machine = defineMachine({
  id: "order",
  initial: "idle",
  context: { orderId: "", items: [] as Item[], total: 0 },
  states: {
    idle: {
      on: {
        START: { target: "validating" },
      },
    },
    validating: {
      entry: [Effect.invoke(ValidatePort, "validate", [])],
      on: {
        VALID: { target: "processing" },
        INVALID: { target: "error" },
      },
    },
    processing: {
      entry: [Effect.invoke(PaymentPort, "charge", [])],
      on: {
        CHARGED: {
          target: "completed",
          actions: [(ctx, evt) => ({ ...ctx, total: evt.payload.amount })],
        },
        CHARGE_FAILED: { target: "error" },
      },
    },
    completed: { on: {} },
    error: { on: {} },
  },
});
```

**After (improved API with `defineMachine`):**

- **String shorthand for targets**: `START: 'validating'` instead of `START: { target: 'validating' }`. When a transition has no guard, actions, or effects, use the string shorthand.
- **`initial` inferred from first state key**: The first key in the `states` record becomes the initial state by default. Can be overridden with an explicit `initial` property.
- **`type: 'final'` for terminal states**: Instead of requiring `on: {}` to indicate finality, use `{ type: 'final' }`. Final states have no `on` record.
- **Optional `on` record**: States without transitions (final states) do not need to declare `on: {}`.

---

## 5.2 Type Inference

The machine definition leverages TypeScript's `const` type parameter modifiers and mapped types to infer all type information from the configuration object. No explicit generic parameters are needed in the common case.

### What is inferred

| Inferred Type      | Source                                                         |
| ------------------ | -------------------------------------------------------------- |
| State names union  | Keys of the `states` record                                    |
| Event names union  | All keys across every state's `on` record                      |
| Context type       | Type of the `context` property value                           |
| Initial state      | First key in `states` (or explicit `initial`)                  |
| Transition targets | Constrained to state names union (compile-time error on typos) |

### How inference works

```typescript
function defineMachine<
  const TStates extends Record<string, StateNodeInput>,
  const TContext,
>(config: {
  readonly id: string;
  readonly initial?: keyof TStates & string;
  readonly context: TContext;
  readonly states: TStates;
}): Machine<Extract<keyof TStates, string>, ExtractAllEventNames<TStates>, TContext>;
```

The `const` modifier on `TStates` preserves literal types for all state names and event names. Without `const`, TypeScript would widen `'idle' | 'loading'` to `string`.

### Compile-time validation examples

```typescript
defineMachine({
  id: "example",
  context: undefined,
  states: {
    idle: { on: { GO: "active" } },
    active: { on: { STOP: "idle" } },
  },
});
// OK: 'active' and 'idle' are valid targets

defineMachine({
  id: "example",
  context: undefined,
  states: {
    idle: { on: { GO: "nonexistent" } },
    //                 ^^^^^^^^^^^^ Type error: not assignable to 'idle' | 'active'
    active: { on: {} },
  },
});
```

---

## 5.3 Machine Configuration Types

### MachineConfig

The full configuration type accepted by `defineMachine()`:

```typescript
interface MachineConfig<TStateNames extends string, TEventNames extends string, TContext> {
  readonly id: string;
  readonly initial?: TStateNames; // optional, defaults to first state key
  readonly context: TContext; // required (use undefined for no context)
  readonly states: {
    readonly [K in TStateNames]: StateNodeConfig<TStateNames, TEventNames, TContext>;
  };
}
```

### StateNodeConfig

Each state in the `states` record:

```typescript
interface StateNodeConfig<TAllStates extends string, TAllEventNames extends string, TContext> {
  readonly type?: "final"; // marks as terminal state
  readonly entry?: readonly EffectAny[]; // effects on state entry
  readonly exit?: readonly EffectAny[]; // effects on state exit
  readonly on?: StateNodeTransitions<TAllStates, TAllEventNames, TContext>; // event->transition map
}
```

### TransitionConfig

Individual transition configurations (unchanged from core, but with string shorthand support):

```typescript
// Full form
interface TransitionConfig<TAllStates, TTarget, TEvent, TContext> {
  readonly target: TTarget;
  readonly guard?: (context: TContext, event: TEvent) => boolean;
  readonly actions?: readonly ((context: TContext, event: TEvent) => TContext)[];
  readonly effects?: readonly EffectAny[];
}

// Shorthand: just a target state name string
type TransitionInput<TAllStates, TEvent, TContext> =
  | TAllStates // string shorthand
  | TransitionConfig<TAllStates, TAllStates, TEvent, TContext> // full object
  | readonly TransitionConfig<TAllStates, TAllStates, TEvent, TContext>[]; // guarded array
```

The `defineMachine()` implementation normalizes string shorthands into full `TransitionConfig` objects at creation time, so the resulting `Machine` always contains the full form internally.

### EffectAny

The discriminated union tag type covering all effect descriptors:

```typescript
interface EffectAny {
  readonly _tag: "Invoke" | "Spawn" | "Stop" | "Emit" | "Delay" | "Parallel" | "Sequence" | "None";
}
```

---

## 5.4 defineMachine

`defineMachine` is the sole factory function for creating state machines:

- Accepts string shorthand transitions.
- Infers initial state from first key.
- Supports `type: 'final'` on states.
- Normalizes all shorthands internally.
- Returns a deeply frozen `Machine`.

```typescript
const machine = defineMachine({
  id: "toggle",
  context: { enabled: false },
  states: {
    off: { on: { TOGGLE: "on" } },
    on: { on: { TOGGLE: "off" } },
  },
});
// Type: Machine<'off' | 'on', 'TOGGLE', { enabled: boolean }>
```

### Immutability guarantee

`defineMachine` deeply freezes the returned object via `Object.freeze()` recursion. Attempted mutation throws in strict mode and silently fails otherwise. This matches the `DeepReadonly` constraint at the type level.

---

## 5.5 Machine Composition

Machines can be composed by invoking one machine as a child of another. Child machines are spawned via effects and communicate with the parent through events.

### Invoking a child machine

A state's entry effect can spawn a child machine runner:

```typescript
const parentMachine = defineMachine({
  id: "checkout",
  context: { paymentResult: null },
  states: {
    collecting: {
      on: { SUBMIT: "paying" },
    },
    paying: {
      entry: [Effect.spawn("payment", { orderId: "123" })],
      on: {
        PAYMENT_DONE: {
          target: "done",
          actions: [(ctx, evt) => ({ ...ctx, paymentResult: evt.payload.result })],
        },
        PAYMENT_FAILED: "collecting",
      },
    },
    done: { type: "final" },
  },
});
```

The spawned activity (backed by its own machine) emits events (`PAYMENT_DONE`, `PAYMENT_FAILED`) back to the parent via the `EventSink`. The parent sees these as regular events and transitions accordingly.

### Composition model

- **Hierarchical**: Parent spawns child. Child communicates back via events.
- **Isolation**: Each child machine has its own context, state, and lifecycle.
- **Lifecycle**: Child machines are stopped when the parent exits the state that spawned them (via exit effects with `Effect.stop()`).
- **No shared state**: Parent and child do not share context. Data flows via event payloads.

### Activity-based child machines

Child machines are implemented as activities (`ConfiguredActivity`). The activity's `execute` function creates and runs a `MachineRunner` for the child machine, forwarding events from the child to the parent's `EventSink`:

```typescript
const PaymentActivity = activity(PaymentActivityPort, {
  requires: [PaymentServicePort] as const,
  emits: defineEvents({ PAYMENT_DONE: {}, PAYMENT_FAILED: {} }),
  async execute(input, { deps, sink, signal }) {
    const childRunner = createMachineRunner(paymentMachine, { ... });
    // Run child machine, emit results to parent via sink
    // Respect signal for cancellation
  },
});
```

---

## 5.6 Machine Identity

The `id` property on every machine is a string identifier used throughout the system.

### Purpose

| Use Case           | How `id` is used                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| **Tracing**        | `FlowTransitionEvent` records include `machineId` for filtering and correlation                          |
| **DevTools**       | Machine ID appears in transition logs, state visualizations, and timeline views                          |
| **Child machines** | Parent machines reference children by activity ID, which conventionally mirrors the child machine's `id` |
| **Debugging**      | Error messages include the machine ID for context                                                        |
| **Serialization**  | Machine ID serves as a key when persisting/restoring machine state                                       |

### Conventions

- Machine IDs should be unique within an application.
- Use lowercase kebab-case: `'order-checkout'`, `'auth-flow'`, `'modal-dialog'`.
- Child machine IDs should be descriptive of their role: `'payment-sub'`, `'validation-step'`.

### How it flows through the system

```typescript
// 1. Defined on the machine
const machine = defineMachine({ id: 'order-checkout', ... });

// 2. Passed to runner
const runner = createMachineRunner(machine, options);

// 3. Included in tracing events
collector.collect({
  machineId: machine.id,   // 'order-checkout'
  prevState: 'idle',
  event: { type: 'START' },
  nextState: 'validating',
  effects: [...],
  timestamp: Date.now(),
});

// 4. Used in FlowAdapter registration
const OrderFlowAdapter = createFlowAdapter({
  provides: OrderFlowPort,
  requires: [...],
  machine,   // machine.id = 'order-checkout'
});
```

The `id` is set once at machine creation time and is immutable (frozen along with the rest of the machine definition). It is accessible via `machine.id` on the `Machine` type.
