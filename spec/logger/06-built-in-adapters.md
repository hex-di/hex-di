# 06 - Built-in Adapters

_Previous: [05 - Handler & Formatter Ports](./05-handler-formatter-ports.md)_

---

## 23. NoOp Adapter

The NoOp adapter provides a zero-cost Logger implementation. All methods are no-ops. The logger is a frozen singleton. No allocation, no formatting, no I/O.

### Adapter definition

```typescript
import { createAdapter } from "@hex-di/core";

const NoOpLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => NOOP_LOGGER,
});
```

### NOOP_LOGGER singleton

```typescript
const EMPTY_CONTEXT: LogContext = Object.freeze({});

const NOOP_LOGGER: Logger = Object.freeze({
  trace(_message: string, _annotations?: Record<string, unknown>): void {},
  debug(_message: string, _annotations?: Record<string, unknown>): void {},
  info(_message: string, _annotations?: Record<string, unknown>): void {},
  warn(_message: string, _annotations?: Record<string, unknown>): void {},
  error(
    _message: string,
    _errOrAnn?: Error | Record<string, unknown>,
    _ann?: Record<string, unknown>
  ): void {},
  fatal(
    _message: string,
    _errOrAnn?: Error | Record<string, unknown>,
    _ann?: Record<string, unknown>
  ): void {},
  child(_context: Partial<LogContext>): Logger {
    return NOOP_LOGGER;
  },
  withAnnotations(_annotations: Record<string, unknown>): Logger {
    return NOOP_LOGGER;
  },
  isLevelEnabled(_level: LogLevel): boolean {
    return false;
  },
  getContext(): LogContext {
    return EMPTY_CONTEXT;
  },
  time<T>(_name: string, fn: () => T): T {
    return fn();
  },
  async timeAsync<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  },
});
```

### Properties

| Property              | Value                                               |
| --------------------- | --------------------------------------------------- |
| **Lifetime**          | Singleton (shared frozen object)                    |
| **Requires**          | Nothing                                             |
| **child()**           | Returns `NOOP_LOGGER` itself (no allocation)        |
| **withAnnotations()** | Returns `NOOP_LOGGER` itself (no allocation)        |
| **isLevelEnabled()**  | Always `false`                                      |
| **getContext()**      | Returns frozen `{}`                                 |
| **time/timeAsync**    | Executes the function, skips logging                |
| **Object.freeze**     | The singleton is frozen -- no property modification |
| **GC pressure**       | Zero (single object, never garbage collected)       |

### When to use

- **Production services where logging is disabled** -- swap in `NoOpLoggerAdapter` via environment config
- **Performance-critical paths** -- use `isLevelEnabled()` to guard expensive annotation construction
- **Default fallback** -- when no logger is configured, NoOp ensures the application runs without error

## 24. Console Adapter

The Console adapter outputs formatted log entries to the platform console. Designed for local development.

### Adapter definition

```typescript
const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createConsoleLogger(),
});
```

### Factory function

```typescript
interface ConsoleLoggerOptions {
  /** Minimum log level (default: "info"). */
  readonly level?: LogLevel;
  /** Custom formatter instance. */
  readonly formatter?: LogFormatter;
  /** Built-in formatter type (default: "pretty"). */
  readonly formatterType?: FormatterType;
}

function createConsoleLogger(options?: ConsoleLoggerOptions): Logger;
```

### Console method mapping

The Console adapter maps log levels to `console` methods:

| LogLevel | Console Method  |
| -------- | --------------- |
| `trace`  | `console.debug` |
| `debug`  | `console.debug` |
| `info`   | `console.info`  |
| `warn`   | `console.warn`  |
| `error`  | `console.error` |
| `fatal`  | `console.error` |

### Platform abstraction

The Console adapter accesses the console through a `getConsole()` utility that safely checks for `globalThis.console` availability. This ensures the adapter works in:

- Node.js
- Browsers
- Workers (Web Workers, Service Workers)
- Edge runtimes (Cloudflare Workers, Deno Deploy)

If no console is available, the adapter silently drops entries. It does not throw.

### Properties

| Property              | Value                                             |
| --------------------- | ------------------------------------------------- |
| **Lifetime**          | Singleton                                         |
| **Requires**          | Nothing                                           |
| **Default level**     | `"info"`                                          |
| **Default format**    | Pretty formatter                                  |
| **child()**           | Returns new ConsoleLogger with merged context     |
| **withAnnotations()** | Returns new ConsoleLogger with merged annotations |
| **time/timeAsync**    | Measures duration, logs completion/failure        |

