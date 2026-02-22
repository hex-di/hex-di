# 04 - Logger Port

_Previous: [03 - Log Types](./03-log-types.md)_

---

## 13. Logger Interface

The `Logger` interface is the primary API for application code. It provides level-based logging methods, child logger creation, annotation attachment, and operation timing.

```typescript
/**
 * Logger interface for structured logging.
 *
 * Provides level-based logging methods with support for annotations,
 * child loggers, and timed operations. All methods are synchronous
 * (fire-and-forget) except timeAsync.
 */
interface Logger {
  /**
   * Log at trace level.
   * Finest granularity, typically disabled in production.
   */
  trace(message: string, annotations?: Record<string, unknown>): void;

  /**
   * Log at debug level.
   * Diagnostic information for development and staging.
   */
  debug(message: string, annotations?: Record<string, unknown>): void;

  /**
   * Log at info level.
   * Notable events in normal operation.
   */
  info(message: string, annotations?: Record<string, unknown>): void;

  /**
   * Log at warn level.
   * Recoverable issues that deserve attention.
   */
  warn(message: string, annotations?: Record<string, unknown>): void;

  /**
   * Log at error level.
   * Operation failed, but the application continues.
   *
   * Overloaded: accepts optional Error object as second argument.
   */
  error(message: string, annotations?: Record<string, unknown>): void;
  error(message: string, error: Error, annotations?: Record<string, unknown>): void;

  /**
   * Log at fatal level.
   * Application cannot continue, unrecoverable state.
   *
   * Overloaded: accepts optional Error object as second argument.
   */
  fatal(message: string, annotations?: Record<string, unknown>): void;
  fatal(message: string, error: Error, annotations?: Record<string, unknown>): void;

  /**
   * Create a child logger with additional context.
   *
   * The child inherits the parent's context and merges the
   * provided context on top. Context is carried through all
   * subsequent log entries from the child.
   */
  child(context: Partial<LogContext>): Logger;

  /**
   * Create a child logger with persistent annotations.
   *
   * Annotations are merged with the parent's base annotations.
   * Every log entry from the returned logger includes these annotations
   * in addition to any per-call annotations.
   */
  withAnnotations(annotations: Record<string, unknown>): Logger;

  /**
   * Check if a level is enabled for this logger.
   *
   * Use this to guard expensive annotation construction:
   * if (logger.isLevelEnabled("debug")) {
   *   logger.debug("Heavy", { data: computeExpensive() });
   * }
   */
  isLevelEnabled(level: LogLevel): boolean;

  /**
   * Get the current log context.
   *
   * Returns the merged context from this logger's chain.
   */
  getContext(): LogContext;

  /**
   * Time a synchronous operation and log the duration.
   *
   * Logs at debug level on success, error level on failure.
   * The operation's return value is passed through.
   */
  time<T>(name: string, fn: () => T): T;

  /**
   * Time an asynchronous operation and log the duration.
   *
   * Logs at debug level on success, error level on failure.
   * The operation's return value is passed through.
   */
  timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
}
```

### Method behavior table

| Method                  | Level       | Error arg | Annotations arg | Returns      |
| ----------------------- | ----------- | --------- | --------------- | ------------ |
| `trace(msg, ann?)`      | trace       | No        | Optional        | `void`       |
| `debug(msg, ann?)`      | debug       | No        | Optional        | `void`       |
| `info(msg, ann?)`       | info        | No        | Optional        | `void`       |
| `warn(msg, ann?)`       | warn        | No        | Optional        | `void`       |
| `error(msg, ann?)`      | error       | No        | Optional        | `void`       |
| `error(msg, err, ann?)` | error       | Yes       | Optional        | `void`       |
| `fatal(msg, ann?)`      | fatal       | No        | Optional        | `void`       |
| `fatal(msg, err, ann?)` | fatal       | Yes       | Optional        | `void`       |
| `child(ctx)`            | N/A         | N/A       | N/A             | `Logger`     |
| `withAnnotations(ann)`  | N/A         | N/A       | N/A             | `Logger`     |
| `isLevelEnabled(level)` | N/A         | N/A       | N/A             | `boolean`    |
| `getContext()`          | N/A         | N/A       | N/A             | `LogContext` |
| `time(name, fn)`        | debug/error | N/A       | N/A             | `T`          |
| `timeAsync(name, fn)`   | debug/error | N/A       | N/A             | `Promise<T>` |

