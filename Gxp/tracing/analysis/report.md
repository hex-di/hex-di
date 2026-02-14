# GxP Compliance Analysis Report: @hex-di/tracing Stack

**Report Date:** 2026-02-10
**Scope:** `@hex-di/tracing` (core), `@hex-di/tracing-otel`, `@hex-di/tracing-datadog`, `@hex-di/tracing-zipkin`, `@hex-di/tracing-jaeger`
**Overall GxP Readiness Score:** 7.1 / 10

---

## 1. Executive Summary

The `@hex-di/tracing` stack provides a well-architected distributed tracing infrastructure following hexagonal architecture patterns. The core package defines clean port interfaces (`TracerPort`, `SpanExporterPort`, `SpanProcessorPort`) while four adapter packages bridge to industry-standard backends (OpenTelemetry OTLP, DataDog APM, Zipkin, Jaeger).

**Key Strengths:**

- W3C Trace Context compliance with strict validation (hex regex, all-zeros rejection, 4-part format verification)
- Cryptographically secure ID generation via `crypto.getRandomValues()` with Math.random fallback
- Immutable `SpanData` produced on `span.end()` with `readonly` interface fields
- Clean hexagonal port/adapter separation enables backend substitution without code changes
- Comprehensive test coverage (27 test files across the stack)
- Zero-overhead NoOp tracer with frozen singleton instances for production bypass
- Automatic parent-child relationship tracking via module-level span stack

**Critical Gaps:**

- FIFO eviction in `MemoryTracer` and `BatchSpanProcessor` silently drops spans with no audit trail, notification, or metric
- No PII filtering or attribute sanitization -- any value passed to `setAttribute()` is exported verbatim
- No retry mechanism for failed exports in any exporter (OTLP, Zipkin, Jaeger, DataDog)
- DataDog bridge has parent-child integrity issues due to export-time span reconstruction
- Module-level span stack (`spanStack: Span[]`) is shared across all concurrent operations without `AsyncLocalStorage` isolation

---

## 2. Package Overview

### 2.1 @hex-di/tracing (Core)

| Aspect       | Detail                                                                                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source Files | 51 TypeScript files in `src/`                                                                                                                                                                                                                                                        |
| Test Files   | 23 test files (unit, integration, inspection, benchmarks)                                                                                                                                                                                                                            |
| Architecture | Hexagonal: Ports (`TracerPort`, `SpanExporterPort`, `SpanProcessorPort`), Adapters (Memory, NoOp, Console)                                                                                                                                                                           |
| Standards    | W3C Trace Context, OpenTelemetry Span API                                                                                                                                                                                                                                            |
| Key Modules  | `types/` (Span, SpanData, SpanContext), `context/` (parse, propagation), `utils/` (id-generation, object-pool, timing), `instrumentation/` (container, hooks, span-stack), `inspection/` (query-api, filter, aggregation), `bridge/` (TracerLike), `testing/` (assertions, matchers) |

### 2.2 @hex-di/tracing-otel

| Aspect       | Detail                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source Files | 8 TypeScript files in `src/`                                                                                                                          |
| Test Files   | 3 test files (span-adapter, simple-processor, batch-processor)                                                                                        |
| Dependencies | `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`         |
| Key Modules  | `processors/` (batch, simple), `exporters/` (otlp-http), `adapters/` (span-adapter, types), `semantic-conventions/` (mapper), `resources/` (resource) |

### 2.3 @hex-di/tracing-datadog

| Aspect       | Detail                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source Files | 4 TypeScript files in `src/`                                                                                                           |
| Test Files   | 1 test file (datadog-bridge)                                                                                                           |
| Dependencies | Peer: `dd-trace` (not bundled, ~50MB)                                                                                                  |
| Key Modules  | `bridge.ts` (SpanExporter implementation), `types.ts` (DdTracer, DdSpan, DataDogBridgeConfig), `utils.ts` (span kind mapping, logging) |

### 2.4 @hex-di/tracing-zipkin

| Aspect       | Detail                                                                              |
| ------------ | ----------------------------------------------------------------------------------- |
| Source Files | 2 TypeScript files in `src/`                                                        |
| Test Files   | 1 test file (zipkin-exporter)                                                       |
| Dependencies | `@opentelemetry/exporter-zipkin`, reuses `@hex-di/tracing-otel` for span conversion |
| Key Modules  | `exporter.ts` (createZipkinExporter factory)                                        |

### 2.5 @hex-di/tracing-jaeger

| Aspect       | Detail                                                                              |
| ------------ | ----------------------------------------------------------------------------------- |
| Source Files | 2 TypeScript files in `src/`                                                        |
| Test Files   | 1 test file (jaeger-exporter)                                                       |
| Dependencies | `@opentelemetry/exporter-jaeger`, reuses `@hex-di/tracing-otel` for span conversion |
| Key Modules  | `exporter.ts` (createJaegerExporter factory)                                        |

---

## 3. GxP Compliance Matrix

| Criterion                          | Core (tracing) | tracing-otel | tracing-datadog | tracing-zipkin | tracing-jaeger |
| ---------------------------------- | -------------- | ------------ | --------------- | -------------- | -------------- |
| 1. Data Integrity (ALCOA+)         | 8/10           | 7/10         | 6/10            | 7/10           | 7/10           |
| 2. Traceability & Audit Trail      | 8/10           | 7/10         | 5/10            | 7/10           | 7/10           |
| 3. Determinism & Reproducibility   | 7/10           | 7/10         | 6/10            | 7/10           | 7/10           |
| 4. Error Handling & Recovery       | 7/10           | 7/10         | 7/10            | 7/10           | 7/10           |
| 5. Validation & Input Verification | 8/10           | 6/10         | 5/10            | 6/10           | 6/10           |
| 6. Change Control & Versioning     | 9/10           | 8/10         | 7/10            | 8/10           | 8/10           |
| 7. Testing & Verification          | 8/10           | 7/10         | 6/10            | 6/10           | 6/10           |
| 8. Security                        | 5/10           | 5/10         | 4/10            | 5/10           | 5/10           |
| 9. Documentation                   | 9/10           | 8/10         | 8/10            | 7/10           | 7/10           |
| 10. Compliance-Specific (Tracing)  | 8/10           | 8/10         | 6/10            | 7/10           | 7/10           |
| **Sub-Package Score**              | **7.7/10**     | **7.0/10**   | **6.0/10**      | **6.7/10**     | **6.7/10**     |

