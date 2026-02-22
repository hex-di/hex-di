---
title: Error Handling
description: Understand HexDI's error hierarchy, error codes, and best practices for handling compile-time and runtime errors.
sidebar_position: 4
---

# Error Handling

This guide covers HexDI's error hierarchy and best practices for handling errors.

## Error Philosophy

HexDI distinguishes between two types of errors:

1. **Programming Errors** — Bugs in your code that should be fixed (e.g., circular dependencies)
2. **Runtime Errors** — External failures that may need recovery (e.g., factory threw an exception)

All errors include an `isProgrammingError` flag to help you decide how to handle them.

> **Result-first:** Prefer `container.tryResolve()` over `container.resolve()`. The `try*` variants return `Result<T, ContainerError>` and never throw, eliminating the need for try/catch.

## Error Hierarchy

```
ContainerError (base class)
├── CircularDependencyError (programming error)
├── FactoryError (runtime error)
├── DisposedScopeError (programming error)
└── ScopeRequiredError (programming error)
```

All errors extend `ContainerError` which provides:

- `code` - Stable string constant for programmatic handling
- `message` - Human-readable description
- `isProgrammingError` - Whether this indicates a code bug

## Error Types

### ContainerError

Base class for all container errors.

```typescript
import { ContainerError } from "@hex-di/runtime";

const result = container.tryResolve(SomePort);
if (result.isErr()) {
  const { error } = result;
  console.log("Code:", error.code);
  console.log("Message:", error.message);
  console.log("Is programming error:", error.isProgrammingError);
}
```

### CircularDependencyError

Thrown when services depend on each other in a cycle.

```typescript
import { CircularDependencyError } from "@hex-di/runtime";

// Example: A depends on B, B depends on A
const result = container.tryResolve(ServiceAPort);
if (result.isErr()) {
  const { error } = result;
  if (error instanceof CircularDependencyError) {
    console.log("Code:", error.code); // 'CIRCULAR_DEPENDENCY'
    console.log("Chain:", error.dependencyChain);
    // ['ServiceA', 'ServiceB', 'ServiceA']
    console.log("Is programming error:", error.isProgrammingError); // true
  }
}
```

**Properties:**

- `code: 'CIRCULAR_DEPENDENCY'`
- `dependencyChain: string[]` - The ports forming the cycle
- `isProgrammingError: true`

**How to Fix:**

1. Review the dependency chain to understand the cycle
2. Break the cycle by:
   - Extracting shared logic into a new service
   - Using lazy resolution (factory returning a function)
   - Restructuring your dependencies

### FactoryError

Thrown when an adapter's factory function throws an exception.

```typescript
import { FactoryError } from "@hex-di/runtime";

const result = container.tryResolve(DatabasePort);
if (result.isErr()) {
  const { error } = result;
  if (error instanceof FactoryError) {
    console.log("Code:", error.code); // 'FACTORY_FAILED'
    console.log("Port:", error.portName); // 'Database'
    console.log("Original error:", error.cause);
    console.log("Is programming error:", error.isProgrammingError); // false
  }
}
```

**Properties:**

- `code: 'FACTORY_FAILED'`
- `portName: string` - Which port's factory failed
- `cause: Error` - The original error thrown by the factory
- `isProgrammingError: false`

**How to Handle:**

- This is typically an external failure (database unavailable, etc.)
- May warrant retry logic or fallback behavior
- Log the original error for debugging

### DisposedScopeError

Thrown when trying to resolve from a disposed scope.

```typescript
import { DisposedScopeError } from "@hex-di/runtime";

const scope = container.createScope();
await scope.tryDispose();

const result = scope.tryResolve(UserSessionPort); // Scope is already disposed!
if (result.isErr()) {
  const { error } = result;
  if (error instanceof DisposedScopeError) {
    console.log("Code:", error.code); // 'DISPOSED_SCOPE'
    console.log("Is programming error:", error.isProgrammingError); // true
  }
}
```

**Properties:**

- `code: 'DISPOSED_SCOPE'`
- `isProgrammingError: true`

**How to Fix:**

- Don't use scopes after disposing them
- Check scope lifecycle in async code
- Use proper cleanup patterns in React (useEffect cleanup)

### ScopeRequiredError

Thrown when trying to resolve a scoped service from the root container.

```typescript
import { ScopeRequiredError } from "@hex-di/runtime";

// UserSession is scoped, but we're resolving from root container
const result = container.tryResolve(UserSessionPort);
if (result.isErr()) {
  const { error } = result;
  if (error instanceof ScopeRequiredError) {
    console.log("Code:", error.code); // 'SCOPE_REQUIRED'
    console.log("Port:", error.portName); // 'UserSession'
    console.log("Is programming error:", error.isProgrammingError); // true
  }
}
```

**Properties:**

- `code: 'SCOPE_REQUIRED'`
- `portName: string` - Which scoped port was requested
- `isProgrammingError: true`

**How to Fix:**

- Create a scope: `const scope = container.createScope()`
- Resolve from the scope: `scope.resolve(UserSessionPort)`
- In React, use `AutoScopeProvider` or `ScopeProvider`

## Error Codes

| Error Type              | Code                  | Programming Error |
| ----------------------- | --------------------- | ----------------- |
| CircularDependencyError | `CIRCULAR_DEPENDENCY` | Yes               |
| FactoryError            | `FACTORY_FAILED`      | No                |
| DisposedScopeError      | `DISPOSED_SCOPE`      | Yes               |
| ScopeRequiredError      | `SCOPE_REQUIRED`      | Yes               |

