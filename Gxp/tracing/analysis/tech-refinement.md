# Technical Refinement: @hex-di/tracing Stack -- Path to 10/10 GxP Compliance

**Date:** 2026-02-10
**Current Score:** 7.1 / 10
**Target Score:** 10.0 / 10
**Scope:** `@hex-di/tracing` (core), `@hex-di/tracing-otel`, `@hex-di/tracing-datadog`, `@hex-di/tracing-zipkin`, `@hex-di/tracing-jaeger`

**Constraint:** Tracing is the package under remediation. Its internal features must be robust and fully GxP-compliant. Other hex-di packages (flow, query, store, saga, runtime) use tracing optionally -- when they do not use it, they should emit a structured warning, not fail.

---

## 1. Current Score Breakdown (Per Sub-Package)

### 1.1 @hex-di/tracing (Core) -- 7.7/10

| Criterion                     | Score | Key Issue                                                                                                         |
| ----------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------- |
| Data Integrity (ALCOA+)       | 8/10  | FIFO eviction silently drops spans in `MemoryTracer._collectSpan()` (line 304-316 of `adapters/memory/tracer.ts`) |
| Traceability & Audit Trail    | 8/10  | Module-level `spanStack` in `instrumentation/span-stack.ts` (line 31) shared across concurrent async contexts     |
| Determinism & Reproducibility | 7/10  | `MemorySpan.init()` uses `Date.now()` (line 143 of `adapters/memory/span.ts`) instead of `getHighResTimestamp()`  |
| Error Handling & Recovery     | 7/10  | No retry mechanism; `Math.random` fallback in `id-generation.ts` (lines 47-49) is silent                          |
| Validation & Input            | 8/10  | No attribute key length limits; no attribute value size limits; no `tracestate` grammar validation                |
| Change Control                | 9/10  | Clean port/adapter separation                                                                                     |
| Testing                       | 8/10  | 23 test files, strong coverage                                                                                    |
| Security                      | 5/10  | No PII filtering; stack traces exported verbatim; no attribute sanitization                                       |
| Documentation                 | 9/10  | Comprehensive JSDoc                                                                                               |
| Compliance-Specific           | 8/10  | No baggage propagation; no processor-level sampling                                                               |

### 1.2 @hex-di/tracing-otel -- 7.0/10

| Criterion      | Score | Key Issue                                                                                  |
| -------------- | ----- | ------------------------------------------------------------------------------------------ |
| Data Integrity | 7/10  | `BatchSpanProcessor.onEnd()` drops spans silently at line 157-158 of `processors/batch.ts` |
| Traceability   | 7/10  | Hardcoded `instrumentationScope.version: "0.1.0"` in `span-adapter.ts` line 113            |
| Determinism    | 7/10  | Shutdown timeout (30s) same as export timeout, can consume entire shutdown window          |
| Error Handling | 7/10  | No retry on failed exports in `otlp-http.ts`; errors logged and discarded                  |
| Validation     | 6/10  | No validation on exporter endpoint URL; no HTTPS enforcement                               |
| Change Control | 8/10  | Proper dependency chain                                                                    |
| Testing        | 7/10  | Only 3 test files; no integration tests with mocked OTLP backends                          |
| Security       | 5/10  | Attributes exported verbatim; HTTP default endpoint                                        |
| Documentation  | 8/10  | Good JSDoc                                                                                 |
| Compliance     | 8/10  | OTel-compatible format                                                                     |

### 1.3 @hex-di/tracing-datadog -- 6.0/10

| Criterion      | Score | Key Issue                                                                                                                       |
| -------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| Data Integrity | 6/10  | Parent-child Map integrity: `activeSpans.delete()` at line 175 of `bridge.ts` removes parent before cross-batch children arrive |
| Traceability   | 5/10  | Cross-batch parent lookup always fails; `childOf: undefined` for late children                                                  |
| Determinism    | 6/10  | Span processing order within batch is deterministic, but cross-batch is not                                                     |
| Error Handling | 7/10  | Per-span try/catch at line 176; batch-level try/catch at line 184                                                               |
| Validation     | 5/10  | No config validation; no tracer initialization check; no tag value validation                                                   |
| Change Control | 7/10  | Peer dependency pattern is correct                                                                                              |
| Testing        | 6/10  | 1 test file; no cross-batch tests; no concurrent export tests                                                                   |
| Security       | 4/10  | All attributes exported as tags verbatim; no PII filtering                                                                      |
| Documentation  | 8/10  | Good JSDoc                                                                                                                      |
| Compliance     | 6/10  | DD-specific kind mapping; no span link support                                                                                  |

### 1.4 @hex-di/tracing-zipkin -- 6.7/10

| Criterion      | Score | Key Issue                                                                                              |
| -------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| Data Integrity | 7/10  | Relies on OTel conversion; no data loss tracking                                                       |
| Error Handling | 7/10  | No retry; errors logged at line 240 of `exporter.ts`                                                   |
| Validation     | 6/10  | No URL validation; HTTP default                                                                        |
| Testing        | 6/10  | 1 test file; no shutdown timeout tests                                                                 |
| Security       | 5/10  | HTTP default endpoint; no PII filtering                                                                |
| Compliance     | 7/10  | No timeout on `shutdown()` at line 273; underlying `zipkinExporter.shutdown()` could hang indefinitely |

### 1.5 @hex-di/tracing-jaeger -- 6.7/10

| Criterion      | Score | Key Issue                                                                                              |
| -------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| Data Integrity | 7/10  | Relies on OTel conversion; no data loss tracking                                                       |
| Error Handling | 7/10  | No retry; errors logged at line 241 of `exporter.ts`                                                   |
| Validation     | 6/10  | No endpoint validation; HTTP default                                                                   |
| Testing        | 6/10  | 1 test file; no shutdown timeout tests                                                                 |
| Security       | 5/10  | HTTP default endpoint; no PII filtering                                                                |
| Compliance     | 7/10  | No timeout on `shutdown()` at line 275; underlying `jaegerExporter.shutdown()` could hang indefinitely |

---

## 2. Gap Analysis

### 2.1 CRITICAL Gaps (Blocking GxP Compliance)

#### GAP-C1: Silent Span Eviction Without Audit Trail

**Locations:**

- `packages/tracing/src/adapters/memory/tracer.ts` lines 304-316 (`_collectSpan`)
- `packages/tracing-otel/src/processors/batch.ts` lines 157-158 (`onEnd`)

**Problem:** When the circular buffer (MemoryTracer, default 10,000) or span queue (BatchSpanProcessor, default 2,048) reaches capacity, the oldest span is silently overwritten/shifted. No counter is incremented, no callback is invoked, no log message is emitted.

**GxP Requirement:** In regulated environments, data loss must be recorded. ALCOA+ mandates that lost records are counted and reported so auditors can assess completeness.

**Impact:** Any audit that compares expected span count to actual exported span count will have an unexplained gap.

#### GAP-C2: No PII Filtering or Attribute Sanitization

**Locations:**

- `packages/tracing/src/adapters/memory/span.ts` lines 153-161 (`setAttribute`)
- `packages/tracing/src/adapters/console/tracer.ts` lines 77-81 (`setAttribute`)
- All exporter `export()` methods pass `hexSpan.attributes` through without filtering

**Problem:** Any value passed to `setAttribute()` flows through every exporter verbatim. There is no mechanism to:

- Define sensitive attribute keys (e.g., `user.email`, `user.ssn`)
- Redact values matching PII patterns (email, IP, SSN)
- Limit attribute value sizes to prevent data exfiltration
- Scrub stack traces captured via `includeStackTrace: true`

**GxP Requirement:** Data minimization and access control. PII must not leak to third-party observability backends.

#### GAP-C3: Module-Level Span Stack Without Async Isolation

**Location:** `packages/tracing/src/instrumentation/span-stack.ts` line 31

**Problem:** The `spanStack: Span[]` is a single module-scoped array. In Node.js handling concurrent HTTP requests, all requests share the same stack. Request A's span is pushed, then Request B's span is pushed. When Request A pops, it gets Request B's span -- corrupting both traces.

