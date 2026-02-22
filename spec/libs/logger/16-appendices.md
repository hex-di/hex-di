# 16 - Appendices

_Previous: [15 - API Reference](./15-api-reference.md)_

---

## Appendix A: Level Mapping Tables

### Internal numeric values

| LogLevel | Numeric Value | Spacing |
| -------- | ------------- | ------- |
| `trace`  | 10            | Base    |
| `debug`  | 20            | +10     |
| `info`   | 30            | +10     |
| `warn`   | 40            | +10     |
| `error`  | 50            | +10     |
| `fatal`  | 60            | +10     |

Values are spaced by 10 to allow future insertion of intermediate levels (e.g., `verbose: 15`) without breaking existing comparisons. This is a convention, not a guarantee -- no public API depends on the specific numeric values.

### Cross-library level names

| hex-di  | Pino    | Winston  | Bunyan  | console | syslog    |
| ------- | ------- | -------- | ------- | ------- | --------- |
| `trace` | `trace` | (custom) | `trace` | `debug` | N/A       |
| `debug` | `debug` | `debug`  | `debug` | `debug` | `debug`   |
| `info`  | `info`  | `info`   | `info`  | `info`  | `info`    |
| `warn`  | `warn`  | `warn`   | `warn`  | `warn`  | `warning` |
| `error` | `error` | `error`  | `error` | `error` | `err`     |
| `fatal` | `fatal` | (custom) | `fatal` | `error` | `crit`    |

Notes:

- Winston does not have `trace` or `fatal` by default. The adapter registers custom levels.
- The `console` API maps both `trace` and `debug` to `console.debug`, and `fatal` to `console.error`.
- Syslog level names differ but the severity ordering is equivalent.

## Appendix B: OpenTelemetry Severity Alignment

### Full OTel severity table

| hex-di Level | OTel Severity Number | OTel Severity Text | Notes                     |
| ------------ | -------------------- | ------------------ | ------------------------- |
| `trace`      | 1                    | TRACE              | Finest granularity        |
| `trace`      | 2                    | TRACE2             | Sub-level (unused)        |
| `trace`      | 3                    | TRACE3             | Sub-level (unused)        |
| `trace`      | 4                    | TRACE4             | Sub-level (unused)        |
| `debug`      | 5                    | DEBUG              | Diagnostic information    |
| `debug`      | 6                    | DEBUG2             | Sub-level (unused)        |
| `debug`      | 7                    | DEBUG3             | Sub-level (unused)        |
| `debug`      | 8                    | DEBUG4             | Sub-level (unused)        |
| `info`       | 9                    | INFO               | Notable events            |
| `info`       | 10                   | INFO2              | Sub-level (unused)        |
| `info`       | 11                   | INFO3              | Sub-level (unused)        |
| `info`       | 12                   | INFO4              | Sub-level (unused)        |
| `warn`       | 13                   | WARN               | Recoverable issues        |
| `warn`       | 14                   | WARN2              | Sub-level (unused)        |
| `warn`       | 15                   | WARN3              | Sub-level (unused)        |
| `warn`       | 16                   | WARN4              | Sub-level (unused)        |
| `error`      | 17                   | ERROR              | Operation failed          |
| `error`      | 18                   | ERROR2             | Sub-level (unused)        |
| `error`      | 19                   | ERROR3             | Sub-level (unused)        |
| `error`      | 20                   | ERROR4             | Sub-level (unused)        |
| `fatal`      | 21                   | FATAL              | Application unrecoverable |
| `fatal`      | 22                   | FATAL2             | Sub-level (unused)        |
| `fatal`      | 23                   | FATAL3             | Sub-level (unused)        |
| `fatal`      | 24                   | FATAL4             | Sub-level (unused)        |

hex-di maps each level to the base severity number in its range (1, 5, 9, 13, 17, 21). Sub-levels are reserved for future use.

### OTel export mapping function

```typescript
function toOtelSeverityNumber(level: LogLevel): number {
  switch (level) {
    case "trace":
      return 1;
    case "debug":
      return 5;
    case "info":
      return 9;
    case "warn":
      return 13;
    case "error":
      return 17;
    case "fatal":
      return 21;
  }
}

function toOtelSeverityText(level: LogLevel): string {
  return level.toUpperCase();
}
```

## Appendix C: Performance Characteristics

### Adapter overhead comparison

