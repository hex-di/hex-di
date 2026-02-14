# Technical Refinement: @hex-di/logger Stack -- 5.8 to 10.0 GxP Compliance

**Date:** 2026-02-10
**Scope:** `@hex-di/logger` (core), `@hex-di/logger-bunyan`, `@hex-di/logger-pino`, `@hex-di/logger-winston`
**Baseline Score:** 5.8 / 10 (Weakest package in HexDI stack)
**Target Score:** 10.0 / 10
**Source Analysis:** All 48 core source files, 3 adapter packages (8 source files), 4 test files

---

## 1. Current Score Breakdown

| #   | Criterion                       |  Core   | Bunyan  |  Pino   | Winston | Weighted Avg |  Target  |
| --- | ------------------------------- | :-----: | :-----: | :-----: | :-----: | :----------: | :------: |
| 1   | Data Integrity (ALCOA+)         |   7.0   |   6.0   |   6.0   |   6.0   |   **6.5**    |   10.0   |
| 2   | Traceability & Audit Trail      |   8.0   |   7.0   |   7.0   |   7.0   |   **7.5**    |   10.0   |
| 3   | Determinism & Reproducibility   |   5.0   |   6.0   |   6.0   |   6.0   |   **5.5**    |   10.0   |
| 4   | Error Handling & Recovery       |   3.0   |   2.0   |   3.0   |   5.0   |   **3.0**    |   10.0   |
| 5   | Validation & Input Verification |   4.0   |   5.0   |   5.0   |   5.0   |   **4.5**    |   10.0   |
| 6   | Change Control & Versioning     |   8.0   |   8.0   |   8.0   |   8.0   |   **8.0**    |   10.0   |
| 7   | Testing & Verification          |   7.0   |   3.0   |   3.0   |   3.0   |   **4.5**    |   10.0   |
| 8   | Security                        |   7.0   |   5.0   |   5.0   |   5.0   |   **5.5**    |   10.0   |
| 9   | Documentation                   |   8.0   |   6.0   |   6.0   |   6.0   |   **7.0**    |   10.0   |
| 10  | Compliance-Specific (Logging)   |   6.0   |   5.0   |   5.0   |   6.0   |   **5.5**    |   10.0   |
|     | **Overall**                     | **6.5** | **5.0** | **5.0** | **6.0** |   **5.8**    | **10.0** |

### Worst-Scoring Areas (Blocking GxP)

1. **Error Handling (3.0)** -- The single most critical gap. `handler.handle()` has zero error protection in the core pipeline, and every adapter has broken flush/shutdown semantics.
2. **Validation (4.5)** -- No runtime validation anywhere. Annotations accept non-serializable values. Header extraction trusts raw input.
3. **Testing (4.5)** -- Adapter tests only assert "doesn't throw". Zero output verification. Zero error injection tests.
4. **Determinism (5.5)** -- `Math.random()` in sampling, rate limiting, and request ID generation.
5. **Security (5.5)** -- Redaction is opt-in with no warnings. No log injection prevention. No message-level redaction.
6. **Compliance-Specific (5.5)** -- No sequence numbers. No tamper evidence. No drop notifications. No monotonic ordering.

---

## 2. Gap Analysis

### 2.1 CRITICAL: Unprotected Handler Pipeline

**File:** `packages/logger/src/adapters/scoped/logger.ts`, line 174

```typescript
// CURRENT: No try/catch. If handler throws, exception propagates to application code.
this._handler.handle(entry);
```

**Impact:** Any handler implementation that throws (network failure, serialization error, disk full) will crash the application code that called `logger.info()`. This fundamentally violates the principle that logging infrastructure must never disrupt application behavior. In GxP environments, this means a logging failure could halt a validated process.

**Affected call sites:**

- `HandlerLoggerImpl._log()` at `adapters/scoped/logger.ts:174`
- `ConsoleLoggerImpl._log()` at `adapters/console/logger.ts:193-199` (formatter can throw too)

### 2.2 CRITICAL: No Annotation Validation

**File:** `packages/logger/src/ports/logger.ts`, lines 24-51

```typescript
// CURRENT: Record<string, unknown> accepts everything.
trace(message: string, annotations?: Record<string, unknown>): void;
```

**Concrete failure modes:**

- `logger.info("test", { fn: () => {} })` -- function silently dropped by `JSON.stringify`
- `logger.info("test", { s: Symbol("x") })` -- symbol silently dropped
- `logger.info("test", { big: 123n })` -- `JSON.stringify` throws `TypeError: Do not know how to serialize a BigInt`
- `logger.info("test", { circular: obj })` where obj references itself -- `JSON.stringify` throws `TypeError: Converting circular structure to JSON`
- `logger.info("test", { undef: undefined })` -- key silently dropped

**Crash location:** `packages/logger/src/utils/formatting.ts`, line 44: `JSON.stringify(obj)` -- called with zero error handling.

### 2.3 CRITICAL: Console Output Silently Discarded

**File:** `packages/logger/src/adapters/console/logger.ts`, lines 196-199

```typescript
// CURRENT: If getConsole() returns undefined, the formatted entry is silently lost.
const cons = getConsole();
if (cons) {
  cons[method](formatted);
}
// No else branch. No counter. No fallback. CPU already spent on formatting.
```

### 2.4 CRITICAL: Non-Deterministic Sampling

**File:** `packages/logger/src/utils/sampling.ts`, line 34

```typescript
// CURRENT: Math.random() -- non-seedable, non-reproducible.
return Math.random() < rate;
```

Also in rate limiting: `packages/logger/src/utils/rate-limit.ts`, line 57:

```typescript
return Math.random() < limit / (counter.timestamps.length + 1);
```

Also in request ID generation: `packages/logger/src/framework/hono.ts`, line 20:

```typescript
const random = Math.random().toString(36).slice(2, 10);
```

**GxP violation:** Cannot reconstruct sampling decisions during audit. Cannot replay to determine which entries were sampled vs. dropped.

### 2.5 CRITICAL: Bunyan Flush/Shutdown Are No-Ops

**File:** `packages/logger-bunyan/src/handler.ts`, lines 79-87

```typescript
// CURRENT: Both methods do nothing.
async flush(): Promise<void> {
  // Bunyan auto-flushes
},
async shutdown(): Promise<void> {
  // Bunyan doesn't have a close method
},
```

**Impact:** Bunyan streams with custom destinations (rotating file, network, ring buffer) may have buffered data that is NOT auto-flushed on process exit. The comment is incorrect for non-stdout stream configurations.

### 2.6 CRITICAL: Pino Flush is Fire-and-Forget

**File:** `packages/logger-pino/src/handler.ts`, lines 74-83

```typescript
// CURRENT: Calls flush synchronously, ignores the callback, immediately resolves.
flush(): Promise<void> {
  logger.flush();
  return Promise.resolve();
},
```

**Impact:** Pino's `flush()` accepts a callback parameter that fires on completion. This implementation resolves immediately, providing zero guarantee that buffered entries have been written. Data loss on process exit.