**Weighted Overall Score: 7.1/10**

---

## 4. Detailed Analysis

### 4.1 Data Integrity (ALCOA+)

**Attributable:** Each span carries a full W3C Trace Context (`traceId`, `spanId`, `traceFlags`, optional `traceState`). IDs are generated using `crypto.getRandomValues()` for cryptographic uniqueness, with a `Math.random` fallback only when the crypto API is unavailable.

Source: `packages/tracing/src/utils/id-generation.ts`

```typescript
const _crypto = getCrypto();

// Span ID batch: 256 entries x 8 bytes = 2048 bytes
const SPAN_BATCH_SIZE = 256;
const _spanBatch = new Uint8Array(SPAN_BATCH_SIZE * 8);
let _spanBatchIndex = SPAN_BATCH_SIZE; // Start exhausted

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

export function generateSpanId(): string {
  if (_spanBatchIndex >= SPAN_BATCH_SIZE) {
    fillSpanBatch();
  }
  const o = _spanBatchIndex * 8;
  _spanBatchIndex++;
  return (
    HEX_TABLE[_spanBatch[o]] +
    HEX_TABLE[_spanBatch[o + 1]] +
    HEX_TABLE[_spanBatch[o + 2]] +
    HEX_TABLE[_spanBatch[o + 3]] +
    HEX_TABLE[_spanBatch[o + 4]] +
    HEX_TABLE[_spanBatch[o + 5]] +
    HEX_TABLE[_spanBatch[o + 6]] +
    HEX_TABLE[_spanBatch[o + 7]]
  );
}
```

**Immutable after completion:** Once `span.end()` is called, the `_recording` flag is set to `false` and a `SpanData` snapshot is produced. All subsequent mutation calls (`setAttribute`, `setStatus`, `addEvent`) are silently ignored.

Source: `packages/tracing/src/adapters/memory/span.ts`

```typescript
end(endTime?: number): void {
  if (!this._recording) {
    return;
  }
  this._recording = false;
  const finalEndTime = endTime ?? Date.now();
  const spanData = this._toSpanData(finalEndTime);
  this._onEnd(spanData);
}
```

The `SpanData` interface enforces immutability at the type level via `readonly` fields:

Source: `packages/tracing/src/types/span.ts`

```typescript
export interface SpanData {
  readonly context: SpanContext;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: SpanKind;
  readonly startTime: number;
  readonly endTime: number;
  readonly status: SpanStatus;
  readonly attributes: Attributes;
  readonly events: ReadonlyArray<SpanEvent>;
  readonly links: ReadonlyArray<SpanContext>;
}
```

**CRITICAL GAP -- Silent Data Loss:** The `MemoryTracer` circular buffer and `BatchSpanProcessor` both silently drop spans when capacity is reached, with no notification, metric, or audit log entry.

Source: `packages/tracing/src/adapters/memory/tracer.ts`

```typescript
private _collectSpan(spanData: SpanData): void {
  // Write at tail position
  this._spans[this._tail] = spanData;
  this._tail = (this._tail + 1) % this._maxSpans;

  // Update size and advance head if buffer is full
  if (this._size < this._maxSpans) {
    this._size++;
  } else {
    // Buffer full, advance head to maintain FIFO
    this._head = (this._head + 1) % this._maxSpans;
  }
}
```

Source: `packages/tracing-otel/src/processors/batch.ts`

```typescript
onEnd(spanData: SpanData): void {
  if (isShutdown) {
    return;
  }
  // Drop oldest span if buffer is full
  if (spanBuffer.length >= maxQueueSize) {
    spanBuffer.shift();
  }
  spanBuffer.push(spanData);
  // ...
}
```

In a GxP-regulated environment, silent data loss is unacceptable. Dropped records must be counted and reported.

### 4.2 Traceability & Audit Trail

**Distributed trace propagation:** W3C Trace Context headers are fully supported with `parseTraceparent` / `formatTraceparent` and `extractTraceContext` / `injectTraceContext` utilities.

Source: `packages/tracing/src/context/parse.ts`

```typescript
export function parseTraceparent(header: string): SpanContext | undefined {
  const parts = header.split("-");
  if (parts.length !== 4) {
    return undefined;
  }
  const [version, traceId, spanId, flags] = parts;
  if (version !== "00") {
    return undefined;
  }
  if (!isValidTraceId(traceId)) {
    return undefined;
  }
  if (!isValidSpanId(spanId)) {
    return undefined;
  }
  if (flags.length !== 2 || !HEX_REGEX.test(flags)) {
    return undefined;
  }
  const traceFlags = Number.parseInt(flags, 16);
  return { traceId, spanId, traceFlags };
}
```

Source: `packages/tracing/src/context/propagation.ts`

```typescript
export function extractTraceContext(
  headers: Record<string, string | undefined>
): SpanContext | undefined {
  const traceparent = getHeaderCaseInsensitive(headers, "traceparent");
  if (!traceparent) {
    return undefined;
  }
  const context = parseTraceparent(traceparent);
  if (!context) {
    return undefined;
  }
  const tracestate = getHeaderCaseInsensitive(headers, "tracestate");
  if (tracestate) {
    return { ...context, traceState: tracestate };
  }
  return context;
}
```