| Adapter | Level check | Entry construction | Output                     | Total overhead |
| ------- | ----------- | ------------------ | -------------------------- | -------------- |
| NoOp    | N/A (no-op) | None               | None                       | ~0 ns          |
| Memory  | ~5 ns       | ~50 ns             | Array push (~10 ns)        | ~65 ns         |
| Console | ~5 ns       | ~50 ns             | Format + console (~500 ns) | ~555 ns        |
| Pino    | ~5 ns       | ~50 ns             | Pino serialize (~200 ns)   | ~255 ns        |
| Winston | ~5 ns       | ~50 ns             | Winston format (~1 us)     | ~1.05 us       |

These are rough estimates. Actual performance depends on entry size, annotation count, and output destination.

### Hot path optimization

The logging hot path (when a level is disabled) is:

```
logger.debug("message", { key: "value" })
  |
  v
shouldLog("debug", "info") -> false
  |
  v
return (no entry construction, no formatting)
```

The annotation object `{ key: "value" }` is still allocated by the caller even when the level is disabled. Use `isLevelEnabled()` to guard expensive annotation construction:

```typescript
if (logger.isLevelEnabled("debug")) {
  logger.debug("Expensive", { data: computeExpensive() });
}
```

### Memory logger GC impact

The Memory logger stores entries indefinitely until `clear()` is called. In long-running tests, call `clear()` in `beforeEach` to prevent memory accumulation.

### Formatter performance

| Formatter | Complexity                         | Typical time |
| --------- | ---------------------------------- | ------------ |
| JSON      | `JSON.stringify()` + field merge   | ~500 ns      |
| Pretty    | String concatenation + JSON inline | ~300 ns      |
| Minimal   | String concatenation only          | ~50 ns       |

## Appendix D: Comparison with Other Libraries

### Feature matrix

| Feature              | @hex-di/logger        | pino                   | winston               | bunyan              | Effect Logger         |
| -------------------- | --------------------- | ---------------------- | --------------------- | ------------------- | --------------------- |
| Structured entries   | Yes (LogEntry)        | Yes (JSON)             | Yes (JSON)            | Yes (JSON)          | Yes                   |
| Typed levels         | Yes (string literal)  | Yes (string/number)    | Yes (string/number)   | Yes (string/number) | Yes (LogLevel)        |
| Child loggers        | Yes                   | Yes                    | Yes                   | Yes                 | Yes (context)         |
| DI integration       | Yes (port/adapter)    | No                     | No                    | No                  | Yes (Effect services) |
| Backend agnostic     | Yes                   | No (is the backend)    | No (is the backend)   | No (is the backend) | Yes (Logger service)  |
| Zero-cost disable    | Yes (NoOp adapter)    | No                     | No                    | No                  | Yes (void logger)     |
| Context propagation  | Yes (DI context vars) | Via child loggers      | Via defaultMeta       | Via child loggers   | Via FiberRef          |
| Header extraction    | Yes                   | No (manual)            | No (manual)           | No (manual)         | No (manual)           |
| Redaction            | Yes (withRedaction)   | Yes (built-in)         | Via format            | Via serializers     | No                    |
| Sampling             | Yes (withSampling)    | No                     | No                    | No                  | No                    |
| Testing utilities    | Yes (MemoryLogger)    | No                     | No                    | No                  | Yes (TestLogger)      |
| React integration    | Yes (hooks/provider)  | No                     | No                    | No                  | No                    |
| Tracing correlation  | Yes (span IDs)        | Via pino-opentelemetry | Via winston-transport | No                  | Yes (built-in)        |
| No any in public API | Yes                   | No                     | No                    | No                  | Yes                   |
| No type casting      | Yes                   | No                     | No                    | No                  | No                    |

### Philosophy comparison

| Library            | Philosophy                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **@hex-di/logger** | Backend-agnostic structured logging as a DI port. Zero-cost when disabled. Context flows through DI scopes. |
| **Pino**           | Maximum performance JSON logger. Low overhead is the primary design goal. V8 optimized.                     |
| **Winston**        | Maximum flexibility. Multiple transports, format pipeline, custom levels.                                   |
| **Bunyan**         | JSON-first logging with native serializers and child loggers. Stream-based output.                          |
| **Effect Logger**  | Part of the Effect ecosystem. Logging is a service in the effect runtime.                                   |

### Why not just use Pino/Winston directly?

1. **Coupling** -- direct use couples application code to a specific library. Switching from Pino to Winston requires changing every import.
2. **DI integration** -- `@hex-di/logger` flows through the container. Loggers are resolved, scoped, and instrumented automatically.
3. **Testing** -- MemoryLogger + assertLogEntry provides first-class test support without mock libraries.
4. **Context propagation** -- DI scope variables propagate log context automatically. No manual child logger threading.
5. **Zero-cost option** -- NoOp adapter is truly zero-cost. Pino's "silent" mode still has some overhead.

