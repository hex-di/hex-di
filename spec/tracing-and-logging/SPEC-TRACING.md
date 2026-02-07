# @hex-di/tracing Specification

## Overview

A distributed tracing package for HexDi that provides span-based tracing with context propagation, building on the existing `TraceCollector` and `ResolutionSpan` primitives in `@hex-di/core`.

## Goals

1. **Effect-TS-like API** - Familiar patterns for Effect users
2. **Zero runtime overhead when disabled** - No-op implementation with zero cost
3. **Multiple backend support** - OpenTelemetry, Jaeger, Zipkin, DataDog
4. **Automatic DI instrumentation** - Trace all resolutions automatically
5. **Manual span creation** - Custom spans for business logic
6. **Context propagation** - Correlation IDs across async boundaries
7. **Type-safe** - Full TypeScript inference, no `any` types

## Architecture

### Package Structure

```
packages/tracing/
├── src/
│   ├── index.ts                    # Public API exports
│   ├── ports/
│   │   ├── tracer.ts               # Tracer port definition
│   │   ├── span.ts                 # Span port definition
│   │   └── exporter.ts             # Exporter port definition
│   ├── adapters/
│   │   ├── noop/                   # Zero-cost no-op implementation
│   │   ├── memory/                 # In-memory for testing
│   │   └── console/                # Console output for development
│   ├── context/
│   │   ├── trace-context.ts        # W3C Trace Context propagation
│   │   ├── correlation.ts          # Correlation ID management
│   │   └── baggage.ts              # Baggage propagation
│   ├── instrumentation/
│   │   ├── auto.ts                 # Automatic DI instrumentation
│   │   └── hooks.ts                # Resolution hook integration
│   └── utils/
│       ├── timing.ts               # High-resolution timing
│       └── id-generation.ts        # Trace/Span ID generation
├── tests/
└── package.json
```

### Separate Backend Packages

```
packages/tracing-otel/              # OpenTelemetry exporter
packages/tracing-jaeger/            # Jaeger exporter
packages/tracing-zipkin/            # Zipkin exporter
packages/tracing-datadog/           # DataDog exporter
```

## Core Types

### Tracer Port

```typescript
import { createPort, type Port } from "@hex-di/core";

/**
 * Span status indicating outcome
 */
export type SpanStatus = "ok" | "error" | "unset";

/**
 * Span kind for semantic meaning
 */
export type SpanKind = "internal" | "server" | "client" | "producer" | "consumer";

/**
 * Attribute value types (OTEL compatible)
 */
export type AttributeValue = string | number | boolean | string[] | number[] | boolean[];

/**
 * Span attributes map
 */
export type Attributes = Readonly<Record<string, AttributeValue>>;

/**
 * Span context for propagation
 */
export interface SpanContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: number;
  readonly traceState?: string;
}

/**
 * Active span interface
 */
export interface Span {
  readonly context: SpanContext;
  readonly name: string;
  readonly startTime: number;

  setAttribute(key: string, value: AttributeValue): void;
  setAttributes(attributes: Attributes): void;
  addEvent(name: string, attributes?: Attributes): void;
  setStatus(status: SpanStatus, message?: string): void;
  recordException(error: Error): void;
  end(endTime?: number): void;
  isRecording(): boolean;
}

/**
 * Span options for creation
 */
export interface SpanOptions {
  readonly kind?: SpanKind;
  readonly attributes?: Attributes;
  readonly links?: ReadonlyArray<SpanContext>;
  readonly startTime?: number;
  readonly root?: boolean; // Force new trace
}

/**
 * Tracer interface for creating and managing spans
 */
export interface Tracer {
  /**
   * Start a new span
   */
  startSpan(name: string, options?: SpanOptions): Span;

  /**
   * Execute function within a span context
   */
  withSpan<T>(name: string, fn: (span: Span) => T, options?: SpanOptions): T;

  /**
   * Execute async function within a span context
   */
  withSpanAsync<T>(name: string, fn: (span: Span) => Promise<T>, options?: SpanOptions): Promise<T>;

  /**
   * Get the current active span (if any)
   */
  getActiveSpan(): Span | undefined;

  /**
   * Get current span context for propagation
   */
  getSpanContext(): SpanContext | undefined;

  /**
   * Create a child tracer with default attributes
   */
  withAttributes(attributes: Attributes): Tracer;
}

/**
 * Tracer port for DI registration
 */
export const TracerPort = createPort<Tracer>("Tracer");
```