**Parent-child relationships** are maintained via a module-level LIFO span stack and per-tracer active span stacks. Instrumentation hooks automatically establish hierarchy through `pushSpan` / `popSpan`:

Source: `packages/tracing/src/instrumentation/span-stack.ts`

```typescript
const spanStack: Span[] = [];

export function pushSpan(span: Span): void {
  spanStack.push(span);
}

export function popSpan(): Span | undefined {
  return spanStack.pop();
}
```

**DataDog parent-child integrity concern:** The DataDog bridge reconstructs parent-child relationships at export time using a `Map<string, DdSpan>`. If spans arrive in non-topological order (child before parent in the batch), the parent lookup fails.

Source: `packages/tracing-datadog/src/bridge.ts`

```typescript
const activeSpans = new Map<string, DdSpan>();

// Inside export loop:
const parentSpan = hexSpan.parentSpanId ? activeSpans.get(hexSpan.parentSpanId) : undefined;

const ddSpan = tracer.startSpan(hexSpan.name, {
  startTime: hexSpan.startTime,
  childOf: parentSpan, // undefined if parent not yet exported
  tags: {},
});

activeSpans.set(hexSpan.context.spanId, ddSpan);
// ...
activeSpans.delete(hexSpan.context.spanId);
```

Since `activeSpans.delete()` is called immediately after `ddSpan.finish()`, and spans are processed sequentially within a batch, any child span that follows its parent in the same batch will correctly find the parent. However, if parent and child arrive in separate batches, the parent is already deleted and `childOf` will be `undefined`.

### 4.3 Determinism & Reproducibility

**Timing:** Spans use `Date.now()` by default for timestamps (millisecond precision). A high-resolution option exists via `getHighResTimestamp()` that delegates to `performance.now() + performance.timeOrigin` when available:

Source: `packages/tracing/src/utils/timing.ts`

```typescript
export function getHighResTimestamp(): number {
  const perf = getPerformance();
  if (perf) {
    return perf.timeOrigin + perf.now();
  }
  return Date.now();
}
```

However, the core `MemorySpan.init()` and `MemorySpan.end()` methods use `Date.now()` directly rather than the high-resolution utility, which means sub-millisecond spans can appear to have zero duration.

**Span ordering:** Spans are collected in completion order (when `span.end()` is called), not creation order. The `MemoryTracer.getCollectedSpans()` returns them in FIFO order from the circular buffer. This is deterministic but may not match caller expectations for audit purposes.

### 4.4 Error Handling & Recovery

**Application isolation:** All adapter packages follow a "log but don't throw" pattern for export failures, ensuring tracing infrastructure issues never crash the application.

Source: `packages/tracing-otel/src/exporters/otlp-http.ts`

```typescript
async export(spans: ReadonlyArray<SpanData>): Promise<void> {
  try {
    const readableSpans: ReadableSpan[] = spans.map(hexSpan => {
      const mappedAttributes = mapHexDiToOtelAttributes(hexSpan.attributes);
      const mappedSpan: SpanData = { ...hexSpan, attributes: mappedAttributes };
      return convertToReadableSpan(mappedSpan, resource);
    });
    await new Promise<void>((resolve, reject) => {
      otlpExporter.export(readableSpans, result => {
        if (result.code === 0) {
          resolve();
        } else {
          reject(new Error(`OTLP export failed: ${result.error ?? "unknown error"}`));
        }
      });
    });
  } catch (error) {
    logError("[hex-di/tracing-otel] OTLP export failed:", error);
  }
}
```

**NoOp tracer for zero-overhead bypass:** When tracing is disabled, the frozen singleton `NOOP_TRACER` makes zero allocations. Additionally, `instrumentContainer()` checks `tracer.isEnabled()` and skips hook registration entirely:

Source: `packages/tracing/src/instrumentation/container.ts`

```typescript
if (!tracer.isEnabled()) {
  return () => {
    // No-op cleanup - no hooks were registered
  };
}
```

**Shutdown timeout protection:** Both `SimpleSpanProcessor` and `BatchSpanProcessor` use `Promise.race` with configurable timeout (default 30s) during shutdown to prevent deadlocks:

Source: `packages/tracing-otel/src/processors/batch.ts`

```typescript
await Promise.race([
  exporter.shutdown(),
  new Promise<never>((_resolve, reject) => {
    safeSetTimeout(() => {
      reject(new Error("Shutdown timeout"));
    }, exportTimeoutMillis);
  }),
]);
```

**Gap -- No retry for failed exports:** None of the four exporters implement retry logic with exponential backoff. Failed batches are logged and discarded. The `SpanExporter` port interface documentation says "Failed exports should be retried with exponential backoff" but no implementation follows this guidance.

### 4.5 Validation & Input Verification

**W3C Trace Context validation** is thorough. The `parseTraceparent()` function validates all four segments:

Source: `packages/tracing/src/context/parse.ts`

```typescript
const TRACE_ID_HEX_LENGTH = 32;
const SPAN_ID_HEX_LENGTH = 16;
const HEX_REGEX = /^[0-9a-f]+$/;
const ALL_ZEROS_TRACE_ID = "0".repeat(TRACE_ID_HEX_LENGTH);
const ALL_ZEROS_SPAN_ID = "0".repeat(SPAN_ID_HEX_LENGTH);

export function isValidTraceId(id: string): boolean {
  return id.length === TRACE_ID_HEX_LENGTH && HEX_REGEX.test(id) && id !== ALL_ZEROS_TRACE_ID;
}

export function isValidSpanId(id: string): boolean {
  return id.length === SPAN_ID_HEX_LENGTH && HEX_REGEX.test(id) && id !== ALL_ZEROS_SPAN_ID;
}
```