### error/fatal argument disambiguation

The `error` and `fatal` methods support two call signatures. The implementation disambiguates based on `instanceof Error`:

```typescript
// Implementation pattern:
error(
  message: string,
  errorOrAnnotations?: Error | Record<string, unknown>,
  annotations?: Record<string, unknown>
): void {
  if (errorOrAnnotations instanceof Error) {
    // Second arg is Error, third arg is annotations
    this._log("error", message, errorOrAnnotations, annotations);
  } else {
    // Second arg is annotations, no Error
    this._log("error", message, undefined, errorOrAnnotations);
  }
}
```

This means you cannot pass a class that extends `Error` as an annotation value directly in the second position. Use the third argument for annotations when passing an error:

```typescript
// Correct usage
logger.error("Failed", new TypeError("invalid"), { requestId: "123" });
logger.error("Failed", { requestId: "123" }); // no Error object

// Ambiguous -- will be treated as Error arg, not annotation
// logger.error("Failed", someErrorSubclass);  // this is correct behavior
```

## 14. LoggerPort Definition

The `LoggerPort` follows HexDI's port definition convention:

```typescript
import { port } from "@hex-di/core";

/**
 * Logger port for DI registration.
 *
 * Direction: outbound (application sends log data out)
 * Category: infrastructure (cross-cutting concern)
 */
const LoggerPort = port<Logger>()({
  name: "Logger",
  direction: "outbound",
  description: "Structured logging service for context-aware log output",
  category: "infrastructure",
  tags: ["logging", "observability"],
});
```

### Port metadata

| Field         | Value                                                   |
| ------------- | ------------------------------------------------------- |
| `name`        | `"Logger"`                                              |
| `direction`   | `"outbound"` -- data flows from application to output   |
| `description` | Structured logging service for context-aware log output |
| `category`    | `"infrastructure"` -- cross-cutting concern             |
| `tags`        | `["logging", "observability"]`                          |

### Resolution

```typescript
import { LoggerPort } from "@hex-di/logger";

// In a service that needs logging:
const logger = container.resolve(LoggerPort);
logger.info("Service initialized");
```

The container resolves `LoggerPort` to whichever adapter is registered in the graph. Application code depends only on the `Logger` interface, never on a specific adapter.

## 15. Child Loggers

Child loggers are the primary mechanism for context propagation. Each `child()` call creates a new Logger that inherits the parent's context and merges additional context on top.

### Context chain

```typescript
const root = container.resolve(LoggerPort);
// root.getContext() → {}

const service = root.child({ service: "order-service" });
// service.getContext() → { service: "order-service" }

const request = service.child({
  correlationId: "corr-abc",
  requestId: "req-123",
});
// request.getContext() → {
//   service: "order-service",
//   correlationId: "corr-abc",
//   requestId: "req-123"
// }

const user = request.child({ userId: "user-456" });
// user.getContext() → {
//   service: "order-service",
//   correlationId: "corr-abc",
//   requestId: "req-123",
//   userId: "user-456"
// }
```

### Override semantics

Child context values override parent values for the same key:

```typescript
const parent = logger.child({ service: "api", version: "1.0" });
const child = parent.child({ service: "api-v2" });
// child.getContext() → { service: "api-v2", version: "1.0" }
// "service" is overridden, "version" is inherited
```

### Shared entry collection (Memory adapter)

