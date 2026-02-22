# 08 - Testing

_Previous: [07 - React Integration](./07-react-integration.md)_

---

`@hex-di/store-testing` provides utilities for testing state ports, adapters, and derived values. Tests use real Container instances with scope isolation -- no global mocks, no test-specific runtime.

## 33. Test Utilities

### createStateTestContainer

Creates a pre-configured container for state testing. Internally builds a graph with state adapters, derived adapters, effect adapters (ActionEffect), and optional initial state overrides. For testing state adapter effects (side effects attached to actions), build a full graph with `GraphBuilder` directly -- see "With effects on state adapter" below.

```typescript
function createStateTestContainer(config: {
  readonly adapters: readonly AdapterConstraint[];
  readonly derived?: readonly AdapterConstraint[];
  readonly effects?: readonly AdapterConstraint[];
  readonly overrides?: StateOverrideMap;
}): Promise<Container<Port<unknown, string>>>;
```

### StateOverrideMap

Overrides use port tokens as keys for type safety, preventing typos and ensuring override values match the port's state type at compile time:

```typescript
type StateOverrideEntry<TPort> =
  TPort extends StatePortDef<string, infer TState, ActionMap<infer TState>>
    ? [port: TPort, state: Partial<TState>]
    : TPort extends AtomPortDef<string, infer TValue>
      ? [port: TPort, value: TValue]
      : never;

type StateOverrideMap = readonly StateOverrideEntry<
  StatePortDef<string, unknown, ActionMap<unknown>> | AtomPortDef<string, unknown>
>[];
```

Overrides are expressed as an array of `[port, value]` tuples. This enables type inference per entry -- each override's value type is checked against the specific port token:

### Usage

```typescript
import { createStateTestContainer } from "@hex-di/store-testing";

test("increment increases count", async () => {
  const container = await createStateTestContainer({
    adapters: [counterAdapter],
  });

  const counter = container.resolve(CounterPort);
  counter.actions.increment();

  expect(counter.state.count).toBe(1);
});
```

### With initial state override

```typescript
test("decrement from 10", async () => {
  const container = await createStateTestContainer({
    adapters: [counterAdapter],
    overrides: [[CounterPort, { count: 10 }]],
  });

  const counter = container.resolve(CounterPort);
  counter.actions.decrement();

  expect(counter.state.count).toBe(9);
});

test("atom override", async () => {
  const container = await createStateTestContainer({
    adapters: [themeAdapter],
    overrides: [[ThemePort, "dark"]],
  });

  const theme = container.resolve(ThemePort);
  expect(theme.value).toBe("dark");
});
```

### With derived adapters

```typescript
test("cart total computes correctly", async () => {
  const container = await createStateTestContainer({
    adapters: [cartAdapter],
    derived: [cartTotalAdapter],
  });

  const cart = container.resolve(CartPort);
  cart.actions.addItem({
    item: { productId: "1", name: "Widget", price: 10, quantity: 2 },
  });
  cart.actions.addItem({
    item: { productId: "2", name: "Gadget", price: 20, quantity: 1 },
  });

  const total = container.resolve(CartTotalPort);
  expect(total.value.subtotal).toBe(40);
  expect(total.value.itemCount).toBe(2);
});
```

### With effects on state adapter

State adapter effects are configured when providing the adapter. For testing effects that depend on injected services, build a full graph with `GraphBuilder` and provide mock adapters for the dependencies:

```typescript
import { ResultAsync } from "@hex-di/result";

test("auth persists token on login", async () => {
  const mockStorage = { set: vi.fn(), get: vi.fn(), remove: vi.fn() };

  // Build a full graph with the state adapter's effects and mock dependencies
  const graph = GraphBuilder.create()
    .provide(
      createStateAdapter({
        provides: AuthPort,
        initial: { status: "unauthenticated", user: null, token: null },
        actions: {
          loginSuccess: (state, payload: { token: string; user: { id: string } }) => ({
            ...state,
            status: "authenticated",
            token: payload.token,
            user: payload.user,
          }),
        },
        requires: [StoragePort] as const,
        lifetime: "singleton",
        effects: deps => ({
          loginSuccess: ({ state }) =>
            ResultAsync.fromPromise(deps.Storage.set("token", state.token), cause => cause).map(
              () => undefined
            ),
        }),
      })
    )
    .provide(
      createAdapter({
        provides: StoragePort,
        factory: () => mockStorage,
      })
    )
    .build();

  const container = await createContainer({ graph, name: "test" }).initialize();

  const auth = container.resolve(AuthPort);
  auth.actions.loginSuccess({ token: "abc123", user: { id: "1" } });

  // Wait for async effect
  await vi.waitFor(() => {
    expect(mockStorage.set).toHaveBeenCalledWith("token", "abc123");
  });
});
```

### With effect adapters (ActionEffect)

Effect adapters are created with `createEffectAdapter` and implement `ActionEffect`. Register them alongside state adapters:

