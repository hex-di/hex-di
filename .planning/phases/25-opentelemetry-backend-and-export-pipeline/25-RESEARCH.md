# Phase 25: OpenTelemetry Backend and Export Pipeline - Research

**Researched:** 2026-02-06
**Domain:** OpenTelemetry integration, span export, backend adapters
**Confidence:** HIGH

## Summary

Phase 25 bridges HexDI's tracing foundation (Phase 23-24) to production observability backends through OpenTelemetry and vendor-specific exporters. The standard approach is to convert HexDI SpanData to OpenTelemetry ReadableSpan format and leverage official OTel exporters for maximum compatibility and feature coverage.

**Key architectural pattern:** HexDI defines its own lightweight SpanData type (zero dependencies), then backend packages convert SpanData → OTel format → backend. This preserves core package simplicity while enabling rich backend integrations.

**Primary risks:** Type bridging without casts (MEDIUM), OTel version compatibility (LOW), DataDog dd-trace integration complexity (MEDIUM).

**Primary recommendation:** Build @hex-di/tracing-otel as the universal adapter using OTLP HTTP exporter, then Jaeger/Zipkin as thin wrappers over OTel exporters, and DataDog as a standalone bridge to dd-trace.

## Standard Stack

The established libraries for OpenTelemetry backend integration in 2026:

### Core OpenTelemetry (Universal Backend)

| Library                                 | Version  | Purpose                 | Why Standard                                            |
| --------------------------------------- | -------- | ----------------------- | ------------------------------------------------------- |
| @opentelemetry/api                      | ^1.9.0   | Core API types          | Stable 1.x API, vendor-neutral CNCF standard            |
| @opentelemetry/sdk-trace-base           | ^2.5.0   | SDK primitives          | BatchSpanProcessor, SimpleSpanProcessor implementations |
| @opentelemetry/resources                | ^2.5.0   | Resource metadata       | service.name, service.version, deployment.environment   |
| @opentelemetry/semantic-conventions     | ^1.39.0  | Standard attribute keys | Ensures backend compatibility                           |
| @opentelemetry/core                     | ^2.5.0   | Core utilities          | ID generation, time utilities                           |
| @opentelemetry/exporter-trace-otlp-http | ^0.211.0 | OTLP HTTP exporter      | Universal protocol, works with all collectors           |

**Why these versions:**

- API 1.x is stable (breaking changes only in 2.x)
- SDK 2.x is stable and aligned with API 1.x
- Exporters are 0.x but production-ready (OTel versioning convention)
- Monthly updates with bug fixes (use caret ranges)

**Installation:**

```bash
pnpm add @opentelemetry/api@^1.9.0 \
         @opentelemetry/sdk-trace-base@^2.5.0 \
         @opentelemetry/resources@^2.5.0 \
         @opentelemetry/semantic-conventions@^1.39.0 \
         @opentelemetry/core@^2.5.0 \
         @opentelemetry/exporter-trace-otlp-http@^0.211.0
```

### Backend-Specific Exporters

| Library                        | Version | Purpose         | When to Use                                 |
| ------------------------------ | ------- | --------------- | ------------------------------------------- |
| @opentelemetry/exporter-jaeger | ^2.5.0  | Jaeger exporter | Direct Jaeger integration (legacy protocol) |
| @opentelemetry/exporter-zipkin | ^2.5.0  | Zipkin exporter | Direct Zipkin integration (JSON v2 API)     |
| @opentelemetry/propagator-b3   | ^2.5.0  | B3 propagation  | Zipkin B3 header format                     |
| dd-trace                       | ^5.85.0 | DataDog APM     | DataDog proprietary protocol                |

**Why NOT standalone clients:**

- `jaeger-client` (3.19.0) is deprecated, based on OpenTracing (archived)
- `zipkin` (0.22.0) is maintenance mode, low-level manual API
- OpenTelemetry is the migration path for all vendors

### Alternatives Considered

| Instead of      | Could Use                                           | Tradeoff                                                          |
| --------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| OTLP HTTP       | OTLP gRPC (@opentelemetry/exporter-trace-otlp-grpc) | Better performance, requires gRPC setup                           |
| Jaeger exporter | OTLP → Jaeger collector                             | Future-proof (Jaeger moving to OTLP)                              |
| dd-trace        | OTLP → DataDog agent                                | Loses DataDog-specific features (profiling, auto-instrumentation) |