**GxP Requirement:** Traceability requires correct parent-child hierarchy. Shared mutable state across concurrent contexts produces non-deterministic, incorrect traces.

### 2.2 HIGH Gaps (Required for Production Readiness)

#### GAP-H1: No Retry Mechanism for Failed Exports

**Locations:**

- `packages/tracing-otel/src/exporters/otlp-http.ts` lines 124-127 (catch, logError, done)
- `packages/tracing-zipkin/src/exporter.ts` lines 238-241 (same pattern)
- `packages/tracing-jaeger/src/exporter.ts` lines 240-243 (same pattern)
- `packages/tracing-datadog/src/bridge.ts` lines 184-187 (same pattern)

**Problem:** The `SpanExporter` port interface JSDoc at `ports/exporter.ts` line 29 says "Failed exports should be retried with exponential backoff" but no implementation follows this. A single transient network failure permanently loses the entire batch.

#### GAP-H2: DataDog Bridge Parent-Child Map Integrity

**Location:** `packages/tracing-datadog/src/bridge.ts` lines 69, 91-93, 103, 175

**Problem:** The `activeSpans` Map stores DD spans keyed by `spanId`. Each span is deleted from the map immediately after `ddSpan.finish()` (line 175). If a parent span finishes in batch N and its child arrives in batch N+1, the parent is gone and `childOf` is `undefined`.

Additionally, the Map is never bounded -- a large batch with many concurrent traces could grow the Map unboundedly.

#### GAP-H3: Math.random Fallback Silent Usage

**Location:** `packages/tracing/src/utils/id-generation.ts` lines 44-52

**Problem:** When `crypto.getRandomValues()` is unavailable, the fallback uses `Math.random()` without any log or warning. `Math.random()` is not cryptographically secure and has collision risk under high throughput. The user has no indication that their trace IDs are being generated with a weak PRNG.

#### GAP-H4: Hardcoded 30s Export Timeout Doubles as Shutdown Timeout

**Location:** `packages/tracing-otel/src/processors/batch.ts` line 229

**Problem:** The `exportTimeoutMillis` (default 30,000ms) is reused for both normal export timeouts and shutdown timeout (line 229). During SIGTERM with a 30-second grace period, this 30-second timeout consumes the entire window, leaving zero time for other cleanup.

#### GAP-H5: setStatus() Immutability Inconsistency Between Adapters

**Locations:**

- `packages/tracing/src/adapters/memory/span.ts` lines 203-208: Always overwrites status
- `packages/tracing/src/adapters/console/tracer.ts` lines 98-103: Guards with `this._status !== "ok"`
- `packages/tracing/src/types/status.ts` line 51: JSDoc says "Status is immutable once set"
- `packages/tracing/src/types/span.ts` line 183: JSDoc says "Cannot change from 'ok' to 'error'"

**Problem:** The `Span` interface contract says status is immutable once set to `ok`. ConsoleSpan enforces this (`this._status !== "ok"` guard). MemorySpan does not -- it always overwrites. The same code produces different trace data depending on which adapter is used.

### 2.3 MEDIUM Gaps (Strengthen Compliance Posture)

#### GAP-M1: No Attribute Key Length / Value Size Limits

**Location:** All `setAttribute()` / `setAttributes()` implementations

**Problem:** No limit on attribute key length, value string length, or array size. A developer could accidentally attach a 10MB SQL query or large JSON payload as an attribute value.

#### GAP-M2: No tracestate Validation

**Location:** `packages/tracing/src/context/propagation.ts` line 91

**Problem:** The `tracestate` header is accepted as-is without validating the W3C grammar: max 512 characters, comma-separated list-members, key format `[a-z][_0-9a-z-*/]@[a-z][_0-9a-z-*/]` or `[a-z][_0-9a-z-*/]{0,255}`.

#### GAP-M3: No Export Metrics / Observability

**Location:** All exporter and processor implementations

**Problem:** No counters for: spans exported successfully, spans failed to export, spans dropped from buffer, export latency, batch sizes. Without these metrics, operators cannot monitor the health of the tracing pipeline itself.

#### GAP-M4: Zipkin/Jaeger Exporters Have No Shutdown Timeout

**Locations:**

- `packages/tracing-zipkin/src/exporter.ts` lines 266-278 (`shutdown()`)
- `packages/tracing-jaeger/src/exporter.ts` lines 268-280 (`shutdown()`)

**Problem:** Both `shutdown()` implementations call the underlying OTel exporter's `shutdown()` with `await` but no timeout protection. If the backend is unreachable, `shutdown()` hangs indefinitely, blocking process termination.

#### GAP-M5: No Warning Strategy When Tracing Is Disabled

**Locations:**

- The NoOp tracer at `adapters/noop/tracer.ts` is completely silent
- External packages (Flow, Query, Store, Saga) that use TracerLike may or may not have tracing configured

**Problem:** When a package expects tracing but it is not configured, there is no structured warning. Operations succeed but users have no visibility into the fact that traces are being discarded.

### 2.4 LOW Gaps (Enhancement)

#### GAP-L1: MemorySpan Uses Date.now() Instead of getHighResTimestamp()

**Location:** `packages/tracing/src/adapters/memory/span.ts` line 143

**Problem:** Sub-millisecond spans appear as zero-duration. The `getHighResTimestamp()` utility exists at `utils/timing.ts` but is not used.

#### GAP-L2: Hardcoded instrumentationScope.version

**Location:** `packages/tracing-otel/src/adapters/span-adapter.ts` line 113

**Problem:** Version is hardcoded as `"0.1.0"`. Should be derived from package.json or configurable.

#### GAP-L3: No HTTPS Enforcement for Production Endpoints

**Locations:**

- OTLP default: `http://localhost:4318/v1/traces` (line 81 of `otlp-http.ts`)
- Zipkin default: `http://localhost:9411/api/v2/spans` (line 194 of zipkin `exporter.ts`)
- Jaeger default: `http://localhost:14268/api/traces` (line 197 of jaeger `exporter.ts`)

**Problem:** No option to warn or enforce HTTPS in production.

---

## 3. Required Changes (Exact Files, Code, Rationale)

### 3.1 FIX-C1: Span Eviction Audit Trail

#### 3.1.1 MemoryTracer: Add droppedSpanCount and onDrop callback

**File:** `packages/tracing/src/adapters/memory/tracer.ts`

**Current code (lines 82-88):**

```typescript
constructor(maxSpans = 10000, defaultAttributes: Attributes = {}) {
  this._maxSpans = maxSpans;
  this._spans = new Array(maxSpans);
  this._defaultAttributes = defaultAttributes;
  this._hasDefaultAttributes = Object.keys(defaultAttributes).length > 0;
  this._onSpanEnd = this._collectSpan.bind(this);
}
```

**Required changes:**

1. Add a `MemoryTracerOptions` interface:

```typescript
export interface MemoryTracerOptions {
  readonly maxSpans?: number;
  readonly defaultAttributes?: Attributes;
  readonly onDrop?: (spanData: SpanData, droppedCount: number) => void;
}
```

2. Add fields to `MemoryTracer`:

```typescript
private _droppedSpanCount = 0;
private readonly _onDrop: ((spanData: SpanData, droppedCount: number) => void) | undefined;
```

3. Update `_collectSpan` to track drops:

```typescript
private _collectSpan(spanData: SpanData): void {
  this._spans[this._tail] = spanData;
  this._tail = (this._tail + 1) % this._maxSpans;

  if (this._size < this._maxSpans) {
    this._size++;
  } else {
    // Buffer full -- record the drop
    const droppedSpan = this._spans[this._head];
    this._head = (this._head + 1) % this._maxSpans;
    this._droppedSpanCount++;

    if (this._onDrop && droppedSpan !== undefined) {
      this._onDrop(droppedSpan, this._droppedSpanCount);
    }
  }
}
```

4. Add public accessor:

```typescript
get droppedSpanCount(): number {
  return this._droppedSpanCount;
}
```

5. Update `clear()` to reset counter:

```typescript
clear(): void {
  this._head = 0;
  this._tail = 0;
  this._size = 0;
  this._droppedSpanCount = 0;
  this._spans.fill(undefined);
  this._spanStack.length = 0;
}
```

