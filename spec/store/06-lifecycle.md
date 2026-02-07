# 06 - Lifecycle

_Previous: [05b - Store Introspection](./05b-introspection.md)_

---

State lifecycle is managed entirely by Container. There is no separate mount/unmount API -- state is created on first resolution and disposed when the container (or scope) is disposed.

## 23. Mount & Unmount

### Mount (first resolution)

A state port's service is created on first `container.resolve()`. This is Container's standard lazy initialization:

```typescript
const raw = createContainer({ graph, name: "app" });
const container = await raw.initialize();
// initialize() returns a new Container with phase "initialized"

// State is NOT yet created -- lazy
const counter = container.resolve(CounterPort);
// NOW the signal is created with CounterPort.initial
// Effects are registered
// Effect ports (ActionLogger, etc.) are discovered and connected
```

### Unmount (disposal)

State is unmounted when its owning container is disposed:

```typescript
await container.dispose();
// All signals are disposed
// All subscriptions are cancelled
// All reactive effects are stopped
// Effect port connections are severed
```

For scoped state, disposal happens when the scope is disposed:

```typescript
const scope = container.createScope("form-1");
const form = scope.resolve(FormPort); // Creates scoped state

await scope.dispose();
// FormPort's signal in this scope is disposed
// Subscriptions on this scope's FormPort are cancelled
// Parent container's state is unaffected
```

### Lifecycle events

State adapters can optionally provide lifecycle hooks through the standard adapter `finalizer`:

```typescript
const counterAdapter = createStateAdapter({
  provides: CounterPort,
  lifetime: "singleton",
});
// The adapter's finalizer (if provided) runs during container disposal
```

For more complex cleanup, use the effect-as-port pattern:

```typescript
import { port, createAdapter } from "@hex-di/core";

const CleanupEffectPort = port<{ dispose(): void }>()({
  name: "StateCleanup",
  direction: "inbound",
});

const cleanupAdapter = createAdapter({
  provides: CleanupEffectPort,
  requires: [StoragePort] as const,
  factory: deps => ({
    dispose: () => deps.Storage.flush(),
  }),
});
```

## 24. Container Scope Integration

### How scoping works with state

Container scoping creates isolated resolution contexts. State adapters with `lifetime: "scoped"` get a new instance per scope. State adapters with `lifetime: "singleton"` share the root container's instance.

```
Root Container
├─ CounterPort (singleton) ──→ shared instance
├─ ThemePort (singleton) ────→ shared instance
│
├─ Scope "form-1"
│  └─ FormPort (scoped) ────→ instance A
│
├─ Scope "form-2"
│  └─ FormPort (scoped) ────→ instance B (independent)
│
└─ Scope "tenant-acme"
   ├─ FormPort (scoped) ────→ instance C (independent)
   └─ CounterPort ──────────→ same shared instance (singleton)
```

### Scope inheritance

Scoped state can depend on singleton state through derived adapters. When a derived adapter depends on any scoped source, it must itself declare `lifetime: "scoped"` to ensure it creates a scope-local computed signal.

```typescript
// Singleton: shared across all scopes
const UserPort = createStatePort<UserState>()({
  name: "User",
  initial: { id: null, name: null },
  actions: {
    /* ... */
  },
});

// Scoped: independent per scope
const UserFormPort = createStatePort<UserFormState>()({
  name: "UserForm",
  initial: { dirty: false, values: {} },
  actions: {
    /* ... */
  },
});

// Derived: scoped (required because UserFormPort is scoped)
const FormValidityPort = createDerivedPort<{ isValid: boolean }>()({
  name: "FormValidity",
});

const formValidityAdapter = createDerivedAdapter({
  provides: FormValidityPort,
  requires: [UserPort, UserFormPort] as const,
  lifetime: "scoped", // Required: depends on scoped UserFormPort
  select: deps => ({
    isValid: deps.UserForm.state.values.name !== "" && deps.User.state.id !== null,
  }),
});
```

When resolved in a scope, the scoped derived adapter reads the scope's `UserFormPort` instance and the singleton `UserPort` instance from the root container. The reactivity graph correctly tracks both signals -- changes to either the scope-local form state or the shared user state trigger recomputation.

**Captive dependency prevention:** The graph builder enforces that a singleton derived adapter cannot depend on a scoped source. This is the same captive dependency check that the runtime already applies to regular adapters. A singleton derived value that references a scoped source would only see the first scope's instance and miss all others -- a correctness bug caught at compile time.

## 25. Scoped State

### Use cases

| Scenario                        | Port Lifetime | Scope Creation                           |
| ------------------------------- | ------------- | ---------------------------------------- |
| Application state (auth, theme) | `singleton`   | Root container                           |
| Per-form state                  | `scoped`      | `container.createScope("form-" + id)`    |
| Per-modal state                 | `scoped`      | `container.createScope("modal-" + id)`   |
| Per-tenant state                | `scoped`      | `container.createScope("tenant-" + id)`  |
| Per-request state (SSR)         | `scoped`      | `container.createScope("request-" + id)` |

### Scoped state isolation

Changes to scoped state do not affect other scopes or the root container:

```typescript
const scope1 = container.createScope("form-1");
const scope2 = container.createScope("form-2");

const form1 = scope1.resolve(FormPort);
const form2 = scope2.resolve(FormPort);

form1.actions.setValue({ field: "name", value: "Alice" });
form2.state.values.name; // undefined (isolated)
```

### Scoped subscriptions

Subscriptions on scoped state are scoped to the scope's lifetime:

```typescript
const scope = container.createScope("form-1");
const form = scope.resolve(FormPort);

form.subscribe(state => {
  console.log("Form changed:", state);
});

// Subscription is automatically cancelled when scope is disposed
await scope.dispose();
```

### Scoped effect ports

Effect ports resolved in a scope observe only that scope's state changes:

```typescript
// ActionLogger resolved in a scope only sees actions from that scope
const scope = container.createScope("form-1");
const logger = scope.resolve(ActionLoggerPort);
// logger.onAction only receives events from scope's state ports
```

## 26. Disposal

### Disposal order

Container disposal follows a deterministic order:

1. Stop all reactive effects (no more recomputations)
2. Cancel all subscriptions (no more listener callbacks)
3. Dispose all computed signals (release dependency tracking)
4. Dispose all base signals (release values)
5. Run adapter finalizers in reverse registration order
6. Release all references

### Disposal guarantees

- No subscription callback fires after disposal begins
- No effect runs after disposal begins
- No derived value recomputes after disposal begins
- Accessing `.state` or `.value` after disposal throws `DisposedStateAccessError`
- `actions.*()` after disposal throws `DisposedStateAccessError`

```typescript
import { DisposedStateAccessError } from "@hex-di/store";

const counter = container.resolve(CounterPort);
await container.dispose();

counter.state; // throws DisposedStateAccessError (operation: "state")
counter.actions.increment(); // throws DisposedStateAccessError (operation: "actions")
```

`DisposedStateAccessError` includes `portName`, `containerName`, and `operation` fields for diagnostics. See [§42a Error Classes](./10-api-reference.md#42a-error-classes) for the full error hierarchy.

### Partial disposal (scopes)

Disposing a scope only cleans up resources created within that scope:

```typescript
const scope = container.createScope("session-1");
const form = scope.resolve(FormPort); // Scoped instance
const counter = scope.resolve(CounterPort); // Singleton reference

await scope.dispose();
// form is disposed (scoped instance)
// counter is NOT disposed (singleton, owned by root)
```

---

_Previous: [05b - Store Introspection](./05b-introspection.md) | Next: [07 - React Integration](./07-react-integration.md)_
