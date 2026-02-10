# 15 - API Reference

_Previous: [14 - Testing](./14-testing.md)_

---

## 55. Core Types

| Type            | Definition                                                                                              | Description                  |
| --------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `LogLevel`      | `"trace" \| "debug" \| "info" \| "warn" \| "error" \| "fatal"`                                          | Log severity level           |
| `LogEntry`      | `{ level, message, timestamp, context, annotations, error?, spans? }`                                   | Structured log event         |
| `LogContext`    | `{ correlationId?, requestId?, userId?, sessionId?, scopeId?, service?, environment?, [key]: unknown }` | Request-scoped metadata      |
| `FormatterType` | `"json" \| "pretty" \| "minimal"`                                                                       | Built-in formatter type name |

### Constants

| Constant                | Type                                 | Value                                                                |
| ----------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| `LogLevelValue`         | `Readonly<Record<LogLevel, number>>` | `{ trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 }` |
| `CORRELATION_ID_HEADER` | `string`                             | `"x-correlation-id"`                                                 |
| `REQUEST_ID_HEADER`     | `string`                             | `"x-request-id"`                                                     |

### Functions

| Function    | Signature                                          | Description                   |
| ----------- | -------------------------------------------------- | ----------------------------- |
| `shouldLog` | `(level: LogLevel, minLevel: LogLevel) => boolean` | Compare level against minimum |

## 56. Ports

| Port               | Interface      | Name             | Direction  | Category         |
| ------------------ | -------------- | ---------------- | ---------- | ---------------- |
| `LoggerPort`       | `Logger`       | `"Logger"`       | `outbound` | `infrastructure` |
| `LogHandlerPort`   | `LogHandler`   | `"LogHandler"`   | `outbound` | `infrastructure` |
| `LogFormatterPort` | `LogFormatter` | `"LogFormatter"` | `outbound` | `infrastructure` |

All ports have tags: `["logging", "observability"]`.

## 57. Logger Methods

### Level Methods

| Method  | Signature                                                                        | Description                 |
| ------- | -------------------------------------------------------------------------------- | --------------------------- |
| `trace` | `(message: string, annotations?: Record<string, unknown>) => void`               | Log at trace level          |
| `debug` | `(message: string, annotations?: Record<string, unknown>) => void`               | Log at debug level          |
| `info`  | `(message: string, annotations?: Record<string, unknown>) => void`               | Log at info level           |
| `warn`  | `(message: string, annotations?: Record<string, unknown>) => void`               | Log at warn level           |
| `error` | `(message: string, annotations?: Record<string, unknown>) => void`               | Log at error level          |
| `error` | `(message: string, error: Error, annotations?: Record<string, unknown>) => void` | Log error with Error object |
| `fatal` | `(message: string, annotations?: Record<string, unknown>) => void`               | Log at fatal level          |
| `fatal` | `(message: string, error: Error, annotations?: Record<string, unknown>) => void` | Log fatal with Error object |

### Context & Annotation Methods

| Method            | Signature                                          | Description                              |
| ----------------- | -------------------------------------------------- | ---------------------------------------- |
| `child`           | `(context: Partial<LogContext>) => Logger`         | Create child logger with merged context  |
| `withAnnotations` | `(annotations: Record<string, unknown>) => Logger` | Create child with persistent annotations |
| `getContext`      | `() => LogContext`                                 | Get current merged context               |
| `isLevelEnabled`  | `(level: LogLevel) => boolean`                     | Check if level passes minimum threshold  |

### Timing Methods

| Method      | Signature                                               | Description                        |
| ----------- | ------------------------------------------------------- | ---------------------------------- |
| `time`      | `<T>(name: string, fn: () => T) => T`                   | Time sync operation, log duration  |
| `timeAsync` | `<T>(name: string, fn: () => Promise<T>) => Promise<T>` | Time async operation, log duration |

## 58. Handler & Formatter

### LogHandler

| Method     | Signature                   | Description            |
| ---------- | --------------------------- | ---------------------- |
| `handle`   | `(entry: LogEntry) => void` | Process a log entry    |
| `flush`    | `() => Promise<void>`       | Flush buffered entries |
| `shutdown` | `() => Promise<void>`       | Release resources      |

### LogFormatter

| Method   | Signature                     | Description             |
| -------- | ----------------------------- | ----------------------- |
| `format` | `(entry: LogEntry) => string` | Convert entry to string |

### Formatter Factory

| Function       | Signature                               | Description            |
| -------------- | --------------------------------------- | ---------------------- |
| `getFormatter` | `(type: FormatterType) => LogFormatter` | Get built-in formatter |

## 59. Built-in Adapters

