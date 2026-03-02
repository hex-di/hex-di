---
sidebar_position: 1
title: Building Machines
---

# Building Machines

Flow provides two approaches for building state machines: the declarative `defineMachine()` function and the fluent `createMachineBuilder()` API. Both produce the same result with full type inference.

## Declarative Approach: defineMachine()

The `defineMachine()` function creates machines using a configuration object:

```typescript
import { defineMachine, Effect } from "@hex-di/flow";

const machine = defineMachine({
  id: "order-workflow",
  initial: "draft",
  context: {
    items: [],
    total: 0,
    customerId: null,
  },
  states: {
    draft: {
      on: {
        ADD_ITEM: {
          target: "draft",
          actions: [
            (ctx, event) => ({
              items: [...ctx.items, event.payload.item],
              total: ctx.total + event.payload.item.price,
            }),
          ],
        },
        SUBMIT: {
          target: "pending",
          guard: ctx => ctx.items.length > 0 && ctx.customerId !== null,
        },
      },
    },
    pending: {
      entry: [
        Effect.log("Order submitted"),
        Effect.invoke("OrderService", "validate", { orderId: "123" }),
      ],
      on: {
        APPROVE: { target: "approved" },
        REJECT: { target: "rejected" },
      },
    },
    approved: {
      entry: [
        Effect.invoke("PaymentService", "charge"),
        Effect.invoke("InventoryService", "reserve"),
      ],
      on: {
        PAYMENT_SUCCESS: { target: "processing" },
        PAYMENT_FAILURE: { target: "rejected" },
      },
    },
    processing: {
      entry: [Effect.spawn("fulfillmentActivity", { orderId: "123" })],
      exit: [Effect.stop("fulfillmentActivity")],
      on: {
        SHIPPED: { target: "completed" },
        CANCEL: { target: "cancelled" },
      },
    },
    completed: {
      type: "final",
      entry: [Effect.log("Order completed")],
    },
    rejected: {
      type: "final",
    },
    cancelled: {
      type: "final",
      entry: [
        Effect.invoke("PaymentService", "refund"),
        Effect.invoke("InventoryService", "release"),
      ],
    },
  },
});
```

## Fluent Builder Approach: createMachineBuilder()

The builder API provides a two-phase fluent interface:

```typescript
import { createMachineBuilder, Effect, guard } from "@hex-di/flow";

const machine = createMachineBuilder({
  id: "authentication",
  context: {
    user: null,
    attempts: 0,
    lastAttempt: null,
  },
})
  // Phase 1: Define states
  .addState("logged_out")
  .addState("logging_in", {
    entry: [Effect.log("Authentication started")],
  })
  .addState("logged_in", {
    entry: [Effect.log("User authenticated")],
    exit: [Effect.log("User logging out")],
  })
  .addState("locked", {
    entry: [Effect.log("Account locked due to failed attempts")],
  })
  // Phase 2: Define transitions
  .transitions()
  .on("logged_out", "LOGIN", "logging_in", {
    actions: [
      (ctx, event) => ({
        lastAttempt: Date.now(),
      }),
    ],
  })
  .on("logging_in", "SUCCESS", "logged_in", {
    actions: [
      (ctx, event) => ({
        user: event.payload.user,
        attempts: 0,
      }),
    ],
  })
  .on("logging_in", "FAILURE", "logged_out", {
    guard: guard(ctx => ctx.attempts < 3),
    actions: [
      ctx => ({
        attempts: ctx.attempts + 1,
      }),
    ],
  })
  .on("logging_in", "FAILURE", "locked", {
    guard: guard(ctx => ctx.attempts >= 3),
  })
  .on("logged_in", "LOGOUT", "logged_out", {
    actions: [
      ctx => ({
        user: null,
      }),
    ],
  })
  .on("locked", "UNLOCK", "logged_out", {
    actions: [
      ctx => ({
        attempts: 0,
      }),
    ],
  })
  .build();
```

## Compound States

Model hierarchical state relationships:

```typescript
const wizardMachine = defineMachine({
  id: "setup-wizard",
  initial: "welcome",
  context: {
    currentStep: 0,
    data: {},
  },
  states: {
    welcome: {
      on: {
        START: { target: "configuration" },
      },
    },
    configuration: {
      initial: "basic",
      states: {
        basic: {
          on: {
            NEXT: {
              target: "advanced",
              actions: [
                (ctx, event) => ({
                  data: { ...ctx.data, basic: event.payload },
                }),
              ],
            },
          },
        },
        advanced: {
          on: {
            BACK: { target: "basic" },
            NEXT: {
              target: "review",
              actions: [
                (ctx, event) => ({
                  data: { ...ctx.data, advanced: event.payload },
                }),
              ],
            },
          },
        },
        review: {
          on: {
            BACK: { target: "advanced" },
            CONFIRM: { target: "#setup-wizard.installing" },
          },
        },
      },
    },
    installing: {
      entry: [Effect.spawn("installer", { config: {} })],
      on: {
        PROGRESS: {
          target: "installing",
          internal: true,
          actions: [
            (ctx, event) => ({
              currentStep: event.payload.step,
            }),
          ],
        },
        SUCCESS: { target: "complete" },
        ERROR: { target: "failed" },
      },
    },
    complete: {
      type: "final",
    },
    failed: {
      on: {
        RETRY: { target: "configuration.review" },
      },
    },
  },
});
```