### 2.7 CRITICAL: Winston Flush Destroys the Logger

**File:** `packages/logger-winston/src/handler.ts`, lines 91-108

```typescript
// CURRENT: logger.end() terminates the writable stream permanently.
async flush(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    // ...
    logger.end();  // <-- DESTROYS THE LOGGER
  });
},
```

**Impact:** After calling `flush()`, the handler cannot accept new log entries. `flush()` should be re-entrant and non-destructive.

### 2.8 HIGH: Adapter Tests Only Check "Doesn't Throw"

**Files:**

- `packages/logger-bunyan/tests/handler.test.ts` -- 9 tests, all "not.toThrow()" assertions
- `packages/logger-pino/tests/handler.test.ts` -- 9 tests, all "not.toThrow()" assertions
- `packages/logger-winston/tests/handler.test.ts` -- 7 tests, all "not.toThrow()" assertions

**Example (representative of all three):**

```typescript
it("handle includes context and annotations", () => {
  // Does not capture output. Does not verify message appears.
  // Does not verify level mapping. Does not verify field serialization.
  expect(() =>
    handler.handle(
      makeEntry({
        context: { correlationId: "abc" },
        annotations: { key: "val" },
      })
    )
  ).not.toThrow();
});
```

### 2.9 HIGH: No Error Injection Tests

Zero tests across the entire logger stack simulate:

- Handler throws during `handle()`
- Formatter throws during `format()`
- Console throws during `console.info()`
- `flush()` failure
- Transport error
- Serialization crash (circular reference, BigInt)

### 2.10 HIGH: No Monotonic Event Ordering / Sequence Numbers

`LogEntry` has no sequence number field. Two entries with the same `Date.now()` millisecond timestamp are indistinguishable in order. No global counter exists.

### 2.11 HIGH: No Tamper Evidence

Log entries are plain mutable JavaScript objects. No hash chain. No HMAC. No signature. No integrity verification mechanism.

### 2.12 HIGH: No Log Injection Prevention

**File:** `packages/logger/src/utils/formatting.ts`, lines 63-84

The `prettyFormatter` directly concatenates `entry.message` into the output string:

```typescript
let line = `${time} [${level}] ${entry.message}`;
```

A message containing `\n2026-02-10T... [FATAL] SYSTEM COMPROMISED` would inject a fake log line. ANSI escape codes, null bytes, and other control characters flow through unfiltered.

### 2.13 HIGH: Redaction is Opt-In With No Warnings

**File:** `packages/logger/src/utils/redaction.ts`

If `withRedaction()` is not applied, annotations flow through unredacted with zero warnings. No "redaction not configured" warning exists anywhere. Additionally, the `message` string itself is never redacted -- `logger.info("SSN: 123-45-6789")` bypasses all redaction.

### 2.14 MEDIUM: Rate Limiting Drops Entries Silently

**File:** `packages/logger/src/utils/rate-limit.ts`, lines 90-97

When entries are dropped by rate limiting, there is no counter, no summary log, and no notification in the log stream. An auditor cannot determine how many entries were suppressed.

### 2.15 MEDIUM: No Header Value Validation

**File:** `packages/logger/src/utils/context.ts`, lines 42-58

`extractContextFromHeaders()` accepts correlation IDs without length limits, format validation, or control character filtering. A malicious client could inject a 10MB correlation ID.

### 2.16 MEDIUM: Memory Logger Unbounded Growth

**File:** `packages/logger/src/adapters/memory/logger.ts`, line 202

`this._entries.push(entry)` with no capacity limit. Long-running test processes will leak memory.

### 2.17 LOW: Tracing Context Warning Missing

The `createSpanProvider()` function at `packages/logger/src/tracing/span-injection.ts` returns a no-op provider silently. When tracing context (correlationId, traceId) is missing from log entries, no warning is emitted. Per the CONSTRAINT in this refinement, tracing remains OPTIONAL, but the logger should warn when tracing context is absent.

---

## 3. Required Changes (Exact Files, Code, Rationale)

### Change 3.1: Add Error-Safe Handler Invocation

**File:** `packages/logger/src/adapters/scoped/logger.ts`

**Current (line 174):**

```typescript
this._handler.handle(entry);
```

**Required change:** Wrap in try/catch. On error, write to stderr as a last-resort fallback. Never propagate to application code. Emit an inspector event if an inspector is wired.

```typescript
try {
  this._handler.handle(entry);
} catch (handlerError: unknown) {
  // Last-resort fallback: write to stderr. Never propagate to caller.
  const errorMessage = handlerError instanceof Error ? handlerError.message : String(handlerError);
  const fallback = getStderr();
  if (fallback) {
    fallback(
      `[LOGGER HANDLER ERROR] Failed to handle log entry: ${errorMessage}. ` +
        `Original entry: level=${entry.level} message=${entry.message}`
    );
  }
}
```

**Rationale:** Logging must never crash the application. The fallback to stderr ensures the error is visible without creating a recursive loop.

**Also apply the same pattern to:** `packages/logger/src/adapters/console/logger.ts` (wrap both the `format()` call at line 193 and the `cons[method]()` call at line 198).

### Change 3.2: Add Annotation Value Validation

**New file:** `packages/logger/src/utils/validation.ts`

Create a `sanitizeAnnotations()` function that:

1. Detects and removes non-serializable values (functions, symbols, BigInt) with a warning to stderr
2. Detects circular references using a `WeakSet` visited tracker
3. Enforces maximum depth (configurable, default 10)
4. Enforces maximum total size (number of keys, configurable, default 100)
5. Converts `undefined` values to `null` for explicit representation in JSON
6. Returns a clean copy of the annotations

Call `sanitizeAnnotations()` in the `_log()` method of `HandlerLoggerImpl`, `ConsoleLoggerImpl`, and `MemoryLoggerImpl` before creating the `LogEntry`.

**Rationale:** Prevents silent data loss, serialization crashes, and stack overflows from deeply nested objects.

### Change 3.3: Add Console Fallback and Drop Counter

**File:** `packages/logger/src/adapters/console/logger.ts`

**Current (lines 196-199):**

```typescript
const cons = getConsole();
if (cons) {
  cons[method](formatted);
}
```

**Required change:**

```typescript
const cons = getConsole();
if (cons) {
  try {
    cons[method](formatted);
  } catch (consoleError: unknown) {
    this._droppedCount++;
  }
} else {
  this._droppedCount++;
  // Emit warning once on first drop
  if (this._droppedCount === 1) {
    const fallback = getStderr();
    if (fallback) {
      fallback("[LOGGER WARNING] Console unavailable. Log entries will be dropped.");
    }
  }
}
```

Add a `_droppedCount` field to `ConsoleLoggerImpl` and expose it via a getter for inspection integration.

**Rationale:** Makes silent log loss visible and countable.

### Change 3.4: Replace Math.random() With Seedable PRNG

**File:** `packages/logger/src/utils/sampling.ts`

**Required changes:**

1. Add a `randomFn` option to `SamplingConfig`:

```typescript
export interface SamplingConfig {
  readonly rate: number;
  readonly perLevel?: Partial<Record<LogLevel, number>>;
  readonly alwaysLogErrors?: boolean;
  readonly randomFn?: () => number; // Seedable PRNG for deterministic replay
}
```

2. Update `shouldSample()` to use the configurable random function:

```typescript
function shouldSample(level: LogLevel, config: SamplingConfig): boolean {
  const alwaysLogErrors = config.alwaysLogErrors ?? true;
  if (alwaysLogErrors && (level === "error" || level === "fatal")) {
    return true;
  }
  const rate = config.perLevel?.[level] ?? config.rate;
  const random = config.randomFn ?? Math.random;
  return random() < rate;
}
```

**File:** `packages/logger/src/utils/rate-limit.ts`

Add the same `randomFn` option to `RateLimitConfig` and use it at line 57.

**File:** `packages/logger/src/framework/hono.ts`

Replace `Math.random()` in `generateRequestId()` with `crypto.randomUUID()` (available in all modern runtimes: Node 19+, Deno, Bun, Cloudflare Workers, browsers). Add a fallback for environments without `crypto.randomUUID`.

**Rationale:** Enables deterministic, auditable sampling. Tests can provide a fixed seed. Production can use cryptographic randomness.

### Change 3.5: Fix Bunyan Flush/Shutdown

**File:** `packages/logger-bunyan/src/handler.ts`

**Required change for `flush()`:**

```typescript
async flush(): Promise<void> {
  const streams = logger.streams;
  const flushPromises: Array<Promise<void>> = [];
  for (const streamConfig of streams) {
    const stream = streamConfig.stream;
    if (stream && typeof stream.write === "function" && typeof stream.cork === "function") {
      // Writable stream -- uncork to flush
      flushPromises.push(new Promise<void>((resolve) => {
        if (typeof stream.once === "function") {
          stream.once("drain", resolve);
          // If already drained, resolve after tick
          if (stream.writableLength === 0) {
            resolve();
          }
        } else {
          resolve();
        }
      }));
    }
  }
  if (flushPromises.length > 0) {
    await Promise.all(flushPromises);
  }
},
```

**Required change for `shutdown()`:**

```typescript
async shutdown(): Promise<void> {
  const streams = logger.streams;
  const shutdownPromises: Array<Promise<void>> = [];
  for (const streamConfig of streams) {
    const stream = streamConfig.stream;
    if (stream && typeof stream.end === "function") {
      shutdownPromises.push(new Promise<void>((resolve, reject) => {
        let settled = false;
        if (typeof stream.on === "function") {
          stream.on("finish", () => { if (!settled) { settled = true; resolve(); } });
          stream.on("error", (err: Error) => { if (!settled) { settled = true; reject(err); } });
        }
        stream.end(() => {
          if (!settled) { settled = true; resolve(); }
        });
      }));
    }
  }
  if (shutdownPromises.length > 0) {
    await Promise.all(shutdownPromises);
  }
},
```

**Rationale:** Properly iterates Bunyan's stream array and explicitly flushes/closes each stream, awaiting completion.

### Change 3.6: Fix Pino Flush to Await Callback

**File:** `packages/logger-pino/src/handler.ts`

**Current (lines 74-83):**

```typescript
flush(): Promise<void> {
  logger.flush();
  return Promise.resolve();
},
shutdown(): Promise<void> {
  logger.flush();
  return Promise.resolve();
},
```

**Required change:**

```typescript
flush(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    logger.flush((err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
},
shutdown(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    logger.flush((err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
},
```

**Rationale:** Uses Pino's callback-based flush API to properly await completion before resolving the promise.

### Change 3.7: Fix Winston Flush to Be Non-Destructive

**File:** `packages/logger-winston/src/handler.ts`

**Current `flush()` (lines 91-108):** Calls `logger.end()` which permanently destroys the writable stream.

**Required change:** Track an internal `_ended` flag. Use transport-level drain events rather than calling `logger.end()`.

```typescript
async flush(): Promise<void> {
  // Drain each transport's buffer without destroying the logger.
  const drainPromises: Array<Promise<void>> = [];
  for (const transport of logger.transports) {
    if (transport.writableLength > 0) {
      drainPromises.push(new Promise<void>((resolve) => {
        transport.once("drain", resolve);
        // Safety timeout -- do not wait forever
        setTimeout(resolve, 5000);
      }));
    }
  }
  if (drainPromises.length > 0) {
    await Promise.all(drainPromises);
  }
},
```

Move the destructive `logger.end()` call to `shutdown()` only (which is the correct semantic for permanent resource release):

```typescript
async shutdown(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let finished = false;
    logger.on("finish", () => {
      if (!finished) { finished = true; resolve(); }
    });
    logger.on("error", (err: Error) => {
      if (!finished) { finished = true; reject(err); }
    });
    // Safety timeout
    setTimeout(() => {
      if (!finished) { finished = true; resolve(); }
    }, 5000);
    logger.end();
  });
  logger.close();
},
```

**Rationale:** `flush()` must be re-entrant and non-destructive. `shutdown()` is the terminal operation.

### Change 3.8: Add Sequence Numbers to LogEntry

**File:** `packages/logger/src/types/log-entry.ts`

Add a monotonic sequence number field:

```typescript
export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: number;
  readonly sequence: number; // Monotonic counter, unique per process
  readonly context: LogContext;
  readonly annotations: Readonly<Record<string, unknown>>;
  readonly error?: Error;
  readonly spans?: ReadonlyArray<{
    readonly traceId: string;
    readonly spanId: string;
  }>;
}
```

**New file:** `packages/logger/src/utils/sequence.ts`

```typescript
let _globalSequence = 0;

export function nextSequence(): number {
  return ++_globalSequence;
}

/** Reset sequence counter. Only for testing. */
export function resetSequence(): void {
  _globalSequence = 0;
}
```

Update all `_log()` methods in `HandlerLoggerImpl`, `ConsoleLoggerImpl`, and `MemoryLoggerImpl` to include `sequence: nextSequence()` in the entry.

**Rationale:** Enables monotonic ordering verification across handlers and asynchronous pipelines. Detects reordering and dropped entries during audit.

### Change 3.9: Add Log Injection Prevention

**New file:** `packages/logger/src/utils/sanitize.ts`

```typescript
/**
 * Strip control characters from log messages to prevent log injection.
 * Preserves printable ASCII, tabs, and standard Unicode.
 * Replaces newlines with the literal string "\n" to prevent fake log lines.
 * Strips ANSI escape sequences entirely.
 */
export function sanitizeMessage(message: string): string {
  // Remove ANSI escape sequences
  let result = message.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
  // Replace newlines/carriage returns with escaped representation
  result = result.replace(/\r\n/g, "\\r\\n");
  result = result.replace(/\n/g, "\\n");
  result = result.replace(/\r/g, "\\r");
  // Remove null bytes and other C0 control characters (except tab)
  result = result.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
  return result;
}
```

Apply `sanitizeMessage()` in all `_log()` methods before creating the `LogEntry`.