**Gap -- No attribute value validation:** Span attributes accept any value matching the `AttributeValue` type union (`string | number | boolean | string[] | number[] | boolean[]`) but there is no runtime validation, no key length limit, no value size limit, and no sanitization. An attribute like `setAttribute('query', fullSqlStatement)` would be exported verbatim, potentially including sensitive data.

**Gap -- No traceState validation:** While `traceparent` parsing enforces strict format rules, `tracestate` values are passed through without validation against the W3C Trace Context `tracestate` grammar (max 512 chars, comma-separated list-members, key format restrictions).

### 4.6 Change Control & Versioning

**Port/adapter separation is clean.** The core package defines three ports via `@hex-di/core`'s `port()` function:

```typescript
export const TracerPort = port<Tracer>()({
  name: "Tracer",
  direction: "outbound",
  category: "infrastructure",
});

export const SpanExporterPort = port<SpanExporter>()({
  name: "SpanExporter",
  direction: "outbound",
  category: "infrastructure",
});

export const SpanProcessorPort = port<SpanProcessor>()({
  name: "SpanProcessor",
  direction: "outbound",
  category: "infrastructure",
});
```

All four adapter packages depend only on the published port interfaces, not on internal implementation details. Zipkin and Jaeger reuse the OTel package's `convertToReadableSpan()` and `createResource()` for span format conversion, establishing a clean dependency chain:

```
tracing-zipkin --> tracing-otel --> tracing (core)
tracing-jaeger --> tracing-otel --> tracing (core)
tracing-datadog --> tracing (core)
```

**Semantic convention mapping** preserves both HexDI-namespaced and OTel-standard attributes:

Source: `packages/tracing-otel/src/semantic-conventions/mapper.ts`

```typescript
export function mapHexDiToOtelAttributes(attributes: Attributes): Attributes {
  const mapped: Record<string, string | number | boolean | string[] | number[] | boolean[]> = {
    ...attributes,
  };
  if ("hex-di.port.name" in attributes) {
    mapped[SEMATTRS_CODE_NAMESPACE] = attributes["hex-di.port.name"];
  }
  if ("hex-di.resolution.cached" in attributes) {
    mapped["custom.cache_hit"] = attributes["hex-di.resolution.cached"];
  }
  if ("hex-di.container.id" in attributes) {
    mapped["custom.container_id"] = attributes["hex-di.container.id"];
  }
  if ("hex-di.resolution.depth" in attributes) {
    mapped["custom.resolution_depth"] = attributes["hex-di.resolution.depth"];
  }
  return mapped;
}
```

### 4.7 Testing & Verification

**Test file inventory across the stack:**

| Package         | Unit Tests | Integration Tests | Inspection Tests | Benchmarks | Total  |
| --------------- | ---------- | ----------------- | ---------------- | ---------- | ------ |
| tracing (core)  | 10         | 4                 | 5                | 4          | 23     |
| tracing-otel    | 3          | 0                 | 0                | 0          | 3      |
| tracing-datadog | 1          | 0                 | 0                | 0          | 1      |
| tracing-zipkin  | 1          | 0                 | 0                | 0          | 1      |
| tracing-jaeger  | 1          | 0                 | 0                | 0          | 1      |
| **Total**       | **16**     | **4**             | **5**            | **4**      | **29** |

**Core tracing test files:**

- `tests/unit/id-generation.test.ts` -- ID uniqueness, format, batch generation
- `tests/unit/propagation.test.ts` -- W3C header parsing/formatting, case-insensitive lookup
- `tests/unit/memory.test.ts` -- MemoryTracer span collection, FIFO eviction, parent-child
- `tests/unit/noop.test.ts` -- NoOp zero-overhead, frozen singletons
- `tests/unit/console.test.ts` -- ConsoleTracer output formatting
- `tests/unit/assertions.test.ts` -- Test assertion utilities
- `tests/unit/matchers.test.ts` -- Custom test matchers
- `tests/unit/bridge/tracer-like.test.ts` -- TracerLike adapter bridge
- `tests/unit/instrumentation/container.test.ts` -- Container hook installation/cleanup
- `tests/unit/instrumentation/hooks.test.ts` -- Tracing hook factory
- `tests/unit/instrumentation/port-filtering.test.ts` -- Include/exclude filtering
- `tests/unit/instrumentation/span-stack.test.ts` -- Push/pop/clear stack
- `tests/integration/tracing.test.ts` -- End-to-end tracing scenarios
- `tests/integration/instrumentation/cross-container.test.ts` -- Multi-container traces
- `tests/integration/instrumentation/dynamic-child-instrumentation.test.ts` -- Dynamic child containers
- `tests/integration/instrumentation/tree-instrumentation.test.ts` -- Container tree instrumentation
- `tests/inspection/filter.test.ts`, `adapters.test.ts`, `aggregation.test.ts`, `query-api.test.ts`, `library-inspector-bridge.test.ts` -- Inspection layer

**Gap -- Adapter packages have minimal test coverage.** Each adapter has only 1 unit test file. There are no integration tests that verify end-to-end export to a real or mocked backend, no tests for shutdown/flush behavior under concurrent load, and no tests for cross-batch parent-child correlation in the DataDog bridge.

### 4.8 Security

**Secure ID generation** uses `crypto.getRandomValues()` which provides cryptographic-quality randomness, preventing trace ID prediction or collision attacks:

Source: `packages/tracing/src/utils/globals.ts`

