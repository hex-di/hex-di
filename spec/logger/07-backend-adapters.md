# 07 - Backend Adapters

_Previous: [06 - Built-in Adapters](./06-built-in-adapters.md)_

---

## 27. @hex-di/logger-pino

Pino is the fastest Node.js JSON logger. The `@hex-di/logger-pino` package bridges `@hex-di/logger`'s `LogHandler` port to a Pino logger instance.

### Package structure

```
packages/logger-pino/
  src/
    handler.ts       # PinoHandlerAdapter, createPinoHandler
    level-map.ts     # mapLevel utility
    index.ts         # Public API
```

### PinoHandlerOptions

```typescript
interface PinoHandlerOptions {
  /** Pino log level (default: "trace"). */
  readonly level?: string;
  /** Base object merged into every log entry. */
  readonly base?: Record<string, unknown>;
  /** Pino transport configuration (e.g., pino-pretty). */
  readonly transport?: pino.TransportSingleOptions;
}
```

### Handler implementation

```typescript
function createPinoHandler(options?: PinoHandlerOptions): LogHandler;
```

The handler creates a Pino logger instance and maps `LogEntry` fields to Pino conventions:

| LogEntry field       | Pino convention          | Notes                        |
| -------------------- | ------------------------ | ---------------------------- |
| `level`              | Pino method name         | Direct mapping (same names)  |
| `message`            | Second arg to level call | `pino.info(fields, message)` |
| `context` fields     | Merged into first arg    | Top-level object fields      |
| `annotations` fields | Merged into first arg    | Top-level object fields      |
| `error`              | `err` field              | Pino convention for errors   |
| `spans[0].traceId`   | `traceId` field          | Top-level field              |
| `spans[0].spanId`    | `spanId` field           | Top-level field              |

### Adapter definition

```typescript
const PinoHandlerAdapter = createAdapter({
  provides: LogHandlerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createPinoHandler(),
});
```

### Usage

```typescript
import { PinoHandlerAdapter, createPinoHandler } from "@hex-di/logger-pino";
import { ScopedLoggerAdapter, LoggerPort } from "@hex-di/logger";

// Option 1: Default configuration via adapter
const graph = createGraphBuilder().provide(PinoHandlerAdapter).provide(ScopedLoggerAdapter).build();

// Option 2: Custom configuration via factory
const customHandler = createPinoHandler({
  level: "info",
  base: { service: "order-service", env: "production" },
  transport: { target: "pino-pretty" },
});
```

### Flush and shutdown

Pino auto-flushes synchronously. The `flush()` method calls `pino.flush()` and resolves immediately. The `shutdown()` method also calls `pino.flush()` and resolves.

## 28. @hex-di/logger-winston

Winston is the most popular Node.js logging library, known for its transport system and format pipeline.

### Package structure

```
packages/logger-winston/
  src/
    handler.ts       # WinstonHandlerAdapter, createWinstonHandler
    index.ts         # Public API
```

### WinstonHandlerOptions

```typescript
interface WinstonHandlerOptions {
  /** Winston log level (default: "trace"). */
  readonly level?: string;
  /** Winston format (default: winston.format.json()). */
  readonly format?: winston.Logform.Format;
  /** Winston transports (default: [new Console()]). */
  readonly transports?: winston.transport[];
  /** Default metadata merged into every log entry. */
  readonly defaultMeta?: Record<string, unknown>;
}
```

### Level mapping

Winston uses syslog-style levels where lower numbers mean higher severity. The adapter registers custom levels matching hex-di:

```typescript
const WINSTON_LEVELS: Record<string, number> = {
  fatal: 0, // highest severity
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5, // lowest severity
};
```

This ensures Winston recognizes `trace` and `fatal` which are not in Winston's default level set.

### Handler implementation

```typescript
function createWinstonHandler(options?: WinstonHandlerOptions): LogHandler;
```