6. Update `createMemoryTracer` factory to accept options.

**Rationale:** GxP auditors need a count of dropped records. The optional `onDrop` callback allows upstream consumers (e.g., a metrics pipeline) to be notified in real time.

#### 3.1.2 BatchSpanProcessor: Add drop counter and onDrop

**File:** `packages/tracing-otel/src/processors/batch.ts`

**Current code (lines 157-158):**

```typescript
if (spanBuffer.length >= maxQueueSize) {
  spanBuffer.shift();
}
```

**Required changes:**

1. Add `onDrop` to `BatchSpanProcessorOptions`:

```typescript
export interface BatchSpanProcessorOptions {
  // ... existing fields ...
  readonly onDrop?: (spanData: SpanData, totalDropped: number) => void;
}
```

2. Add counter and callback to processor closure:

```typescript
let droppedSpanCount = 0;
const onDrop = options?.onDrop;
```

3. Update onEnd to track drops:

```typescript
if (spanBuffer.length >= maxQueueSize) {
  const dropped = spanBuffer.shift();
  droppedSpanCount++;
  if (onDrop && dropped !== undefined) {
    onDrop(dropped, droppedSpanCount);
  }
}
```

4. Expose drop count via a getter on the returned object. Since the processor is a plain object, add a `droppedSpanCount` property:

```typescript
return {
  get droppedSpanCount(): number { return droppedSpanCount; },
  onStart(_span: Span): void { ... },
  onEnd(spanData: SpanData): void { ... },
  // ...
};
```

**Rationale:** Identical reasoning -- audit trail for dropped data within the export pipeline.

### 3.2 FIX-C2: PII Filtering / Attribute Sanitization

#### 3.2.1 Core: Define AttributeFilter interface and pipeline

**New file:** `packages/tracing/src/types/attribute-filter.ts`

```typescript
/**
 * Configuration for attribute sanitization in the tracing pipeline.
 *
 * Applied before span data is passed to exporters, ensuring PII
 * and sensitive data are redacted at the source.
 */
export interface AttributeFilterConfig {
  /**
   * Attribute keys that should be completely removed before export.
   * Matched exactly (case-sensitive).
   *
   * @example ['user.email', 'user.ssn', 'auth.token']
   */
  readonly blockedKeys?: readonly string[];

  /**
   * Key prefixes that should be removed.
   * Any attribute key starting with a blocked prefix is removed.
   *
   * @example ['pii.', 'secret.']
   */
  readonly blockedKeyPrefixes?: readonly string[];

  /**
   * Maximum length for string attribute values.
   * Values exceeding this length are truncated with a '[TRUNCATED]' suffix.
   *
   * @default 4096
   */
  readonly maxValueLength?: number;

  /**
   * Maximum length for attribute keys.
   * Keys exceeding this length cause the attribute to be dropped.
   *
   * @default 256
   */
  readonly maxKeyLength?: number;

  /**
   * Maximum number of elements in array attribute values.
   * Arrays exceeding this limit are truncated.
   *
   * @default 128
   */
  readonly maxArrayLength?: number;

  /**
   * Custom redaction function applied to all string values.
   * Return the redacted value, or undefined to remove the attribute.
   *
   * @example (key, value) => key.includes('email') ? '[REDACTED]' : value
   */
  readonly redactValue?: (key: string, value: string) => string | undefined;
}
```

**New file:** `packages/tracing/src/utils/attribute-filter.ts`

```typescript
import type { Attributes, AttributeValue } from "../types/index.js";
import type { AttributeFilterConfig } from "../types/attribute-filter.js";

const DEFAULT_MAX_VALUE_LENGTH = 4096;
const DEFAULT_MAX_KEY_LENGTH = 256;
const DEFAULT_MAX_ARRAY_LENGTH = 128;

/**
 * Creates a reusable attribute filter function from config.
 *
 * Returns a function that accepts Attributes and returns
 * sanitized Attributes with PII redacted and sizes enforced.
 */
export function createAttributeFilter(
  config: AttributeFilterConfig
): (attributes: Attributes) => Attributes {
  const blockedKeys = new Set(config.blockedKeys ?? []);
  const blockedPrefixes = config.blockedKeyPrefixes ?? [];
  const maxValueLength = config.maxValueLength ?? DEFAULT_MAX_VALUE_LENGTH;
  const maxKeyLength = config.maxKeyLength ?? DEFAULT_MAX_KEY_LENGTH;
  const maxArrayLength = config.maxArrayLength ?? DEFAULT_MAX_ARRAY_LENGTH;
  const redactValue = config.redactValue;

  function isBlocked(key: string): boolean {
    if (blockedKeys.has(key)) return true;
    for (const prefix of blockedPrefixes) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  }

  function sanitizeValue(key: string, value: AttributeValue): AttributeValue | undefined {
    if (typeof value === "string") {
      let sanitized = value;
      if (redactValue) {
        const result = redactValue(key, sanitized);
        if (result === undefined) return undefined;
        sanitized = result;
      }
      if (sanitized.length > maxValueLength) {
        return sanitized.slice(0, maxValueLength) + "[TRUNCATED]";
      }
      return sanitized;
    }
    if (Array.isArray(value)) {
      if (value.length > maxArrayLength) {
        return value.slice(0, maxArrayLength);
      }
    }
    return value;
  }

  return function filterAttributes(attributes: Attributes): Attributes {
    const filtered: Record<string, AttributeValue> = {};
    for (const key in attributes) {
      if (key.length > maxKeyLength) continue;
      if (isBlocked(key)) continue;
      const sanitized = sanitizeValue(key, attributes[key]);
      if (sanitized !== undefined) {
        filtered[key] = sanitized;
      }
    }
    return filtered;
  };
}
```

#### 3.2.2 Core: Wire attribute filter into SpanProcessor port

**File:** `packages/tracing/src/ports/processor.ts`

Add an optional `attributeFilter` property to the `SpanProcessor` interface or, better, introduce a wrapper:

**New file:** `packages/tracing/src/utils/filtering-processor.ts`

```typescript
import type { Span, SpanData, SpanProcessor } from "../index.js";
import type { Attributes } from "../types/index.js";

/**
 * Wraps a SpanProcessor with an attribute filter applied before onEnd.
 *
 * This ensures that by the time SpanData reaches any exporter, PII
 * has already been redacted.
 */
export function createFilteringProcessor(
  inner: SpanProcessor,
  filterFn: (attributes: Attributes) => Attributes
): SpanProcessor {
  return {
    onStart(span: Span): void {
      inner.onStart(span);
    },
    onEnd(spanData: SpanData): void {
      const filtered: SpanData = {
        ...spanData,
        attributes: filterFn(spanData.attributes),
        events: spanData.events.map(event => ({
          ...event,
          attributes: event.attributes ? filterFn(event.attributes) : event.attributes,
        })),
      };
      inner.onEnd(filtered);
    },
    forceFlush(): Promise<void> {
      return inner.forceFlush();
    },
    shutdown(): Promise<void> {
      return inner.shutdown();
    },
  };
}
```

**Rationale:** Attribute filtering at the processor level ensures no exporter (OTLP, Zipkin, Jaeger, DataDog) can receive unfiltered data. The filter is configurable and composable -- users declare their PII rules once, and they apply universally.

### 3.3 FIX-C3: AsyncLocalStorage-Backed Span Stack

**File:** `packages/tracing/src/instrumentation/span-stack.ts`

**Current code (line 31):**

```typescript
const spanStack: Span[] = [];
```

**Required changes:**

Replace the module-level array with an `AsyncLocalStorage`-backed store on Node.js, falling back to a global array for browsers/edge runtimes.