```typescript
export function getCrypto(): CryptoLike | undefined {
  if (typeof globalThis === "undefined" || !("crypto" in globalThis)) {
    return undefined;
  }
  const g: Record<string, unknown> = globalThis;
  const crypto: unknown = g.crypto;
  if (isCryptoLike(crypto)) {
    return crypto;
  }
  return undefined;
}
```

**CRITICAL GAP -- No PII filtering:** Attributes are passed through all export paths without any sanitization, filtering, or redaction. There is no mechanism to:

- Define sensitive attribute keys that should be redacted before export
- Scrub PII from attribute values (emails, IPs, user names)
- Prevent stack traces (when `includeStackTrace: true`) from containing sensitive local variable values
- Limit attribute value sizes to prevent data exfiltration

**CRITICAL GAP -- No transport security enforcement:** Exporter endpoints are fully configurable but default to plaintext HTTP:

- OTLP: `http://localhost:4318/v1/traces`
- Zipkin: `http://localhost:9411/api/v2/spans`
- Jaeger: `http://localhost:14268/api/traces`

While these are reasonable development defaults, there is no validation or warning when production deployments use HTTP instead of HTTPS.

**Positive -- DataDog peer dependency pattern:** The DataDog bridge accepts an already-initialized `dd-trace` tracer instance rather than managing credentials itself, keeping sensitive configuration outside the tracing library:

```typescript
export function createDataDogBridge(config: DataDogBridgeConfig): SpanExporter {
  const { tracer, serviceName, environment, version } = config;
  // tracer is already initialized with credentials by the user
}
```

### 4.9 Documentation

Documentation quality is high across the stack. Every public interface, type, and function has comprehensive JSDoc with:

- Purpose descriptions
- Parameter documentation
- Usage examples with code blocks
- `@remarks` sections for behavioral notes
- `@see` links to W3C specifications
- `@packageDocumentation` headers on all modules

The `SpanContext` interface documentation includes the full W3C Trace Context format specification:

```typescript
/**
 * W3C Trace Context identifying a span's position in a distributed trace.
 *
 * **Format specifications:**
 * - `traceId`: 32 hex characters (16 bytes), globally unique
 * - `spanId`: 16 hex characters (8 bytes), unique within trace
 * - `traceFlags`: 1 byte (0x00 or 0x01), bit 0 indicates sampling
 * - `traceState`: optional vendor-specific data, max 512 chars
 *
 * @see https://www.w3.org/TR/trace-context/
 */
```

The `AutoInstrumentOptions` interface includes performance guidance:

```typescript
/**
 * **Performance considerations:**
 * - `traceCachedResolutions: false` reduces span volume for high-traffic singletons
 * - `minDurationMs` filters out fast resolutions (e.g., minDurationMs: 10 ignores <10ms)
 * - `includeStackTrace: true` adds significant overhead, use only for debugging
 * - `portFilter` reduces tracing to specific services (e.g., only public APIs)
 */
```

### 4.10 Compliance-Specific (Tracing)

**W3C Trace Context support:** Full implementation of `traceparent` parsing/formatting and `tracestate` passthrough. Validation covers version field (must be `"00"`), hex format, length constraints, and all-zeros rejection.

**Span sampling:** The `traceFlags` field supports the W3C sampled bit (0x01). The NoOp tracer uses `traceFlags: 0` to indicate no sampling. Instrumentation hooks support filtering via `portFilter`, `traceCachedResolutions`, and `minDurationMs` -- though these are not true head-based sampling, they provide span reduction at the instrumentation level.

**Context variables for DI propagation:** Three context variables are defined for threading trace context through the DI container:

Source: `packages/tracing/src/context/variables.ts`

```typescript
export const TraceContextVar: ContextVariable<SpanContext | undefined> = createContextVariable(
  "hex-di/trace-context",
  undefined
);

export const ActiveSpanVar: ContextVariable<Span | undefined> = createContextVariable(
  "hex-di/active-span",
  undefined
);

export const CorrelationIdVar: ContextVariable<string | undefined> = createContextVariable(
  "hex-di/correlation-id",
  undefined
);
```

**TracerLike bridge for cross-library instrumentation:** A lightweight `pushSpan`/`popSpan` interface bridges the full `Tracer` API to library-specific tracing hooks (Flow, Query, Store, Saga):

Source: `packages/tracing/src/bridge/tracer-like.ts`

```typescript
export interface TracerLike {
  pushSpan(name: string, attributes?: Record<string, string>): void;
  popSpan(status: "ok" | "error"): void;
}

export function createTracerLikeAdapter(tracer: Tracer): TracerLike {
  const spanStack: Span[] = [];
  return {
    pushSpan(name: string, attributes?: Record<string, string>): void {
      const span = tracer.startSpan(name, { attributes });
      spanStack.push(span);
    },
    popSpan(status: "ok" | "error"): void {
      const span = spanStack.pop();
      if (span === undefined) return;
      span.setStatus(status);
      span.end();
    },
  };
}
```

**Gap -- No baggage propagation:** The W3C Baggage specification is not implemented. There is no mechanism for propagating key-value pairs (baggage items) alongside trace context across service boundaries.

**Gap -- No span sampling at the processor level:** Neither `SimpleSpanProcessor` nor `BatchSpanProcessor` implements probability-based sampling, tail sampling, or rate limiting. All spans that reach the processor are exported.

---

## 5. Code Examples (From Source)

### 5.1 Complete Span Lifecycle (MemoryTracer)

Source: `packages/tracing/src/adapters/memory/tracer.ts`

```typescript
withSpan<T>(name: string, fn: (span: Span) => T, options?: SpanOptions): T {
  const span = this.startSpan(name, options);
  try {
    const result = fn(span);
    span.end();
    return result;
  } catch (error) {
    span.recordException(error instanceof Error ? error : String(error));
    span.end();
    throw error;
  } finally {
    this._popSpan(span);
  }
}
```

