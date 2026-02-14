# GxP Compliance Analysis Report: @hex-di/logger Stack

**Report Date:** 2026-02-10
**Analyst:** Automated GxP Compliance Reviewer
**Scope:** `@hex-di/logger` (core), `@hex-di/logger-bunyan`, `@hex-di/logger-pino`, `@hex-di/logger-winston`, `@hex-di/logger-react`
**Version:** All packages at `0.1.0`

---

## 1. Executive Summary

**Overall GxP Readiness Score: 5.8 / 10** -- Weakest package stack in the HexDI ecosystem.

The @hex-di/logger stack provides a well-structured hexagonal logging framework with clean port/adapter separation, comprehensive type-safe log levels, and elegant decorator-pattern utilities (redaction, sampling, rate limiting). However, it exhibits critical gaps that make it unsuitable for GxP-regulated environments without substantial remediation:

- **Silent error swallowing** throughout the handler pipeline: if `handler.handle()` throws, the error is not caught, propagated, or logged to a fallback. The caller (HandlerLoggerImpl) calls `this._handler.handle(entry)` without any try/catch whatsoever.
- **No input validation** on annotations: the `Record<string, unknown>` type accepts functions, symbols, circular references, and other non-serializable values that will silently corrupt or crash downstream handlers.
- **Bunyan flush/shutdown are no-ops**: the `flush()` and `shutdown()` methods in the Bunyan adapter return immediately with empty promise bodies and comments stating "Bunyan auto-flushes" and "Bunyan doesn't have a close method" -- there is no guarantee of log delivery on process exit.
- **Pino flush is fire-and-forget**: `logger.flush()` is called synchronously, and the returned Promise resolves immediately via `Promise.resolve()`, providing no actual confirmation that the flush completed.
- **Console output silently skipped**: when `getConsole()` returns `undefined`, the ConsoleLoggerImpl `_log` method silently discards the formatted log entry with no fallback or warning.
- **Sampling uses `Math.random()`**: non-deterministic and non-reproducible, making it impossible to reconstruct the exact set of sampled entries during an audit.
- **Adapter tests only verify "doesn't throw"**: all three external adapter test suites (Bunyan, Pino, Winston) primarily assert `expect(() => handler.handle(...)).not.toThrow()` without ever capturing or verifying the actual output content.
- **No error injection tests**: no test in the entire stack simulates a handler failure, formatter exception, or transport error.

Strengths include zero runtime dependencies in the core logger, excellent redaction infrastructure, type-safe log level enforcement via the union type, readonly/frozen data structures, and comprehensive inspection/observability tooling.

| Package                  | Score  | Critical Issues                                                             |
| ------------------------ | ------ | --------------------------------------------------------------------------- |
| `@hex-di/logger` (core)  | 6.5/10 | Silent error handling, no annotation validation, non-deterministic sampling |
| `@hex-di/logger-bunyan`  | 5.0/10 | No-op flush/shutdown, "doesn't throw" tests only                            |
| `@hex-di/logger-pino`    | 5.0/10 | Fire-and-forget flush, "doesn't throw" tests only                           |
| `@hex-di/logger-winston` | 6.0/10 | Destructive flush (calls `logger.end()`), "doesn't throw" tests only        |
| `@hex-di/logger-react`   | 6.0/10 | No test file found, no error boundary integration                           |

---

## 2. Package Overview

### 2.1 @hex-di/logger (Core)

**Purpose:** Zero-dependency structured logging framework following hexagonal architecture.

**Source location:** `packages/logger/src/`

**Key components:**

- **Ports:** `LoggerPort`, `LogHandlerPort`, `LogFormatterPort` -- the three contract interfaces
- **Types:** `LogLevel` (6-level union), `LogEntry` (structured record), `LogContext` (request-scoped metadata)
- **Adapters:** ConsoleLogger, MemoryLogger, NoOpLogger, ScopedLogger (handler-backed)
- **Utilities:** Redaction (`withRedaction`), Sampling (`withSampling`), Rate Limiting (`withRateLimit`)
- **Integrations:** Tracing span injection, Hono middleware, Container instrumentation
- **Inspection:** Full observability subsystem with snapshots, subscriptions, error rate monitoring
- **Testing:** `MemoryLogger` + `assertLogEntry` matcher utility

**Dependencies:** Zero runtime dependencies. Peer dependency on `@hex-di/core` and optionally `hono`.

**File count:** 48 source files across `src/`, 2 test files in `tests/`.

### 2.2 @hex-di/logger-bunyan

**Purpose:** Bridges `LogHandler` to Bunyan logger instances.

**Source location:** `packages/logger-bunyan/src/`

**Files:** `handler.ts`, `level-map.ts`, `index.ts` (3 source files, 1 test file)

**Dependencies:** `bunyan@^1.8.15`

### 2.3 @hex-di/logger-pino

**Purpose:** Bridges `LogHandler` to Pino logger instances.

**Source location:** `packages/logger-pino/src/`

**Files:** `handler.ts`, `level-map.ts`, `index.ts` (3 source files, 1 test file)

**Dependencies:** `pino@^9.6.0`

### 2.4 @hex-di/logger-winston

**Purpose:** Bridges `LogHandler` to Winston logger instances.

**Source location:** `packages/logger-winston/src/`

**Files:** `handler.ts`, `index.ts` (2 source files, 1 test file)

**Dependencies:** `winston@^3.17.0`