## 25. Memory Adapter

The Memory adapter stores log entries in an in-memory array for test assertions. It extends the `Logger` interface with query methods.

### Adapter definition

```typescript
const MemoryLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "transient", // Fresh instance per resolution for test isolation
  factory: () => createMemoryLogger(),
});
```

### MemoryLogger interface

```typescript
/**
 * Extended Logger interface with testing query methods.
 */
interface MemoryLogger extends Logger {
  /** Get all collected log entries (returns a copy). */
  getEntries(): ReadonlyArray<LogEntry>;

  /** Get entries filtered by level. */
  getEntriesByLevel(level: LogLevel): ReadonlyArray<LogEntry>;

  /** Clear all collected entries. */
  clear(): void;

  /** Find an entry matching a predicate. */
  findEntry(predicate: (entry: LogEntry) => boolean): LogEntry | undefined;
}
```

### Factory function

```typescript
/**
 * Create a new MemoryLogger instance.
 *
 * @param minLevel - Minimum log level (default: "trace" -- capture everything)
 */
function createMemoryLogger(minLevel?: LogLevel): MemoryLogger;
```

### Shared entry array

Child loggers created via `child()` share the same underlying entry array as the parent. This is essential for testing: you create a root MemoryLogger, pass child loggers to services, and assert on the root's entries.

```typescript
const root = createMemoryLogger();
const child = root.child({ requestId: "req-1" });

child.info("From child");
root.info("From root");

root.getEntries();
// [
//   { message: "From child", context: { requestId: "req-1" }, ... },
//   { message: "From root", context: {}, ... }
// ]
```

### Properties

| Property              | Value                                           |
| --------------------- | ----------------------------------------------- |
| **Lifetime**          | Transient (fresh per test)                      |
| **Requires**          | Nothing                                         |
| **Default level**     | `"trace"` (capture everything)                  |
| **child()**           | New MemoryLogger sharing the same entry array   |
| **withAnnotations()** | New MemoryLogger sharing the same entry array   |
| **getEntries()**      | Returns a shallow copy of the array             |
| **clear()**           | Empties the shared array (affects all children) |
| **time/timeAsync**    | Measures duration, logs entries, returns result |

### Test isolation

Because the adapter uses `transient` lifetime, each `container.resolve(LoggerPort)` call creates a fresh MemoryLogger with an empty entry array. Tests that share a container get isolated logger instances.

## 26. Scoped Logger Adapter

The Scoped adapter creates a Logger per DI scope, automatically including the scope ID in the context. It delegates to a `LogHandler` for actual output.

### Adapter definition

```typescript
const ScopedLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [LogHandlerPort],
  lifetime: "scoped",
  factory: (deps, scope) => {
    const handler = deps[LogHandlerPort.name];
    const baseLogger = createHandlerLogger(handler);
    return baseLogger.child({
      scopeId: scope?.id,
    });
  },
});
```

### Purpose

In request-scoped architectures (e.g., Hono middleware), each request creates a DI scope. The Scoped adapter ensures every log entry from that scope includes the scope ID, enabling:

1. **Log correlation** -- all entries from a single request share the same scopeId
2. **Lifecycle logging** -- scope creation and disposal can be logged automatically
3. **Handler delegation** -- the actual output goes through the registered `LogHandler`, allowing Pino/Winston/Bunyan as the backend

### Usage with Hono

```typescript
import { ScopedLoggerAdapter, LoggerPort } from "@hex-di/logger";
import { PinoHandlerAdapter } from "@hex-di/logger-pino";

const graph = createGraphBuilder()
  .provide(ScopedLoggerAdapter) // scoped lifetime
  .provide(PinoHandlerAdapter) // singleton handler
  .build();

// In Hono middleware:
app.use("*", async (c, next) => {
  const scope = c.get("scope");
  const logger = scope.resolve(LoggerPort);
  // logger.getContext() → { scopeId: "scope-abc-123" }

  logger.info("Handling request");
  c.set("logger", logger);
  await next();
});
```

### Properties

| Property     | Value                                                |
| ------------ | ---------------------------------------------------- |
| **Lifetime** | Scoped (one per DI scope)                            |
| **Requires** | `LogHandlerPort`                                     |
| **Context**  | Automatically includes `scopeId` from scope          |
| **child()**  | Returns new Logger with merged context, same handler |
| **Disposal** | Handler is not disposed (singleton), logger is GC'd  |

---

_Previous: [05 - Handler & Formatter Ports](./05-handler-formatter-ports.md) | Next: [07 - Backend Adapters](./07-backend-adapters.md)_