### Exporter Port

```typescript
import { createPort } from "@hex-di/core";

/**
 * Completed span data for export
 */
export interface SpanData {
  readonly context: SpanContext;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: SpanKind;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly status: SpanStatus;
  readonly statusMessage?: string;
  readonly attributes: Attributes;
  readonly events: ReadonlyArray<{
    readonly name: string;
    readonly time: number;
    readonly attributes?: Attributes;
  }>;
  readonly links: ReadonlyArray<SpanContext>;
}

/**
 * Exporter interface for sending spans to backends
 */
export interface SpanExporter {
  /**
   * Export completed spans
   */
  export(spans: ReadonlyArray<SpanData>): Promise<void>;

  /**
   * Shutdown exporter and flush pending spans
   */
  shutdown(): Promise<void>;

  /**
   * Force flush pending spans
   */
  forceFlush(): Promise<void>;
}

/**
 * SpanExporter port for DI registration
 */
export const SpanExporterPort = createPort<SpanExporter>("SpanExporter");
```

### Span Processor

```typescript
import { createPort } from "@hex-di/core";

/**
 * Processor for span lifecycle events
 */
export interface SpanProcessor {
  /**
   * Called when span starts
   */
  onStart(span: Span): void;

  /**
   * Called when span ends
   */
  onEnd(spanData: SpanData): void;

  /**
   * Shutdown processor
   */
  shutdown(): Promise<void>;

  /**
   * Force flush
   */
  forceFlush(): Promise<void>;
}

export const SpanProcessorPort = createPort<SpanProcessor>("SpanProcessor");
```

## Context Propagation

### Trace Context Variable

```typescript
import { createContextVariable } from "@hex-di/core";

/**
 * Current trace context for propagation
 */
export const TraceContextVar = createContextVariable<SpanContext | undefined>(
  "hex-di/trace-context",
  undefined
);

/**
 * Current active span stack
 */
export const ActiveSpanVar = createContextVariable<Span | undefined>(
  "hex-di/active-span",
  undefined
);

/**
 * Correlation ID for request tracking
 */
export const CorrelationIdVar = createContextVariable<string | undefined>(
  "hex-di/correlation-id",
  undefined
);
```

### W3C Trace Context Headers

```typescript
/**
 * Extract trace context from headers
 */
export function extractTraceContext(
  headers: Record<string, string | undefined>
): SpanContext | undefined;

/**
 * Inject trace context into headers
 */
export function injectTraceContext(context: SpanContext, headers: Record<string, string>): void;

/**
 * Header names
 */
export const TRACEPARENT_HEADER = "traceparent";
export const TRACESTATE_HEADER = "tracestate";
```

## Automatic Instrumentation

### DI Resolution Instrumentation

```typescript
import type { Container } from "@hex-di/runtime";

/**
 * Options for automatic instrumentation
 */
export interface AutoInstrumentOptions {
  /**
   * Whether to trace sync resolutions
   */
  readonly traceSyncResolutions?: boolean;

  /**
   * Whether to trace async resolutions
   */
  readonly traceAsyncResolutions?: boolean;

  /**
   * Filter which ports to trace
   */
  readonly portFilter?: (portName: string) => boolean;

  /**
   * Additional attributes to add to spans
   */
  readonly additionalAttributes?: Attributes;

  /**
   * Minimum duration (ms) to create a span (skip fast resolutions)
   */
  readonly minDurationMs?: number;
}

/**
 * Enable automatic tracing of DI resolutions
 */
export function instrumentContainer(
  container: Container,
  tracer: Tracer,
  options?: AutoInstrumentOptions
): () => void; // Returns cleanup function

/**
 * Resolution span attributes added automatically
 */
interface ResolutionSpanAttributes {
  "hex-di.port.name": string;
  "hex-di.port.lifetime": "singleton" | "scoped" | "transient";
  "hex-di.resolution.cached": boolean;
  "hex-di.resolution.scope_id"?: string;
  "hex-di.resolution.duration_ms": number;
}
```

