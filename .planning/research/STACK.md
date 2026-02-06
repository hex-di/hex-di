# Technology Stack for Distributed Tracing

**Project:** HexDI v7.0 Distributed Tracing
**Researched:** 2026-02-06
**Context:** NEW @hex-di/tracing package system replacing existing TraceCollector infrastructure
**Overall confidence:** HIGH

---

## Executive Summary

OpenTelemetry is the universal standard for distributed tracing in 2026. **All backends (Jaeger, Zipkin, DataDog) should be accessed through OpenTelemetry exporters** rather than standalone clients. The standalone clients (jaeger-client, zipkin) are deprecated or in maintenance mode. OpenTelemetry provides official exporters for all major backends, W3C Trace Context propagation built-in, and semantic conventions that align with industry standards.

**Key architectural decision:** HexDI will define its own `Tracer` and `Span` port interfaces (matching OpenTelemetry semantics) to maintain adapter independence. Backend packages will bridge HexDI spans to OpenTelemetry exporters.

---

## Recommended Stack

### 1. Core Tracing Package (@hex-di/tracing)

**No external dependencies** for core functionality. Implements ports and built-in adapters.

| Component         | Dependencies | Purpose                             |
| ----------------- | ------------ | ----------------------------------- |
| Tracer/Span ports | None         | Port definitions, zero dependencies |
| NoOp adapter      | None         | Zero-cost disabled tracing          |
| Memory adapter    | None         | Testing and assertions              |
| Console adapter   | None         | Development debugging               |
| W3C Trace Context | None         | Manual implementation (simple spec) |

**Why no dependencies:** Core tracing must have zero runtime overhead when disabled. Pulling in any dependencies would add weight even for NoOp usage.

**W3C Trace Context implementation:** The spec is simple enough (traceparent: `00-{trace-id}-{span-id}-{flags}`, tracestate: vendor-specific) that manual implementation is preferred over adding a dependency. Reference: https://www.w3.org/TR/trace-context/

**Version:** 0.1.0 (initial release)

---

### 2. OpenTelemetry Backend (@hex-di/tracing-otel)

**The universal backend adapter.** All other backends should be implemented as OpenTelemetry exporters.

| Package                                   | Version  | Purpose                 | Why                                             |
| ----------------------------------------- | -------- | ----------------------- | ----------------------------------------------- |
| `@opentelemetry/api`                      | ^1.9.0   | Core API types          | Industry standard, stable API (1.x)             |
| `@opentelemetry/sdk-trace-base`           | ^2.5.0   | Trace SDK primitives    | Span processors, context management             |
| `@opentelemetry/sdk-trace-node`           | ^2.5.0   | Node.js SDK             | Async context propagation via AsyncLocalStorage |
| `@opentelemetry/sdk-trace-web`            | ^2.5.0   | Browser SDK             | For React integration (optional peer dep)       |
| `@opentelemetry/exporter-trace-otlp-http` | ^0.211.0 | OTLP HTTP exporter      | Universal exporter for OTLP collectors          |
| `@opentelemetry/exporter-trace-otlp-grpc` | ^0.211.0 | OTLP gRPC exporter      | Optional, higher performance than HTTP          |
| `@opentelemetry/resources`                | ^2.5.0   | Resource metadata       | Service name, version, environment attributes   |
| `@opentelemetry/semantic-conventions`     | ^1.39.0  | Standard attribute keys | Ensures compatibility with industry conventions |
| `@opentelemetry/core`                     | ^2.5.0   | Core utilities          | ID generation, time utilities, propagation      |
| `@opentelemetry/context-async-hooks`      | ^2.5.0   | Node.js context         | AsyncLocalStorage-based context propagation     |

**Why OpenTelemetry:**

- **Industry standard:** Vendor-neutral, CNCF project, adopted by all major observability vendors
- **Future-proof:** All legacy clients (Jaeger, Zipkin standalone) are migrating to OpenTelemetry
- **Complete API:** Tracing, metrics, logs in one SDK
- **W3C Trace Context built-in:** No manual header parsing needed
- **Semantic conventions:** Standard attribute names for common operations

**Version strategy:**

