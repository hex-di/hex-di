# Feature Landscape: Distributed Tracing for DI Containers

**Domain:** Distributed tracing for TypeScript DI containers
**Researched:** 2026-02-06
**Focus:** Subsequent milestone adding distributed tracing to HexDI

## Overview

This research examines distributed tracing features specific to dependency injection containers. HexDI already has local tracing (resolution hooks, TraceCollector, ResolutionSpan, TracingAPI), but needs **distributed tracing** capabilities for cross-service, cross-container observability.

**Existing foundations (already built):**

- Resolution hooks (beforeResolve/afterResolve) with FIFO/LIFO ordering
- TraceCollector strategy pattern (MemoryCollector, NoOpCollector, CompositeCollector)
- TracingAPI (getTraces, getStats, pause, resume, clear, subscribe)
- ResolutionSpan (tree-structured, with children, duration, cacheHit, lifetime, scopeId)
- trace() and enableTracing() standalone functions
- Container inspector API
- Context variable system (Symbol-based keys with createContextVariable())

**Key architectural concern:** Currently each container has ISOLATED tracing. Parent containers cannot see child container resolutions. Hooks are NOT inherited. This needs to change for cross-container/cross-service tracing.

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature                                  | Why Expected                                          | Complexity | Dependencies                      |
| ---------------------------------------- | ----------------------------------------------------- | ---------- | --------------------------------- |
| W3C Trace Context propagation            | Industry standard for distributed tracing             | Medium     | Context variables (exists)        |
| Parent/child span relationships          | Users expect tree-structured traces across boundaries | Medium     | TraceContext in context vars      |
| OpenTelemetry-compatible Span attributes | Standard observability integration                    | Low        | Existing ResolutionSpan structure |
| Tracer port for dependency injection     | DI library should use DI for tracing                  | Low        | Port/adapter pattern (exists)     |
| Zero-overhead no-op implementation       | Production apps need opt-out                          | Low        | Existing NoOpCollector pattern    |
| Cross-container span propagation         | Child containers inherit parent trace context         | High       | Context variable inheritance      |
| Manual span creation API                 | Users need custom business logic spans                | Medium     | Tracer port                       |
| Span exporter interface                  | Export to backends (OTel, Jaeger, etc.)               | Low        | SpanProcessor pattern             |

### Feature 1: W3C Trace Context Propagation

**Current state:** No trace context propagation between services/containers.

**Expected behavior:**

- Extract `traceparent` header from incoming requests
- Inject `traceparent` header into outgoing requests
- Format: `00-{trace-id}-{parent-span-id}-{trace-flags}`
- Optional `tracestate` header for vendor-specific data

**Why table stakes:**

