# 03 - State Ports

_Previous: [02 - Core Concepts](./02-core-concepts.md)_

---

All state ports extend `DirectedPort<TService, TName, "outbound">` from `@hex-di/core`. They are real ports that work with `GraphBuilder.provide()`, `container.resolve()`, and all existing HexDI infrastructure.

## 9. createStatePort

Creates a port for object state with typed actions. The port is a purely phantom-typed token — it carries type information (state shape, action signatures) but no runtime behavior. Initial state and reducer implementations are provided by `createStateAdapter`.

### Signature

```typescript
function createStatePort<TState, TActions extends ActionMap<TState>>(): <
  const TName extends string,
>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}) => StatePortDef<TName, TState, TActions>;
```

### Return type

```typescript
declare const __stateType: unique symbol;
declare const __actionsType: unique symbol;

type StatePortDef<TName extends string, TState, TActions extends ActionMap<TState>> = DirectedPort<
  StateService<TState, TActions>,
  TName,
  "outbound"
> & {
  /** Phantom type for state inference (unique symbol prevents structural matching) */
  readonly [__stateType]: TState;
  /** Phantom type for actions inference (unique symbol prevents structural matching) */
  readonly [__actionsType]: TActions;
};
```

The `[__stateType]` and `[__actionsType]` properties are phantom types branded with unique symbols — they carry type information without runtime cost while preventing accidental structural compatibility between unrelated ports. They enable `InferStateType<P>` and `InferActionsType<P>` type utilities.

Note that `StatePortDef` no longer carries `initial` — initial state is provided by the adapter, consistent with how `@hex-di/flow`'s `FlowAdapterConfig.machine` carries the machine definition rather than the port.

### Usage

```typescript
interface TodoState {
  items: Array<{ id: string; text: string; done: boolean }>;
  filter: "all" | "active" | "done";
}

interface TodoActions extends ActionMap<TodoState> {
  addItem: ActionReducer<TodoState, { text: string }>;
  toggleItem: ActionReducer<TodoState, { id: string }>;
  removeItem: ActionReducer<TodoState, { id: string }>;
  setFilter: ActionReducer<TodoState, "all" | "active" | "done">;
  clearCompleted: ActionReducer<TodoState>;
}

const TodoPort = createStatePort<TodoState, TodoActions>()({
  name: "Todo",
  category: "todo",
  tags: ["domain", "crud"],
});

// TodoPort is a DirectedPort<StateService<TodoState, TodoActions>, "Todo", "outbound">
// It works with GraphBuilder.provide(), container.resolve(), etc.
// Initial state and reducer implementations are provided by createStateAdapter (see §13).
```

### Graph discoverability: category and tags

State ports support optional `category` and `tags` fields that propagate to `PortMetadata`. These enable graph-level filtering and MCP resource queries:

```typescript
// AI agent can query: hexdi://graph/topology?filter=category:auth
const AuthPort = createStatePort<AuthState, AuthActions>()({
  name: "Auth",
  category: "auth",
  tags: ["security", "session"],
});
```

Categories and tags are stored as runtime values in `PortMetadata` and are queryable through graph introspection. This aligns with the VISION.md goal of every library contributing to the application's self-knowledge: an AI agent querying `hexdi://graph/topology?filter=category:order` discovers all order-related state ports alongside order-related services.

### Curried form

`createStatePort` uses a curried form (`createStatePort<TState, TActions>()(config)`) to enable explicit state and action type annotation while inferring the name literal. TypeScript cannot partially infer generic parameters — currying separates the explicit parameters (`TState`, `TActions`) from the inferred one (`TName`).

## 10. createAtomPort

Creates a port for a single reactive value. Atoms are simpler than state ports -- no actions, just get/set/update. Each atom is an independent subscription unit. Like state ports, atom ports are purely phantom-typed tokens -- they carry type information but no runtime behavior. The initial value is provided by `createAtomAdapter`.

### Signature

```typescript
function createAtomPort<TValue>(): <const TName extends string>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}) => AtomPortDef<TName, TValue>;
```

### Return type

```typescript
declare const __atomType: unique symbol;

type AtomPortDef<TName extends string, TValue> = DirectedPort<
  AtomService<TValue>,
  TName,
  "outbound"
> & {
  /** Phantom type for value inference (unique symbol prevents structural matching) */
  readonly [__atomType]: TValue;
};
```

The `[__atomType]` property is a phantom type branded with a unique symbol -- it carries type information without runtime cost while preventing accidental structural compatibility between unrelated atom ports that happen to share the same value type. This is consistent with how `StatePortDef` uses `[__stateType]` and `[__actionsType]`.

Note that `AtomPortDef` does **not** carry `initial` -- initial values are provided by the adapter, consistent with how `StatePortDef` keeps initial state in the adapter and how `@hex-di/flow`'s `FlowPortDef` keeps the machine definition in the adapter. Ports are purely phantom-typed tokens throughout the HexDI ecosystem.

### Usage

```typescript
const ThemePort = createAtomPort<"light" | "dark">()({
  name: "Theme",
});

const LocalePort = createAtomPort<string>()({
  name: "Locale",
});

const SidebarExpandedPort = createAtomPort<boolean>()({
  name: "SidebarExpanded",
});

// Resolution (initial value comes from the adapter, see §14)
const atom = container.resolve(ThemePort);
atom.value; // DeepReadonly<"light" | "dark">

// Subscription
atom.subscribe((value, prev) => {
  document.documentElement.dataset.theme = value;
});
atom.set("dark");
```

### When to use atoms vs state ports