- `@opentelemetry/api` is at 1.x (stable, semver)
- SDK packages are at 2.x (stable, aligned with API 1.x)
- Exporter packages are at 0.x but stable (version <1.0 doesn't mean unstable for OTel)

**Peer dependencies:**

```json
{
  "peerDependencies": {
    "@hex-di/tracing": "workspace:*"
  }
}
```

**Installation:**

```bash
pnpm add @opentelemetry/api@^1.9.0 \
         @opentelemetry/sdk-trace-base@^2.5.0 \
         @opentelemetry/sdk-trace-node@^2.5.0 \
         @opentelemetry/exporter-trace-otlp-http@^0.211.0 \
         @opentelemetry/resources@^2.5.0 \
         @opentelemetry/semantic-conventions@^1.39.0 \
         @opentelemetry/core@^2.5.0 \
         @opentelemetry/context-async-hooks@^2.5.0
```

**Integration pattern:**

```typescript
// Bridge HexDI spans to OpenTelemetry
import { trace } from "@opentelemetry/api";
import type { Tracer as HexDITracer, Span as HexDISpan } from "@hex-di/tracing";

export function createOtelTracer(otelTracer: OTelTracer): HexDITracer {
  // Wrap OTel tracer to implement HexDI Tracer port
  // Convert HexDI span operations to OTel span operations
}
```

---

### 3. Jaeger Backend (@hex-di/tracing-jaeger)

**Built on OpenTelemetry, NOT standalone jaeger-client.**

| Package                            | Version | Purpose            | Why                                        |
| ---------------------------------- | ------- | ------------------ | ------------------------------------------ |
| `@opentelemetry/exporter-jaeger`   | ^2.5.0  | Jaeger exporter    | Official OpenTelemetry exporter for Jaeger |
| `@opentelemetry/propagator-jaeger` | ^2.5.0  | Jaeger propagation | Legacy Uber-trace-id header format         |

**Why NOT jaeger-client (3.19.0):**

- **Deprecated:** jaeger-client is based on OpenTracing (predecessor to OpenTelemetry)
- **Maintenance mode:** No new features, OpenTelemetry is the migration path
- **OpenTracing is archived:** OpenTelemetry superseded it in 2021

**Why @opentelemetry/exporter-jaeger:**

- **Official integration:** Maintained by OpenTelemetry project
- **Modern protocol:** Uses Jaeger's native protocol (UDP/HTTP)
- **Future-proof:** When Jaeger fully migrates to OTLP, switching exporters is trivial

**Installation:**

```bash
pnpm add @opentelemetry/exporter-jaeger@^2.5.0 \
         @opentelemetry/propagator-jaeger@^2.5.0
```

**Configuration options:**

```typescript
export interface JaegerExporterOptions {
  readonly endpoint?: string; // HTTP endpoint (default: http://localhost:14268/api/traces)
  readonly agentHost?: string; // Agent host for UDP (default: localhost)
  readonly agentPort?: number; // Agent port for UDP (default: 6832)
  readonly maxPacketSize?: number; // UDP packet size (default: 65000)
}
```

**Note:** Jaeger is moving toward OTLP as its native protocol. By 2027, the recommendation will likely be to use OTLP exporter with Jaeger's OTLP endpoint instead of the Jaeger-specific exporter.

---

### 4. Zipkin Backend (@hex-di/tracing-zipkin)

**Built on OpenTelemetry, NOT standalone zipkin client.**

| Package                          | Version | Purpose         | Why                                        |
| -------------------------------- | ------- | --------------- | ------------------------------------------ |
| `@opentelemetry/exporter-zipkin` | ^2.5.0  | Zipkin exporter | Official OpenTelemetry exporter for Zipkin |
| `@opentelemetry/propagator-b3`   | ^2.5.0  | B3 propagation  | Zipkin's B3 header format (single/multi)   |

**Why NOT zipkin (0.22.0):**

- **Maintenance mode:** zipkin npm package is a low-level client, not actively developed
- **Manual span management:** Requires manual span tree building
- **No modern context propagation:** Doesn't integrate with AsyncLocalStorage

**Why @opentelemetry/exporter-zipkin:**

- **Official integration:** Maintained by OpenTelemetry project
- **B3 propagation built-in:** Handles both B3 single header and multi-header formats
- **JSON v2 protocol:** Uses Zipkin's current API format

**Installation:**

```bash
pnpm add @opentelemetry/exporter-zipkin@^2.5.0 \
         @opentelemetry/propagator-b3@^2.5.0
```

**Configuration options:**

```typescript
export interface ZipkinExporterOptions {
  readonly url?: string; // Zipkin endpoint (default: http://localhost:9411/api/v2/spans)
  readonly headers?: Record<string, string>;
  readonly serviceName?: string; // Override service name
}
```

**B3 propagation formats:**

- Single header: `b3: {trace-id}-{span-id}-{sampling-decision}`
- Multi-header: `X-B3-TraceId`, `X-B3-SpanId`, `X-B3-Sampled`

---

### 5. DataDog Backend (@hex-di/tracing-datadog)

**DataDog APM has its own proprietary client.** Use dd-trace for best integration.

| Package    | Version | Purpose     | Why                              |
| ---------- | ------- | ----------- | -------------------------------- |
| `dd-trace` | ^5.85.0 | DataDog APM | Official DataDog tracing library |

**Why dd-trace over OpenTelemetry:**

- **Proprietary protocol:** DataDog APM uses its own agent protocol, not OTLP (yet)
- **Better integration:** dd-trace includes automatic instrumentation for Node.js libraries
- **Native features:** Profiling, runtime metrics, log correlation built-in
- **Agent optimization:** Designed for DataDog's agent architecture

**Why NOT OpenTelemetry for DataDog:**

- DataDog supports OTLP ingestion, but dd-trace provides richer features
- If using DataDog, go all-in with dd-trace for best experience
- OpenTelemetry → DataDog is viable but loses some DataDog-specific features

**Installation:**

```bash
pnpm add dd-trace@^5.85.0
```

**Configuration pattern:**

```typescript
import tracer from "dd-trace";

// Initialize DataDog tracer
tracer.init({
  service: "hex-di-app",
  env: "production",
  version: "1.0.0",
  logInjection: true,
  runtimeMetrics: true,
});

// Bridge to HexDI tracing
export const DataDogTracerAdapter = createAdapter({
  port: TracerPort,
  factory: () => createDataDogTracer(tracer),
  lifetime: "singleton",
});
```

**DataDog-specific features:**

- **Automatic instrumentation:** Patches popular libraries (express, fetch, pg, redis) automatically
- **APM metrics:** Request rate, latency, error tracking
- **Profiling:** CPU and heap profiling (optional)
- **Log correlation:** Inject trace IDs into logs

**Trade-off:** dd-trace is a heavy dependency (~15MB) with native addons. Consider making it an optional integration.

---

## W3C Trace Context Specification

**Specification version:** 1.0 (W3C Recommendation, February 2020)
**URL:** https://www.w3.org/TR/trace-context/

### traceparent Header Format

```
traceparent: 00-{trace-id}-{parent-id}-{trace-flags}
```

**Field definitions:**

- `version` (2 chars): `00` (current version)
- `trace-id` (32 chars): 128-bit trace ID in hex (16 bytes)
- `parent-id` (16 chars): 64-bit parent span ID in hex (8 bytes)
- `trace-flags` (2 chars): 8-bit flags (01 = sampled, 00 = not sampled)

**Example:**

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

**Parsing rules:**

1. Must be exactly 55 characters
2. Fields separated by hyphens
3. trace-id must NOT be all zeros
4. parent-id must NOT be all zeros
5. Unknown version values → reject and ignore
6. Invalid format → reject and ignore

### tracestate Header Format

```
tracestate: vendor1=value1,vendor2=value2
```

**Purpose:** Vendor-specific trace state (e.g., sampling decisions, routing info)

**Rules:**

- Multiple vendors separated by commas
- Key format: `[a-z0-9_\-*/]{1,256}`
- Value format: `[!-~]{0,256}` (printable ASCII except comma, equals)
- Maximum 32 vendors
- Total header size should not exceed ~512 bytes

**Example:**

```
tracestate: congo=t61rcWkgMzE,rojo=00f067aa0ba902b7
```

**HexDI usage:**

- **traceparent:** Required for cross-container trace propagation
- **tracestate:** Optional, can store HexDI-specific metadata (container ID, scope ID)

### Propagation Rules

1. **Extract from incoming request:**
   - Read `traceparent` header
   - Read `tracestate` header (if present)
   - Validate format
   - Use as parent context for new spans

2. **Inject into outgoing request:**
   - Write current span's context as `traceparent`
   - Write `tracestate` with vendor-specific data
   - Preserve existing tracestate entries from other vendors

3. **Create new trace:**
   - If no `traceparent` header present
   - Or if `root: true` option specified
   - Generate new trace-id and parent-id

**Implementation in @hex-di/tracing:**

```typescript
// context/trace-context.ts
export function parseTraceparent(header: string): SpanContext | undefined {
  // Validate format: 00-{32hex}-{16hex}-{2hex}
  // Return undefined if invalid (don't throw)
}

export function serializeTraceparent(context: SpanContext): string {
  return `00-${context.traceId}-${context.spanId}-${formatFlags(context.traceFlags)}`;
}

export function parseTracestate(header: string): Record<string, string> {
  // Parse comma-separated vendor=value pairs
}

export function serializeTracestate(state: Record<string, string>): string {
  // Serialize to comma-separated format
}
```

---

## How Other TypeScript DI Frameworks Handle Tracing

### Effect-TS (3.19.x)

**Built-in tracing with spans:**

Effect-TS has first-class tracing support with `Effect.withSpan()` and tracer propagation through Effect context.

```typescript
import { Effect } from "effect";

// Spans are Effect-native
const program = Effect.gen(function* () {
  yield* Effect.log("Starting process");
  const result = yield* Effect.withSpan("fetch-user", { attributes: { userId } })(
    fetchUser(userId)
  );
  return result;
});
```

**Key patterns:**

- **Tracer as Effect layer:** Tracer is injected via Effect's layer system
- **Automatic span hierarchy:** Child effects inherit parent span context
- **Structured concurrency:** Spans match Effect's fiber hierarchy
- **OpenTelemetry backend:** Effect has `@effect/opentelemetry` package

**Lesson for HexDI:**

- Tracing should integrate with DI resolution context (child spans for nested resolutions)
- Tracer should be injected via port, not global singleton
- Span context should propagate through AsyncLocalStorage (context variables)

**Reference:** `@effect/opentelemetry` package

---

### InversifyJS (7.11.0)

**No built-in tracing support.**

InversifyJS has middleware hooks but no tracing abstraction.

```typescript
import { Container } from "inversify";

// Manual tracing via middleware
container.applyMiddleware(planAndResolve => {
  return args => {
    const start = performance.now();
    const result = planAndResolve(args);
    const duration = performance.now() - start;
    console.log(`Resolved ${args.serviceIdentifier} in ${duration}ms`);
    return result;
  };
});
```

**Limitations:**

- No span tree structure
- No distributed tracing support
- Manual integration with OpenTelemetry required

**Lesson for HexDI:**

- Resolution hooks are the right abstraction for tracing (HexDI already has this)
- But hooks alone aren't enough – need structured span API

---

### TSyringe (4.10.0)

**No built-in tracing support.**

TSyringe is decorator-based and has no hook system at all.

**Lesson for HexDI:**

- Decorator-based DI makes instrumentation harder
- Function-based builder pattern (HexDI's approach) is better for tracing

---

### NestJS (@nestjs/core 11.x)

**Built-in OpenTelemetry integration.**

NestJS has first-party OpenTelemetry support via `@nestjs/opentelemetry`.

```typescript
import { OpenTelemetryModule } from "@nestjs/opentelemetry";

@Module({
  imports: [
    OpenTelemetryModule.forRoot({
      tracing: {
        exporter: new JaegerExporter({
          /* ... */
        }),
      },
    }),
  ],
})
export class AppModule {}
```

**Key patterns:**

- **Automatic instrumentation:** Controllers, providers, and guards are auto-traced
- **Span attributes:** HTTP route, method, status code added automatically
- **Context propagation:** Request-scoped trace context

**Lesson for HexDI:**

- Automatic instrumentation via resolution hooks is the right approach
- Framework integrations (Hono, React) should provide tracing middleware/providers
- Span attributes should include DI-specific metadata (port name, lifetime, cached)

**Reference:** `@nestjs/opentelemetry` package

---

### Spring Boot (Java DI, for comparison)

**Micrometer + OpenTelemetry integration.**

Spring Boot uses Micrometer as a tracing facade with OpenTelemetry backend.

**Key patterns:**

- **Aspect-based instrumentation:** @Traced annotation on beans
- **Baggage propagation:** Key-value pairs propagated with trace context
- **Multi-backend support:** Swap backends without changing code

**Lesson for HexDI:**

- Baggage propagation is useful for correlation IDs, user IDs
- Backends should be swappable via adapter pattern (HexDI already does this)

---

## OpenTelemetry Span/Tracer Interface

**From @opentelemetry/api (1.9.0):**

### Tracer Interface

```typescript
interface Tracer {
  /**
   * Start a new span
   */
  startSpan(name: string, options?: SpanOptions, context?: Context): Span;

  /**
   * Start span and set as active for duration of fn
   */
  startActiveSpan<F extends (span: Span) => unknown>(name: string, fn: F): ReturnType<F>;

  startActiveSpan<F extends (span: Span) => unknown>(
    name: string,
    options: SpanOptions,
    fn: F
  ): ReturnType<F>;

  startActiveSpan<F extends (span: Span) => unknown>(
    name: string,
    options: SpanOptions,
    context: Context,
    fn: F
  ): ReturnType<F>;
}
```

### Span Interface

```typescript
interface Span {
  /**
   * Returns the SpanContext for this span
   */
  spanContext(): SpanContext;

  /**
   * Sets an attribute on the span
   */
  setAttribute(key: string, value: AttributeValue): this;

  /**
   * Sets attributes on the span
   */
  setAttributes(attributes: Attributes): this;

  /**
   * Adds an event to the span
   */
  addEvent(
    name: string,
    attributesOrStartTime?: Attributes | TimeInput,
    startTime?: TimeInput
  ): this;

  /**
   * Sets the status of the span
   */
  setStatus(status: SpanStatus): this;

  /**
   * Updates the span name
   */
  updateName(name: string): this;

  /**
   * Marks the end of the span
   */
  end(endTime?: TimeInput): void;

  /**
   * Returns true if this span is recording
   */
  isRecording(): boolean;

  /**
   * Records an exception
   */
  recordException(exception: Exception, time?: TimeInput): void;
}
```

### SpanContext Interface

```typescript
interface SpanContext {
  /**
   * Trace ID (128-bit)
   */
  traceId: string;

  /**
   * Span ID (64-bit)
   */
  spanId: string;

  /**
   * Trace flags (8-bit)
   */
  traceFlags: number;

  /**
   * Trace state
   */
  traceState?: TraceState;

  /**
   * Whether this span is remote (from another process)
   */
  isRemote?: boolean;
}
```

### HexDI Adaptation

**HexDI's Tracer port should match OpenTelemetry semantics but with simplified API:**

```typescript
// Differences from OpenTelemetry:
// 1. No Context parameter (use AsyncLocalStorage via context variables)
// 2. Simplified startSpan (no complex overloads)
// 3. withSpan/withSpanAsync instead of startActiveSpan (clearer naming)
// 4. No updateName (span name should be immutable)

interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
  withSpan<T>(name: string, fn: (span: Span) => T, options?: SpanOptions): T;
  withSpanAsync<T>(name: string, fn: (span: Span) => Promise<T>, options?: SpanOptions): Promise<T>;
  getActiveSpan(): Span | undefined;
  getSpanContext(): SpanContext | undefined;
  withAttributes(attributes: Attributes): Tracer;
}
```

**Why simplified:**

- HexDI users shouldn't need to understand OpenTelemetry's Context API
- AsyncLocalStorage (via context variables) handles context propagation automatically
- Fluent API (withSpan) is more ergonomic than start/end pattern

---

## Integration Points with Existing Stack

### 1. Context Variables (AsyncLocalStorage)

**Existing:** HexDI has `createContextVariable()` in `@hex-di/core`.

**Integration:**

```typescript
import { createContextVariable } from "@hex-di/core";

export const ActiveSpanVar = createContextVariable<Span | undefined>(
  "hex-di/active-span",
  undefined
);

export const TraceContextVar = createContextVariable<SpanContext | undefined>(
  "hex-di/trace-context",
  undefined
);
```

**Usage in tracer:**

```typescript
withSpan<T>(name: string, fn: (span: Span) => T): T {
  const span = this.startSpan(name)
  return ActiveSpanVar.run(span, () => {
    try {
      const result = fn(span)
      span.setStatus('ok')
      return result
    } catch (error) {
      span.recordException(error)
      span.setStatus('error')
      throw error
    } finally {
      span.end()
    }
  })
}
```

---

### 2. Resolution Hooks

**Existing:** HexDI has `beforeResolve` and `afterResolve` hooks.

**Integration:**

```typescript
import { createTracingHook } from "@hex-di/tracing";

const tracingHook = createTracingHook(tracer, {
  traceSyncResolutions: true,
  traceAsyncResolutions: true,
  minDurationMs: 1, // Skip fast resolutions
});

const container = createContainer(graph, {
  hooks: {
    beforeResolve: [tracingHook.beforeResolve],
    afterResolve: [tracingHook.afterResolve],
  },
});
```

**Hook implementation:**

```typescript
export function createTracingHook(
  tracer: Tracer,
  options: AutoInstrumentOptions = {}
): ResolutionHook {
  const spanMap = new WeakMap<Port<unknown, string>, Span>()

  return {
    beforeResolve: (port, scope) => {
      const span = tracer.startSpan(`resolve ${port.name}`, {
        kind: 'internal',
        attributes: {
          'hex-di.port.name': port.name,
          'hex-di.port.lifetime': /* infer from graph */,
          'hex-di.resolution.scope_id': scope?.id,
        },
      })
      spanMap.set(port, span)
    },

    afterResolve: (port, result, error) => {
      const span = spanMap.get(port)
      if (!span) return

      if (error) {
        span.recordException(error)
        span.setStatus('error')
      } else {
        span.setStatus('ok')
      }

      span.end()
      spanMap.delete(port)
    },
  }
}
```

---

### 3. Framework Integrations

**Hono (@hex-di/hono):**

```typescript
import { tracingMiddleware } from "@hex-di/tracing/hono";

app.use(
  "*",
  tracingMiddleware({
    tracer: container.resolve(TracerPort),
    extractContext: true, // Extract traceparent from incoming request
    injectContext: true, // Inject traceparent into response
  })
);
```

**React (@hex-di/react):**

```typescript
import { TracingProvider, useTracer } from '@hex-di/tracing/react'

function App() {
  return (
    <TracingProvider tracer={tracer} spanName="react-app">
      <Dashboard />
    </TracingProvider>
  )
}

function Dashboard() {
  const tracer = useTracer()

  const handleClick = useTracedCallback('button-click', () => {
    // Traced automatically
  })
}
```

---

## What NOT to Add

### 1. Metrics and Logging

**Why:** OpenTelemetry supports traces, metrics, and logs, but HexDI tracing should focus on traces only.

**Rationale:**

- Metrics belong in a separate `@hex-di/metrics` package (future work)
- Logging should integrate with existing logging libraries (pino, winston)
- Traces are the most valuable signal for debugging DI resolution issues

### 2. Automatic Instrumentation for Third-Party Libraries

**Why:** OpenTelemetry has auto-instrumentation for express, fetch, pg, etc., but HexDI shouldn't duplicate this.

**Rationale:**

- Users can install `@opentelemetry/auto-instrumentations-node` separately
- HexDI tracing should focus on DI-specific operations (resolution, scope lifecycle)
- Third-party instrumentation is orthogonal to DI tracing

### 3. Sampling

**Why:** Sampling is a backend concern, not a DI concern.

**Rationale:**

- OpenTelemetry SDK handles sampling via `TraceIdRatioBased` sampler
- HexDI tracer should respect sampling decisions from upstream (traceparent flags)
- Configuring sampling belongs in backend adapter configuration, not core tracing

### 4. Baggage API

**Why:** Baggage is a W3C spec for propagating key-value pairs, but it's rarely used.

**Rationale:**

- Correlation IDs can be propagated via context variables (simpler)
- Baggage header format is complex (multiple RFCs)
- Most users don't need baggage – correlation ID is sufficient

**Defer to future:** If demand arises, add baggage support in a minor version.

### 5. Standalone Clients (jaeger-client, zipkin)

**Why:** These are deprecated or in maintenance mode.

**Rationale:**

- OpenTelemetry is the future – all vendors are migrating
- Standalone clients lack modern features (async context, W3C propagation)
- Maintaining multiple client integrations is unnecessary complexity

---

## Package Dependency Matrix

| Package                   | Core                          | OTel API           | OTel SDK                    | Exporters                             | Backend-Specific             |
| ------------------------- | ----------------------------- | ------------------ | --------------------------- | ------------------------------------- | ---------------------------- |
| `@hex-di/tracing`         | @hex-di/core, @hex-di/runtime | -                  | -                           | -                                     | -                            |
| `@hex-di/tracing-otel`    | @hex-di/tracing               | @opentelemetry/api | @opentelemetry/sdk-trace-\* | @opentelemetry/exporter-trace-otlp-\* | -                            |
| `@hex-di/tracing-jaeger`  | @hex-di/tracing               | @opentelemetry/api | @opentelemetry/sdk-trace-\* | @opentelemetry/exporter-jaeger        | -                            |
| `@hex-di/tracing-zipkin`  | @hex-di/tracing               | @opentelemetry/api | @opentelemetry/sdk-trace-\* | @opentelemetry/exporter-zipkin        | @opentelemetry/propagator-b3 |
| `@hex-di/tracing-datadog` | @hex-di/tracing               | -                  | -                           | -                                     | dd-trace                     |

**Note:** All OpenTelemetry packages should use compatible versions (2.5.0 for SDK, 0.211.0 for exporters, 1.9.0 for API).

---

## Version Strategy

### Pinning vs Ranges

**Recommendation:** Use caret ranges (`^`) for OpenTelemetry packages.

**Rationale:**

- OpenTelemetry API (1.x) is stable – breaking changes won't happen in 1.x
- SDK (2.x) and exporters (0.x) receive frequent updates (monthly)
- Caret ranges allow users to get bug fixes and new exporter features
- HexDI shouldn't block OpenTelemetry updates

**Exception:** If a specific OpenTelemetry version has a critical bug, pin to a fixed version and document in CHANGELOG.

### Node.js Version Support

**Minimum:** Node.js 18.0.0 (matches HexDI's existing requirement)

**Rationale:**

- Node 18 has AsyncLocalStorage stable
- OpenTelemetry SDK requires Node 14+, but Node 18 is the LTS baseline for new projects in 2026

### TypeScript Version Support

**Minimum:** TypeScript 5.0 (matches HexDI's existing requirement)

**Rationale:**

- OpenTelemetry types work with TS 4.x+, but HexDI uses TS 5.x features
- No additional constraints from tracing packages

---

## Installation Scripts

### Basic Setup (OTLP HTTP)

```bash
# Core tracing package
pnpm add @hex-di/tracing

# OpenTelemetry backend
pnpm add @hex-di/tracing-otel \
         @opentelemetry/api@^1.9.0 \
         @opentelemetry/sdk-trace-node@^2.5.0 \
         @opentelemetry/exporter-trace-otlp-http@^0.211.0 \
         @opentelemetry/resources@^2.5.0 \
         @opentelemetry/semantic-conventions@^1.39.0
```

### Jaeger Backend

```bash
pnpm add @hex-di/tracing-jaeger \
         @opentelemetry/exporter-jaeger@^2.5.0 \
         @opentelemetry/propagator-jaeger@^2.5.0
```

### Zipkin Backend

```bash
pnpm add @hex-di/tracing-zipkin \
         @opentelemetry/exporter-zipkin@^2.5.0 \
         @opentelemetry/propagator-b3@^2.5.0
```

### DataDog Backend

```bash
pnpm add @hex-di/tracing-datadog \
         dd-trace@^5.85.0
```

### Development Setup

```bash
# Core + console adapter (no external dependencies)
pnpm add @hex-di/tracing

# Use built-in ConsoleTracerAdapter for development
```

---

## Architecture Decision: Parent/Child Container Tracing

**Question from project context:** How should tracing propagate across parent/child container hierarchies?

### Current State (Isolated Tracing)

Each container has its own isolated `tracer` property. Child containers don't share trace context with parent.

### Recommended Approach: Shared Tracer, Propagated Context

**Pattern:**

1. **Single tracer instance:** Parent container creates tracer, child containers inherit same tracer
2. **Context propagation:** Trace context flows from parent to child via AsyncLocalStorage (context variables)
3. **Span hierarchy:** Child container resolutions create child spans under parent's active span

**Implementation:**

```typescript
// Parent container with tracer
const parentContainer = createContainer(graph, {
  hooks: {
    beforeResolve: [tracingHook.beforeResolve],
    afterResolve: [tracingHook.afterResolve],
  },
});

// Child container inherits tracer via shared reference
const childContainer = parentContainer.createChildContainer();
// Child resolution hooks see same ActiveSpanVar context
// Child spans are automatically children of parent spans
```

**Why this works:**

- AsyncLocalStorage propagates context to child async operations
- Child container resolutions happen in the context of parent's active span
- No explicit parent-child wiring needed – context propagation handles it

**Span tree example:**

```
[Trace: a1b2c3d4]
  [Span: resolve UserService] (parent container)
    [Span: resolve Logger] (parent container, nested resolution)
    [Span: resolve DatabasePort] (child container, inherited context)
      [Span: resolve ConnectionPool] (child container, nested)
```

**Benefit:** Distributed tracing naturally extends to container hierarchies.

---

## Confidence Assessment

| Area                       | Confidence | Source                      | Notes                                            |
| -------------------------- | ---------- | --------------------------- | ------------------------------------------------ |
| OpenTelemetry versions     | HIGH       | npm registry                | Verified current versions via `npm view`         |
| OTel package structure     | HIGH       | Official OpenTelemetry docs | Standard SDK structure well-documented           |
| Jaeger migration to OTel   | HIGH       | Jaeger project docs         | jaeger-client deprecated, OTel is the path       |
| Zipkin via OTel            | HIGH       | Zipkin project docs         | Official exporter, B3 propagation standard       |
| DataDog dd-trace           | HIGH       | DataDog docs                | Official client, version verified                |
| W3C Trace Context spec     | HIGH       | W3C Recommendation          | Stable spec since 2020                           |
| Effect-TS tracing patterns | MEDIUM     | Effect documentation        | Effect has tracing, but less detail on internals |
| InversifyJS tracing        | HIGH       | InversifyJS source          | No built-in tracing, verified via repo           |
| NestJS OTel integration    | MEDIUM     | NestJS docs                 | Package exists, patterns confirmed               |

---

## Sources

**Package versions (npm registry):**

- https://www.npmjs.com/package/@opentelemetry/api (v1.9.0)
- https://www.npmjs.com/package/@opentelemetry/sdk-trace-base (v2.5.0)
- https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-http (v0.211.0)
- https://www.npmjs.com/package/@opentelemetry/exporter-jaeger (v2.5.0)
- https://www.npmjs.com/package/@opentelemetry/exporter-zipkin (v2.5.0)
- https://www.npmjs.com/package/dd-trace (v5.85.0)
- https://www.npmjs.com/package/jaeger-client (v3.19.0, deprecated)
- https://www.npmjs.com/package/zipkin (v0.22.0, maintenance mode)

**Specifications:**

- W3C Trace Context: https://www.w3.org/TR/trace-context/
- W3C Baggage: https://www.w3.org/TR/baggage/ (not recommended for HexDI)

**Framework references:**

- Effect-TS: https://effect.website/docs/observability/tracing
- InversifyJS: https://github.com/inversify/InversifyJS
- NestJS OpenTelemetry: https://docs.nestjs.com/opentelemetry/introduction
- OpenTelemetry JS: https://opentelemetry.io/docs/languages/js/

---

## Next Steps for Roadmap

1. **Phase 1: Core Tracing Package**
   - Implement Tracer, Span, SpanExporter, SpanProcessor ports
   - Build NoOp, Memory, Console adapters
   - Implement W3C Trace Context parsing/serialization
   - Add context variable integration (ActiveSpanVar, TraceContextVar)

2. **Phase 2: Automatic Instrumentation**
   - Implement `createTracingHook()` using resolution hooks
   - Add `instrumentContainer()` helper
   - Test cross-container propagation

3. **Phase 3: OpenTelemetry Backend**
   - Implement OtelTracerAdapter bridging HexDI → OpenTelemetry
   - Configure OTLP HTTP exporter
   - Add resource metadata and semantic conventions

4. **Phase 4: Jaeger and Zipkin Backends**
   - Implement JaegerExporterAdapter (via @opentelemetry/exporter-jaeger)
   - Implement ZipkinExporterAdapter (via @opentelemetry/exporter-zipkin)
   - Test B3 and Jaeger propagation formats

5. **Phase 5: DataDog Backend**
   - Implement DataDogTracerAdapter (via dd-trace)
   - Test DataDog APM integration
   - Document DataDog-specific features (profiling, log correlation)

6. **Phase 6: Framework Integrations**
   - Build Hono tracingMiddleware (extract/inject traceparent)
   - Build React TracingProvider and hooks
   - Test end-to-end distributed tracing across frameworks

---

## Recommendations Summary

**For @hex-di/tracing (core):**

- Zero external dependencies
- Manual W3C Trace Context implementation (simple spec, avoid dependency)
- Use AsyncLocalStorage via context variables for propagation

**For backend adapters:**

- Use OpenTelemetry exporters for Jaeger and Zipkin (not standalone clients)
- Use dd-trace for DataDog (proprietary protocol, richer features)
- All adapters depend on @hex-di/tracing, implement same port interfaces

**For framework integrations:**

- Hono: Middleware that extracts/injects traceparent headers
- React: Provider that establishes trace context for component tree
- Both should support automatic instrumentation of DI resolutions

**For cross-container tracing:**

- Single tracer instance shared by parent and child containers
- Trace context propagated via AsyncLocalStorage (automatic)
- Child spans are children of parent's active span (natural hierarchy)
