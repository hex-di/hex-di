# 12 - HexDI Integration

_Previous: [11 - Error Patterns](./11-error-patterns.md)_

---

## 53. Container Resolution as Result

HexDI's Container currently throws on resolution failures. `@hex-di/result` adds a `resolveResult` method that returns `Result<T, ResolutionError>` instead.

### resolveResult

```typescript
// On Container:
resolveResult<T>(port: Port<T, string>): Result<T, ResolutionError>;
```

```typescript
import { resolveResult } from "@hex-di/result/integration";

const result = container.resolveResult(UserServicePort);
// Type: Result<UserService, ResolutionError>

result.match(
  service => service.getUser(id),
  error => {
    switch (error._tag) {
      case "MissingAdapter":
        return err({ _tag: "ConfigError", message: `No adapter for ${error.portName}` });
      case "CircularDependency":
        return err({ _tag: "ConfigError", message: `Circular: ${error.chain.join(" → ")}` });
      case "LifetimeMismatch":
        return err({ _tag: "ConfigError", message: error.message });
    }
  }
);
```

### ResolutionError type

Mirrors HexDI's existing `ContainerError` hierarchy as a tagged union:

```typescript
type ResolutionError =
  | { readonly _tag: "MissingAdapter"; readonly portName: string }
  | { readonly _tag: "CircularDependency"; readonly chain: readonly string[] }
  | { readonly _tag: "LifetimeMismatch"; readonly message: string }
  | { readonly _tag: "FactoryError"; readonly portName: string; readonly cause: unknown }
  | { readonly _tag: "DisposedContainer" };
```

### Integration pattern

`resolveResult` is implemented as a thin wrapper that catches the thrown error and converts it:

```typescript
function resolveResult<T>(container: Container, port: Port<T, string>): Result<T, ResolutionError> {
  return tryCatch(
    () => container.resolve(port),
    thrown => toResolutionError(thrown)
  );
}
```

This keeps the core Container unchanged (no breaking changes) while providing a Result-based alternative for consumers who prefer typed error handling.

### Composing with service methods

```typescript
const result = safeTry(function* () {
  const userService = yield* container.resolveResult(UserServicePort);
  const authService = yield* container.resolveResult(AuthServicePort);

  const user = yield* userService.findUser(id);
  const token = yield* authService.createToken(user);

  return ok({ user, token });
});
// Type: Result<{ user: User; token: Token }, ResolutionError | UserError | AuthError>
```

## 54. Tracing Integration

`@hex-di/result` integrates with `@hex-di/tracing` to record Result outcomes in spans.

### Automatic span recording

When tracing is enabled, adapter resolution hooks can automatically record the Result of each operation:

```typescript
// In a traced adapter factory:
const result = await operation();

// The tracing hook records:
if (result.isOk()) {
  span.setStatus("ok");
  span.setAttribute("result.tag", "Ok");
} else {
  span.setStatus("error");
  span.setAttribute("result.tag", "Err");
  span.setAttribute("result.error._tag", result.error._tag);
  span.recordError(result.error);
}
```

### recordResult helper

A utility for recording Result outcomes in tracing spans:

```typescript
function recordResult<T, E>(span: Span, result: Result<T, E>): Result<T, E>;
```

```typescript
import { recordResult } from "@hex-di/result/integration";

const result = await fetchUser(id);
recordResult(currentSpan, result);
// Records Ok/Err status + error details in the span
// Returns the result unchanged (pass-through)
```

### As a side effect in chains

```typescript
const result = await fetchUser(id)
  .andTee(user => span.setAttribute("user.id", user.id))
  .orTee(error => {
    span.setStatus("error");
    span.recordError(error);
  })
  .andThen(enrichUser);
```

### Error frequency tracking

When Results flow through the tracing system, the backend can aggregate:

- **Error rate per adapter**: Which adapters produce the most Err results?
- **Error type distribution**: What `_tag` values appear most frequently?
- **Recovery success rate**: How often does `orElse` successfully recover?
- **Error propagation paths**: Which chains of `andThen` produce which error combinations?

## 55. Inspector Integration

The HexDI Inspector can query Result-based error statistics across the dependency graph.

### Error statistics per port

```typescript
interface ResultStatistics {
  readonly portName: string;
  readonly totalCalls: number;
  readonly okCount: number;
  readonly errCount: number;
  readonly errorRate: number;
  readonly errorsByTag: ReadonlyMap<string, number>;
  readonly lastError?: {
    readonly _tag: string;
    readonly timestamp: number;
  };
}
```

### Inspector API extension

```typescript
// On Inspector:
getResultStatistics(portName: string): ResultStatistics | undefined;
getAllResultStatistics(): ReadonlyMap<string, ResultStatistics>;
getHighErrorRatePorts(threshold: number): readonly ResultStatistics[];
```

```typescript
// Which ports have error rates above 5%?
const problematic = inspector.getHighErrorRatePorts(0.05);

// What's the error distribution for the UserService?
const stats = inspector.getResultStatistics("UserService");
if (stats) {
  console.log(`Error rate: ${(stats.errorRate * 100).toFixed(1)}%`);
  for (const [tag, count] of stats.errorsByTag) {
    console.log(`  ${tag}: ${count}`);
  }
}
```

### Inspector events

```typescript
type ResultInspectorEvent =
  | { readonly type: "result:ok"; readonly portName: string; readonly timestamp: number }
  | {
      readonly type: "result:err";
      readonly portName: string;
      readonly errorTag: string;
      readonly timestamp: number;
    }
  | {
      readonly type: "result:recovered";
      readonly portName: string;
      readonly fromTag: string;
      readonly timestamp: number;
    };
```

### Alignment with HexDI's nervous system vision

This integration fulfills Phase 3 of the HexDI vision: libraries report what they know to the container. Results aren't just handled -- they're observed. The application knows its own error patterns and can:

1. **Report** error rates through the Inspector
2. **Trace** error propagation through spans
3. **Diagnose** which adapters are failing and why
4. **Alert** when error rates exceed thresholds (Phase 5: autonomy)

## 56. Adapter Error Boundaries

Adapters that return Results can participate in error boundary patterns:

### Error boundary adapter

An adapter that catches all Err results from a wrapped adapter and converts them:

```typescript
function withErrorBoundary<T, E, F>(
  adapter: Adapter<Result<T, E>>,
  mapErr: (error: E) => F
): Adapter<Result<T, F>>;
```

### Retry adapter

An adapter that retries on Err results:

```typescript
function withRetry<T, E>(
  adapter: Adapter<Result<T, E>>,
  config: {
    readonly maxAttempts: number;
    readonly delay: number;
    readonly shouldRetry: (error: E, attempt: number) => boolean;
  }
): Adapter<ResultAsync<T, E>>;
```

### Circuit breaker adapter

An adapter that opens a circuit breaker after repeated failures:

```typescript
function withCircuitBreaker<T, E>(
  adapter: Adapter<Result<T, E>>,
  config: {
    readonly failureThreshold: number;
    readonly resetTimeout: number;
  }
): Adapter<Result<T, E | CircuitOpenError>>;
```

These patterns compose naturally because Result makes success/failure explicit in the type system. The container's tracing and inspector integration automatically tracks the retry attempts, circuit breaker state, and error boundary conversions.

---

_Previous: [11 - Error Patterns](./11-error-patterns.md) | Next: [13 - Testing](./13-testing.md)_