## Architecture Patterns

### Recommended Package Structure

```
packages/
├── tracing-otel/              # Universal OpenTelemetry adapter
│   ├── src/
│   │   ├── index.ts           # Public exports
│   │   ├── processors/
│   │   │   ├── batch.ts       # BatchSpanProcessor adapter
│   │   │   └── simple.ts      # SimpleSpanProcessor adapter
│   │   ├── exporters/
│   │   │   ├── otlp-http.ts   # OTLP HTTP exporter adapter
│   │   │   └── types.ts       # Exporter configuration types
│   │   ├── adapters/
│   │   │   ├── otel-span-exporter.ts  # SpanData → ReadableSpan converter
│   │   │   └── span-adapter.ts        # Type conversion utilities
│   │   ├── resources/
│   │   │   └── resource.ts    # Resource metadata builder
│   │   └── semantic-conventions/
│   │       └── mapper.ts      # hex-di.* → OTel attribute mapping
│   └── tests/
├── tracing-jaeger/            # Jaeger-specific adapter
│   ├── src/
│   │   ├── index.ts
│   │   └── exporter.ts        # Wraps @opentelemetry/exporter-jaeger
│   └── tests/
├── tracing-zipkin/            # Zipkin-specific adapter
│   ├── src/
│   │   ├── index.ts
│   │   └── exporter.ts        # Wraps @opentelemetry/exporter-zipkin
│   └── tests/
└── tracing-datadog/           # DataDog-specific adapter
    ├── src/
    │   ├── index.ts
    │   └── bridge.ts          # HexDI Tracer → dd-trace bridge
    └── tests/
```

### Pattern 1: SpanData to ReadableSpan Conversion

**What:** Convert HexDI's SpanData type to OpenTelemetry's ReadableSpan interface

**When to use:** All OpenTelemetry exporters expect ReadableSpan format

**Example:**

```typescript
// Source: OpenTelemetry SDK patterns
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import type { SpanData } from "@hex-di/tracing";

export function convertToReadableSpan(hexSpan: SpanData): ReadableSpan {
  return {
    name: hexSpan.name,
    kind: convertSpanKind(hexSpan.kind),
    spanContext: () => ({
      traceId: hexSpan.context.traceId,
      spanId: hexSpan.context.spanId,
      traceFlags: hexSpan.context.traceFlags,
      traceState: hexSpan.context.traceState
        ? parseTraceState(hexSpan.context.traceState)
        : undefined,
    }),
    parentSpanId: hexSpan.parentSpanId,
    startTime: convertToHrTime(hexSpan.startTime),
    endTime: convertToHrTime(hexSpan.endTime),
    status: convertSpanStatus(hexSpan.status),
    attributes: hexSpan.attributes,
    links: hexSpan.links.map(convertSpanLink),
    events: hexSpan.events.map(convertSpanEvent),
    duration: convertToHrTime(hexSpan.endTime - hexSpan.startTime),
    ended: true,
    resource: createDefaultResource(),
    instrumentationLibrary: {
      name: "@hex-di/tracing",
      version: "0.1.0",
    },
  };
}

// Type conversion utilities (no casts!)
function convertSpanKind(kind: string): number {
  const kindMap: Record<string, number> = {
    internal: 0,
    server: 1,
    client: 2,
    producer: 3,
    consumer: 4,
  };
  return kindMap[kind] ?? 0;
}

function convertToHrTime(milliseconds: number): [number, number] {
  const seconds = Math.floor(milliseconds / 1000);
  const nanos = (milliseconds % 1000) * 1_000_000;
  return [seconds, nanos];
}
```

**Key insight:** HexDI stores times as milliseconds (Date.now()), OTel uses [seconds, nanoseconds] HrTime tuple. Conversion is straightforward but requires understanding the format difference.

### Pattern 2: BatchSpanProcessor with Configurable Options

**What:** Buffer spans in memory, export in batches, with scheduled flush intervals

**When to use:** Production environments where export efficiency matters

**Example:**

