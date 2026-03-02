---
sidebar_position: 2
title: Transitions
---

# Transitions

Transitions define how your machine moves between states in response to events. Flow provides rich configuration options for transitions including guards, actions, effects, and validation.

## TransitionConfig

Each transition is configured with a `TransitionConfig` object:

```typescript
interface TransitionConfig {
  target: string; // Target state
  guard?: Guard; // Condition to check
  actions?: Action[]; // Context reducers
  effects?: Effect[]; // Side effects
  internal?: boolean; // Skip entry/exit effects
  validate?: boolean; // Enable event validation (GxP)
}
```

## Basic Transitions

The simplest transition just specifies a target state:

```typescript
import { defineMachine } from "@hex-di/flow";

const machine = defineMachine({
  id: "toggle",
  initial: "off",
  states: {
    off: {
      on: {
        TOGGLE: { target: "on" },
      },
    },
    on: {
      on: {
        TOGGLE: { target: "off" },
      },
    },
  },
});
```

## Guards

Guards are boolean functions that determine if a transition should occur:

```typescript
import { defineMachine, guard } from "@hex-di/flow";

const machine = defineMachine({
  id: "counter",
  initial: "counting",
  context: { count: 0 },
  states: {
    counting: {
      on: {
        INCREMENT: {
          target: "counting",
          guard: guard(ctx => ctx.count < 10),
          actions: [ctx => ({ count: ctx.count + 1 })],
        },
        DECREMENT: {
          target: "counting",
          guard: guard(ctx => ctx.count > 0),
          actions: [ctx => ({ count: ctx.count - 1 })],
        },
      },
    },
  },
});
```

### Combining Guards

You can combine guards using logical operators:

```typescript
import { guard, and, or, not } from "@hex-di/flow";

const isAuthenticated = guard(ctx => ctx.isLoggedIn);
const hasPermission = guard((ctx, event) => ctx.user.roles.includes(event.payload.role));
const isNotBanned = guard(ctx => !ctx.user.isBanned);

const machine = defineMachine({
  id: "access-control",
  initial: "idle",
  context: { isLoggedIn: false, user: null },
  states: {
    idle: {
      on: {
        ACCESS: {
          target: "granted",
          guard: and(isAuthenticated, hasPermission, isNotBanned),
        },
        RESTRICTED: {
          target: "denied",
          guard: or(not(isAuthenticated), not(hasPermission)),
        },
      },
    },
    granted: {},
    denied: {},
  },
});
```

## Actions

Actions are pure functions that update the machine's context:

```typescript
import { defineMachine, defineAction } from "@hex-di/flow";

// Define reusable actions
const increment = defineAction("increment", ctx => ({
  count: ctx.count + 1,
}));

const addAmount = defineAction("addAmount", (ctx, event) => ({
  count: ctx.count + event.payload.amount,
}));

const machine = defineMachine({
  id: "counter",
  initial: "active",
  context: { count: 0 },
  states: {
    active: {
      on: {
        INCREMENT: {
          target: "active",
          actions: [increment],
        },
        ADD: {
          target: "active",
          actions: [addAmount],
        },
        RESET: {
          target: "active",
          actions: [ctx => ({ count: 0 })],
        },
      },
    },
  },
});
```

### Composing Actions

Actions can be composed to run in sequence:

```typescript
import { composeActions } from "@hex-di/flow";

const resetAndLog = composeActions(
  ctx => ({ count: 0 }),
  ctx => {
    console.log("Count reset");
    return ctx;
  }
);

const machine = defineMachine({
  id: "example",
  initial: "active",
  context: { count: 5 },
  states: {
    active: {
      on: {
        RESET: {
          target: "active",
          actions: [resetAndLog],
        },
      },
    },
  },
});
```

## Effects

Effects are data descriptors for side effects that run after a transition completes:

