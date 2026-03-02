---
sidebar_position: 1
title: States & Events
---

# States & Events

Flow uses branded types to provide compile-time safety and full type inference for states and events.

## Branded Types

Flow employs a technique called "branding" to create nominal types for states and events. This ensures that two structurally similar types are not accidentally interchangeable, providing an extra layer of type safety.

```typescript
import { State, Event } from "@hex-di/flow";

// States are branded with their name and optional context
type IdleState = State<"idle">;
type LoadingState = State<"loading", { requestId: string }>;
type SuccessState = State<"success", { data: string }>;

// Events are branded with their name and optional payload
type FetchEvent = Event<"FETCH">;
type ResolvedEvent = Event<"RESOLVED", { data: string }>;
type RejectedEvent = Event<"REJECTED", { error: Error }>;
```

## State Configuration

States can be configured with various options:

### Entry and Exit Effects

States can define effects that run when entering or exiting the state:

```typescript
import { defineMachine, Effect } from "@hex-di/flow";

const machine = defineMachine({
  id: "example",
  initial: "idle",
  states: {
    idle: {
      entry: [Effect.log("Entering idle state")],
      exit: [Effect.log("Exiting idle state")],
      on: {
        START: { target: "running" },
      },
    },
    running: {
      entry: [Effect.log("Starting process"), Effect.spawn("longRunningTask", { taskId: "123" })],
      exit: [Effect.stop("longRunningTask"), Effect.log("Process stopped")],
      on: {
        STOP: { target: "idle" },
      },
    },
  },
});
```

### Compound States

States can contain child states, creating a hierarchy:

```typescript
const machine = defineMachine({
  id: "authentication",
  initial: "unauthenticated",
  states: {
    unauthenticated: {
      on: {
        LOGIN: { target: "authenticating" },
      },
    },
    authenticating: {
      initial: "checking",
      states: {
        checking: {
          on: {
            VALID: { target: "verifying" },
            INVALID: { target: "#authentication.unauthenticated" },
          },
        },
        verifying: {
          on: {
            SUCCESS: { target: "#authentication.authenticated" },
            FAILURE: { target: "#authentication.unauthenticated" },
          },
        },
      },
    },
    authenticated: {
      on: {
        LOGOUT: { target: "unauthenticated" },
      },
    },
  },
});
```

### History States

History states remember the previous state when re-entering a compound state:

```typescript
const machine = defineMachine({
  id: "editor",
  initial: "editing",
  states: {
    editing: {
      initial: "normal",
      states: {
        normal: {
          on: { BOLD: { target: "bold" } },
        },
        bold: {
          on: { NORMAL: { target: "normal" } },
        },
        hist: { type: "history" },
      },
      on: {
        SAVE: { target: "saving" },
      },
    },
    saving: {
      on: {
        SUCCESS: { target: "editing.hist" }, // Returns to previous editing state
      },
    },
  },
});
```

## Event Configuration

Events carry typed payloads that are fully inferred:

```typescript
import { defineMachine } from "@hex-di/flow";

interface User {
  id: string;
  name: string;
}

const machine = defineMachine({
  id: "user-manager",
  initial: "idle",
  context: { users: [] as User[] },
  states: {
    idle: {
      on: {
        ADD_USER: {
          target: "idle",
          actions: [
            (ctx, event) => ({
              users: [...ctx.users, event.payload], // Payload is typed as User
            }),
          ],
        },
        REMOVE_USER: {
          target: "idle",
          actions: [
            (ctx, event) => ({
              users: ctx.users.filter(u => u.id !== event.payload.id),
            }),
          ],
        },
      },
    },
  },
});

// Type-safe event sending
const runner = createMachineRunner(machine);
runner.send({ type: "ADD_USER", payload: { id: "1", name: "Alice" } }); // ✓
runner.send({ type: "ADD_USER", payload: { id: "2" } }); // ✗ Type error: missing 'name'
```

## Type Inference Utilities

Flow provides utilities to extract type information from machines:

```typescript
import {
  InferStateName,
  InferStateContext,
  InferEventName,
  InferEventPayload,
  InferMachineState,
  InferMachineEvent,
  InferMachineContext,
} from "@hex-di/flow";

// Extract state names
type StateNames = InferMachineState<typeof machine>; // 'idle' | 'loading' | 'success'

// Extract event names
type EventNames = InferMachineEvent<typeof machine>; // 'FETCH' | 'RESOLVED' | 'REJECTED'

// Extract context type
type Context = InferMachineContext<typeof machine>; // { data: string | null }

// Extract payload for specific event
type FetchPayload = InferEventPayload<FetchEvent>; // void
type ResolvedPayload = InferEventPayload<ResolvedEvent>; // { data: string }
```

## Universal Types

For functions that work with any state, event, or machine:

```typescript
import { StateAny, EventAny, MachineAny } from "@hex-di/flow";

// Function that works with any state
function logState(state: StateAny): void {
  console.log(`Current state: ${state}`);
}

// Function that works with any event
function logEvent(event: EventAny): void {
  console.log(`Event: ${event.type}`);
}

// Function that works with any machine
function getMachineId(machine: MachineAny): string {
  return machine.id;
}
```

## DeepReadonly for Immutability

Flow ensures immutability by making all state and context values deeply readonly:

```typescript
import { DeepReadonly } from "@hex-di/flow";

interface AppContext {
  user: {
    profile: {
      name: string;
      settings: {
        theme: string;
      };
    };
  };
}

// DeepReadonly makes all nested properties readonly
type ReadonlyContext = DeepReadonly<AppContext>;

// In actions, you must return new objects, not mutate
const updateTheme = (ctx: ReadonlyContext, event: any) => ({
  user: {
    ...ctx.user,
    profile: {
      ...ctx.user.profile,
      settings: {
        ...ctx.user.profile.settings,
        theme: event.payload.theme, // Can't mutate directly
      },
    },
  },
});
```

## Best Practices

1. **Use descriptive state names**: States should represent clear, distinct conditions
2. **Keep event names in UPPER_CASE**: This is a common convention for events
3. **Model context explicitly**: Define interfaces for your context to get full type safety
4. **Leverage compound states**: Use hierarchy to model complex state relationships
5. **Avoid state explosion**: Use context for data that changes frequently
6. **Use history states sparingly**: They add complexity but are useful for certain UI patterns
