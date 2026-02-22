# @hex-di/tracing

Zero-dependency distributed tracing for HexDI following hexagonal architecture patterns.

Provides W3C Trace Context compatible tracing with OpenTelemetry-aligned interfaces, designed for type-safe dependency injection.

## Features

- **Port/Adapter pattern** - TracerPort defines the contract, adapters implement it
- **W3C Trace Context** - Standards-compliant trace propagation via `traceparent`/`tracestate` headers
- **OpenTelemetry compatible** - API surface aligns with OTel SDK conventions
- **Zero dependencies** - Only peer-depends on `@hex-di/core` and `@hex-di/runtime`
- **Three built-in adapters** - NoOp, Memory, Console
- **Type-safe** - Full TypeScript inference, no type casts

## Installation

```bash
pnpm add @hex-di/tracing
```

## Quick Start

### With DI Container

```typescript
import { createContainer } from "@hex-di/runtime";
import { TracerPort, MemoryTracerAdapter } from "@hex-di/tracing";

// Register the adapter in a graph and create a container
const graph = GraphBuilder.create().provide(MemoryTracerAdapter).build();
const container = createContainer({ graph, name: "App" });

// Resolve the tracer via its port
const tracer = container.resolve(TracerPort);

tracer.withSpan("my-operation", span => {
  span.setAttribute("user.id", "123");
  // ... do work
});
```

### Standalone (no DI)

```typescript
import { createMemoryTracer } from "@hex-di/tracing";

const tracer = createMemoryTracer();

tracer.withSpan("operation", span => {
  span.setAttribute("key", "value");
});

console.log(tracer.getCollectedSpans());
```

## Adapters

### NoOp Adapter

Zero-overhead tracer for production environments where tracing is disabled. All operations are no-ops that return frozen singleton instances - no allocations, no timing calls, no state mutations.

```typescript
import { NoOpTracerAdapter, NOOP_TRACER } from "@hex-di/tracing";

// Via DI
const graph = GraphBuilder.create().provide(NoOpTracerAdapter).build();
const container = createContainer({ graph, name: "App" });

// Or use the singleton directly
const result = NOOP_TRACER.withSpan("operation", span => {
  // span is a frozen no-op - setAttribute, addEvent, etc. are all no-ops
  return computeResult();
});
```

### Memory Adapter

In-memory span collection for testing and debugging. Stores all completed spans in a flat array for assertions.

```typescript
import { createMemoryTracer } from "@hex-di/tracing";

const tracer = createMemoryTracer();

tracer.withSpan("http.request", span => {
  span.setAttribute("http.method", "GET");

  tracer.withSpan("db.query", dbSpan => {
    dbSpan.setAttribute("db.system", "postgresql");
  });
});

const spans = tracer.getCollectedSpans();
// spans[0] = db.query (child, ends first)
// spans[1] = http.request (parent, ends last)

// Test assertions
expect(spans).toHaveLength(2);
expect(spans[0].parentSpanId).toBe(spans[1].context.spanId);

// Clear for test isolation
tracer.clear();
```

**Features:**

- Flat span storage for easy test assertions
- Parent-child relationship tracking via `parentSpanId`
- 10,000 span limit with FIFO eviction
- `getCollectedSpans()` for verification
- `clear()` for test isolation
- Transient lifetime for DI (each injection gets fresh instance)

### Console Adapter

Human-readable console output for development debugging.

```typescript
import { createConsoleTracer } from "@hex-di/tracing";

const tracer = createConsoleTracer({
  colorize: true, // ANSI colors (auto-detected for TTY)
  includeTimestamps: true, // ISO 8601 timestamps
  minDurationMs: 1, // Filter out sub-1ms spans
  indent: true, // Show span hierarchy
});

tracer.withSpan("http.request", span => {
  span.setAttribute("http.method", "GET");

  tracer.withSpan("db.query", dbSpan => {
    dbSpan.setAttribute("db.table", "users");
  });
});
```

Output:

```
[TRACE] db.query (2.1ms) ○ 2024-01-15T10:30:45.135Z
   {db.table=users}
[TRACE] http.request (45.2ms) ○ 2024-01-15T10:30:45.123Z
   {http.method=GET}
```

