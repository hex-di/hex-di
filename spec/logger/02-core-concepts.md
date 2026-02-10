# 02 - Core Concepts

_Previous: [01 - Overview & Philosophy](./01-overview.md)_

---

## 5. Structured Logging Principles

Structured logging treats log entries as data, not strings. Every entry has a defined shape (`LogEntry`) with typed fields for level, message, timestamp, context, annotations, and optional error/span references. Formatting is deferred to the output boundary.

### Why structured

| Concern             | Unstructured (`console.log`)       | Structured (`@hex-di/logger`)              |
| ------------------- | ---------------------------------- | ------------------------------------------ |
| **Queryability**    | Regex on free-form strings         | Filter by field: `entry.level === "error"` |
| **Consistency**     | Format varies per developer        | Every entry has the same shape             |
| **Machine parsing** | Fragile string parsing             | Direct JSON serialization                  |
| **Context**         | Manual string interpolation        | Automatic via child loggers                |
| **Error handling**  | `error.message` string in template | Full `Error` object in `.error` field      |
| **Aggregation**     | Text search across log files       | Structured queries in log aggregators      |

### Data flow

```
  Call site               Logger                Handler              Output
  --------               ------                -------              ------
  logger.info(           Build LogEntry:       handler.handle(      Backend writes:
    "msg",               { level, message,       entry              stdout, file,
    { key: val }           timestamp,          )                    remote service
  )                        context,                                 ...
                           annotations,
                           error?, spans? }
```

The call site provides only the message and optional annotations. The Logger implementation enriches the entry with timestamp, merged context, and base annotations. The Handler receives the complete `LogEntry` and routes it to the output. The Formatter (if used) converts the entry to a string for text-based outputs.

### Separation of concerns

1. **Logger** -- call-site API: level methods, child loggers, annotations, timing
2. **LogHandler** -- output routing: receives structured entries, writes to backends
3. **LogFormatter** -- string conversion: transforms entries to text for console/file output
4. **Context** -- propagation: carries correlationId, requestId, userId through the scope

Each concern is a separate port. Implementations can be mixed and matched independently.

## 6. Log Levels and Severity

`@hex-di/logger` defines six log levels ordered by increasing severity:

| Level   | Numeric Value | Purpose                                                                               |
| ------- | ------------- | ------------------------------------------------------------------------------------- |
| `trace` | 10            | Finest granularity. Function entry/exit, variable values. Off in production.          |
| `debug` | 20            | Diagnostic detail. Request processing steps, cache hits/misses. Off in production.    |
| `info`  | 30            | Notable events. Application started, request completed, order processed. Always on.   |
| `warn`  | 40            | Recoverable issues. Deprecated API used, slow query, retry attempted. Always on.      |
| `error` | 50            | Operation failed. Request failed, database error, external service down. Always on.   |
| `fatal` | 60            | Application cannot continue. Unrecoverable state, missing critical config. Always on. |

### Level comparison

Log levels are compared numerically. A logger configured with `minLevel: "info"` (30) will log entries at `info` (30), `warn` (40), `error` (50), and `fatal` (60), but suppress `trace` (10) and `debug` (20).

```typescript
import { shouldLog, LogLevelValue } from "@hex-di/logger";

shouldLog("info", "debug"); // true:  30 >= 20
shouldLog("debug", "info"); // false: 20 < 30
shouldLog("error", "error"); // true:  50 >= 50
shouldLog("trace", "info"); // false: 10 < 30
```

### Level selection guidelines

```
Production:  info  ─────────────────────────────────────>  fatal
             [info] [warn] [error] [fatal]

Staging:     debug ─────────────────────────────────────>  fatal
             [debug] [info] [warn] [error] [fatal]

Development: trace ─────────────────────────────────────>  fatal
             [trace] [debug] [info] [warn] [error] [fatal]

Testing:     trace (collect all, assert on specific entries)
```

### error and fatal overloads

The `error` and `fatal` methods have an additional overload that accepts an `Error` object as the second argument:

```typescript
// Standard: message + optional annotations
logger.error("Request failed", { requestId: "abc" });

// With Error object: message + Error + optional annotations
logger.error("Request failed", new Error("connection refused"), { requestId: "abc" });
```

This dual signature ensures errors are carried as structured data (in `LogEntry.error`), not flattened into the message string. The implementation disambiguates by checking `instanceof Error` on the second argument.

## 7. OpenTelemetry Alignment