Also sanitize string values in annotations within the `sanitizeAnnotations()` function (Change 3.2).

**Rationale:** Prevents log injection attacks where malicious input creates fake log lines, injects ANSI escape codes, or corrupts log file structure.

### Change 3.10: Add Tamper Evidence via Entry Hashing

**New file:** `packages/logger/src/utils/integrity.ts`

Implement a lightweight hash chain for log entries:

```typescript
export interface IntegrityConfig {
  readonly enabled: boolean;
  readonly algorithm?: "sha256" | "fnv1a"; // default: fnv1a for performance
}

/**
 * Compute a fast hash of the entry's canonical fields.
 * Returns a hex string. Uses FNV-1a by default (no crypto dependency).
 */
export function computeEntryHash(
  entry: { level: string; message: string; timestamp: number; sequence: number },
  previousHash: string
): string {
  const canonical = `${previousHash}|${entry.sequence}|${entry.timestamp}|${entry.level}|${entry.message}`;
  return fnv1a(canonical);
}
```

Add optional `hash` and `previousHash` fields to `LogEntry` (for opt-in usage):

```typescript
export interface LogEntry {
  // ... existing fields ...
  readonly integrity?: {
    readonly hash: string;
    readonly previousHash: string;
  };
}
```

Create a `withIntegrity()` logger wrapper that computes and attaches hashes.

**Rationale:** Enables auditors to verify log stream integrity by recomputing the hash chain. Detects insertion, deletion, or modification of entries.

### Change 3.11: Add Redaction Warning When Not Configured

**File:** `packages/logger/src/adapters/scoped/logger.ts`

In the `createHandlerLogger()` factory, check if redaction is configured. If not, emit a one-time warning to stderr on first `warn`/`error`/`fatal` log that contains annotations.

**New utility in `packages/logger/src/utils/redaction.ts`:**

```typescript
let _redactionWarningEmitted = false;

export function emitRedactionWarning(): void {
  if (_redactionWarningEmitted) return;
  _redactionWarningEmitted = true;
  const fallback = getStderr();
  if (fallback) {
    fallback(
      "[LOGGER WARNING] Redaction is not configured. Annotation values will flow through " +
        "unredacted. Use withRedaction() to configure sensitive field redaction for GxP compliance."
    );
  }
}
```

**Rationale:** Makes the opt-in nature visible to operators without breaking existing behavior.

### Change 3.12: Add Message-Level Redaction

**File:** `packages/logger/src/utils/redaction.ts`

Extend `RedactionConfig` with an optional message patterns array:

```typescript
export interface RedactionConfig {
  readonly paths: ReadonlyArray<string>;
  readonly censor?: string | ((value: unknown) => unknown);
  readonly messagePatterns?: ReadonlyArray<RegExp>; // Patterns to redact from message strings
}
```

In the `withRedaction()` wrapper, apply pattern replacement to messages:

```typescript
function redactMessage(message: string, patterns: ReadonlyArray<RegExp>, censor: string): string {
  let result = message;
  for (const pattern of patterns) {
    result = result.replace(pattern, censor);
  }
  return result;
}
```

Call this before delegating to the wrapped logger for all log methods.

**Rationale:** Closes the gap where `logger.info("SSN: 123-45-6789")` bypasses annotation-level redaction.

### Change 3.13: Add Drop Notification for Rate Limiting and Sampling

**File:** `packages/logger/src/utils/rate-limit.ts`

Add a drop counter and periodic summary emission:

```typescript
export interface RateLimitConfig {
  readonly maxEntries: number;
  readonly windowMs: number;
  readonly perLevel?: Partial<Record<LogLevel, number>>;
  readonly strategy?: "drop" | "sample";
  readonly randomFn?: () => number;
  readonly onDrop?: (count: number, windowMs: number) => void;
}
```

Track drops internally and call `onDrop` when a configurable threshold is reached. Also emit a summary log entry through the underlying logger when the window rolls over:

```typescript
// After dropping an entry:
droppedCount++;
if (droppedCount === 1 || droppedCount % 100 === 0) {
  // Bypass rate limiting for this meta-entry
  logger.warn("[RATE LIMIT] Entries dropped", {
    droppedCount,
    windowMs: config.windowMs,
    __meta: true, // marker to prevent recursive rate limiting
  });
}
```

Apply the same pattern to `packages/logger/src/utils/sampling.ts` -- log a summary when entries are dropped by sampling.

**Rationale:** Auditors can detect information gaps. The `__meta` marker prevents infinite recursion.

### Change 3.14: Add Header Value Validation

**File:** `packages/logger/src/utils/context.ts`

Add validation to `extractContextFromHeaders()`:

```typescript
const MAX_HEADER_LENGTH = 256;
const HEADER_PATTERN = /^[a-zA-Z0-9\-_.~]+$/;

export function extractContextFromHeaders(
  headers: Record<string, string | undefined>
): Partial<LogContext> {
  const context: Record<string, unknown> = {};

  const correlationId = headers[CORRELATION_ID_HEADER];
  if (correlationId) {
    if (correlationId.length <= MAX_HEADER_LENGTH && HEADER_PATTERN.test(correlationId)) {
      context.correlationId = correlationId;
    } else {
      // Truncate and sanitize rather than reject
      context.correlationId = correlationId
        .slice(0, MAX_HEADER_LENGTH)
        .replace(/[^a-zA-Z0-9\-_.~]/g, "_");
      context._correlationIdSanitized = true;
    }
  }

  // Same for requestId
  // ...
}
```

**Rationale:** Prevents injection of oversized or malicious correlation IDs into every log entry.

### Change 3.15: Add Bounded Capacity to MemoryLogger

**File:** `packages/logger/src/adapters/memory/logger.ts`

Add a `maxEntries` option to `createMemoryLogger()`:

```typescript
export function createMemoryLogger(
  minLevel: LogLevel = "trace",
  options?: { maxEntries?: number }
): MemoryLogger {
  const maxEntries = options?.maxEntries ?? 10_000;
  return new MemoryLoggerImpl([], {}, {}, minLevel, maxEntries);
}
```

In `_log()`, evict the oldest entry when capacity is reached:

```typescript
if (this._maxEntries > 0 && this._entries.length >= this._maxEntries) {
  this._entries.shift(); // FIFO eviction
}
this._entries.push(entry);
```

**Rationale:** Prevents unbounded memory growth in long-running test processes.

### Change 3.16: Add Stderr Utility

**New file:** `packages/logger/src/utils/stderr.ts`

```typescript
/**
 * Get a stderr write function for last-resort fallback logging.
 * This is separate from getConsole() to avoid circular dependency
 * with the console logger.
 */
export function getStderr(): ((message: string) => void) | undefined {
  if (typeof process !== "undefined" && typeof process.stderr?.write === "function") {
    return (message: string) => process.stderr.write(message + "\n");
  }
  // Browser / edge runtime fallback
  if (typeof console !== "undefined" && typeof console.error === "function") {
    return (message: string) => console.error(message);
  }
  return undefined;
}
```