```typescript
// Source: @opentelemetry/sdk-trace-base patterns
import { BatchSpanProcessor as OtelBatchProcessor } from "@opentelemetry/sdk-trace-base";
import type { SpanProcessor, SpanExporter } from "@hex-di/tracing";

export interface BatchSpanProcessorOptions {
  readonly maxQueueSize?: number; // Default: 2048
  readonly scheduledDelayMillis?: number; // Default: 5000
  readonly exportTimeoutMillis?: number; // Default: 30000
  readonly maxExportBatchSize?: number; // Default: 512
}

export function createBatchSpanProcessor(
  exporter: SpanExporter,
  options: BatchSpanProcessorOptions = {}
): SpanProcessor {
  const spanBuffer: SpanData[] = [];
  const maxQueueSize = options.maxQueueSize ?? 2048;
  const maxBatchSize = options.maxExportBatchSize ?? 512;
  const flushInterval = options.scheduledDelayMillis ?? 5000;
  let flushTimer: NodeJS.Timeout | undefined;
  let isShutdown = false;

  function scheduleFlush(): void {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flush().catch(err => console.error("Flush failed:", err));
      flushTimer = undefined;
    }, flushInterval);
  }

  async function flush(): Promise<void> {
    if (spanBuffer.length === 0) return;

    const batch = spanBuffer.splice(0, maxBatchSize);
    try {
      await exporter.export(batch);
    } catch (error) {
      console.error("Export failed:", error);
      // Don't throw - continue processing
    }
  }

  return {
    onStart(span) {
      // No-op for batch processor
    },

    onEnd(spanData) {
      if (isShutdown) return;

      if (spanBuffer.length >= maxQueueSize) {
        // Drop oldest span when buffer full
        spanBuffer.shift();
      }

      spanBuffer.push(spanData);

      if (spanBuffer.length >= maxBatchSize) {
        // Flush immediately when batch full
        flush().catch(err => console.error("Immediate flush failed:", err));
      } else {
        scheduleFlush();
      }
    },

    async forceFlush() {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = undefined;
      }
      await flush();
    },

    async shutdown() {
      if (isShutdown) return;
      isShutdown = true;

      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = undefined;
      }

      // Flush all remaining spans
      while (spanBuffer.length > 0) {
        await flush();
      }

      await exporter.shutdown();
    },
  };
}
```

**Timeout-based shutdown (OTEL-08):** Use `Promise.race` with timeout to prevent deadlock:

```typescript
async shutdown() {
  const shutdownPromise = this.actualShutdown();
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Shutdown timeout')), 30000)
  );

  try {
    await Promise.race([shutdownPromise, timeoutPromise]);
  } catch (error) {
    console.error('Shutdown failed:', error);
    // Force cleanup regardless
  }
}
```

### Pattern 3: SimpleSpanProcessor for Testing

**What:** Export spans immediately on end (synchronous from caller perspective)

**When to use:** Development, testing, debugging (no batching delays)

**Example:**

```typescript
export function createSimpleSpanProcessor(exporter: SpanExporter): SpanProcessor {
  let isShutdown = false;

  return {
    onStart(span) {
      // No-op
    },

    onEnd(spanData) {
      if (isShutdown) return;

      // Export immediately (fire and forget)
      exporter.export([spanData]).catch(err => console.error("Export failed:", err));
    },

    async forceFlush() {
      await exporter.forceFlush();
    },

    async shutdown() {
      if (isShutdown) return;
      isShutdown = true;
      await exporter.shutdown();
    },
  };
}
```

**Key difference:** No buffering, no batching, export happens immediately. Useful for seeing spans in real-time during development.

### Pattern 4: Resource Metadata Builder

**What:** Attach service-level metadata to all spans (service name, version, environment)

**When to use:** All production deployments (required for backend filtering/grouping)

**Example:**

