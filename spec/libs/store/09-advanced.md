# 09 - Advanced Patterns

_Previous: [08 - Testing](./08-testing.md)_

---

## 37. Bidirectional Derived State

Standard derived ports are read-only. Bidirectional derived ports add a `set` function that transforms the written value back into source state changes. Inspired by Legend-State's linked observables and Angular's `linkedSignal`.

### createLinkedDerivedPort

```typescript
function createLinkedDerivedPort<TResult>(): <const TName extends string>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}) => LinkedDerivedPortDef<TName, TResult>;
```

The `LinkedDerivedService` extends `DerivedService` with write capability:

```typescript
interface LinkedDerivedService<TResult> extends DerivedService<TResult> {
  /** Write back to source state */
  set(value: TResult): void;
}
```

### createLinkedDerivedAdapter

```typescript
function createLinkedDerivedAdapter<
  TPort extends LinkedDerivedPortDef<string, unknown>,
  TRequires extends readonly Port<unknown, string>[],
  TWritesTo extends readonly Port<unknown, string>[] = TRequires,
>(config: {
  readonly provides: TPort;
  readonly requires: TRequires;
  readonly select: (deps: DerivedDeps<TRequires>) => InferDerivedType<TPort>;
  readonly write: (value: InferDerivedType<TPort>, deps: DerivedDeps<TRequires>) => void;
  /**
   * Declares which source ports the `write` function mutates.
   * Creates `"writes-to"` edges in the subscriber graph, making the
   * reverse data flow visible to graph analysis and AI diagnostic tools.
   *
   * Defaults to all ports in `requires` if omitted.
   */
  readonly writesTo?: TWritesTo;
  readonly equals?: (a: InferDerivedType<TPort>, b: InferDerivedType<TPort>) => boolean;
}): Adapter<TPort, TupleToUnion<TRequires>, "singleton", "sync">;
```

### Graph visibility of write paths

The `writesTo` declaration solves a fundamental graph analysis problem: `requires` declares "I read from these ports," but `write` creates a reverse data flow that is invisible to the dependency graph. Without `writesTo`, graph analysis tools see `Fahrenheit → derives-from → Celsius` but miss that `Fahrenheit.set()` mutates `Celsius`.

With `writesTo`, the subscriber graph contains both edges:

```
Celsius ──derives-from──→ Fahrenheit
Fahrenheit ──writes-to──→ Celsius
```

This bidirectional edge is visible to:

- Graph analysis tools (cycle detection, blast radius analysis)
- MCP resources (`hexdi://store/graph` includes `"writes-to"` edges)
- AI diagnostic agents ("what can modify CelsiusPort?" → "FahrenheitPort writes to it")

### Example: Temperature converter

```typescript
const CelsiusPort = createAtomPort<number>()({
  name: "Celsius",
  initial: 0,
});

const FahrenheitPort = createLinkedDerivedPort<number>()({
  name: "Fahrenheit",
});

const fahrenheitAdapter = createLinkedDerivedAdapter({
  provides: FahrenheitPort,
  requires: [CelsiusPort] as const,
  writesTo: [CelsiusPort] as const,
  select: deps => (deps.Celsius.value * 9) / 5 + 32,
  write: (fahrenheit, deps) => {
    deps.Celsius.set(((fahrenheit - 32) * 5) / 9);
  },
});

// Usage
const fahrenheit = container.resolve(FahrenheitPort);
fahrenheit.value; // 32 (0°C)
fahrenheit.set(212); // Sets Celsius to 100
```

### Example: Form field formatting

```typescript
const RawPhonePort = createAtomPort<string>()({
  name: "RawPhone",
  initial: "",
});

const FormattedPhonePort = createLinkedDerivedPort<string>()({
  name: "FormattedPhone",
});

const formattedPhoneAdapter = createLinkedDerivedAdapter({
  provides: FormattedPhonePort,
  requires: [RawPhonePort] as const,
  writesTo: [RawPhonePort] as const,
  select: deps => formatPhone(deps.RawPhone.value),
  write: (formatted, deps) => {
    deps.RawPhone.set(stripFormatting(formatted));
  },
});
```