| Adapter                | Provides     | Requires         | Lifetime    | Factory output |
| ---------------------- | ------------ | ---------------- | ----------- | -------------- |
| `NoOpLoggerAdapter`    | `LoggerPort` | none             | `singleton` | `NOOP_LOGGER`  |
| `ConsoleLoggerAdapter` | `LoggerPort` | none             | `singleton` | ConsoleLogger  |
| `MemoryLoggerAdapter`  | `LoggerPort` | none             | `transient` | MemoryLogger   |
| `ScopedLoggerAdapter`  | `LoggerPort` | `LogHandlerPort` | `scoped`    | Scoped Logger  |

### Standalone Factories

| Function              | Signature                                    | Returns       |
| --------------------- | -------------------------------------------- | ------------- |
| `createMemoryLogger`  | `(minLevel?: LogLevel) => MemoryLogger`      | MemoryLogger  |
| `createConsoleLogger` | `(options?: ConsoleLoggerOptions) => Logger` | ConsoleLogger |

### Exported Singletons

| Export        | Type     | Description                   |
| ------------- | -------- | ----------------------------- |
| `NOOP_LOGGER` | `Logger` | Frozen no-op logger singleton |

## 60. Backend Adapters

### @hex-di/logger-pino

| Export               | Type                                           | Description                 |
| -------------------- | ---------------------------------------------- | --------------------------- |
| `PinoHandlerAdapter` | Adapter (LogHandlerPort)                       | DI adapter for Pino handler |
| `createPinoHandler`  | `(options?: PinoHandlerOptions) => LogHandler` | Factory function            |
| `PinoHandlerOptions` | Interface                                      | Pino configuration          |
| `mapLevel`           | `(level: LogLevel) => PinoLevel`               | Level mapping function      |

### @hex-di/logger-winston

| Export                  | Type                                              | Description                    |
| ----------------------- | ------------------------------------------------- | ------------------------------ |
| `WinstonHandlerAdapter` | Adapter (LogHandlerPort)                          | DI adapter for Winston handler |
| `createWinstonHandler`  | `(options?: WinstonHandlerOptions) => LogHandler` | Factory function               |
| `WinstonHandlerOptions` | Interface                                         | Winston configuration          |

### @hex-di/logger-bunyan

| Export                 | Type                                            | Description                   |
| ---------------------- | ----------------------------------------------- | ----------------------------- |
| `BunyanHandlerAdapter` | Adapter (LogHandlerPort)                        | DI adapter for Bunyan handler |
| `createBunyanHandler`  | `(options: BunyanHandlerOptions) => LogHandler` | Factory function              |
| `BunyanHandlerOptions` | Interface                                       | Bunyan configuration          |
| `mapLevel`             | `(level: LogLevel) => BunyanLevel`              | Level mapping function        |

## 61. Context & Utilities

### Context Variables

| Export              | Type                                       | Default | Description                 |
| ------------------- | ------------------------------------------ | ------- | --------------------------- |
| `LogContextVar`     | `ContextVariable<LogContext>`              | `{}`    | Log context propagation     |
| `LogAnnotationsVar` | `ContextVariable<Record<string, unknown>>` | `{}`    | Log annotations propagation |

### Context Functions

| Function                    | Signature                                                               | Description                  |
| --------------------------- | ----------------------------------------------------------------------- | ---------------------------- |
| `mergeContext`              | `(base: LogContext, override: Partial<LogContext>) => LogContext`       | Merge two contexts           |
| `extractContextFromHeaders` | `(headers: Record<string, string \| undefined>) => Partial<LogContext>` | Extract context from headers |

### Redaction

| Function        | Signature                                             | Description                |
| --------------- | ----------------------------------------------------- | -------------------------- |
| `withRedaction` | `(logger: Logger, config: RedactionConfig) => Logger` | Wrap logger with redaction |

### Sampling

| Function       | Signature                                            | Description               |
| -------------- | ---------------------------------------------------- | ------------------------- |
| `withSampling` | `(logger: Logger, config: SamplingConfig) => Logger` | Wrap logger with sampling |

### Rate Limiting

| Function        | Signature                                             | Description                    |
| --------------- | ----------------------------------------------------- | ------------------------------ |
| `withRateLimit` | `(logger: Logger, config: RateLimitConfig) => Logger` | Wrap logger with rate limiting |

### Instrumentation

| Function              | Signature                                                                        | Description                    |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------ |
| `instrumentContainer` | `(container: Container, logger: Logger, options?: AutoLogOptions) => () => void` | Auto-log DI resolutions        |
| `createLoggingHook`   | `(logger: Logger, options?: AutoLogOptions) => ResolutionHook`                   | Create resolution logging hook |

## 62. Testing API

### MemoryLogger (extends Logger)

