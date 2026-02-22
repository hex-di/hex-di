# 05 - Handler & Formatter Ports

_Previous: [04 - Logger Port](./04-logger-port.md)_

---

## 18. LogHandler Interface

`LogHandler` is the output port for log entries. It receives fully-constructed `LogEntry` objects from the Logger implementation and routes them to the appropriate output (console, file, remote service, etc.).

```typescript
/**
 * Handler that processes log entries.
 *
 * Handlers are the output boundary of the logging system.
 * They receive structured entries and write them to backends.
 *
 * Lifecycle: handle() -> flush() -> shutdown()
 *   - handle() is called synchronously for each log entry
 *   - flush() ensures all pending entries are written
 *   - shutdown() releases resources and is called on application exit
 */
interface LogHandler {
  /**
   * Handle a log entry.
   *
   * Called synchronously by the Logger. Implementations may
   * buffer entries and write them asynchronously.
   */
  handle(entry: LogEntry): void;

  /**
   * Flush pending log entries.
   *
   * Ensures all buffered entries are written to the backend.
   * Called before shutdown or when immediate output is needed.
   */
  flush(): Promise<void>;

  /**
   * Shutdown the handler and release resources.
   *
   * Called during application shutdown. After this call,
   * handle() should not be called.
   */
  shutdown(): Promise<void>;
}
```

### Handler lifecycle

```
Application running:
  logger.info(...)  -->  handler.handle(entry)   // may buffer
  logger.warn(...)  -->  handler.handle(entry)   // may buffer

Before shutdown:
  handler.flush()    -->  write all buffered entries
  handler.shutdown() -->  close connections, release resources
```

### Synchronous handle, async flush

`handle()` is synchronous by design. Log calls should never block the application. Handlers that need async writes (e.g., network transport) should buffer entries internally and flush asynchronously.

```
Caller thread:
  logger.info("msg")  ──>  handler.handle(entry)  ──>  return (fast)
                                    |
                                    v
Background:             buffer ──> [entry1, entry2, ...]
                                    |
                        flush() ──> write all to backend (async)
```

### Error handling in handlers

Handlers must not throw from `handle()`. If the backend is unavailable, the handler should:

1. Buffer the entry for retry (if supported)
2. Drop the entry silently (if no buffering)
3. Log a warning via a fallback mechanism (e.g., stderr)

Never propagate handler errors to the caller of `logger.info()`.

## 19. LogHandlerPort Definition

```typescript
import { port } from "@hex-di/core";

/**
 * Log handler port for DI registration.
 */
const LogHandlerPort = port<LogHandler>()({
  name: "LogHandler",
  direction: "outbound",
  description: "Log entry processor for routing entries to backends",
  category: "infrastructure",
  tags: ["logging", "observability"],
});
```

### Port metadata

| Field         | Value                                                    |
| ------------- | -------------------------------------------------------- |
| `name`        | `"LogHandler"`                                           |
| `direction`   | `"outbound"` -- entries flow from application to backend |
| `description` | Log entry processor for routing entries to backends      |
| `category`    | `"infrastructure"`                                       |
| `tags`        | `["logging", "observability"]`                           |

### Relationship to LoggerPort

`LoggerPort` and `LogHandlerPort` serve different roles:

| Concern        | LoggerPort                          | LogHandlerPort                 |
| -------------- | ----------------------------------- | ------------------------------ |
| **Consumer**   | Application code                    | Logger adapters                |
| **Purpose**    | Call-site API (level methods, etc.) | Output routing to backend      |
| **Lifetime**   | Varies (singleton, scoped)          | Typically singleton            |
| **Dependency** | Application services depend on this | Logger adapters depend on this |

A Scoped logger adapter, for example, `requires: [LogHandlerPort]` and creates a Logger that delegates `handle()` calls to the resolved handler.

## 20. LogFormatter Interface

`LogFormatter` converts structured `LogEntry` objects to strings. Used by text-based outputs (console, file).

```typescript
/**
 * Formatter for log entries.
 *
 * Transforms a LogEntry into a string representation.
 * Different formatters serve different environments:
 *   - JSON for production (machine-parseable)
 *   - Pretty for development (human-readable)
 *   - Minimal for tests (compact)
 */
interface LogFormatter {
  /**
   * Format a log entry to string.
   *
   * @param entry - The structured log entry
   * @returns Formatted string representation
   */
  format(entry: LogEntry): string;
}
```

