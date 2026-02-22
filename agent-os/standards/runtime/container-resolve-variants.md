# Container Resolution Variants

| Method | Returns | Throws? | Use when |
|---|---|---|---|
| `resolve(port)` | `InferService<P>` | Yes | Normal app code — let errors propagate |
| `tryResolve(port)` | `Result<InferService<P>, ContainerError>` | No | Error recovery at startup or boundaries |
| `resolveAsync(port)` | `Promise<InferService<P>>` | Yes (rejects) | Resolving before `initialize()` completes |
| `tryResolveAsync(port)` | `ResultAsync<InferService<P>, ContainerError>` | No | Async + graceful error handling |

```typescript
// Standard resolution — throws on any error
const logger = container.resolve(LoggerPort);

// Result-based — never throws, caller handles error
const result = container.tryResolve(LoggerPort);
if (result.isErr()) {
  console.error(result.error.message);
}

// Async resolution — needed when uninitialized and port is async
const config = await container.resolveAsync(ConfigPort);
```

## Common resolution errors

| Error | Cause |
|---|---|
| `ScopeRequiredError` | Resolving a `"scoped"` port from root container (no scope active) |
| `AsyncInitializationRequiredError` | Resolving an async port before `initialize()` |
| `CircularDependencyError` | Port A → B → A dependency cycle |
| `FactoryError` | The adapter's factory function threw |
| `DisposedScopeError` | Container or scope has been disposed |

- Prefer `resolve()` in application code — fail fast
- Use `tryResolve()` at process startup or in middleware where you want to handle the error gracefully
- `resolveAsync` / `tryResolveAsync` are available on both containers and scopes