```typescript
import type { Span } from "../types/index.js";

interface SpanStackStore {
  stack: Span[];
}

// Attempt to load AsyncLocalStorage at module initialization
let asyncLocalStorage:
  | { getStore(): SpanStackStore | undefined; run<T>(store: SpanStackStore, fn: () => T): T }
  | undefined;

// Feature-detect AsyncLocalStorage availability
try {
  if (typeof globalThis !== "undefined" && "process" in globalThis) {
    // Node.js environment -- check for async_hooks
    const g: Record<string, unknown> = globalThis;
    const proc = g.process;
    if (proc && typeof proc === "object" && "versions" in proc) {
      const versions = (proc as Record<string, unknown>).versions;
      if (versions && typeof versions === "object" && "node" in versions) {
        // Dynamic import would be ideal but module-level is needed.
        // Use require-like pattern via globalThis detection.
        // The actual import is handled at runtime initialization.
      }
    }
  }
} catch {
  // AsyncLocalStorage not available -- fall through to global stack
}

// Fallback: module-level global stack (browsers, edge runtimes)
const globalStack: Span[] = [];

function getStack(): Span[] {
  if (asyncLocalStorage) {
    const store = asyncLocalStorage.getStore();
    if (store) return store.stack;
  }
  return globalStack;
}

export function pushSpan(span: Span): void {
  getStack().push(span);
}

export function popSpan(): Span | undefined {
  return getStack().pop();
}

export function getActiveSpan(): Span | undefined {
  const stack = getStack();
  return stack.length > 0 ? stack[stack.length - 1] : undefined;
}

export function clearStack(): void {
  getStack().length = 0;
}

export function getStackDepth(): number {
  return getStack().length;
}

/**
 * Initialize async-local span context.
 *
 * Call this at the entry point of each request/operation to get
 * per-context span isolation. The returned function executes
 * the provided callback within an isolated span stack context.
 *
 * In environments without AsyncLocalStorage, this is a no-op
 * wrapper that executes the callback immediately with the global stack.
 */
export function initializeAsyncContext(): ((fn: () => void) => void) | undefined {
  if (asyncLocalStorage) {
    return (fn: () => void) => {
      asyncLocalStorage!.run({ stack: [] }, fn);
    };
  }
  return undefined;
}
```

**Note:** The actual AsyncLocalStorage initialization requires a build-time or initialization-time step. The implementation should use conditional `import('node:async_hooks')` with a top-level await or an `initialize()` function that users call at application startup. The exact mechanism depends on the project's module resolution strategy. A practical approach:

**New file:** `packages/tracing/src/instrumentation/async-context.ts`

This file provides the `initAsyncSpanContext()` function that users call once at startup in Node.js environments:

```typescript
import type { Span } from "../types/index.js";

interface SpanStackStore {
  stack: Span[];
}

let _als:
  | {
      getStore(): SpanStackStore | undefined;
      run<T>(store: SpanStackStore, fn: () => T): T;
    }
  | undefined;

let _initialized = false;

/**
 * Initialize AsyncLocalStorage-backed span context.
 *
 * Call once at application startup in Node.js environments.
 * After initialization, each async context gets its own span stack,
 * preventing cross-request span corruption.
 *
 * No-op in browser environments (safe to call unconditionally).
 */
export async function initAsyncSpanContext(): Promise<boolean> {
  if (_initialized) return _als !== undefined;
  _initialized = true;

  try {
    // Dynamic import to avoid bundler issues in browser builds
    const asyncHooks = await import("node:async_hooks");
    if (asyncHooks && "AsyncLocalStorage" in asyncHooks) {
      const als = new asyncHooks.AsyncLocalStorage<SpanStackStore>();
      _als = {
        getStore: () => als.getStore(),
        run: <T>(store: SpanStackStore, fn: () => T) => als.run(store, fn),
      };
      return true;
    }
  } catch {
    // Not in Node.js -- fall through
  }
  return false;
}

export function getAsyncLocalStore(): SpanStackStore | undefined {
  return _als?.getStore();
}

export function runInAsyncContext<T>(fn: () => T): T {
  if (_als) {
    return _als.run({ stack: [] }, fn);
  }
  return fn();
}
```

**Rationale:** Without async isolation, concurrent request handling corrupts trace hierarchies. This is a fundamental correctness issue, not a nice-to-have. The fallback preserves browser compatibility.

### 3.4 FIX-H1: Retry Mechanism for Failed Exports

**New file:** `packages/tracing-otel/src/exporters/retry-wrapper.ts`

```typescript
import type { SpanData, SpanExporter } from "@hex-di/tracing";
import { logError, safeSetTimeout } from "../utils/globals.js";

export interface RetryConfig {
  /** Maximum number of retry attempts. @default 3 */
  readonly maxRetries?: number;
  /** Initial delay in milliseconds before first retry. @default 1000 */
  readonly initialDelayMs?: number;
  /** Maximum delay in milliseconds (exponential backoff cap). @default 30000 */
  readonly maxDelayMs?: number;
  /** Backoff multiplier. @default 2 */
  readonly backoffMultiplier?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    safeSetTimeout(resolve, ms);
  });
}

/**
 * Wraps a SpanExporter with exponential backoff retry on export failure.
 *
 * The wrapper intercepts `export()` calls. On failure, the batch is
 * retried up to `maxRetries` times with exponential backoff. If all
 * retries fail, the batch is logged and discarded.
 *
 * forceFlush() and shutdown() are delegated directly.
 */
export function createRetryingExporter(inner: SpanExporter, config?: RetryConfig): SpanExporter {
  const maxRetries = config?.maxRetries ?? 3;
  const initialDelayMs = config?.initialDelayMs ?? 1000;
  const maxDelayMs = config?.maxDelayMs ?? 30000;
  const backoffMultiplier = config?.backoffMultiplier ?? 2;

  return {
    async export(spans: ReadonlyArray<SpanData>): Promise<void> {
      let lastError: unknown;
      let currentDelay = initialDelayMs;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await inner.export(spans);
          return; // Success
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            logError(
              `[hex-di/tracing-otel] Export attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${currentDelay}ms:`,
              error
            );
            await delay(currentDelay);
            currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
          }
        }
      }

      logError(
        `[hex-di/tracing-otel] Export failed after ${maxRetries + 1} attempts, dropping ${spans.length} spans:`,
        lastError
      );
    },

    forceFlush(): Promise<void> {
      return inner.forceFlush();
    },

    shutdown(): Promise<void> {
      return inner.shutdown();
    },
  };
}
```

**Rationale:** The `SpanExporter` port documentation explicitly states "Failed exports should be retried with exponential backoff." This wrapper fulfills that contract without modifying individual exporter implementations. It composes with any exporter (OTLP, Zipkin, Jaeger, DataDog).

### 3.5 FIX-H2: DataDog Bridge Parent-Child Map Integrity

**File:** `packages/tracing-datadog/src/bridge.ts`

**Required changes:**

1. Add a configurable TTL for parent span entries:

```typescript
export interface DataDogBridgeConfig {
  // ... existing fields ...
  /**
   * Time-to-live in milliseconds for parent span entries in the
   * cross-batch lookup map. Parent spans are retained for this
   * duration after finishing to allow late-arriving child spans
   * to find their parent.
   *
   * @default 60000 (60 seconds)
   */
  readonly parentRetentionMs?: number;
  /**
   * Maximum number of parent entries to retain.
   * Prevents unbounded memory growth.
   *
   * @default 10000
   */
  readonly maxRetainedParents?: number;
}
```

2. Replace immediate `activeSpans.delete()` with TTL-based eviction:

```typescript
interface RetainedSpan {
  ddSpan: DdSpan;
  retainUntil: number;
}

const activeSpans = new Map<string, DdSpan>();
const retainedParents = new Map<string, RetainedSpan>();
const parentRetentionMs = config.parentRetentionMs ?? 60000;
const maxRetainedParents = config.maxRetainedParents ?? 10000;

// Inside export loop, after ddSpan.finish():
// Move to retained instead of deleting
activeSpans.delete(hexSpan.context.spanId);
retainedParents.set(hexSpan.context.spanId, {
  ddSpan,
  retainUntil: Date.now() + parentRetentionMs,
});

// Evict expired entries
if (retainedParents.size > maxRetainedParents) {
  const now = Date.now();
  for (const [id, retained] of retainedParents) {
    if (retained.retainUntil < now || retainedParents.size > maxRetainedParents) {
      retainedParents.delete(id);
    }
  }
}
```

3. Update parent lookup to check both maps:

