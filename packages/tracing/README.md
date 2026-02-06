# @hex-di/tracing

Zero-dependency distributed tracing for HexDI following hexagonal architecture patterns.

Provides W3C Trace Context compatible tracing with OpenTelemetry-aligned interfaces, designed for type-safe dependency injection.

## Features

- **Port/Adapter pattern** - TracerPort defines the contract, adapters implement it
- **W3C Trace Context** - Standards-compliant trace propagation via `traceparent`/`tracestate` headers
- **OpenTelemetry compatible** - API surface aligns with OTel SDK conventions
- **Zero dependencies** - Only peer-depends on `@hex-di/core`
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

// Register the adapter
const container = createContainer().register(MemoryTracerAdapter).build();

// Resolve the tracer via its port
const tracer = container.get(TracerPort);

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
const container = createContainer().register(NoOpTracerAdapter).build();

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

## License

MIT