```typescript
test("action logger receives dispatched actions", async () => {
  const logFn = vi.fn();

  const graph = GraphBuilder.create()
    .provide(counterAdapter)
    .provide(
      createEffectAdapter({
        provides: ActionLoggerPort,
        factory: () => ({
          onAction: logFn,
        }),
      })
    )
    .build();

  const container = await createContainer({ graph, name: "test" }).initialize();

  const counter = container.resolve(CounterPort);
  counter.actions.increment();

  expect(logFn).toHaveBeenCalledWith(
    expect.objectContaining({
      portName: "Counter",
      actionName: "increment",
    })
  );
});
```

### Testing Result-based effects

Effects that return `ResultAsync` are tested by observing the `EffectFailedError` passed to `onEffectError` or by checking state transitions driven by compensating actions:

```typescript
import { ResultAsync } from "@hex-di/result";

test("effect Err triggers onEffectError with EffectFailedError", async () => {
  const errorHandler = vi.fn();

  const graph = GraphBuilder.create()
    .provide(
      createStateAdapter({
        provides: TodoPort,
        initial: { items: [], filter: "all" },
        actions: {
          addItem: (state, payload: { text: string }) => ({
            ...state,
            items: [...state.items, { id: "1", text: payload.text, done: false }],
          }),
          removeItem: (state, payload: { id: string }) => ({
            ...state,
            items: state.items.filter(item => item.id !== payload.id),
          }),
        },
        requires: [TodoApiPort] as const,
        lifetime: "singleton",
        effects: deps => ({
          addItem: ({ payload }) =>
            ResultAsync.fromPromise(deps.TodoApi.create(payload), cause => cause).map(
              () => undefined
            ),
        }),
        onEffectError: errorHandler,
      })
    )
    .provide(
      createAdapter({
        provides: TodoApiPort,
        factory: () => ({
          create: () => Promise.reject(new Error("Network timeout")),
        }),
      })
    )
    .build();

  const container = await createContainer({ graph, name: "test" }).initialize();
  const todo = container.resolve(TodoPort);
  todo.actions.addItem({ text: "Test" });

  await vi.waitFor(() => {
    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          _tag: "EffectFailed",
          portName: "Todo",
          actionName: "addItem",
        }),
      })
    );
  });
});
```

### Testing async derived with ResultAsync

Async derived adapters return `ResultAsync` from `select`. Test both `Ok` and `Err` paths using the `expectAsyncDerived` assertion helper:

```typescript
import { ResultAsync } from "@hex-di/result";

test("async derived transitions to error on Err result", async () => {
  const graph = GraphBuilder.create()
    .provide(createAtomAdapter({ provides: CurrencyPort, initial: "USD" }))
    .provide(
      createAsyncDerivedAdapter({
        provides: ExchangeRatePort,
        requires: [CurrencyPort] as const,
        select: () =>
          ResultAsync.err({ _tag: "NetworkError" as const, cause: new Error("DNS failure") }),
      })
    )
    .build();

  const container = await createContainer({ graph, name: "test" }).initialize();
  const rate = container.resolve(ExchangeRatePort);

  await vi.waitFor(() => {
    expectAsyncDerived(container, ExchangeRatePort).toBeError();
  });
});
```

#### expectAsyncDerived

Fluent assertion API for async derived port verification:

```typescript
function expectAsyncDerived<TResult, E = never>(
  container: Container<Port<unknown, string>>,
  port: AsyncDerivedPortDef<string, TResult, E>
): {
  toBeLoading(): void;
  toBeSuccess(expected: TResult): void;
  toBeError(predicate?: (error: [E] extends [never] ? unknown : E) => boolean): void;
  toHaveStatus(status: "idle" | "loading" | "success" | "error"): void;
};
```

## 34. Mock Adapters

### createMockStateAdapter

Creates a mock adapter with spied actions for tracking calls. Requires an `initial` state value (or uses `initialOverride` to override the default).

```typescript
function createMockStateAdapter<
  TPort extends StatePortDef<string, unknown, ActionMap<unknown>>,
>(config: {
  readonly provides: TPort;
  readonly initial: InferStateType<TPort>;
  readonly initialOverride?: Partial<InferStateType<TPort>>;
}): {
  readonly adapter: Adapter<TPort, never, "singleton", "sync">;
  readonly spies: {
    [K in keyof InferActionsType<TPort>]: MockFunction;
  };
};
```

### Usage

```typescript
test("component dispatches increment on click", async () => {
  const { adapter, spies } = createMockStateAdapter({
    provides: CounterPort,
    initial: { count: 5 },
  });

  // Build a graph with the mock adapter instead of a real one
  const graph = GraphBuilder.create().provide(adapter).build();
  const container = await createContainer({ graph, name: "test" }).initialize();

  const counter = container.resolve(CounterPort);
  counter.actions.increment();

  // Verify action was called via spy
  expect(spies.increment).toHaveBeenCalledTimes(1);
});
```

### createMockAtomAdapter

```typescript
function createMockAtomAdapter<TPort extends AtomPortDef<string, unknown>>(config: {
  readonly provides: TPort;
  readonly initial: InferAtomType<TPort>;
}): {
  readonly adapter: Adapter<TPort, never, "singleton", "sync">;
  readonly setSpy: MockFunction;
  readonly updateSpy: MockFunction;
};
```