**Rationale:** Provides a last-resort output channel that is independent of the logger pipeline. Used by error handlers in Changes 3.1 and 3.3.

### Change 3.17: Document Error Contract for LogHandler.handle()

**File:** `packages/logger/src/ports/log-handler.ts`

Update the `handle()` JSDoc:

```typescript
export interface LogHandler {
  /**
   * Handle a log entry.
   *
   * **Error contract:** Implementations SHOULD NOT throw from this method.
   * If an error occurs during handling (transport failure, serialization error),
   * implementations should either:
   * 1. Swallow the error and increment an internal error counter (preferred)
   * 2. Throw the error, which will be caught by the logger and reported to stderr
   *
   * Callers (logger implementations) MUST wrap calls to handle() in try/catch
   * and never propagate handler errors to application code.
   */
  handle(entry: LogEntry): void;

  /**
   * Flush pending log entries.
   *
   * **Contract:** This method MUST be non-destructive and re-entrant.
   * The handler MUST remain usable after flush() returns.
   * Resolves when all buffered entries have been written.
   */
  flush(): Promise<void>;

  /**
   * Shutdown handler and release resources.
   *
   * **Contract:** This is a terminal operation. After shutdown() resolves,
   * the handler MAY reject subsequent handle() calls. Implementations
   * SHOULD flush pending entries before releasing resources.
   */
  shutdown(): Promise<void>;
}
```

**Rationale:** Without a documented error contract, adapter implementors do not know whether to throw or swallow. This is the root cause of inconsistent behavior across Bunyan, Pino, and Winston adapters.

---

## 4. New Code to Implement

### 4.1 New Files

| #   | File                                             | Purpose                                                | Estimated Lines |
| --- | ------------------------------------------------ | ------------------------------------------------------ | :-------------: |
| 1   | `packages/logger/src/utils/validation.ts`        | Annotation validation and sanitization                 |      ~100       |
| 2   | `packages/logger/src/utils/sanitize.ts`          | Log injection prevention (message/string sanitization) |       ~40       |
| 3   | `packages/logger/src/utils/sequence.ts`          | Global monotonic sequence number generator             |       ~15       |
| 4   | `packages/logger/src/utils/integrity.ts`         | Entry hash chain for tamper evidence                   |       ~80       |
| 5   | `packages/logger/src/utils/stderr.ts`            | Last-resort stderr fallback utility                    |       ~25       |
| 6   | `packages/logger/src/wrappers/with-integrity.ts` | Integrity wrapper (opt-in tamper evidence)             |       ~80       |

### 4.2 Modified Files

| #   | File                                             | Changes                                                                           | Impact               |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------- | -------------------- |
| 1   | `packages/logger/src/adapters/scoped/logger.ts`  | try/catch on handle(), sanitize message, validate annotations, add sequence       | Core pipeline safety |
| 2   | `packages/logger/src/adapters/console/logger.ts` | try/catch on format+console, drop counter, fallback, sanitize, validate, sequence | Console safety       |
| 3   | `packages/logger/src/adapters/memory/logger.ts`  | Bounded capacity, sequence numbers                                                | Memory safety        |
| 4   | `packages/logger/src/types/log-entry.ts`         | Add `sequence` field, optional `integrity` field                                  | Data model           |
| 5   | `packages/logger/src/utils/sampling.ts`          | Add `randomFn` to config, drop notification                                       | Determinism          |
| 6   | `packages/logger/src/utils/rate-limit.ts`        | Add `randomFn` to config, drop notification                                       | Determinism          |
| 7   | `packages/logger/src/utils/redaction.ts`         | Add `messagePatterns`, add redaction warning                                      | Security             |
| 8   | `packages/logger/src/utils/context.ts`           | Header validation (length, charset)                                               | Input validation     |
| 9   | `packages/logger/src/utils/formatting.ts`        | Wrap `JSON.stringify` in try/catch with fallback                                  | Error handling       |
| 10  | `packages/logger/src/utils/globals.ts`           | Add `getStderr()` or import from `stderr.ts`                                      | Fallback output      |
| 11  | `packages/logger/src/ports/log-handler.ts`       | Document error contract in JSDoc                                                  | Documentation        |
| 12  | `packages/logger/src/framework/hono.ts`          | Replace `Math.random()` with `crypto.randomUUID()`                                | Determinism          |
| 13  | `packages/logger/src/tracing/span-injection.ts`  | Emit warning when no span provider is configured                                  | Tracing warning      |
| 14  | `packages/logger/src/inspection/events.ts`       | Add new event types for handler errors, drop notifications                        | Observability        |
| 15  | `packages/logger/src/index.ts`                   | Export new utilities                                                              | Public API           |
| 16  | `packages/logger-bunyan/src/handler.ts`          | Proper flush/shutdown with stream iteration                                       | Adapter correctness  |
| 17  | `packages/logger-pino/src/handler.ts`            | Await flush callback                                                              | Adapter correctness  |
| 18  | `packages/logger-winston/src/handler.ts`         | Non-destructive flush, proper shutdown                                            | Adapter correctness  |

### 4.3 New Inspector Event Types

**File:** `packages/logger/src/inspection/events.ts`

Add these event variants to the `LoggerInspectorEvent` union:

```typescript
| { readonly type: "handler-error"; readonly handlerName: string; readonly error: Error }
| { readonly type: "entries-dropped"; readonly source: "rate-limit" | "sampling"; readonly count: number; readonly windowMs: number }
| { readonly type: "validation-warning"; readonly field: string; readonly reason: string }
| { readonly type: "console-unavailable"; readonly droppedCount: number }
| { readonly type: "redaction-not-configured" }
| { readonly type: "tracing-context-missing" }
```

Note: `handler-error` already exists in the union type. The others are new additions.

---

## 5. Test Requirements

### 5.1 Core Logger Tests -- New Test File

**New file:** `packages/logger/tests/error-handling.test.ts`

| #   | Test                                                                 | Description                                       |
| --- | -------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | handler.handle() throws -- error caught and logged to stderr         | Verify try/catch in HandlerLoggerImpl.\_log()     |
| 2   | handler.handle() throws -- original application code is not affected | Verify no propagation to caller                   |
| 3   | formatter.format() throws -- entry still attempted via fallback      | Verify ConsoleLoggerImpl handles formatter errors |
| 4   | console.info() throws -- entry counted as dropped                    | Verify console method error handling              |
| 5   | getConsole() returns undefined -- drop counter increments            | Verify no-console fallback                        |
| 6   | getConsole() returns undefined -- warning emitted once               | Verify one-time stderr warning                    |
| 7   | Multiple handler errors -- each reported independently               | Verify errors don't suppress subsequent entries   |
| 8   | Error in error handler -- no infinite recursion                      | Verify stderr fallback doesn't throw              |

### 5.2 Validation Tests -- New Test File

**New file:** `packages/logger/tests/validation.test.ts`