```typescript
import { defineMachine, Effect } from "@hex-di/flow";

const machine = defineMachine({
  id: "data-fetcher",
  initial: "idle",
  context: { data: null, error: null },
  states: {
    idle: {
      on: {
        FETCH: {
          target: "loading",
          effects: [
            Effect.log("Starting fetch..."),
            Effect.invoke("DataService", "fetchData", { id: "123" }),
          ],
        },
      },
    },
    loading: {
      on: {
        SUCCESS: {
          target: "success",
          actions: [(ctx, event) => ({ data: event.payload.data })],
          effects: [Effect.log("Data loaded successfully")],
        },
        FAILURE: {
          target: "error",
          actions: [(ctx, event) => ({ error: event.payload.error })],
          effects: [Effect.log("Fetch failed"), Effect.delay(5000), Effect.emit({ type: "RETRY" })],
        },
      },
    },
    success: {},
    error: {
      on: {
        RETRY: { target: "idle" },
      },
    },
  },
});
```

## Internal Transitions

Internal transitions don't trigger entry/exit effects:

```typescript
const machine = defineMachine({
  id: "form",
  initial: "editing",
  context: { values: {}, dirty: false },
  states: {
    editing: {
      entry: [Effect.log("Form opened")],
      exit: [Effect.log("Form closed")],
      on: {
        UPDATE_FIELD: {
          target: "editing",
          internal: true, // Won't trigger entry/exit
          actions: [
            (ctx, event) => ({
              values: { ...ctx.values, [event.payload.field]: event.payload.value },
              dirty: true,
            }),
          ],
        },
        SUBMIT: {
          target: "submitting", // Will trigger exit effect
        },
      },
    },
    submitting: {},
  },
});
```

## Event Validation

For GxP compliance, you can enable strict event validation:

```typescript
const machine = defineMachine({
  id: "validated",
  initial: "idle",
  states: {
    idle: {
      on: {
        SUBMIT: {
          target: "processing",
          validate: true, // Enables runtime validation
          guard: guard((ctx, event) => {
            // Additional validation logic
            return event.payload.amount > 0 && event.payload.amount <= 1000;
          }),
        },
      },
    },
    processing: {},
  },
});

// Runtime validation will check event structure
const runner = createMachineRunner(machine, {
  eventValidator: event => {
    // Custom validation logic
    if (!event.type) return false;
    if (event.type === "SUBMIT" && !event.payload?.amount) return false;
    return true;
  },
});
```

## Compound State Auto-Entry

When transitioning to a compound state, Flow automatically enters the initial child state:

```typescript
const machine = defineMachine({
  id: "wizard",
  initial: "setup",
  states: {
    setup: {
      initial: "step1",
      states: {
        step1: {
          on: { NEXT: { target: "step2" } },
        },
        step2: {
          on: { NEXT: { target: "step3" } },
        },
        step3: {
          on: { COMPLETE: { target: "#wizard.complete" } },
        },
      },
      on: {
        CANCEL: { target: "cancelled" },
      },
    },
    complete: {},
    cancelled: {},
  },
});

// Transitioning to 'setup' automatically enters 'setup.step1'
```

## Transition Matching Rules

Flow uses specific rules for matching transitions:

1. **Exact State Match**: Transitions are first matched against the current state
2. **Parent State Match**: If no match, Flow checks parent states (bubbling)
3. **Guard Evaluation**: Guards are evaluated to determine if transition is allowed
4. **First Match Wins**: When multiple transitions match, the first valid one is taken

```typescript
const machine = defineMachine({
  id: "hierarchy",
  initial: "parent",
  states: {
    parent: {
      initial: "child",
      states: {
        child: {
          on: {
            EVENT: { target: "sibling" }, // Specific handler
          },
        },
        sibling: {},
      },
      on: {
        EVENT: { target: "other" }, // Parent handler (fallback)
        GLOBAL: { target: "other" }, // Available from any child
      },
    },
    other: {},
  },
});
```

## Best Practices

1. **Keep guards pure**: Guards should not have side effects
2. **Use actions for context updates**: Don't mutate context directly
3. **Effects are data**: Effects describe what should happen, not how
4. **Validate critical transitions**: Use validation for important state changes
5. **Prefer external transitions**: Use internal transitions only when needed
6. **Order matters**: Place more specific transitions before general ones
