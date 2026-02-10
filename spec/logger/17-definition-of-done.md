# 17 - Definition of Done

_Previous: [16 - Appendices](./16-appendices.md)_

---

This document defines all tests required for `@hex-di/logger`, `@hex-di/logger-pino`, `@hex-di/logger-winston`, and `@hex-di/logger-bunyan` to be considered complete. Each section maps to a spec section and specifies required unit tests, type-level tests, integration tests, and mutation testing guidance.

## Test File Convention

| Test Category         | File Pattern  | Location                                       |
| --------------------- | ------------- | ---------------------------------------------- |
| Unit tests            | `*.test.ts`   | `packages/logger/tests/`                       |
| Type-level tests      | `*.test-d.ts` | `packages/logger/tests/`                       |
| Integration tests     | `*.test.ts`   | `packages/logger/tests/integration/`           |
| Backend adapter tests | `*.test.ts`   | `packages/logger-{pino,winston,bunyan}/tests/` |

---

## DoD 1: Core Types (Spec Sections 9-12)

### Unit Tests -- `core-types.test.ts`

| #   | Test                                             | Type |
| --- | ------------------------------------------------ | ---- |
| 1   | `LogLevelValue.trace` is 10                      | unit |
| 2   | `LogLevelValue.debug` is 20                      | unit |
| 3   | `LogLevelValue.info` is 30                       | unit |
| 4   | `LogLevelValue.warn` is 40                       | unit |
| 5   | `LogLevelValue.error` is 50                      | unit |
| 6   | `LogLevelValue.fatal` is 60                      | unit |
| 7   | `shouldLog("info", "debug")` returns true        | unit |
| 8   | `shouldLog("debug", "info")` returns false       | unit |
| 9   | `shouldLog("error", "error")` returns true       | unit |
| 10  | `shouldLog("trace", "info")` returns false       | unit |
| 11  | `shouldLog("fatal", "trace")` returns true       | unit |
| 12  | Every level should log when minLevel is "trace"  | unit |
| 13  | Only "fatal" should log when minLevel is "fatal" | unit |

### Type-Level Tests -- `core-types.test-d.ts`

| #   | Test                                                                  | Type |
| --- | --------------------------------------------------------------------- | ---- |
| 1   | `LogLevel` accepts "trace", "debug", "info", "warn", "error", "fatal" | type |
| 2   | `LogLevel` rejects "verbose", "notice", or other strings              | type |
| 3   | `LogEntry.level` is assignable to `LogLevel`                          | type |
| 4   | `LogEntry.annotations` is `Readonly<Record<string, unknown>>`         | type |
| 5   | `LogEntry.error` is optional `Error`                                  | type |
| 6   | `LogEntry.spans` is optional `ReadonlyArray`                          | type |
| 7   | `LogContext` allows known fields and index signature                  | type |
| 8   | `LogLevelValue` is `Readonly<Record<LogLevel, number>>`               | type |

### Mutation Testing

**Target: >95% mutation score.** Level comparison values and `shouldLog` boundary condition are critical. Mutations to `>=` operator or level values must be caught.

---

## DoD 2: Logger Port (Spec Sections 13-17)

### Unit Tests -- `logger-port.test.ts`

| #   | Test                                                                  | Type |
| --- | --------------------------------------------------------------------- | ---- |
| 1   | `LoggerPort.name` is "Logger"                                         | unit |
| 2   | `LoggerPort.direction` is "outbound"                                  | unit |
| 3   | `LoggerPort.category` is "infrastructure"                             | unit |
| 4   | `LoggerPort.tags` includes "logging" and "observability"              | unit |
| 5   | Logger `child()` returns a new Logger with merged context             | unit |
| 6   | Logger `child()` does not modify parent context                       | unit |
| 7   | Logger `withAnnotations()` returns Logger with persistent annotations | unit |
| 8   | Logger `withAnnotations()` merges with existing annotations           | unit |
| 9   | Logger `isLevelEnabled()` returns true for enabled levels             | unit |
| 10  | Logger `isLevelEnabled()` returns false for disabled levels           | unit |
| 11  | Logger `getContext()` returns the current merged context              | unit |
| 12  | Logger `time()` executes the function and returns result              | unit |
| 13  | Logger `time()` logs at debug level on success with duration          | unit |
| 14  | Logger `time()` logs at error level on failure with duration          | unit |
| 15  | Logger `time()` re-throws the error from the function                 | unit |
| 16  | Logger `timeAsync()` executes async function and returns result       | unit |
| 17  | Logger `timeAsync()` logs at debug level on success with duration     | unit |
| 18  | Logger `timeAsync()` logs at error level on failure with duration     | unit |
| 19  | Logger `timeAsync()` re-throws the error from the async function      | unit |
| 20  | `error()` with Error object stores error in LogEntry.error            | unit |
| 21  | `error()` without Error object has undefined LogEntry.error           | unit |
| 22  | `fatal()` with Error object stores error in LogEntry.error            | unit |
| 23  | `fatal()` with Error and annotations stores both correctly            | unit |
| 24  | Annotations from call site override base annotations on key collision | unit |