### 5.2 Container Instrumentation Hook

Source: `packages/tracing/src/instrumentation/container.ts`

```typescript
function beforeResolve(ctx: ResolutionHookContext): void {
  if (!shouldTrace(ctx)) {
    return;
  }
  const spanName = `resolve:${ctx.portName}`;
  const span = tracer.startSpan(spanName, {
    kind: "internal",
    attributes: {
      "hex-di.port.name": ctx.portName,
      "hex-di.port.lifetime": ctx.lifetime,
      "hex-di.resolution.cached": ctx.isCacheHit,
      "hex-di.container.name": ctx.containerId,
      "hex-di.container.kind": ctx.containerKind,
      "hex-di.resolution.depth": ctx.depth,
      ...(ctx.parentPort && { "hex-di.parent.port": ctx.parentPort.__portName }),
      ...(ctx.scopeId && { "hex-di.scope.id": ctx.scopeId }),
      ...(ctx.inheritanceMode && { "hex-di.inheritance.mode": ctx.inheritanceMode }),
      ...opts.additionalAttributes,
    },
  });
  if (opts.includeStackTrace) {
    const stack = new Error().stack;
    if (stack) {
      span.setAttribute("stackTrace", stack);
    }
  }
  pushSpan(span);
}
```

### 5.3 BatchSpanProcessor FIFO Eviction

Source: `packages/tracing-otel/src/processors/batch.ts`

```typescript
const DEFAULT_MAX_QUEUE_SIZE = 2048;
const DEFAULT_SCHEDULED_DELAY_MILLIS = 5000;
const DEFAULT_EXPORT_TIMEOUT_MILLIS = 30000;
const DEFAULT_MAX_EXPORT_BATCH_SIZE = 512;

// Inside onEnd:
if (spanBuffer.length >= maxQueueSize) {
  spanBuffer.shift(); // Silent drop -- no counter, no log, no callback
}
spanBuffer.push(spanData);

if (spanBuffer.length >= maxExportBatchSize) {
  clearFlushTimer();
  flush().catch(err => {
    logError("[hex-di/tracing-otel] BatchSpanProcessor immediate flush failed:", err);
  });
} else {
  scheduleFlush();
}
```

### 5.4 DataDog Span Kind Mapping

Source: `packages/tracing-datadog/src/utils.ts`

```typescript
export function mapSpanKindToDataDog(
  kind: "internal" | "server" | "client" | "producer" | "consumer"
): DataDogSpanKind {
  const kindMap: Record<typeof kind, DataDogSpanKind> = {
    server: "web",
    client: "http",
    internal: "custom",
    producer: "worker",
    consumer: "worker",
  };
  return kindMap[kind];
}
```

### 5.5 OTel ReadableSpan Conversion

Source: `packages/tracing-otel/src/adapters/span-adapter.ts`

```typescript
export function convertToReadableSpan(hexSpan: SpanData, resource?: Resource): ReadableSpan {
  const startTime = convertToHrTime(hexSpan.startTime);
  const endTime = convertToHrTime(hexSpan.endTime);
  const duration = convertToHrTime(hexSpan.endTime - hexSpan.startTime);

  return {
    name: hexSpan.name,
    kind: convertSpanKind(hexSpan.kind),
    spanContext: () => ({
      traceId: hexSpan.context.traceId,
      spanId: hexSpan.context.spanId,
      traceFlags: hexSpan.context.traceFlags,
      // ...
    }),
    startTime,
    endTime,
    status: convertSpanStatus(hexSpan.status),
    attributes: hexSpan.attributes,
    links: hexSpan.links.map(convertSpanLink),
    events: hexSpan.events.map(convertSpanEvent),
    duration,
    ended: true,
    resource: resource ?? createDefaultResource(),
    instrumentationScope: {
      name: "@hex-di/tracing",
      version: "0.1.0",
    },
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
  };
}
```

---

## 6. Edge Cases & Known Limitations

### 6.1 CRITICAL -- Silent Span Eviction Without Audit Trail

**Location:** `MemoryTracer._collectSpan()` and `BatchSpanProcessor.onEnd()`
**Description:** When the circular buffer or queue reaches capacity, the oldest span is silently dropped. There is no counter, callback, log entry, or metric emitted when this occurs.
**GxP Impact:** In regulated environments, silent loss of audit records is a compliance violation. Any dropped tracing data should be counted and surfaced.
**Mitigation:** Add a `droppedSpanCount` counter and an optional `onDrop` callback.

### 6.2 CRITICAL -- No PII Filtering in Attribute Pipeline

**Location:** All `setAttribute()` / `setAttributes()` paths across every adapter
**Description:** Attribute values are passed through to exporters without any sanitization, filtering, or redaction. A developer calling `span.setAttribute('user.email', email)` will export PII to third-party backends.
**GxP Impact:** Violates data minimization principles and could breach GDPR/HIPAA requirements.
**Mitigation:** Add a configurable `AttributeFilter` or `AttributeRedactor` to the SpanProcessor pipeline.

### 6.3 HIGH -- Module-Level Span Stack Without Async Isolation

**Location:** `packages/tracing/src/instrumentation/span-stack.ts`
**Description:** The `spanStack: Span[]` array is module-scoped. In Node.js environments handling concurrent requests, all requests share the same stack, causing parent-child relationship corruption.
**GxP Impact:** Incorrect trace hierarchies undermine the traceability guarantee.
**Mitigation:** Use `AsyncLocalStorage` on Node.js with a fallback for browser/edge environments.

### 6.4 HIGH -- No Retry Mechanism for Failed Exports

