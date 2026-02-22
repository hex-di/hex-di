# HexDi Observability Packages Specification

## Overview

This specification covers two new observability packages for HexDi:

1. **@hex-di/tracing** - Distributed tracing with span-based instrumentation
2. **@hex-di/logging** - Structured logging with context propagation

Both packages are designed to work together seamlessly while remaining independently usable.

## Package Overview

| Package                   | Purpose                                       | Backends               |
| ------------------------- | --------------------------------------------- | ---------------------- |
| `@hex-di/tracing`         | Core tracing types, adapters, instrumentation | NoOp, Memory, Console  |
| `@hex-di/tracing-otel`    | OpenTelemetry exporter                        | OTLP                   |
| `@hex-di/tracing-jaeger`  | Jaeger exporter                               | Jaeger Agent/Collector |
| `@hex-di/tracing-zipkin`  | Zipkin exporter                               | Zipkin API             |
| `@hex-di/tracing-datadog` | DataDog exporter                              | DD Agent               |
| `@hex-di/logging`         | Core logging types, adapters, instrumentation | NoOp, Memory, Console  |
| `@hex-di/logging-pino`    | Pino adapter                                  | Pino                   |
| `@hex-di/logging-winston` | Winston adapter                               | Winston                |
| `@hex-di/logging-bunyan`  | Bunyan adapter                                | Bunyan                 |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Code                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Framework Integration                        │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │ @hex-di/hono        │    │ @hex-di/react       │        │
│  │ - tracingMiddleware │    │ - TracingProvider   │        │
│  │ - loggingMiddleware │    │ - LoggingProvider   │        │
│  └─────────────────────┘    └─────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Observability Layer                       │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │ @hex-di/tracing     │◄──►│ @hex-di/logging     │        │
│  │ - TracerPort        │    │ - LoggerPort        │        │
│  │ - SpanExporterPort  │    │ - LogHandlerPort    │        │
│  │ - Auto-instrument   │    │ - Auto-instrument   │        │
│  └─────────────────────┘    └─────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Adapters                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ OTEL     │ │ Jaeger   │ │ Pino     │ │ Winston  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    @hex-di/core                              │
│  - TraceCollector, ResolutionSpan (existing)                │
│  - ContextVariable (existing)                                │
│  - Port, Adapter (existing)                                  │
└─────────────────────────────────────────────────────────────┘
```

## Integration Between Tracing and Logging

When both packages are used together, they automatically correlate:

```typescript
import { TracerPort, instrumentContainer as instrumentTracing } from "@hex-di/tracing";
import { LoggerPort, instrumentContainer as instrumentLogging } from "@hex-di/logging";

const container = createContainer(graph);
const tracer = container.resolve(TracerPort);
const logger = container.resolve(LoggerPort);

// Both instrument the same container
instrumentTracing(container, tracer);
instrumentLogging(container, logger);

// When tracing is active, logs include trace context
tracer.withSpan("handle-request", span => {
  logger.info("Processing request");
  // Log output: { traceId: "abc", spanId: "123", message: "Processing request" }
});
```

## Context Variable Integration

Both packages use HexDi's `ContextVariable` system for propagation:

```typescript
// From @hex-di/tracing
export const TraceContextVar = createContextVariable<SpanContext | undefined>(
  "hex-di/trace-context"
);

// From @hex-di/logging
export const LogContextVar = createContextVariable<LogContext>("hex-di/log-context");

// Shared
export const CorrelationIdVar = createContextVariable<string | undefined>("hex-di/correlation-id");
```

## Instrumentation Modes

### Mode 1: Manual Only

```typescript
// Tracing
const tracer = container.resolve(TracerPort);
tracer.withSpan("my-operation", span => {
  // ...
});

// Logging
const logger = container.resolve(LoggerPort);
logger.info("Something happened");
```

### Mode 2: Automatic DI Instrumentation

```typescript
// Automatically trace and log all DI resolutions
instrumentTracing(container, tracer, { traceSyncResolutions: true });
instrumentLogging(container, logger, { resolutionLevel: "debug" });

// Now every container.resolve() is traced and logged
const service = container.resolve(ServicePort);
// ^ Span: "resolve ServicePort"
// ^ Log: "Resolved ServicePort" { lifetime: "singleton", duration: 5 }
```

### Mode 3: Combined

```typescript
// Automatic for DI, manual for business logic
instrumentTracing(container, tracer);
instrumentLogging(container, logger);

// Plus manual instrumentation
async function handleOrder(orderId: string) {
  return tracer.withSpanAsync("handle-order", async span => {
    span.setAttribute("order.id", orderId);
    logger.info("Processing order", { orderId });

    const order = await orderService.getOrder(orderId);
    // ^ Automatic span: "resolve OrderService"

    logger.info("Order retrieved", { status: order.status });
    return order;
  });
}
```

## Detailed Specifications

- [SPEC-TRACING.md](./SPEC-TRACING.md) - Full tracing package specification
- [SPEC-LOGGING.md](./SPEC-LOGGING.md) - Full logging package specification

## Implementation Order

Since both packages are designed together, implementation can proceed in parallel:

### Phase 1: Core Types (Both Packages)

1. Define port interfaces (TracerPort, LoggerPort, etc.)
2. Define entry types (SpanData, LogEntry)
3. Create context variables

### Phase 2: NoOp and Memory Adapters (Both Packages)

1. Implement zero-cost NoOp adapters
2. Implement Memory adapters for testing
3. Add testing utilities

### Phase 3: Console Adapters (Both Packages)

1. Implement Console adapters for development
2. Add pretty-printing and colorization

### Phase 4: Auto-Instrumentation (Both Packages)

1. Implement resolution hooks
2. Create `instrumentContainer` functions
3. Add filtering and configuration options

### Phase 5: Framework Integration

1. Hono middleware (tracing and logging)
2. React providers and hooks
3. Context extraction/injection

### Phase 6: Backend Packages

1. @hex-di/tracing-otel
2. @hex-di/logging-pino
3. Other backends as needed

## Design Principles

1. **Zero Dependencies in Core** - Core packages have no npm dependencies
2. **Backend Separation** - Each backend is a separate package
3. **Type Safety** - Full TypeScript inference, no `any`
4. **Pluggable Architecture** - Strategy pattern for extensibility
5. **Context Propagation** - Use existing ContextVariable system
6. **Minimal Overhead** - Fast paths when disabled
7. **Effect-TS Inspired** - Familiar API patterns
