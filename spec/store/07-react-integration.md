# 07 - React Integration

_Previous: [06 - Lifecycle](./06-lifecycle.md)_

---

`@hex-di/store-react` provides hooks that resolve state ports from Container and subscribe to reactive updates. All hooks use HexDI's existing `HexDiContainerProvider` -- there is no separate `StoreProvider`.

## 27. useStateValue

Reads state from a state port with optional selector for fine-grained subscriptions. Re-renders only when the selected value changes.

### Signature

```typescript
function useStateValue<TState, TSelected = DeepReadonly<TState>>(
  port: StatePortDef<string, TState, ActionMap<TState>>,
  selector?: (state: DeepReadonly<TState>) => TSelected,
  equalityFn?: (a: TSelected, b: TSelected) => boolean
): TSelected;
```

### Usage

```typescript
// Full state (re-renders on any state change)
function CounterDisplay() {
  const state = useStateValue(CounterPort);
  return <span>{state.count}</span>;
}

// Selector (re-renders only when count changes)
function CounterBadge() {
  const count = useStateValue(CounterPort, (s) => s.count);
  return <Badge count={count} />;
}

// Selector with custom equality
function CartSummary() {
  const summary = useStateValue(
    CartPort,
    (s) => ({ total: s.total, count: s.items.length }),
    (a, b) => a.total === b.total && a.count === b.count,
  );
  return <span>{summary.count} items, ${summary.total}</span>;
}
```

### Implementation sketch

```typescript
function useStateValue<TState, TSelected>(
  port: StatePortDef<string, TState, ActionMap<TState>>,
  selector?: (state: DeepReadonly<TState>) => TSelected,
  equalityFn?: (a: TSelected, b: TSelected) => boolean
): TSelected {
  const container = useContainer(); // From @hex-di/react
  const service = container.resolve(port);

  return useSyncExternalStore(
    callback => {
      if (selector) {
        return service.subscribe(selector, () => callback(), equalityFn);
      }
      return service.subscribe(() => callback());
    },
    () => (selector ? selector(service.state) : service.state)
  );
}
```

The hook uses React's `useSyncExternalStore` for:

- Tear-free reads (consistent with React's concurrent rendering)
- Automatic subscription management (subscribe/unsubscribe on mount/unmount)
- Server-side rendering compatibility

## 28. useActions

Returns bound actions from a state port without subscribing to state changes. Components that only dispatch actions (buttons, forms) never re-render due to state changes.

**Referential stability:** The returned `BoundActions` object and each action function are referentially stable across renders. This is guaranteed by the underlying `StateService.actions` stability contract -- the service creates bound actions once and returns the same references. Components can safely pass individual actions as props or dependencies without triggering re-renders.

### Signature

```typescript
function useActions<TState, TActions extends ActionMap<TState>>(
  port: StatePortDef<string, TState, TActions>
): BoundActions<TState, TActions>;
```

### Usage

```typescript
function CounterControls() {
  const actions = useActions(CounterPort);
  // This component NEVER re-renders due to counter state changes

  return (
    <div>
      <button onClick={actions.increment}>+</button>
      <button onClick={actions.decrement}>-</button>
      <button onClick={() => actions.incrementBy(10)}>+10</button>
      <button onClick={actions.reset}>Reset</button>
    </div>
  );
}
```

### useStatePort (convenience)

A combined hook that returns both state and actions:

```typescript
function useStatePort<TState, TActions extends ActionMap<TState>>(
  port: StatePortDef<string, TState, TActions>
): {
  readonly state: DeepReadonly<TState>;
  readonly actions: BoundActions<TState, TActions>;
};
```

```typescript
function Counter() {
  const { state, actions } = useStatePort(CounterPort);
  return (
    <div>
      <span>{state.count}</span>
      <button onClick={actions.increment}>+</button>
    </div>
  );
}
```

This subscribes to the full state. For fine-grained control, use `useStateValue` + `useActions` separately.

## 29. useAtom

Returns the current value and a setter for an atom port. Follows React's `useState` convention with a `[value, setValue]` tuple.

### Signature

```typescript
function useAtom<TValue>(
  port: AtomPortDef<string, TValue>
): [DeepReadonly<TValue>, (value: TValue | ((prev: TValue) => TValue)) => void];
```

### Usage

```typescript
function ThemeToggle() {
  const [theme, setTheme] = useAtom(ThemePort);
  return (
    <button onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}

function LanguageSelector() {
  const [locale, setLocale] = useAtom(LocalePort);
  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="fr">Français</option>
      <option value="de">Deutsch</option>
    </select>
  );
}
```

### Referential stability

The setter function returned by `useAtom` is referentially stable across renders. This is guaranteed by the underlying `AtomService.set` stability contract. The setter can be safely passed as a prop, used in `useEffect` dependencies, or stored in refs without triggering unnecessary re-renders.

### Functional updates

The setter accepts either a direct value or an updater function:

```typescript
const [count, setCount] = useAtom(CountAtomPort);

setCount(5); // Direct value
setCount(prev => prev + 1); // Functional update
```

## 30. useDerived

Reads a computed value from a derived port. Re-renders when the derived value changes.

### Signature

```typescript
function useDerived<TResult>(port: DerivedPortDef<string, TResult>): DeepReadonly<TResult>;
```

### Usage

```typescript
function CartTotal() {
  const total = useDerived(CartTotalPort);
  return (
    <div>
      <span>Subtotal: ${total.subtotal.toFixed(2)}</span>
      <span>Discount: -${total.discount.toFixed(2)}</span>
      <span>Total: ${total.total.toFixed(2)}</span>
    </div>
  );
}

function FilteredTodoList() {
  const todos = useDerived(FilteredTodosPort);
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

## 30a. useAsyncDerived

Reads an async derived value and subscribes to status changes. Returns the snapshot as a discriminated union, plus a stable `refresh` function.

### Signature

```typescript
function useAsyncDerived<TResult, E = never>(
  port: AsyncDerivedPortDef<string, TResult, E>
): {
  readonly snapshot: AsyncDerivedSnapshot<TResult, E>;
  readonly refresh: () => void;
};
```

The returned `snapshot` is a discriminated union on `status` (see [AsyncDerivedSnapshot](./02-core-concepts.md#asyncderivedsnapshot-discriminated-union)). TypeScript narrows `data` and `error` when checking `snapshot.status`. When the port declares an error type `E`, the error variant is typed as `E` instead of `unknown`, enabling exhaustive `switch` handling via `_tag` discriminants.

### Usage

```typescript
function ExchangeRateDisplay() {
  const { snapshot, refresh } = useAsyncDerived(ExchangeRatePort);

  if (snapshot.status === "loading") return <Spinner />;

  if (snapshot.status === "error") {
    return (
      <div>
        <span>Failed to load exchange rate</span>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  if (snapshot.status === "success") {
    return (
      <div>
        <span>1 {snapshot.data.from} = {snapshot.data.rate} {snapshot.data.to}</span>
        <button onClick={refresh}>Refresh</button>
      </div>
    );
  }

  return null; // idle
}

// With typed errors (port declares E as a tagged union):
function UserProfileDisplay() {
  const { snapshot, refresh } = useAsyncDerived(UserProfilePort);
  // UserProfilePort was created with createAsyncDerivedPort<UserProfile, UserProfileError>()

  if (snapshot.status === "error") {
    // snapshot.error is UserProfileError (not unknown)
    switch (snapshot.error._tag) {
      case "NetworkError":
        return <div>Network error. <button onClick={refresh}>Retry</button></div>;
      case "AuthExpired":
        return <div>Session expired. <LoginRedirect /></div>;
    }
  }

  // ...
}
```

### Referential stability

The `refresh` function is referentially stable across renders. This is guaranteed by the underlying `AsyncDerivedService.refresh` stability contract. It can be safely passed as a prop or used in `useEffect` dependencies without triggering re-render loops.

### Type narrowing

The discriminated union eliminates the need for null checks after a status guard:

```typescript
function ExchangeRateValue() {
  const { snapshot } = useAsyncDerived(ExchangeRatePort);
  if (snapshot.status === "success") {
    // snapshot.data is DeepReadonly<ExchangeRate> — no undefined check needed
    return <span>{snapshot.data.rate}</span>;
  }
  return <span>...</span>;
}
```

## 30b. useAsyncDerivedSuspense

A Suspense-compatible variant that throws a Promise when loading and throws the error when failed. Use inside a `<Suspense>` boundary for declarative loading states.

### Signature

```typescript
function useAsyncDerivedSuspense<TResult, E = never>(
  port: AsyncDerivedPortDef<string, TResult, E>
): {
  readonly data: DeepReadonly<TResult>;
  readonly refresh: () => void;
};
```

When `status` is `"idle"` or `"loading"`, the hook throws a Promise (triggering Suspense fallback). When `status` is `"error"`, the hook throws the error (typed as `E` when declared, caught by an error boundary). When `status` is `"success"`, it returns `{ data, refresh }` with `data` guaranteed non-undefined.

### Usage

```typescript
function ExchangeRateDisplay() {
  // This component only renders when data is available
  const { data, refresh } = useAsyncDerivedSuspense(ExchangeRatePort);
  return (
    <div>
      <span>1 {data.from} = {data.rate} {data.to}</span>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

// Wrap in Suspense + ErrorBoundary
function ExchangeRatePage() {
  return (
    <ErrorBoundary fallback={<span>Failed to load</span>}>
      <Suspense fallback={<Spinner />}>
        <ExchangeRateDisplay />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Referential stability

The `refresh` function is referentially stable, same as `useAsyncDerived`.

## 32. StoreProvider

There is no separate `StoreProvider`. State ports are resolved from the same `HexDiContainerProvider` used for all HexDI services:

```typescript
import { HexDiContainerProvider } from "@hex-di/react";

function App() {
  return (
    <HexDiContainerProvider container={container}>
      {/* All hooks (useStateValue, useActions, useAtom, etc.)
          resolve from this container */}
      <Counter />
      <TodoList />
      <ThemeToggle />
    </HexDiContainerProvider>
  );
}
```

### Scoped state in React

Use `HexDiAutoScopeProvider` (from `@hex-di/react`) to create scoped containers for forms, modals, or multi-tenant views:

```typescript
import { HexDiAutoScopeProvider } from "@hex-di/react";

function FormDialog({ formId }: { formId: string }) {
  return (
    <HexDiAutoScopeProvider name={`form-${formId}`}>
      {/* FormPort resolves to a scoped instance within this provider */}
      <FormFields />
      <FormActions />
    </HexDiAutoScopeProvider>
  );
}

function FormFields() {
  const { state, actions } = useStatePort(FormPort);
  // This is the scoped instance -- isolated from other forms
  return (
    <input
      value={state.values.name ?? ""}
      onChange={(e) => actions.setValue({ field: "name", value: e.target.value })}
    />
  );
}
```

### Multiple scopes

Each `HexDiAutoScopeProvider` creates an independent scope with its own scoped state:

```typescript
function MultiFormView() {
  return (
    <div>
      <HexDiAutoScopeProvider name="form-A">
        <FormFields /> {/* Independent scoped state */}
      </HexDiAutoScopeProvider>
      <HexDiAutoScopeProvider name="form-B">
        <FormFields /> {/* Independent scoped state */}
      </HexDiAutoScopeProvider>
    </div>
  );
}
```

---

_Previous: [06 - Lifecycle](./06-lifecycle.md) | Next: [08 - Testing](./08-testing.md)_
