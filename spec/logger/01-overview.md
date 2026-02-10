# 01 - Overview & Philosophy

## 1. Overview

`@hex-di/logger` provides structured, context-aware logging for the HexDI ecosystem. Every log entry is a typed data structure with level, message, timestamp, context, and annotations. Logging flows through hexagonal architecture ports and adapters: the application code depends on the `Logger` interface, never on a specific backend.

The core package ships three built-in adapters:

- **NoOp** -- zero-cost singleton for production when logging is disabled
- **Console** -- formatted output for local development
- **Memory** -- in-memory collection for test assertions

Production backends live in separate packages (`@hex-di/logger-pino`, `@hex-di/logger-winston`, `@hex-di/logger-bunyan`) that each implement the `LogHandler` port and bridge to the underlying library.

```typescript
import { LoggerPort, ConsoleLoggerAdapter } from "@hex-di/logger";
import { createGraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

const graph = createGraphBuilder().provide(ConsoleLoggerAdapter).build();
const container = createContainer(graph);
const logger = container.resolve(LoggerPort);

logger.info("Application started", { version: "1.0.0" });

const requestLogger = logger.child({ correlationId: "abc-123", userId: "user-456" });
requestLogger.info("Processing order"); // context propagated automatically

const result = logger.time("database-query", () => database.findUser("alice"));
// Logs: "database-query completed" with { duration: 5 }
```

### What this package provides

- **Logger port** with level methods (trace, debug, info, warn, error, fatal), child loggers, annotations, and timed operations
- **LogHandler port** for routing log entries to backends (console, file, remote service)
- **LogFormatter port** with three built-in formatters (JSON, pretty, minimal)
- **Context propagation** via `LogContextVar` and `LogAnnotationsVar` for request-scoped data
- **NoOp adapter** with zero runtime overhead -- all methods are no-ops, the singleton is frozen
- **Memory adapter** for test assertions -- collect entries, query by level, find by predicate
- **Console adapter** for development -- colorized, human-readable output
- **Scoped logger adapter** for per-request context via DI scope lifecycle
- **Redaction** for sensitive data (passwords, tokens, credit cards)
- **Sampling** for high-throughput environments with per-level control
- **Container instrumentation** for automatic DI resolution logging
- **Framework integration** with Hono middleware and React hooks
- **Tracing integration** for span correlation in log entries
- **Inspection & reporting** with `LoggerInspector` for runtime introspection, statistics, and MCP resource readiness
- **Testing utilities** with `assertLogEntry` and `LogEntryMatcher`

### What this package does NOT provide

- No global singleton logger -- all loggers flow through DI
- No runtime log level parsing from strings (define levels at registration time)
- No file transport in the core package -- use backend adapters for file output
- No `any` types in the public API surface
- No type casting internally
- No pattern matching engine -- use TypeScript's native `switch` or `if` on `level`

### 0.1.0 Scope

- Core types: `LogLevel`, `LogEntry`, `LogContext`, `LogLevelValue`, `shouldLog`
- Ports: `LoggerPort`, `LogHandlerPort`, `LogFormatterPort`
- Interfaces: `Logger`, `LogHandler`, `LogFormatter`
- Built-in adapters: NoOp, Console, Memory, Scoped
- Context: `LogContextVar`, `LogAnnotationsVar`, `mergeContext`, `extractContextFromHeaders`
- Utilities: `getFormatter`, `withRedaction`, `withSampling`
- Instrumentation: `instrumentContainer`, `createLoggingHook`
- Framework integration: Hono logging middleware, React LoggingProvider and hooks
- Tracing: span correlation, trace context injection
- Inspection: `LoggerInspector`, `LoggingSnapshot`, `LoggerInspectorEvent`, `LoggerInspectorPort`
- Testing: `MemoryLogger`, `assertLogEntry`, `LogEntryMatcher`
- Backend packages: `@hex-di/logger-pino`, `@hex-di/logger-winston`, `@hex-di/logger-bunyan`

## 2. Philosophy

### Structured by default

In most applications, logging starts as `console.log("something happened")` and evolves into a tangled mix of string interpolation, JSON.stringify calls, and inconsistent formats. Structured logging inverts this: every log entry is a typed data structure from the moment it is created. Formatting happens at the boundary, not at the call site.

```typescript
// Before: unstructured, inconsistent, unqueryable
console.log(`[INFO] User ${userId} logged in from ${ip}`);
console.log(`[ERROR] Failed to process order: ${error.message}`);
console.log(JSON.stringify({ event: "payment", amount: 99.99, currency: "USD" }));

// After: structured, consistent, machine-parseable
logger.info("User logged in", { userId, ip });
logger.error("Failed to process order", error);
logger.info("Payment processed", { amount: 99.99, currency: "USD" });
```

The structured approach means:

1. **Log entries are queryable** -- filter by level, search by annotation keys, correlate by context
2. **Format is decoupled from content** -- the same entry can be pretty-printed for development and JSON-serialized for production
3. **Context is automatic** -- correlationId, requestId, userId are attached by the logger, not manually interpolated
4. **Errors are first-class** -- the `error` field carries the full Error object, not just `.message`

### Zero overhead when disabled

Not every service needs logging. Not every environment needs every log level. The NoOp adapter ensures that when logging is disabled, the cost is exactly zero: no string formatting, no object allocation, no function calls beyond the no-op itself.

```typescript
// Production config with no logging
const graph = createGraphBuilder().provide(NoOpLoggerAdapter).build();
const logger = container.resolve(LoggerPort);

// These are all free -- NOOP_LOGGER is a frozen singleton
logger.info("This string is never formatted");
logger.debug("This object is never allocated", { heavy: computeExpensive() });
// NOTE: the annotation object IS allocated by the caller. Use isLevelEnabled()
// for truly zero-cost annotation construction.

if (logger.isLevelEnabled("debug")) {
  logger.debug("Expensive operation", { result: computeExpensive() });
}
```

### Backend agnostic

The core `@hex-di/logger` package has zero external runtime dependencies. It defines contracts (ports) and ships lightweight built-in adapters. Production backends are separate packages that bridge to real logging libraries:

```
Application Code
      |
      v
  LoggerPort (interface)
      |
      +--- NoOpLoggerAdapter (built-in, zero cost)
      +--- ConsoleLoggerAdapter (built-in, development)
      +--- MemoryLoggerAdapter (built-in, testing)
      |
      +--- LogHandlerPort (interface)
             |
             +--- PinoHandlerAdapter (@hex-di/logger-pino)
             +--- WinstonHandlerAdapter (@hex-di/logger-winston)
             +--- BunyanHandlerAdapter (@hex-di/logger-bunyan)
```

Switching from Pino to Winston is a one-line change in the graph builder. Application code never touches the backend.

### Context propagation, not threading

Log context (correlationId, requestId, userId) should not be threaded manually through every function call. Instead, context is established once (at the request boundary) and propagated automatically through child loggers and DI scope variables:

```typescript
// Middleware establishes context once
const requestLogger = logger.child({
  correlationId: req.headers["x-correlation-id"],
  requestId: generateId(),
});

// Every service in the request scope inherits context
requestLogger.info("Processing order");
// Output: { correlationId: "abc-123", requestId: "req-456", message: "Processing order" }
```

### Self-aware logging

Following HexDI's vision of self-aware applications, `@hex-di/logger` integrates with the container's nervous system:

- **Container instrumentation** automatically logs DI resolution events with timing
- **Tracing integration** correlates log entries with trace spans
- **Inspector integration** via `LoggerInspector` provides logging statistics (entry counts, error rates, handler info, sampling/redaction stats) across the dependency graph, contributing to the unified knowledge model

The application doesn't just log -- it knows about its own logging patterns.

## 3. Package Structure

```
packages/logger/
  src/
    ports/
      logger.ts              # Logger interface and LoggerPort definition
      log-handler.ts         # LogHandler interface and LogHandlerPort
      log-formatter.ts       # LogFormatter interface, LogFormatterPort, FormatterType
      index.ts
    types/
      log-level.ts           # LogLevel type, LogLevelValue, shouldLog
      log-entry.ts           # LogEntry, LogContext interfaces
      index.ts
    adapters/
      noop/
        adapter.ts           # NoOpLoggerAdapter
        logger.ts            # NOOP_LOGGER frozen singleton
        index.ts
      memory/
        adapter.ts           # MemoryLoggerAdapter
        logger.ts            # MemoryLogger class, createMemoryLogger
        index.ts
      console/
        adapter.ts           # ConsoleLoggerAdapter
        logger.ts            # ConsoleLogger class, createConsoleLogger
        index.ts
      index.ts
    context/
      variables.ts           # LogContextVar, LogAnnotationsVar
      index.ts
    inspection/
      inspector.ts           # LoggerInspector interface, createLoggerInspectorAdapter
      snapshot.ts            # LoggingSnapshot, HandlerInfo, supporting types
      events.ts              # LoggerInspectorEvent discriminated union
      inspector-port.ts      # LoggerInspectorPort definition
      container-integration.ts # Container inspector registry integration
      index.ts
    testing/
      assertions.ts          # assertLogEntry, LogEntryMatcher
      index.ts
    utils/
      context.ts             # mergeContext, extractContextFromHeaders, header constants
      formatting.ts          # getFormatter, JSON/pretty/minimal formatters
      globals.ts             # ConsoleLike, getConsole platform abstraction
      index.ts
    index.ts                 # Public API

packages/logger-pino/
  src/
    handler.ts               # PinoHandlerAdapter, createPinoHandler, PinoHandlerOptions
    level-map.ts             # mapLevel (hex-di LogLevel -> Pino level)
    index.ts

packages/logger-winston/
  src/
    handler.ts               # WinstonHandlerAdapter, createWinstonHandler, WinstonHandlerOptions
    index.ts

packages/logger-bunyan/
  src/
    handler.ts               # BunyanHandlerAdapter, createBunyanHandler, BunyanHandlerOptions
    level-map.ts             # mapLevel (hex-di LogLevel -> Bunyan level)
    index.ts
```