## Appendix E: Glossary

| Term                   | Definition                                                           |
| ---------------------- | -------------------------------------------------------------------- |
| **LogLevel**           | Severity classification for log entries (trace through fatal)        |
| **LogEntry**           | Typed data structure representing a single log event                 |
| **LogContext**         | Request-scoped metadata (correlationId, userId, etc.)                |
| **Logger**             | Interface for producing log entries (call-site API)                  |
| **LogHandler**         | Interface for consuming log entries (output routing)                 |
| **LogFormatter**       | Interface for converting entries to strings                          |
| **Child logger**       | Logger that inherits and extends parent context                      |
| **Annotations**        | Key-value pairs attached to specific log entries or logger instances |
| **Structured logging** | Logging where entries are typed data structures, not format strings  |
| **Redaction**          | Removal of sensitive data from log entries before output             |
| **Sampling**           | Probabilistic reduction of log volume                                |
| **Rate limiting**      | Hard cap on log entry throughput                                     |
| **NoOp adapter**       | Zero-cost Logger that discards all entries                           |
| **Memory adapter**     | Logger that stores entries in memory for test assertions             |
| **Scoped adapter**     | Logger that automatically includes DI scope context                  |
| **Context variable**   | DI mechanism for propagating values through scope hierarchy          |
| **Span correlation**   | Including trace/span IDs in log entries for cross-referencing        |

## Appendix F: Design Decisions

### F.1: Three separate ports (Logger, Handler, Formatter)

**Decision:** Three ports instead of a single Logger port.

**Rationale:**

- **Logger** is the call-site API consumed by application code
- **LogHandler** is the output consumed by backend adapters
- **LogFormatter** is the string conversion consumed by text-based outputs
- Different lifetimes: Logger may be scoped, Handler is typically singleton, Formatter is singleton
- Different replacement: you might change the Handler (Pino -> Winston) without changing the Logger API

**Trade-off:** More ports to register. The built-in adapters (NoOp, Console, Memory) implement Logger directly without a Handler, so simple setups don't need all three ports.

### F.2: error/fatal overload with Error object

**Decision:** `error()` and `fatal()` accept an optional `Error` as the second argument, disambiguated via `instanceof Error`.

**Rationale:**

- Errors should be structured data in LogEntry.error, not stringified
- The overload makes the common case easy: `logger.error("msg", err)`
- `instanceof Error` is a reliable check in modern JavaScript

**Trade-off:** Cannot pass an Error subclass as an annotation in the second position. This is acceptable because errors belong in the `error` field.

### F.3: Synchronous handle, async flush

**Decision:** `LogHandler.handle()` is synchronous. `flush()` and `shutdown()` are async.

**Rationale:**

- Log calls must never block the application
- `handle()` can buffer internally and write asynchronously
- `flush()` ensures buffered entries are written (e.g., before shutdown)
- This matches Pino's and Bunyan's design patterns

**Trade-off:** Handlers that need async writes must manage their own buffering.

### F.4: Transient lifetime for MemoryLoggerAdapter

**Decision:** `MemoryLoggerAdapter` uses `transient` lifetime (new instance per resolution).

**Rationale:**

- Test isolation: each test gets a fresh logger with an empty entry array
- Prevents cross-test contamination in DI container-based tests

**Trade-off:** Resolving the logger multiple times in one test gives different instances. Use `createMemoryLogger()` directly when you need a single shared instance.

### F.5: LogLevelValue numeric spacing

**Decision:** Levels are spaced by 10 (10, 20, 30, 40, 50, 60).

**Rationale:**

- Leaves room for future intermediate levels (e.g., `verbose: 15`, `notice: 35`)
- Same convention used by Pino
- Comparison is simple integer arithmetic

**Trade-off:** The specific numbers are internal. They must not leak to the public API (consumers work with string level names only).

### F.6: Frozen NOOP_LOGGER

**Decision:** `NOOP_LOGGER` is `Object.freeze()`d.

**Rationale:**

- Prevents accidental mutation of the shared singleton
- `child()` and `withAnnotations()` return the same frozen reference
- Makes the zero-cost guarantee enforceable: no one can add behavior

**Trade-off:** Cannot extend NOOP_LOGGER at runtime. This is intentional.

---

_Previous: [15 - API Reference](./15-api-reference.md) | Next: [17 - Definition of Done](./17-definition-of-done.md)_
