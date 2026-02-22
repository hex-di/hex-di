# Task Breakdown: @hex-di/logger

## Overview

**Total Tasks:** 12 Task Groups, ~85 sub-tasks

**Current State:** The codebase has substantial scaffolding already in place. The packages are named `@hex-di/logging`, `@hex-di/logging-pino`, `@hex-di/logging-winston`, and `@hex-di/logging-bunyan` (using `logging` instead of `logger` as the spec references). The following are already implemented:

- **Fully implemented:** Core types (LogLevel, LogLevelValue, shouldLog, LogEntry, LogContext), Logger interface, LoggerPort, LogHandlerPort, LogFormatterPort, NOOP_LOGGER singleton, MemoryLogger class, ConsoleLogger class, NoOpLoggerAdapter, MemoryLoggerAdapter, ConsoleLoggerAdapter, mergeContext, extractContextFromHeaders, header constants, all three built-in formatters (JSON, pretty, minimal), getFormatter, ConsoleLike/getConsole, LogContextVar, LogAnnotationsVar, assertLogEntry/LogEntryMatcher, Pino/Winston/Bunyan handler adapters
- **Not yet implemented:** ScopedLoggerAdapter, withRedaction, withSampling, withRateLimit, instrumentContainer, createLoggingHook, Hono loggingMiddleware, React LoggingProvider/hooks, tracing integration (span injection into LogEntry), entire inspection module (LoggerInspector, LoggingSnapshot, events, LoggerInspectorPort, container integration)
- **Existing tests:** 7 test files for core package (~680 LOC), 3 backend adapter test files (~290 LOC). Coverage against DoD requirements is partial.

**Package locations:**

- `packages/logging/` -- core package (`@hex-di/logging`)
- `packages/logging-pino/` -- Pino adapter
- `packages/logging-winston/` -- Winston adapter
- `packages/logging-bunyan/` -- Bunyan adapter

## Task List

---

### Core Types & Ports (Foundation Layer)

#### Task Group 1: Core Types Verification and Test Completion

**Dependencies:** None
**Spec Sections:** 9-12, 13-17, 18-22
**DoD Sections:** DoD 1, DoD 2 (partial), DoD 3 (partial)

The core types, Logger interface, port definitions, and formatters are already implemented. This task group focuses on writing the DoD-required tests and verifying correctness.