```typescript
const parentSpan = hexSpan.parentSpanId
  ? (activeSpans.get(hexSpan.parentSpanId) ?? retainedParents.get(hexSpan.parentSpanId)?.ddSpan)
  : undefined;
```

**Rationale:** Cross-batch parent-child relationships are common when the parent span completes in a different export batch than the child. The TTL approach is bounded and deterministic.

### 3.6 FIX-H3: Math.random Fallback Warning

**File:** `packages/tracing/src/utils/id-generation.ts`

**Current code (lines 43-52):**

```typescript
function fillSpanBatch(): void {
  if (_crypto) {
    _crypto.getRandomValues(_spanBatch);
  } else {
    for (let i = 0; i < _spanBatch.length; i++) {
      _spanBatch[i] = Math.floor(Math.random() * 256);
    }
  }
  _spanBatchIndex = 0;
}
```

**Required changes:**

Add a one-time warning when the fallback is first used:

```typescript
let _mathRandomWarningEmitted = false;

function emitMathRandomWarning(): void {
  if (_mathRandomWarningEmitted) return;
  _mathRandomWarningEmitted = true;

  // Use safe console access pattern
  if (typeof globalThis !== "undefined" && "console" in globalThis) {
    const g: Record<string, unknown> = globalThis;
    const cons = g.console;
    if (cons && typeof cons === "object" && "warn" in cons) {
      const warnFn = (cons as Record<string, unknown>).warn;
      if (typeof warnFn === "function") {
        warnFn.call(
          cons,
          "[hex-di/tracing] WARNING: crypto.getRandomValues() is unavailable. " +
            "Falling back to Math.random() for trace/span ID generation. " +
            "IDs will not be cryptographically secure. " +
            "This may indicate a non-standard runtime environment."
        );
      }
    }
  }
}

function fillSpanBatch(): void {
  if (_crypto) {
    _crypto.getRandomValues(_spanBatch);
  } else {
    emitMathRandomWarning();
    for (let i = 0; i < _spanBatch.length; i++) {
      _spanBatch[i] = Math.floor(Math.random() * 256);
    }
  }
  _spanBatchIndex = 0;
}
```

Apply the same pattern to `fillTraceBatch()`.

**Rationale:** GxP requirement for transparent behavior. The user must be informed when a security-relevant degradation occurs.

### 3.7 FIX-H4: Separate Shutdown Timeout

**File:** `packages/tracing-otel/src/processors/types.ts`

Add to `BatchSpanProcessorOptions` and `SimpleSpanProcessorOptions`:

```typescript
/**
 * Maximum time in milliseconds for shutdown operations.
 * Should be shorter than exportTimeoutMillis to leave time for
 * other cleanup during process termination.
 *
 * @default 5000 (5 seconds)
 */
readonly shutdownTimeoutMillis?: number;
```

**File:** `packages/tracing-otel/src/processors/batch.ts`

```typescript
const shutdownTimeoutMillis = options?.shutdownTimeoutMillis ?? 5000;

// In shutdown():
await Promise.race([
  exporter.shutdown(),
  new Promise<never>((_resolve, reject) => {
    safeSetTimeout(() => {
      reject(new Error("Shutdown timeout"));
    }, shutdownTimeoutMillis); // Use shutdown-specific timeout
  }),
]);
```

Apply the same change to `simple.ts`.

**Rationale:** During SIGTERM with a 30-second grace period, a 5-second shutdown timeout leaves 25 seconds for the final flush and other application cleanup.

### 3.8 FIX-H5: Harmonize setStatus() Immutability

**File:** `packages/tracing/src/adapters/memory/span.ts`

**Current code (lines 203-208):**

```typescript
setStatus(status: SpanStatus): this {
  if (this._recording) {
    this._status = status;
  }
  return this;
}
```

**Change to match ConsoleSpan behavior and Span interface contract:**

```typescript
setStatus(status: SpanStatus): this {
  if (this._recording && this._status !== "ok") {
    this._status = status;
  }
  return this;
}
```

**Rationale:** The `Span` interface at `types/span.ts` line 183 documents: "Cannot change from 'ok' to 'error' (status is immutable once set)." All adapters must enforce this contract identically.

### 3.9 FIX-M1: Attribute Key/Value Size Limits

This is handled by the `AttributeFilterConfig` in FIX-C2. The `maxKeyLength`, `maxValueLength`, and `maxArrayLength` fields enforce size limits.

Additionally, add default enforcement in `MemorySpan.setAttribute()` as a defense-in-depth measure:

**File:** `packages/tracing/src/adapters/memory/span.ts`

```typescript
/** Maximum attribute key length (enforced at write time) */
private static readonly MAX_KEY_LENGTH = 256;
/** Maximum string attribute value length (enforced at write time) */
private static readonly MAX_VALUE_LENGTH = 4096;

setAttribute(key: string, value: AttributeValue): this {
  if (this._recording) {
    // Enforce key length limit
    if (key.length > MemorySpan.MAX_KEY_LENGTH) {
      return this; // Silently drop oversized key
    }
    if (this._attributes === undefined) {
      this._attributes = {};
    }
    // Enforce value size limit for strings
    if (typeof value === "string" && value.length > MemorySpan.MAX_VALUE_LENGTH) {
      this._attributes[key] = value.slice(0, MemorySpan.MAX_VALUE_LENGTH) + "[TRUNCATED]";
    } else {
      this._attributes[key] = value;
    }
  }
  return this;
}
```

### 3.10 FIX-M2: tracestate Validation

**File:** `packages/tracing/src/context/propagation.ts`

Add validation before accepting tracestate:

```typescript
const MAX_TRACESTATE_LENGTH = 512;
const TRACESTATE_MEMBER_REGEX = /^[a-z][a-z0-9_\-*/]{0,255}=[^\t\n\r,]{1,256}$/;

function isValidTracestate(value: string): boolean {
  if (value.length > MAX_TRACESTATE_LENGTH) return false;
  if (value.length === 0) return false;
  const members = value.split(",");
  if (members.length > 32) return false; // W3C max 32 list-members
  for (const member of members) {
    const trimmed = member.trim();
    if (trimmed.length === 0) return false;
    // Basic format check: key=value
    if (!trimmed.includes("=")) return false;
  }
  return true;
}
```

Update `extractTraceContext`:

```typescript
if (tracestate) {
  if (isValidTracestate(tracestate)) {
    return { ...context, traceState: tracestate };
  }
  // Invalid tracestate -- propagate context without it
  return context;
}
```

**Rationale:** W3C Trace Context spec section 3.3 defines the tracestate grammar. Accepting arbitrary strings could propagate malformed data to downstream services.

### 3.11 FIX-M3: Export Metrics / Observability

**New file:** `packages/tracing/src/types/tracing-metrics.ts`

```typescript
/**
 * Metrics for the tracing pipeline itself.
 *
 * These counters enable monitoring the health of span collection
 * and export without external observability tooling.
 */
export interface TracingMetrics {
  /** Total spans created */
  readonly spansCreated: number;
  /** Total spans successfully exported */
  readonly spansExported: number;
  /** Total spans dropped due to buffer overflow */
  readonly spansDropped: number;
  /** Total export attempts that failed */
  readonly exportFailures: number;
  /** Total export attempts that succeeded */
  readonly exportSuccesses: number;
}
```

Add a metrics accumulator to `BatchSpanProcessor`:

```typescript
// Inside createBatchSpanProcessor closure:
let spansExported = 0;
let exportFailures = 0;
let exportSuccesses = 0;

async function flush(): Promise<void> {
  if (spanBuffer.length === 0) return;
  while (spanBuffer.length > 0) {
    const batch = spanBuffer.splice(0, maxExportBatchSize);
    try {
      await exporter.export(batch);
      spansExported += batch.length;
      exportSuccesses++;
    } catch (err) {
      exportFailures++;
      logError("[hex-di/tracing-otel] BatchSpanProcessor export failed:", err);
    }
  }
}

// Add to returned object:
get metrics(): { spansExported: number; spansDropped: number; exportFailures: number; exportSuccesses: number } {
  return { spansExported, spansDropped: droppedSpanCount, exportFailures, exportSuccesses };
},
```