| Method              | Signature                                                            | Description               |
| ------------------- | -------------------------------------------------------------------- | ------------------------- |
| `getEntries`        | `() => ReadonlyArray<LogEntry>`                                      | Get all collected entries |
| `getEntriesByLevel` | `(level: LogLevel) => ReadonlyArray<LogEntry>`                       | Get entries by level      |
| `clear`             | `() => void`                                                         | Clear all entries         |
| `findEntry`         | `(predicate: (entry: LogEntry) => boolean) => LogEntry \| undefined` | Find entry by predicate   |

### Assertion Functions

| Function         | Signature                                                                  | Description                  |
| ---------------- | -------------------------------------------------------------------------- | ---------------------------- |
| `assertLogEntry` | `(entries: ReadonlyArray<LogEntry>, matcher: LogEntryMatcher) => LogEntry` | Find matching entry or throw |

### LogEntryMatcher

| Field         | Type                      | Optional | Matching logic                     |
| ------------- | ------------------------- | -------- | ---------------------------------- |
| `level`       | `LogLevel`                | Yes      | Exact match                        |
| `message`     | `string \| RegExp`        | Yes      | Exact or regex match               |
| `annotations` | `Record<string, unknown>` | Yes      | Subset match (all keys must exist) |
| `context`     | `Partial<LogContext>`     | Yes      | Subset match (all keys must exist) |
| `hasError`    | `boolean`                 | Yes      | Presence check on error field      |

## 63. Inspection API

### LoggerInspector

| Method / Property        | Signature                                                 | Description                          |
| ------------------------ | --------------------------------------------------------- | ------------------------------------ |
| `libraryName`            | `readonly "logging"`                                      | Library identifier for unified model |
| `getSnapshot`            | `() => LoggingSnapshot`                                   | Get current logging state snapshot   |
| `getEntryCounts`         | `() => Readonly<Record<LogLevel, number>>`                | Cumulative entry counts per level    |
| `getErrorRate`           | `(options?: TimeWindowOptions) => number`                 | Error+fatal rate in sliding window   |
| `getHandlerInfo`         | `() => readonly HandlerInfo[]`                            | Handler chain metadata               |
| `getSamplingStatistics`  | `() => SamplingStatistics`                                | Sampling accepted/dropped per level  |
| `getRedactionStatistics` | `() => RedactionStatistics`                               | Redaction field frequency            |
| `getRecentEntries`       | `(options?: RecentEntriesOptions) => readonly LogEntry[]` | Recent entries (Memory adapter only) |
| `getContextUsage`        | `() => ContextUsageStatistics`                            | Context variable usage statistics    |
| `subscribe`              | `(listener: LoggerInspectorListener) => () => void`       | Subscribe to inspector events        |

### LoggingSnapshot

| Field             | Type                                 | Description                    |
| ----------------- | ------------------------------------ | ------------------------------ |
| `timestamp`       | `number`                             | Snapshot creation time         |
| `totalEntries`    | `number`                             | Total entries logged           |
| `entriesByLevel`  | `Readonly<Record<LogLevel, number>>` | Entry counts per level         |
| `errorRate`       | `number`                             | Current error rate (0-1)       |
| `handlers`        | `readonly HandlerInfo[]`             | Active handler chain           |
| `samplingActive`  | `boolean`                            | Whether sampling is enabled    |
| `redactionActive` | `boolean`                            | Whether redaction is enabled   |
| `contextDepth`    | `number`                             | Max child logger nesting depth |

### LoggerInspectorEvent Variants

| Type                   | Fields                               | Trigger                        |
| ---------------------- | ------------------------------------ | ------------------------------ |
| `entry-logged`         | `level`, `message`, `timestamp`      | Every log call                 |
| `error-rate-threshold` | `errorRate`, `threshold`, `windowMs` | Error rate exceeds threshold   |
| `handler-error`        | `handlerName`, `error`               | Handler throws during `handle` |
| `sampling-dropped`     | `level`, `dropCount`                 | Sampling drops an entry        |
| `redaction-applied`    | `fieldPath`, `count`                 | Redaction applied to entry     |
| `handler-added`        | `handler`                            | Handler added to chain         |
| `handler-removed`      | `handlerName`                        | Handler removed from chain     |
| `snapshot-changed`     | (none)                               | Any state change               |

### LoggerInspectorPort

| Property    | Value                                        |
| ----------- | -------------------------------------------- |
| `name`      | `"LoggerInspector"`                          |
| `interface` | `LoggerInspector`                            |
| `direction` | `outbound`                                   |
| `category`  | `infrastructure`                             |
| `tags`      | `["logging", "observability", "inspection"]` |

---

_Previous: [14 - Testing](./14-testing.md) | Next: [16 - Appendices](./16-appendices.md)_
