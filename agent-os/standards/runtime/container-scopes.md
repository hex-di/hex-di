# Container Scopes

Scopes provide per-request isolation for `"scoped"` lifetime adapters. Singletons are shared from the parent container.

```typescript
// Create a scope per request/operation — name identifies the scope in diagnostics
const scope = container.createScope("POST /users");

// Scoped ports: new instance per scope, cached within the scope
const userContext = scope.resolve(UserContextPort);

// Singleton ports: reused from container
const logger = scope.resolve(LoggerPort); // same instance as container.resolve(LoggerPort)

// Always dispose scopes when done — runs finalizers and frees scoped instances
await scope.dispose();
```

## Error: resolving a scoped port from root

```typescript
// ❌ Throws ScopeRequiredError — scoped ports cannot be resolved from root container
container.resolve(UserContextPort);

// ✅ Create a scope first
const scope = container.createScope("request");
scope.resolve(UserContextPort);
```

## Nested scopes

```typescript
const requestScope = container.createScope("request");
const childScope = requestScope.createScope("child-operation");

// Disposing parent disposes children first
await requestScope.dispose(); // childScope disposed first, then requestScope
```

- Scope name is used in diagnostics and errors — use the request/operation identifier
- Max nesting depth: 64 (configurable via `createContainer({ safety: { maxScopeDepth } })`)
- `scope.isDisposed` — check before resolving to avoid `DisposedScopeError`
- `scope.createScope()` inherits the phase of the scope it was created from