## History States

Preserve and restore previous state:

```typescript
const editorMachine = defineMachine({
  id: "text-editor",
  initial: "editing",
  context: {
    content: "",
    saved: true,
  },
  states: {
    editing: {
      initial: "normal",
      states: {
        normal: {
          on: {
            TOGGLE_BOLD: { target: "bold" },
            TOGGLE_ITALIC: { target: "italic" },
          },
        },
        bold: {
          on: {
            TOGGLE_BOLD: { target: "normal" },
            TOGGLE_ITALIC: { target: "boldItalic" },
          },
        },
        italic: {
          on: {
            TOGGLE_BOLD: { target: "boldItalic" },
            TOGGLE_ITALIC: { target: "normal" },
          },
        },
        boldItalic: {
          on: {
            TOGGLE_BOLD: { target: "italic" },
            TOGGLE_ITALIC: { target: "bold" },
          },
        },
        hist: {
          type: "history",
          history: "shallow", // or 'deep' for nested state history
        },
      },
      on: {
        TYPE: {
          target: "editing",
          internal: true,
          actions: [
            (ctx, event) => ({
              content: ctx.content + event.payload.char,
              saved: false,
            }),
          ],
        },
        SAVE: { target: "saving" },
      },
    },
    saving: {
      entry: [Effect.invoke("FileService", "save", { content: "" })],
      on: {
        SAVE_SUCCESS: {
          target: "editing.hist", // Return to previous editing state
          actions: [ctx => ({ saved: true })],
        },
        SAVE_ERROR: { target: "editing.hist" },
      },
    },
  },
});
```

## Context Typing

Ensure full type safety with explicit context interfaces:

```typescript
interface TodoContext {
  todos: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
  filter: "all" | "active" | "completed";
  editingId: string | null;
}

const todoMachine = defineMachine({
  id: "todo-app",
  initial: "ready",
  context: {
    todos: [],
    filter: "all",
    editingId: null,
  } satisfies TodoContext, // Ensure context matches interface
  states: {
    ready: {
      on: {
        ADD_TODO: {
          target: "ready",
          actions: [
            (ctx, event) => ({
              todos: [
                ...ctx.todos,
                {
                  id: crypto.randomUUID(),
                  text: event.payload.text,
                  completed: false,
                },
              ],
            }),
          ],
        },
        TOGGLE_TODO: {
          target: "ready",
          actions: [
            (ctx, event) => ({
              todos: ctx.todos.map(todo =>
                todo.id === event.payload.id ? { ...todo, completed: !todo.completed } : todo
              ),
            }),
          ],
        },
        EDIT_TODO: {
          target: "editing",
          actions: [
            (ctx, event) => ({
              editingId: event.payload.id,
            }),
          ],
        },
      },
    },
    editing: {
      on: {
        UPDATE_TODO: {
          target: "ready",
          actions: [
            (ctx, event) => ({
              todos: ctx.todos.map(todo =>
                todo.id === ctx.editingId ? { ...todo, text: event.payload.text } : todo
              ),
              editingId: null,
            }),
          ],
        },
        CANCEL_EDIT: {
          target: "ready",
          actions: [
            ctx => ({
              editingId: null,
            }),
          ],
        },
      },
    },
  },
});
```

## Initial State Inference

Flow can infer the initial state when it's unambiguous:

```typescript
// Initial state inferred as 'idle' (first state)
const simple = defineMachine({
  id: "simple",
  states: {
    idle: {
      on: { START: { target: "running" } },
    },
    running: {
      on: { STOP: { target: "idle" } },
    },
  },
});

// Explicit initial for clarity
const explicit = defineMachine({
  id: "explicit",
  initial: "pending", // Start in pending, not first state
  states: {
    completed: {},
    pending: {
      on: { RESOLVE: { target: "completed" } },
    },
  },
});
```

## Deep Freezing

All machines are deeply frozen for immutability:

```typescript
const machine = defineMachine({
  id: "frozen",
  initial: "idle",
  context: { count: 0 },
  states: {
    idle: {},
  },
});

// This will throw in strict mode
machine.context.count = 1; // Error: Cannot assign to read only property

// Context must be updated through actions
const runner = createMachineRunner(machine);
runner.send({
  type: "INCREMENT",
  payload: { amount: 1 },
});
```

## Best Practices

1. **Choose the right approach**: Use `defineMachine()` for simple machines, builder for complex flows
2. **Model states explicitly**: Each state should represent a distinct condition
3. **Keep context minimal**: Store only essential data in context
4. **Use compound states**: Model related states hierarchically
5. **Leverage history states**: For UI flows that need state restoration
6. **Type your context**: Always define an interface for complex context
7. **Freeze custom objects**: Ensure all context values are immutable
8. **Name machines clearly**: Use descriptive IDs for debugging and tracing