### Formatter contract

1. `format()` must be a pure function -- same entry produces same output
2. `format()` must not modify the entry
3. `format()` must not throw -- produce a best-effort string on any input
4. The returned string should be a single logical line (no trailing newline)

## 21. LogFormatterPort Definition

```typescript
import { port } from "@hex-di/core";

/**
 * Log formatter port for DI registration.
 */
const LogFormatterPort = port<LogFormatter>()({
  name: "LogFormatter",
  direction: "outbound",
  description: "Log entry formatter for text-based output",
  category: "infrastructure",
  tags: ["logging", "observability"],
});
```

### When to use the port

The `LogFormatterPort` is optional. Most applications use one of the built-in formatters directly or rely on the backend adapter's native formatting (Pino, Winston). The port is useful when:

- You want to inject a custom formatter via DI
- You need different formatters per scope (e.g., JSON in production scope, pretty in debug scope)
- You want to test formatter output in isolation

## 22. Built-in Formatters

Three built-in formatters are available via `getFormatter(type)`:

```typescript
/**
 * Built-in formatter types.
 */
type FormatterType = "json" | "pretty" | "minimal";

/**
 * Get a built-in formatter by type name.
 */
function getFormatter(type: FormatterType): LogFormatter;
```

### JSON Formatter

Outputs single-line JSON strings. Suitable for production log aggregators.

```typescript
const formatter = getFormatter("json");

formatter.format({
  level: "info",
  message: "Order created",
  timestamp: 1707350400000,
  context: { correlationId: "abc-123" },
  annotations: { orderId: "12345" },
});
// {"level":"info","message":"Order created","timestamp":"2024-02-08T00:00:00.000Z","correlationId":"abc-123","orderId":"12345"}
```

**JSON formatter behavior:**

| Field                | Output                                      |
| -------------------- | ------------------------------------------- |
| `level`              | `"level": "info"`                           |
| `message`            | `"message": "Order created"`                |
| `timestamp`          | `"timestamp": "2024-02-..."` (ISO 8601)     |
| `context` fields     | Flattened into top-level keys               |
| `annotations` fields | Flattened into top-level keys               |
| `error`              | `"error": { "name", "message", "stack" }`   |
| `spans`              | `"traceId": "...", "spanId": "..."` (first) |

### Pretty Formatter

Outputs human-readable log lines with aligned level labels. Suitable for development console.

```typescript
const formatter = getFormatter("pretty");

formatter.format({
  level: "info",
  message: "Order created",
  timestamp: 1707350400000,
  context: {},
  annotations: { orderId: "12345" },
});
// 2024-02-08T00:00:00.000Z [ INFO] Order created {"orderId":"12345"}
```

**Level label alignment:**

| Level   | Label   |
| ------- | ------- |
| `trace` | `TRACE` |
| `debug` | `DEBUG` |
| `info`  | ` INFO` |
| `warn`  | ` WARN` |
| `error` | `ERROR` |
| `fatal` | `FATAL` |

Labels are right-padded to 5 characters for visual alignment. Errors append `error=<message>`. Trace context appends `traceId=<id>`.

### Minimal Formatter

Outputs only level and message. Suitable for tests and compact output.

```typescript
const formatter = getFormatter("minimal");

formatter.format({
  level: "warn",
  message: "Slow query detected",
  timestamp: Date.now(),
  context: {},
  annotations: { duration: 5000 },
});
// [ WARN] Slow query detected
```

Minimal formatter ignores context, annotations, errors, and spans. It produces the most compact possible output.

### Formatter comparison

| Feature        | JSON           | Pretty           | Minimal   |
| -------------- | -------------- | ---------------- | --------- |
| Machine parse  | Yes            | No               | No        |
| Human readable | No             | Yes              | Yes       |
| Context        | Flattened keys | Not shown        | Not shown |
| Annotations    | Flattened keys | JSON inline      | Not shown |
| Error details  | Full object    | Message only     | Not shown |
| Trace context  | traceId/spanId | traceId appended | Not shown |
| Use case       | Production     | Development      | Tests     |

---

_Previous: [04 - Logger Port](./04-logger-port.md) | Next: [06 - Built-in Adapters](./06-built-in-adapters.md)_