### Type-Level Tests -- `logger-port.test-d.ts`

| #   | Test                                                        | Type |
| --- | ----------------------------------------------------------- | ---- |
| 1   | `Logger.child()` returns `Logger`                           | type |
| 2   | `Logger.withAnnotations()` returns `Logger`                 | type |
| 3   | `Logger.time()` infers return type from function            | type |
| 4   | `Logger.timeAsync()` infers `Promise<T>` from function      | type |
| 5   | `Logger.error()` overload accepts `(string, Error, Record)` | type |
| 6   | `Logger.fatal()` overload accepts `(string, Error, Record)` | type |

### Mutation Testing

**Target: >95% mutation score.** Level check, error disambiguation (`instanceof Error`), and timing log level (debug vs error) are critical.

---

## DoD 3: Handler & Formatter Ports (Spec Sections 18-22)

### Unit Tests -- `handler-formatter.test.ts`

| #   | Test                                                            | Type |
| --- | --------------------------------------------------------------- | ---- |
| 1   | `LogHandlerPort.name` is "LogHandler"                           | unit |
| 2   | `LogFormatterPort.name` is "LogFormatter"                       | unit |
| 3   | JSON formatter produces valid JSON string                       | unit |
| 4   | JSON formatter includes level, message, timestamp               | unit |
| 5   | JSON formatter flattens context fields to top level             | unit |
| 6   | JSON formatter flattens annotation fields to top level          | unit |
| 7   | JSON formatter includes error name, message, stack when present | unit |
| 8   | JSON formatter includes traceId and spanId when spans present   | unit |
| 9   | JSON formatter omits error when not present                     | unit |
| 10  | Pretty formatter includes ISO timestamp                         | unit |
| 11  | Pretty formatter includes aligned level label                   | unit |
| 12  | Pretty formatter includes message                               | unit |
| 13  | Pretty formatter includes inline JSON annotations when present  | unit |
| 14  | Pretty formatter appends error message when present             | unit |
| 15  | Pretty formatter appends traceId when spans present             | unit |
| 16  | Minimal formatter includes only level label and message         | unit |
| 17  | Minimal formatter ignores annotations, context, error, spans    | unit |
| 18  | `getFormatter("json")` returns JSON formatter                   | unit |
| 19  | `getFormatter("pretty")` returns pretty formatter               | unit |
| 20  | `getFormatter("minimal")` returns minimal formatter             | unit |

### Mutation Testing

**Target: >90% mutation score.** Formatter output correctness and `getFormatter` switch coverage are critical.

---

## DoD 4: Built-in Adapters (Spec Sections 23-26)

### Unit Tests -- `adapters.test.ts`