`@hex-di/logger` aligns with the [OpenTelemetry Log Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/) for interoperability with observability platforms.

### Severity number mapping

| hex-di Level | OTel Severity Number Range | OTel Severity Text |
| ------------ | -------------------------- | ------------------ |
| `trace`      | 1-4                        | TRACE / TRACE2-4   |
| `debug`      | 5-8                        | DEBUG / DEBUG2-4   |
| `info`       | 9-12                       | INFO / INFO2-4     |
| `warn`       | 13-16                      | WARN / WARN2-4     |
| `error`      | 17-20                      | ERROR / ERROR2-4   |
| `fatal`      | 21-24                      | FATAL / FATAL2-4   |

The internal numeric values (10, 20, 30, 40, 50, 60) are chosen for comparison efficiency and do not correspond to OTel severity numbers. When exporting to OTel-compatible backends, the mapping is applied at the handler level.

### LogEntry to OTel LogRecord mapping

| LogEntry field     | OTel LogRecord field     | Notes                            |
| ------------------ | ------------------------ | -------------------------------- |
| `level`            | `SeverityText`           | Uppercase: "INFO", "ERROR"       |
| `level`            | `SeverityNumber`         | Mapped via table above           |
| `message`          | `Body`                   | String body                      |
| `timestamp`        | `Timestamp`              | Unix milliseconds -> nanoseconds |
| `context`          | `Attributes`             | Merged as resource attributes    |
| `annotations`      | `Attributes`             | Merged as log attributes         |
| `error`            | `Attributes.exception.*` | OTel semantic convention         |
| `spans[0].traceId` | `TraceId`                | Trace correlation                |
| `spans[0].spanId`  | `SpanId`                 | Span correlation                 |

### Why alignment matters

1. **Export compatibility** -- log entries can be exported to Jaeger, Grafana Loki, Datadog, or any OTel-compatible backend without transformation
2. **Trace correlation** -- trace/span IDs in log entries enable log-to-trace navigation in observability UIs
3. **Unified schema** -- applications that use both `@hex-di/tracing` and `@hex-di/logger` share the same observability model

## 8. Structured Entries vs Formatted Strings

A critical design decision: the Logger builds `LogEntry` objects and passes them to handlers. Formatting to strings happens only at the output boundary, if at all.

### The LogEntry flow

```
logger.info("User created", { userId: "123" })
                    |
                    v
          +------------------+
          |    LogEntry       |
          | level: "info"     |
          | message: "User    |
          |   created"        |
          | timestamp: 170... |
          | context: {        |
          |   correlationId:  |
          |   "abc-123"       |
          | }                 |
          | annotations: {    |
          |   userId: "123"   |
          | }                 |
          +------------------+
                    |
          +---------+---------+
          |                   |
          v                   v
  +---------------+   +---------------+
  | JSON Handler  |   | Console       |
  | (production)  |   | Handler (dev) |
  |               |   |               |
  | {"level":     |   | 2026-02-08T...|
  |  "info",...}  |   | [ INFO] User  |
  +---------------+   |  created ...  |
                      +---------------+
```

### Benefits of late formatting

1. **Handler flexibility** -- the JSON handler never calls a formatter, it serializes the entry directly. The console handler uses a pretty formatter. Same entry, different outputs.
2. **Performance** -- if a handler batches entries, formatting can happen in a worker thread or at flush time
3. **Redaction** -- sensitive data can be redacted from the `LogEntry` before formatting, ensuring no formatter accidentally leaks raw values
4. **Testing** -- the `MemoryLogger` stores raw `LogEntry` objects for assertion. No string parsing needed.
5. **Aggregation** -- log aggregators (Loki, Elasticsearch) work with structured data. Formatting to strings would lose the structure.

### When formatting happens

| Adapter | Formatting                    | When                      |
| ------- | ----------------------------- | ------------------------- |
| NoOp    | Never                         | N/A (no-op)               |
| Memory  | Never                         | Entries stored as objects |
| Console | `LogFormatter.format(entry)`  | At handle() time          |
| Pino    | Pino internal serialization   | At pino[level]() call     |
| Winston | Winston format pipeline       | At logger.log() call      |
| Bunyan  | Bunyan internal serialization | At logger[level]() call   |

The built-in `Console` adapter is the only one that uses `LogFormatter` directly. Backend adapters delegate formatting to their underlying library.

---

_Previous: [01 - Overview & Philosophy](./01-overview.md) | Next: [03 - Log Types](./03-log-types.md)_