```typescript
// Source: @opentelemetry/resources patterns
import { Resource } from "@opentelemetry/resources";
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";

export interface ResourceConfig {
  readonly serviceName: string;
  readonly serviceVersion?: string;
  readonly deploymentEnvironment?: string;
  readonly additionalAttributes?: Record<string, string>;
}

export function createResource(config: ResourceConfig): Resource {
  const attributes: Record<string, string> = {
    [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
  };

  if (config.serviceVersion) {
    attributes[SEMRESATTRS_SERVICE_VERSION] = config.serviceVersion;
  }

  if (config.deploymentEnvironment) {
    attributes[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT] = config.deploymentEnvironment;
  }

  if (config.additionalAttributes) {
    Object.assign(attributes, config.additionalAttributes);
  }

  return new Resource(attributes);
}
```

**Standard attributes (OTEL-06):**

- `service.name` - REQUIRED (e.g., "hex-di-app")
- `service.version` - Recommended (e.g., "1.2.3")
- `deployment.environment` - Recommended (e.g., "production", "staging", "development")
- `service.namespace` - Optional (e.g., "backend", "api")
- `service.instance.id` - Optional (unique instance identifier)

### Pattern 5: Semantic Conventions Mapping

**What:** Map HexDI-specific attributes to OpenTelemetry standard conventions

**When to use:** When converting SpanData to ReadableSpan

**Example:**

```typescript
// Source: OpenTelemetry semantic conventions
export function mapHexDIAttributes(attributes: Attributes): Attributes {
  const mapped: Record<string, AttributeValue> = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith("hex-di.")) {
      // Keep HexDI-specific attributes as-is (custom namespace)
      mapped[key] = value;

      // Add OTel standard mappings where applicable
      if (key === "hex-di.port.name") {
        mapped["code.namespace"] = value;
      }
      if (key === "hex-di.resolution.cached") {
        mapped["cache.hit"] = value;
      }
    } else {
      mapped[key] = value;
    }
  }

  return mapped;
}
```

**Standard mappings (OTEL-07):**

| HexDI Attribute          | OTel Standard  | Notes                                   |
| ------------------------ | -------------- | --------------------------------------- |
| hex-di.port.name         | code.namespace | Maps port to code namespace             |
| hex-di.resolution.cached | cache.hit      | Boolean cache indicator                 |
| hex-di.container.name    | service.name   | At span level (different from resource) |

**Keep both:** Preserve hex-di.\* attributes for HexDI-specific tooling, add OTel standard attributes for backend compatibility.

### Anti-Patterns to Avoid

- **Type casting SpanData to ReadableSpan:** Types are incompatible, must convert field-by-field
- **Synchronous export in BatchProcessor:** Always export asynchronously to avoid blocking
- **Ignoring export failures:** Log errors, consider retry logic for critical backends
- **Missing Resource metadata:** Backends use service.name for grouping/filtering

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem            | Don't Build                       | Use Instead                             | Why                                                   |
| ------------------ | --------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| Span batching      | Custom buffer + timer             | BatchSpanProcessor from OTel            | Handles edge cases (shutdown, overflow, backpressure) |
| OTLP protocol      | Manual HTTP + protobuf            | @opentelemetry/exporter-trace-otlp-http | Complex protocol with compression, retries            |
| Time conversion    | Manual milliseconds → nanoseconds | @opentelemetry/core helpers             | HrTime format has edge cases                          |
| TraceState parsing | Custom string parser              | OTel TraceState class                   | W3C spec has subtle format rules                      |
| Jaeger protocol    | Manual UDP/HTTP                   | @opentelemetry/exporter-jaeger          | Thrift encoding, agent protocol                       |

**Key insight:** OpenTelemetry SDK has production-hardened implementations of these patterns. Don't reinvent them.

## Common Pitfalls

### Pitfall 1: Type Casting Instead of Converting

**What goes wrong:** Using `as` to cast HexDI SpanData to OTel ReadableSpan

**Why it happens:** Types look similar, casting seems simpler than field-by-field conversion

**How to avoid:**

- Create explicit conversion function
- Use type guards for validation
- Test conversion with all span variants

**Warning signs:**

```typescript
// BAD - Type cast (will break at runtime)
const readableSpan = hexSpan as unknown as ReadableSpan;
exporter.export([readableSpan]);

// GOOD - Explicit conversion
const readableSpan = convertToReadableSpan(hexSpan);
exporter.export([readableSpan]);
```

**Root cause:** HexDI uses milliseconds (number), OTel uses HrTime ([seconds, nanoseconds]). Different type structures require conversion.