| Use Atom when...            | Use StatePort when...               |
| --------------------------- | ----------------------------------- |
| Single independent value    | Multiple related fields             |
| Simple get/set operations   | Complex action reducers             |
| No cross-field invariants   | Fields have invariant relationships |
| Subscriptions are per-value | Subscriptions need action context   |

## 11. createDerivedPort

Creates a port for computed values derived from other ports. The computation is defined in the adapter (via `createDerivedAdapter`), not the port. The port only declares the result type.

### Signature

```typescript
function createDerivedPort<TResult>(): <const TName extends string>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}) => DerivedPortDef<TName, TResult>;
```

### Return type

```typescript
type DerivedPortDef<TName extends string, TResult> = DirectedPort<
  DerivedService<TResult>,
  TName,
  "outbound"
>;
```

### Usage

```typescript
interface CartTotal {
  subtotal: number;
  discount: number;
  total: number;
  itemCount: number;
}

const CartTotalPort = createDerivedPort<CartTotal>()({
  name: "CartTotal",
  description: "Computed cart totals from cart items and discounts",
});

const DoubleCountPort = createDerivedPort<number>()({
  name: "DoubleCount",
});

const FilteredTodosPort = createDerivedPort<Array<{ id: string; text: string; done: boolean }>>()({
  name: "FilteredTodos",
});

// Resolution
const cartTotal = container.resolve(CartTotalPort);
cartTotal.value; // DeepReadonly<CartTotal>
```

### Why the computation is in the adapter

Derived ports follow hexagonal architecture: the port declares the contract (what type of value is provided), and the adapter implements it (how it's computed from which dependencies). The adapter uses `requires` to declare its dependencies -- the standard HexDI mechanism.

```typescript
// Port: declares the contract
const CartTotalPort = createDerivedPort<CartTotal>()({ name: "CartTotal" });

// Adapter: implements the computation with DI dependencies
const cartTotalAdapter = createDerivedAdapter({
  provides: CartTotalPort,
  requires: [CartPort] as const,
  select: deps => {
    const cart = deps.Cart.state;
    const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discount = subtotal * (cart.discountPercent / 100);
    return { subtotal, discount, total: subtotal - discount, itemCount: cart.items.length };
  },
});
```

## 11a. createAsyncDerivedPort

Creates a port for computed values derived from asynchronous operations (API calls, lazy imports, expensive computations). The port declares the result type; the adapter defines the async computation and its dependencies.

### Signature

```typescript
function createAsyncDerivedPort<TResult, E = never>(): <const TName extends string>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}) => AsyncDerivedPortDef<TName, TResult, E>;
```

The optional `E` type parameter declares the error type that the async computation may produce. When omitted (defaults to `never`), the snapshot's error variant uses `unknown` — backward-compatible with existing code. When provided, the error variant is typed, enabling exhaustive `switch` handling via `_tag` discriminants.

### Return type

```typescript
declare const __asyncDerivedErrorType: unique symbol;

type AsyncDerivedPortDef<TName extends string, TResult, E = never> = DirectedPort<
  AsyncDerivedService<TResult, E>,
  TName,
  "outbound"
> & {
  /** Phantom type for error inference (unique symbol prevents structural matching) */
  readonly [__asyncDerivedErrorType]: E;
};
```

The `[__asyncDerivedErrorType]` property is a phantom type branded with a unique symbol — it carries the error type without runtime cost while enabling `InferAsyncDerivedErrorType<P>` to extract it for adapter type checking.

### Usage

```typescript
interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  updatedAt: number;
}

// Without typed error (E defaults to never → error variant is unknown)
const ExchangeRatePort = createAsyncDerivedPort<ExchangeRate>()({
  name: "ExchangeRate",
  description: "Live exchange rate fetched from API",
});

// With typed error (E is a tagged union)
interface NetworkError {
  readonly _tag: "NetworkError";
  readonly cause: unknown;
}
interface AuthExpiredError {
  readonly _tag: "AuthExpired";
}
type UserProfileError = NetworkError | AuthExpiredError;

const UserProfilePort = createAsyncDerivedPort<UserProfile, UserProfileError>()({
  name: "UserProfile",
  description: "User profile loaded from API based on current auth state",
});

// Resolution
const rate = container.resolve(ExchangeRatePort);
rate.status; // "idle" | "loading" | "success" | "error"
rate.isLoading; // boolean
rate.refresh(); // Trigger re-fetch

// Discriminated union access via snapshot
const snapshot = rate.snapshot;
if (snapshot.status === "success") {
  snapshot.data; // DeepReadonly<ExchangeRate> — no undefined check needed
}

// Typed error narrowing (see §8 AsyncDerivedSnapshot in 02-core-concepts.md)
const profile = container.resolve(UserProfilePort);
const profileSnapshot = profile.snapshot;
if (profileSnapshot.status === "error") {
  // profileSnapshot.error is UserProfileError (not unknown)
  switch (profileSnapshot.error._tag) {
    case "NetworkError":
      console.error("Network failure:", profileSnapshot.error.cause);
      break;
    case "AuthExpired":
      console.error("Session expired, redirecting to login");
      break;
  }
}
```

### When to use async derived vs synchronous derived

| Use `createDerivedPort` when...     | Use `createAsyncDerivedPort` when...      |
| ----------------------------------- | ----------------------------------------- |
| Computation is synchronous          | Computation involves I/O (API, DB)        |
| Result is always available          | Result may be loading or failed           |
| No retry/refresh needed             | Users may need to retry or refresh        |
| Pure transformation of source state | External data fetch based on source state |

---

_Previous: [02 - Core Concepts](./02-core-concepts.md) | Next: [04 - State Adapters](./04-state-adapters.md)_