| #   | Test                                                           | Type |
| --- | -------------------------------------------------------------- | ---- |
| 1   | NoOp: `trace()` does not throw                                 | unit |
| 2   | NoOp: `info()` does not throw                                  | unit |
| 3   | NoOp: `error()` with Error does not throw                      | unit |
| 4   | NoOp: `child()` returns same `NOOP_LOGGER` reference           | unit |
| 5   | NoOp: `withAnnotations()` returns same `NOOP_LOGGER` reference | unit |
| 6   | NoOp: `isLevelEnabled()` always returns false                  | unit |
| 7   | NoOp: `getContext()` returns frozen empty object               | unit |
| 8   | NoOp: `time()` executes function and returns result            | unit |
| 9   | NoOp: `timeAsync()` executes function and returns result       | unit |
| 10  | NoOp: `NOOP_LOGGER` is frozen (Object.isFrozen)                | unit |
| 11  | Memory: logs entry at trace level                              | unit |
| 12  | Memory: logs entry at info level                               | unit |
| 13  | Memory: logs entry at error level with Error object            | unit |
| 14  | Memory: `getEntries()` returns all collected entries           | unit |
| 15  | Memory: `getEntriesByLevel("error")` filters correctly         | unit |
| 16  | Memory: `clear()` removes all entries                          | unit |
| 17  | Memory: `findEntry()` returns matching entry                   | unit |
| 18  | Memory: `findEntry()` returns undefined when no match          | unit |
| 19  | Memory: child logger shares entry array with parent            | unit |
| 20  | Memory: child logger includes merged context in entries        | unit |
| 21  | Memory: `withAnnotations()` persists annotations across calls  | unit |
| 22  | Memory: suppressed levels are not collected                    | unit |
| 23  | Memory: `time()` logs completion entry with duration           | unit |
| 24  | Memory: `time()` logs error entry on failure with duration     | unit |
| 25  | Memory: entries have timestamps (number > 0)                   | unit |
| 26  | Console: does not throw on any level                           | unit |
| 27  | Console: `child()` returns new Logger                          | unit |
| 28  | Console: `isLevelEnabled()` respects configured level          | unit |
| 29  | Console: suppressed levels are not output                      | unit |
| 30  | Console: default formatter is pretty                           | unit |
| 31  | `NoOpLoggerAdapter.provides` is `LoggerPort`                   | unit |
| 32  | `MemoryLoggerAdapter.lifetime` is "transient"                  | unit |
| 33  | `ConsoleLoggerAdapter.lifetime` is "singleton"                 | unit |

### Mutation Testing

**Target: >95% mutation score.** NoOp return-self behavior, Memory level filtering, and Console level gating are critical.

---

## DoD 5: Backend Adapters (Spec Sections 27-30)

### Unit Tests -- `packages/logger-pino/tests/pino-handler.test.ts`

| #   | Test                                                              | Type |
| --- | ----------------------------------------------------------------- | ---- |
| 1   | `createPinoHandler()` returns object with handle, flush, shutdown | unit |
| 2   | `handle()` does not throw on valid LogEntry                       | unit |
| 3   | `flush()` resolves                                                | unit |
| 4   | `shutdown()` resolves                                             | unit |
| 5   | `PinoHandlerAdapter.provides` is `LogHandlerPort`                 | unit |
| 6   | `mapLevel` maps all six hex-di levels to Pino levels              | unit |

### Unit Tests -- `packages/logger-winston/tests/winston-handler.test.ts`

| #   | Test                                                                 | Type |
| --- | -------------------------------------------------------------------- | ---- |
| 1   | `createWinstonHandler()` returns object with handle, flush, shutdown | unit |
| 2   | `handle()` does not throw on valid LogEntry                          | unit |
| 3   | `shutdown()` resolves                                                | unit |
| 4   | `WinstonHandlerAdapter.provides` is `LogHandlerPort`                 | unit |
| 5   | Custom levels include trace (5) and fatal (0)                        | unit |

### Unit Tests -- `packages/logger-bunyan/tests/bunyan-handler.test.ts`

| #   | Test                                                                | Type |
| --- | ------------------------------------------------------------------- | ---- |
| 1   | `createBunyanHandler()` returns object with handle, flush, shutdown | unit |
| 2   | `handle()` does not throw on valid LogEntry                         | unit |
| 3   | `flush()` resolves                                                  | unit |
| 4   | `shutdown()` resolves                                               | unit |
| 5   | `BunyanHandlerAdapter.provides` is `LogHandlerPort`                 | unit |
| 6   | `mapLevel` maps all six hex-di levels to Bunyan levels              | unit |

### Mutation Testing

**Target: >85% mutation score.** Backend adapter tests depend on external libraries. Level mapping must be correct.

---

## DoD 6: Context Propagation (Spec Sections 31-34)

### Unit Tests -- `context.test.ts`

| #   | Test                                                                     | Type |
| --- | ------------------------------------------------------------------------ | ---- |
| 1   | `mergeContext` merges two non-overlapping contexts                       | unit |
| 2   | `mergeContext` override takes precedence on key collision                | unit |
| 3   | `mergeContext` skips undefined override values                           | unit |
| 4   | `mergeContext` returns new object (does not mutate inputs)               | unit |
| 5   | `mergeContext` with empty override returns copy of base                  | unit |
| 6   | `mergeContext` with empty base returns copy of override                  | unit |
| 7   | `extractContextFromHeaders` extracts correlationId                       | unit |
| 8   | `extractContextFromHeaders` extracts requestId                           | unit |
| 9   | `extractContextFromHeaders` returns empty object when no headers present | unit |
| 10  | `extractContextFromHeaders` skips empty string header values             | unit |
| 11  | `LogContextVar` has default value of `{}`                                | unit |
| 12  | `LogAnnotationsVar` has default value of `{}`                            | unit |
| 13  | Child logger context chain: three-level nesting preserves all context    | unit |
| 14  | Child logger context override: child overrides parent for same key       | unit |