| #   | Test                                               | Description                |
| --- | -------------------------------------------------- | -------------------------- |
| 1   | Function annotation value -- stripped with warning | `{ fn: () => {} }` removed |
| 2   | Symbol annotation value -- stripped with warning   | `{ s: Symbol() }` removed  |
| 3   | BigInt annotation value -- stripped with warning   | `{ n: 123n }` removed      |
| 4   | Circular reference -- detected and replaced        | `obj.self = obj` handled   |
| 5   | undefined value -- converted to null               | Explicit null in output    |
| 6   | Deeply nested object (depth > 10) -- truncated     | Stack overflow prevented   |
| 7   | Object with 100+ keys -- excess keys dropped       | Memory protection          |
| 8   | Valid annotations -- pass through unchanged        | No false positives         |
| 9   | Empty annotations -- pass through unchanged        | Edge case                  |
| 10  | Mixed valid/invalid annotations -- valid preserved | Selective removal          |

### 5.3 Sanitization Tests -- New Test File

**New file:** `packages/logger/tests/sanitize.test.ts`

| #   | Test                                                  | Description                     |
| --- | ----------------------------------------------------- | ------------------------------- |
| 1   | Newline in message -- escaped to literal `\n`         | Log injection prevention        |
| 2   | ANSI escape codes -- stripped                         | Color code injection prevention |
| 3   | Null bytes -- stripped                                | Binary injection prevention     |
| 4   | Carriage return -- escaped to literal `\r`            | Windows-style injection         |
| 5   | Tab character -- preserved                            | Tabs are legitimate             |
| 6   | Normal message -- unchanged                           | No false positives              |
| 7   | Unicode message -- preserved                          | International text support      |
| 8   | Fake log line injection attempt -- single line output | Full injection scenario         |

### 5.4 Sequence Number Tests -- New Test File

**New file:** `packages/logger/tests/sequence.test.ts`

| #   | Test                                          | Description                        |
| --- | --------------------------------------------- | ---------------------------------- |
| 1   | Sequence numbers monotonically increase       | Each entry.sequence > previous     |
| 2   | Sequence numbers are unique                   | No duplicates across rapid logging |
| 3   | Sequence numbers survive across child loggers | Global counter, not per-logger     |
| 4   | resetSequence() resets counter for testing    | Test isolation utility             |

### 5.5 Integrity Tests -- New Test File

**New file:** `packages/logger/tests/integrity.test.ts`

| #   | Test                               | Description                                          |
| --- | ---------------------------------- | ---------------------------------------------------- |
| 1   | Hash chain is continuous           | Each entry's previousHash matches prior entry's hash |
| 2   | Modified entry breaks chain        | Changing any field invalidates the hash              |
| 3   | Deleted entry detected             | Gap in sequence + hash mismatch                      |
| 4   | Empty chain starts from known seed | First entry's previousHash is defined constant       |

### 5.6 Sampling/Rate-Limit Tests -- Enhanced

**File:** `packages/logger/tests/sampling.test.ts` (new or extend existing)

| #   | Test                                         | Description                         |
| --- | -------------------------------------------- | ----------------------------------- |
| 1   | Seedable PRNG produces deterministic results | Same seed = same sampling decisions |
| 2   | Default (Math.random) still works            | Backward compatibility              |
| 3   | Drop notification callback fires             | `onDrop` called with count          |
| 4   | Summary log emitted on threshold             | Warning entry in underlying logger  |
| 5   | Error/fatal always sampled by default        | `alwaysLogErrors: true` behavior    |

### 5.7 Bunyan Adapter Tests -- Output Verification

**File:** `packages/logger-bunyan/tests/handler.test.ts` (rewrite)

| #   | Test                                                     | Description                                                   |
| --- | -------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Log entry appears in stream output                       | Capture Writable content, parse JSON, verify message          |
| 2   | Correct Bunyan level used                                | Verify `level` field in output matches expected numeric value |
| 3   | Context fields serialized                                | Verify `correlationId`, `service` appear in output JSON       |
| 4   | Annotation fields serialized                             | Verify custom fields appear in output JSON                    |
| 5   | Error object properly attached                           | Verify `err.message` and `err.name` in output                 |
| 6   | Span IDs present in output                               | Verify `traceId` and `spanId` fields                          |
| 7   | flush() completes when streams are drained               | Non-no-op flush verification                                  |
| 8   | shutdown() closes all streams                            | Verify streams end properly                                   |
| 9   | Error during handle -- error reported (after Change 3.1) | Inject failing stream, verify no throw                        |
| 10  | All six log levels map correctly                         | Parametric test across all levels                             |

### 5.8 Pino Adapter Tests -- Output Verification

**File:** `packages/logger-pino/tests/handler.test.ts` (rewrite)

| #   | Test                                  | Description                                       |
| --- | ------------------------------------- | ------------------------------------------------- |
| 1   | Log entry appears in output stream    | Create Pino with writable dest, parse JSON output |
| 2   | Correct Pino level number used        | Verify `level` field is correct numeric           |
| 3   | Context fields in output              | Verify correlationId, service in output           |
| 4   | Annotation fields in output           | Verify custom fields                              |
| 5   | Error attached                        | Verify err object in output                       |
| 6   | Span IDs in output                    | Verify traceId, spanId                            |
| 7   | flush() awaits callback completion    | Verify promise resolves after actual flush        |
| 8   | shutdown() flushes then resolves      | Verify clean shutdown                             |
| 9   | Error during handle -- no propagation | Inject error, verify caught                       |
| 10  | All six levels verified               | Parametric test                                   |

### 5.9 Winston Adapter Tests -- Output Verification

**File:** `packages/logger-winston/tests/handler.test.ts` (rewrite)

| #   | Test                                  | Description                                   |
| --- | ------------------------------------- | --------------------------------------------- |
| 1   | Log entry appears in transport output | Custom transport captures entries             |
| 2   | Correct Winston level string used     | Verify `level` field matches                  |
| 3   | Context fields in output              | Verify correlationId, service                 |
| 4   | Annotation fields in output           | Verify custom fields                          |
| 5   | Error metadata attached               | Verify error.name, error.message, error.stack |
| 6   | Span IDs in output                    | Verify traceId, spanId                        |
| 7   | flush() does NOT destroy logger       | Verify handler usable after flush             |
| 8   | flush() then handle() works           | Post-flush write succeeds                     |
| 9   | shutdown() properly closes            | Verify logger.end() called                    |
| 10  | Error during handle -- no propagation | Inject transport error                        |

### 5.10 Redaction Tests -- Enhanced

**File:** `packages/logger/tests/redaction.test.ts` (new or extend existing)

| #   | Test                                            | Description                               |
| --- | ----------------------------------------------- | ----------------------------------------- |
| 1   | Message-level redaction -- pattern replaces SSN | `messagePatterns: [/\d{3}-\d{2}-\d{4}/g]` |
| 2   | Message-level redaction -- multiple patterns    | Compound replacement                      |
| 3   | No redaction configured -- warning emitted once | Stderr warning behavior                   |
| 4   | Deep nesting redaction                          | 5+ levels deep annotation key             |
| 5   | Wildcard pattern matching                       | `*.secret` redaction                      |