## 39. Optimistic Updates

Optimistic updates show expected state immediately, then reconcile with the server response.

### Pattern: Optimistic adapter

```typescript
interface OptimisticState<TState> {
  /** Confirmed server state */
  confirmed: TState;
  /** Optimistic local state (may diverge from confirmed) */
  optimistic: TState;
  /** Pending optimistic mutations */
  pending: ReadonlyArray<{ id: string; rollback: TState }>;
}

type TodoOptimisticActions = {
  optimisticAdd: ActionReducer<OptimisticState<TodoState>, { id: string; text: string }>;
  confirm: ActionReducer<OptimisticState<TodoState>, { id: string }>;
  rollback: ActionReducer<OptimisticState<TodoState>, { id: string }>;
};

const TodoOptimisticPort = createStatePort<OptimisticState<TodoState>, TodoOptimisticActions>()({
  name: "TodoOptimistic",
});
```

### Effects handle reconciliation with onEffectError

Effects return `ResultAsync`. On `Ok`, they confirm. On `Err`, `onEffectError` receives an `EffectFailedError` and dispatches a compensating `rollback` action. No try/catch in effects — the Result model handles it.

```typescript
import { ResultAsync } from "@hex-di/result";

const todoOptimisticAdapter = createStateAdapter({
  provides: TodoOptimisticPort,
  initial: {
    confirmed: { items: [] },
    optimistic: { items: [] },
    pending: [],
  },
  actions: {
    optimisticAdd: (state, payload: { id: string; text: string }) => ({
      ...state,
      optimistic: {
        items: [...state.optimistic.items, { ...payload, done: false }],
      },
      pending: [...state.pending, { id: payload.id, rollback: state.optimistic }],
    }),
    confirm: (state, payload: { id: string }) => ({
      ...state,
      confirmed: state.optimistic,
      pending: state.pending.filter(p => p.id !== payload.id),
    }),
    rollback: (state, payload: { id: string }) => {
      const entry = state.pending.find(p => p.id === payload.id);
      return {
        ...state,
        optimistic: entry?.rollback ?? state.confirmed,
        pending: state.pending.filter(p => p.id !== payload.id),
      };
    },
  },
  requires: [TodoApiPort] as const,
  lifetime: "singleton",
  effects: deps => ({
    // If Ok, confirm the optimistic update
    // (dispatched via a separate mechanism or follow-up action)
    optimisticAdd: ({ payload }) =>
      ResultAsync.fromPromise(deps.TodoApi.create(payload), cause => cause).map(() => undefined),
  }),
  onEffectError: ({ actionName, prevState, actions }) => {
    if (actionName === "optimisticAdd") {
      // Find the pending entry and roll back
      const lastPending = prevState.pending[prevState.pending.length - 1];
      if (lastPending) {
        actions.rollback({ id: lastPending.id });
      }
    }
  },
});
```

## 40. Undo/Redo

### Pattern: History adapter

```typescript
interface HistoryState<TState> {
  past: readonly TState[];
  present: TState;
  future: readonly TState[];
}

function createHistoryPort<TState>(
  innerPort: StatePortDef<string, TState, ActionMap<TState>>
): StatePortDef<string, HistoryState<TState>, HistoryActions<TState>>;

interface HistoryActions<TState> {
  undo: (state: HistoryState<TState>) => HistoryState<TState>;
  redo: (state: HistoryState<TState>) => HistoryState<TState>;
  push: (state: HistoryState<TState>, payload: TState) => HistoryState<TState>;
  clear: (state: HistoryState<TState>) => HistoryState<TState>;
}
```

### Usage

```typescript
const DrawingHistoryPort = createHistoryPort(DrawingPort);

const drawingHistoryAdapter = createStateAdapter({
  provides: DrawingHistoryPort,
  lifetime: "singleton",
});

// In component
const { state, actions } = useStatePort(DrawingHistoryPort);
state.present; // Current drawing state
actions.undo(); // Move to previous state
actions.redo(); // Move to next state
state.past.length; // Number of undo steps available
state.future.length; // Number of redo steps available
```

## 41. Multi-Tenant State