| LogEntry field       | Winston convention | Notes                            |
| -------------------- | ------------------ | -------------------------------- |
| `level`              | `level` field      | Direct string mapping            |
| `message`            | `message` field    | Winston standard field           |
| `context` fields     | Spread into meta   | Top-level metadata               |
| `annotations` fields | Spread into meta   | Top-level metadata               |
| `error`              | `error` object     | Serialized: name, message, stack |
| `spans[0].traceId`   | `traceId` field    | Top-level metadata               |
| `spans[0].spanId`    | `spanId` field     | Top-level metadata               |
| `timestamp`          | `timestamp` field  | Unix ms from LogEntry            |

### Adapter definition

```typescript
const WinstonHandlerAdapter = createAdapter({
  provides: LogHandlerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createWinstonHandler(),
});
```

### Flush and shutdown

Winston's `flush()` ends the logger and waits for the `finish` event. `shutdown()` calls `logger.close()` which closes all transports.

## 29. @hex-di/logger-bunyan

Bunyan is a structured JSON logging library for Node.js with native support for serializers and child loggers.

### Package structure

```
packages/logger-bunyan/
  src/
    handler.ts       # BunyanHandlerAdapter, createBunyanHandler
    level-map.ts     # mapLevel utility
    index.ts         # Public API
```

### BunyanHandlerOptions

```typescript
interface BunyanHandlerOptions {
  /** Logger name (required by Bunyan). */
  readonly name: string;
  /** Bunyan log level. */
  readonly level?: bunyan.LogLevel;
  /** Output streams. */
  readonly streams?: bunyan.Stream[];
  /** Custom serializers. */
  readonly serializers?: bunyan.Serializers;
}
```

### Handler implementation

```typescript
function createBunyanHandler(options: BunyanHandlerOptions): LogHandler;
```

| LogEntry field       | Bunyan convention        | Notes                        |
| -------------------- | ------------------------ | ---------------------------- |
| `level`              | Bunyan method name       | Direct mapping (same names)  |
| `message`            | Second arg to level call | `bunyan.info(fields, msg)`   |
| `context` fields     | Merged into first arg    | Top-level object fields      |
| `annotations` fields | Merged into first arg    | Top-level object fields      |
| `error`              | `err` field              | Bunyan convention for errors |
| `spans[0].traceId`   | `traceId` field          | Top-level field              |
| `spans[0].spanId`    | `spanId` field           | Top-level field              |

### Adapter definition

```typescript
const BunyanHandlerAdapter = createAdapter({
  provides: LogHandlerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createBunyanHandler({ name: "app" }),
});
```

### Flush and shutdown

Bunyan auto-flushes. Both `flush()` and `shutdown()` resolve immediately.

## 30. Level Mapping

### Pino level mapping

Pino uses the same level names as `@hex-di/logger`. The mapping is a direct passthrough:

```typescript
type PinoLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

function mapLevel(level: LogLevel): PinoLevel {
  return level; // Names are identical
}
```

### Winston level mapping

Winston uses numeric levels where lower = more severe. The adapter registers custom levels so Winston recognizes all six hex-di levels:

| hex-di Level | Winston Numeric | Winston recognizes by default? |
| ------------ | --------------- | ------------------------------ |
| `fatal`      | 0               | No (custom)                    |
| `error`      | 1               | Yes                            |
| `warn`       | 2               | Yes                            |
| `info`       | 3               | Yes                            |
| `debug`      | 4               | Yes                            |
| `trace`      | 5               | No (custom)                    |

### Bunyan level mapping

Bunyan uses the same level names as hex-di. The mapping is a direct passthrough:

```typescript
type BunyanLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

function mapLevel(level: LogLevel): BunyanLevel {
  return level; // Names are identical
}
```

### Cross-backend consistency

Because all three backends receive the same `LogEntry`, switching between Pino, Winston, and Bunyan requires only changing the registered adapter. The application code is unchanged.

```typescript
// Development: Pino with pretty-print
const graph = createGraphBuilder().provide(PinoHandlerAdapter).provide(ScopedLoggerAdapter).build();

// Switch to Winston for production:
const graph = createGraphBuilder()
  .provide(WinstonHandlerAdapter)
  .provide(ScopedLoggerAdapter)
  .build();

// Application code unchanged:
const logger = container.resolve(LoggerPort);
logger.info("This works with any backend");
```

---

_Previous: [06 - Built-in Adapters](./06-built-in-adapters.md) | Next: [08 - Context Propagation](./08-context-propagation.md)_