### Mutation Testing

**Target: >95% mutation score.** Context merge precedence and undefined-skip logic are critical.

---

## DoD 7: Redaction & Sampling (Spec Sections 35-37)

### Unit Tests -- `redaction-sampling.test.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 1   | `withRedaction` redacts exact field name in annotations                    | unit |
| 2   | `withRedaction` redacts wildcard field in nested annotations               | unit |
| 3   | `withRedaction` does not modify non-matching fields                        | unit |
| 4   | `withRedaction` uses custom censor function                                | unit |
| 5   | `withRedaction` default censor is "[REDACTED]"                             | unit |
| 6   | `withRedaction` child loggers preserve redaction                           | unit |
| 7   | `withSampling` with rate 1.0 logs all entries                              | unit |
| 8   | `withSampling` with rate 0.0 logs no entries (except errors if configured) | unit |
| 9   | `withSampling` with alwaysLogErrors always logs error level                | unit |
| 10  | `withSampling` with alwaysLogErrors always logs fatal level                | unit |
| 11  | `withSampling` respects per-level rate overrides                           | unit |
| 12  | `withRateLimit` allows entries within the limit                            | unit |
| 13  | `withRateLimit` drops entries exceeding the limit                          | unit |

### Mutation Testing

**Target: >90% mutation score.** Redaction path matching and sampling rate comparison are critical.

---

## DoD 8: Instrumentation (Spec Sections 38-40)

### Integration Tests -- `integration/instrumentation.test.ts`

| #   | Test                                                                       | Type        |
| --- | -------------------------------------------------------------------------- | ----------- |
| 1   | `instrumentContainer` logs resolution events                               | integration |
| 2   | `instrumentContainer` logs errors on failed resolutions                    | integration |
| 3   | `instrumentContainer` respects portFilter                                  | integration |
| 4   | `instrumentContainer` includes timing when enabled                         | integration |
| 5   | `instrumentContainer` respects minDurationMs threshold                     | integration |
| 6   | `instrumentContainer` cleanup function removes hooks                       | integration |
| 7   | `instrumentContainer` does not cause infinite loops with Logger resolution | integration |
| 8   | Scope lifecycle logging: logs scope creation when enabled                  | integration |
| 9   | Scope lifecycle logging: logs scope disposal with resolvedCount            | integration |
| 10  | `createLoggingHook` produces compatible ResolutionHook                     | integration |

### Mutation Testing

**Target: >85% mutation score.** Infinite loop prevention and portFilter are critical.

---

## DoD 9: Framework Integration (Spec Sections 41-43)

### Unit Tests -- `framework-integration.test.ts`

| #   | Test                                                        | Type |
| --- | ----------------------------------------------------------- | ---- |
| 1   | Hono middleware creates child logger with request context   | unit |
| 2   | Hono middleware logs request start with method and path     | unit |
| 3   | Hono middleware logs response with status and duration      | unit |
| 4   | Hono middleware skips paths in skipPaths config             | unit |
| 5   | Hono middleware redacts configured headers                  | unit |
| 6   | Hono middleware uses warn level for 4xx status              | unit |
| 7   | Hono middleware uses error level for 5xx status             | unit |
| 8   | React: `useLogger()` returns logger from provider           | unit |
| 9   | React: `useChildLogger()` returns child with merged context | unit |
| 10  | React: `useLifecycleLogger()` logs mount and unmount        | unit |
| 11  | React: nested LoggingProviders create context chain         | unit |

### Mutation Testing

**Target: >85% mutation score.** Response level mapping (4xx -> warn, 5xx -> error) is critical.

---

## DoD 10: Tracing Integration (Spec Sections 44-46)

### Integration Tests -- `integration/tracing.test.ts`