Multi-tenant state uses Container scoping to isolate state per tenant.

### Pattern: Tenant scopes

```typescript
const TenantConfigPort = createStatePort<
  TenantConfig,
  { setConfig: ActionReducer<TenantConfig, TenantConfig> }
>()({ name: "TenantConfig" });

// Scoped: each tenant gets independent state
const tenantConfigAdapter = createStateAdapter({
  provides: TenantConfigPort,
  initial: { tenantId: "", theme: "default", features: [] },
  actions: {
    setConfig: (_, payload: TenantConfig) => payload,
  },
  lifetime: "scoped",
});

// Create tenant scopes
const acmeScope = container.createScope("tenant-acme");
const betaScope = container.createScope("tenant-beta");

const acmeConfig = acmeScope.resolve(TenantConfigPort);
const betaConfig = betaScope.resolve(TenantConfigPort);

acmeConfig.actions.setConfig({ tenantId: "acme", theme: "blue", features: ["billing"] });
betaConfig.actions.setConfig({ tenantId: "beta", theme: "green", features: ["analytics"] });

// Completely isolated
acmeConfig.state.tenantId; // "acme"
betaConfig.state.tenantId; // "beta"
```

### React: Tenant provider

```typescript
function TenantProvider({ tenantId, children }: { tenantId: string; children: React.ReactNode }) {
  return (
    <HexDiAutoScopeProvider name={`tenant-${tenantId}`}>
      <TenantInitializer tenantId={tenantId} />
      {children}
    </HexDiAutoScopeProvider>
  );
}
```

## 42. Hydration

Hydration restores state from an external source (server, localStorage, URL params) on mount.

### Pattern: Hydration effect port

```typescript
import { ResultAsync } from "@hex-di/result";
import type { HydrationError } from "@hex-di/store"; // See §42a Operational Error Types

interface StateHydrator {
  hydrate(portName: string): ResultAsync<unknown, HydrationError>;
  dehydrate(portName: string, state: unknown): ResultAsync<void, HydrationError>;
}

const StateHydratorPort = port<StateHydrator>()({
  name: "StateHydrator",
  direction: "outbound",
});

// localStorage implementation
const localStorageHydratorAdapter = createAdapter({
  provides: StateHydratorPort,
  factory: () => ({
    hydrate: portName =>
      ResultAsync.fromPromise(
        Promise.resolve(localStorage.getItem(`state:${portName}`)).then(raw =>
          raw ? JSON.parse(raw) : undefined
        ),
        cause => ({ _tag: "HydrationFailed" as const, portName, cause })
      ),
    dehydrate: (portName, state) =>
      ResultAsync.fromPromise(
        Promise.resolve(localStorage.setItem(`state:${portName}`, JSON.stringify(state))),
        cause => ({ _tag: "HydrationFailed" as const, portName, cause })
      ),
  }),
});
```

### Hydrating on container initialization

```typescript
async function createHydratedContainer(graph: Graph): Promise<Container<Port<unknown, string>>> {
  const container = await createContainer({ graph, name: "app" }).initialize();

  const hydrator = container.resolve(StateHydratorPort);

  // Hydrate specific ports
  for (const portName of HYDRATED_PORTS) {
    await hydrator.hydrate(portName).match(
      savedState => {
        if (savedState !== undefined) {
          // Apply hydrated state through a dedicated hydration action
          // (each port defines a `hydrate` action)
        }
      },
      error => {
        // error._tag is "HydrationFailed", error.portName, error.cause
        console.warn(`Hydration failed for ${error.portName}:`, error.cause);
      }
    );
  }

  return container;
}
```

### SSR hydration

For server-side rendering, hydrate from the serialized state embedded in the HTML:

```typescript
// Server: dehydrate state to JSON
const serializedState = JSON.stringify(getStateSnapshot(container, [AuthPort, CartPort]));

// Client: hydrate from embedded JSON
const serverState = JSON.parse(window.__INITIAL_STATE__);
const container = await createHydratedContainer(graph, serverState);
```

---

_Previous: [08 - Testing](./08-testing.md) | Next: [10 - API Reference](./10-api-reference.md)_