**Rationale:** Without pipeline observability, operators cannot tell if tracing itself is healthy. These counters are the minimum needed for SRE dashboards.

### 3.12 FIX-M4: Zipkin/Jaeger Shutdown Timeout

**File:** `packages/tracing-zipkin/src/exporter.ts`

Add timeout protection to `shutdown()`:

```typescript
async shutdown(): Promise<void> {
  if (isShutdown) return;
  isShutdown = true;

  const shutdownTimeout = options.timeout ?? 10000;
  try {
    await Promise.race([
      zipkinExporter.shutdown(),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error("[hex-di/tracing-zipkin] Shutdown timeout"));
        }, shutdownTimeout);
      }),
    ]);
  } catch (error) {
    logError("[hex-di/tracing-zipkin] Shutdown failed:", error);
  }
}
```

Apply identical change to `packages/tracing-jaeger/src/exporter.ts`.

**Rationale:** An unresponsive backend should not prevent process termination. Timeout protection ensures bounded shutdown time.

### 3.13 FIX-M5: Warning Strategy When Tracing Is Disabled

#### 3.13.1 NoOp Tracer: Emit one-time warning

**File:** `packages/tracing/src/adapters/noop/tracer.ts`

The NoOp tracer itself should remain zero-overhead and silent. The warning should be emitted at the point where tracing is chosen to be disabled, not on every span operation.

**New file:** `packages/tracing/src/utils/tracing-warnings.ts`

```typescript
let _noTracingWarned = false;

/**
 * Emit a one-time warning that tracing is disabled.
 *
 * Called when instrumentContainer detects a NoOp tracer, or when
 * external packages attempt to use TracerLike without a configured tracer.
 */
export function warnTracingDisabled(context: string): void {
  if (_noTracingWarned) return;
  _noTracingWarned = true;

  if (typeof globalThis !== "undefined" && "console" in globalThis) {
    const g: Record<string, unknown> = globalThis;
    const cons = g.console;
    if (cons && typeof cons === "object" && "warn" in cons) {
      const warnFn = (cons as Record<string, unknown>).warn;
      if (typeof warnFn === "function") {
        warnFn.call(
          cons,
          `[hex-di/tracing] Tracing is disabled (NoOp tracer detected). ` +
            `Context: ${context}. ` +
            `No spans will be recorded. ` +
            `To enable tracing, register a MemoryTracer or OTel-backed tracer adapter.`
        );
      }
    }
  }
}
```

**File:** `packages/tracing/src/instrumentation/container.ts`

Update the early bailout:

```typescript
import { warnTracingDisabled } from "../utils/tracing-warnings.js";

if (!tracer.isEnabled()) {
  warnTracingDisabled(`instrumentContainer(${container.constructor?.name ?? "container"})`);
  return () => {};
}
```

#### 3.13.2 TracerLike Bridge: Warn when backing tracer is NoOp

**File:** `packages/tracing/src/bridge/tracer-like.ts`

Update `createTracerLikeAdapter`:

```typescript
import { warnTracingDisabled } from "../utils/tracing-warnings.js";

export function createTracerLikeAdapter(tracer: Tracer): TracerLike {
  if (!tracer.isEnabled()) {
    warnTracingDisabled("createTracerLikeAdapter");
  }
  // ... rest unchanged
}
```

**Rationale:** When users expect tracing but have a misconfigured container, the warning makes this immediately visible rather than requiring manual investigation of why no traces appear.

### 3.14 FIX-L1: Use getHighResTimestamp() in MemorySpan

**File:** `packages/tracing/src/adapters/memory/span.ts`

Change line 143:

```typescript
// Before:
this._startTime = startTime ?? Date.now();

// After:
import { getHighResTimestamp } from "../../utils/timing.js";
// ...
this._startTime = startTime ?? getHighResTimestamp();
```

Change line 253:

```typescript
// Before:
const finalEndTime = endTime ?? Date.now();

// After:
const finalEndTime = endTime ?? getHighResTimestamp();
```

Apply the same to ConsoleSpan constructor (line 48) and `end()` (line 141).

### 3.15 FIX-L2: Dynamic instrumentationScope.version

**File:** `packages/tracing-otel/src/adapters/span-adapter.ts`

Replace hardcoded version:

```typescript
// Module-level constant
const INSTRUMENTATION_VERSION = "__HEX_DI_TRACING_VERSION__"; // Replaced at build time

// Or accept it as a parameter:
export function convertToReadableSpan(
  hexSpan: SpanData,
  resource?: Resource,
  instrumentationVersion?: string
): ReadableSpan {
  // ...
  instrumentationScope: {
    name: "@hex-di/tracing",
    version: instrumentationVersion ?? "0.1.0",
  },
}
```

### 3.16 FIX-L3: HTTPS Enforcement Option

**File:** `packages/tracing-otel/src/exporters/types.ts`

Add to `OtlpHttpExporterOptions`:

```typescript
/**
 * When true, warns if the endpoint URL uses HTTP instead of HTTPS.
 * Useful for catching insecure production configurations.
 *
 * @default false
 */
readonly warnOnInsecure?: boolean;
```

**File:** `packages/tracing-otel/src/exporters/otlp-http.ts`

```typescript
if (options?.warnOnInsecure && options?.url && !options.url.startsWith("https://")) {
  logError(
    `[hex-di/tracing-otel] WARNING: Exporter endpoint uses HTTP (${options.url}). ` +
      `Consider using HTTPS for production deployments to protect trace data in transit.`
  );
}
```

Apply the same pattern to Zipkin and Jaeger exporter options.

---

## 4. New Code to Implement

### 4.1 New Files

| File                                   | Package      | Purpose                                         |
| -------------------------------------- | ------------ | ----------------------------------------------- |
| `src/types/attribute-filter.ts`        | tracing      | `AttributeFilterConfig` interface               |
| `src/utils/attribute-filter.ts`        | tracing      | `createAttributeFilter()` factory               |
| `src/utils/filtering-processor.ts`     | tracing      | `createFilteringProcessor()` wrapper            |
| `src/utils/tracing-warnings.ts`        | tracing      | `warnTracingDisabled()` one-time warning        |
| `src/instrumentation/async-context.ts` | tracing      | `initAsyncSpanContext()`, `runInAsyncContext()` |
| `src/types/tracing-metrics.ts`         | tracing      | `TracingMetrics` interface                      |
| `src/exporters/retry-wrapper.ts`       | tracing-otel | `createRetryingExporter()` wrapper              |

### 4.2 Modified Files

| File                                | Package         | Change Summary                                                      |
| ----------------------------------- | --------------- | ------------------------------------------------------------------- |
| `src/adapters/memory/tracer.ts`     | tracing         | Add `droppedSpanCount`, `onDrop` callback, `MemoryTracerOptions`    |
| `src/adapters/memory/span.ts`       | tracing         | Add setStatus guard, attribute size limits, use getHighResTimestamp |
| `src/adapters/console/tracer.ts`    | tracing         | Use getHighResTimestamp                                             |
| `src/utils/id-generation.ts`        | tracing         | Add Math.random fallback warning                                    |
| `src/instrumentation/span-stack.ts` | tracing         | AsyncLocalStorage integration                                       |
| `src/instrumentation/container.ts`  | tracing         | Emit warning when NoOp tracer detected                              |
| `src/context/propagation.ts`        | tracing         | Add tracestate validation                                           |
| `src/bridge/tracer-like.ts`         | tracing         | Warn when backing tracer is NoOp                                    |
| `src/types/index.ts`                | tracing         | Re-export new types                                                 |
| `src/utils/index.ts`                | tracing         | Re-export new utilities                                             |
| `src/index.ts`                      | tracing         | Re-export new public API                                            |
| `src/processors/batch.ts`           | tracing-otel    | Add drop counter, metrics, shutdown timeout                         |
| `src/processors/simple.ts`          | tracing-otel    | Add shutdown timeout                                                |
| `src/processors/types.ts`           | tracing-otel    | Add `onDrop`, `shutdownTimeoutMillis` options                       |
| `src/exporters/otlp-http.ts`        | tracing-otel    | Add HTTPS warning                                                   |
| `src/exporters/types.ts`            | tracing-otel    | Add `warnOnInsecure` option                                         |
| `src/adapters/span-adapter.ts`      | tracing-otel    | Configurable instrumentation version                                |
| `src/bridge.ts`                     | tracing-datadog | Parent retention with TTL, bounded Map                              |
| `src/types.ts`                      | tracing-datadog | Add `parentRetentionMs`, `maxRetainedParents`                       |
| `src/exporter.ts`                   | tracing-zipkin  | Add shutdown timeout                                                |
| `src/exporter.ts`                   | tracing-jaeger  | Add shutdown timeout                                                |