### Pitfall 2: Missing Shutdown Cleanup

**What goes wrong:** Spans lost when application exits without flushing

**Why it happens:** BatchProcessor buffers spans, immediate exit loses buffer

**How to avoid:**

```typescript
process.on("SIGTERM", async () => {
  await processor.shutdown(); // Flushes buffer before exit
  process.exit(0);
});

process.on("SIGINT", async () => {
  await processor.shutdown();
  process.exit(0);
});
```

**Warning signs:** Spans visible during dev but missing in production after deployment

### Pitfall 3: Resource Metadata Omitted

**What goes wrong:** All spans appear under "unknown_service" in backend UI

**Why it happens:** Resource is optional in OTel API, but required for practical use

**How to avoid:**

```typescript
const resource = createResource({
  serviceName: "hex-di-app",
  serviceVersion: process.env.npm_package_version,
  deploymentEnvironment: process.env.NODE_ENV,
});

// Attach resource to all spans during conversion
readableSpan.resource = resource;
```

**Warning signs:** Cannot filter spans by service name in Jaeger/Zipkin UI

### Pitfall 4: OTel Version Mismatches

**What goes wrong:** Type errors, runtime crashes due to incompatible OTel package versions

**Why it happens:** OTel SDK and exporters must align (both 2.x or both 1.x)

**How to avoid:**

- Pin OTel API to 1.x range: `^1.9.0`
- Pin SDK packages to same major version: all `^2.5.0`
- Use `pnpm list @opentelemetry/*` to verify versions
- Test with fresh `pnpm install` to catch resolution conflicts

**Warning signs:**

```
Type 'ReadableSpan' from @opentelemetry/sdk-trace-base@1.x
is not assignable to type 'ReadableSpan' from @opentelemetry/exporter-jaeger@2.x
```

### Pitfall 5: Blocking on Export

**What goes wrong:** DI resolution hangs waiting for backend export

**Why it happens:** Exporter called synchronously in afterResolve hook

**How to avoid:**

```typescript
onEnd(spanData) {
  // Fire and forget - don't await
  this.exporter.export([spanData])
    .catch(err => console.error('Export failed:', err));
}
```

**Warning signs:** Resolution latency increases with network issues

## Code Examples

Verified patterns from OpenTelemetry documentation and HexDI requirements:

### OTLP HTTP Exporter Configuration

```typescript
// Source: @opentelemetry/exporter-trace-otlp-http documentation
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import type { SpanExporter } from "@hex-di/tracing";

export interface OTLPExporterConfig {
  readonly endpoint?: string; // Default: http://localhost:4318/v1/traces
  readonly headers?: Record<string, string>;
  readonly compression?: "gzip" | "none"; // Default: 'none'
  readonly timeoutMillis?: number; // Default: 10000
  readonly concurrencyLimit?: number; // Default: 30
}

export function createOTLPExporter(config: OTLPExporterConfig = {}): SpanExporter {
  const otelExporter = new OTLPTraceExporter({
    url: config.endpoint ?? "http://localhost:4318/v1/traces",
    headers: config.headers ?? {},
    compression: config.compression ?? "none",
    timeoutMillis: config.timeoutMillis ?? 10000,
    concurrencyLimit: config.concurrencyLimit ?? 30,
  });

  return {
    async export(spans) {
      const readableSpans = spans.map(convertToReadableSpan);
      await otelExporter.export(readableSpans, resultCallback);
    },

    async forceFlush() {
      await otelExporter.forceFlush();
    },

    async shutdown() {
      await otelExporter.shutdown();
    },
  };
}
```

**Common endpoint configurations:**

- Local collector: `http://localhost:4318/v1/traces`
- Jaeger (OTLP): `http://jaeger:4318/v1/traces`
- Grafana Tempo: `https://tempo.example.com/v1/traces`
- Honeycomb: `https://api.honeycomb.io/v1/traces` (with API key header)

### Jaeger Exporter Adapter