## 35. State Assertions

### expectState

Fluent assertion API for state verification.

```typescript
function expectState<TState>(
  container: Container<Port<unknown, string>>,
  port: StatePortDef<string, TState, ActionMap<TState>>
): {
  toBe(expected: TState): void;
  toMatch(partial: Partial<TState>): void;
  toSatisfy(predicate: (state: DeepReadonly<TState>) => boolean): void;
};
```

### Usage

```typescript
test("todo actions", async () => {
  const container = await createStateTestContainer({
    adapters: [todoAdapter],
  });

  const todo = container.resolve(TodoPort);
  todo.actions.addItem({ text: "Buy milk" });
  todo.actions.addItem({ text: "Write tests" });

  expectState(container, TodoPort).toSatisfy(state => state.items.length === 2);

  todo.actions.toggleItem({ id: todo.state.items[0].id });

  expectState(container, TodoPort).toSatisfy(state => state.items[0].done === true);
});
```

### expectAtom

```typescript
function expectAtom<TValue>(
  container: Container<Port<unknown, string>>,
  port: AtomPortDef<string, TValue>
): {
  toBe(expected: TValue): void;
  toSatisfy(predicate: (value: DeepReadonly<TValue>) => boolean): void;
};
```

### expectDerived

```typescript
function expectDerived<TResult>(
  container: Container<Port<unknown, string>>,
  port: DerivedPortDef<string, TResult>
): {
  toBe(expected: TResult): void;
  toMatch(partial: Partial<TResult>): void;
  toSatisfy(predicate: (value: DeepReadonly<TResult>) => boolean): void;
};
```

## 36. Scope-Isolated Tests

### Testing scoped state

`createStateTestContainer` registers adapters with their declared lifetime. Adapters with `lifetime: "scoped"` must be resolved from a scope, not the root container (see [Scoped state requires a Scope](./04-state-adapters.md#scoped-state-requires-a-scope)).

```typescript
test("scoped form state is isolated", async () => {
  // formAdapter has lifetime: "scoped"
  const container = await createStateTestContainer({
    adapters: [formAdapter],
  });

  // Must create scopes -- resolving FormPort from root throws ScopeRequiredError
  const scope1 = container.createScope("form-1");
  const scope2 = container.createScope("form-2");

  const form1 = scope1.resolve(FormPort);
  const form2 = scope2.resolve(FormPort);

  form1.actions.setValue({ field: "name", value: "Alice" });

  expect(form1.state.values.name).toBe("Alice");
  expect(form2.state.values.name).toBeUndefined(); // Isolated
});
```

### Testing scope disposal

```typescript
test("subscriptions stop after scope disposal", async () => {
  const container = await createStateTestContainer({
    adapters: [formAdapter],
  });

  const scope = container.createScope("form-1");
  const form = scope.resolve(FormPort);

  const listener = vi.fn();
  form.subscribe(listener);

  form.actions.setValue({ field: "name", value: "Alice" });
  expect(listener).toHaveBeenCalledTimes(1);

  await scope.dispose();

  // After disposal, actions throw
  expect(() => form.actions.setValue({ field: "name", value: "Bob" })).toThrow();
});
```

### Action recording

```typescript
function createActionRecorder(container: Container<Port<unknown, string>>): {
  readonly events: readonly ActionEvent[];
  getEventsForPort(portName: string): readonly ActionEvent[];
  clear(): void;
  dispose(): void;
};
```

```typescript
test("action sequence", async () => {
  const container = await createStateTestContainer({
    adapters: [counterAdapter, todoAdapter],
  });

  const recorder = createActionRecorder(container);
  const counter = container.resolve(CounterPort);
  const todo = container.resolve(TodoPort);

  counter.actions.increment();
  counter.actions.increment();
  todo.actions.addItem({ text: "Test" });

  expect(recorder.events).toHaveLength(3);
  expect(recorder.getEventsForPort("Counter")).toHaveLength(2);
  expect(recorder.getEventsForPort("Todo")).toHaveLength(1);

  recorder.dispose();
});
```

### waitForState

Waits for a state condition to become true. Useful for testing async effects. Throws `WaitForStateTimeoutError` if the predicate does not become true within the specified timeout (default: 5000ms).

```typescript
function waitForState<TState>(
  container: Container<Port<unknown, string>>,
  port: StatePortDef<string, TState, ActionMap<TState>>,
  predicate: (state: DeepReadonly<TState>) => boolean,
  timeout?: number
): Promise<DeepReadonly<TState>>;
```

```typescript
test("async effect updates state", async () => {
  const container = await createStateTestContainer({
    adapters: [authAdapter],
    // ... with mock API adapter
  });

  const auth = container.resolve(AuthPort);
  auth.actions.login({ email: "test@example.com", password: "secret" });

  // Wait for async effect to complete
  const state = await waitForState(container, AuthPort, s => s.status === "authenticated", 5000);

  expect(state.user?.email).toBe("test@example.com");
});
```

---

_Previous: [07 - React Integration](./07-react-integration.md) | Next: [09 - Advanced Patterns](./09-advanced.md)_