- [ ] 1.0 Complete core types test suite and type-level tests
  - [ ] 1.1 Write unit tests for core types -- `packages/logging/tests/core-types.test.ts`
    - Existing file: `packages/logging/tests/unit/log-level.test.ts` -- review and extend to match DoD 1
    - Test all 6 LogLevelValue numeric values (tests #1-6)
    - Test shouldLog boundary conditions: 5 specific cases (tests #7-11)
    - Test "every level logs when minLevel is trace" (test #12)
    - Test "only fatal logs when minLevel is fatal" (test #13)
    - Target: 13 unit tests per DoD 1
  - [ ] 1.2 Write type-level tests -- `packages/logging/tests/core-types.test-d.ts`
    - LogLevel accepts valid values, rejects invalid strings (tests #1-2)
    - LogEntry.level assignable to LogLevel (test #3)
    - LogEntry.annotations is Readonly<Record<string, unknown>> (test #4)
    - LogEntry.error is optional Error (test #5)
    - LogEntry.spans is optional ReadonlyArray (test #6)
    - LogContext allows known fields and index signature (test #7)
    - LogLevelValue is Readonly<Record<LogLevel, number>> (test #8)
    - Target: 8 type-level tests per DoD 1
  - [ ] 1.3 Write unit tests for port definitions
    - LoggerPort: name, direction, category, tags (DoD 2, tests #1-4)
    - LogHandlerPort: name is "LogHandler" (DoD 3, test #1)
    - LogFormatterPort: name is "LogFormatter" (DoD 3, test #2)
  - [ ] 1.4 Write unit tests for formatters -- `packages/logging/tests/handler-formatter.test.ts`
    - JSON formatter: 7 tests covering valid JSON, fields, context flattening, annotations, error, spans, omit error (DoD 3, tests #3-9)
    - Pretty formatter: 6 tests covering timestamp, level label, message, annotations, error, traceId (DoD 3, tests #10-15)
    - Minimal formatter: 2 tests covering level+message only, ignoring extras (DoD 3, tests #16-17)
    - getFormatter returns correct formatter for each type (DoD 3, tests #18-20)
    - Target: 20 unit tests per DoD 3
  - [ ] 1.5 Write type-level tests for Logger port -- `packages/logging/tests/logger-port.test-d.ts`
    - Logger.child() returns Logger (test #1)
    - Logger.withAnnotations() returns Logger (test #2)
    - Logger.time() infers return type (test #3)
    - Logger.timeAsync() infers Promise<T> (test #4)
    - Logger.error() overload accepts (string, Error, Record) (test #5)
    - Logger.fatal() overload accepts (string, Error, Record) (test #6)
    - Target: 6 type-level tests per DoD 2
  - [ ] 1.6 Run all tests from this group and verify they pass
    - Run ONLY the tests written/updated in 1.1-1.5
    - Verify type-level tests pass with `pnpm --filter @hex-di/logging test:types`

**Acceptance Criteria:**

- 13 core-types unit tests pass (DoD 1)
- 8 core-types type-level tests pass (DoD 1)
- 6 port definition unit tests pass
- 20 handler/formatter unit tests pass (DoD 3)
- 6 Logger type-level tests pass (DoD 2)
- All existing implementations verified against spec

---

### Built-in Adapters

#### Task Group 2: Logger Port Behavior Tests (via MemoryLogger)

**Dependencies:** Task Group 1
**Spec Sections:** 13-17, 23-26
**DoD Sections:** DoD 2, DoD 4

The Logger interface behavior tests (DoD 2) are verified through the MemoryLogger and NoOp adapters, since there is no abstract Logger class -- only adapter implementations. The adapters themselves are already implemented.

- [ ] 2.0 Complete Logger port behavior and adapter test suites
  - [ ] 2.1 Write Logger port behavior tests -- `packages/logging/tests/logger-port.test.ts`
    - Test via MemoryLogger (primary) and NoOp (secondary) since these implement the Logger interface
    - child() returns new Logger with merged context (DoD 2, test #5)
    - child() does not modify parent context (DoD 2, test #6)
    - withAnnotations() returns Logger with persistent annotations (DoD 2, test #7)
    - withAnnotations() merges with existing annotations (DoD 2, test #8)
    - isLevelEnabled() returns true for enabled levels (DoD 2, test #9)
    - isLevelEnabled() returns false for disabled levels (DoD 2, test #10)
    - getContext() returns current merged context (DoD 2, test #11)
    - time() executes function and returns result (DoD 2, test #12)
    - time() logs debug on success with duration (DoD 2, test #13)
    - time() logs error on failure with duration (DoD 2, test #14)
    - time() re-throws errors (DoD 2, test #15)
    - timeAsync() executes and returns result (DoD 2, test #16)
    - timeAsync() logs debug on success with duration (DoD 2, test #17)
    - timeAsync() logs error on failure with duration (DoD 2, test #18)
    - timeAsync() re-throws errors (DoD 2, test #19)
    - error() with Error stores in LogEntry.error (DoD 2, test #20)
    - error() without Error has undefined error (DoD 2, test #21)
    - fatal() with Error stores in LogEntry.error (DoD 2, test #22)
    - fatal() with Error and annotations stores both (DoD 2, test #23)
    - Call-site annotations override base annotations (DoD 2, test #24)
    - Target: 20 unit tests per DoD 2
  - [ ] 2.2 Write built-in adapter tests -- `packages/logging/tests/adapters.test.ts`
    - Consolidate or extend existing test files: `noop-logger.test.ts`, `memory-logger.test.ts`, `console-logger.test.ts`
    - NoOp: 10 tests (trace no-throw, info no-throw, error+Error no-throw, child returns self, withAnnotations returns self, isLevelEnabled always false, getContext returns frozen {}, time executes, timeAsync executes, NOOP_LOGGER is frozen) (DoD 4, tests #1-10)
    - Memory: 15 tests (logs trace, logs info, logs error+Error, getEntries returns all, getEntriesByLevel filters, clear removes, findEntry matches, findEntry returns undefined, child shares array, child merges context, withAnnotations persists, suppressed levels not collected, time logs completion, time logs error, entries have timestamps) (DoD 4, tests #11-25)
    - Console: 5 tests (no throw, child returns new Logger, isLevelEnabled respects config, suppressed levels not output, default formatter is pretty) (DoD 4, tests #26-30)
    - Adapter metadata: 3 tests (NoOpLoggerAdapter.provides, MemoryLoggerAdapter.lifetime, ConsoleLoggerAdapter.lifetime) (DoD 4, tests #31-33)
    - Target: 33 unit tests per DoD 4
  - [ ] 2.3 Run all tests from this group and verify they pass

**Acceptance Criteria:**

- 20 Logger port behavior tests pass (DoD 2)
- 33 built-in adapter tests pass (DoD 4)
- All existing adapter implementations verified against spec

---

### Context Propagation

#### Task Group 3: Context Propagation Tests

**Dependencies:** Task Group 1
**Spec Sections:** 31-34
**DoD Section:** DoD 6

Context propagation code (mergeContext, extractContextFromHeaders, LogContextVar, LogAnnotationsVar) is already implemented. This group writes the DoD-required tests.

- [ ] 3.0 Complete context propagation test suite
  - [ ] 3.1 Write context propagation tests -- `packages/logging/tests/context.test.ts`
    - Existing file: `packages/logging/tests/unit/context-utils.test.ts` -- review and extend
    - mergeContext merges non-overlapping (test #1)
    - mergeContext override precedence on collision (test #2)
    - mergeContext skips undefined override values (test #3)
    - mergeContext returns new object, no mutation (test #4)
    - mergeContext empty override returns copy of base (test #5)
    - mergeContext empty base returns copy of override (test #6)
    - extractContextFromHeaders extracts correlationId (test #7)
    - extractContextFromHeaders extracts requestId (test #8)
    - extractContextFromHeaders returns {} when no headers (test #9)
    - extractContextFromHeaders skips empty string values (test #10)
    - LogContextVar default is {} (test #11)
    - LogAnnotationsVar default is {} (test #12)
    - Three-level child logger nesting preserves all context (test #13)
    - Child context override for same key (test #14)
    - Target: 14 unit tests per DoD 6
  - [ ] 3.2 Run context tests and verify they pass

**Acceptance Criteria:**

- 14 context propagation tests pass (DoD 6)
- mergeContext correctly handles all edge cases
- Context variables have correct defaults

---

### Backend Adapters

#### Task Group 4: Backend Adapter Tests

**Dependencies:** Task Group 1
**Spec Sections:** 27-30
**DoD Section:** DoD 5

Pino, Winston, and Bunyan handler adapters are already implemented. This group writes/completes the DoD-required test suites.

- [ ] 4.0 Complete backend adapter test suites
  - [ ] 4.1 Write/update Pino adapter tests -- `packages/logging-pino/tests/pino-handler.test.ts`
    - Existing file: `packages/logging-pino/tests/handler.test.ts` -- review and extend
    - createPinoHandler returns object with handle, flush, shutdown (test #1)
    - handle() does not throw on valid LogEntry (test #2)
    - flush() resolves (test #3)
    - shutdown() resolves (test #4)
    - PinoHandlerAdapter.provides is LogHandlerPort (test #5)
    - mapLevel maps all 6 levels to Pino levels (test #6)
    - Target: 6 unit tests per DoD 5
  - [ ] 4.2 Write/update Winston adapter tests -- `packages/logging-winston/tests/winston-handler.test.ts`
    - Existing file: `packages/logging-winston/tests/handler.test.ts` -- review and extend
    - createWinstonHandler returns object with handle, flush, shutdown (test #1)
    - handle() does not throw on valid LogEntry (test #2)
    - shutdown() resolves (test #3)
    - WinstonHandlerAdapter.provides is LogHandlerPort (test #4)
    - Custom levels include trace (5) and fatal (0) (test #5)
    - Target: 5 unit tests per DoD 5
  - [ ] 4.3 Write/update Bunyan adapter tests -- `packages/logging-bunyan/tests/bunyan-handler.test.ts`
    - Existing file: `packages/logging-bunyan/tests/handler.test.ts` -- review and extend
    - createBunyanHandler returns object with handle, flush, shutdown (test #1)
    - handle() does not throw on valid LogEntry (test #2)
    - flush() resolves (test #3)
    - shutdown() resolves (test #4)
    - BunyanHandlerAdapter.provides is LogHandlerPort (test #5)
    - mapLevel maps all 6 levels to Bunyan levels (test #6)
    - Target: 6 unit tests per DoD 5
  - [ ] 4.4 Run all backend adapter tests and verify they pass

**Acceptance Criteria:**

- 6 Pino tests pass
- 5 Winston tests pass
- 6 Bunyan tests pass
- 17 total backend adapter tests pass (DoD 5)

---

### Scoped Logger Adapter

#### Task Group 5: Scoped Logger Adapter Implementation

**Dependencies:** Task Groups 1, 2
**Spec Sections:** 26

This adapter is referenced in the spec but not yet implemented. It creates a per-DI-scope Logger that delegates to a LogHandler and automatically includes scopeId.

- [ ] 5.0 Implement ScopedLoggerAdapter
  - [ ] 5.1 Write 4 focused tests for the scoped logger
    - ScopedLoggerAdapter provides LoggerPort
    - ScopedLoggerAdapter requires LogHandlerPort
    - ScopedLoggerAdapter has "scoped" lifetime
    - Resolved logger includes scopeId in context (if scope context is available)
  - [ ] 5.2 Create a handler-backed logger implementation
    - File: `packages/logging/src/adapters/scoped/logger.ts`
    - Implement a Logger class that delegates log entries to a LogHandler via `handle()`
    - Reuse the parseErrorArgs pattern from MemoryLogger/ConsoleLogger
    - Include child(), withAnnotations(), isLevelEnabled(), getContext(), time(), timeAsync()
    - Support mergeContext for child loggers
    - Factory: `createHandlerLogger(handler: LogHandler, options?: { minLevel?: LogLevel }): Logger`
  - [ ] 5.3 Create ScopedLoggerAdapter
    - File: `packages/logging/src/adapters/scoped/adapter.ts`
    - `createAdapter({ provides: LoggerPort, requires: [LogHandlerPort], lifetime: "scoped", factory: ... })`
    - Factory reads handler from deps, creates handler-backed logger, calls `.child({ scopeId: scope?.id })`
  - [ ] 5.4 Create index and register exports
    - File: `packages/logging/src/adapters/scoped/index.ts`
    - Add ScopedLoggerAdapter and createHandlerLogger to adapters barrel export
    - Add ScopedLoggerAdapter to main package index.ts exports
  - [ ] 5.5 Run scoped adapter tests and verify they pass

**Acceptance Criteria:**

- ScopedLoggerAdapter is registered with correct port, requirements, and lifetime
- Handler-backed logger correctly delegates LogEntry objects to the handler
- scopeId is automatically injected into the logger context
- child() and withAnnotations() work correctly on handler-backed loggers

---

### Redaction, Sampling & Rate Limiting

#### Task Group 6: Redaction, Sampling, and Rate Limiting Implementation

**Dependencies:** Task Groups 1, 2
**Spec Sections:** 35-37
**DoD Section:** DoD 7

These logger wrappers are not yet implemented. They compose over any Logger instance to add redaction, sampling, or rate limiting.

- [ ] 6.0 Implement redaction, sampling, and rate limiting
  - [ ] 6.1 Write 8 focused tests for redaction, sampling, and rate limiting
    - withRedaction: redacts exact field name (DoD 7, test #1)
    - withRedaction: redacts wildcard field (DoD 7, test #2)
    - withRedaction: does not modify non-matching fields (DoD 7, test #3)
    - withRedaction: default censor is "[REDACTED]" (DoD 7, test #5)
    - withSampling: rate 1.0 logs all entries (DoD 7, test #7)
    - withSampling: rate 0.0 logs no entries except errors (DoD 7, test #8)
    - withSampling: alwaysLogErrors logs error/fatal (DoD 7, tests #9-10)
    - withRateLimit: drops entries exceeding limit (DoD 7, test #13)
  - [ ] 6.2 Implement withRedaction
    - File: `packages/logging/src/utils/redaction.ts`
    - Define RedactionConfig interface: { paths: ReadonlyArray<string>, censor?: string | ((value: unknown) => unknown) }
    - Implement path matching: exact, nested ("user.ssn"), wildcard ("\*.secret")
    - Apply redaction to both annotations and context before delegating to underlying logger
    - Return a new Logger wrapper that preserves child/withAnnotations with redaction
    - Default censor: "[REDACTED]"
  - [ ] 6.3 Implement withSampling
    - File: `packages/logging/src/utils/sampling.ts`
    - Define SamplingConfig interface: { rate: number, perLevel?: Partial<Record<LogLevel, number>>, alwaysLogErrors?: boolean }
    - Sampling algorithm: check alwaysLogErrors for error/fatal, look up per-level rate, use global rate as fallback, Math.random() < rate
    - Return a new Logger wrapper; child/withAnnotations preserve sampling
  - [ ] 6.4 Implement withRateLimit
    - File: `packages/logging/src/utils/rate-limit.ts`
    - Define RateLimitConfig interface: { maxEntries: number, windowMs: number, perLevel?: Partial<Record<LogLevel, number>>, strategy?: "drop" | "sample" }
    - Use a sliding window counter (timestamp + count)
    - Return a new Logger wrapper; child/withAnnotations preserve rate limit
  - [ ] 6.5 Create barrel exports and register in package index
    - Add withRedaction, withSampling, withRateLimit to `packages/logging/src/utils/index.ts`
    - Export RedactionConfig, SamplingConfig, RateLimitConfig types from package index
    - Export withRedaction, withSampling, withRateLimit functions from package index
  - [ ] 6.6 Write remaining DoD tests and run all
    - withRedaction: custom censor function (DoD 7, test #4)
    - withRedaction: child loggers preserve redaction (DoD 7, test #6)
    - withSampling: per-level rate overrides (DoD 7, test #11)
    - withRateLimit: allows entries within limit (DoD 7, test #12)
    - Target: 13 total tests per DoD 7
    - Run ONLY these tests and verify all pass

**Acceptance Criteria:**

- 13 redaction/sampling tests pass (DoD 7)
- withRedaction handles exact, wildcard, and nested paths
- withSampling correctly applies probabilistic filtering with error bypass
- withRateLimit enforces hard caps within sliding windows
- All wrappers compose correctly (can stack redaction + sampling + rate limit)

---

### Instrumentation

#### Task Group 7: Container Instrumentation Implementation

**Dependencies:** Task Groups 1, 2, 5
**Spec Sections:** 38-40
**DoD Section:** DoD 8

Container instrumentation is not yet implemented. This enables automatic logging of DI resolution events.

- [ ] 7.0 Implement container instrumentation
  - [ ] 7.1 Write 6 focused integration tests
    - instrumentContainer logs resolution events (DoD 8, test #1)
    - instrumentContainer logs errors on failed resolutions (DoD 8, test #2)
    - instrumentContainer respects portFilter (DoD 8, test #3)
    - instrumentContainer cleanup removes hooks (DoD 8, test #6)
    - instrumentContainer does not cause infinite loops (DoD 8, test #7)
    - createLoggingHook produces compatible ResolutionHook (DoD 8, test #10)
  - [ ] 7.2 Implement instrumentContainer
    - File: `packages/logging/src/instrumentation/container.ts`
    - Define AutoLogOptions interface (resolutionLevel, errorLevel, portFilter, includeTiming, minDurationMs, logScopeLifecycle)
    - Capture logger at instrumentation time (not per-event resolve)
    - Default portFilter skips "Logger" and "LogHandler" ports
    - Reentrance guard to prevent recursive logging
    - Returns cleanup function that removes hooks
    - Log scope creation and disposal when logScopeLifecycle is enabled
  - [ ] 7.3 Implement createLoggingHook
    - File: `packages/logging/src/instrumentation/hook.ts`
    - Returns a ResolutionHook that logs resolutions using provided logger
    - Compatible with container hook system
  - [ ] 7.4 Create barrel exports
    - File: `packages/logging/src/instrumentation/index.ts`
    - Export instrumentContainer, createLoggingHook, AutoLogOptions from package index
  - [ ] 7.5 Write remaining DoD tests and run all
    - instrumentContainer includes timing when enabled (DoD 8, test #4)
    - instrumentContainer respects minDurationMs (DoD 8, test #5)
    - Scope lifecycle: logs creation (DoD 8, test #8)
    - Scope lifecycle: logs disposal with resolvedCount (DoD 8, test #9)
    - Target: 10 total integration tests per DoD 8
    - Run ONLY instrumentation tests

**Acceptance Criteria:**

- 10 instrumentation integration tests pass (DoD 8)
- No infinite loops when resolving Logger/LogHandler during instrumentation
- Cleanup function correctly removes all hooks
- Timing and scope lifecycle logging work when enabled

---

### Framework Integration

#### Task Group 8: Hono Middleware and React Hooks

**Dependencies:** Task Groups 1, 2, 3
**Spec Sections:** 41-43
**DoD Section:** DoD 9

Framework integration is not yet implemented. This adds Hono logging middleware and React logging hooks/providers.

- [ ] 8.0 Implement framework integration
  - [ ] 8.1 Write 7 focused tests for Hono and React integration
    - Hono: creates child logger with request context (DoD 9, test #1)
    - Hono: logs request start with method and path (DoD 9, test #2)
    - Hono: logs response with status and duration (DoD 9, test #3)
    - Hono: skips skipPaths (DoD 9, test #4)
    - Hono: uses warn for 4xx, error for 5xx (DoD 9, tests #6-7)
    - React: useLogger returns logger from provider (DoD 9, test #8)
    - React: nested LoggingProviders create context chain (DoD 9, test #11)
  - [ ] 8.2 Implement Hono logging middleware
    - File: `packages/logging/src/framework/hono.ts`
    - Define HonoLoggingOptions interface (logger, level, includeRequestBody, includeResponseBody, redactHeaders, redactPaths, skipPaths)
    - Implement loggingMiddleware(options): MiddlewareHandler
    - Extract context from headers via extractContextFromHeaders
    - Create child logger with request context
    - Log "Incoming request" at start, "Request completed" at end
    - Response level mapping: 2xx/3xx = configured level, 4xx = warn, 5xx = error
    - Set child logger on Hono context
    - Note: hono should be a peer/dev dependency, not a runtime dependency
  - [ ] 8.3 Implement React logging components
    - File: `packages/logging/src/framework/react.tsx`
    - Implement LoggingProvider (creates React context, child logger from context prop)
    - Implement useLogger() hook (reads from nearest LoggingProvider, throws if missing)
    - Implement useChildLogger(context) hook (memoized child logger)
    - Implement useLifecycleLogger(componentName) hook (logs mount/unmount at debug level)
    - Support nested LoggingProviders with context chain
    - Note: react should be a peer/dev dependency
  - [ ] 8.4 Create barrel exports
    - File: `packages/logging/src/framework/index.ts`
    - Export loggingMiddleware, HonoLoggingOptions
    - Export LoggingProvider, LoggingProviderProps, useLogger, useChildLogger, useLifecycleLogger
    - Add framework exports to package index.ts
  - [ ] 8.5 Write remaining DoD tests and run all
    - Hono: redacts configured headers (DoD 9, test #5)
    - React: useChildLogger returns child with merged context (DoD 9, test #9)
    - React: useLifecycleLogger logs mount and unmount (DoD 9, test #10)
    - Target: 11 total tests per DoD 9
    - Run ONLY framework integration tests

**Acceptance Criteria:**

- 11 framework integration tests pass (DoD 9)
- Hono middleware correctly logs request/response with appropriate levels
- React hooks provide context-aware logging through component tree
- Nested LoggingProviders correctly chain context

---

### Tracing Integration

#### Task Group 9: Tracing Integration

**Dependencies:** Task Groups 1, 2
**Spec Sections:** 44-46
**DoD Section:** DoD 10

Tracing integration is not yet implemented. Log entries should include trace/span IDs when tracing is active.

- [ ] 9.0 Implement tracing integration
  - [ ] 9.1 Write 4 focused integration tests
    - Log entries include traceId when span is active (DoD 10, test #1)
    - Log entries include spanId when span is active (DoD 10, test #2)
    - Log entries have no spans field when tracing not active (DoD 10, test #3)
    - JSON formatter outputs traceId/spanId from spans (DoD 10, test #5)
  - [ ] 9.2 Implement tracing-aware logger decorator
    - File: `packages/logging/src/tracing/span-injection.ts`
    - Implement a utility or decorator that detects active spans from `@hex-di/tracing` context
    - Use Approach 1 from spec: Logger adapter detects active span at log time
    - When tracing is available: read active span, set LogEntry.spans = [{ traceId, spanId }]
    - When tracing is not available: LogEntry.spans is undefined (graceful degradation)
    - Optional dependency on @hex-di/tracing -- use dynamic import or interface-based detection
  - [ ] 9.3 Integrate span injection into Logger adapters
    - Modify the handler-backed logger (from Task Group 5) to support optional span injection
    - The Memory logger and Console logger can also optionally use span injection
    - Ensure NoOp adapter is not affected (no span injection in no-op path)
  - [ ] 9.4 Create barrel exports
    - File: `packages/logging/src/tracing/index.ts`
    - Export any public tracing integration API
    - Add to package index.ts
  - [ ] 9.5 Write remaining DoD tests and run all
    - Nested spans: inner span IDs appear in log entries (DoD 10, test #4)
    - Pretty formatter appends traceId from spans (DoD 10, test #6)
    - Target: 6 total integration tests per DoD 10
    - Run ONLY tracing integration tests

**Acceptance Criteria:**

- 6 tracing integration tests pass (DoD 10)
- Log entries correctly include traceId/spanId when tracing is active
- Graceful degradation when tracing is not available
- Formatters correctly output trace context

---

### Testing Utilities

#### Task Group 10: Testing Utilities Verification

**Dependencies:** Task Groups 1, 2
**Spec Sections:** 51-54
**DoD Section:** DoD 11

Testing utilities (assertLogEntry, LogEntryMatcher, createMemoryLogger) are already implemented. This group writes the complete DoD test suite to verify correctness.

- [ ] 10.0 Complete testing utilities test suite
  - [ ] 10.1 Write testing utilities tests -- `packages/logging/tests/testing-utils.test.ts`
    - Existing file: `packages/logging/tests/unit/testing-utils.test.ts` -- review and extend
    - assertLogEntry returns matching entry on match (test #1)
    - assertLogEntry throws when no match found (test #2)
    - assertLogEntry matches by level (test #3)
    - assertLogEntry matches by exact message string (test #4)
    - assertLogEntry matches by RegExp message (test #5)
    - assertLogEntry matches by annotation subset (test #6)
    - assertLogEntry matches by context subset (test #7)
    - assertLogEntry matches by hasError: true (test #8)
    - assertLogEntry matches by hasError: false (test #9)
    - assertLogEntry empty matcher matches first entry (test #10)
    - Error message includes available entries (test #11)
    - createMemoryLogger defaults to "trace" (test #12)
    - createMemoryLogger("warn") suppresses trace/debug/info (test #13)
    - Target: 13 unit tests per DoD 11
  - [ ] 10.2 Run testing utilities tests and verify they pass

**Acceptance Criteria:**

- 13 testing utilities tests pass (DoD 11)
- assertLogEntry matching logic is correct for all field types
- Error messages are descriptive and include available entries

---

### Inspection & Reporting

#### Task Group 11: Inspection Module Implementation

**Dependencies:** Task Groups 1, 2, 6
**Spec Sections:** 47-50
**DoD Section:** DoD 12

The entire inspection module is not yet implemented. This is the most complex new module.

- [ ] 11.0 Implement the inspection module
  - [ ] 11.1 Write 8 focused tests for inspection
    - getSnapshot returns valid LoggingSnapshot (DoD 12, test #1)
    - getEntryCounts returns zero initially (DoD 12, test #2)
    - getEntryCounts increments on each log entry (DoD 12, test #3)
    - getErrorRate returns 0 when no entries (DoD 12, test #5)
    - getErrorRate calculates correctly (DoD 12, test #6)
    - getHandlerInfo returns handler metadata (DoD 12, test #8)
    - subscribe fires "entry-logged" (DoD 12, test #17)
    - LoggerInspectorPort.name is "LoggerInspector" (DoD 12, test #20)
  - [ ] 11.2 Define inspection types
    - File: `packages/logging/src/inspection/snapshot.ts`
    - LoggingSnapshot interface (timestamp, totalEntries, entriesByLevel, errorRate, handlers, samplingActive, redactionActive, contextDepth)
    - HandlerInfo interface (type, name, active, entryCount, formatterType?, minLevel?)
    - SamplingStatistics, RedactionStatistics, ContextUsageStatistics interfaces
    - TimeWindowOptions, RecentEntriesOptions interfaces
  - [ ] 11.3 Define inspection events
    - File: `packages/logging/src/inspection/events.ts`
    - LoggerInspectorEvent discriminated union (entry-logged, error-rate-threshold, handler-error, sampling-dropped, redaction-applied, handler-added, handler-removed, snapshot-changed)
    - LoggerInspectorListener type
  - [ ] 11.4 Define LoggerInspector interface and port
    - File: `packages/logging/src/inspection/inspector.ts`
    - LoggerInspector interface with all methods (getSnapshot, getEntryCounts, getErrorRate, getHandlerInfo, getSamplingStatistics, getRedactionStatistics, getRecentEntries, getContextUsage, subscribe)
    - libraryName: "logging" readonly property
    - File: `packages/logging/src/inspection/inspector-port.ts`
    - LoggerInspectorPort definition
  - [ ] 11.5 Implement createLoggerInspectorAdapter
    - File: `packages/logging/src/inspection/inspector.ts` (in same file or separate impl file)
    - Factory: createLoggerInspectorAdapter({ logger, handlers, samplingConfig?, redactionConfig? }): LoggerInspector
    - Maintain running counters for entry counts per level (O(1))
    - Implement sliding window error rate calculation
    - Implement event subscription/unsubscription pattern
    - getRecentEntries delegates to MemoryLogger if present, empty array otherwise
    - getSamplingStatistics and getRedactionStatistics from config
  - [ ] 11.6 Implement container integration
    - File: `packages/logging/src/inspection/container-integration.ts`
    - Register lazy factory on container.inspector for getLoggerInspector()
    - Inspector is only created on first access (zero overhead in production)
  - [ ] 11.7 Create barrel exports
    - File: `packages/logging/src/inspection/index.ts`
    - Export all types, interfaces, port, and factory
    - Add inspection exports to package index.ts
  - [ ] 11.8 Write type-level tests -- `packages/logging/tests/inspection.test-d.ts`
    - LoggerInspector satisfies LibraryInspector (DoD 12 type test #1)
    - LoggingSnapshot fields are all readonly (DoD 12 type test #2)
    - LoggerInspectorEvent is discriminated union on type (DoD 12 type test #3)
  - [ ] 11.9 Write remaining DoD tests and run all
    - getEntryCounts tracks all 6 levels independently (DoD 12, test #4)
    - getErrorRate respects time window (DoD 12, test #7)
    - getHandlerInfo includes type discriminant (DoD 12, test #9)
    - getSamplingStatistics returns zero initially (DoD 12, test #10)
    - getSamplingStatistics tracks accepted/dropped (DoD 12, test #11)
    - getRedactionStatistics tracks count (DoD 12, test #12)
    - getRecentEntries returns entries from Memory (DoD 12, test #13)
    - getRecentEntries returns empty for NoOp (DoD 12, test #14)
    - getRecentEntries respects limit (DoD 12, test #15)
    - getContextUsage reports field frequency (DoD 12, test #16)
    - subscribe fires "error-rate-threshold" (DoD 12, test #18)
    - subscribe fires "snapshot-changed" (DoD 12, test #19)
    - Target: 20 unit tests + 3 type tests per DoD 12
    - Run ONLY inspection tests

**Acceptance Criteria:**

- 20 inspection unit tests pass (DoD 12)
- 3 inspection type-level tests pass (DoD 12)
- LoggerInspector correctly tracks entry counts, error rate, handler info
- Event subscription/unsubscription works correctly
- Lazy creation ensures zero overhead when inspector is not accessed

---

### Final Verification

#### Task Group 12: Full Test Suite Verification and Package Finalization

**Dependencies:** Task Groups 1-11

- [ ] 12.0 Run full verification and finalize packages
  - [ ] 12.1 Run full test suite for @hex-di/logging
    - `pnpm --filter @hex-di/logging test`
    - Verify all ~148 unit/integration tests pass
  - [ ] 12.2 Run type-level tests
    - `pnpm --filter @hex-di/logging test:types`
    - Verify all ~17 type-level tests pass
  - [ ] 12.3 Run backend adapter tests
    - `pnpm --filter @hex-di/logging-pino test`
    - `pnpm --filter @hex-di/logging-winston test`
    - `pnpm --filter @hex-di/logging-bunyan test`
    - Verify all 17 backend tests pass
  - [ ] 12.4 Run typecheck
    - `pnpm --filter @hex-di/logging typecheck`
    - `pnpm --filter @hex-di/logging-pino typecheck`
    - `pnpm --filter @hex-di/logging-winston typecheck`
    - `pnpm --filter @hex-di/logging-bunyan typecheck`
    - Verify 0 errors across all packages
  - [ ] 12.5 Run lint
    - `pnpm --filter @hex-di/logging lint`
    - Verify 0 errors, no `any` types, no type casts, no eslint-disable
  - [ ] 12.6 Verify public API surface
    - Confirm all exports from `packages/logging/src/index.ts` match the spec's API reference (Section 55-63)
    - Confirm no `any` types in source: `grep -r "any" packages/logging/src/`
    - Confirm no type casts: `grep -r " as " packages/logging/src/`
    - Confirm no eslint-disable: `grep -r "eslint-disable" packages/logging/src/`
  - [ ] 12.7 Review test coverage gaps
    - Compare test counts against DoD summary: ~115 unit + ~17 type + ~16 integration + ~17 backend = ~165 total
    - Identify any critical gaps and write up to 5 additional tests if needed
    - Do NOT aim for exhaustive coverage beyond DoD requirements

**Acceptance Criteria:**

- All ~165 tests pass across all 4 packages
- 0 typecheck errors
- 0 lint errors
- No `any` types, no type casts, no eslint-disable in source
- Public API matches spec sections 55-63
- All DoD sections 1-12 satisfied

---

## Execution Order

The recommended implementation sequence, accounting for dependencies:

```
Phase 1: Foundation (can run in parallel)
  Task Group 1: Core Types Verification and Test Completion
  Task Group 3: Context Propagation Tests
  Task Group 4: Backend Adapter Tests

Phase 2: Adapter Behaviors (depends on Phase 1)
  Task Group 2: Logger Port Behavior Tests
  Task Group 10: Testing Utilities Verification

Phase 3: New Implementations (depends on Phase 2)
  Task Group 5: Scoped Logger Adapter
  Task Group 6: Redaction, Sampling & Rate Limiting

Phase 4: Advanced Features (depends on Phase 3)
  Task Group 7: Container Instrumentation
  Task Group 8: Framework Integration (Hono + React)
  Task Group 9: Tracing Integration

Phase 5: Inspection (depends on Phases 3-4)
  Task Group 11: Inspection Module

Phase 6: Finalization (depends on all)
  Task Group 12: Full Test Suite Verification
```

### Why this order

1. **Phase 1** verifies the already-implemented foundation has no bugs. These groups have zero code dependencies on each other and can be done in parallel.
2. **Phase 2** tests Logger behavior through adapters. It depends on Phase 1 because port definitions and core types must be verified first.
3. **Phase 3** builds the missing adapter (Scoped) and the wrapper utilities (redaction, sampling, rate limiting). These depend on the Logger interface being verified.
4. **Phase 4** implements cross-cutting features that build on top of the core logging system. Instrumentation needs the scoped adapter. Framework integration needs context propagation. Tracing needs the Logger adapter pattern.
5. **Phase 5** implements inspection, which needs to observe the entire logging pipeline including sampling and redaction statistics.
6. **Phase 6** runs the full verification checklist from DoD section 17.

### Specialization groupings

| Specialist       | Task Groups |
| ---------------- | ----------- |
| **Types/Core**   | 1, 3        |
| **Adapters**     | 2, 4, 5     |
| **Utilities**    | 6, 10       |
| **Integration**  | 7, 8, 9     |
| **Inspection**   | 11          |
| **Verification** | 12          |

## Test Count Summary

| DoD Section                    | Test Count | Task Group |
| ------------------------------ | ---------- | ---------- |
| DoD 1: Core Types              | 13 + 8     | 1          |
| DoD 2: Logger Port             | 24 + 6     | 1, 2       |
| DoD 3: Handler & Formatter     | 20         | 1          |
| DoD 4: Built-in Adapters       | 33         | 2          |
| DoD 5: Backend Adapters        | 17         | 4          |
| DoD 6: Context Propagation     | 14         | 3          |
| DoD 7: Redaction & Sampling    | 13         | 6          |
| DoD 8: Instrumentation         | 10         | 7          |
| DoD 9: Framework Integration   | 11         | 8          |
| DoD 10: Tracing Integration    | 6          | 9          |
| DoD 11: Testing Utilities      | 13         | 10         |
| DoD 12: Inspection & Reporting | 20 + 3     | 11         |
| **Total**                      | **~211**   |            |