## 4. Architecture Diagram

```
+-----------------------------------------------------------------+
|                     Application Code                            |
|                                                                 |
|  const logger = container.resolve(LoggerPort);                  |
|  logger.info("Order processed", { orderId, amount });           |
|                                                                 |
|  const child = logger.child({ correlationId: "abc-123" });      |
|  child.warn("Slow query", { duration: 1500 });                 |
|                                                                 |
+------------------------------+----------------------------------+
                               |
                               v
+-----------------------------------------------------------------+
|                     @hex-di/logger                              |
|                                                                 |
|  +-----------------------------------------------------------+  |
|  |                    Logger (Port)                           |  |
|  |                                                           |  |
|  |  trace / debug / info / warn / error / fatal              |  |
|  |  child(context) -> Logger                                 |  |
|  |  withAnnotations(annotations) -> Logger                   |  |
|  |  isLevelEnabled(level) -> boolean                         |  |
|  |  time(name, fn) -> T                                      |  |
|  |  timeAsync(name, fn) -> Promise<T>                        |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
|  +----------------------------+  +---------------------------+  |
|  |     LogHandler (Port)      |  |   LogFormatter (Port)     |  |
|  |                            |  |                           |  |
|  |  handle(entry) -> void     |  |  format(entry) -> string  |  |
|  |  flush() -> Promise<void>  |  |                           |  |
|  |  shutdown() -> Promise     |  |  Types: json / pretty /   |  |
|  +----------------------------+  |          minimal           |  |
|                                  +---------------------------+  |
|                                                                 |
|  Built-in Adapters:                                             |
|  +--------+ +----------+ +---------+ +--------+                 |
|  | NoOp   | | Console  | | Memory  | | Scoped |                 |
|  | (zero  | | (pretty/ | | (test   | | (per-  |                 |
|  |  cost) | |  json)   | |  assert)| |  scope)|                 |
|  +--------+ +----------+ +---------+ +--------+                 |
|                                                                 |
|  Context Propagation:                                           |
|  +----------------------------+  +---------------------------+  |
|  |  LogContextVar             |  |  LogAnnotationsVar        |  |
|  |  (correlationId, userId,   |  |  (persistent key/value    |  |
|  |   requestId, scopeId, ...) |  |   pairs per scope)        |  |
|  +----------------------------+  +---------------------------+  |
|                                                                 |
|  Inspection:                                                    |
|  +-----------------------------------------------------------+  |
|  |  LoggerInspector                                          |  |
|  |  getSnapshot / getEntryCounts / getErrorRate              |  |
|  |  getHandlerInfo / getSamplingStatistics                    |  |
|  |  subscribe(listener) -> unsubscribe                       |  |
|  +-----------------------------------------------------------+  |
|                                                                 |
+-----------------------------------------------------------------+
                               |
               +---------------+----------------+
               |               |                |
               v               v                v
+-------------+  +-------------+  +-------------+
| @hex-di/    |  | @hex-di/    |  | @hex-di/    |
| logger-     |  | logger-     |  | logger-     |
| pino        |  | winston     |  | bunyan      |
|             |  |             |  |             |
| PinoHandler |  | Winston     |  | Bunyan      |
| Adapter     |  | Handler     |  | Handler     |
|             |  | Adapter     |  | Adapter     |
+-------------+  +-------------+  +-------------+
```

### Dependency Graph

```
            @hex-di/logger  (zero external deps)
                    |
       +------------+------------+-----------+
       |            |            |           |
       v            v            v           v
  @hex-di/     @hex-di/    @hex-di/    @hex-di/
  logger-      logger-     logger-      core
  pino         winston     bunyan
  (pino)       (winston)   (bunyan)
```

`@hex-di/logger` has **zero external runtime dependencies**. It depends only on `@hex-di/core` as a peer dependency for port/adapter primitives. The backend packages each depend on their respective logging library and `@hex-di/logger` as a peer.

### Package Dependencies

| Package                  | Dependencies | Peer Dependencies                |
| ------------------------ | ------------ | -------------------------------- |
| `@hex-di/logger`         | none         | `@hex-di/core`                   |
| `@hex-di/logger-pino`    | `pino`       | `@hex-di/core`, `@hex-di/logger` |
| `@hex-di/logger-winston` | `winston`    | `@hex-di/core`, `@hex-di/logger` |
| `@hex-di/logger-bunyan`  | `bunyan`     | `@hex-di/core`, `@hex-di/logger` |

---

_Next: [02 - Core Concepts](./02-core-concepts.md)_