## W3C Trace Context

Full support for W3C Trace Context propagation across service boundaries.

### Parsing and Formatting

```typescript
import { parseTraceparent, formatTraceparent } from "@hex-di/tracing";

// Parse incoming header
const context = parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
// { traceId: '4bf92f...', spanId: '00f067...', traceFlags: 1 }

// Format for outgoing header
const header = formatTraceparent(context);
// '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
```

### HTTP Header Propagation

```typescript
import { extractTraceContext, injectTraceContext } from "@hex-di/tracing";

// Extract from incoming request (case-insensitive)
const context = extractTraceContext(request.headers);

// Inject into outgoing request
const headers: Record<string, string> = {};
injectTraceContext(spanContext, headers);
// headers.traceparent = '00-...-...-01'
// headers.tracestate = 'vendor=value' (if present)
```

### ID Generation

```typescript
import { generateTraceId, generateSpanId } from "@hex-di/tracing";

const traceId = generateTraceId(); // 32 hex chars (16 bytes)
const spanId = generateSpanId(); // 16 hex chars (8 bytes)
```

Uses `crypto.getRandomValues` when available, falls back to `Math.random`.

## Port/Adapter Pattern

The package follows hexagonal architecture:

- **TracerPort** - Primary interface for creating and managing spans
- **SpanExporterPort** - Interface for exporting completed spans to backends
- **SpanProcessorPort** - Interface for processing span lifecycle events

Adapters implement TracerPort:

- `NoOpTracerAdapter` - Zero overhead, singleton lifetime
- `MemoryTracerAdapter` - In-memory collection, transient lifetime
- `ConsoleTracerAdapter` - Console output, singleton lifetime

## Types

All types follow OpenTelemetry conventions:

| Type             | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `Span`           | Active span for recording telemetry                                |
| `SpanData`       | Immutable snapshot of completed span                               |
| `SpanContext`    | W3C trace context (traceId, spanId, flags)                         |
| `SpanOptions`    | Configuration for creating spans                                   |
| `SpanKind`       | `'internal' \| 'server' \| 'client' \| 'producer' \| 'consumer'`   |
| `SpanStatus`     | `'unset' \| 'ok' \| 'error'`                                       |
| `SpanEvent`      | Point-in-time event during span execution                          |
| `Attributes`     | Key-value metadata for spans                                       |
| `AttributeValue` | `string \| number \| boolean \| string[] \| number[] \| boolean[]` |

## Type Guards

Runtime validation utilities:

```typescript
import {
  isAttributeValue,
  isSpanKind,
  isSpanStatus,
  isValidTraceId,
  isValidSpanId,
} from "@hex-di/tracing";

isAttributeValue("GET"); // true
isAttributeValue(NaN); // false
isSpanKind("server"); // true
isSpanStatus("error"); // true
isValidTraceId("4bf92f..."); // true (32 hex, not all zeros)
isValidSpanId("00f067..."); // true (16 hex, not all zeros)
```

## Testing Utilities

The tracing package provides assertion helpers and span matchers for verifying tracing behavior in tests.

### Importing Test Utilities

```typescript
import { assertSpanExists, hasAttribute, hasEvent, hasStatus, hasDuration } from "@hex-di/tracing";
```

### assertSpanExists

Finds spans matching criteria and throws a descriptive error if not found. Supports exact name matching, RegExp patterns, and multiple optional criteria.

```typescript
import { createMemoryTracer } from "@hex-di/tracing";
import { assertSpanExists, hasAttribute, hasStatus } from "@hex-di/tracing";

const tracer = createMemoryTracer();

tracer.withSpan("http.request", span => {
  span.setAttribute("http.method", "GET");
  span.setAttribute("http.status_code", 200);
  span.setStatus("ok");
});

const spans = tracer.getCollectedSpans();

// Exact name match
assertSpanExists(spans, { name: "http.request" });

// Pattern matching
assertSpanExists(spans, { name: /^http\./ });

// Multiple criteria
assertSpanExists(spans, {
  name: "http.request",
  status: "ok",
  attributes: { "http.method": "GET" },
});

// If not found, throws error with available spans:
// Error: No span matching criteria found
//   Search criteria: {"name":"db.query"}
//   Available spans: ["http.request"]
```