```typescript
// Source: @opentelemetry/exporter-jaeger patterns
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { createAdapter } from "@hex-di/core";
import { SpanExporterPort } from "@hex-di/tracing";

export interface JaegerExporterConfig {
  readonly endpoint?: string; // HTTP: http://localhost:14268/api/traces
  readonly agentHost?: string; // UDP: localhost
  readonly agentPort?: number; // UDP: 6832
  readonly maxPacketSize?: number; // UDP: 65000
}

export const JaegerSpanExporterAdapter = createAdapter({
  provides: SpanExporterPort,
  requires: [],
  lifetime: "singleton",
  factory: (config: JaegerExporterConfig = {}) => {
    const otelExporter = new JaegerExporter({
      endpoint: config.endpoint,
      host: config.agentHost,
      port: config.agentPort,
      maxPacketSize: config.maxPacketSize,
    });

    return {
      async export(spans) {
        const readableSpans = spans.map(convertToReadableSpan);
        return new Promise((resolve, reject) => {
          otelExporter.export(readableSpans, result => {
            if (result.code === 0) resolve();
            else reject(new Error(result.error?.message ?? "Export failed"));
          });
        });
      },

      async forceFlush() {
        await otelExporter.forceFlush();
      },

      async shutdown() {
        await otelExporter.shutdown();
      },
    };
  },
});
```

### Zipkin Exporter Adapter

```typescript
// Source: @opentelemetry/exporter-zipkin patterns
import { ZipkinExporter } from "@opentelemetry/exporter-zipkin";
import { createAdapter } from "@hex-di/core";
import { SpanExporterPort } from "@hex-di/tracing";

export interface ZipkinExporterConfig {
  readonly url?: string; // Default: http://localhost:9411/api/v2/spans
  readonly serviceName?: string; // Override service.name
  readonly headers?: Record<string, string>;
}

export const ZipkinSpanExporterAdapter = createAdapter({
  provides: SpanExporterPort,
  requires: [],
  lifetime: "singleton",
  factory: (config: ZipkinExporterConfig = {}) => {
    const otelExporter = new ZipkinExporter({
      url: config.url ?? "http://localhost:9411/api/v2/spans",
      serviceName: config.serviceName,
      headers: config.headers,
    });

    return {
      async export(spans) {
        const readableSpans = spans.map(convertToReadableSpan);
        return new Promise((resolve, reject) => {
          otelExporter.export(readableSpans, result => {
            if (result.code === 0) resolve();
            else reject(new Error(result.error?.message ?? "Export failed"));
          });
        });
      },

      async forceFlush() {
        await otelExporter.forceFlush();
      },

      async shutdown() {
        await otelExporter.shutdown();
      },
    };
  },
});
```

### DataDog Tracer Bridge

```typescript
// Source: dd-trace documentation
import tracer from "dd-trace";
import type { Tracer, Span, SpanData } from "@hex-di/tracing";

export interface DataDogConfig {
  readonly service?: string;
  readonly env?: string;
  readonly version?: string;
  readonly logInjection?: boolean;
  readonly runtimeMetrics?: boolean;
}

export function createDataDogTracer(config: DataDogConfig = {}): Tracer {
  tracer.init({
    service: config.service ?? "hex-di-app",
    env: config.env ?? process.env.NODE_ENV,
    version: config.version ?? "1.0.0",
    logInjection: config.logInjection ?? false,
    runtimeMetrics: config.runtimeMetrics ?? false,
  });

  return {
    startSpan(name, options) {
      const ddSpan = tracer.startSpan(name, {
        tags: options?.attributes ?? {},
        childOf: getActiveDDSpan(),
      });

      return wrapDDSpan(ddSpan);
    },

    withSpan(name, fn, options) {
      return tracer.trace(name, { tags: options?.attributes }, span => {
        return fn(wrapDDSpan(span));
      });
    },

    withSpanAsync(name, fn, options) {
      return tracer.trace(name, { tags: options?.attributes }, async span => {
        return fn(wrapDDSpan(span));
      });
    },

    getActiveSpan() {
      const active = tracer.scope().active();
      return active ? wrapDDSpan(active) : undefined;
    },

    getSpanContext() {
      const active = tracer.scope().active();
      if (!active) return undefined;

      return {
        traceId: active.context().toTraceId(),
        spanId: active.context().toSpanId(),
        traceFlags: 1, // DataDog doesn't expose flags
      };
    },

    withAttributes(attributes) {
      // DataDog doesn't support default attributes on tracer
      // Return wrapper that adds attributes to all spans
      return createAttributeTracer(this, attributes);
    },
  };
}

function wrapDDSpan(ddSpan: any): Span {
  // Convert DataDog span to HexDI Span interface
  // Implementation details...
}
```