### Hook-Based Integration

```typescript
import type { ResolutionHook } from "@hex-di/runtime";

/**
 * Create a resolution hook that traces resolutions
 */
export function createTracingHook(tracer: Tracer, options?: AutoInstrumentOptions): ResolutionHook;
```

## Adapters

### No-Op Adapter (Zero Cost)

```typescript
import { createAdapter } from "@hex-di/core";

/**
 * No-op tracer that does nothing
 * Zero runtime overhead when tracing is disabled
 */
export const NoOpTracerAdapter = createAdapter({
  port: TracerPort,
  factory: () => ({
    startSpan: () => noOpSpan,
    withSpan: (_, fn) => fn(noOpSpan),
    withSpanAsync: async (_, fn) => fn(noOpSpan),
    getActiveSpan: () => undefined,
    getSpanContext: () => undefined,
    withAttributes: () => noOpTracer,
  }),
  lifetime: "singleton",
});
```

### Memory Adapter (Testing)

```typescript
/**
 * In-memory tracer that collects spans for assertions
 */
export const MemoryTracerAdapter = createAdapter({
  port: TracerPort,
  factory: () => {
    const spans: SpanData[] = [];
    return {
      // ... implementation
      getCollectedSpans: () => [...spans],
      clear: () => {
        spans.length = 0;
      },
    };
  },
  lifetime: "singleton",
});
```

### Console Adapter (Development)

```typescript
/**
 * Console tracer that logs spans to console
 */
export interface ConsoleTracerOptions {
  readonly colorize?: boolean;
  readonly includeTimestamps?: boolean;
  readonly minDurationMs?: number;
}

export const ConsoleTracerAdapter = createAdapter({
  port: TracerPort,
  requires: [],
  factory: (options: ConsoleTracerOptions = {}) => {
    // ... implementation that logs to console
  },
  lifetime: "singleton",
});
```

## Framework Integration

### Hono Middleware

```typescript
import type { MiddlewareHandler } from "hono";

/**
 * Tracing middleware for Hono
 */
export interface HonoTracingOptions {
  readonly tracer: Tracer;
  readonly spanName?: (c: Context) => string;
  readonly extractContext?: boolean;
  readonly injectContext?: boolean;
  readonly attributes?: (c: Context) => Attributes;
}

export function tracingMiddleware(options: HonoTracingOptions): MiddlewareHandler;
```

### React Integration

```typescript
import type { ReactNode } from "react";

/**
 * Provider that establishes trace context for React tree
 */
export interface TracingProviderProps {
  readonly tracer: Tracer;
  readonly spanName?: string;
  readonly attributes?: Attributes;
  readonly children: ReactNode;
}

export function TracingProvider(props: TracingProviderProps): ReactNode;

/**
 * Hook to access tracer in components
 */
export function useTracer(): Tracer;

/**
 * Hook to get current span
 */
export function useSpan(): Span | undefined;

/**
 * Hook to trace a callback
 */
export function useTracedCallback<T extends (...args: unknown[]) => unknown>(
  name: string,
  callback: T,
  options?: SpanOptions
): T;
```

## Usage Examples

### Basic Usage

```typescript
import { TracerPort, ConsoleTracerAdapter } from "@hex-di/tracing";
import { createGraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

const graph = createGraphBuilder().provide(ConsoleTracerAdapter).build();

const container = createContainer(graph);
const tracer = container.resolve(TracerPort);

// Manual span creation
const result = tracer.withSpan("process-order", span => {
  span.setAttribute("order.id", "12345");
  // ... business logic
  return processOrder();
});

// Async span
const asyncResult = await tracer.withSpanAsync("fetch-user", async span => {
  span.setAttribute("user.id", userId);
  return await fetchUser(userId);
});
```

### Automatic DI Instrumentation

```typescript
import { instrumentContainer, TracerPort } from "@hex-di/tracing";

const container = createContainer(graph);
const tracer = container.resolve(TracerPort);

// Enable automatic tracing
const cleanup = instrumentContainer(container, tracer, {
  traceSyncResolutions: true,
  traceAsyncResolutions: true,
  minDurationMs: 1, // Only trace resolutions > 1ms
});

// All subsequent resolutions are traced
const userService = container.resolve(UserServicePort);
// ^ Creates span: "resolve UserService"

// Cleanup when done
cleanup();
```