- W3C Trace Context is the industry standard (https://www.w3.org/TR/trace-context/)
- OpenTelemetry uses it by default
- Every major APM vendor supports it (Jaeger, Zipkin, DataDog, New Relic)
- Without this, traces can't span multiple services

**Implementation complexity: MEDIUM**

```typescript
// Context variable for trace context (using existing createContextVariable)
export const TraceContextVar = createContextVariable<SpanContext | undefined>(
  "hex-di/trace-context",
  undefined
);

// Extract from headers
export function extractTraceContext(
  headers: Record<string, string | undefined>
): SpanContext | undefined {
  const traceparent = headers["traceparent"];
  if (!traceparent) return undefined;

  const [version, traceId, spanId, flags] = traceparent.split("-");
  if (version !== "00") return undefined;

  return {
    traceId,
    spanId,
    traceFlags: parseInt(flags, 16),
    traceState: headers["tracestate"],
  };
}

// Inject into headers
export function injectTraceContext(context: SpanContext, headers: Record<string, string>): void {
  headers["traceparent"] =
    `00-${context.traceId}-${context.spanId}-${context.traceFlags.toString(16).padStart(2, "0")}`;
  if (context.traceState) {
    headers["tracestate"] = context.traceState;
  }
}
```

**Existing codebase support:**

- `createContextVariable()` already exists in @hex-di/core
- Context variable system supports Symbol-based keys with propagation

### Feature 2: Parent/Child Span Relationships

**Current state:** ResolutionSpan has children, but only within a single container. Cross-container relationships don't exist.

**Expected behavior:**

- When child container resolves a port, span should have parentSpanId from parent container's active span
- Span hierarchy should cross container boundaries
- Backend visualization tools expect parent/child links for flame graphs

**Why table stakes:**

- Distributed tracing is fundamentally about relationships across boundaries
- Without parent links, traces are disconnected events, not a story
- Every major tracing backend renders flame graphs from parent/child relationships

**Implementation complexity: MEDIUM**

Requires cross-container context propagation:

```typescript
// When creating child container, inherit trace context
const childContainer = container.createChild(childGraph, {
  name: "Child",
  // Child should inherit parent's active span context
});

// Resolution in child should link to parent span
// This happens automatically if ActiveSpanVar is inherited via context
```

**Dependency:** Context variable inheritance (needs implementation if not exists).

### Feature 3: OpenTelemetry-Compatible Span Attributes

**Current state:** ResolutionSpan has DI-specific fields but not standard OTel attributes.

**Expected behavior:**
Standard semantic conventions for DI resolution spans:

| Attribute                | Type    | Example            | Source                    |
| ------------------------ | ------- | ------------------ | ------------------------- |
| `span.kind`              | string  | "internal"         | OTel semantic conventions |
| `service.name`           | string  | "hex-di-container" | OTel resource attributes  |
| `code.function`          | string  | "resolve"          | OTel code conventions     |
| `code.namespace`         | string  | "LoggerPort"       | Port name                 |
| `di.port.name`           | string  | "Logger"           | HexDI-specific            |
| `di.port.lifetime`       | string  | "singleton"        | HexDI-specific            |
| `di.resolution.cached`   | boolean | true               | HexDI-specific            |
| `di.resolution.scope_id` | string  | "scope-123"        | HexDI-specific            |
| `di.container.id`        | string  | "root"             | HexDI-specific            |
| `di.container.kind`      | string  | "root"             | HexDI-specific            |

**Why table stakes:**

- Backend tools (Jaeger UI, Grafana Tempo) use standard attributes for filtering/grouping
- Custom attributes are fine, but basic OTel attributes enable baseline functionality
- Without `span.kind`, backends can't categorize spans correctly

**Implementation complexity: LOW**

Mapping existing ResolutionSpan to OTel format:

```typescript
export interface SpanData {
  readonly context: SpanContext;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: SpanKind; // "internal" for DI resolution
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly status: SpanStatus; // "ok" | "error" | "unset"
  readonly statusMessage?: string;
  readonly attributes: Attributes; // Map ResolutionSpan fields here
  readonly events: ReadonlyArray<{
    readonly name: string;
    readonly time: number;
    readonly attributes?: Attributes;
  }>;
  readonly links: ReadonlyArray<SpanContext>;
}

function resolutionSpanToSpanData(span: ResolutionSpan): SpanData {
  return {
    // ... map fields
    attributes: {
      "span.kind": "internal",
      "di.port.name": span.portName,
      "di.port.lifetime": span.lifetime,
      "di.resolution.cached": span.cacheHit,
      "di.resolution.scope_id": span.scopeId ?? "",
      "di.container.id": span.containerId ?? "root",
    },
  };
}
```

### Feature 4: Tracer Port for Dependency Injection

**Current state:** Tracing is enabled via standalone functions (trace(), enableTracing()) or container options.

**Expected behavior:**

- TracerPort as a standard port users can resolve
- Allows users to inject Tracer into their services
- Container can resolve its own tracer for self-instrumentation

**Why table stakes:**

- A DI library should use DI for its own features
- Users need to trace custom business logic, not just DI resolution
- Port-based design enables swapping implementations (NoOp, Console, OTel)

**Implementation complexity: LOW**

```typescript
// Port definition
export const TracerPort = createPort<Tracer>("Tracer");

// Adapter for no-op tracer
export const NoOpTracerAdapter = createAdapter({
  provides: TracerPort,
  factory: () => noOpTracer,
  lifetime: "singleton",
});

// Usage in user code
class MyService {
  constructor(
    private tracer: Tracer, // Injected via TracerPort
    private logger: Logger
  ) {}

  async processOrder(orderId: string): Promise<void> {
    return this.tracer.withSpanAsync("process-order", async span => {
      span.setAttribute("order.id", orderId);
      // Business logic
    });
  }
}

const MyServiceAdapter = createAdapter({
  provides: MyServicePort,
  requires: [TracerPort, LoggerPort],
  factory: deps => new MyService(deps[TracerPort], deps[LoggerPort]),
});
```

**Dependency:** Port/adapter pattern (already exists).

### Feature 5: Zero-Overhead No-Op Implementation

**Current state:** NoOpCollector exists for TraceCollector, but full Tracer implementation needs no-op too.

**Expected behavior:**

- When TracerPort is bound to NoOpTracerAdapter, zero overhead
- No span allocation, no timing, no attribute storage
- isRecording() returns false immediately
- Singleton no-op span reused for all operations

**Why table stakes:**

- Production apps often disable tracing by default (enable for sampling)
- Tracing shouldn't slow down production if disabled
- Industry standard: OTel has no-op tracer, Datadog has no-op tracer

**Implementation complexity: LOW**

```typescript
const noOpSpan: Span = {
  context: { traceId: "", spanId: "", traceFlags: 0 },
  name: "",
  startTime: 0,
  setAttribute: () => {},
  setAttributes: () => {},
  addEvent: () => {},
  setStatus: () => {},
  recordException: () => {},
  end: () => {},
  isRecording: () => false,
};

const noOpTracer: Tracer = {
  startSpan: () => noOpSpan,
  withSpan: (_, fn) => fn(noOpSpan),
  withSpanAsync: async (_, fn) => fn(noOpSpan),
  getActiveSpan: () => undefined,
  getSpanContext: () => undefined,
  withAttributes: () => noOpTracer,
};
```

**Existing codebase support:**

- NoOpCollector already exists for TraceCollector
- Pattern is proven in HexDI

### Feature 6: Cross-Container Span Propagation

**Current state:** ISOLATED tracing per container. Parent can't see child resolutions.

**Expected behavior:**

- When parent container has active span, child container inherits it
- Child container resolutions become child spans of parent's active span
- Hooks installed on parent should fire for child container resolutions (opt-in)

**Why table stakes:**

- Multi-container architectures are common (main app + test container, main + plugin container)
- Without cross-container tracing, you only see partial stories
- OpenTelemetry's context propagation expects this to "just work"

**Implementation complexity: HIGH**

This is the biggest architectural change. Requires:

1. **Context variable inheritance**: Child containers inherit context from parent
2. **Hook inheritance (opt-in)**: Parent hooks can opt into child events
3. **Active span tracking**: ActiveSpanVar propagates to child

```typescript
// Current problem:
const parent = createContainer({ graph, name: "Parent" });
enableTracing(parent); // Installs hooks on parent

const child = parent.createChild(childGraph, { name: "Child" });
child.resolve(SomePort); // NOT TRACED - hooks don't propagate

// Expected behavior:
const parent = createContainer({
  graph,
  name: "Parent",
  hooks: {
    beforeResolve: ctx => console.log("Parent hook:", ctx.portName),
  },
});

const child = parent.createChild(childGraph, {
  name: "Child",
  inheritHooks: true, // NEW OPTION
});

child.resolve(SomePort); // Parent hook fires!
```

**Dependency:** Context variable system needs inheritance if not already present.

### Feature 7: Manual Span Creation API

**Current state:** Only automatic DI resolution spans. No API for custom spans.

**Expected behavior:**

- Users can create spans for business logic
- Spans nest within active DI resolution spans
- Sync and async span creation

**Why table stakes:**

- DI resolution spans are only part of the story
- Users need to trace database queries, API calls, business logic
- Industry standard: every tracing library provides manual span creation

**Implementation complexity: MEDIUM**

```typescript
interface Tracer {
  // Manual span creation
  startSpan(name: string, options?: SpanOptions): Span;

  // Sync callback with span
  withSpan<T>(name: string, fn: (span: Span) => T, options?: SpanOptions): T;

  // Async callback with span
  withSpanAsync<T>(name: string, fn: (span: Span) => Promise<T>, options?: SpanOptions): Promise<T>;

  // Get current active span
  getActiveSpan(): Span | undefined;

  // Get current trace context for propagation
  getSpanContext(): SpanContext | undefined;

  // Create child tracer with default attributes
  withAttributes(attributes: Attributes): Tracer;
}

// Usage
const tracer = container.resolve(TracerPort);

const result = tracer.withSpan("fetch-user", span => {
  span.setAttribute("user.id", userId);
  const user = db.query("SELECT * FROM users WHERE id = ?", userId);
  span.addEvent("user-fetched", { count: 1 });
  return user;
});
```

**Dependency:** Tracer port (Feature 4).

### Feature 8: Span Exporter Interface

**Current state:** TraceCollector exists but doesn't export to backends.

**Expected behavior:**

- SpanExporter interface for sending spans to backends
- Separate packages for each backend (tracing-otel, tracing-jaeger, etc.)
- SpanProcessor for lifecycle management (batching, async export)

**Why table stakes:**

- Tracing is useless if spans stay in memory
- Users need to send traces to their observability backend
- Industry standard: OTel has exporter interface, all APM tools provide SDKs

**Implementation complexity: LOW**

```typescript
interface SpanExporter {
  /**
   * Export completed spans to backend.
   * Called by SpanProcessor after spans end.
   */
  export(spans: ReadonlyArray<SpanData>): Promise<void>;

  /**
   * Shutdown exporter and flush pending spans.
   */
  shutdown(): Promise<void>;

  /**
   * Force flush pending spans without shutting down.
   */
  forceFlush(): Promise<void>;
}

interface SpanProcessor {
  /**
   * Called when span starts.
   * Can sample/filter spans before recording.
   */
  onStart(span: Span): void;

  /**
   * Called when span ends.
   * Typically batches spans and calls exporter.
   */
  onEnd(spanData: SpanData): void;

  /**
   * Shutdown processor and flush.
   */
  shutdown(): Promise<void>;

  /**
   * Force flush without shutdown.
   */
  forceFlush(): Promise<void>;
}

// Separate packages provide implementations
// @hex-di/tracing-otel - OpenTelemetry exporter
// @hex-di/tracing-jaeger - Jaeger exporter
// @hex-di/tracing-zipkin - Zipkin exporter
// @hex-di/tracing-datadog - DataDog exporter
```

**Existing codebase support:**

- Similar pattern to TraceCollector (strategy pattern)
- Port-based dependency injection for exporters

---

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature                          | Value Proposition                      | Complexity | Notes                      |
| -------------------------------- | -------------------------------------- | ---------- | -------------------------- |
| Automatic DI instrumentation     | Zero-config tracing of all resolutions | Low        | Use existing hooks         |
| Sampling strategies (head/tail)  | Control trace volume in production     | Medium     | Per-span sampling decision |
| Correlation ID propagation       | Link logs to traces                    | Low        | Use context variables      |
| Testing utilities (MemoryTracer) | Assert on spans in tests               | Low        | Similar to MemoryCollector |
| Hono middleware integration      | Auto-extract/inject trace context      | Low        | Framework-specific         |
| React hooks integration          | useTracer(), useSpan()                 | Low        | Framework-specific         |
| Span links for causality         | Link related but non-parent spans      | Medium     | OTel feature, rarely used  |
| Baggage propagation              | Cross-service key-value data           | Medium     | W3C Baggage spec           |

### Feature 1: Automatic DI Instrumentation

**Why differentiator:**

- Most DI frameworks require manual instrumentation
- HexDI already has hooks infrastructure - can instrument automatically
- Zero-config: install tracer, get DI resolution spans for free

**Example:**

```typescript
import { instrumentContainer, TracerPort } from "@hex-di/tracing";

const container = createContainer(graph);
const tracer = container.resolve(TracerPort);

// One call to instrument everything
const cleanup = instrumentContainer(container, tracer, {
  traceSyncResolutions: true,
  traceAsyncResolutions: true,
  minDurationMs: 1, // Skip fast resolutions
});

// All resolutions now create spans automatically
container.resolve(UserServicePort);
// ^ Creates span: "resolve UserService"
//   with attributes: lifetime, cached, etc.

cleanup(); // Remove instrumentation
```

**Competitive advantage:**

- InversifyJS: No automatic tracing
- TSyringe: No automatic tracing
- .NET DI: No automatic tracing
- NestJS: Has interceptors but requires manual setup per service

### Feature 2: Sampling Strategies

**Why differentiator:**

- Production systems need to control trace volume
- Head-based sampling: decide at trace start (fast, simple)
- Tail-based sampling: decide after trace completes (complex, accurate)

**Example:**

```typescript
interface SamplerOptions {
  // Head-based sampling
  sampleRate?: number; // 0.0 to 1.0 (1.0 = 100%)

  // Conditional sampling
  shouldSample?: (ctx: ResolutionHookContext) => boolean;
}

const sampler: Sampler = {
  shouldSample: ctx => {
    // Sample 100% of errors, 10% of successes
    if (ctx.error) return true;
    return Math.random() < 0.1;
  },
};

const tracer = createTracerWithSampler(sampler);
```

**Competitive advantage:**

- Most DI frameworks don't have built-in sampling
- OpenTelemetry has sampling but it's complex to configure
- HexDI can make it DI-specific and simple

### Feature 3: Correlation ID Propagation

**Why differentiator:**

- Developers want to link logs to traces
- Correlation IDs (request IDs) are standard in logging
- HexDI can propagate correlation IDs via context variables

**Example:**

```typescript
export const CorrelationIdVar = createContextVariable<string | undefined>(
  "hex-di/correlation-id",
  undefined
);

// Middleware extracts correlation ID from header
app.use((req, res, next) => {
  const correlationId = req.headers["x-correlation-id"] || generateId();

  // Set in context (propagates to DI container)
  runWithContext(CorrelationIdVar, correlationId, () => {
    // All DI resolutions inherit correlation ID
    next();
  });
});

// Logger reads correlation ID from context
class Logger {
  log(message: string) {
    const correlationId = getContextValue(CorrelationIdVar);
    console.log({ correlationId, message });
  }
}
```

**Competitive advantage:**

- Most DI frameworks don't have context propagation
- Requires explicit passing or thread-locals
- HexDI's context variable system makes this natural

### Feature 4: Testing Utilities

**Why differentiator:**

- Developers need to test tracing behavior
- MemoryTracer collects spans for assertions
- Span matchers for ergonomic assertions

**Example:**

```typescript
import { MemoryTracerAdapter, assertSpanExists } from "@hex-di/tracing/testing";

describe("MyService", () => {
  it("traces database calls", async () => {
    const graph = GraphBuilder.create()
      .provide(MemoryTracerAdapter) // Use memory tracer
      .provide(MyServiceAdapter)
      .build();

    const container = createContainer({ graph, name: "Test" });
    const tracer = container.resolve(TracerPort) as MemoryTracer;
    const service = container.resolve(MyServicePort);

    await service.processOrder("order-123");

    const spans = tracer.getCollectedSpans();

    // Assert span exists with attributes
    assertSpanExists(spans, {
      name: "process-order",
      status: "ok",
      attributes: {
        "order.id": "order-123",
      },
    });

    // Assert parent/child relationships
    expect(spans[0].children).toHaveLength(2);
    expect(spans[0].children[0].name).toBe("db-query");
  });
});
```

**Competitive advantage:**

- Most tracing libraries don't provide testing utilities
- Users have to mock or ignore tracing in tests
- HexDI can make tracing testable out of the box

### Feature 5: Framework Integrations

**Why differentiator:**

- Hono middleware: auto-extract/inject trace context
- React hooks: useTracer(), useSpan() for component tracing

**Hono example:**

```typescript
import { tracingMiddleware } from "@hex-di/tracing/hono";

app.use(
  "*",
  tracingMiddleware({
    tracer: container.resolve(TracerPort),
    extractContext: true, // Extract from incoming traceparent header
    injectContext: true, // Inject into outgoing response
    spanName: c => `${c.req.method} ${c.req.path}`,
  })
);

app.get("/users/:id", async c => {
  const tracer = c.get("tracer"); // Tracer available in context
  return tracer.withSpanAsync("get-user", async span => {
    span.setAttribute("user.id", c.req.param("id"));
    // Handler logic
  });
});
```

**React example:**

```typescript
import { TracingProvider, useTracer, useSpan } from '@hex-di/tracing/react'

function App() {
  return (
    <TracingProvider tracer={tracer}>
      <UserList />
    </TracingProvider>
  )
}

function UserList() {
  const tracer = useTracer()
  const activeSpan = useSpan()

  const fetchUsers = useTracedCallback('fetch-users', async (span) => {
    span.setAttribute('component', 'UserList')
    const response = await fetch('/api/users')
    return response.json()
  })

  // ... component logic
}
```

**Competitive advantage:**

- Framework-specific integrations are rare in DI libraries
- HexDI has @hex-di/hono and @hex-di/react packages - natural fit
- Makes distributed tracing ergonomic in framework context

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature                   | Why Avoid                                | What to Do Instead                         |
| ------------------------------ | ---------------------------------------- | ------------------------------------------ |
| Synchronous span export        | Blocks resolution, kills performance     | Use async SpanProcessor with batching      |
| Global tracer singleton        | Prevents testing, violates DI principles | Use TracerPort and dependency injection    |
| Automatic trace starting       | Who starts the root trace? Ambiguous.    | User explicitly starts via middleware/hook |
| Custom trace formats           | Vendor lock-in, breaks interop           | Stick to OTel/W3C standards                |
| Built-in backend SDKs          | Bloats core, hard to maintain            | Separate packages per backend              |
| Span mutation after end()      | Breaks immutability, confuses backends   | Freeze span after end()                    |
| Magic trace context extraction | How does it know where to look?          | User provides extractor function           |

### Anti-Feature 1: Synchronous Span Export

**Why avoid:**

- Exporting to backends is network I/O (slow)
- Blocking resolution on export would kill DI performance
- Users would disable tracing in production

**What to do instead:**

- SpanProcessor batches spans in memory
- Background worker exports batches asynchronously
- Resolution continues immediately after span.end()

```typescript
// DON'T:
class BadSpanProcessor {
  onEnd(span: SpanData) {
    await this.exporter.export([span]); // BLOCKS resolution!
  }
}

// DO:
class BatchSpanProcessor {
  private batch: SpanData[] = [];

  onEnd(span: SpanData) {
    this.batch.push(span);
    if (this.batch.length >= 100) {
      this.flush(); // Async, non-blocking
    }
  }

  private async flush() {
    const toExport = this.batch.splice(0, this.batch.length);
    // Export in background, don't await
    this.exporter.export(toExport).catch(err => {
      console.error("Failed to export spans:", err);
    });
  }
}
```

### Anti-Feature 2: Global Tracer Singleton

**Why avoid:**

- Prevents testing (can't swap tracer per test)
- Violates dependency injection principles
- Hard to configure different tracers for different containers

**What to do instead:**

- TracerPort as dependency
- Inject tracer into services that need it
- Tests can provide MemoryTracerAdapter

```typescript
// DON'T:
import { globalTracer } from "@hex-di/tracing";

class MyService {
  async doWork() {
    return globalTracer.withSpanAsync("do-work", async span => {
      // ...
    });
  }
}

// DO:
class MyService {
  constructor(private tracer: Tracer) {}

  async doWork() {
    return this.tracer.withSpanAsync("do-work", async span => {
      // ...
    });
  }
}

const MyServiceAdapter = createAdapter({
  provides: MyServicePort,
  requires: [TracerPort],
  factory: deps => new MyService(deps[TracerPort]),
});
```

### Anti-Feature 3: Automatic Trace Starting

**Why avoid:**

- When does a "trace" start? First DI resolution? HTTP request? CLI command?
- Different contexts have different trace boundaries
- Framework-specific (HTTP vs CLI vs Lambda)

**What to do instead:**

- User explicitly starts trace via middleware or hook
- Framework integrations handle trace starting
- Manual: tracer.startSpan(..., { root: true })

```typescript
// DON'T: Magic trace starting
const container = createContainer({ graph, name: "App", autoTracing: true });
container.resolve(UserService); // Does this start a trace? Who knows!

// DO: Explicit trace boundaries
// In HTTP context:
app.use(tracingMiddleware({ tracer })); // Middleware starts trace

// In CLI context:
const rootSpan = tracer.startSpan("cli-command", { root: true });
try {
  runCommand();
} finally {
  rootSpan.end();
}

// In test context:
const { result, traces } = trace(container, () => {
  // Test code
});
```

### Anti-Feature 4: Custom Trace Formats

**Why avoid:**

- Vendor lock-in - users can't switch backends
- Breaks interoperability with standard tools
- Every backend has to write a custom adapter

**What to do instead:**

- Use OpenTelemetry SpanData format internally
- Use W3C Trace Context for propagation
- Backends implement standard SpanExporter interface

```typescript
// DON'T: Custom format
interface HexDiTrace {
  hexdiTraceId: string
  hexdiSpanId: string
  hexdiData: { ... }
}

// DO: OpenTelemetry-compatible
interface SpanData {
  context: SpanContext  // W3C Trace Context
  name: string
  kind: SpanKind
  startTime: number
  endTime: number
  attributes: Attributes  // OTel standard
  events: SpanEvent[]
  links: SpanContext[]
}
```

### Anti-Feature 5: Built-in Backend SDKs

**Why avoid:**

- Core package becomes massive (depends on @opentelemetry/\*, jaeger-client, dd-trace, etc.)
- Users pay the cost even if they don't use that backend
- Hard to keep up with backend SDK updates

**What to do instead:**

- Core package defines SpanExporter interface
- Separate optional packages for each backend
- Users install only what they need

```
// Package structure:
@hex-di/tracing           # Core (Tracer, Span, SpanExporter interfaces)
@hex-di/tracing-otel      # OpenTelemetry exporter (optional)
@hex-di/tracing-jaeger    # Jaeger exporter (optional)
@hex-di/tracing-zipkin    # Zipkin exporter (optional)
@hex-di/tracing-datadog   # DataDog exporter (optional)

// User installs only what they need:
npm install @hex-di/tracing @hex-di/tracing-otel
```

### Anti-Feature 6: Span Mutation After end()

**Why avoid:**

- Span is already exported to backend - mutations are lost
- Breaks assumptions about span immutability
- Confuses timing (span.endTime is in the past, but attributes added now?)

**What to do instead:**

- Freeze span after end()
- setAttribute/addEvent/setStatus are no-ops after end()
- isRecording() returns false after end()

```typescript
class SpanImpl implements Span {
  private ended = false;

  end(endTime?: number): void {
    if (this.ended) return;
    this.endTime = endTime ?? Date.now();
    this.ended = true;

    // Notify processor
    this.processor.onEnd(this.toSpanData());
  }

  setAttribute(key: string, value: AttributeValue): void {
    if (this.ended) return; // No-op after end
    this.attributes[key] = value;
  }

  isRecording(): boolean {
    return !this.ended;
  }
}
```

### Anti-Feature 7: Magic Trace Context Extraction

**Why avoid:**

- Where does trace context come from? HTTP headers? GraphQL context? gRPC metadata?
- Framework-specific - no one-size-fits-all solution
- If magic extraction fails silently, traces are broken

**What to do instead:**

- Framework integrations provide extractors
- User passes extractor function
- Manual: extractTraceContext(req.headers)

```typescript
// DON'T: Magic extraction
const tracer = createTracer({ autoExtract: true });
// Where does it extract from? Who knows!

// DO: Explicit extraction
// In Hono middleware:
app.use(
  tracingMiddleware({
    tracer,
    extractContext: true, // Middleware knows how to extract from Hono context
  })
);

// In custom HTTP handler:
const parentContext = extractTraceContext(req.headers);
const span = tracer.startSpan("handle-request", {
  links: parentContext ? [parentContext] : [],
});
```

---

## Feature Dependencies

```
W3C Trace Context Propagation
  |
  +-- Context variables (EXISTS)
  |
  +-- Required by: Parent/child spans, Framework integrations

Parent/Child Span Relationships
  |
  +-- W3C Trace Context Propagation
  |
  +-- Context variable inheritance (NEEDS IMPLEMENTATION)
  |
  +-- Required by: Cross-container tracing

OpenTelemetry Attributes
  |
  +-- Independent (just mapping)
  |
  +-- Required by: Span exporters

Tracer Port
  |
  +-- Port/adapter pattern (EXISTS)
  |
  +-- Required by: Manual spans, DI instrumentation, Framework integrations

Zero-Overhead No-Op
  |
  +-- Tracer Port
  |
  +-- Required by: Production deployments

Cross-Container Span Propagation (CRITICAL)
  |
  +-- Context variable inheritance (NEEDS IMPLEMENTATION)
  |
  +-- Hook inheritance (NEEDS DESIGN)
  |
  +-- ActiveSpanVar propagation
  |
  +-- Required by: Multi-container architectures, Child containers, Testing

Manual Span Creation
  |
  +-- Tracer Port
  |
  +-- ActiveSpanVar for nesting
  |
  +-- Required by: Business logic tracing

Span Exporter Interface
  |
  +-- SpanProcessor pattern
  |
  +-- Required by: Backend integrations
```

**Critical path:**

1. **Context variable inheritance** - Enables cross-container tracing
2. **Tracer Port** - Foundation for DI-based tracing
3. **W3C Trace Context** - Industry standard propagation
4. **Manual span API** - User-facing feature

**Parallel workstreams:**

- Span exporters (independent)
- Framework integrations (independent)
- Testing utilities (independent)
- Sampling strategies (independent)

---

## MVP Recommendation

For this milestone, prioritize:

1. **Tracer Port + No-Op** (LOW complexity, foundation)
2. **W3C Trace Context propagation** (MEDIUM complexity, table stakes)
3. **Manual span creation API** (MEDIUM complexity, user-facing)
4. **Cross-container span propagation** (HIGH complexity, CRITICAL)
5. **Span exporter interface** (LOW complexity, backend integration)

Defer to post-milestone:

- **Automatic DI instrumentation**: Can build on hooks
- **Sampling strategies**: Optimization, not core functionality
- **Correlation ID propagation**: Nice-to-have
- **Testing utilities**: Can ship with MemoryCollector initially
- **Framework integrations**: Separate packages, can evolve
- **Span links/baggage**: OTel features, rarely used

**Rationale:**

- Tracer Port is foundation - without it, nothing else works
- W3C Trace Context is industry standard - required for interop
- Manual span API is user-facing value - enables business logic tracing
- Cross-container tracing is CRITICAL - solves isolated tracing problem
- Span exporter enables backend integration - makes traces useful

**Phase ordering:**

1. **Phase 1: Foundation** - Tracer Port, Span interfaces, No-Op
2. **Phase 2: Context Propagation** - W3C Trace Context, ActiveSpanVar, Context inheritance
3. **Phase 3: Manual Spans** - withSpan, withSpanAsync, getActiveSpan
4. **Phase 4: Cross-Container** - Hook inheritance, parent/child relationships
5. **Phase 5: Export** - SpanExporter, SpanProcessor, backend packages

---

## Existing HexDI Features (Context)

Already built:

- `trace(container, fn)` - Collects traces during callback
- `enableTracing(container)` - Enables global tracing
- Resolution hooks (beforeResolve, afterResolve)
- TraceCollector (MemoryCollector, NoOpCollector, CompositeCollector)
- ResolutionSpan (tree-structured, with children)
- TracingAPI (getTraces, getStats, pause, resume, clear, subscribe)
- Context variable system (createContextVariable, Symbol-based)
- Container inspector API

What's new in this milestone:

- Tracer Port for dependency injection
- W3C Trace Context propagation
- Manual span creation (withSpan, withSpanAsync)
- Cross-container span propagation (context inheritance)
- OpenTelemetry-compatible SpanData format
- Span exporter interface for backends
- Framework integrations (Hono, React)

---

## Research Confidence

| Feature                  | Confidence | Sources                                            |
| ------------------------ | ---------- | -------------------------------------------------- |
| W3C Trace Context        | HIGH       | W3C specification, OTel docs                       |
| OpenTelemetry attributes | HIGH       | OTel semantic conventions                          |
| Tracer Port pattern      | HIGH       | Existing HexDI port/adapter pattern                |
| Cross-container tracing  | MEDIUM     | Architectural design needed, no prior art in JS DI |
| Span exporter interface  | HIGH       | OTel SpanExporter interface                        |
| Framework integrations   | HIGH       | Existing @hex-di/hono, @hex-di/react               |
| Sampling strategies      | MEDIUM     | OTel docs, requires design for DI context          |
| Testing utilities        | HIGH       | Existing MemoryCollector pattern                   |

**Low confidence areas:**

- **Cross-container hook inheritance**: No prior art in JavaScript DI frameworks. Needs design work.
- **Context variable inheritance**: Depends on whether HexDI's context system supports inheritance (needs verification).

**Verification needed:**

- Does HexDI's context variable system support inheritance across container boundaries?
- What's the performance impact of hook inheritance (all child containers call parent hooks)?
- Should hook inheritance be opt-in or opt-out?

---

## Competitive Analysis

| Feature                 | HexDI (Planned)       | Effect-TS                | InversifyJS | NestJS              | .NET DI |
| ----------------------- | --------------------- | ------------------------ | ----------- | ------------------- | ------- |
| W3C Trace Context       | Yes                   | Yes (OTel)               | No          | Manual              | Manual  |
| Tracer Port (DI)        | Yes                   | Yes (Effect.Tracer)      | No          | Yes (@nestjs/trace) | No      |
| Manual spans            | Yes                   | Yes                      | No          | Yes                 | No      |
| Cross-container tracing | Yes (designed for it) | N/A (no multi-container) | No          | Partial             | No      |
| Auto DI instrumentation | Yes (via hooks)       | No                       | No          | Partial             | No      |
| Zero-overhead no-op     | Yes                   | Yes                      | N/A         | Partial             | N/A     |
| Testing utilities       | Yes                   | Yes                      | No          | Limited             | No      |
| Framework integration   | Yes (Hono, React)     | N/A                      | No          | Built-in            | N/A     |

**Key differentiators after implementation:**

- **Cross-container tracing** - Unique to HexDI's multi-container architecture
- **Automatic DI instrumentation** - Hooks enable zero-config tracing
- **Testing utilities** - MemoryTracer with assertion helpers
- **Framework integrations** - First-class Hono/React support

**Effect-TS comparison:**

Effect-TS has excellent tracing (Effect.Tracer, Effect.Span), but:

- Effect's tracing is part of the Effect runtime, not DI-specific
- Effect doesn't have multi-container architecture like HexDI
- HexDI can learn from Effect's API design (withSpan, etc.)

---

## Open Questions

1. **Should cross-container hook inheritance be opt-in or opt-out?**
   - Opt-in: `createChild({ inheritHooks: true })` - safer, explicit
   - Opt-out: `createChild({ inheritHooks: false })` - more convenient
   - Recommendation: Opt-in for safety (parent hooks might not expect child events)

2. **How deep should context variable inheritance go?**
   - Parent -> Child: YES
   - Child -> Grandchild: YES (transitive)
   - Scope -> Child container in same scope: ?
   - Recommendation: Transitive inheritance (child inherits parent's context recursively)

3. **Should ActiveSpanVar be mutable or immutable?**
   - Mutable: Push/pop spans as they nest (like async context)
   - Immutable: Create new context for each nested span
   - Recommendation: Mutable with stack (standard tracing pattern)

4. **Should span names be port names or custom?**
   - For DI resolution spans: Port name (e.g., "resolve Logger")
   - For manual spans: User-provided name
   - Recommendation: Both - DI spans use port names, manual spans are custom

5. **How to handle span context in async factories?**
   - Async factories might lose active span context
   - Need to capture span context before async, restore after
   - Recommendation: Use AsyncLocalStorage or similar for automatic propagation

---

## Sources

**Authoritative (HIGH confidence):**

- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- OpenTelemetry specification: https://opentelemetry.io/docs/specs/otel/
- OpenTelemetry semantic conventions: https://opentelemetry.io/docs/specs/semconv/
- HexDI codebase: packages/runtime/src/trace.ts, resolution/hooks.ts
- HexDI spec: specs/tracing-and-logging/SPEC-TRACING.md

**Community sources (MEDIUM confidence):**

- Effect-TS documentation (Tracer API patterns)
- NestJS tracing documentation
- Jaeger documentation (span model)

**Design decisions (LOW confidence, needs validation):**

- Cross-container hook inheritance (no prior art in JS DI)
- Context variable inheritance depth (needs architectural decision)
- Performance impact of hook propagation (needs benchmarking)

---

_Research completed: 2026-02-06_
_Ready for roadmap: YES (with open questions flagged for planning phase)_
