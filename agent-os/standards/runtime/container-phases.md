# Container Phases & Async Initialization

Containers start as `"uninitialized"`. Call `initialize()` only when the graph has async factory adapters.

```typescript
const container = createContainer({ graph, name: "App" });
// Phase: "uninitialized" — async ports cannot be resolved yet

// Call initialize() only when graph has async adapters
const initialized = await container.initialize();
// Phase: "initialized" — all ports now resolvable synchronously

// tryInitialize() returns Result instead of throwing
const result = await container.tryInitialize();
if (result.isErr()) {
  console.error("Init failed:", result.error.message);
  process.exit(1);
}
```

## Critical gotcha: scope phase is frozen at creation

```typescript
const container = createContainer({ graph, name: "App" });

// ❌ Scope created BEFORE initialize() — phase is frozen as "uninitialized"
const earlyScope = container.createScope();

const initialized = await container.initialize();

// earlyScope still cannot resolve async ports — phase was captured at creation
// ✅ Create a NEW scope AFTER initialize() to get the initialized phase
const scope = initialized.createScope();
```

- `initialize()` is only available on root containers (not child containers or override containers)
- Async adapter detection only works with `async () => {}` syntax — see `runtime/async-factory-detection`
- `initialize()` returns a new container reference with phase `"initialized"`; always use the returned value
