# HexDI Store Specification

**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-02
**Last Updated:** 2026-02-02

---

## Table of Contents

1. [Overview](#1-overview)
2. [Philosophy](#2-philosophy)
3. [Package Structure](#3-package-structure)
4. [Core Concepts](#4-core-concepts)
5. [State Ports](#5-state-ports)
6. [Action Ports](#6-action-ports)
7. [Selector Ports](#7-selector-ports)
8. [State Adapters](#8-state-adapters)
9. [Selector Adapters](#9-selector-adapters)
10. [Store Architecture](#10-store-architecture)
11. [Subscription Model](#11-subscription-model)
12. [Middleware System](#12-middleware-system)
13. [State Lifecycle](#13-state-lifecycle)
14. [Effects & Side Effects](#14-effects--side-effects)
15. [HexDI Integration](#15-hexdi-integration)
16. [React Integration](#16-react-integration)
17. [Testing Patterns](#17-testing-patterns)
18. [Advanced Patterns](#18-advanced-patterns)
19. [API Reference](#19-api-reference)
20. [Integration with Query & Saga](#20-integration-with-query--saga)

---

## 1. Overview

HexDI Store is a state management library that applies hexagonal architecture principles to application state. It separates **what** state exists (ports) from **how** state behaves (adapters), enabling:

- Type-safe state contracts
- Swappable state implementations
- Dependency injection for state logic
- Easy testing without mocking global state
- Multi-tenant support via graph composition

### 1.1 Goals

1. **Hexagonal state management** - Ports define state contracts, adapters implement behavior
2. **Full HexDI integration** - State adapters are regular HexDI adapters
3. **Zero-configuration testing** - Swap adapters, not global state
4. **Type safety** - Compile-time validation of state shape, actions, and selectors
5. **Framework agnostic core** - React/Vue bindings as separate packages
6. **Predictable updates** - Immutable state with explicit actions

### 1.2 Non-Goals

1. Not a replacement for React's built-in state (use local state when appropriate)
2. Not an event sourcing system (though compatible with it)
3. Not a database or persistence layer
4. Not a real-time sync solution (but can integrate with one)

### 1.3 When to Use HexDI Store

| Use HexDI Store                | Don't Use HexDI Store                  |
| ------------------------------ | -------------------------------------- |
| Shared state across components | Component-local state                  |
| Complex state logic            | Simple UI toggles                      |
| State that needs testing       | Ephemeral UI state                     |
| Multi-tenant applications      | Single-instance apps with simple state |
| State with business rules      | Plain data display                     |

---

## 2. Philosophy

### 2.1 Core Principles

```
"State is a port. Behavior is an adapter. Actions are contracts."
```

**Principle 1: State as Ports**

Unlike Redux (single global store) or Zustand (hooks-based stores), HexDI Store treats each state slice as a port with a defined contract:

```typescript
// Traditional Redux: Components import actions directly
import { increment } from "./counterSlice";
dispatch(increment());

// HexDI Store: Components use state ports (what), not implementations (how)
const counter = useStatePort(CounterPort);
counter.actions.increment();
```

**Principle 2: Actions as Contracts**

Actions are not arbitrary strings or functions. They are typed contracts defined in ports:

```typescript
const CounterPort = createStatePort({
  name: "Counter",
  initialState: { count: 0 },
  actions: {
    increment: action(),
    decrement: action(),
    incrementBy: action<{ amount: number }>(),
  },
});
```

**Principle 3: Adapters Define Behavior**

How state updates happen is defined in adapters, not ports:

```typescript
const CounterAdapter = createStateAdapter(CounterPort, {
  reducers: {
    increment: state => ({ count: state.count + 1 }),
    decrement: state => ({ count: state.count - 1 }),
    incrementBy: (state, { amount }) => ({ count: state.count + amount }),
  },
});
```

**Principle 4: Selectors Follow the Same Pattern**

Selector ports declare **what** derived state exists. Selector adapters define **how** it's computed:

```typescript
// Port: declares the contract (no logic)
const DoubleCountPort = createSelectorPort({
  name: "DoubleCount",
  from: [CounterPort] as const,
});

// Adapter: implements the computation
const DoubleCountAdapter = createSelectorAdapter(DoubleCountPort, {
  select: counter => counter.count * 2,
});
```

### 2.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION                                     │
│                                                                             │
│   Components use StatePort/SelectorPort contracts                           │
│   They never import reducers, selectors, or action implementations          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STORE RUNTIME                                   │
│                                                                             │
│   State Container • Subscriptions • Middleware • DevTools                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PORTS (Contracts)                               │
│                                                                             │
│   StatePort<Name, State, Actions>      SelectorPort<Name, Sources, Result>  │
│   Define WHAT state exists             Define WHAT derivations exist        │
│   No reducers, no logic                No select function, no logic         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADAPTERS (Implementations)                      │
│                                                                             │
│   StateAdapter: Reducers, Effects      SelectorAdapter: Select function     │
│   Implement HOW state changes          Implement HOW derivation works       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Benefits

| Benefit           | Description                                               |
| ----------------- | --------------------------------------------------------- |
| **Testability**   | Swap production adapter for mock adapter, no global state |
| **Flexibility**   | Change state/selector logic without touching components   |
| **Multi-tenancy** | Different graphs per tenant with different behavior       |
| **Type safety**   | Ports enforce contracts at compile time                   |
| **Consistency**   | Same DI patterns as rest of application                   |

---

## 3. Package Structure

```
store/
├── core/                        # @hex-di/store
│   ├── src/
│   │   ├── ports/
│   │   │   ├── state-port.ts    # createStatePort factory
│   │   │   ├── action-port.ts   # Action definition utilities
│   │   │   ├── selector-port.ts # createSelectorPort factory
│   │   │   └── types.ts         # Port type definitions
│   │   │
│   │   ├── adapters/
│   │   │   ├── state-adapter.ts    # createStateAdapter factory
│   │   │   ├── selector-adapter.ts # createSelectorAdapter factory
│   │   │   └── types.ts            # Adapter type definitions
│   │   │
│   │   ├── store/
│   │   │   ├── store.ts         # Store implementation
│   │   │   ├── dispatcher.ts    # Action dispatcher
│   │   │   ├── subscriber.ts    # Subscription manager
│   │   │   └── types.ts         # Store type definitions
│   │   │
│   │   ├── middleware/
│   │   │   ├── middleware.ts    # Middleware types and composition
│   │   │   ├── logger.ts        # Built-in logging middleware
│   │   │   ├── thunk.ts         # Async action middleware
│   │   │   └── devtools.ts      # DevTools connector
│   │   │
│   │   ├── effects/
│   │   │   ├── effect.ts        # Effect definitions
│   │   │   ├── runner.ts        # Effect runner
│   │   │   └── types.ts         # Effect types
│   │   │
│   │   ├── types/
│   │   │   ├── state.ts         # State types
│   │   │   ├── actions.ts       # Action types
│   │   │   └── utils.ts         # Utility types (Infer*, etc.)
│   │   │
│   │   └── index.ts
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── react/                       # @hex-di/store-react
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── use-state-port.ts    # useStatePort hook
│   │   │   ├── use-selector.ts      # useSelector hook
│   │   │   ├── use-dispatch.ts      # useDispatch hook
│   │   │   ├── use-store.ts         # useStore hook
│   │   │   └── use-state-value.ts   # useStateValue hook
│   │   │
│   │   ├── provider/
│   │   │   ├── store-provider.tsx   # StoreProvider component
│   │   │   └── context.ts           # React context
│   │   │
│   │   ├── hoc/
│   │   │   └── with-state.tsx       # withState HOC
│   │   │
│   │   └── index.ts
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── persist/                     # @hex-di/store-persist
│   ├── src/
│   │   ├── persister.ts         # State persistence
│   │   ├── storage.ts           # Storage adapters
│   │   ├── hydration.ts         # Hydration utilities
│   │   └── index.ts
│   │
│   └── package.json
│
└── devtools/                    # @hex-di/store-devtools (future)
    ├── src/
    │   ├── extension/           # Browser extension connector
    │   ├── panel/               # DevTools panel
    │   ├── time-travel/         # Time travel debugging
    │   └── index.ts
    │
    └── package.json
```

### 3.1 Dependency Graph

```
                    @hex-di/core
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    @hex-di/graph   @hex-di/runtime  @hex-di/react
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                  @hex-di/store
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
  @hex-di/store-react  @hex-di/store-persist  @hex-di/store-devtools
```

### 3.2 Package Dependencies

| Package                  | Dependencies                     | Peer Dependencies |
| ------------------------ | -------------------------------- | ----------------- |
| `@hex-di/store`          | `@hex-di/core`                   | -                 |
| `@hex-di/store-react`    | `@hex-di/store`, `@hex-di/react` | `react`           |
| `@hex-di/store-persist`  | `@hex-di/store`                  | -                 |
| `@hex-di/store-devtools` | `@hex-di/store`                  | -                 |

---

## 4. Core Concepts

### 4.1 StatePort

A **StatePort** declares what state exists and what actions can modify it. It contains no reduction logic.

```typescript
const CounterPort = createStatePort({
  name: "Counter",
  initialState: { count: 0, lastUpdated: null as Date | null },
  actions: {
    increment: action(),
    decrement: action(),
    incrementBy: action<{ amount: number }>(),
    reset: action(),
  },
});
```

### 4.2 ActionPort

An **ActionPort** is implicitly created as part of a StatePort's actions. Each action is a typed contract.

```typescript
// Actions are type-safe contracts
type CounterActions = {
  increment: Action<void>;
  decrement: Action<void>;
  incrementBy: Action<{ amount: number }>;
  reset: Action<void>;
};
```

### 4.3 SelectorPort

A **SelectorPort** declares that a derived computation exists. It specifies source ports and result type, but contains no logic:

```typescript
// Port: contract only (no select function)
const DoubleCountPort = createSelectorPort({
  name: "DoubleCount",
  from: [CounterPort] as const,
  result: {} as number, // Type hint for result
});
```

### 4.4 StateAdapter

A **StateAdapter** implements how actions modify state:

```typescript
const CounterAdapter = createStateAdapter(CounterPort, {
  reducers: {
    increment: state => ({
      ...state,
      count: state.count + 1,
      lastUpdated: new Date(),
    }),
    decrement: state => ({
      ...state,
      count: state.count - 1,
      lastUpdated: new Date(),
    }),
    incrementBy: (state, payload) => ({
      ...state,
      count: state.count + payload.amount,
      lastUpdated: new Date(),
    }),
    reset: () => CounterPort.initialState,
  },
});
```

### 4.5 SelectorAdapter

A **SelectorAdapter** implements how derived state is computed:

```typescript
const DoubleCountAdapter = createSelectorAdapter(DoubleCountPort, {
  select: counter => counter.count * 2,
});
```

### 4.6 Store

The **Store** is the runtime container that manages state, dispatches actions, and notifies subscribers.

### 4.7 Middleware

**Middleware** intercepts actions before they reach reducers, enabling logging, async operations, and more.

---

## 5. State Ports

### 5.1 Type Definition

```typescript
interface StatePort<TName extends string, TState, TActions extends ActionDefinitions> {
  readonly _tag: "StatePort";
  readonly name: TName;
  readonly initialState: TState;
  readonly actions: TActions;
  readonly _types: {
    readonly state: TState;
    readonly actions: TActions;
  };
}

/** Action definitions map */
type ActionDefinitions = Record<string, ActionDefinition<unknown>>;

/** Single action definition */
interface ActionDefinition<TPayload> {
  readonly _tag: "ActionDefinition";
  readonly _payload: TPayload;
}

/** Helper to define an action */
function action<TPayload = void>(): ActionDefinition<TPayload>;
```

### 5.2 Factory Function

```typescript
function createStatePort<TName extends string, TState, TActions extends ActionDefinitions>(config: {
  name: TName;
  initialState: TState;
  actions: TActions;
  metadata?: Record<string, unknown>;
}): StatePort<TName, TState, TActions>;
```

### 5.3 Examples

```typescript
// Simple counter
const CounterPort = createStatePort({
  name: "Counter",
  initialState: { count: 0 },
  actions: {
    increment: action(),
    decrement: action(),
    set: action<{ value: number }>(),
  },
});

// Todo list with complex state
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

interface TodoState {
  items: Todo[];
  filter: "all" | "active" | "completed";
  isLoading: boolean;
}

const TodoPort = createStatePort({
  name: "Todo",
  initialState: {
    items: [],
    filter: "all",
    isLoading: false,
  } satisfies TodoState,
  actions: {
    addTodo: action<{ text: string }>(),
    toggleTodo: action<{ id: string }>(),
    removeTodo: action<{ id: string }>(),
    setFilter: action<{ filter: TodoState["filter"] }>(),
    setLoading: action<{ isLoading: boolean }>(),
    setTodos: action<{ items: Todo[] }>(),
    clearCompleted: action(),
  },
});

// User authentication state
interface AuthState {
  user: User | null;
  token: string | null;
  status: "idle" | "loading" | "authenticated" | "error";
  error: string | null;
}

const AuthPort = createStatePort({
  name: "Auth",
  initialState: {
    user: null,
    token: null,
    status: "idle",
    error: null,
  } satisfies AuthState,
  actions: {
    loginStart: action(),
    loginSuccess: action<{ user: User; token: string }>(),
    loginError: action<{ error: string }>(),
    logout: action(),
    refreshToken: action<{ token: string }>(),
  },
});

// Cart state
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  discountCode: string | null;
  discountPercent: number;
}

const CartPort = createStatePort({
  name: "Cart",
  initialState: {
    items: [],
    discountCode: null,
    discountPercent: 0,
  } satisfies CartState,
  actions: {
    addItem: action<{ item: Omit<CartItem, "quantity"> }>(),
    removeItem: action<{ productId: string }>(),
    updateQuantity: action<{ productId: string; quantity: number }>(),
    applyDiscount: action<{ code: string; percent: number }>(),
    removeDiscount: action(),
    clearCart: action(),
  },
});
```

### 5.4 Type Inference Utilities

```typescript
/** Extract state type from a StatePort */
type InferState<P> = P extends StatePort<any, infer S, any> ? S : never;

/** Extract actions from a StatePort */
type InferActions<P> = P extends StatePort<any, any, infer A> ? A : never;

/** Extract port name */
type InferStateName<P> = P extends StatePort<infer N, any, any> ? N : never;

/** Extract action payload type */
type InferActionPayload<A> = A extends ActionDefinition<infer P> ? P : never;

/** Create bound action type from action definition */
type BoundAction<A> =
  A extends ActionDefinition<infer P>
    ? P extends void
      ? () => void
      : (payload: P) => void
    : never;

/** Create bound actions object from action definitions */
type BoundActions<A extends ActionDefinitions> = {
  [K in keyof A]: BoundAction<A[K]>;
};

// Usage
type CounterState = InferState<typeof CounterPort>; // { count: number }
type CounterActions = InferActions<typeof CounterPort>; // { increment: ..., decrement: ..., set: ... }
```

---

## 6. Action Ports

### 6.1 Type Definition

Actions are defined inline within StatePort but follow a strict contract:

```typescript
/** An action that can be dispatched */
interface Action<TPayload = void> {
  readonly type: string;
  readonly payload: TPayload;
  readonly meta?: ActionMeta;
}

/** Action metadata for tracing and middleware */
interface ActionMeta {
  readonly timestamp?: number;
  readonly source?: string;
  readonly correlationId?: string;
  readonly [key: string]: unknown;
}

/** Dispatchable action creator */
type ActionCreator<TPayload = void> = TPayload extends void
  ? () => Action<void>
  : (payload: TPayload) => Action<TPayload>;
```

### 6.2 Action Definition Helpers

```typescript
/** Define a void action (no payload) */
function action(): ActionDefinition<void>;

/** Define an action with typed payload */
function action<TPayload>(): ActionDefinition<TPayload>;

/** Define an action with default payload */
function actionWithDefault<TPayload>(defaultPayload: TPayload): ActionDefinition<TPayload>;
```

### 6.3 Action Patterns

```typescript
// Void action - no payload needed
const ResetAction = action();
// Usage: reset()

// Simple payload
const SetCountAction = action<{ value: number }>();
// Usage: setCount({ value: 42 })

// Complex payload
const UpdateUserAction = action<{
  id: string;
  updates: Partial<User>;
  optimistic?: boolean;
}>();
// Usage: updateUser({ id: '123', updates: { name: 'New Name' } })

// Enum-constrained payload
const SetFilterAction = action<{
  filter: "all" | "active" | "completed";
}>();
// Usage: setFilter({ filter: 'active' })

// Array payload
const SetItemsAction = action<{ items: Item[] }>();
// Usage: setItems({ items: [...] })
```

### 6.4 Action Type Strings

Action types are automatically derived from port name and action name:

```typescript
const CounterPort = createStatePort({
  name: "Counter",
  initialState: { count: 0 },
  actions: {
    increment: action(),
    incrementBy: action<{ amount: number }>(),
  },
});

// Generated action types:
// 'Counter/increment'
// 'Counter/incrementBy'
```

---

## 7. Selector Ports

### 7.1 Type Definition

A SelectorPort declares that a derived computation exists, without containing the computation logic:

```typescript
interface SelectorPort<
  TName extends string,
  TSources extends readonly StatePort<any, any, any>[],
  TResult,
> {
  readonly _tag: "SelectorPort";
  readonly name: TName;
  readonly sources: TSources;
  readonly _types: {
    readonly sources: TSources;
    readonly result: TResult;
  };
}
```

### 7.2 Factory Function

```typescript
function createSelectorPort<
  TName extends string,
  TSources extends readonly StatePort<any, any, any>[],
  TResult,
>(config: {
  name: TName;
  from: TSources;
  result: TResult; // Type hint (value ignored at runtime)
  metadata?: Record<string, unknown>;
}): SelectorPort<TName, TSources, TResult>;
```

### 7.3 Examples

```typescript
// Simple derived value
const DoubleCountPort = createSelectorPort({
  name: "DoubleCount",
  from: [CounterPort] as const,
  result: 0 as number,
});

// Filtered list
const VisibleTodosPort = createSelectorPort({
  name: "VisibleTodos",
  from: [TodoPort] as const,
  result: [] as Todo[],
});

// Complex computed object
interface CartTotal {
  subtotal: number;
  discount: number;
  total: number;
  itemCount: number;
}

const CartTotalPort = createSelectorPort({
  name: "CartTotal",
  from: [CartPort] as const,
  result: {} as CartTotal,
});

// Cross-port selector
interface AuthenticatedUserCart {
  user: User | null;
  isAuthenticated: boolean;
  cart: CartItem[];
  canCheckout: boolean;
}

const AuthenticatedUserCartPort = createSelectorPort({
  name: "AuthenticatedUserCart",
  from: [AuthPort, CartPort] as const,
  result: {} as AuthenticatedUserCart,
});

// Todo statistics
interface TodoStats {
  total: number;
  active: number;
  completed: number;
  percentComplete: number;
}

const TodoStatsPort = createSelectorPort({
  name: "TodoStats",
  from: [TodoPort] as const,
  result: {} as TodoStats,
});
```

### 7.4 Type Inference Utilities

```typescript
/** Extract selector result type */
type InferSelectorResult<P> = P extends SelectorPort<any, any, infer R> ? R : never;

/** Extract selector source ports */
type InferSelectorSources<P> = P extends SelectorPort<any, infer S, any> ? S : never;

/** Extract state types from source ports */
type ExtractStates<T extends readonly StatePort<any, any, any>[]> = {
  [K in keyof T]: T[K] extends StatePort<any, infer S, any> ? S : never;
};

// Usage
type CartTotalResult = InferSelectorResult<typeof CartTotalPort>;
// { subtotal: number; discount: number; total: number; itemCount: number }
```

---

## 8. State Adapters

### 8.1 Type Definition

```typescript
interface StateAdapter<P extends StatePort<any, any, any>> {
  readonly _tag: "StateAdapter";
  readonly port: P;
  readonly reducers: Reducers<P>;
  readonly effects?: Effects<P>;
}

/** Reducer map matching port actions */
type Reducers<P extends StatePort<any, any, any>> = {
  [K in keyof InferActions<P>]: Reducer<InferState<P>, InferActionPayload<InferActions<P>[K]>>;
};

/** Single reducer function */
type Reducer<TState, TPayload> = TPayload extends void
  ? (state: TState) => TState
  : (state: TState, payload: TPayload) => TState;

/** Effect handlers triggered after actions */
type Effects<P extends StatePort<any, any, any>> = {
  [K in keyof InferActions<P>]?: Effect<InferState<P>, InferActionPayload<InferActions<P>[K]>>;
};

/** Effect function (side effect after reducer) */
type Effect<TState, TPayload> = (params: {
  state: TState;
  prevState: TState;
  payload: TPayload;
  dispatch: Dispatch;
}) => void | Promise<void>;
```

### 8.2 Factory Function

```typescript
function createStateAdapter<
  P extends StatePort<any, any, any>,
  TDeps extends Record<string, Port<any, any>> = Record<string, never>,
>(
  port: P,
  config: {
    /** Required dependencies for effects */
    requires?: PortsTuple<TDeps>;

    /** Reducer implementations for each action */
    reducers: Reducers<P>;

    /** Optional effect handlers (run after reducers) */
    effects?: (deps: ResolvedDeps<TDeps>) => Effects<P>;

    /** Adapter lifetime */
    lifetime?: "singleton" | "scoped";
  }
): StateAdapter<P>;
```

### 8.3 Examples

```typescript
// Simple adapter with reducers only
const CounterAdapter = createStateAdapter(CounterPort, {
  reducers: {
    increment: state => ({ ...state, count: state.count + 1 }),
    decrement: state => ({ ...state, count: state.count - 1 }),
    set: (state, { value }) => ({ ...state, count: value }),
  },
});

// Adapter with effects
const TodoAdapter = createStateAdapter(TodoPort, {
  reducers: {
    addTodo: (state, { text }) => ({
      ...state,
      items: [
        ...state.items,
        {
          id: crypto.randomUUID(),
          text,
          completed: false,
          createdAt: new Date(),
        },
      ],
    }),
    toggleTodo: (state, { id }) => ({
      ...state,
      items: state.items.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    }),
    removeTodo: (state, { id }) => ({
      ...state,
      items: state.items.filter(item => item.id !== id),
    }),
    setFilter: (state, { filter }) => ({
      ...state,
      filter,
    }),
    setLoading: (state, { isLoading }) => ({
      ...state,
      isLoading,
    }),
    setTodos: (state, { items }) => ({
      ...state,
      items,
      isLoading: false,
    }),
    clearCompleted: state => ({
      ...state,
      items: state.items.filter(item => !item.completed),
    }),
  },
  effects: () => ({
    addTodo: ({ state, payload }) => {
      console.log(`Added todo: ${payload.text}`, state.items.length);
    },
  }),
});

// Adapter with dependencies
const AuthAdapter = createStateAdapter(AuthPort, {
  requires: [ApiClientPort, StoragePort],
  reducers: {
    loginStart: state => ({
      ...state,
      status: "loading",
      error: null,
    }),
    loginSuccess: (state, { user, token }) => ({
      ...state,
      user,
      token,
      status: "authenticated",
      error: null,
    }),
    loginError: (state, { error }) => ({
      ...state,
      status: "error",
      error,
    }),
    logout: () => AuthPort.initialState,
    refreshToken: (state, { token }) => ({
      ...state,
      token,
    }),
  },
  effects: ({ storage }) => ({
    loginSuccess: async ({ state }) => {
      if (state.token) {
        await storage.set("auth_token", state.token);
      }
    },
    logout: async () => {
      await storage.remove("auth_token");
    },
  }),
});

// Cart adapter with complex logic
const CartAdapter = createStateAdapter(CartPort, {
  reducers: {
    addItem: (state, { item }) => {
      const existingIndex = state.items.findIndex(i => i.productId === item.productId);

      if (existingIndex >= 0) {
        const items = [...state.items];
        items[existingIndex] = {
          ...items[existingIndex],
          quantity: items[existingIndex].quantity + 1,
        };
        return { ...state, items };
      }

      return {
        ...state,
        items: [...state.items, { ...item, quantity: 1 }],
      };
    },
    removeItem: (state, { productId }) => ({
      ...state,
      items: state.items.filter(item => item.productId !== productId),
    }),
    updateQuantity: (state, { productId, quantity }) => ({
      ...state,
      items:
        quantity <= 0
          ? state.items.filter(item => item.productId !== productId)
          : state.items.map(item => (item.productId === productId ? { ...item, quantity } : item)),
    }),
    applyDiscount: (state, { code, percent }) => ({
      ...state,
      discountCode: code,
      discountPercent: percent,
    }),
    removeDiscount: state => ({
      ...state,
      discountCode: null,
      discountPercent: 0,
    }),
    clearCart: () => CartPort.initialState,
  },
});

// Mock adapter for testing
const MockCounterAdapter = createStateAdapter(CounterPort, {
  reducers: {
    increment: state => ({ ...state, count: state.count + 10 }), // Different behavior
    decrement: state => ({ ...state, count: state.count - 10 }),
    set: (state, { value }) => ({ ...state, count: value }),
  },
});
```

### 8.4 Adapter Composition

State adapters are standard HexDI adapters and can be composed normally:

```typescript
const graph = createGraph()
  // Infrastructure
  .provide(ApiClientAdapter)
  .provide(StorageAdapter)

  // State adapters
  .provide(CounterAdapter)
  .provide(TodoAdapter)
  .provide(AuthAdapter)
  .provide(CartAdapter)

  .build();
```

---

## 9. Selector Adapters

### 9.1 Type Definition

A SelectorAdapter implements the computation logic for a SelectorPort:

```typescript
interface SelectorAdapter<P extends SelectorPort<any, any, any>> {
  readonly _tag: "SelectorAdapter";
  readonly port: P;
  readonly select: SelectorFunction<P>;
  readonly options?: SelectorOptions;
}

/** The selector function type derived from port */
type SelectorFunction<P extends SelectorPort<any, any, any>> =
  P extends SelectorPort<any, infer Sources, infer Result>
    ? (...states: ExtractStates<Sources>) => Result
    : never;

interface SelectorOptions {
  /** Enable memoization (default: true) */
  memoize?: boolean;

  /** Custom equality check for inputs */
  equalityFn?: (a: unknown, b: unknown) => boolean;

  /** Custom equality check for output */
  resultEqualityFn?: (a: unknown, b: unknown) => boolean;
}
```

### 9.2 Factory Function

```typescript
function createSelectorAdapter<
  P extends SelectorPort<any, any, any>,
  TDeps extends Record<string, Port<any, any>> = Record<string, never>,
>(
  port: P,
  config: {
    /** Required dependencies (for selectors that need services) */
    requires?: PortsTuple<TDeps>;

    /** The selector implementation */
    select: SelectorFunction<P> | ((deps: ResolvedDeps<TDeps>) => SelectorFunction<P>);

    /** Selector options */
    options?: SelectorOptions;

    /** Adapter lifetime */
    lifetime?: "singleton" | "scoped";
  }
): SelectorAdapter<P>;
```

### 9.3 Examples

```typescript
// Simple derived value
const DoubleCountAdapter = createSelectorAdapter(DoubleCountPort, {
  select: counter => counter.count * 2,
});

// Filtered list
const VisibleTodosAdapter = createSelectorAdapter(VisibleTodosPort, {
  select: todos => {
    switch (todos.filter) {
      case "active":
        return todos.items.filter(t => !t.completed);
      case "completed":
        return todos.items.filter(t => t.completed);
      default:
        return todos.items;
    }
  },
});

// Complex computed object
const CartTotalAdapter = createSelectorAdapter(CartTotalPort, {
  select: cart => {
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = subtotal * (cart.discountPercent / 100);
    return {
      subtotal,
      discount,
      total: subtotal - discount,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    };
  },
});

// Cross-port selector
const AuthenticatedUserCartAdapter = createSelectorAdapter(AuthenticatedUserCartPort, {
  select: (auth, cart) => ({
    user: auth.user,
    isAuthenticated: auth.status === "authenticated",
    cart: cart.items,
    canCheckout: auth.status === "authenticated" && cart.items.length > 0,
  }),
});

// Todo statistics
const TodoStatsAdapter = createSelectorAdapter(TodoStatsPort, {
  select: todos => ({
    total: todos.items.length,
    active: todos.items.filter(t => !t.completed).length,
    completed: todos.items.filter(t => t.completed).length,
    percentComplete:
      todos.items.length > 0
        ? Math.round((todos.items.filter(t => t.completed).length / todos.items.length) * 100)
        : 0,
  }),
});

// Selector with dependencies
const FormattedCartTotalAdapter = createSelectorAdapter(FormattedCartTotalPort, {
  requires: [CurrencyFormatterPort],
  select:
    ({ formatter }) =>
    cart => ({
      subtotal: formatter.format(
        cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      ),
      // ... rest of formatting
    }),
});

// Selector with custom memoization
const ExpensiveComputationAdapter = createSelectorAdapter(ExpensiveComputationPort, {
  select: data => {
    return data.items
      .filter(item => item.active)
      .map(item => processItem(item))
      .sort((a, b) => a.priority - b.priority);
  },
  options: {
    memoize: true,
    resultEqualityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  },
});

// Mock selector for testing (different logic)
const MockCartTotalAdapter = createSelectorAdapter(CartTotalPort, {
  select: cart => ({
    subtotal: 100, // Fixed values for testing
    discount: 0,
    total: 100,
    itemCount: cart.items.length,
  }),
});
```

### 9.4 Graph Registration

```typescript
const graph = createGraph()
  // State adapters
  .provide(CounterAdapter)
  .provide(TodoAdapter)
  .provide(CartAdapter)
  .provide(AuthAdapter)

  // Selector adapters
  .provide(DoubleCountAdapter)
  .provide(VisibleTodosAdapter)
  .provide(CartTotalAdapter)
  .provide(TodoStatsAdapter)
  .provide(AuthenticatedUserCartAdapter)

  .build();
```

### 9.5 Benefits of Separate Adapters

| Benefit           | Description                                        |
| ----------------- | -------------------------------------------------- |
| **Testability**   | Swap computation logic without changing components |
| **Multi-tenancy** | Different selector behavior per tenant             |
| **A/B Testing**   | Different computations for different user segments |
| **Performance**   | Swap memoization strategies per environment        |
| **Mocking**       | Return fixed values in tests                       |

```typescript
// Production graph
const ProductionGraph = createGraph()
  .provide(CartAdapter)
  .provide(CartTotalAdapter) // Real computation
  .build();

// Test graph
const TestGraph = createGraph()
  .provide(CartAdapter)
  .provide(MockCartTotalAdapter) // Fixed values
  .build();

// Tenant-specific graph
const TenantGraph = createGraph()
  .provide(CartAdapter)
  .provide(TenantCartTotalAdapter) // Tenant-specific pricing rules
  .build();
```

---

## 10. Store Architecture

### 10.1 Store Interface

```typescript
interface Store {
  // === State Access ===

  /** Get current state for a port */
  getState<P extends StatePort<any, any, any>>(port: P): InferState<P>;

  /** Get computed value from a selector */
  select<P extends SelectorPort<any, any, any>>(port: P): InferSelectorResult<P>;

  // === Actions ===

  /** Dispatch an action */
  dispatch<P extends StatePort<any, any, any>>(
    port: P,
    action: keyof InferActions<P>,
    payload?: unknown
  ): void;

  /** Get bound action creators for a port */
  getActions<P extends StatePort<any, any, any>>(port: P): BoundActions<InferActions<P>>;

  // === Subscriptions ===

  /** Subscribe to state changes for a port */
  subscribe<P extends StatePort<any, any, any>>(
    port: P,
    listener: (state: InferState<P>, prevState: InferState<P>) => void
  ): Unsubscribe;

  /** Subscribe to selector changes */
  subscribeToSelector<P extends SelectorPort<any, any, any>>(
    port: P,
    listener: (value: InferSelectorResult<P>, prevValue: InferSelectorResult<P>) => void
  ): Unsubscribe;

  /** Subscribe to all actions */
  subscribeToActions(
    listener: (action: Action<unknown>, port: StatePort<any, any, any>) => void
  ): Unsubscribe;

  // === Lifecycle ===

  /** Reset a port to initial state */
  reset<P extends StatePort<any, any, any>>(port: P): void;

  /** Reset all state to initial values */
  resetAll(): void;

  /** Destroy the store and clean up subscriptions */
  destroy(): void;

  // === Inspection ===

  /** Get all registered state ports */
  getRegisteredPorts(): readonly StatePort<any, any, any>[];

  /** Check if a port is registered */
  hasPort<P extends StatePort<any, any, any>>(port: P): boolean;

  /** Get the action history (if enabled) */
  getActionHistory(): readonly ActionHistoryEntry[];
}

interface ActionHistoryEntry {
  readonly timestamp: number;
  readonly portName: string;
  readonly actionType: string;
  readonly payload: unknown;
  readonly prevState: unknown;
  readonly nextState: unknown;
}

type Unsubscribe = () => void;
```

### 10.2 Store Factory

```typescript
function createStore(config?: StoreConfig): Store;

interface StoreConfig {
  /** Middleware to apply */
  middleware?: Middleware[];

  /** Enable action history for debugging (default: false in production) */
  enableHistory?: boolean;

  /** Maximum history entries to keep */
  historyLimit?: number;

  /** Enable DevTools integration */
  devTools?: boolean | DevToolsConfig;

  /** Error handler for effects */
  onEffectError?: (error: Error, action: Action<unknown>) => void;
}

interface DevToolsConfig {
  /** DevTools instance name */
  name?: string;

  /** Maximum age of actions to keep */
  maxAge?: number;

  /** Action sanitizer for sensitive data */
  actionSanitizer?: (action: Action<unknown>) => Action<unknown>;

  /** State sanitizer for sensitive data */
  stateSanitizer?: (state: unknown) => unknown;
}
```

### 10.3 Store as a Port

```typescript
// Store is itself a HexDI port
const StorePort = createPort<"Store", Store>({
  name: "Store",
});

// Default adapter
const StoreAdapter = createAdapter(StorePort, {
  lifetime: "singleton",
  factory: () =>
    createStore({
      middleware: [loggerMiddleware(), thunkMiddleware()],
      devTools: process.env.NODE_ENV === "development",
    }),
});
```

### 10.4 Store Initialization

```typescript
// Register state and selector adapters in graph
const graph = createGraph()
  // Store infrastructure
  .provide(StoreAdapter)

  // State adapters automatically register with store
  .provide(CounterAdapter)
  .provide(TodoAdapter)
  .provide(AuthAdapter)

  // Selector adapters
  .provide(DoubleCountAdapter)
  .provide(VisibleTodosAdapter)
  .provide(TodoStatsAdapter)

  .build();

// Usage
const container = createContainer(graph);
const store = container.resolve(StorePort);

// Get state
const counterState = store.getState(CounterPort);
console.log(counterState.count); // 0

// Dispatch action
store.dispatch(CounterPort, "increment");
console.log(store.getState(CounterPort).count); // 1

// Get bound actions
const actions = store.getActions(CounterPort);
actions.incrementBy({ amount: 5 });
console.log(store.getState(CounterPort).count); // 6

// Subscribe to changes
const unsubscribe = store.subscribe(CounterPort, (state, prevState) => {
  console.log(`Count changed: ${prevState.count} -> ${state.count}`);
});

// Use selectors
const total = store.select(CartTotalPort);
console.log(total.total); // calculated total
```

---

## 11. Subscription Model

### 11.1 State Subscriptions

```typescript
interface StateSubscription<TState> {
  /** Called when state changes */
  onStateChange: (state: TState, prevState: TState) => void;

  /** Optional equality check (default: Object.is) */
  equalityFn?: (a: TState, b: TState) => boolean;

  /** Run immediately with current state */
  fireImmediately?: boolean;
}

// Subscribe to entire state
const unsubscribe = store.subscribe(CounterPort, (state, prev) => {
  console.log(`Count: ${prev.count} -> ${state.count}`);
});

// Subscribe with custom equality
const unsubscribe = store.subscribe(
  TodoPort,
  (state, prev) => {
    console.log(`Todos changed`);
  },
  {
    equalityFn: (a, b) => a.items.length === b.items.length,
  }
);
```

### 11.2 Selector Subscriptions

```typescript
// Subscribe to derived values (auto-memoized)
const unsubscribe = store.subscribeToSelector(VisibleTodosPort, (visible, prevVisible) => {
  console.log(`Visible todos: ${prevVisible.length} -> ${visible.length}`);
});

// Subscribe to cart total
const unsubscribe = store.subscribeToSelector(CartTotalPort, ({ total }, { total: prevTotal }) => {
  if (total !== prevTotal) {
    console.log(`Cart total: $${prevTotal} -> $${total}`);
  }
});
```

### 11.3 Action Subscriptions

```typescript
// Subscribe to all actions (for logging/debugging)
const unsubscribe = store.subscribeToActions((action, port) => {
  console.log(`[${port.name}] ${action.type}`, action.payload);
});

// Subscribe to specific action types
const unsubscribe = store.subscribeToActions((action, port) => {
  if (port.name === "Auth" && action.type === "Auth/logout") {
    analytics.track("user_logout");
  }
});
```

### 11.4 Batched Updates

```typescript
// Multiple dispatches are batched for performance
store.batch(() => {
  store.dispatch(CartPort, "addItem", { item: item1 });
  store.dispatch(CartPort, "addItem", { item: item2 });
  store.dispatch(CartPort, "applyDiscount", { code: "SAVE10", percent: 10 });
});
// Subscribers notified once after batch completes
```

### 11.5 Subscription Cleanup

```typescript
// Always clean up subscriptions
useEffect(() => {
  const unsubscribe = store.subscribe(CounterPort, handleChange);
  return unsubscribe;
}, []);

// Or use the React hooks which handle cleanup
function Counter() {
  const { count } = useStatePort(CounterPort);
  // Subscription managed automatically
  return <div>{count}</div>;
}
```

---

## 12. Middleware System

### 12.1 Middleware Interface

```typescript
type Middleware = (api: MiddlewareAPI) => MiddlewareHandler;

interface MiddlewareAPI {
  /** Get state for any port */
  getState: <P extends StatePort<any, any, any>>(port: P) => InferState<P>;

  /** Dispatch action to any port */
  dispatch: <P extends StatePort<any, any, any>>(
    port: P,
    action: keyof InferActions<P>,
    payload?: unknown
  ) => void;
}

type MiddlewareHandler = (
  next: (action: DispatchedAction) => void
) => (action: DispatchedAction) => void;

interface DispatchedAction {
  port: StatePort<any, any, any>;
  type: string;
  payload: unknown;
}
```

### 12.2 Built-in Middleware

#### Logger Middleware

```typescript
function loggerMiddleware(options?: LoggerOptions): Middleware;

interface LoggerOptions {
  /** Log to console (default: true) */
  console?: boolean;

  /** Custom logger function */
  logger?: (entry: LogEntry) => void;

  /** Collapse console groups (default: true) */
  collapsed?: boolean;

  /** Include timestamp (default: true) */
  timestamp?: boolean;

  /** Filter which actions to log */
  predicate?: (action: DispatchedAction) => boolean;
}

interface LogEntry {
  timestamp: Date;
  port: string;
  action: string;
  payload: unknown;
  prevState: unknown;
  nextState: unknown;
  duration: number;
}

// Usage
const store = createStore({
  middleware: [
    loggerMiddleware({
      collapsed: true,
      predicate: action => action.port.name !== "Internal",
    }),
  ],
});
```

#### Thunk Middleware

```typescript
function thunkMiddleware(): Middleware;

// Enables async action creators
type ThunkAction<TReturn, P extends StatePort<any, any, any>> = (params: {
  dispatch: <A extends keyof InferActions<P>>(
    action: A,
    payload?: InferActionPayload<InferActions<P>[A]>
  ) => void;
  getState: () => InferState<P>;
}) => TReturn;

// Usage
const fetchTodos =
  (): ThunkAction<Promise<void>, typeof TodoPort> =>
  async ({ dispatch }) => {
    dispatch("setLoading", { isLoading: true });
    try {
      const response = await fetch("/api/todos");
      const items = await response.json();
      dispatch("setTodos", { items });
    } catch (error) {
      dispatch("setLoading", { isLoading: false });
      throw error;
    }
  };
```

#### DevTools Middleware

```typescript
function devToolsMiddleware(options?: DevToolsOptions): Middleware;

interface DevToolsOptions {
  /** Instance name in DevTools */
  name?: string;

  /** Enable time-travel debugging */
  timeTravel?: boolean;

  /** Sanitize actions before sending */
  actionSanitizer?: (action: DispatchedAction) => DispatchedAction;

  /** Sanitize state before sending */
  stateSanitizer?: (state: unknown, portName: string) => unknown;
}
```

### 12.3 Custom Middleware

```typescript
// Analytics middleware
const analyticsMiddleware: Middleware = api => next => action => {
  const prevState = api.getState(action.port);
  next(action);
  const nextState = api.getState(action.port);

  if (action.port.name === "Cart") {
    analytics.track("cart_action", {
      action: action.type,
      itemCount: nextState.items.length,
    });
  }
};

// Validation middleware
const validationMiddleware: Middleware = api => next => action => {
  if (action.port.name === "Cart" && action.type === "Cart/updateQuantity") {
    const { quantity } = action.payload as { quantity: number };
    if (quantity < 0 || quantity > 100) {
      console.warn("Invalid quantity:", quantity);
      return; // Block action
    }
  }
  next(action);
};

// Persistence middleware
const persistenceMiddleware =
  (storage: Storage): Middleware =>
  api =>
  next =>
  action => {
    next(action);

    const portsToPerist = ["Cart", "Settings", "User"];
    if (portsToPerist.includes(action.port.name)) {
      const state = api.getState(action.port);
      storage.setItem(`store_${action.port.name}`, JSON.stringify(state));
    }
  };

// Usage
const store = createStore({
  middleware: [
    loggerMiddleware(),
    thunkMiddleware(),
    analyticsMiddleware,
    validationMiddleware,
    persistenceMiddleware(localStorage),
    devToolsMiddleware({ name: "MyApp" }),
  ],
});
```

### 12.4 Middleware Composition

```typescript
// Middleware runs in order: first -> last
// Action flows: first -> ... -> last -> reducer
// State flows: reducer -> last -> ... -> first

const store = createStore({
  middleware: [
    loggerMiddleware(), // 1. Logs action entry
    validationMiddleware, // 2. Validates payload
    thunkMiddleware(), // 3. Handles async
    analyticsMiddleware, // 4. Tracks analytics
    devToolsMiddleware(), // 5. Sends to DevTools
  ],
});
```

---

## 13. State Lifecycle

### 13.1 Initialization

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              STATE LIFECYCLE                                  │
└──────────────────────────────────────────────────────────────────────────────┘

                         createStore()
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Initialize Store Runtime    │
              │   • Create action dispatcher  │
              │   • Create subscription mgr   │
              │   • Apply middleware          │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Register State Adapters     │
              │   from HexDI Graph            │
              └───────────────┬───────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
      ┌───────────────┐               ┌───────────────┐
      │  CounterPort  │               │   TodoPort    │
      │               │               │               │
      │ initialState: │               │ initialState: │
      │ { count: 0 }  │               │ { items: [] } │
      └───────────────┘               └───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Register Selector Adapters  │
              │   from HexDI Graph            │
              └───────────────────────────────┘
```

### 13.2 Action Dispatch Flow

```
              dispatch(CounterPort, 'increment')
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Create Action Object        │
              │   {                           │
              │     type: 'Counter/increment',│
              │     payload: undefined,       │
              │     meta: { timestamp: ... }  │
              │   }                           │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Run Middleware Chain        │
              │                               │
              │   logger -> thunk -> devtools │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Execute Reducer             │
              │                               │
              │   newState = reducer(         │
              │     currentState,             │
              │     action.payload            │
              │   )                           │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Update State                │
              │   currentState = newState     │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Invalidate Selector Caches  │
              │   (that depend on this port)  │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Notify Subscribers          │
              │   (batched for performance)   │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Run Effects (if any)        │
              │   (async, non-blocking)       │
              └───────────────────────────────┘
```

### 13.3 Selector Computation Flow

```
              store.select(CartTotalPort)
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Resolve SelectorAdapter     │
              │   from HexDI container        │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Get Source States           │
              │   CartPort state              │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Check Memoization Cache     │
              └───────────────┬───────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
      ┌───────────────┐               ┌───────────────┐
      │ Cache HIT     │               │ Cache MISS    │
      │               │               │               │
      │ Return cached │               │ Run adapter's │
      │ result        │               │ select()      │
      └───────────────┘               └───────┬───────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   Store in Cache              │
                              │   Return computed result      │
                              └───────────────────────────────┘
```

### 13.4 State Transitions

```typescript
// State changes are always:
// 1. Synchronous (reducers are pure functions)
// 2. Immutable (new state objects created)
// 3. Predictable (same input = same output)

// Before action
const prevState = { count: 0 };

// Dispatch
store.dispatch(CounterPort, "incrementBy", { amount: 5 });

// After action
const nextState = store.getState(CounterPort);
console.log(nextState); // { count: 5 }
console.log(prevState === nextState); // false (immutable)
```

---

## 14. Effects & Side Effects

### 14.1 Effect Definition

Effects are side effects that run after reducers:

```typescript
const TodoAdapter = createStateAdapter(TodoPort, {
  requires: [ApiClientPort, NotificationPort],
  reducers: {
    addTodo: (state, { text }) => ({
      ...state,
      items: [...state.items, createTodo(text)],
    }),
    removeTodo: (state, { id }) => ({
      ...state,
      items: state.items.filter(t => t.id !== id),
    }),
    // ... other reducers
  },
  effects: ({ api, notification }) => ({
    // Sync effect
    addTodo: ({ state, payload }) => {
      console.log(`Todo added: ${payload.text}`);
    },

    // Async effect
    removeTodo: async ({ state, payload, dispatch }) => {
      try {
        await api.delete(`/todos/${payload.id}`);
      } catch (error) {
        notification.error("Failed to delete todo");
      }
    },
  }),
});
```

### 14.2 Effect Context

```typescript
interface EffectContext<TState, TPayload> {
  /** Current state (after reducer) */
  state: TState;

  /** Previous state (before reducer) */
  prevState: TState;

  /** Action payload */
  payload: TPayload;

  /** Dispatch other actions */
  dispatch: <P extends StatePort<any, any, any>>(
    port: P,
    action: keyof InferActions<P>,
    payload?: unknown
  ) => void;

  /** Get state from any port */
  getState: <P extends StatePort<any, any, any>>(port: P) => InferState<P>;
}
```

### 14.3 Effect Patterns

```typescript
// Logging effect
effects: () => ({
  '*': ({ state, prevState, payload }) => {
    console.log('State changed:', { prevState, state, payload });
  },
}),

// Persistence effect
effects: ({ storage }) => ({
  addItem: async ({ state }) => {
    await storage.set('cart', state.items);
  },
  removeItem: async ({ state }) => {
    await storage.set('cart', state.items);
  },
}),

// Analytics effect
effects: ({ analytics }) => ({
  loginSuccess: ({ payload }) => {
    analytics.identify(payload.user.id);
    analytics.track('login_success');
  },
  logout: () => {
    analytics.track('logout');
    analytics.reset();
  },
}),

// Cascading actions effect
effects: () => ({
  checkout: async ({ dispatch, getState }) => {
    const cart = getState(CartPort);
    dispatch(CartPort, 'clearCart');
    dispatch(NotificationPort, 'show', {
      message: `Order placed for ${cart.items.length} items`,
      type: 'success',
    });
  },
}),
```

### 14.4 Effect Error Handling

```typescript
const store = createStore({
  onEffectError: (error, action) => {
    console.error(`Effect error in ${action.type}:`, error);
    errorTracker.captureException(error, {
      extra: { action: action.type, payload: action.payload },
    });
  },
});
```

---

## 15. HexDI Integration

### 15.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HEXDI CONTAINER                                 │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ ApiClientPort   │  │ StoragePort     │  │ AnalyticsPort   │             │
│  │ (infrastructure)│  │ (infrastructure)│  │ (infrastructure)│             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                │                                            │
│                                ▼                                            │
│                    ┌───────────────────────┐                               │
│                    │      StorePort        │                               │
│                    │      (singleton)      │                               │
│                    └───────────┬───────────┘                               │
│                                │                                            │
│           ┌────────────────────┼────────────────────┐                       │
│           │                    │                    │                       │
│           ▼                    ▼                    ▼                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  CounterPort    │  │    TodoPort     │  │    CartPort     │             │
│  │ (state adapter) │  │ (state adapter) │  │ (state adapter) │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│           │                    │                    │                       │
│           ▼                    ▼                    ▼                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ DoubleCountPort │  │ VisibleTodos    │  │ CartTotalPort   │             │
│  │ (selector adp.) │  │ (selector adp.) │  │ (selector adp.) │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 15.2 Graph Composition

```typescript
// Production graph
const ProductionGraph = createGraph()
  // Infrastructure
  .provide(
    createAdapter(ApiClientPort, {
      lifetime: "singleton",
      factory: () =>
        createApiClient({
          baseURL: process.env.API_URL,
        }),
    })
  )
  .provide(LocalStorageAdapter)
  .provide(AnalyticsAdapter)

  // Store infrastructure
  .provide(StoreAdapter)

  // State adapters
  .provide(CounterAdapter)
  .provide(TodoAdapter)
  .provide(AuthAdapter)
  .provide(CartAdapter)

  // Selector adapters
  .provide(DoubleCountAdapter)
  .provide(VisibleTodosAdapter)
  .provide(TodoStatsAdapter)
  .provide(CartTotalAdapter)

  .build();

// Test graph with mock adapters
const TestGraph = createGraph()
  .provide(MockApiClientAdapter)
  .provide(InMemoryStorageAdapter)
  .provide(NoopAnalyticsAdapter)

  .provide(StoreAdapter)

  .provide(MockCounterAdapter) // Different reducer behavior
  .provide(TodoAdapter)
  .provide(MockAuthAdapter)
  .provide(CartAdapter)

  .provide(MockDoubleCountAdapter) // Different selector behavior
  .provide(VisibleTodosAdapter)
  .provide(TodoStatsAdapter)
  .provide(MockCartTotalAdapter)

  .build();
```

### 15.3 Resolution Flow

```typescript
// When useStatePort(CounterPort) is called:

// 1. React hook gets container from HexDI context
const container = useContainer();

// 2. Resolve Store (singleton, created once)
const store = container.resolve(StorePort);

// 3. Store has already registered CounterAdapter during initialization
// 4. Return state and bound actions
const state = store.getState(CounterPort);
const actions = store.getActions(CounterPort);

// When useSelector(CartTotalPort) is called:

// 1. Resolve Store
const store = container.resolve(StorePort);

// 2. Store resolves CartTotalAdapter from container
// 3. Adapter's select() is called with source states
// 4. Return computed result (memoized)
const total = store.select(CartTotalPort);
```

### 15.4 Scoped State

With HexDI's scoped resolution, state can be request-scoped:

```typescript
// Request-scoped state adapter
const RequestStateAdapter = createStateAdapter(RequestStatePort, {
  lifetime: "scoped", // New state per scope
  reducers: {
    setRequestId: (state, { requestId }) => ({ ...state, requestId }),
    setUser: (state, { user }) => ({ ...state, user }),
  },
});

// Each request scope gets its own state
app.use((req, res, next) => {
  const scope = container.createScope();
  const store = scope.resolve(StorePort);

  store.dispatch(RequestStatePort, "setRequestId", { requestId: req.id });
  store.dispatch(RequestStatePort, "setUser", { user: req.user });

  req.store = store;
  next();
});
```

---

## 16. React Integration

### 16.1 Provider Setup

```typescript
// StoreProvider must be inside HexDIProvider
function App() {
  return (
    <HexDIProvider graph={graph}>
      <StoreProvider>
        <Router />
      </StoreProvider>
    </HexDIProvider>
  );
}

// StoreProvider implementation
function StoreProvider({ children }: { children: React.ReactNode }) {
  const container = useContainer();
  const store = container.resolve(StorePort);

  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  );
}
```

### 16.2 useStatePort Hook

```typescript
function useStatePort<P extends StatePort<any, any, any>>(port: P): StatePortResult<P>;

interface StatePortResult<P extends StatePort<any, any, any>> {
  /** Current state */
  state: InferState<P>;

  /** Bound action creators */
  actions: BoundActions<InferActions<P>>;

  /** Reset to initial state */
  reset: () => void;
}
```

#### Usage Examples

```typescript
// Basic usage
function Counter() {
  const { state, actions } = useStatePort(CounterPort);

  return (
    <div>
      <span>{state.count}</span>
      <button onClick={actions.increment}>+</button>
      <button onClick={actions.decrement}>-</button>
      <button onClick={() => actions.incrementBy({ amount: 10 })}>+10</button>
    </div>
  );
}

// With destructuring
function TodoList() {
  const { state: { items, filter }, actions } = useStatePort(TodoPort);

  return (
    <div>
      <FilterButtons
        filter={filter}
        onChange={(f) => actions.setFilter({ filter: f })}
      />
      <ul>
        {items.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={() => actions.toggleTodo({ id: todo.id })}
            onRemove={() => actions.removeTodo({ id: todo.id })}
          />
        ))}
      </ul>
      <AddTodo onAdd={(text) => actions.addTodo({ text })} />
    </div>
  );
}
```

### 16.3 useSelector Hook

```typescript
function useSelector<P extends SelectorPort<any, any, any>>(
  port: P,
): InferSelectorResult<P>;

// Usage
function CartTotal() {
  const { total, itemCount, discount } = useSelector(CartTotalPort);

  return (
    <div>
      <span>{itemCount} items</span>
      {discount > 0 && <span>Discount: -${discount.toFixed(2)}</span>}
      <span>Total: ${total.toFixed(2)}</span>
    </div>
  );
}

function TodoStats() {
  const { active, completed, percentComplete } = useSelector(TodoStatsPort);

  return (
    <div>
      <span>{active} active</span>
      <span>{completed} completed</span>
      <ProgressBar value={percentComplete} />
    </div>
  );
}
```

### 16.4 useStateValue Hook

For reading state without actions:

```typescript
function useStateValue<P extends StatePort<any, any, any>, TSelected>(
  port: P,
  selector?: (state: InferState<P>) => TSelected,
): TSelected;

// Usage
function UserName() {
  const authState = useStateValue(AuthPort);
  return <span>{authState.user?.name}</span>;
}

function ItemCount() {
  const count = useStateValue(CartPort, (state) => state.items.length);
  return <span>{count} items</span>;
}
```

### 16.5 useDispatch Hook

For dispatching without subscribing:

```typescript
function useDispatch<P extends StatePort<any, any, any>>(
  port: P,
): BoundActions<InferActions<P>>;

// Usage
function LogoutButton() {
  const dispatch = useDispatch(AuthPort);
  return <button onClick={dispatch.logout}>Logout</button>;
}
```

### 16.6 useStore Hook

For direct store access:

```typescript
function useStore(): Store;

// Usage (for advanced cases)
function DevPanel() {
  const store = useStore();

  const handleReset = () => store.resetAll();
  const handleExport = () => {
    const state = {
      counter: store.getState(CounterPort),
      todos: store.getState(TodoPort),
    };
    console.log(JSON.stringify(state, null, 2));
  };

  return (
    <div>
      <button onClick={handleReset}>Reset All</button>
      <button onClick={handleExport}>Export State</button>
    </div>
  );
}
```

### 16.7 Performance Optimization

```typescript
// Use selector port for derived values (memoized via adapter)
function VisibleTodos() {
  const todos = useSelector(VisibleTodosPort);
  return <TodoList todos={todos} />;
}

// Use state value with inline selector for partial state
function CartItemCount() {
  const count = useStateValue(CartPort, (s) => s.items.length);
  return <Badge count={count} />;
}

// Memoize callbacks that use dispatch
function TodoItem({ id }: { id: string }) {
  const { actions } = useStatePort(TodoPort);

  const handleToggle = useCallback(() => {
    actions.toggleTodo({ id });
  }, [actions, id]);

  const handleRemove = useCallback(() => {
    actions.removeTodo({ id });
  }, [actions, id]);

  // ...
}
```

---

## 17. Testing Patterns

### 17.1 Swap Adapters

The primary testing strategy is swapping adapters:

```typescript
// Production adapters
const AuthAdapter = createStateAdapter(AuthPort, {
  requires: [ApiClientPort, StoragePort],
  reducers: { /* ... */ },
  effects: ({ api, storage }) => ({
    loginSuccess: async ({ state }) => {
      await api.post('/session', { token: state.token });
      await storage.set('token', state.token);
    },
  }),
});

const CartTotalAdapter = createSelectorAdapter(CartTotalPort, {
  select: (cart) => {
    const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return { subtotal, discount: 0, total: subtotal, itemCount: cart.items.length };
  },
});

// Test adapters - no side effects, predictable values
const MockAuthAdapter = createStateAdapter(AuthPort, {
  reducers: {
    loginStart: (state) => ({ ...state, status: 'loading' }),
    loginSuccess: (state, payload) => ({
      ...state,
      ...payload,
      status: 'authenticated',
    }),
    loginError: (state, { error }) => ({ ...state, status: 'error', error }),
    logout: () => AuthPort.initialState,
    refreshToken: (state, { token }) => ({ ...state, token }),
  },
  // No effects in test adapter
});

const MockCartTotalAdapter = createSelectorAdapter(CartTotalPort, {
  select: () => ({
    subtotal: 100,  // Fixed values for predictable tests
    discount: 0,
    total: 100,
    itemCount: 2,
  }),
});

// Test
test('shows user name after login', async () => {
  const testGraph = createGraph()
    .provide(StoreAdapter)
    .provide(MockAuthAdapter)
    .provide(MockCartTotalAdapter)
    .build();

  render(
    <HexDIProvider graph={testGraph}>
      <StoreProvider>
        <UserProfile />
      </StoreProvider>
    </HexDIProvider>
  );

  const store = /* get store from test utils */;
  store.dispatch(AuthPort, 'loginSuccess', {
    user: { id: '1', name: 'Test User' },
    token: 'test-token',
  });

  expect(await screen.findByText('Test User')).toBeInTheDocument();
});
```

### 17.2 Test Utilities

```typescript
// packages/store/testing.ts

/** Create a test wrapper with store support */
function createStoreTestWrapper(config: {
  stateAdapters: StateAdapter<any>[];
  selectorAdapters: SelectorAdapter<any>[];
}) {
  const graph = createGraph()
    .provide(StoreAdapter)
    .provideAll(config.stateAdapters)
    .provideAll(config.selectorAdapters)
    .build();

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <HexDIProvider graph={graph}>
        <StoreProvider>
          {children}
        </StoreProvider>
      </HexDIProvider>
    );
  };
}

/** Create a mock state adapter with predefined state */
function createMockStateAdapter<P extends StatePort<any, any, any>>(
  port: P,
  initialState?: Partial<InferState<P>>,
): StateAdapter<P> {
  const state = { ...port.initialState, ...initialState };

  return createStateAdapter(port, {
    reducers: Object.keys(port.actions).reduce((acc, key) => ({
      ...acc,
      [key]: (s: any, payload: any) => ({ ...s, ...payload }),
    }), {} as Reducers<P>),
  });
}

/** Create a mock selector adapter with fixed return value */
function createMockSelectorAdapter<P extends SelectorPort<any, any, any>>(
  port: P,
  fixedValue: InferSelectorResult<P>,
): SelectorAdapter<P> {
  return createSelectorAdapter(port, {
    select: () => fixedValue,
  });
}

/** Wait for state to match condition */
async function waitForState<P extends StatePort<any, any, any>>(
  store: Store,
  port: P,
  predicate: (state: InferState<P>) => boolean,
  timeout = 1000,
): Promise<InferState<P>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout waiting for state'));
    }, timeout);

    const check = () => {
      const state = store.getState(port);
      if (predicate(state)) {
        clearTimeout(timer);
        unsubscribe();
        resolve(state);
      }
    };

    const unsubscribe = store.subscribe(port, check);
    check();
  });
}
```

### 17.3 Testing Examples

```typescript
// Test reducer logic
test('increment increases count', () => {
  const graph = createGraph()
    .provide(StoreAdapter)
    .provide(CounterAdapter)
    .build();

  const container = createContainer(graph);
  const store = container.resolve(StorePort);

  expect(store.getState(CounterPort).count).toBe(0);
  store.dispatch(CounterPort, 'increment');
  expect(store.getState(CounterPort).count).toBe(1);
});

// Test selector logic
test('CartTotalSelector computes correctly', () => {
  const graph = createGraph()
    .provide(StoreAdapter)
    .provide(CartAdapter)
    .provide(CartTotalAdapter)
    .build();

  const container = createContainer(graph);
  const store = container.resolve(StorePort);

  store.dispatch(CartPort, 'addItem', {
    item: { productId: '1', name: 'Item 1', price: 10 },
  });
  store.dispatch(CartPort, 'addItem', {
    item: { productId: '2', name: 'Item 2', price: 20 },
  });

  const total = store.select(CartTotalPort);
  expect(total.subtotal).toBe(30);
  expect(total.itemCount).toBe(2);
});

// Test with mock selector
test('displays cart total from mock', () => {
  const wrapper = createStoreTestWrapper({
    stateAdapters: [CartAdapter],
    selectorAdapters: [
      createMockSelectorAdapter(CartTotalPort, {
        subtotal: 100,
        discount: 10,
        total: 90,
        itemCount: 5,
      }),
    ],
  });

  render(<CartSummary />, { wrapper });

  expect(screen.getByText('5 items')).toBeInTheDocument();
  expect(screen.getByText('$90.00')).toBeInTheDocument();
});

// Test subscription
test('subscribes to state changes', () => {
  const graph = createGraph()
    .provide(StoreAdapter)
    .provide(CounterAdapter)
    .build();

  const container = createContainer(graph);
  const store = container.resolve(StorePort);

  const listener = vi.fn();
  const unsubscribe = store.subscribe(CounterPort, listener);

  store.dispatch(CounterPort, 'increment');
  expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 });

  unsubscribe();
  store.dispatch(CounterPort, 'increment');
  expect(listener).toHaveBeenCalledTimes(1); // No second call
});
```

---

## 18. Advanced Patterns

### 18.1 State Machines

```typescript
type AuthMachineState =
  | { status: "idle" }
  | { status: "authenticating" }
  | { status: "authenticated"; user: User; token: string }
  | { status: "error"; error: string };

const AuthMachinePort = createStatePort({
  name: "AuthMachine",
  initialState: { status: "idle" } as AuthMachineState,
  actions: {
    startAuth: action(),
    authSuccess: action<{ user: User; token: string }>(),
    authError: action<{ error: string }>(),
    logout: action(),
  },
});

const AuthMachineAdapter = createStateAdapter(AuthMachinePort, {
  reducers: {
    startAuth: state => {
      if (state.status !== "idle") return state;
      return { status: "authenticating" };
    },
    authSuccess: (state, { user, token }) => {
      if (state.status !== "authenticating") return state;
      return { status: "authenticated", user, token };
    },
    authError: (state, { error }) => {
      if (state.status !== "authenticating") return state;
      return { status: "error", error };
    },
    logout: () => ({ status: "idle" }),
  },
});
```

### 18.2 Undo/Redo

```typescript
interface UndoableState<T> {
  past: T[];
  present: T;
  future: T[];
}

function createUndoablePort<T>(name: string, initialState: T) {
  return createStatePort({
    name,
    initialState: {
      past: [],
      present: initialState,
      future: [],
    } as UndoableState<T>,
    actions: {
      set: action<{ value: T }>(),
      undo: action(),
      redo: action(),
      reset: action(),
    },
  });
}

function createUndoableAdapter<T>(port: ReturnType<typeof createUndoablePort<T>>, initialState: T) {
  return createStateAdapter(port, {
    reducers: {
      set: (state, { value }) => ({
        past: [...state.past, state.present],
        present: value,
        future: [],
      }),
      undo: state => {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        return {
          past: state.past.slice(0, -1),
          present: previous,
          future: [state.present, ...state.future],
        };
      },
      redo: state => {
        if (state.future.length === 0) return state;
        const next = state.future[0];
        return {
          past: [...state.past, state.present],
          present: next,
          future: state.future.slice(1),
        };
      },
      reset: () => ({
        past: [],
        present: initialState,
        future: [],
      }),
    },
  });
}
```

### 18.3 Optimistic Updates

```typescript
interface OptimisticItem {
  id: string;
  data: unknown;
  optimistic?: boolean;
  error?: string;
}

const OptimisticListPort = createStatePort({
  name: "OptimisticList",
  initialState: {
    items: [] as OptimisticItem[],
    pendingIds: new Set<string>(),
  },
  actions: {
    addOptimistic: action<{ id: string; data: unknown }>(),
    confirmOptimistic: action<{ id: string }>(),
    revertOptimistic: action<{ id: string; error: string }>(),
    remove: action<{ id: string }>(),
  },
});

const OptimisticListAdapter = createStateAdapter(OptimisticListPort, {
  requires: [ApiClientPort],
  reducers: {
    addOptimistic: (state, { id, data }) => ({
      items: [...state.items, { id, data, optimistic: true }],
      pendingIds: new Set([...state.pendingIds, id]),
    }),
    confirmOptimistic: (state, { id }) => ({
      items: state.items.map(item => (item.id === id ? { ...item, optimistic: false } : item)),
      pendingIds: new Set([...state.pendingIds].filter(i => i !== id)),
    }),
    revertOptimistic: (state, { id, error }) => ({
      items: state.items.map(item =>
        item.id === id ? { ...item, error, optimistic: false } : item
      ),
      pendingIds: new Set([...state.pendingIds].filter(i => i !== id)),
    }),
    remove: (state, { id }) => ({
      ...state,
      items: state.items.filter(item => item.id !== id),
    }),
  },
  effects: ({ api }) => ({
    addOptimistic: async ({ payload, dispatch }) => {
      try {
        await api.post("/items", payload.data);
        dispatch(OptimisticListPort, "confirmOptimistic", { id: payload.id });
      } catch (error) {
        dispatch(OptimisticListPort, "revertOptimistic", {
          id: payload.id,
          error: error.message,
        });
      }
    },
  }),
});
```

### 18.4 Multi-Tenant State

```typescript
function createTenantGraph(tenantId: string, config: TenantConfig) {
  // State adapter with tenant-specific reducer logic
  const CartAdapter = createStateAdapter(CartPort, {
    reducers: {
      addItem: (state, { item }) => ({
        ...state,
        items: [...state.items, {
          ...item,
          price: item.price * config.priceMultiplier, // Tenant-specific
        }],
      }),
      // ... other reducers
    },
  });

  // Selector adapter with tenant-specific computation
  const CartTotalAdapter = createSelectorAdapter(CartTotalPort, {
    select: (cart) => {
      const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const taxRate = config.taxRate; // Tenant-specific
      const tax = subtotal * taxRate;
      return {
        subtotal,
        tax,
        total: subtotal + tax,
        itemCount: cart.items.length,
      };
    },
  });

  return createGraph()
    .provide(StoreAdapter)
    .provide(CartAdapter)
    .provide(CartTotalAdapter)
    .build();
}

function App() {
  const tenantId = useTenantId();
  const config = useTenantConfig(tenantId);
  const graph = useMemo(
    () => createTenantGraph(tenantId, config),
    [tenantId, config]
  );

  return (
    <HexDIProvider graph={graph}>
      <StoreProvider>
        <TenantApp />
      </StoreProvider>
    </HexDIProvider>
  );
}
```

### 18.5 State Hydration

```typescript
async function hydrateStore(store: Store, storage: Storage) {
  const persistedPorts = [CartPort, SettingsPort, UserPreferencesPort];

  for (const port of persistedPorts) {
    const saved = await storage.get(`store_${port.name}`);
    if (saved) {
      const state = JSON.parse(saved);
      store.dispatch(port, "hydrate", { state });
    }
  }
}

// Add hydrate action to ports that need persistence
const CartPort = createStatePort({
  name: "Cart",
  initialState: { items: [], discountCode: null, discountPercent: 0 },
  actions: {
    // ... regular actions
    hydrate: action<{ state: CartState }>(),
  },
});

const CartAdapter = createStateAdapter(CartPort, {
  reducers: {
    // ... regular reducers
    hydrate: (_, { state }) => state,
  },
});
```

---

## 19. API Reference

### 19.1 @hex-di/store Exports

```typescript
// Ports
export { createStatePort } from "./ports/state-port";
export { createSelectorPort } from "./ports/selector-port";
export { action } from "./ports/action-port";
export type { StatePort, SelectorPort, ActionDefinition, ActionDefinitions } from "./ports/types";

// Adapters
export { createStateAdapter } from "./adapters/state-adapter";
export { createSelectorAdapter } from "./adapters/selector-adapter";
export type {
  StateAdapter,
  SelectorAdapter,
  Reducers,
  Reducer,
  Effects,
  Effect,
  SelectorFunction,
  SelectorOptions,
} from "./adapters/types";

// Store
export { createStore, StorePort, StoreAdapter } from "./store/store";
export type { Store, StoreConfig, DevToolsConfig } from "./store/types";

// Middleware
export { loggerMiddleware } from "./middleware/logger";
export { thunkMiddleware } from "./middleware/thunk";
export { devToolsMiddleware } from "./middleware/devtools";
export type { Middleware, MiddlewareAPI, MiddlewareHandler } from "./middleware/types";

// Type utilities
export type {
  InferState,
  InferActions,
  InferStateName,
  InferActionPayload,
  InferSelectorResult,
  InferSelectorSources,
  BoundAction,
  BoundActions,
  ExtractStates,
} from "./types/utils";
```

### 19.2 @hex-di/store-react Exports

```typescript
// Provider
export { StoreProvider } from "./provider/store-provider";

// Hooks
export { useStatePort } from "./hooks/use-state-port";
export { useSelector } from "./hooks/use-selector";
export { useDispatch } from "./hooks/use-dispatch";
export { useStore } from "./hooks/use-store";
export { useStateValue } from "./hooks/use-state-value";

// Types
export type { StatePortResult, UseStatePortOptions, UseSelectorOptions } from "./types";
```

### 19.3 @hex-di/store-persist Exports

```typescript
export { createPersister } from "./persister";
export { localStorageAdapter } from "./storage/local-storage";
export { sessionStorageAdapter } from "./storage/session-storage";
export { indexedDBAdapter } from "./storage/indexed-db";
export { hydrateStore } from "./hydration";
export type { Persister, PersisterConfig, StorageAdapter } from "./types";
```

---

## 20. Integration with Query & Saga

### 20.1 Store + Query Integration

```typescript
// Sync query results to store
const UserQueryPort = createQueryPort<"User", User, { id: string }>({
  name: "User",
});

const UserStatePort = createStatePort({
  name: "UserState",
  initialState: { user: null as User | null, loading: false, error: null },
  actions: {
    setUser: action<{ user: User }>(),
    setLoading: action<{ loading: boolean }>(),
    setError: action<{ error: string }>(),
    clear: action(),
  },
});

function UserProvider({ userId }: { userId: string }) {
  const query = useQuery(UserQueryPort, { id: userId });
  const { actions } = useStatePort(UserStatePort);

  useEffect(() => {
    if (query.isPending) {
      actions.setLoading({ loading: true });
    } else if (query.isError) {
      actions.setError({ error: query.error.message });
    } else if (query.data) {
      actions.setUser({ user: query.data });
    }
  }, [query.isPending, query.isError, query.data, actions]);

  return null;
}
```

### 20.2 Store + Saga Integration

```typescript
const CheckoutSaga = defineSaga("CheckoutSaga")
  .input<{ userId: string }>()
  .step(
    defineStep("GetCartFromStore")
      .invoke(StoreReadPort)
      .withParams(ctx => ({ port: CartPort }))
      .skipCompensation()
      .build()
  )
  .step(
    defineStep("ProcessPayment")
      .invoke(PaymentPort)
      .withParams(ctx => ({
        amount: ctx.results.GetCartFromStore.total,
        userId: ctx.input.userId,
      }))
      .compensate(ctx => ({
        action: "refund",
        transactionId: ctx.stepResult.transactionId,
      }))
      .build()
  )
  .step(
    defineStep("ClearCart")
      .invoke(StoreWritePort)
      .withParams(ctx => ({
        port: CartPort,
        action: "clearCart",
      }))
      .compensate(ctx => ({
        port: CartPort,
        action: "restoreCart",
        payload: ctx.results.GetCartFromStore.items,
      }))
      .build()
  )
  .output(results => ({
    transactionId: results.ProcessPayment.transactionId,
  }))
  .build();
```

### 20.3 Unified Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION                                     │
│                                                                             │
│   Components use:                                                           │
│   • useStatePort() for local UI state                                       │
│   • useSelector() for derived computations                                  │
│   • useQuery() for server data                                              │
│   • useSaga() for complex workflows                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
           │   STORE      │ │    QUERY     │ │    SAGA      │
           │              │ │              │ │              │
           │ Client state │ │ Server data  │ │ Workflows    │
           │ UI state     │ │ Cache        │ │ Compensation │
           │ Selectors    │ │ Sync         │ │ Long-running │
           └──────────────┘ └──────────────┘ └──────────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │        HEXDI CONTAINER        │
                    │                               │
                    │  All resolved through ports   │
                    │  All testable via adapters    │
                    └───────────────────────────────┘
```

---

## Appendix A: Comparison with Other Libraries

| Feature                    | Redux    | Zustand | Jotai  | MobX | HexDI Store         |
| -------------------------- | -------- | ------- | ------ | ---- | ------------------- |
| Type safety                | Partial  | Partial | Good   | Good | **Full**            |
| Boilerplate                | High     | Low     | Low    | Low  | Medium              |
| DevTools                   | Yes      | Yes     | Yes    | Yes  | Yes                 |
| Middleware                 | Yes      | Limited | No     | No   | Yes                 |
| Computed                   | Reselect | No      | Yes    | Yes  | **SelectorAdapter** |
| **DI integration**         | No       | No      | No     | No   | **Yes**             |
| **Adapter swapping**       | No       | No      | No     | No   | **Yes**             |
| **Port/Adapter pattern**   | No       | No      | No     | No   | **Yes**             |
| **Compile-time contracts** | No       | No      | No     | No   | **Yes**             |
| Multi-tenant               | Hard     | Hard    | Medium | Hard | **Easy**            |

---

## Appendix B: Glossary

| Term                | Definition                                                                     |
| ------------------- | ------------------------------------------------------------------------------ |
| **StatePort**       | Contract declaring what state exists and what actions can modify it (no logic) |
| **SelectorPort**    | Contract declaring what derived computation exists (no logic)                  |
| **StateAdapter**    | Implementation of how actions modify state (reducers + effects)                |
| **SelectorAdapter** | Implementation of how derived state is computed (select function)              |
| **Store**           | Runtime container that manages state and dispatches actions                    |
| **Reducer**         | Pure function that takes state and payload, returns new state                  |
| **Effect**          | Side effect that runs after a reducer completes                                |
| **Middleware**      | Function that intercepts actions before they reach reducers                    |
| **Subscription**    | Callback notified when state changes                                           |

---

## Appendix C: Design Decisions

### Why Ports for State?

Traditional state libraries couple components to state implementation. With ports, components only know about contracts:

```typescript
// Redux: tightly coupled
import { increment, selectCount } from "./counterSlice";

// HexDI Store: loosely coupled
const { state, actions } = useStatePort(CounterPort);
```

### Why Separate SelectorAdapter?

Following hexagonal architecture, selector ports declare **what** derivations exist, and selector adapters implement **how** they work. This enables:

1. **Testing** - Mock selectors return fixed values
2. **Multi-tenancy** - Different computation per tenant
3. **A/B testing** - Different selector logic per segment
4. **Flexibility** - Change computation without touching components

```typescript
// Production
const CartTotalAdapter = createSelectorAdapter(CartTotalPort, {
  select: cart => computeRealTotal(cart),
});

// Test
const MockCartTotalAdapter = createSelectorAdapter(CartTotalPort, {
  select: () => ({ total: 100, itemCount: 2 }), // Fixed for tests
});

// Tenant A
const TenantACartTotalAdapter = createSelectorAdapter(CartTotalPort, {
  select: cart => computeWithTaxRateA(cart),
});
```

### Why Effects Instead of Thunks?

Effects run **after** state changes, keeping reducers pure and predictable:

```typescript
// State change is synchronous and predictable
reducers: {
  loginSuccess: (state, payload) => ({ ...state, ...payload }),
},

// Side effects happen after, clearly separated
effects: ({ storage }) => ({
  loginSuccess: async ({ state }) => {
    await storage.set('token', state.token);
  },
}),
```

---

_End of Specification_