### Span Matchers

Pure function predicates for composable span matching. All matchers return `boolean` and have no side effects.

#### hasAttribute

Check if span has attribute with optional value matching:

```typescript
import { hasAttribute } from "@hex-di/tracing";

// Check attribute presence
hasAttribute(span, "http.method"); // true if attribute exists

// Check attribute value (exact match)
hasAttribute(span, "http.method", "GET"); // true if method === "GET"

// Check number attribute
hasAttribute(span, "http.status_code", 200); // true if status === 200
```

#### hasEvent

Check if span has event by name:

```typescript
import { hasEvent } from "@hex-di/tracing";

tracer.withSpan("operation", span => {
  span.addEvent("cache.hit", { key: "user:123" });
});

hasEvent(span, "cache.hit"); // true
hasEvent(span, "cache.miss"); // false
```

#### hasStatus

Check span status:

```typescript
import { hasStatus } from "@hex-di/tracing";

span.setStatus("error");

hasStatus(span, "error"); // true
hasStatus(span, "ok"); // false
```

#### hasDuration

Check if span duration falls within bounds (milliseconds):

```typescript
import { hasDuration } from "@hex-di/tracing";

// Minimum duration only
hasDuration(span, 10); // true if duration >= 10ms

// Min and max bounds
hasDuration(span, 10, 100); // true if 10ms <= duration <= 100ms

// Max duration only (pass undefined for min)
hasDuration(span, undefined, 50); // true if duration <= 50ms
```

### Complete Test Example

```typescript
import { describe, it, expect } from "vitest";
import { createMemoryTracer } from "@hex-di/tracing";
import { assertSpanExists, hasAttribute, hasEvent, hasStatus, hasDuration } from "@hex-di/tracing";

describe("HTTP Request Tracing", () => {
  it("creates span with correct attributes", () => {
    const tracer = createMemoryTracer();

    tracer.withSpan("GET /users", span => {
      span.setAttribute("http.method", "GET");
      span.setAttribute("http.route", "/users");
      span.setAttribute("http.status_code", 200);
      span.addEvent("request.start");
      span.addEvent("database.query");
      span.addEvent("response.sent");
      span.setStatus("ok");
    });

    const spans = tracer.getCollectedSpans();

    // Find span by pattern
    const httpSpan = assertSpanExists(spans, { name: /^GET / });

    // Verify attributes
    expect(hasAttribute(httpSpan, "http.method", "GET")).toBe(true);
    expect(hasAttribute(httpSpan, "http.status_code", 200)).toBe(true);

    // Verify events
    expect(hasEvent(httpSpan, "request.start")).toBe(true);
    expect(hasEvent(httpSpan, "database.query")).toBe(true);

    // Verify status
    expect(hasStatus(httpSpan, "ok")).toBe(true);

    // Verify duration (should be very fast in tests)
    expect(hasDuration(httpSpan, 0, 100)).toBe(true);
  });
});
```

### Performance Benchmarks

Performance benchmarks verify tracing overhead using vitest's benchmark API:

```bash
pnpm --filter @hex-di/tracing test:bench
```

**NoOp Tracer Overhead:**

- Baseline: 61.97 Hz (16.14ms per 100k resolutions)
- Instrumented: 44.80 Hz (22.32ms per 100k resolutions)
- **Overhead: ~38% (6ms absolute for 100k operations)**

**Memory Tracer Overhead:**

- Baseline: 61.84 Hz (16.17ms per 100k resolutions)
- Instrumented: 8.81 Hz (113.53ms per 100k resolutions)
- **Overhead: ~602% (97ms absolute for 100k operations)**

The overhead is acceptable for distributed tracing use cases. For production:

- Use sampling (trace subset of requests)
- Apply port filters (only trace critical services)
- Use batch export to external systems

## License

MIT
