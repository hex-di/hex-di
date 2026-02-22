# 05 - Reactivity

_Previous: [04 - State Adapters](./04-state-adapters.md)_

---

The reactivity engine is the internal infrastructure of `@hex-di/store`. It provides signal-based dependency tracking, glitch-free batching, and diamond dependency solving. Users interact with it through state ports and subscriptions -- the signal primitives are not part of the public API.

## 18. Signal-Based Core

### Design

The reactivity model follows the TC39 Signals proposal: signals are the primitive reactive values, computeds are derived values with automatic dependency tracking, and effects are side-effect runners.

### Implementation: `alien-signals` as foundation

The signal engine uses [`alien-signals`](https://github.com/nicepkg/alien-signals) as its reactive primitive foundation rather than building a custom signal engine from scratch. `alien-signals` provides:

- TC39 Signals-aligned API (`signal`, `computed`, `effect`)
- Built-in diamond dependency solving via topological sorting
- Glitch-free propagation
- ~1KB gzipped, zero dependencies
- Best-in-class performance (consistently benchmarks #1 among JS signal libraries)

The `@hex-di/store` reactivity layer wraps `alien-signals` with a thin adapter that adds:

1. **Container-scoped batching** -- `alien-signals` provides global batching; the adapter partitions batch state per container/scope
2. **Disposal integration** -- connects signal lifecycle to Container disposal
3. **Snapshot separation** -- wraps signal reads with `Object.freeze` and `DeepReadonly`
4. **Subscriber tracking** -- counts active subscribers for introspection

The internal types below describe the adapter's interface, not the raw library API:

```typescript
// Internal API (not exported to users)

function createSignal<T>(initial: T): Signal<T>;

function createComputed<T>(fn: () => T): Computed<T>;

function createEffect(fn: () => void): ReactiveEffect;

interface Signal<T> {
  get(): T;
  set(value: T): void;
  peek(): T; // Read without tracking
}

interface Computed<T> {
  get(): T;
  peek(): T; // Read without tracking
}

interface ReactiveEffect {
  run(): void;
  dispose(): void;
}
```

See [Appendix C: Design Decision D15](./11-appendices.md#d15-alien-signals-over-custom-signal-engine) for the rationale behind this choice.

### How state ports use signals

When `createStateAdapter` creates a `StateService`, it internally creates a signal:

```
StateService<TodoState, TodoActions>
  │
  ├─ signal = createSignal<TodoState>(port.initial)
  │
  ├─ .state → DeepReadonly snapshot of signal.get()
  │
  ├─ .actions.addItem(payload) → {
  │     signal.set(port.actions.addItem(signal.get(), payload))
  │     notify effect ports
  │  }
  │
  └─ .subscribe(listener) → createEffect(() => {
       const current = signal.get();  // tracks dependency
       listener(freeze(current), prev);
     })
```

### How derived ports use signals

When `createDerivedAdapter` creates a `DerivedService`, it internally creates a computed:

```
DerivedService<CartTotal>
  │
  ├─ computed = createComputed(() => {
  │     // Accesses deps.Cart.state → reads Cart's signal → tracks dependency
  │     return select(deps);
  │  })
  │
  ├─ .value → DeepReadonly snapshot of computed.get()
  │
  └─ .subscribe(listener) → createEffect(() => {
       const current = computed.get();  // tracks dependency on computed
       listener(freeze(current), prev);
     })
```

### Automatic dependency tracking

The key property of signal-based reactivity: computeds automatically know which signals they depend on. When `cartTotalAdapter.select(deps)` reads `deps.Cart.state`, it calls `Cart`'s internal signal's `get()`, which registers the dependency. No manual subscription management needed.

```
Counter signal ──→ DoubleCount computed
                        │
Cart signal ─────→ CartTotal computed ──→ CheckoutReady computed
                        │
Auth signal ─────────────────────────────→ CheckoutReady computed
```

## 19. Fine-Grained Subscriptions

### Property-level tracking

For state ports with object state, subscriptions can track individual properties using selectors:

```typescript
const counter = container.resolve(CounterPort);

// Full state subscription (re-notifies on any change)
counter.subscribe((state, prev) => {
  console.log("Full state changed:", state);
});

// Selector subscription (re-notifies only when count changes)
counter.subscribe(
  state => state.count,
  (count, prevCount) => {
    console.log("Count changed:", prevCount, "→", count);
  }
);
```

### Proxy-based path tracking (implementation detail)

Internally, selector subscriptions use proxy-based access tracking inspired by Legend-State and Valtio:

```
subscribe(
  (state) => state.items.length,  // selector
  (length) => ...                  // listener
)
```

When the selector runs, a proxy records which paths were accessed: `["items", "length"]`. Subsequent state changes are compared only at those paths. If `state.filter` changes but `state.items` doesn't, the listener is not called.

### Equality functions

Custom equality prevents re-notification for semantically equal values:

```typescript
counter.subscribe(
  state => ({ count: state.count, double: state.count * 2 }),
  value => render(value),
  (a, b) => a.count === b.count // Custom equality
);
```

Default equality is `Object.is` (reference equality). For primitive selectors, this works naturally. For object selectors, provide a custom function or use `shallowEqual` from the library.

## 20. Diamond Dependency Solver

### The diamond problem

When multiple derived values depend on the same source, and a higher-level derived depends on both, a naive implementation computes the higher-level derived twice per change:

```
CounterPort (signal)
  ├─→ DoublePort (computed: count * 2)
  └─→ TriplePort (computed: count * 3)
       └─→ SumPort (computed: Double.value + Triple.value)
```

Without a solver, incrementing Counter triggers:

1. DoublePort recomputes → SumPort recomputes (with stale Triple)
2. TriplePort recomputes → SumPort recomputes (correct)

SumPort computed twice, and the first computation used a stale value (glitch).

### Topological evaluation

The diamond dependency solver uses topological sorting to evaluate computeds in dependency order:

1. When a signal changes, mark all dependent computeds as dirty
2. Sort dirty computeds by topological order (deepest dependencies first)
3. Evaluate each computed exactly once
4. Notify effects only after all computeds are current

```
CounterPort changes
  → Mark dirty: DoublePort, TriplePort, SumPort
  → Topological sort: [DoublePort, TriplePort, SumPort]
  → Evaluate DoublePort (no dependencies on other dirty computeds)
  → Evaluate TriplePort (no dependencies on other dirty computeds)
  → Evaluate SumPort (both dependencies now current)
  → Notify effects
```

### Implementation sketch

The solver uses a `WeakMap<Signal | Computed, Set<Computed>>` to track the dependency graph, inspired by TanStack Store's `__storeToDerived` pattern:

```typescript
// Internal
const dependencyGraph = new WeakMap<Signal<unknown> | Computed<unknown>, Set<Computed<unknown>>>();

function notifyChange(signal: Signal<unknown>): void {
  const dirty = collectDirty(signal); // BFS from signal
  const sorted = topologicalSort(dirty); // Sort by depth
  for (const computed of sorted) {
    computed.recompute(); // Evaluate once
  }
  notifyEffects(); // Notify after all current
}
```

## 21. Glitch-Free Batching

### What is a glitch?

A glitch occurs when a subscriber sees intermediate, inconsistent state. For example, transferring money between accounts:

```typescript
const accounts = container.resolve(AccountsPort);
accounts.actions.debit({ account: "A", amount: 100 });
// Subscriber fires: A debited but B not yet credited!
accounts.actions.credit({ account: "B", amount: 100 });
// Subscriber fires again: now consistent
```

### batch()

The `batch` function groups multiple state changes into a single notification cycle. Batching is **container-scoped** -- each container (and each scope) maintains its own batch state, preventing cross-scope interference in multi-scope applications.

```typescript
// Batch is a method on the resolved StateService or a standalone function
// that accepts the container/scope as context.

// Option 1: Standalone function with container context
import { batch } from "@hex-di/store";

batch(container, () => {
  accounts.actions.debit({ account: "A", amount: 100 });
  accounts.actions.credit({ account: "B", amount: 100 });
});
// Subscribers fire once with both changes applied

// Option 2: Scope-level batching (only affects state in this scope)
const scope = container.createScope("request-1");
batch(scope, () => {
  form.actions.setField({ name: "email", value: "a@b.com" });
  form.actions.setField({ name: "name", value: "Alice" });
});
// Only scope's subscribers are batched; singleton state notifications
// from the parent container are batched independently.
```

### Why container-scoped (not global)

A global batch flag creates hidden shared state that violates the nervous system principle: every signal should flow through the container. In a multi-scope application (multi-tenant, SSR with concurrent requests), a global batch in one scope could defer notifications in another scope, causing subtle timing bugs. Container-scoped batching ensures each scope's notification cycle is independent.

```
Global batch (rejected):
  Scope A: batch(() => { ... })  ← defers ALL signals, including Scope B
  Scope B: subscriber fires late ← unexpected!

Container-scoped batch (chosen):
  Scope A: batch(scopeA, () => { ... })  ← defers only scopeA's signals
  Scope B: subscriber fires immediately  ← correct, independent
```

### Implementation

Batching defers signal notifications until the batch completes:

1. `batch(container, fn)` increments the container's batch depth counter
2. `signal.set()` records the new value but defers notifications for signals owned by the batching container
3. When the batch callback returns, the depth counter decrements
4. When depth reaches zero (outermost batch), all deferred signals notify simultaneously
5. The diamond dependency solver processes all dirty computeds in topological order
6. Effects run once with the final consistent state

### Nested batching

Batches can nest. Only the outermost batch triggers notifications:

```typescript
batch(container, () => {
  counter.actions.increment();
  batch(container, () => {
    counter.actions.increment();
    counter.actions.increment();
  }); // Inner batch completes but doesn't notify (depth > 0)
}); // Outer batch completes → single notification with count +3
```

### Automatic batching

React integration automatically batches state changes within event handlers (via React's own batching) and within effects. The `useStateValue` and `useActions` hooks automatically use the component's container context for batching. Manual `batch(container, fn)` is needed only for imperative code outside React's lifecycle.

## 22. Snapshot Separation

### Mutable internals, immutable snapshots

Internally, signals hold mutable state for efficient updates. Externally, all reads return deeply frozen snapshots:

```typescript
// Internal: signal holds mutable state
const signal = createSignal({ count: 0, items: [1, 2, 3] });

// External: .state returns DeepReadonly snapshot
const counter = container.resolve(CounterPort);
const snapshot = counter.state;
// snapshot: DeepReadonly<{ count: number; items: number[] }>
// snapshot.count = 5;     → Type error
// snapshot.items.push(4); → Type error
```

### Structural sharing

Unchanged subtrees share references between snapshots:

```typescript
const before = counter.state;
counter.actions.increment();
const after = counter.state;

before === after; // false (state changed)
before.items === after.items; // true (items unchanged, same reference)
```

This enables cheap equality checks in React (`useMemo`, `React.memo`) and selector memoization.

### Runtime enforcement

In development mode, snapshots are frozen with `Object.freeze` (recursively). In production mode, the TypeScript `DeepReadonly` type provides compile-time protection without runtime overhead.

```typescript
// Development: Object.freeze throws on mutation attempts
// Production: DeepReadonly prevents mutation at compile time only
```

---

_Previous: [04 - State Adapters](./04-state-adapters.md) | Next: [05b - Store Introspection](./05b-introspection.md)_