### 2.5 @hex-di/logger-react

**Purpose:** React context-based logger propagation through the component tree.

**Source location:** `packages/logger-react/src/`

**Files:** `react.tsx`, `index.ts` (2 source files, 0 test files found)

**Dependencies:** Peer dependency on `react@>=18.0.0`

---

## 3. GxP Compliance Matrix

| #   | Criterion                       | Core Logger | Bunyan  |  Pino   | Winston |  React  | Weight   |
| --- | ------------------------------- | :---------: | :-----: | :-----: | :-----: | :-----: | -------- |
| 1   | Data Integrity (ALCOA+)         |      7      |    6    |    6    |    6    |    5    | High     |
| 2   | Traceability & Audit Trail      |      8      |    7    |    7    |    7    |    5    | High     |
| 3   | Determinism & Reproducibility   |      5      |    6    |    6    |    6    |    6    | High     |
| 4   | Error Handling & Recovery       |      3      |    2    |    3    |    5    |    4    | Critical |
| 5   | Validation & Input Verification |      4      |    5    |    5    |    5    |    4    | High     |
| 6   | Change Control & Versioning     |      8      |    8    |    8    |    8    |    7    | Medium   |
| 7   | Testing & Verification          |      7      |    3    |    3    |    3    |    1    | High     |
| 8   | Security                        |      7      |    5    |    5    |    5    |    5    | High     |
| 9   | Documentation                   |      8      |    6    |    6    |    6    |    6    | Medium   |
| 10  | Compliance-Specific for Logging |      6      |    5    |    5    |    6    |    4    | High     |
|     | **Weighted Average**            |   **6.5**   | **5.0** | **5.0** | **6.0** | **6.0** |          |

---

## 4. Detailed Analysis

### 4.1 Data Integrity (ALCOA+)

**Attributable:** Partially supported. `LogContext` includes `userId`, `sessionId`, `correlationId`, and `requestId` fields, but these are all optional and not enforced:

```typescript
// packages/logger/src/types/log-entry.ts (lines 14-23)
export interface LogContext {
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly scopeId?: string;
  readonly service?: string;
  readonly environment?: string;
  readonly [key: string]: unknown;
}
```

The open index signature `[key: string]: unknown` weakens attribution guarantees -- arbitrary keys can be injected without type checking.

**Legible:** Good. Three built-in formatters produce human- and machine-readable output:

```typescript
// packages/logger/src/utils/formatting.ts (lines 15-46, 63-84, 89-94)
// jsonFormatter: single-line JSON with ISO timestamps
// prettyFormatter: "2026-02-10T... [INFO] message {annotations}"
// minimalFormatter: "[INFO] message"
```

**Contemporaneous:** Timestamps use `Date.now()` at entry creation time, which is accurate to the call site:

```typescript
// packages/logger/src/adapters/console/logger.ts (lines 184-191)
const entry: LogEntry = {
  level,
  message,
  timestamp: Date.now(),
  context: this._context,
  annotations: mergedAnnotations,
  error,
};
```

However, `Date.now()` provides millisecond-only precision. For high-frequency GxP logging, sub-millisecond precision (`performance.now()` or `process.hrtime.bigint()`) may be needed.

**Original:** `LogEntry` fields are declared `readonly`, and `NOOP_LOGGER` is `Object.freeze()`-d. However, entries stored in MemoryLogger's internal array are mutable through the shared reference. The `annotations` field uses `Readonly<Record<string, unknown>>` at the type level but does not deep-freeze values.

**Accurate:** Log levels are enforced through the union type system:

```typescript
// packages/logger/src/types/log-level.ts (line 13)
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
```

This prevents invalid levels at compile time, which is excellent. The numeric ordering is explicit and correct:

```typescript
// packages/logger/src/types/log-level.ts (lines 18-25)
export const LogLevelValue: Readonly<Record<LogLevel, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};
```

### 4.2 Traceability & Audit Trail

**Correlation ID support:** Well-designed. The Hono middleware automatically extracts correlation and request IDs from headers and propagates them through child loggers:

```typescript
// packages/logger/src/framework/hono.ts (lines 107-128)
headers["x-correlation-id"] = c.req.header("x-correlation-id");
headers["x-request-id"] = c.req.header("x-request-id");
// ...
const childLogger = options.logger.child({
  ...extractedContext,
  requestId: extractedContext.requestId ?? generateRequestId(),
});
```

**Span injection:** The `withSpanInjection` wrapper enriches log annotations with `traceId` and `spanId` from a `SpanProvider`:

```typescript
// packages/logger/src/tracing/span-injection.ts (lines 50-66)
function mergeSpanAnnotations(
  annotations: Record<string, unknown> | undefined,
  spans: ReadonlyArray<SpanInfo>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (annotations) {
    for (const key of Object.keys(annotations)) {
      result[key] = annotations[key];
    }
  }
  if (spans.length > 0) {
    result.traceId = spans[0].traceId;
    result.spanId = spans[0].spanId;
    result.__spans = spans;
  }
  return result;
}
```

**Gap:** The default `createSpanProvider()` returns a no-op. Actual tracing integration requires explicit wiring by the consumer, which is a manual step that could be missed in a GxP deployment.

**Child logger chain:** Child loggers correctly propagate parent context via `mergeContext()`, enabling request-scoped audit trails. The `getContext()` method on every logger allows context inspection.

### 4.3 Determinism & Reproducibility