### 4.3 Exports to Add

The following should be exported from the package's public API:

**@hex-di/tracing:**

- `AttributeFilterConfig` (type)
- `createAttributeFilter` (function)
- `createFilteringProcessor` (function)
- `TracingMetrics` (type)
- `initAsyncSpanContext` (function)
- `runInAsyncContext` (function)
- `warnTracingDisabled` (function)

**@hex-di/tracing-otel:**

- `createRetryingExporter` (function)
- `RetryConfig` (type)

---

## 5. Test Requirements

### 5.1 Core Tracing Tests

#### 5.1.1 Span Eviction Audit Trail

**File:** `packages/tracing/tests/unit/memory-eviction.test.ts`

```
- Test: droppedSpanCount increments when buffer overflows
- Test: onDrop callback receives the evicted SpanData and current count
- Test: droppedSpanCount resets on clear()
- Test: no drops when buffer is under capacity
- Test: continuous overflow accumulates correct count
- Test: onDrop is not called when buffer has capacity
```

#### 5.1.2 PII Filtering

**File:** `packages/tracing/tests/unit/attribute-filter.test.ts`

```
- Test: blockedKeys removes exact matches
- Test: blockedKeyPrefixes removes prefix matches
- Test: maxValueLength truncates long strings with [TRUNCATED]
- Test: maxKeyLength drops attributes with oversized keys
- Test: maxArrayLength truncates long arrays
- Test: redactValue callback is called for string values
- Test: redactValue returning undefined removes the attribute
- Test: non-string values pass through without redactValue
- Test: empty config returns attributes unchanged
- Test: filter is reusable across multiple calls
```

#### 5.1.3 Filtering Processor

**File:** `packages/tracing/tests/unit/filtering-processor.test.ts`

```
- Test: onEnd filters attributes before passing to inner processor
- Test: event attributes are also filtered
- Test: onStart delegates to inner processor unchanged
- Test: forceFlush delegates to inner processor
- Test: shutdown delegates to inner processor
- Test: original SpanData is not mutated
```

#### 5.1.4 setStatus Immutability

**File:** `packages/tracing/tests/unit/status-immutability.test.ts`

```
- Test: MemorySpan setStatus("ok") then setStatus("error") keeps "ok"
- Test: MemorySpan setStatus("error") then setStatus("ok") keeps "error" -- wait, check: the contract says "ok" is immutable, not "error"
- Test: setStatus("ok") is immutable (cannot change to "error" or "unset")
- Test: setStatus("error") can be changed to "ok" (error -> ok allowed per OTel)
- Test: setStatus("unset") can be changed to anything
- Test: ConsoleSpan behavior matches MemorySpan
```

#### 5.1.5 Attribute Size Limits

**File:** `packages/tracing/tests/unit/attribute-limits.test.ts`

```
- Test: key exceeding MAX_KEY_LENGTH is silently dropped
- Test: string value exceeding MAX_VALUE_LENGTH is truncated
- Test: number and boolean values are not affected by size limits
- Test: array values are not truncated at span level (handled by filter)
```

#### 5.1.6 Math.random Warning

**File:** `packages/tracing/tests/unit/id-generation-warning.test.ts`

```
- Test: warning is emitted once when crypto is unavailable
- Test: warning is not emitted when crypto is available
- Test: warning is emitted only once (not on every batch fill)
```

#### 5.1.7 tracestate Validation

**File:** `packages/tracing/tests/unit/tracestate-validation.test.ts`

```
- Test: valid tracestate is accepted
- Test: tracestate exceeding 512 chars is rejected
- Test: tracestate with more than 32 members is rejected
- Test: empty tracestate is rejected
- Test: tracestate without '=' in members is rejected
- Test: rejected tracestate does not prevent traceparent propagation
```

#### 5.1.8 Async Span Context

**File:** `packages/tracing/tests/unit/async-context.test.ts`

```
- Test: concurrent async contexts have isolated span stacks
- Test: pushSpan/popSpan within runInAsyncContext are isolated
- Test: global fallback works when AsyncLocalStorage is unavailable
- Test: initAsyncSpanContext returns true in Node.js
- Test: getStackDepth reflects context-local stack
```

#### 5.1.9 Tracing Warnings

**File:** `packages/tracing/tests/unit/tracing-warnings.test.ts`

```
- Test: warnTracingDisabled emits console.warn
- Test: warnTracingDisabled emits only once
- Test: instrumentContainer with NoOp tracer triggers warning
- Test: createTracerLikeAdapter with NoOp tracer triggers warning
```

### 5.2 OTel Adapter Tests

#### 5.2.1 Batch Processor Eviction

**File:** `packages/tracing-otel/tests/unit/batch-eviction.test.ts`

```
- Test: droppedSpanCount increments when queue overflows
- Test: onDrop callback is invoked with dropped span data
- Test: metrics object reflects accurate export/drop counts
- Test: shutdown flushes remaining buffered spans
- Test: shutdownTimeoutMillis is separate from exportTimeoutMillis
```

#### 5.2.2 Retry Wrapper

**File:** `packages/tracing-otel/tests/unit/retry-wrapper.test.ts`

```
- Test: successful export on first attempt does not retry
- Test: transient failure retries up to maxRetries
- Test: all retries exhausted logs and discards batch
- Test: exponential backoff increases delay between retries
- Test: maxDelayMs caps the backoff
- Test: forceFlush delegates to inner exporter
- Test: shutdown delegates to inner exporter
```

#### 5.2.3 HTTPS Warning

**File:** `packages/tracing-otel/tests/unit/https-warning.test.ts`

```
- Test: warnOnInsecure with HTTP URL emits warning
- Test: warnOnInsecure with HTTPS URL does not warn
- Test: warnOnInsecure false (default) does not warn
```

### 5.3 DataDog Adapter Tests

#### 5.3.1 Cross-Batch Parent-Child

**File:** `packages/tracing-datadog/tests/unit/cross-batch-parents.test.ts`

```
- Test: child span in same batch as parent finds parent correctly
- Test: child span in later batch finds retained parent
- Test: parent is evicted after parentRetentionMs expires
- Test: retainedParents map does not exceed maxRetainedParents
- Test: shutdown clears both activeSpans and retainedParents
```

### 5.4 Zipkin/Jaeger Adapter Tests

#### 5.4.1 Shutdown Timeout

**File:** `packages/tracing-zipkin/tests/unit/shutdown-timeout.test.ts`
**File:** `packages/tracing-jaeger/tests/unit/shutdown-timeout.test.ts`

```
- Test: shutdown completes within timeout when backend responds
- Test: shutdown resolves after timeout when backend hangs
- Test: timeout error is logged
- Test: isShutdown flag prevents further exports after timeout
```

### 5.5 Integration Tests

#### 5.5.1 End-to-End PII Filtering

**File:** `packages/tracing/tests/integration/pii-filtering.test.ts`

```
- Test: span with PII attributes passes through FilteringProcessor and reaches exporter with PII redacted
- Test: stack traces from includeStackTrace are filtered
- Test: event attributes are filtered
```

#### 5.5.2 End-to-End Retry

**File:** `packages/tracing-otel/tests/integration/retry-export.test.ts`

```
- Test: transient failure on first export, success on retry -- all spans delivered
- Test: permanent failure -- batch dropped after maxRetries, logged
```

---

## 6. Migration Notes

### 6.1 Breaking Changes

#### MemoryTracer Constructor

The `createMemoryTracer()` factory gains a new `MemoryTracerOptions` parameter. The old positional-argument form (`createMemoryTracer(maxSpans, defaultAttributes)`) should be maintained as an overload for backward compatibility, but per CLAUDE.md policy ("No backward compatibility"), the old form can be removed in favor of the options object:

```typescript
// Old (remove):
createMemoryTracer(10000, { "service.name": "test" });

// New:
createMemoryTracer({ maxSpans: 10000, defaultAttributes: { "service.name": "test" } });
```

Per CLAUDE.md: "No backward compatibility. Always implement the cleanest solution. Break and change freely."

#### BatchSpanProcessor Return Type

`createBatchSpanProcessor()` now returns an extended interface with `droppedSpanCount` and `metrics` getters. Since the return type was `SpanProcessor` (which does not include these), callers who need metrics must use the concrete return type. This is additive and non-breaking at the interface level.

#### setStatus() Behavior Change

`MemorySpan.setStatus()` now guards against overwriting `"ok"` status. Code that relied on overwriting `"ok"` with `"error"` will behave differently. This aligns with the documented contract and matches ConsoleSpan behavior, so it is a bug fix, not a feature change.

### 6.2 New Dependencies

- `node:async_hooks` -- Optional, dynamic import, only in Node.js environments
- No new npm package dependencies

### 6.3 Configuration Migration

Users who want PII filtering must explicitly create and wire a filtering processor:

```typescript
import { createAttributeFilter, createFilteringProcessor } from "@hex-di/tracing";
import { createBatchSpanProcessor, createOtlpHttpExporter } from "@hex-di/tracing-otel";

const filter = createAttributeFilter({
  blockedKeys: ["user.email", "user.ssn", "auth.token"],
  blockedKeyPrefixes: ["pii."],
  maxValueLength: 4096,
});

const exporter = createOtlpHttpExporter({ ... });
const rawProcessor = createBatchSpanProcessor(exporter);
const processor = createFilteringProcessor(rawProcessor, filter);

// Use `processor` with your tracer
```

Users who want retry must explicitly wrap their exporter:

```typescript
import { createRetryingExporter } from "@hex-di/tracing-otel";

const exporter = createRetryingExporter(
  createOtlpHttpExporter({ ... }),
  { maxRetries: 3, initialDelayMs: 1000 }
);
```

Users who want async context isolation in Node.js must call `initAsyncSpanContext()` at startup:

```typescript
import { initAsyncSpanContext } from "@hex-di/tracing";

await initAsyncSpanContext();
// Now each async context gets isolated span stacks
```

### 6.4 Test Migration

Existing tests that check `MemorySpan.setStatus()` overwrite behavior may need updating. Specifically, any test that calls `setStatus("ok")` followed by `setStatus("error")` and expects the final status to be `"error"` will now see `"ok"`.

---

## 7. Warning Strategy for When Tracing Is Disabled

### 7.1 Design Principles

1. **One warning per concern, not per operation** -- Avoid log spam
2. **Structured format** -- `[hex-di/tracing]` prefix for easy filtering
3. **Actionable message** -- Tell the user what to do to enable tracing
4. **No performance impact** -- Warning check is a single boolean comparison
5. **No failure** -- Tracing being disabled must never throw or break the application

### 7.2 Warning Points

| Point                                  | Trigger                                       | Message                                                                                                                                |
| -------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `instrumentContainer()`                | `tracer.isEnabled() === false`                | "[hex-di/tracing] Tracing is disabled (NoOp tracer detected). Context: instrumentContainer({containerId}). No spans will be recorded." |
| `createTracerLikeAdapter()`            | `tracer.isEnabled() === false`                | "[hex-di/tracing] Tracing is disabled (NoOp tracer detected). Context: createTracerLikeAdapter. TracerLike operations will be no-ops." |
| `fillSpanBatch()` / `fillTraceBatch()` | `_crypto === undefined`                       | "[hex-di/tracing] WARNING: crypto.getRandomValues() is unavailable. Falling back to Math.random()."                                    |
| OTLP/Zipkin/Jaeger exporter creation   | `url.startsWith("http://") && warnOnInsecure` | "[hex-di/tracing-{adapter}] WARNING: Exporter endpoint uses HTTP ({url}). Consider HTTPS."                                             |

### 7.3 External Package Warning Strategy

For packages that use tracing optionally (Flow, Query, Store, Saga), the warning strategy is:

1. **At TracerLike resolution time:** When a package resolves `TracerLikePort` and receives a NoOp-backed adapter, the `createTracerLikeAdapter` warning fires (once).
2. **At runtime:** The TracerLike pushSpan/popSpan operations are no-ops. No per-call warnings.
3. **If TracerLikePort is not registered at all:** The DI container's own "port not registered" error handling applies -- this is outside tracing's scope.

### 7.4 Warning Suppression

For environments where warnings are intentionally suppressed (e.g., tests, CI), add a `suppressTracingWarnings()` function:

```typescript
let _warningsSuppressed = false;

export function suppressTracingWarnings(): void {
  _warningsSuppressed = true;
}

// In warnTracingDisabled and all other warning functions:
if (_warningsSuppressed) return;
```

This keeps test output clean while maintaining production visibility.

---

## 8. Projected Score After Implementation

| Criterion       | Core     | OTel     | DataDog | Zipkin   | Jaeger   |
| --------------- | -------- | -------- | ------- | -------- | -------- |
| Data Integrity  | 10/10    | 10/10    | 9/10    | 10/10    | 10/10    |
| Traceability    | 10/10    | 10/10    | 9/10    | 10/10    | 10/10    |
| Determinism     | 10/10    | 10/10    | 9/10    | 10/10    | 10/10    |
| Error Handling  | 10/10    | 10/10    | 10/10   | 10/10    | 10/10    |
| Validation      | 10/10    | 10/10    | 9/10    | 10/10    | 10/10    |
| Change Control  | 10/10    | 10/10    | 10/10   | 10/10    | 10/10    |
| Testing         | 10/10    | 10/10    | 9/10    | 10/10    | 10/10    |
| Security        | 10/10    | 10/10    | 9/10    | 10/10    | 10/10    |
| Documentation   | 10/10    | 10/10    | 10/10   | 10/10    | 10/10    |
| Compliance      | 10/10    | 10/10    | 10/10   | 10/10    | 10/10    |
| **Sub-Package** | **10.0** | **10.0** | **9.4** | **10.0** | **10.0** |

**Projected Weighted Overall: 10.0/10**

DataDog remains at 9.4 because parent-child reconstruction across batches is inherently best-effort when using a bridge pattern (DD-trace manages its own trace context). The TTL-based retention brings it as close to correct as architecturally possible. To reach a true 10/10 for DataDog, the bridge would need to adopt DD-trace's native context propagation rather than reconstructing parent-child from HexDI SpanData -- which is a deeper architectural change outside the scope of this refinement.

---

## 9. Implementation Order

The recommended implementation order, from highest impact to lowest:

1. **FIX-C2** (PII Filtering) -- Highest compliance risk
2. **FIX-C1** (Span Eviction Audit) -- Data integrity
3. **FIX-H5** (setStatus Immutability) -- Behavioral correctness, small change
4. **FIX-H3** (Math.random Warning) -- Small change, high visibility
5. **FIX-M5** (Warning Strategy) -- User experience
6. **FIX-H1** (Retry Mechanism) -- Production reliability
7. **FIX-H4** (Shutdown Timeout) -- Operational safety
8. **FIX-M4** (Zipkin/Jaeger Shutdown Timeout) -- Operational safety
9. **FIX-M1** (Attribute Size Limits) -- Defense in depth
10. **FIX-M2** (tracestate Validation) -- Spec compliance
11. **FIX-H2** (DataDog Parent-Child) -- DataDog-specific
12. **FIX-C3** (AsyncLocalStorage) -- Largest change, most testing needed
13. **FIX-M3** (Export Metrics) -- Observability
14. **FIX-L1** (High-res Timestamps) -- Precision
15. **FIX-L2** (Dynamic Version) -- Build tooling
16. **FIX-L3** (HTTPS Enforcement) -- Security posture

---

_This refinement document was generated from direct source analysis of all TypeScript files across the 5-package tracing stack. All line references, code excerpts, and gap descriptions are based on the actual source code read from the repository._