### 5.11 Header Validation Tests -- New

**File:** `packages/logger/tests/context.test.ts` (new or extend existing)

| #   | Test                                  | Description                      |
| --- | ------------------------------------- | -------------------------------- |
| 1   | Normal correlation ID -- accepted     | Standard UUID format             |
| 2   | Oversized correlation ID -- truncated | 1000-char ID truncated to 256    |
| 3   | Control characters in ID -- sanitized | `\n\r\x00` stripped              |
| 4   | Empty ID -- ignored                   | Falsy check still works          |
| 5   | \_correlationIdSanitized flag set     | Flagged when sanitization occurs |

### 5.12 Formatting Error Handling Tests -- New

**File:** `packages/logger/tests/formatting.test.ts` (new or extend existing)

| #   | Test                                             | Description                      |
| --- | ------------------------------------------------ | -------------------------------- |
| 1   | JSON.stringify with circular reference -- caught | Returns fallback string          |
| 2   | JSON.stringify with BigInt -- caught             | Returns fallback string          |
| 3   | Pretty format with injection attempt -- escaped  | `\n[FATAL]` becomes `\\n[FATAL]` |
| 4   | Normal entries -- formatted correctly            | No regression                    |

### Test Count Summary

| Area                        | New Tests |   Existing Tests   | Total  |
| --------------------------- | :-------: | :----------------: | :----: |
| Error Handling              |     8     |         0          |   8    |
| Validation                  |    10     |         0          |   10   |
| Sanitization                |     8     |         0          |   8    |
| Sequence Numbers            |     4     |         0          |   4    |
| Integrity                   |     4     |         0          |   4    |
| Sampling/Rate-Limit         |     5     |         0          |   5    |
| Bunyan Output Verification  |    10     |    9 (rewrite)     |   10   |
| Pino Output Verification    |    10     |    9 (rewrite)     |   10   |
| Winston Output Verification |    10     |    7 (rewrite)     |   10   |
| Redaction                   |     5     |         0          |   5    |
| Header Validation           |     5     |         0          |   5    |
| Formatting Error Handling   |     4     |         0          |   4    |
| **Total**                   |  **83**   | **25 (rewritten)** | **83** |

---

## 6. Migration Notes

### 6.1 Breaking Changes

| #   | Change                                                   | Impact                                                                   | Migration                                                               |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 1   | `LogEntry` gains required `sequence` field               | All code constructing `LogEntry` manually must add `sequence`            | Import `nextSequence()` and add `sequence: nextSequence()`              |
| 2   | `SamplingConfig` gains optional `randomFn` field         | No breakage -- field is optional                                         | No action needed                                                        |
| 3   | `RateLimitConfig` gains optional `randomFn` field        | No breakage -- field is optional                                         | No action needed                                                        |
| 4   | `RedactionConfig` gains optional `messagePatterns` field | No breakage -- field is optional                                         | No action needed                                                        |
| 5   | Handler errors no longer propagate to callers            | Code that relied on catching logger errors will no longer catch them     | Check for try/catch blocks around logger calls (likely unnecessary)     |
| 6   | Annotations may be modified by validation                | Functions, symbols, BigInt values will be stripped                       | Ensure annotations only contain serializable values                     |
| 7   | Messages are sanitized (newlines escaped)                | Multi-line messages will render as single lines                          | Use annotations for structured data instead of message strings          |
| 8   | Winston `flush()` no longer destroys the logger          | Code that called `flush()` as a shutdown mechanism must use `shutdown()` | Replace `flush()` with `shutdown()` where permanent closure is intended |

### 6.2 Backward Compatibility Considerations

Per project rules (CLAUDE.md: "No backward compatibility"), all changes should be implemented as the cleanest solution without compatibility shims. However, for practical migration:

1. **The `sequence` field on `LogEntry`** is the most impactful breaking change. All test helpers (like `makeEntry()` in adapter tests) must be updated. The `assertLogEntry` matcher should be updated to optionally match on sequence.

2. **Validation warnings** go to stderr, not the logger itself, so they will not create recursive logging issues.

3. **The `randomFn` parameter** defaults to `Math.random`, so existing sampling/rate-limit configurations continue to work without changes.

### 6.3 Adapter Package Versioning

All adapter packages (`logger-bunyan`, `logger-pino`, `logger-winston`) must bump their major version due to changed `flush()`/`shutdown()` semantics. The peer dependency on `@hex-di/logger` must be updated to require the new version with `sequence` in `LogEntry`.

---

## 7. Tracing Warning Strategy

### 7.1 Principle

Tracing remains **OPTIONAL**. The logger is about logging, not tracing. However, in GxP environments, the absence of tracing context (correlationId, traceId, spanId) in log entries is a significant audit trail gap that operators must be aware of.

### 7.2 Implementation

**When to warn:**

1. **No SpanProvider configured:** When `withSpanInjection()` is not used, or when `createSpanProvider()` returns the no-op provider, emit a one-time warning on the first log entry at `warn` level or above.

2. **Missing correlationId:** When a `HandlerLoggerImpl` processes an entry whose `context.correlationId` is `undefined`, emit a one-time warning to stderr.

3. **Missing traceId in entry:** When an entry reaches a handler without `spans` or with empty `spans`, and a `SpanProvider` was configured but returned no active span, emit a periodic (not per-entry) warning.

### 7.3 Warning Implementation

**File:** `packages/logger/src/tracing/span-injection.ts`

Add warning state to the `withSpanInjection()` wrapper:

```typescript
export function withSpanInjection(
  logger: Logger,
  spanProvider: SpanProvider = createSpanProvider()
): Logger {
  let noSpanWarningEmitted = false;

  function enrichAnnotations(
    annotations: Record<string, unknown> | undefined
  ): Record<string, unknown> | undefined {
    const spans = spanProvider();
    if (!spans || spans.length === 0) {
      if (!noSpanWarningEmitted) {
        noSpanWarningEmitted = true;
        const fallback = getStderr();
        if (fallback) {
          fallback(
            "[LOGGER TRACING] No active tracing span found. Log entries will not " +
              "include traceId/spanId. Configure a SpanProvider for full tracing context. " +
              "This warning appears once per withSpanInjection() instance."
          );
        }
      }
      return annotations;
    }
    return mergeSpanAnnotations(annotations, spans);
  }
  // ... rest of wrapper
}
```

**File:** `packages/logger/src/adapters/scoped/logger.ts`

Add correlationId check in `_log()`:

```typescript
private static _correlationWarningEmitted = false;

private _log(/* ... */): void {
  // ... existing level check ...

  // Warn once if correlationId is missing on warn/error/fatal
  if (!HandlerLoggerImpl._correlationWarningEmitted &&
      (level === "warn" || level === "error" || level === "fatal") &&
      !this._context.correlationId) {
    HandlerLoggerImpl._correlationWarningEmitted = true;
    const fallback = getStderr();
    if (fallback) {
      fallback("[LOGGER TRACING] Log entry at level=" + level + " has no correlationId in context. " +
        "For GxP audit trail completeness, ensure correlationId is set via child() or middleware. " +
        "This warning appears once per process.");
    }
  }

  // ... rest of _log ...
}
```