**CRITICAL GAP -- Sampling uses `Math.random()`:**

```typescript
// packages/logger/src/utils/sampling.ts (lines 26-35)
function shouldSample(level: LogLevel, config: SamplingConfig): boolean {
  const alwaysLogErrors = config.alwaysLogErrors ?? true;
  if (alwaysLogErrors && (level === "error" || level === "fatal")) {
    return true;
  }
  const rate = config.perLevel?.[level] ?? config.rate;
  return Math.random() < rate;
}
```

`Math.random()` is non-seedable and non-reproducible. In a GxP environment, this means:

1. You cannot reproduce which specific log entries were sampled during an incident.
2. You cannot audit or verify the sampling behavior deterministically.
3. Test results are non-deterministic when sampling is active.

The same issue affects the rate limiter's "sample" strategy:

```typescript
// packages/logger/src/utils/rate-limit.ts (lines 55-57)
if (config.strategy === "sample") {
  return Math.random() < limit / (counter.timestamps.length + 1);
}
```

**Log level filtering is deterministic:** `shouldLog()` uses a pure numeric comparison, which is correct:

```typescript
// packages/logger/src/types/log-level.ts (lines 34-36)
export function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LogLevelValue[level] >= LogLevelValue[minLevel];
}
```

**Request ID generation is non-deterministic:**

```typescript
// packages/logger/src/framework/hono.ts (lines 18-21)
function generateRequestId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${time}-${random}`;
}
```

This uses `Math.random()` instead of `crypto.randomUUID()`, which is both less unique and non-auditable.

### 4.4 Error Handling & Recovery

**CRITICAL GAP -- Handler errors are completely unhandled:**

The `HandlerLoggerImpl._log()` method calls `this._handler.handle(entry)` directly without any try/catch:

```typescript
// packages/logger/src/adapters/scoped/logger.ts (lines 145-175)
private _log(
  level: LogLevel,
  message: string,
  error: Error | undefined,
  annotations: Record<string, unknown> | undefined
): void {
  if (!shouldLog(level, this._minLevel)) {
    return;
  }
  // ... merge annotations, create entry ...
  this._handler.handle(entry);  // <-- NO try/catch. Exception propagates to caller.
}
```

If the handler throws (e.g., Bunyan stream write fails, Pino serialization error, Winston transport error), the exception propagates up to the application code that called `logger.info()`. This violates a fundamental GxP principle: logging infrastructure should never disrupt application behavior.

**Console logger silently discards output when console is unavailable:**

```typescript
// packages/logger/src/adapters/console/logger.ts (lines 196-200)
const cons = getConsole();
if (cons) {
  cons[method](formatted);
}
// If cons is undefined, the formatted entry is silently lost
```

No fallback mechanism. No error event. No counter. The entry is formatted (CPU cost paid) and then discarded.

**Bunyan flush and shutdown are completely empty:**

```typescript
// packages/logger-bunyan/src/handler.ts (lines 79-87)
async flush(): Promise<void> {
  // Bunyan auto-flushes
},
async shutdown(): Promise<void> {
  // Bunyan doesn't have a close method; streams are cleaned up
  // when the process exits.
},
```

This is problematic because Bunyan streams with custom destinations (e.g., network streams, rotating file streams) may have buffered data that is NOT auto-flushed.

**Pino flush is fire-and-forget:**

```typescript
// packages/logger-pino/src/handler.ts (lines 74-83)
flush(): Promise<void> {
  logger.flush();
  return Promise.resolve();
},
shutdown(): Promise<void> {
  logger.flush();
  return Promise.resolve();
},
```

`pino.flush()` accepts a callback that fires when flushing is complete. This implementation ignores that callback and immediately resolves the promise. Buffered log entries may be lost on process exit.

**Winston flush is destructive:**

```typescript
// packages/logger-winston/src/handler.ts (lines 91-108)
async flush(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let finished = false;
    logger.on("finish", () => {
      if (!finished) { finished = true; resolve(); }
    });
    logger.on("error", (err: Error) => {
      if (!finished) { finished = true; reject(err); }
    });
    logger.end();  // <-- ENDS THE LOGGER. No more writes possible.
  });
},
```

Calling `logger.end()` terminates the writable stream. After `flush()`, the handler can no longer accept new log entries. This is a one-shot flush that destroys the handler, which is semantically incorrect for a `flush()` method that should be re-entrant.

**Positive: Reentrance guard in instrumentation hook:**

```typescript
// packages/logger/src/instrumentation/hook.ts (lines 57-79)
isResolving = true;
try {
  // ... logging ...
} finally {
  isResolving = false;
}
```

This correctly prevents infinite recursion when the logger itself triggers a container resolution.

### 4.5 Validation & Input Verification

**Annotations accept arbitrary values without validation:**

```typescript
// packages/logger/src/ports/logger.ts (lines 24, 29, etc.)
trace(message: string, annotations?: Record<string, unknown>): void;
debug(message: string, annotations?: Record<string, unknown>): void;
```

The `Record<string, unknown>` type allows:

- Functions (non-serializable, will cause `JSON.stringify` to drop the key)
- Symbols (non-serializable)
- Circular references (will cause `JSON.stringify` to throw `TypeError: Converting circular structure to JSON`)
- `undefined` values (dropped by `JSON.stringify`)
- `BigInt` values (`JSON.stringify` throws `TypeError: Do not know how to serialize a BigInt`)

No runtime validation exists anywhere in the pipeline.

**Log level type safety is excellent at compile time:** The `LogLevel` union type prevents invalid levels. However, the `LogContext` interface's index signature `[key: string]: unknown` undermines type safety for context fields.

**Hono middleware does not validate header values:**

```typescript
// packages/logger/src/utils/context.ts (lines 42-58)
export function extractContextFromHeaders(
  headers: Record<string, string | undefined>
): Partial<LogContext> {
  const context: Record<string, unknown> = {};
  const correlationId = headers[CORRELATION_ID_HEADER];
  if (correlationId) {
    context.correlationId = correlationId; // No length check, no format validation
  }
  // ...
}
```

A malicious client could inject extremely long correlation IDs or IDs containing control characters, which would flow into every log entry without sanitization.

### 4.6 Change Control & Versioning

**Port/adapter boundary is clean and well-defined.** The hexagonal architecture is exemplary:

```
LoggerPort ---> Logger interface
                  |
                  +-- ConsoleLoggerImpl (built-in)
                  +-- MemoryLoggerImpl (testing)
                  +-- HandlerLoggerImpl --> LogHandlerPort
                  +-- NOOP_LOGGER                |
                                                 +-- BunyanHandler
                                                 +-- PinoHandler
                                                 +-- WinstonHandler