## Handling Patterns

### Pattern 1: Switch on Error Code

Use `resolveResult` for exhaustive switching — it returns `Result<T, ResolutionError>` where `ResolutionError` is a discriminated union keyed by `code`:

```typescript
import { resolveResult, FactoryError } from "@hex-di/runtime";

const result = resolveResult(() => container.resolve(SomePort));
result.match(
  (service) => {
    // use service
  },
  (error) => {
    switch (error.code) {
      case "CIRCULAR_DEPENDENCY":
        console.error("Fix your dependency graph!");
        throw error; // Re-throw programming errors
      case "FACTORY_FAILED":
        console.error("Service creation failed:", error.cause);
        // Maybe retry or use fallback
        break;
      case "SCOPE_REQUIRED":
        console.error("Need a scope for this service");
        throw error;
      case "DISPOSED_SCOPE":
        console.error("Scope was already disposed");
        throw error;
    }
  },
);
```

### Pattern 2: Handle Programming vs Runtime Errors

```typescript
function resolveService<P extends AppPorts>(port: P): InferService<P> | null {
  return container.tryResolve(port).match(
    (service) => service,
    (error) => {
      if (error.isProgrammingError) {
        // Log and re-throw — this is a bug
        console.error("Programming error:", error.message);
        throw error;
      }
      // Handle gracefully — this is an external failure
      console.warn("Service unavailable:", error.message);
      return null; // Or fallback value
    },
  );
}
```

### Pattern 3: Factory with Retry

```typescript
import { FactoryError } from "@hex-di/runtime";
import type { Result, ContainerError } from "@hex-di/runtime";

async function resolveWithRetry<P extends AppPorts>(
  port: P,
  maxRetries = 3,
): Promise<Result<InferService<P>, ContainerError>> {
  let last = container.tryResolve(port);
  for (let attempt = 1; attempt < maxRetries && last.isErr(); attempt++) {
    if (!(last.error instanceof FactoryError)) break; // Only retry factory failures
    console.warn(`Attempt ${attempt} failed, retrying...`);
    await delay(1000 * attempt); // Exponential backoff
    last = container.tryResolve(port);
  }
  return last;
}
```

### Pattern 4: React Error Boundary

```typescript
import { ContainerError } from '@hex-di/runtime';

class DIErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    if (error instanceof ContainerError) {
      return { hasError: true, error };
    }
    throw error; // Re-throw non-DI errors
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      return (
        <div className="error-panel">
          <h2>Dependency Injection Error</h2>
          <p><strong>Code:</strong> {error.code}</p>
          <p><strong>Message:</strong> {error.message}</p>
          {error.isProgrammingError && (
            <p className="warning">This is a bug that needs to be fixed!</p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <DIErrorBoundary>
      <ContainerProvider container={container}>
        <MyApp />
      </ContainerProvider>
    </DIErrorBoundary>
  );
}
```

## Compile-Time Errors

HexDI catches many errors at compile time, not runtime.

### Missing Dependencies

```typescript
const graph = GraphBuilder.create()
  .provide(UserServiceAdapter) // requires Logger, Database
  .build();
// Type: "ERROR[HEX008]: Missing adapters for Logger | Database. Call .provide() first."
```

**How to Read:**

- The error type tells you exactly which ports are missing
- Add the missing adapters to your graph

### Duplicate Providers

```typescript
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(AnotherLoggerAdapter) // Same port!
  .build();
// Type: "ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call."
```

**How to Fix:**

- Remove the duplicate provider
- Or use different ports for different implementations

### Invalid Port Resolution

```typescript
container.resolve(UnregisteredPort);
// TypeScript Error: Argument of type 'typeof UnregisteredPort' is not assignable
```

**How to Fix:**

- Add the adapter to your graph
- Or check you're using the correct port

## Best Practices

### 1. Fail Fast for Programming Errors

```typescript
if (error.isProgrammingError) {
  // Don't try to recover - fix the code
  throw error;
}
```

### 2. Log Original Errors

```typescript
if (error instanceof FactoryError) {
  console.error("Factory failed:", {
    port: error.portName,
    originalError: error.cause,
  });
}
```

### 3. Use Error Codes for Monitoring

```typescript
// Send to monitoring service
metrics.increment(`di.error.${error.code}`);
```

### 4. Document Possible Errors

```typescript
/**
 * Resolves the database service.
 * @returns Result containing the service or FactoryError if the connection fails.
 */
function getDatabase(): Result<DatabaseService, ContainerError> {
  return container.tryResolve(DatabasePort);
}
```

### 5. Test Error Scenarios

```typescript
describe("error handling", () => {
  it("handles factory errors gracefully", () => {
    const badAdapter = createAdapter({
      provides: TestPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("Connection failed");
      },
    });

    const graph = GraphBuilder.create().provide(badAdapter).build();

    const container = createContainer({ graph, name: "App" });

    expect(() => container.resolve(TestPort)).toThrow(FactoryError);
  });
});
```

## Troubleshooting

### "Maximum call stack size exceeded"

Usually indicates a circular dependency that wasn't detected. Check your adapter factories for:

- Self-references
- Indirect cycles through multiple services

### "Cannot read property of undefined"

Check that:

- All required ports are in the graph
- You're resolving from the correct container/scope
- The factory function returns the correct type

### Factory errors during tests

- Mock external dependencies
- Check test isolation (don't share containers between tests)
- Verify mock implementations return expected types

## Next Steps

- Learn about [Testing Strategies](./testing-strategies.md) for error testing
- Review the [Runtime API Reference](../api/runtime.md)