### With Hono

```typescript
import { Hono } from "hono";
import { hexDiMiddleware } from "@hex-di/hono";
import { tracingMiddleware, TracerPort } from "@hex-di/tracing";

const app = new Hono();

app.use("*", hexDiMiddleware({ container }));
app.use(
  "*",
  tracingMiddleware({
    tracer: container.resolve(TracerPort),
    extractContext: true, // Extract from incoming headers
    injectContext: true, // Inject into outgoing responses
  })
);

app.get("/users/:id", async c => {
  const tracer = c.get("tracer");
  return tracer.withSpanAsync("get-user-handler", async span => {
    span.setAttribute("user.id", c.req.param("id"));
    // ...
  });
});
```

### Distributed Tracing

```typescript
import { extractTraceContext, injectTraceContext } from "@hex-di/tracing";

// Extract from incoming request
const parentContext = extractTraceContext(request.headers);

// Create child span
const span = tracer.startSpan("downstream-call", {
  links: parentContext ? [parentContext] : [],
});

// Inject into outgoing request
const headers: Record<string, string> = {};
injectTraceContext(span.context, headers);

await fetch(downstreamUrl, { headers });
```

## Backend Packages

### @hex-di/tracing-otel

```typescript
import { SpanExporterPort } from "@hex-di/tracing";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

export interface OtelExporterOptions {
  readonly endpoint?: string;
  readonly headers?: Record<string, string>;
  readonly compression?: "gzip" | "none";
}

export const OtelExporterAdapter = createAdapter({
  port: SpanExporterPort,
  factory: (options: OtelExporterOptions = {}) => {
    const exporter = new OTLPTraceExporter(options);
    return {
      export: spans => exporter.export(convertToOtel(spans)),
      shutdown: () => exporter.shutdown(),
      forceFlush: () => exporter.forceFlush(),
    };
  },
  lifetime: "singleton",
});
```

### @hex-di/tracing-jaeger

```typescript
export interface JaegerExporterOptions {
  readonly agentHost?: string;
  readonly agentPort?: number;
  readonly collectorEndpoint?: string;
}

export const JaegerExporterAdapter = createAdapter({
  port: SpanExporterPort,
  factory: (options: JaegerExporterOptions = {}) => {
    // Jaeger-specific implementation
  },
  lifetime: "singleton",
});
```

## Performance Considerations

1. **Lazy Span Creation** - Spans only created when tracing is enabled
2. **Batched Export** - Spans batched before sending to backends
3. **Sampling** - Support for head and tail-based sampling
4. **No-Op Fast Path** - Zero overhead when tracing disabled
5. **Minimal Allocations** - Reuse span objects where possible

## Testing Utilities

```typescript
import { MemoryTracerAdapter, assertSpanExists } from "@hex-di/tracing/testing";

describe("MyService", () => {
  it("traces operations", async () => {
    const tracer = createMemoryTracer();

    await myService.doSomething();

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(1);
    assertSpanExists(spans, {
      name: "do-something",
      status: "ok",
      attributes: { "custom.attr": "value" },
    });
  });
});
```

## Migration from Existing Tracing

The new tracing package builds on existing `@hex-di/core` primitives:

| Existing         | New                                     |
| ---------------- | --------------------------------------- |
| `TraceCollector` | `SpanProcessor` (extends functionality) |
| `ResolutionSpan` | `SpanData` (superset with more fields)  |
| `TraceEntry`     | Preserved for backward compatibility    |
| `TracingAPI`     | `Tracer` (higher-level API)             |

## Dependencies

### @hex-di/tracing (core)

- `@hex-di/core` (peer)
- `@hex-di/runtime` (peer)
- No external dependencies

### @hex-di/tracing-otel

- `@hex-di/tracing` (peer)
- `@opentelemetry/api`
- `@opentelemetry/exporter-trace-otlp-http`

### @hex-di/tracing-jaeger

- `@hex-di/tracing` (peer)
- `jaeger-client`

### @hex-di/tracing-zipkin

- `@hex-di/tracing` (peer)
- `zipkin`

### @hex-di/tracing-datadog

- `@hex-di/tracing` (peer)
- `dd-trace`