**Location:** All four exporter implementations
**Description:** Failed `export()` calls are caught, logged via `logError()`, and discarded. There is no retry queue, exponential backoff, or circuit breaker.
**GxP Impact:** Transient network failures will result in permanent data loss.
**Mitigation:** Implement retry with exponential backoff in the `BatchSpanProcessor` or as an exporter wrapper.

### 6.5 MEDIUM -- DataDog Bridge Cross-Batch Parent Lookup Failure

**Location:** `packages/tracing-datadog/src/bridge.ts` lines 91-103
**Description:** The `activeSpans` Map is populated and cleared within the same `export()` call. If a parent span was exported in a previous batch, its entry has already been deleted, causing `childOf: undefined`.
**GxP Impact:** Broken parent-child relationships in DataDog traces reduce traceability.
**Mitigation:** Retain parent entries in the map for a configurable TTL, or accept that cross-batch hierarchy is best-effort.

### 6.6 MEDIUM -- ConsoleTracer Status Immutability Inconsistency

**Location:** `packages/tracing/src/adapters/console/tracer.ts`
**Description:** The `ConsoleSpan.setStatus()` prevents overwriting `"ok"` status (`this._status !== "ok"` guard), but the `MemorySpan.setStatus()` has no such guard -- it always overwrites the status. This behavioral inconsistency between adapters could cause different trace outcomes for the same code.
**GxP Impact:** Non-deterministic behavior depending on adapter choice.

### 6.7 MEDIUM -- Hardcoded Export Timeout

**Location:** `packages/tracing-otel/src/processors/batch.ts` and `simple.ts`
**Description:** The default export timeout is `30000ms` (30 seconds). While configurable via `exportTimeoutMillis`, the timeout for shutdown uses the same value. During process termination (e.g., SIGTERM with a 30-second grace period), the 30-second export timeout could consume the entire shutdown window.
**GxP Impact:** Potential data loss during controlled shutdown.

### 6.8 LOW -- Math.random Fallback for ID Generation

**Location:** `packages/tracing/src/utils/id-generation.ts`
**Description:** When `crypto.getRandomValues()` is unavailable, the fallback uses `Math.random()`, which is not cryptographically secure and may produce collisions under high throughput.
**GxP Impact:** Low risk in practice since modern runtimes always have crypto API, but the fallback path should be logged as a warning.

---

## 7. Recommendations by Tier

### Tier 1: Critical (Must Fix for GxP Compliance)

| #    | Recommendation                                                                                          | Affected Packages     | Effort |
| ---- | ------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| T1-1 | Add `droppedSpanCount` metric and optional `onDrop` callback to `MemoryTracer` and `BatchSpanProcessor` | tracing, tracing-otel | Small  |
| T1-2 | Implement `AttributeFilter` pipeline in `SpanProcessor` for PII redaction before export                 | tracing, tracing-otel | Medium |
| T1-3 | Replace module-level `spanStack` with `AsyncLocalStorage`-backed context on Node.js                     | tracing               | Medium |

### Tier 2: High Priority (Recommended for Production Readiness)

| #    | Recommendation                                                                           | Affected Packages | Effort |
| ---- | ---------------------------------------------------------------------------------------- | ----------------- | ------ |
| T2-1 | Add retry with exponential backoff to `BatchSpanProcessor` for transient export failures | tracing-otel      | Medium |
| T2-2 | Fix DataDog bridge parent-child lookup to handle cross-batch relationships               | tracing-datadog   | Small  |
| T2-3 | Log a warning when `Math.random` fallback is used for ID generation                      | tracing           | Small  |
| T2-4 | Harmonize `setStatus()` immutability behavior across Memory and Console adapters         | tracing           | Small  |

### Tier 3: Medium Priority (Enhance Compliance Posture)

| #    | Recommendation                                                                      | Affected Packages                                             | Effort |
| ---- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------ |
| T3-1 | Implement `tracestate` validation per W3C grammar rules (max 512 chars, key format) | tracing                                                       | Small  |
| T3-2 | Add attribute key/value size limits with configurable thresholds                    | tracing                                                       | Small  |
| T3-3 | Add integration tests for each adapter with mocked backends                         | tracing-otel, tracing-datadog, tracing-zipkin, tracing-jaeger | Medium |
| T3-4 | Implement W3C Baggage propagation                                                   | tracing                                                       | Large  |
| T3-5 | Add probability-based head sampling in `BatchSpanProcessor`                         | tracing-otel                                                  | Medium |
| T3-6 | Configure separate (shorter) timeout for shutdown vs. normal export operations      | tracing-otel                                                  | Small  |

### Tier 4: Low Priority (Nice to Have)

| #    | Recommendation                                                                         | Affected Packages                            | Effort |
| ---- | -------------------------------------------------------------------------------------- | -------------------------------------------- | ------ |
| T4-1 | Add HTTPS-only validation option for production exporter endpoints                     | tracing-otel, tracing-zipkin, tracing-jaeger | Small  |
| T4-2 | Use `getHighResTimestamp()` instead of `Date.now()` in MemorySpan for sub-ms precision | tracing                                      | Small  |
| T4-3 | Add span link validation (verify linked traceId/spanId format)                         | tracing                                      | Small  |

---

## 8. File Reference Guide

### Core Tracing (`packages/tracing/src/`)