### 7.4 Warning Behavior Summary

| Condition                                | Warning Channel | Frequency                 | Severity      |
| ---------------------------------------- | --------------- | ------------------------- | ------------- |
| No SpanProvider configured               | stderr          | Once per wrapper instance | Informational |
| SpanProvider returns empty               | stderr          | Once per wrapper instance | Informational |
| No correlationId on warn/error/fatal     | stderr          | Once per process          | Warning       |
| No traceId after SpanProvider configured | stderr          | Once per wrapper instance | Warning       |

### 7.5 Inspector Event Integration

Add a `tracing-context-missing` event type to the inspector:

```typescript
| { readonly type: "tracing-context-missing"; readonly field: "correlationId" | "traceId" | "spanId" }
```

This allows programmatic monitoring of tracing gaps without parsing stderr.

---

## 8. Projected Score After Implementation

| #   | Criterion                       | Current |  After   |  Delta   | Key Changes                                                     |
| --- | ------------------------------- | :-----: | :------: | :------: | --------------------------------------------------------------- |
| 1   | Data Integrity (ALCOA+)         |   6.5   |   10.0   |   +3.5   | Sequence numbers, tamper evidence, annotation validation        |
| 2   | Traceability & Audit Trail      |   7.5   |   10.0   |   +2.5   | Tracing warnings, drop notifications, hash chain                |
| 3   | Determinism & Reproducibility   |   5.5   |   10.0   |   +4.5   | Seedable PRNG, crypto request IDs, deterministic ordering       |
| 4   | Error Handling & Recovery       |   3.0   |   10.0   |   +7.0   | try/catch everywhere, fallback to stderr, proper flush/shutdown |
| 5   | Validation & Input Verification |   4.5   |   10.0   |   +5.5   | Annotation validation, header validation, sanitization          |
| 6   | Change Control & Versioning     |   8.0   |   10.0   |   +2.0   | Error contract documentation, semantic flush/shutdown split     |
| 7   | Testing & Verification          |   4.5   |   10.0   |   +5.5   | 83 new tests, output verification, error injection              |
| 8   | Security                        |   5.5   |   10.0   |   +4.5   | Log injection prevention, message redaction, mandatory warnings |
| 9   | Documentation                   |   7.0   |   10.0   |   +3.0   | Error contracts, warning documentation, GxP notes               |
| 10  | Compliance-Specific (Logging)   |   5.5   |   10.0   |   +4.5   | Sequence numbers, drop notifications, integrity hashing         |
|     | **Overall**                     | **5.8** | **10.0** | **+4.2** |                                                                 |

---

## 9. Implementation Order

The changes are organized in dependency order. Each phase builds on the previous one.

### Phase 1: Foundation Safety (Changes 3.16, 3.1, 3.17)

1. Create `stderr.ts` utility (no dependencies)
2. Wrap `handler.handle()` in try/catch with stderr fallback
3. Document error contract on `LogHandler.handle()`

**Validates:** Error Handling criterion moves from 3.0 to ~7.0

### Phase 2: Input Safety (Changes 3.2, 3.9, 3.14)

4. Create `validation.ts` for annotation sanitization
5. Create `sanitize.ts` for log injection prevention
6. Add header validation to `context.ts`
7. Wire validation/sanitization into all `_log()` methods

**Validates:** Validation criterion moves from 4.5 to ~9.0

### Phase 3: Data Model Enhancement (Changes 3.8, 3.10)

8. Create `sequence.ts` for monotonic counters
9. Add `sequence` field to `LogEntry`
10. Create `integrity.ts` for hash chain
11. Add optional `integrity` field to `LogEntry`
12. Update all `_log()` methods to assign sequence numbers

**Validates:** Data Integrity criterion moves from 6.5 to ~9.5

### Phase 4: Determinism (Changes 3.4, 3.13)

13. Add `randomFn` to `SamplingConfig` and `RateLimitConfig`
14. Add drop notification to sampling and rate limiting
15. Replace `Math.random()` with `crypto.randomUUID()` in Hono middleware

**Validates:** Determinism criterion moves from 5.5 to ~9.5

### Phase 5: Adapter Fixes (Changes 3.5, 3.6, 3.7, 3.3)

16. Fix Bunyan flush/shutdown with stream iteration
17. Fix Pino flush to await callback
18. Fix Winston flush to be non-destructive
19. Fix Console logger with drop counter and fallback

**Validates:** Error Handling reaches 10.0 across all adapters

### Phase 6: Security (Changes 3.11, 3.12)

20. Add redaction warning when not configured
21. Add message-level redaction via `messagePatterns`

**Validates:** Security criterion reaches 10.0

### Phase 7: Tracing Warnings (per Section 7)

22. Add tracing context warnings to `withSpanInjection()`
23. Add correlationId warning to `HandlerLoggerImpl`
24. Add inspector events for tracing gaps

**Validates:** Traceability criterion reaches 10.0

### Phase 8: Tests (per Section 5)

25. Write error handling tests (8 tests)
26. Write validation tests (10 tests)
27. Write sanitization tests (8 tests)
28. Write sequence/integrity tests (8 tests)
29. Write sampling/rate-limit tests (5 tests)
30. Rewrite Bunyan tests with output verification (10 tests)
31. Rewrite Pino tests with output verification (10 tests)
32. Rewrite Winston tests with output verification (10 tests)
33. Write redaction tests (5 tests)
34. Write header validation tests (5 tests)
35. Write formatting error tests (4 tests)

**Validates:** Testing criterion reaches 10.0

### Phase 9: Bounded Memory + Documentation (Changes 3.15)

36. Add bounded capacity to MemoryLogger
37. Export new utilities from `index.ts`
38. Update all JSDoc for new parameters and behaviors

**Validates:** All remaining criteria reach 10.0

---

## 10. Risk Assessment

| Risk                                                       | Likelihood | Impact | Mitigation                                                                  |
| ---------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------- |
| Sequence numbers break external code constructing LogEntry | Medium     | High   | Provide `createLogEntry()` factory function that auto-assigns sequence      |
| Annotation validation strips legitimate edge-case values   | Low        | Medium | Make validation configurable (strict/permissive mode)                       |
| stderr fallback not available on all runtimes              | Low        | Low    | Fallback chain: process.stderr -> console.error -> silent                   |
| Hash chain computation adds latency to hot path            | Low        | Medium | Use FNV-1a (non-crypto, ~nanosecond per hash). Opt-in via `withIntegrity()` |
| Winston transport drain timing is non-deterministic        | Medium     | Medium | Safety timeout (5 seconds) on drain promise                                 |
| Tracing warnings generate noise in non-GxP environments    | Medium     | Low    | All warnings are one-time-per-instance. Can be suppressed via config flag   |

---

_End of Technical Refinement Document_