| #   | Test                                                       | Type        |
| --- | ---------------------------------------------------------- | ----------- |
| 1   | Log entries include traceId when span is active            | integration |
| 2   | Log entries include spanId when span is active             | integration |
| 3   | Log entries have no spans field when tracing is not active | integration |
| 4   | Nested spans: inner span IDs appear in log entries         | integration |
| 5   | JSON formatter outputs traceId and spanId from spans       | integration |
| 6   | Pretty formatter appends traceId from spans                | integration |

### Mutation Testing

**Target: >85% mutation score.** Span injection and conditional span field handling are critical.

---

## DoD 11: Testing Utilities (Spec Sections 51-54)

### Unit Tests -- `testing-utils.test.ts`

| #   | Test                                                       | Type |
| --- | ---------------------------------------------------------- | ---- |
| 1   | `assertLogEntry` returns matching entry on match           | unit |
| 2   | `assertLogEntry` throws when no match found                | unit |
| 3   | `assertLogEntry` matches by level                          | unit |
| 4   | `assertLogEntry` matches by exact message string           | unit |
| 5   | `assertLogEntry` matches by RegExp message                 | unit |
| 6   | `assertLogEntry` matches by annotation subset              | unit |
| 7   | `assertLogEntry` matches by context subset                 | unit |
| 8   | `assertLogEntry` matches by hasError: true                 | unit |
| 9   | `assertLogEntry` matches by hasError: false                | unit |
| 10  | `assertLogEntry` empty matcher matches first entry         | unit |
| 11  | Error message includes available entries for debugging     | unit |
| 12  | `createMemoryLogger` defaults to "trace" level             | unit |
| 13  | `createMemoryLogger("warn")` suppresses trace, debug, info | unit |

### Mutation Testing

**Target: >90% mutation score.** Matcher logic (level equality, regex test, subset matching) is critical.

---

## DoD 12: Inspection & Reporting (Spec Sections 47-50)

### Unit Tests -- `inspection.test.ts`

| #   | Test                                                                   | Type |
| --- | ---------------------------------------------------------------------- | ---- |
| 1   | `getSnapshot()` returns valid LoggingSnapshot with all required fields | unit |
| 2   | `getEntryCounts()` returns zero counts initially                       | unit |
| 3   | `getEntryCounts()` increments on each log entry                        | unit |
| 4   | `getEntryCounts()` tracks all six levels independently                 | unit |
| 5   | `getErrorRate()` returns 0 when no entries logged                      | unit |
| 6   | `getErrorRate()` calculates (error+fatal)/total correctly              | unit |
| 7   | `getErrorRate()` respects time window option                           | unit |
| 8   | `getHandlerInfo()` returns handler metadata array                      | unit |
| 9   | `getHandlerInfo()` includes handler type discriminant                  | unit |
| 10  | `getSamplingStatistics()` returns zero stats initially                 | unit |
| 11  | `getSamplingStatistics()` tracks accepted vs dropped per level         | unit |
| 12  | `getRedactionStatistics()` tracks redacted field count                 | unit |
| 13  | `getRecentEntries()` returns entries from Memory adapter               | unit |
| 14  | `getRecentEntries()` returns empty array for NoOp adapter              | unit |
| 15  | `getRecentEntries()` respects limit option                             | unit |
| 16  | `getContextUsage()` reports context field frequency                    | unit |
| 17  | `subscribe()` fires "entry-logged" on log call                         | unit |
| 18  | `subscribe()` fires "error-rate-threshold" when threshold exceeded     | unit |
| 19  | `subscribe()` fires "snapshot-changed" after state updates             | unit |
| 20  | `LoggerInspectorPort.name` is "LoggerInspector"                        | unit |

### Type-Level Tests -- `inspection.test-d.ts`

| #   | Test                                                     | Type |
| --- | -------------------------------------------------------- | ---- |
| 1   | `LoggerInspector` satisfies `LibraryInspector` interface | type |
| 2   | `LoggingSnapshot` fields are all readonly                | type |
| 3   | `LoggerInspectorEvent` is discriminated union on `type`  | type |

### Mutation Testing

**Target: >90% mutation score.** Error rate boundary, time window comparison, and event emission conditions are critical.

---

## Test Count Summary

| Category              | Count    |
| --------------------- | -------- |
| Unit tests (core)     | ~115     |
| Type-level tests      | ~17      |
| Integration tests     | ~16      |
| Backend adapter tests | ~17      |
| **Total**             | **~165** |

## Verification Checklist

Before marking the spec as "implemented," the following must all pass:

| Check                       | Command                                                              | Expected   |
| --------------------------- | -------------------------------------------------------------------- | ---------- |
| All unit tests pass         | `pnpm --filter @hex-di/logger test`                                  | 0 failures |
| All type tests pass         | `pnpm --filter @hex-di/logger test:types`                            | 0 failures |
| All integration tests pass  | `pnpm --filter @hex-di/logger test -- --dir integration`             | 0 failures |
| Pino adapter tests pass     | `pnpm --filter @hex-di/logger-pino test`                             | 0 failures |
| Winston adapter tests pass  | `pnpm --filter @hex-di/logger-winston test`                          | 0 failures |
| Bunyan adapter tests pass   | `pnpm --filter @hex-di/logger-bunyan test`                           | 0 failures |
| Typecheck passes            | `pnpm --filter @hex-di/logger typecheck`                             | 0 errors   |
| Lint passes                 | `pnpm --filter @hex-di/logger lint`                                  | 0 errors   |
| No `any` types in source    | `grep -r "any" packages/logger/src/`                                 | 0 matches  |
| No type casts in source     | `grep -r " as " packages/logger/src/`                                | 0 matches  |
| No eslint-disable in source | `grep -r "eslint-disable" packages/logger/src/`                      | 0 matches  |
| Mutation score (types)      | `pnpm --filter @hex-di/logger stryker -- --mutate src/types/**`      | >95%       |
| Mutation score (adapters)   | `pnpm --filter @hex-di/logger stryker -- --mutate src/adapters/**`   | >95%       |
| Mutation score (context)    | `pnpm --filter @hex-di/logger stryker -- --mutate src/context/**`    | >95%       |
| Mutation score (utils)      | `pnpm --filter @hex-di/logger stryker -- --mutate src/utils/**`      | >90%       |
| Mutation score (testing)    | `pnpm --filter @hex-di/logger stryker -- --mutate src/testing/**`    | >90%       |
| Mutation score (inspection) | `pnpm --filter @hex-di/logger stryker -- --mutate src/inspection/**` | >90%       |

## Mutation Testing Strategy

### Why Mutation Testing Matters for @hex-di/logger

Logging has subtle behavioral requirements that standard test coverage misses:

- `shouldLog` must use `>=` not `>` -- an off-by-one mutation changes which levels are filtered
- NoOp's `child()` must return `this`, not a new object -- a mutation to `new NoOpLogger()` wastes allocations
- Memory logger's level filter must check before collecting -- a mutation that removes the check leaks suppressed entries
- `mergeContext` must skip `undefined` values -- a mutation that includes them erases parent context
- `error()` disambiguation must check `instanceof Error` -- a mutation breaks the overload

### Mutation Targets by Priority

| Priority | Module                               | Target Score | Rationale                                                            |
| -------- | ------------------------------------ | ------------ | -------------------------------------------------------------------- |
| Critical | Core types (`shouldLog`, levels)     | >95%         | Foundation for all level filtering. Wrong comparison = wrong output. |
| Critical | Adapters (NoOp, Memory, Console)     | >95%         | Adapter behavior defines the logger contract. Any mutation is a bug. |
| Critical | Context (`mergeContext`, headers)    | >95%         | Context merge precedence is the core of propagation.                 |
| High     | Utils (formatting, globals)          | >90%         | Formatter output correctness matters for production debugging.       |
| High     | Testing (`assertLogEntry`, matchers) | >90%         | Test utilities must be reliable -- they validate everything else.    |
| Medium   | Instrumentation                      | >85%         | Integration boundary with container. Lower due to external deps.     |
| Medium   | Framework integration                | >85%         | Integration boundary with Hono/React. Lower due to framework deps.   |
| High     | Inspection (inspector, snapshot)     | >90%         | Inspector correctness is critical for self-aware diagnostics.        |
| Medium   | Backend adapters                     | >85%         | Integration with external libraries. Level mapping is critical.      |

### Mutation Operators to Prioritize

- **Conditional boundary mutations**: `>=` to `>` in `shouldLog` (changes level filtering)
- **Return value mutations**: `return NOOP_LOGGER` to `return new Logger()` (breaks zero-cost)
- **Block removal**: Removing `if (!shouldLog(...)) return` (leaks suppressed entries)
- **Object identity mutations**: `return this` to `return clone()` (breaks NoOp invariant)
- **String literal mutations**: `"x-correlation-id"` to `"x-request-id"` (swaps header extraction)

---

_Previous: [16 - Appendices](./16-appendices.md)_

_End of Definition of Done_