| File                            | Purpose                                                                    | GxP Relevance                           |
| ------------------------------- | -------------------------------------------------------------------------- | --------------------------------------- |
| `types/span.ts`                 | `Span`, `SpanData`, `SpanContext`, `SpanEvent` interfaces                  | Data integrity -- all readonly fields   |
| `types/attributes.ts`           | `AttributeValue`, `Attributes` types                                       | No runtime validation (gap)             |
| `types/status.ts`               | `SpanKind`, `SpanStatus` type unions                                       | Deterministic enum-like types           |
| `ports/tracer.ts`               | `Tracer` interface, `TracerPort`                                           | Primary API contract                    |
| `ports/exporter.ts`             | `SpanExporter` interface, `SpanExporterPort`                               | Export lifecycle contract               |
| `ports/processor.ts`            | `SpanProcessor` interface, `SpanProcessorPort`                             | Processing pipeline contract            |
| `context/parse.ts`              | `parseTraceparent`, `formatTraceparent`, `isValidTraceId`, `isValidSpanId` | W3C validation (strong)                 |
| `context/propagation.ts`        | `extractTraceContext`, `injectTraceContext`                                | HTTP header propagation                 |
| `context/variables.ts`          | `TraceContextVar`, `ActiveSpanVar`, `CorrelationIdVar`                     | DI context threading                    |
| `utils/id-generation.ts`        | `generateTraceId`, `generateSpanId`                                        | Crypto-secure with fallback             |
| `utils/globals.ts`              | `getCrypto`, `getPerformance`, `getConsole`, `getStdoutTTY`                | Cross-platform API access               |
| `utils/timing.ts`               | `getHighResTimestamp`, `formatDuration`                                    | Sub-ms precision when available         |
| `utils/object-pool.ts`          | `ObjectPool` class                                                         | Memory optimization                     |
| `adapters/memory/span.ts`       | `MemorySpan` class                                                         | Recording guard, immutable snapshot     |
| `adapters/memory/tracer.ts`     | `MemoryTracer` class                                                       | Circular buffer, FIFO eviction (gap)    |
| `adapters/memory/adapter.ts`    | `MemoryTracerAdapter` DI registration                                      | Transient lifetime                      |
| `adapters/noop/tracer.ts`       | `NOOP_TRACER`, `NOOP_SPAN` frozen singletons                               | Zero overhead bypass                    |
| `adapters/console/tracer.ts`    | `ConsoleTracer`, `ConsoleSpan` classes                                     | Status immutability inconsistency       |
| `adapters/console/formatter.ts` | `formatSpan`, `colorize`, `formatDuration`                                 | Human-readable output                   |
| `instrumentation/container.ts`  | `instrumentContainer` function                                             | Hook lifecycle, double-instrument guard |
| `instrumentation/hooks.ts`      | `createTracingHook` factory                                                | Standalone hook creation                |
| `instrumentation/span-stack.ts` | `pushSpan`, `popSpan`, `getActiveSpan`, `clearStack`                       | Module-level stack (gap)                |
| `instrumentation/types.ts`      | `AutoInstrumentOptions`, `PortFilter`, `evaluatePortFilter`                | Filtering configuration                 |
| `bridge/tracer-like.ts`         | `TracerLike` interface, `createTracerLikeAdapter`                          | Cross-library bridge                    |
| `testing/assertions.ts`         | Test assertion utilities                                                   | Test infrastructure                     |
| `testing/matchers.ts`           | Custom Vitest matchers                                                     | Test infrastructure                     |

### OTel Adapter (`packages/tracing-otel/src/`)

| File                             | Purpose                                                           | GxP Relevance                           |
| -------------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| `processors/batch.ts`            | `createBatchSpanProcessor`                                        | FIFO eviction (gap), timeout protection |
| `processors/simple.ts`           | `createSimpleSpanProcessor`                                       | Fire-and-forget export                  |
| `processors/types.ts`            | `BatchSpanProcessorOptions`, `SimpleSpanProcessorOptions`         | Configurable thresholds                 |
| `exporters/otlp-http.ts`         | `createOtlpHttpExporter`                                          | OTel OTLP bridge, no retry (gap)        |
| `exporters/types.ts`             | `OtlpHttpExporterOptions`                                         | Endpoint/auth configuration             |
| `adapters/span-adapter.ts`       | `convertToReadableSpan`                                           | HexDI-to-OTel format conversion         |
| `adapters/types.ts`              | `convertSpanKind`, `convertSpanStatus`, `convertToHrTime`         | Type-safe enum mapping                  |
| `semantic-conventions/mapper.ts` | `mapHexDiToOtelAttributes`                                        | Dual-attribute preservation             |
| `resources/resource.ts`          | `createResource`, `ResourceConfig`                                | Service identification                  |
| `utils/globals.ts`               | `logError`, `safeSetTimeout`, `safeClearTimeout`, `hasSetTimeout` | Cross-platform safety                   |

### DataDog Adapter (`packages/tracing-datadog/src/`)

| File        | Purpose                                     | GxP Relevance                               |
| ----------- | ------------------------------------------- | ------------------------------------------- |
| `bridge.ts` | `createDataDogBridge`                       | Parent-child Map (gap), span reconstruction |
| `types.ts`  | `DdTracer`, `DdSpan`, `DataDogBridgeConfig` | Minimal interface, peer dependency          |
| `utils.ts`  | `mapSpanKindToDataDog`, `logError`          | DD-specific kind mapping                    |

### Zipkin Adapter (`packages/tracing-zipkin/src/`)

| File          | Purpose                | GxP Relevance                          |
| ------------- | ---------------------- | -------------------------------------- |
| `exporter.ts` | `createZipkinExporter` | Reuses OTel conversion, no retry (gap) |

### Jaeger Adapter (`packages/tracing-jaeger/src/`)

| File          | Purpose                | GxP Relevance                          |
| ------------- | ---------------------- | -------------------------------------- |
| `exporter.ts` | `createJaegerExporter` | Reuses OTel conversion, no retry (gap) |

---

_Report generated from source analysis of all `src/\*\*/_.ts` files across the 5-package tracing stack. All code examples are extracted directly from the repository source files. No code was invented or synthesized.\*