Child loggers from the Memory adapter share the same underlying entry array. This is critical for testing: entries logged by child loggers are visible when querying the root logger's entries.

```typescript
const root = createMemoryLogger();
const child = root.child({ requestId: "req-1" });

child.info("From child");
root.getEntries(); // [{ message: "From child", context: { requestId: "req-1" } }]
```

### NoOp child loggers

The NoOp adapter returns the same `NOOP_LOGGER` singleton from `child()`. No allocation occurs.

```typescript
const noop = NOOP_LOGGER;
const child = noop.child({ correlationId: "abc" });
child === noop; // true (same reference)
```

## 16. Annotations

Annotations are key-value pairs attached to log entries. They differ from context: context is inherited by child loggers and persists across calls, while annotations can be either persistent (via `withAnnotations`) or per-call.

### Per-call annotations

```typescript
logger.info("Order created", { orderId: "12345", amount: 99.99 });
// LogEntry.annotations: { orderId: "12345", amount: 99.99 }
```

### Persistent annotations via withAnnotations

```typescript
const orderLogger = logger.withAnnotations({
  orderId: "12345",
  customerId: "67890",
});

orderLogger.info("Payment processed", { amount: 99.99 });
// LogEntry.annotations: { orderId: "12345", customerId: "67890", amount: 99.99 }

orderLogger.info("Order shipped");
// LogEntry.annotations: { orderId: "12345", customerId: "67890" }
```

### Merge precedence

When both base annotations and per-call annotations exist, per-call values win:

```typescript
const logger = baseLogger.withAnnotations({ source: "api", version: "1.0" });
logger.info("Request", { source: "webhook" });
// LogEntry.annotations: { source: "webhook", version: "1.0" }
```

### Annotation values

Annotation values are `unknown`. Common types include:

- `string` -- identifiers, names, statuses
- `number` -- durations, counts, amounts
- `boolean` -- flags, feature toggles
- `object` -- nested structured data (will be JSON-serialized by formatters)

Annotation values should be JSON-serializable. Passing functions, symbols, or circular references will produce undefined behavior in formatters.

## 17. Timing Operations

The `time` and `timeAsync` methods measure operation duration and log the result.

### Synchronous timing

```typescript
/**
 * Time a synchronous operation.
 *
 * On success: logs at debug level with duration.
 * On failure: logs at error level with duration and error, then re-throws.
 */
time<T>(name: string, fn: () => T): T;
```

```typescript
const result = logger.time("parse-config", () => {
  return JSON.parse(configString);
});
// Success: debug log "parse-config completed" { duration: 2 }
// Failure: error log "parse-config failed" { duration: 1 } + error object, then throws
```

### Asynchronous timing

```typescript
/**
 * Time an asynchronous operation.
 *
 * On success: logs at debug level with duration.
 * On failure: logs at error level with duration and error, then re-throws.
 */
timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
```

```typescript
const user = await logger.timeAsync("fetch-user", async () => {
  return await userService.findById(id);
});
// Success: debug log "fetch-user completed" { duration: 45 }
// Failure: error log "fetch-user failed" { duration: 3000 } + error object, then throws
```

### Timing implementation

```
time(name, fn):
  start = Date.now()
  try:
    result = fn()
    duration = Date.now() - start
    this.debug(name + " completed", { duration })
    return result
  catch err:
    duration = Date.now() - start
    this.error(name + " failed", err instanceof Error ? err : undefined, { duration })
    throw err
```

### NoOp timing behavior

The NoOp adapter's `time` and `timeAsync` methods execute the function but skip the logging:

```typescript
// NOOP_LOGGER:
time<T>(_name: string, fn: () => T): T {
  return fn(); // No timing, no logging
}
```

This ensures the operation still runs, but with zero overhead for the logging wrapper.

---

_Previous: [03 - Log Types](./03-log-types.md) | Next: [05 - Handler & Formatter Ports](./05-handler-formatter-ports.md)_
