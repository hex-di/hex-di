# Container Override Pattern

`container.override()` creates an isolated child that shares existing singletons and swaps specific ports.
Use it in tests and middleware — not for production graph composition (use `GraphBuilder.merge()` instead).

```typescript
// Original container with real adapters
const container = createContainer({ graph: appGraph, name: "App" });

// Override: creates a child, shares singletons, replaces specific ports
const testContainer = container
  .override(MockEmailAdapter)   // replaces EmailPort
  .override(MemoryLoggerAdapter) // replaces LoggerPort
  .build();

const mailer = testContainer.resolve(EmailPort);   // MockEmailAdapter instance
const logger = testContainer.resolve(LoggerPort);  // MemoryLoggerAdapter instance
const db = testContainer.resolve(DatabasePort);    // Original singleton from parent
```

## Key behaviors

- Overridden instances are **not shared** with the parent — parent retains original instances
- Non-overridden ports **share the parent's singletons** (no re-instantiation)
- Override container is always `"initialized"` — even if parent was uninitialized
- The override adapter must provide a port that already exists in the parent graph (compile-time check)

## When NOT to use override

```typescript
// ❌ Don't use override() for production graph composition
const appContainer = baseContainer.override(ProdEmailAdapter).build();

// ✅ Use GraphBuilder.merge() for production composition
const appGraph = baseGraphBuilder.merge(prodEmailGraphBuilder).build();
const appContainer = createContainer({ graph: appGraph, name: "App" });
```