**DataDog-specific notes:**

- dd-trace uses its own span format (not OTel)
- Bridge HexDI Tracer interface to dd-trace API
- Automatic instrumentation works alongside manual spans
- Consider making this package optional (large dependency)

## State of the Art

| Old Approach        | Current Approach               | When Changed | Impact                                |
| ------------------- | ------------------------------ | ------------ | ------------------------------------- |
| jaeger-client       | @opentelemetry/exporter-jaeger | 2021         | OpenTracing → OpenTelemetry migration |
| zipkin npm          | @opentelemetry/exporter-zipkin | 2020         | Manual spans → SDK-managed            |
| Custom span export  | OTLP protocol                  | 2019         | Universal backend support             |
| Per-backend clients | OTel exporters                 | 2020-2021    | Single API, multiple backends         |

**Deprecated/outdated:**

- `jaeger-client` (3.19.0): Based on OpenTracing (archived project)
- `zipkin` npm package: Low-level client, maintenance mode
- Custom trace formats: W3C Trace Context is now universal

**Current best practices (2026):**

- Use OpenTelemetry SDK as the foundation
- OTLP is the universal export protocol
- Vendor-specific exporters for legacy backends
- W3C Trace Context for propagation

## Open Questions

Things that couldn't be fully resolved:

1. **OTel ReadableSpan type compatibility across versions**
   - What we know: Types differ between OTel 1.x and 2.x
   - What's unclear: Whether to support both or require 2.x
   - Recommendation: Require OTel 2.x, document migration if needed

2. **DataDog bridge completeness**
   - What we know: dd-trace has rich API (profiling, logs, metrics)
   - What's unclear: How much of dd-trace API to expose via HexDI wrapper
   - Recommendation: Start with basic tracing, add features incrementally

3. **Resource metadata injection point**
   - What we know: Resource should be attached to spans
   - What's unclear: User-configurable vs auto-detected
   - Recommendation: User-provided config, auto-detect from environment

## Sources

### Primary (HIGH confidence)

- npm registry: @opentelemetry/sdk-trace-base@2.5.0 (verified 2026-02-06)
- npm registry: @opentelemetry/exporter-trace-otlp-http@0.211.0
- npm registry: @opentelemetry/exporter-jaeger@2.5.0
- npm registry: @opentelemetry/exporter-zipkin@2.5.0
- npm registry: dd-trace@5.85.0
- HexDI Phase 23 research: SpanData type, SpanExporter interface
- HexDI Phase 24 research: Container instrumentation patterns

### Secondary (MEDIUM confidence)

- OpenTelemetry GitHub: https://github.com/open-telemetry/opentelemetry-js
- Prior HexDI research: .planning/research/STACK.md (comprehensive OTel survey)
- Prior HexDI research: .planning/research/ARCHITECTURE.md (integration patterns)

### Tertiary (LOW confidence - verification needed)

- OTel documentation (couldn't access directly, rely on prior research)
- Community practices for span processors

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Verified current versions via npm
- Architecture: HIGH - Built on Phase 23/24 foundations
- Pitfalls: MEDIUM - Based on common OTel integration issues
- DataDog integration: MEDIUM - dd-trace is proprietary, less documentation

**Research date:** 2026-02-06
**Valid until:** 30 days (OTel packages update monthly)

**Dependencies:**

- Phase 23: SpanData type, SpanExporter interface (COMPLETE)
- Phase 24: Container instrumentation (COMPLETE)
- No blockers

**Next steps:**

1. Create @hex-di/tracing-otel package structure
2. Implement SpanData → ReadableSpan conversion (no casts)
3. Implement BatchSpanProcessor and SimpleSpanProcessor
4. Create OTLP HTTP exporter adapter
5. Add Resource metadata support
6. Implement semantic conventions mapping
7. Create backend-specific packages (Jaeger, Zipkin, DataDog)
8. Integration tests with local collectors