```

Adapters can be swapped via DI registration without any code changes. Each adapter registers against the same `LogHandlerPort`:

```typescript
// packages/logger-bunyan/src/handler.ts (lines 95-100)
export const BunyanHandlerAdapter = createAdapter({
  provides: LogHandlerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createBunyanHandler({ name: "app" }),
});
```

**Decorator wrappers compose cleanly:**

```typescript
// Usage pattern (compositional):
const logger = withRedaction(withSampling(withSpanInjection(baseLogger), { rate: 0.1 }), {
  paths: ["password", "ssn"],
});
```

Each wrapper returns a fresh `Logger` instance, preserving immutability.

### 4.7 Testing & Verification

**Core logger inspection tests are thorough:** 20 tests covering snapshots, entry counting, error rate calculation, sampling statistics, redaction statistics, recent entries, context usage, and event subscriptions.

**Core logger provides a dedicated testing toolkit:**

```typescript
// packages/logger/src/testing/assertions.ts (lines 29-40)
export function assertLogEntry(
  entries: ReadonlyArray<LogEntry>,
  matcher: LogEntryMatcher
): LogEntry {
  const found = entries.find(entry => matchesEntry(entry, matcher));
  if (!found) {
    const matcherStr = JSON.stringify(matcher, null, 2);
    const entriesStr = entries.map(e => `  ${e.level}: ${e.message}`).join("\n");
    throw new Error(`No log entry matching:\n${matcherStr}\n\nAvailable entries:\n${entriesStr}`);
  }
  return found;
}
```

**CRITICAL GAP -- Adapter tests only check "doesn't throw":**

Bunyan handler test (representative of all three):

```typescript
// packages/logger-bunyan/tests/handler.test.ts (lines 49-54)
it("handle does not throw for basic entry", () => {
  const handler = createBunyanHandler({
    name: "test",
    streams: [{ stream: createSilentStream() }],
  });
  expect(() => handler.handle(makeEntry())).not.toThrow();
});
```

All three adapter test suites (Bunyan: 9 tests, Pino: 9 tests, Winston: 7 tests) follow this pattern. None capture the actual output produced by the backend library. None verify:

- That the log message appears in the output
- That context fields are correctly serialized
- That the correct log level is used in the backend
- That error objects are properly attached
- That span IDs are present in the output

**No error injection tests exist anywhere:**

- No test simulates a handler that throws during `handle()`
- No test verifies behavior when `flush()` fails
- No test checks what happens when a formatter throws
- No test exercises the console logger when `getConsole()` returns undefined

**No test file found for logger-react.** The `tests/react.test.tsx` file does not exist, meaning the React integration (LoggingProvider, useLogger, useChildLogger, useLifecycleLogger) is completely untested.

### 4.8 Security

**Redaction support is well-designed but opt-in:**

```typescript
// packages/logger/src/utils/redaction.ts (lines 17-20)
export interface RedactionConfig {
  readonly paths: ReadonlyArray<string>;
  readonly censor?: string | ((value: unknown) => unknown);
}
```

The redaction engine supports exact key matching, nested path matching, and wildcard patterns:

```typescript
// packages/logger/src/utils/redaction.ts (lines 81-108)
function shouldRedact(key, fullPath, currentPath, paths): boolean {
  for (const pattern of paths) {
    // Exact: "password" matches at any depth
    if (!pattern.includes(".") && !pattern.includes("*") && pattern === key) return true;
    // Nested: "user.ssn" matches full path
    if (!pattern.includes("*") && pattern.includes(".") && fullPath === pattern) return true;
    // Wildcard: "*.secret" matches nested but not top-level
    if (pattern.startsWith("*.")) {
      const wildcardKey = pattern.slice(2);
      if (key === wildcardKey && currentPath !== "") return true;
    }
  }
  return false;
}
```

**Gap:** Redaction is not applied by default. If a developer creates a logger without `withRedaction()`, all annotations flow through unredacted. There is no "deny-by-default" mechanism.

**Gap:** The `message` string itself is never redacted. Sensitive data in the message parameter bypasses redaction entirely. For example, `logger.info("User SSN is 123-45-6789")` will appear in plain text regardless of redaction config.

**Hono middleware supports header redaction:**

```typescript
// packages/logger/src/framework/hono.ts (lines 113-119)
for (const name of redactHeaders) {
  const value = c.req.header(name);
  if (value !== undefined) {
    headerAnnotations[`header.${name}`] = "[REDACTED]";
  }
}
```

**Gap:** No log injection protection. Log messages are passed directly to formatters without sanitization. Newline characters, ANSI escape codes, and other control characters in messages could compromise log file integrity.

### 4.9 Documentation

**TSDoc coverage is comprehensive.** Every port, interface, function, and type has JSDoc comments with `@packageDocumentation` headers. The code is self-documenting with descriptive type names.

**Gap:** No standalone API documentation, usage guides, or GxP configuration guides exist outside the source code.

**Gap:** The `LogHandler` port's `handle()` method documentation does not specify the error contract. Implementors do not know whether they should throw, swallow, or report errors through an alternative channel.

### 4.10 Compliance-Specific for Logging

**Structured logging:** Fully supported through `LogEntry`:

```typescript
// packages/logger/src/types/log-entry.ts (lines 28-39)
export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: number;
  readonly context: LogContext;
  readonly annotations: Readonly<Record<string, unknown>>;
  readonly error?: Error;
  readonly spans?: ReadonlyArray<{ readonly traceId: string; readonly spanId: string }>;
}
```

**Log levels:** Six levels (trace, debug, info, warn, error, fatal) with explicit numeric ordering. These are industry-standard and GxP-appropriate.

**Log rotation/retention:** Not supported at the core level. Delegated to backend adapters (Bunyan streams, Pino transports, Winston transports). The core logger provides no built-in retention policies, maximum log size enforcement, or rotation mechanisms.

**Tamper evidence:** Not supported. Log entries are plain objects with no cryptographic signatures, hash chains, or integrity verification.

**Ordered delivery:** Not guaranteed. The synchronous `handle()` method provides ordering within a single handler, but no sequence numbers or ordering guarantees exist across multiple handlers or asynchronous pipelines.

**Rate limiting:** Available via `withRateLimit()` with configurable sliding window:

```typescript
// packages/logger/src/utils/rate-limit.ts (lines 17-22)
export interface RateLimitConfig {
  readonly maxEntries: number;
  readonly windowMs: number;
  readonly perLevel?: Partial<Record<LogLevel, number>>;
  readonly strategy?: "drop" | "sample";
}
```

**Gap:** When entries are dropped by rate limiting, there is no counter or notification in the log stream. An auditor cannot determine how many entries were dropped during a rate-limited window.

---

## 5. Code Examples

### 5.1 Correct Pattern: Handler-Backed Logger with Context Chain

```typescript
// packages/logger/src/adapters/scoped/logger.ts (lines 89-96)
child(context: Partial<LogContext>): Logger {
  return new HandlerLoggerImpl(
    this._handler,
    mergeContext(this._context, context),
    this._baseAnnotations,
    this._minLevel
  );
}
```

Child loggers correctly share the handler reference while maintaining independent context. The `mergeContext` utility creates a new object:

```typescript
// packages/logger/src/utils/context.ts (lines 22-34)
export function mergeContext(base: LogContext, override: Partial<LogContext>): LogContext {
  const result: Record<string, unknown> = {};
  for (const key in base) {
    result[key] = base[key];
  }
  for (const key in override) {
    const value = override[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
```

### 5.2 Correct Pattern: Redaction with Recursive Object Traversal

```typescript
// packages/logger/src/utils/redaction.ts (lines 55-76)
function redactObject(
  obj: Record<string, unknown>,
  config: RedactionConfig,
  currentPath: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const fullPath = currentPath ? `${currentPath}.${key}` : key;
    const value = obj[key];
    if (shouldRedact(key, fullPath, currentPath, config.paths)) {
      result[key] = applyCensor(config.censor, value);
    } else if (isPlainObject(value)) {
      result[key] = redactObject(value, config, fullPath);
    } else {
      result[key] = value;
    }
  }
  return result;
}
```

This creates a new object rather than mutating in place, and recursively traverses nested objects. The redaction function supports both string censoring and custom censor functions.

### 5.3 Problematic Pattern: Silent Console Discard

```typescript
// packages/logger/src/adapters/console/logger.ts (lines 164-200)
private _log(
  level: LogLevel,
  message: string,
  error: Error | undefined,
  annotations: Record<string, unknown> | undefined
): void {
  if (!shouldLog(level, this._minLevel)) {
    return;
  }
  // ... annotation merging ...
  const entry: LogEntry = { level, message, timestamp: Date.now(), context: this._context, annotations: mergedAnnotations, error };
  const formatted = this._formatter.format(entry);  // CPU cost paid
  const method = CONSOLE_METHOD[level];
  const cons = getConsole();
  if (cons) {
    cons[method](formatted);
  }
  // else: formatted string silently discarded, no fallback
}
```

### 5.4 Problematic Pattern: Winston Destructive Flush

```typescript
// packages/logger-winston/src/handler.ts (lines 91-108)
async flush(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let finished = false;
    logger.on("finish", () => {
      if (!finished) { finished = true; resolve(); }
    });
    logger.on("error", (err: Error) => {
      if (!finished) { finished = true; reject(err); }
    });
    logger.end();  // Terminates the writable stream permanently
  });
},
```

### 5.5 Problematic Pattern: Unprotected Handler Call

```typescript
// packages/logger/src/adapters/scoped/logger.ts (lines 145-175)
private _log(/* ... */): void {
  // ... level check, annotation merge, entry creation ...
  this._handler.handle(entry);  // If this throws, exception propagates to caller
}
```

Compare this to how the instrumentation hook correctly guards against errors:

```typescript
// packages/logger/src/instrumentation/hook.ts (lines 57-79)
isResolving = true;
try {
  logger[resolutionLevel](`Resolved port: ${portName}`, { port: portName, durationMs: duration });
} finally {
  isResolving = false;
}
```

---

## 6. Edge Cases & Known Limitations

### 6.1 CRITICAL: Handler Exceptions Propagate to Application Code

**Trigger:** Any `LogHandler.handle()` implementation that throws (network failure, disk full, serialization error).

**Impact:** The calling application code receives an unhandled exception from what appears to be a simple `logger.info()` call. In a GxP environment, this means a logging infrastructure failure could crash a validated process.

**File:** `packages/logger/src/adapters/scoped/logger.ts`, line 174.

### 6.2 CRITICAL: Annotations Accept Non-Serializable Values

**Trigger:** Passing a function, symbol, circular reference, or BigInt as an annotation value.

**Impact:** `JSON.stringify` will either silently drop the key (functions/symbols), throw a `TypeError` (circular/BigInt), or produce unexpected output. The json formatter at `packages/logger/src/utils/formatting.ts` line 44 calls `JSON.stringify(obj)` directly with no error handling.

**Example:** `logger.info("test", { callback: () => {} })` -- the `callback` key disappears from JSON output with no warning.

### 6.3 CRITICAL: Sampling Non-Reproducibility

**Trigger:** Using `withSampling()` in any environment requiring audit trail completeness.

**Impact:** Cannot reconstruct which entries were sampled. No seed, no deterministic sequence, no audit log of sampling decisions.

**File:** `packages/logger/src/utils/sampling.ts`, line 34.

### 6.4 HIGH: Bunyan Flush/Shutdown Are No-Ops

**Trigger:** Process exit or graceful shutdown with Bunyan adapter.

**Impact:** Buffered log entries in custom Bunyan streams (ring buffer, rotating file, network streams) may be lost. The comment "Bunyan auto-flushes" is incorrect for non-standard stream configurations.

**File:** `packages/logger-bunyan/src/handler.ts`, lines 79-87.

### 6.5 HIGH: Pino Flush Does Not Await Completion

**Trigger:** Calling `handler.flush()` or `handler.shutdown()` with Pino adapter before process exit.

**Impact:** `pino.flush()` is asynchronous but the handler wraps it in `Promise.resolve()`, returning immediately. The Pino documentation states that `flush` accepts a callback; this implementation ignores that callback.

**File:** `packages/logger-pino/src/handler.ts`, lines 74-83.

### 6.6 HIGH: Winston Flush Destroys the Logger

**Trigger:** Calling `handler.flush()` followed by `handler.handle()` on the Winston adapter.

**Impact:** `logger.end()` terminates the writable stream. Subsequent `handle()` calls may silently fail or throw, depending on Winston's internal state.

**File:** `packages/logger-winston/src/handler.ts`, line 106.

### 6.7 MEDIUM: Rate Limiting Drops Entries Silently

**Trigger:** Exceeding the configured `maxEntries` within `windowMs`.

**Impact:** Entries are dropped with no indication in the log stream. An auditor reviewing logs would not know that entries were suppressed. The rate limiter does not emit a "entries dropped" summary log.

**File:** `packages/logger/src/utils/rate-limit.ts`, lines 90-97.

### 6.8 MEDIUM: Redaction Does Not Cover Message Strings

**Trigger:** Including sensitive data directly in the `message` parameter: `logger.info("Reset password for SSN 123-45-6789")`.

**Impact:** The redaction wrapper only processes `annotations` and `context`. The `message` string passes through unmodified. All three formatters include the message as-is.

**File:** `packages/logger/src/utils/redaction.ts`, lines 140-153 (redaction wrapper methods).

### 6.9 MEDIUM: Memory Logger Unbounded Growth

**Trigger:** Long-running tests or processes that use `MemoryLogger` without calling `clear()`.

**Impact:** The internal `_entries` array grows without bound. No maximum capacity is enforced, and no warning is emitted when the array becomes large.

**File:** `packages/logger/src/adapters/memory/logger.ts`, line 202.

### 6.10 LOW: React Integration Has No Error Boundary

**Trigger:** Logger throws within a React component during render.

**Impact:** The `useLogger()` hook throws when used outside a `LoggingProvider`, but there is no error boundary integration to gracefully handle logging failures within the component tree.

**File:** `packages/logger-react/src/react.tsx`, lines 59-65.

---

## 7. Recommendations by Tier

### Tier 1: Critical (Must-Fix for GxP Readiness)

| #   | Recommendation                                                                                                                                                                                                                                                          | Effort | Impact                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| 1.1 | **Wrap `handler.handle()` in try/catch** in `HandlerLoggerImpl._log()` and all other logger implementations that delegate to handlers. On error, optionally log to a fallback (stderr) and emit an inspector event. Never propagate logging errors to application code. | Low    | Prevents application crashes from logging infrastructure failures |
| 1.2 | **Implement proper flush/shutdown for Bunyan adapter** by iterating `logger.streams` and calling `.end()` on each writable stream, awaiting their `finish` events.                                                                                                      | Medium | Prevents data loss on process exit                                |
| 1.3 | **Fix Pino flush to await the callback** by wrapping `logger.flush(callback)` in a proper `new Promise()`.                                                                                                                                                              | Low    | Prevents data loss on process exit                                |
| 1.4 | **Fix Winston flush to not destroy the logger** by using a non-destructive drain approach instead of `logger.end()`.                                                                                                                                                    | Medium | Prevents handler from becoming unusable after flush               |
| 1.5 | **Add annotation value validation** in the core `_log()` methods. At minimum, detect and warn on non-serializable types (functions, symbols, BigInt). Optionally strip them with a warning.                                                                             | Medium | Prevents silent data corruption and serialization crashes         |

### Tier 2: High Priority (Recommended for GxP)

| #   | Recommendation                                                                                                                                                     | Effort | Impact                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------- |
| 2.1 | **Replace `Math.random()` with a seedable PRNG** in sampling and rate limiting. Accept an optional `seed` or `randomFn` in `SamplingConfig` and `RateLimitConfig`. | Low    | Enables deterministic, reproducible sampling for audits |
| 2.2 | **Add output-verification tests for all adapters** that capture the actual log output and assert on message content, level mapping, and field presence.            | Medium | Moves from "doesn't crash" to "produces correct output" |
| 2.3 | **Add error injection tests** simulating handler failures, formatter exceptions, and transport errors.                                                             | Medium | Validates error recovery paths                          |
| 2.4 | **Create tests for logger-react** covering LoggingProvider, useLogger, useChildLogger, and useLifecycleLogger.                                                     | Medium | Provides basic coverage for an untested package         |
| 2.5 | **Emit a "entries-dropped" log summary** when rate limiting or sampling drops entries. Include the count and time window.                                          | Low    | Enables auditors to detect information gaps             |
| 2.6 | **Add a fallback mechanism for ConsoleLoggerImpl** when `getConsole()` returns undefined. At minimum, increment a counter available through the inspector.         | Low    | Prevents silent log loss                                |

### Tier 3: Medium Priority (Enhances GxP Posture)

| #   | Recommendation                                                                                                                                                           | Effort | Impact                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------- |
| 3.1 | **Add message-level redaction** as an optional feature in the redaction wrapper, applying pattern matching to the message string in addition to annotations and context. | Medium | Closes the message redaction gap                                |
| 3.2 | **Add log injection protection** by sanitizing control characters (newlines, ANSI escapes, null bytes) in the message and annotation string values before formatting.    | Low    | Prevents log file corruption and potential injection attacks    |
| 3.3 | **Enforce maximum annotation depth and size** to prevent stack overflow from deeply nested objects in redaction traversal and to bound memory usage.                     | Low    | Prevents DoS via malicious or accidental deep nesting           |
| 3.4 | **Add header value validation** in `extractContextFromHeaders()` to enforce maximum length and character set for correlation/request IDs.                                | Low    | Prevents injection of oversized or malicious context values     |
| 3.5 | **Use `crypto.randomUUID()` for request ID generation** instead of `Math.random().toString(36)` to produce properly unique, standards-compliant identifiers.             | Low    | Improves uniqueness and auditability of request IDs             |
| 3.6 | **Add bounded capacity to MemoryLogger** with a configurable max entries limit and oldest-first eviction.                                                                | Low    | Prevents unbounded memory growth in long-running test processes |

### Tier 4: Low Priority (Best Practice)

| #   | Recommendation                                                                                                    | Effort | Impact                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------- |
| 4.1 | Add sequence numbers to `LogEntry` for ordering verification across handlers.                                     | Low    | Enables tamper detection and ordering verification      |
| 4.2 | Add high-resolution timestamps (`performance.now()`) as an optional field alongside `Date.now()`.                 | Low    | Improves precision for high-frequency logging scenarios |
| 4.3 | Add a "strict mode" configuration that makes `userId` and `correlationId` required in `LogContext`.               | Medium | Enforces attribution in GxP contexts                    |
| 4.4 | Document the error contract for `LogHandler.handle()` -- should implementations throw, swallow, or report errors? | Low    | Clarifies adapter implementation expectations           |
| 4.5 | Add an `ErrorBoundaryLogger` component for React that catches and logs render errors.                             | Medium | Improves React integration resilience                   |

---

## 8. File Reference Guide

### Core Logger (`@hex-di/logger`)

| File                                          | Purpose                                     | Lines | GxP Relevance                                          |
| --------------------------------------------- | ------------------------------------------- | ----- | ------------------------------------------------------ |
| `src/ports/logger.ts`                         | Logger port interface definition            | 94    | Defines the logging contract                           |
| `src/ports/log-handler.ts`                    | LogHandler port interface                   | 43    | Defines the handler pipeline contract                  |
| `src/ports/log-formatter.ts`                  | LogFormatter port interface                 | 38    | Defines formatting contract                            |
| `src/types/log-level.ts`                      | LogLevel union type and comparisons         | 37    | Level enforcement and filtering                        |
| `src/types/log-entry.ts`                      | LogEntry and LogContext structures          | 40    | Core data integrity types                              |
| `src/adapters/console/logger.ts`              | Console logger implementation               | 213   | Silent discard when console unavailable (line 197-199) |
| `src/adapters/console/adapter.ts`             | Console DI adapter                          | 22    | DI registration                                        |
| `src/adapters/memory/logger.ts`               | Memory logger for testing                   | 217   | Unbounded growth (line 202)                            |
| `src/adapters/memory/adapter.ts`              | Memory DI adapter                           | 26    | DI registration                                        |
| `src/adapters/noop/logger.ts`                 | No-op logger singleton                      | 80    | Zero-overhead disabled logging                         |
| `src/adapters/noop/adapter.ts`                | NoOp DI adapter                             | 23    | DI registration                                        |
| `src/adapters/scoped/logger.ts`               | Handler-backed scoped logger                | 203   | Unprotected handler.handle() call (line 174)           |
| `src/adapters/scoped/adapter.ts`              | Scoped DI adapter                           | 27    | DI registration                                        |
| `src/utils/redaction.ts`                      | Redaction wrapper                           | 205   | Security - opt-in redaction (line 127)                 |
| `src/utils/sampling.ts`                       | Sampling wrapper                            | 123   | Non-deterministic Math.random() (line 34)              |
| `src/utils/rate-limit.ts`                     | Rate limiting wrapper                       | 177   | Silent entry dropping (line 92-96)                     |
| `src/utils/globals.ts`                        | Cross-platform console accessor             | 55    | Returns undefined when console unavailable             |
| `src/utils/context.ts`                        | Context merge and header extraction         | 59    | No header value validation                             |
| `src/utils/formatting.ts`                     | Built-in formatters (JSON, pretty, minimal) | 112   | No error handling in JSON.stringify (line 44)          |
| `src/tracing/span-injection.ts`               | Span injection wrapper                      | 159   | Default provider is no-op                              |
| `src/framework/hono.ts`                       | Hono logging middleware                     | 156   | Math.random() in request ID (line 20)                  |
| `src/instrumentation/container.ts`            | Container auto-logging                      | 122   | Good reentrance guard                                  |
| `src/instrumentation/hook.ts`                 | Logging hook factory                        | 100   | Good reentrance guard (line 38)                        |
| `src/inspection/inspector.ts`                 | Logger inspector implementation             | 387   | Comprehensive observability                            |
| `src/inspection/events.ts`                    | Inspector event types                       | 37    | Discriminated union events                             |
| `src/inspection/snapshot.ts`                  | Snapshot type definitions                   | 90    | Full state capture                                     |
| `src/inspection/inspector-port.ts`            | Inspector port definition                   | 19    | DI port                                                |
| `src/inspection/library-inspector-bridge.ts`  | Library inspector bridge                    | 50    | Unified inspection protocol                            |
| `src/inspection/library-inspector-adapter.ts` | Library inspector DI adapter                | 42    | Frozen singleton adapter                               |
| `src/inspection/container-integration.ts`     | Lazy inspector factory                      | 31    | Lazy initialization pattern                            |
| `src/testing/assertions.ts`                   | Test assertion utilities                    | 81    | LogEntryMatcher for tests                              |
| `src/context/variables.ts`                    | DI context variables                        | 34    | Log context propagation                                |
| `src/index.ts`                                | Package entry point                         | 131   | Public API surface                                     |
| `tests/inspection.test.ts`                    | Inspector tests                             | 332   | 20 tests, comprehensive                                |
| `tests/library-inspector-bridge.test.ts`      | Bridge tests                                | 211   | 10 tests                                               |

### Bunyan Adapter (`@hex-di/logger-bunyan`)

| File                    | Purpose                       | Lines | GxP Relevance                      |
| ----------------------- | ----------------------------- | ----- | ---------------------------------- |
| `src/handler.ts`        | Bunyan handler implementation | 101   | No-op flush/shutdown (lines 79-87) |
| `src/level-map.ts`      | Level mapping (identity)      | 21    | Direct 1:1 mapping                 |
| `src/index.ts`          | Package entry point           | 11    | Public API                         |
| `tests/handler.test.ts` | Handler tests                 | 116   | "Doesn't throw" tests only         |

### Pino Adapter (`@hex-di/logger-pino`)

| File                    | Purpose                     | Lines | GxP Relevance                       |
| ----------------------- | --------------------------- | ----- | ----------------------------------- |
| `src/handler.ts`        | Pino handler implementation | 95    | Fire-and-forget flush (lines 74-83) |
| `src/level-map.ts`      | Level mapping (identity)    | 21    | Direct 1:1 mapping                  |
| `src/index.ts`          | Package entry point         | 11    | Public API                          |
| `tests/handler.test.ts` | Handler tests               | 90    | "Doesn't throw" tests only          |

### Winston Adapter (`@hex-di/logger-winston`)

| File                    | Purpose                        | Lines | GxP Relevance                                 |
| ----------------------- | ------------------------------ | ----- | --------------------------------------------- |
| `src/handler.ts`        | Winston handler implementation | 126   | Destructive flush via logger.end() (line 106) |
| `src/index.ts`          | Package entry point            | 14    | Public API                                    |
| `tests/handler.test.ts` | Handler tests                  | 82    | "Doesn't throw" tests only                    |

### React Integration (`@hex-di/logger-react`)

| File            | Purpose                  | Lines | GxP Relevance               |
| --------------- | ------------------------ | ----- | --------------------------- |
| `src/react.tsx` | React provider and hooks | 93    | No error boundary, no tests |
| `src/index.ts`  | Package entry point      | 12    | Public API                  |

---

_End of GxP Compliance Analysis Report_
